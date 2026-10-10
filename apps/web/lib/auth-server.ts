import 'server-only';
import { createHash } from 'node:crypto';
import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';
import { getPublicAuthConfig } from './auth-config';
import { CmsError, getServerDatabase } from './cms';
import { RequestLimiter } from './contact-validation';
import { getPublicDatabase } from './supabase-server';

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254).transform(value => value.toLowerCase()).refine(value => /^[a-z0-9_]{3,30}$/.test(value) || z.string().email().safeParse(value).success),
  password: z.string().min(1).max(256)
}).strict();

const clientLimiter = new RequestLimiter(50, 600_000);
const accountLimiter = new RequestLimiter(10, 600_000);
export function enforceLoginProcessLimit(request: Request, identifier: string) {
  const proxy = process.env.VERCEL || process.env.TRUST_PROXY === 'true';
  const ip = proxy ? (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : 'local';
  const accountHash = createHash('sha256').update(identifier).digest('hex');
  if (!clientLimiter.consume(ip.slice(0, 100)) || !accountLimiter.consume(accountHash)) throw new CmsError(429, 'Too many sign-in attempts. Try again in 10 minutes.');
}

function sessionTokens(session: Session) {
  return { access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, expires_at: session.expires_at, token_type: session.token_type };
}

export async function signIn(identifier: string, password: string) {
  const client = getPublicDatabase();
  if (!client) throw new CmsError(503, 'Sign-in is temporarily unavailable.');
  const database = getServerDatabase();
  if (!database) {
    // The Edge Function holds its own server credentials; they never enter the web client.
    const { url, publicKey } = getPublicAuthConfig();
    const result = await fetch(`${url}/functions/v1/portfolio-auth`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: publicKey! },
      body: JSON.stringify({ identifier, password }), cache: 'no-store', signal: AbortSignal.timeout(12_000)
    });
    if (!result.ok) throw new CmsError(result.status === 429 ? 429 : result.status === 401 ? 401 : 503, result.status === 429 ? 'Too many sign-in attempts. Try again in 10 minutes.' : result.status === 401 ? 'Sign-in failed. Check your credentials and confirm your email.' : 'Sign-in is temporarily unavailable.');
    const data = await result.json();
    if (typeof data.session?.access_token !== 'string' || !data.session.access_token || typeof data.session?.refresh_token !== 'string' || !data.session.refresh_token) throw new CmsError(503, 'Sign-in is temporarily unavailable.');
    return data.session as ReturnType<typeof sessionTokens>;
  }
  const identifierHash = createHash('sha256').update(`portfolio-login:v1:${identifier}`).digest('hex');
  const limit = await database.rpc('portfolio_consume_auth_limit', { identifier_hash: identifierHash });
  if (limit.error) throw new CmsError(503, 'Sign-in is temporarily unavailable.');
  if (limit.data !== true) throw new CmsError(429, 'Too many sign-in attempts. Try again in 10 minutes.');
  const lookup = await database.from('portfolio_profiles').select('email,user_id').eq(identifier.includes('@') ? 'email' : 'username', identifier).maybeSingle();
  if (lookup.error) throw new CmsError(503, 'Sign-in is temporarily unavailable.');
  // Always make the same password-auth request for missing usernames; do not expose account existence.
  const email = lookup.data?.email || (identifier.includes('@') ? identifier : 'unknown-account@invalid.example');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user?.email_confirmed_at || !lookup.data || lookup.data.user_id !== data.user.id) {
    if (data.session) await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    throw new CmsError(401, 'Sign-in failed. Check your credentials and confirm your email.');
  }
  return sessionTokens(data.session);
}

export async function getAccountProfile(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 10_000) throw new CmsError(401, 'Sign in to continue.');
  const accessToken = header.slice(7);
  const client = getPublicDatabase(accessToken);
  if (!client) throw new CmsError(503, 'Your account is temporarily unavailable.');
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user?.email_confirmed_at) throw new CmsError(401, 'Sign in with a verified email to continue.');
  const profile = await client.from('portfolio_profiles').select('username,email,role').eq('user_id', data.user.id).maybeSingle();
  if (profile.error) throw new CmsError(503, 'Your account could not be loaded.');
  if (!profile.data) throw new CmsError(403, 'This account is not registered for this portfolio.');
  return { username: profile.data.username, email: data.user.email, role: profile.data.role };
}
