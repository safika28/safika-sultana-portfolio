const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Keep the real Edge handler, bounded body reader, validation, and response logic.
// Only Deno deployment/environment and the external Supabase boundary are mocked.
const source = fs.readFileSync(path.resolve(__dirname, '../../../database/functions/portfolio-auth/index.ts'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const session = {
  access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600,
  expires_at: 9999999999, token_type: 'bearer', private_property: 'must-not-leak',
};
const invalidCredentials = { error: 'Invalid username, email, or password.' };

function setup(overrides = {}) {
  const state = {
    allowed: true,
    profile: { user_id: 'verified-user' },
    user: { id: 'verified-user', email_confirmed_at: '2026-10-11T01:00:00Z' },
    lookup: { email: 'member@example.com' },
    ...overrides,
  };
  const calls = [];
  const clients = [];
  const environment = {
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_ANON_KEY: 'test-public',
    SUPABASE_SERVICE_ROLE_KEY: 'test-secret',
    ...state.environment,
  };
  const sdk = {
    createClient(url, key, options) {
      calls.push({ type: 'client', url, key, options });
      const client = key === 'test-secret' ? {
        async rpc(name, arguments_) {
          calls.push({ type: 'limit', name, arguments: arguments_ });
          return { data: state.allowed, error: state.limitError || null };
        },
        from(table) {
          return { select(columns) {
            return { eq(field, value) {
              return { async maybeSingle() {
                calls.push({ type: 'query', table, columns, field, value });
                const usernameLookup = field === 'username';
                return {
                  data: usernameLookup ? state.lookup : state.profile,
                  error: (usernameLookup ? state.lookupError : state.profileError) || null,
                };
              } };
            } };
          } };
        },
      } : {
        auth: {
          async signInWithPassword(credentials) {
            calls.push({ type: 'password', credentials });
            return {
              data: { user: state.user, session: state.session === undefined ? session : state.session },
              error: state.signInError || null,
            };
          },
          async signOut(options) {
            calls.push({ type: 'signOut', options });
            return { error: null };
          },
        },
      };
      clients.push(client);
      return client;
    },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'Deno', code)(
    (name) => {
      assert.equal(name, 'https://esm.sh/@supabase/supabase-js@2.117.3');
      return sdk;
    },
    module,
    module.exports,
    { env: { get: (name) => environment[name] }, serve: () => undefined },
  );
  return { handle: module.exports.handleRequest, calls, clients };
}

function request(payload = { identifier: 'Safika_28', password: 'a test password' }, options = {}) {
  return new Request('https://test-project.supabase.co/functions/v1/portfolio-auth', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), ...options,
  });
}

async function invalidResponse(overrides) {
  const result = setup(overrides);
  const response = await result.handle(request());
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), invalidCredentials);
  return result;
}

test('username login returns only session fields after verified identity and profile checks', async () => {
  const { handle, calls } = setup();
  const response = await handle(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { session: {
    access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600,
    expires_at: 9999999999, token_type: 'bearer',
  } });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(calls[1].type, 'limit');
  assert.equal(calls[1].name, 'portfolio_consume_auth_limit');
  assert.match(calls[1].arguments.identifier_hash, /^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(calls[1]).includes('safika'));
  assert.equal(calls.find((call) => call.type === 'password').credentials.email, 'member@example.com');
  assert.ok(calls.some((call) => call.type === 'query' && call.field === 'user_id' && call.value === 'verified-user'));
});

test('email login normalizes its identifier and skips the private username lookup', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle(request({ identifier: ' MEMBER@example.com ', password: 'password' }))).status, 200);
  assert.ok(!calls.some((call) => call.type === 'query' && call.field === 'username'));
  assert.equal(calls.find((call) => call.type === 'password').credentials.email, 'member@example.com');
});

test('unknown username crosses password authentication and cannot return a dummy-account session', async () => {
  const { calls } = await invalidResponse({ lookup: null });
  assert.equal(calls.find((call) => call.type === 'password').credentials.email, 'unknown-account@invalid.example');
  assert.deepEqual(calls.find((call) => call.type === 'signOut').options, { scope: 'local' });
});

test('wrong password returns the same generic response without provider diagnostics', async () => {
  await invalidResponse({ signInError: { message: 'sensitive Auth diagnostic' } });
});

test('missing Auth session fails closed', async () => {
  await invalidResponse({ session: null });
});

test('missing portfolio profile rejects and revokes only the newly created local session', async () => {
  const { calls } = await invalidResponse({ profile: null });
  assert.deepEqual(calls.find((call) => call.type === 'signOut').options, { scope: 'local' });
});

test('profile must belong to the actual authenticated user', async () => {
  await invalidResponse({ profile: { user_id: 'another-user' } });
});

test('unverified email and caller-controlled admin metadata cannot authorize login', async () => {
  await invalidResponse({ user: {
    id: 'verified-user', email_confirmed_at: null, user_metadata: { role: 'super_admin' },
  } });
});

test('durable limit blocks before any identifier lookup or password authentication', async () => {
  const { handle, calls } = setup({ allowed: false });
  const response = await handle(request());
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '600');
  assert.equal(calls.filter((call) => call.type === 'query' || call.type === 'password').length, 0);
});

test('limiter database errors fail closed and remain private', async () => {
  const { handle, calls } = setup({ limitError: { message: 'private database details' } });
  const response = await handle(request());
  assert.equal(response.status, 503);
  assert.ok(!JSON.stringify(await response.json()).includes('private database'));
  assert.ok(!calls.some((call) => call.type === 'password'));
});

test('unexpected limiter data never permits a login attempt', async () => {
  const { handle, calls } = setup({ allowed: 'true' });
  assert.equal((await handle(request())).status, 503);
  assert.ok(!calls.some((call) => call.type === 'password'));
});

test('username lookup errors do not reveal database details', async () => {
  const { handle } = setup({ lookupError: { message: 'private lookup error' } });
  const response = await handle(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Sign-in is temporarily unavailable.' });
});

test('failed protected profile lookup revokes the session and hides provider diagnostics', async () => {
  const { handle, calls } = setup({ profileError: { message: 'private profile error' } });
  const response = await handle(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Sign-in is temporarily unavailable.' });
  assert.deepEqual(calls.find((call) => call.type === 'signOut').options, { scope: 'local' });
});

test('additional fields, including caller-supplied roles, are rejected before client creation', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle(request({ identifier: 'valid', password: 'password', role: 'super_admin' }))).status, 400);
  assert.equal(calls.length, 0);
});

test('identifier shape, type, and username bounds are enforced', async () => {
  for (const payload of [
    { identifier: 'aa', password: 'password' }, { identifier: 'a'.repeat(31), password: 'password' },
    { identifier: 12, password: 'password' }, ['valid', 'password'],
  ]) {
    const { handle, calls } = setup();
    assert.equal((await handle(request(payload))).status, 400);
    assert.equal(calls.length, 0);
  }
});

test('password is required as a bounded string', async () => {
  for (const password of ['', 12, 'x'.repeat(257)]) {
    const { handle, calls } = setup();
    assert.equal((await handle(request({ identifier: 'valid', password }))).status, 400);
    assert.equal(calls.length, 0);
  }
});

test('streamed oversized bodies stop before reaching the database', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle(request({ identifier: 'valid', password: 'x'.repeat(5000) }))).status, 413);
  assert.equal(calls.length, 0);
});

test('malformed JSON and malformed UTF-8 are rejected', async () => {
  for (const body of ['{', new Uint8Array([0xff])]) {
    const { handle, calls } = setup();
    assert.equal((await handle(request({}, { body }))).status, 400);
    assert.equal(calls.length, 0);
  }
});

test('non-JSON requests are rejected', async () => {
  const { handle, calls } = setup();
  assert.equal((await handle(request({}, { headers: { 'Content-Type': 'text/plain' } }))).status, 415);
  assert.equal(calls.length, 0);
});

test('unsupported methods never initialize database clients', async () => {
  const { handle, calls } = setup();
  const response = await handle(new Request('https://test-project.supabase.co/functions/v1/portfolio-auth'));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.equal(calls.length, 0);
});

test('modern injected keys work and malformed missing secret configuration fails closed', async () => {
  const modern = setup({ environment: {
    SUPABASE_ANON_KEY: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined,
    SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'test-public' }),
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'test-secret' }),
  } });
  assert.equal((await modern.handle(request())).status, 200);
  const missing = setup({ environment: { SUPABASE_SERVICE_ROLE_KEY: undefined, SUPABASE_SECRET_KEYS: 'malformed' } });
  assert.equal((await missing.handle(request())).status, 503);
});

test('concurrent requests use separate non-persisting Auth clients and context-normalized hashes', async () => {
  const { handle, calls, clients } = setup();
  const responses = await Promise.all([
    handle(request({ identifier: 'Safika_28', password: 'first-password' })),
    handle(request({ identifier: ' safika_28 ', password: 'second-password' })),
  ]);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(new Set(clients).size, 4);
  assert.equal(calls.filter((call) => call.type === 'client' && call.key === 'test-public').length, 2);
  assert.ok(calls.filter((call) => call.type === 'client').every((call) =>
    call.options.auth.persistSession === false && call.options.auth.autoRefreshToken === false));
  const hashes = calls.filter((call) => call.type === 'limit').map((call) => call.arguments.identifier_hash);
  assert.equal(hashes[0], hashes[1]);
});
