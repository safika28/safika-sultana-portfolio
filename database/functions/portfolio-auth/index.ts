import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

// This endpoint authenticates the submitted password itself. Deploy with
// verify_jwt = false so callers do not need an existing session to sign in.
// Only the Next.js server calls it; responses intentionally have no CORS grants.
const maximumBodyBytes = 4096;
const invalidCredentials = 'Invalid username, email, or password.';
const unavailable = 'Sign-in is temporarily unavailable.';

class RequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function configuredKey(dictionary: string, legacy: string) {
  const raw = Deno.env.get(dictionary);
  if (raw) {
    try {
      const value: unknown = JSON.parse(raw);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const key = (value as Record<string, unknown>).default;
        if (typeof key === 'string' && key) return key;
      }
    } catch {
      // Missing or malformed configuration fails closed without exposing it.
    }
  }
  return Deno.env.get(legacy) || null;
}

async function credentials(request: Request) {
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new RequestError(415, 'Use a JSON request.');
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBodyBytes)) {
    throw new RequestError(413, 'Request is too large.');
  }
  if (!request.body) throw new RequestError(400, 'Enter your username or email and password.');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  const deadline = Date.now() + 5000;
  let size = 0;
  try {
    while (true) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new RequestError(408, 'Request timed out.')), Math.max(1, deadline - Date.now()));
          }),
        ]);
        if (next.done) break;
        size += next.value.byteLength;
        if (size > maximumBodyBytes) throw new RequestError(413, 'Request is too large.');
        chunks.push(next.value);
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    }
  } catch (error) {
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new RequestError(400, 'Enter your username or email and password.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestError(400, 'Enter your username or email and password.');
  }
  const payload = value as Record<string, unknown>;
  if (Object.keys(payload).some((key) => key !== 'identifier' && key !== 'password') ||
      typeof payload.identifier !== 'string' || typeof payload.password !== 'string' ||
      payload.identifier.length > 254 || !payload.password.length || payload.password.length > 256) {
    throw new RequestError(400, 'Enter your username or email and password.');
  }
  const identifier = payload.identifier.trim().toLowerCase();
  if (!(/^[a-z0-9_]{3,30}$/.test(identifier) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier))) {
    throw new RequestError(400, 'Enter your username or email and password.');
  }
  return { identifier, password: payload.password };
}

async function identifierHash(identifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`portfolio-login:v1:${identifier}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' });

  try {
    const { identifier, password } = await credentials(request);
    const url = Deno.env.get('SUPABASE_URL');
    const publicKey = configuredKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
    const secretKey = configuredKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !publicKey || !secretKey) return json({ error: unavailable }, 503);

    const options = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
          ...init,
          signal: AbortSignal.any([request.signal, ...(init?.signal ? [init.signal] : []), AbortSignal.timeout(10000)]),
        }),
      },
    };
    const database = createClient(url, secretKey, options);

    // The database serializes concurrent attempts across all function instances.
    // No caller-supplied forwarding headers participate in this trusted limit.
    const { data: allowed, error: limitError } = await database.rpc('portfolio_consume_auth_limit', {
      identifier_hash: await identifierHash(identifier),
    });
    if (limitError || typeof allowed !== 'boolean') return json({ error: unavailable }, 503);
    if (!allowed) return json({ error: 'Too many sign-in attempts. Try again later.' }, 429, { 'Retry-After': '600' });

    let email = identifier;
    let resolvedUsername = true;
    if (!identifier.includes('@')) {
      const { data, error } = await database.from('portfolio_profiles').select('email').eq('username', identifier).maybeSingle();
      if (error) return json({ error: unavailable }, 503);
      resolvedUsername = Boolean(data && typeof data.email === 'string' && data.email);
      // Unknown usernames still cross the password-auth boundary to avoid a
      // distinguishably fast response that reveals whether a username exists.
      email = resolvedUsername ? data!.email : 'unknown-account@invalid.example';
    }

    // Each request owns its Auth client: a previous caller's session is never
    // reused as authorization on another caller's database requests.
    const auth = createClient(url, publicKey, options);
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) return json({ error: invalidCredentials }, 401);
    if (!resolvedUsername) {
      await auth.auth.signOut({ scope: 'local' });
      return json({ error: invalidCredentials }, 401);
    }

    const { data: profile, error: profileError } = await database.from('portfolio_profiles')
      .select('user_id').eq('user_id', data.user.id).maybeSingle();
    if (profileError || !data.user.email_confirmed_at || profile?.user_id !== data.user.id) {
      await auth.auth.signOut({ scope: 'local' });
      return json({ error: profileError ? unavailable : invalidCredentials }, profileError ? 503 : 401);
    }

    const session = data.session;
    return json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type,
      },
    });
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    return json({ error: unavailable }, 503);
  }
}

Deno.serve(handleRequest);
