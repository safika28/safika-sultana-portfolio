const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the real server modules and Next handlers. Only the SDK and Edge
// network boundaries are replaced; all users, keys, passwords, and tokens are dummy.
const dummyUrl = 'https://auth-test.example.supabase.co';
const dummyPublicKey = 'dummy-public-key';
const dummyServiceKey = 'dummy-service-key';
const dummyTokens = { access_token: 'dummy-access-token', refresh_token: 'dummy-refresh-token', expires_in: 3600, expires_at: 1_900_000_000, token_type: 'bearer' };
const verifiedUser = { id: 'verified-user', email: 'verified@example.test', email_confirmed_at: '2026-10-11', user_metadata: { role: 'super_admin', username: 'forged_username' } };
const environmentNames = ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL', 'TRUST_PROXY'];
const originalEnvironment = Object.fromEntries(environmentNames.map(name => [name, process.env[name]]));
const originalFetch = global.fetch;
let state;
let modules;
let authServer;
let cms;
let loginRoute;
let profileRoute;

function database(kind) {
  return {
    auth: {
      getUser: async token => { state.getUsers.push({ kind, token }); return state.verifiedResult; },
      signInWithPassword: async credentials => { state.passwordAttempts.push({ kind, ...credentials }); return state.signInResult; },
      signOut: async options => { state.signOuts.push({ kind, options }); return { error: null }; }
    },
    rpc: async (name, parameters) => { state.limits.push({ kind, name, parameters }); return state.limitResult; },
    from: table => ({ select: columns => ({ eq: (field, value) => ({ maybeSingle: async () => {
      state.reads.push({ kind, table, columns, field, value });
      if (columns === 'email,user_id') return state.lookupResult;
      if (columns === 'role') return state.roleResult;
      if (columns === 'username,email,role') return state.profileResult;
      throw new Error('Unexpected database read.');
    } }) }) })
  };
}

function load(file) {
  const absolute = path.resolve(__dirname, '..', file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const compiledModule = { exports: {} };
  modules.set(absolute, compiledModule);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name === 'server-only') return {};
    if (name === '@supabase/supabase-js') return { createClient: (url, key, options) => {
      assert.equal(url, dummyUrl);
      const kind = key === dummyServiceKey ? 'service' : key === dummyPublicKey ? 'public' : null;
      assert.ok(kind, 'Only dummy credentials may enter the SDK stub.');
      state.clients.push({ kind, options });
      return kind === 'service' ? state.serviceDatabase : state.publicDatabase;
    } };
    if (name === 'next/cache') return { revalidatePath: () => undefined };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), `${name}.ts`)));
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

test.beforeEach(() => {
  process.env.SUPABASE_URL = dummyUrl;
  process.env.NEXT_PUBLIC_SUPABASE_URL = dummyUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = dummyPublicKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = dummyServiceKey;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY;
  state = {
    clients: [], getUsers: [], passwordAttempts: [], signOuts: [], reads: [], limits: [], edgeRequests: [],
    verifiedResult: { data: { user: { ...verifiedUser } }, error: null },
    signInResult: { data: { user: { ...verifiedUser }, session: { ...dummyTokens, user: verifiedUser } }, error: null },
    lookupResult: { data: { email: verifiedUser.email, user_id: verifiedUser.id }, error: null },
    profileResult: { data: { username: 'protected_username', email: 'stale-database-email@example.test', role: 'viewer' }, error: null },
    roleResult: { data: { role: 'viewer' }, error: null },
    limitResult: { data: true, error: null }, edgeHandler: null
  };
  state.serviceDatabase = database('service');
  state.publicDatabase = database('public');
  global.fetch = async (url, options) => {
    state.edgeRequests.push({ url, options });
    if (!state.edgeHandler) throw new Error('Unexpected network access: live requests are forbidden in this suite.');
    return state.edgeHandler(url, options);
  };
  modules = new Map();
  authServer = load('lib/auth-server.ts');
  cms = load('lib/cms.ts');
  loginRoute = load('app/api/auth/login/route.ts');
  profileRoute = load('app/api/auth/profile/route.ts');
});

test.after(() => {
  global.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

function loginRequest(data, headers = {}) {
  return new Request('https://portfolio.example/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://portfolio.example', ...headers }, body: JSON.stringify(data) });
}
const bearerRequest = (token = dummyTokens.access_token) => new Request('https://portfolio.example/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } });
async function responseBody(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  if (status >= 400) { assert.equal(typeof body.error, 'string'); assert.equal(body.session, undefined); }
  return body;
}

test('login normalizes usernames and emails while rejecting injected roles and malformed identifiers', async () => {
  assert.deepEqual(authServer.loginSchema.parse({ identifier: '  Mixed_User  ', password: 'KeepCase! ' }), { identifier: 'mixed_user', password: 'KeepCase! ' });
  assert.equal(authServer.loginSchema.parse({ identifier: '  PERSON@EXAMPLE.TEST ', password: 'password' }).identifier, 'person@example.test');
  for (const identifier of ['ab', 'user-name', 'bad email', 'a'.repeat(255)]) assert.equal(authServer.loginSchema.safeParse({ identifier, password: 'password' }).success, false);
  await responseBody(await loginRoute.POST(loginRequest({ identifier: 'mixed_user', password: 'password', role: 'super_admin' })), 400);
  assert.equal(state.clients.length, 0);
  const body = await responseBody(await loginRoute.POST(loginRequest({ identifier: '  Mixed_User ', password: 'KeepCase! ' })), 200);
  assert.deepEqual(body, { session: dummyTokens });
  assert.deepEqual(state.reads[0], { kind: 'service', table: 'portfolio_profiles', columns: 'email,user_id', field: 'username', value: 'mixed_user' });
  assert.equal(state.passwordAttempts[0].kind, 'public');
  assert.equal(state.passwordAttempts[0].password, 'KeepCase! ');
  await responseBody(await loginRoute.POST(loginRequest({ identifier: '  VERIFIED@EXAMPLE.TEST ', password: 'password' })), 200);
  assert.equal(state.reads[1].field, 'email');
  assert.equal(state.reads[1].value, 'verified@example.test');
});

test('missing usernames and wrong passwords return the same generic failure without revealing account existence', async () => {
  state.signInResult = { data: { user: null, session: null }, error: new Error('SDK detail must remain private.') };
  const known = await responseBody(await loginRoute.POST(loginRequest({ identifier: 'known_user', password: 'wrong-password' })), 401);
  state.lookupResult = { data: null, error: null };
  const missing = await responseBody(await loginRoute.POST(loginRequest({ identifier: 'missing_user', password: 'wrong-password' })), 401);
  assert.deepEqual(missing, known);
  assert.equal(known.error, 'Sign-in failed. Check your credentials and confirm your email.');
  assert.equal(state.passwordAttempts.length, 2);
  assert.equal(state.passwordAttempts[1].email, 'unknown-account@invalid.example');
});

test('service-backed login requires a confirmed Auth user matching the protected profile user ID', async () => {
  const validResult = state.signInResult;
  for (const invalidResult of [
    { data: { user: { ...verifiedUser, id: 'another-user' }, session: { ...dummyTokens } }, error: null },
    { data: { user: { ...verifiedUser, email_confirmed_at: null }, session: { ...dummyTokens } }, error: null },
    { data: { user: null, session: { ...dummyTokens } }, error: null },
    { data: { user: { ...verifiedUser }, session: null }, error: null }
  ]) {
    state.signInResult = invalidResult;
    await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' })), 401);
  }
  assert.equal(state.signOuts.length, 3);
  assert.ok(state.signOuts.every(item => item.kind === 'public' && item.options.scope === 'local'));
  state.signInResult = validResult;
  assert.deepEqual(await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' })), 200), { session: dummyTokens });
});

test('profile reads use verified getUser identity, public RLS credentials, and protected fields rather than metadata', async () => {
  const body = await responseBody(await profileRoute.GET(bearerRequest()), 200);
  assert.deepEqual(body, { username: 'protected_username', email: verifiedUser.email, role: 'viewer' });
  assert.deepEqual(state.getUsers, [{ kind: 'public', token: dummyTokens.access_token }]);
  assert.deepEqual(state.reads, [{ kind: 'public', table: 'portfolio_profiles', columns: 'username,email,role', field: 'user_id', value: verifiedUser.id }]);
  assert.equal(state.clients[0].options.global.headers.Authorization, `Bearer ${dummyTokens.access_token}`);
  assert.equal(state.clients[0].options.auth.persistSession, false);
});

test('missing, expired, and unverified sessions cannot read protected profile records', async () => {
  await responseBody(await profileRoute.GET(new Request('https://portfolio.example/api/auth/profile')), 401);
  assert.equal(state.clients.length, 0);
  for (const result of [
    { data: { user: null }, error: new Error('Expired token.') },
    { data: { user: { ...verifiedUser } }, error: new Error('Invalid signature.') },
    { data: { user: { ...verifiedUser, email_confirmed_at: null } }, error: null }
  ]) {
    state.verifiedResult = result;
    await responseBody(await profileRoute.GET(bearerRequest('expired-dummy-token')), 401);
  }
  assert.equal(state.reads.length, 0);
});

test('profile enrollment and database failures fail closed and never cache an error', async () => {
  state.profileResult = { data: null, error: null };
  await responseBody(await profileRoute.GET(bearerRequest()), 403);
  state.profileResult = { data: null, error: new Error('Private database details.') };
  const failed = await responseBody(await profileRoute.GET(bearerRequest()), 503);
  assert.equal(failed.error, 'Your account could not be loaded.');
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  await responseBody(await profileRoute.GET(bearerRequest()), 503);
});

test('CMS privileges follow the fresh protected role on every request and never user-editable metadata', async () => {
  await assert.rejects(() => cms.authorizeAdmin(bearerRequest()), { status: 403 });
  state.roleResult = { data: { role: 'editor' }, error: null };
  assert.equal((await cms.authorizeAdmin(bearerRequest())).role, 'editor');
  state.roleResult = { data: { role: 'viewer' }, error: null };
  await assert.rejects(() => cms.authorizeAdmin(bearerRequest()), { status: 403 });
  assert.equal(state.reads.length, 3);
  assert.ok(state.reads.every(read => read.field === 'user_id' && read.value === verifiedUser.id));
  state.roleResult = { data: { role: 'super_admin' }, error: null };
  state.verifiedResult = { data: { user: { ...verifiedUser, email_confirmed_at: null } }, error: null };
  await assert.rejects(() => cms.authorizeAdmin(bearerRequest()), { status: 401 });
  state.verifiedResult = { data: { user: null }, error: new Error('Expired session.') };
  await assert.rejects(() => cms.authorizeAdmin(bearerRequest()), { status: 401 });
  assert.equal(state.reads.length, 3);
});

test('CMS can authorize verified editor profiles using the public Bearer RLS path without a service key', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  state.roleResult = { data: { role: 'editor' }, error: null };
  const result = await cms.authorizeAdmin(bearerRequest());
  assert.equal(result.userId, verifiedUser.id);
  assert.equal(result.role, 'editor');
  assert.equal(state.getUsers[0].kind, 'public');
  assert.equal(state.clients[0].options.global.headers.Authorization, `Bearer ${dummyTokens.access_token}`);
});

test('same-origin checks allow the real loopback Host and reject attacker origins before authentication', async () => {
  assert.doesNotThrow(() => cms.checkSameOrigin(new Request('http://127.0.0.1:3000/api/auth/login', { headers: { Host: 'localhost:3000', Origin: 'http://localhost:3000' } })));
  assert.throws(() => cms.checkSameOrigin(new Request('http://127.0.0.1:3000/api/auth/login', { headers: { Host: 'localhost:3000', Origin: 'https://attacker.example' } })), { status: 403 });
  assert.throws(() => cms.checkSameOrigin(new Request('http://127.0.0.1:3000/api/auth/login', { headers: { Host: 'localhost:3000', Origin: 'http://localhost:4000' } })), { status: 403 });
  await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' }, { Origin: 'https://attacker.example' })), 403);
  assert.equal(state.clients.length, 0);
});

test('login body validation and durable limits fail before password authentication with non-cacheable status', async () => {
  await responseBody(await loginRoute.POST(new Request('https://portfolio.example/api/auth/login', { method: 'POST', body: '{}' })), 415);
  await responseBody(await loginRoute.POST(new Request('https://portfolio.example/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })), 400);
  await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' }, { 'Content-Length': '5000' })), 413);
  state.limitResult = { data: false, error: null };
  const limited = await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' }));
  assert.equal(limited.headers.get('retry-after'), '600');
  await responseBody(limited, 429);
  state.limitResult = { data: null, error: new Error('Private RPC failure.') };
  await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' })), 503);
  state.limitResult = { data: true, error: null };
  state.lookupResult = { data: null, error: new Error('Private lookup failure.') };
  await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'password' })), 503);
  assert.equal(state.passwordAttempts.length, 0);
});

test('Edge fallback uses only the public key and returns validated session strings without a live network', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  state.edgeHandler = async () => Response.json({ session: dummyTokens });
  assert.deepEqual(await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'dummy-password' })), 200), { session: dummyTokens });
  assert.equal(state.edgeRequests[0].url, `${dummyUrl}/functions/v1/portfolio-auth`);
  assert.equal(state.edgeRequests[0].options.headers.apikey, dummyPublicKey);
  assert.equal(state.edgeRequests[0].options.cache, 'no-store');
  assert.ok(state.edgeRequests[0].options.signal instanceof AbortSignal);
  assert.equal(state.limits.length, 0);
  for (const session of [null, {}, { access_token: '', refresh_token: 'dummy-refresh' }, { access_token: 'dummy-access', refresh_token: '' }, { access_token: { forged: true }, refresh_token: 'dummy-refresh' }, { access_token: 'dummy-access', refresh_token: 1 }]) {
    state.edgeHandler = async () => Response.json({ session });
    await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'dummy-password' })), 503);
  }
});

test('Edge authorization, rate-limit, and unexpected failures expose only generic non-cacheable responses', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  for (const [edgeStatus, status] of [[401, 401], [429, 429], [500, 503]]) {
    state.edgeHandler = async () => Response.json({ error: 'Private remote details.' }, { status: edgeStatus });
    const response = await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'dummy-password' }));
    if (status === 429) assert.equal(response.headers.get('retry-after'), '600');
    const body = await responseBody(response, status);
    assert.ok(!body.error.includes('Private remote'));
  }
  state.edgeHandler = async () => { throw new Error('Private network failure.'); };
  const body = await responseBody(await loginRoute.POST(loginRequest({ identifier: 'protected_user', password: 'dummy-password' })), 503);
  assert.equal(body.error, 'The service is temporarily unavailable. Please try again.');
});
