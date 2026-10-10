const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the real client modules while stubbing their browser-only boundaries.
// These tests exercise security helpers without creating sessions or mounting UI.
function loadClientModule(file) {
  const absolute = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  const compiledModule = { exports: {} };
  const localRequire = (name) => {
    if (name === 'next/link') return () => null;
    if (name === 'next/navigation') return { useRouter: () => { throw new Error('A security helper must not navigate.'); } };
    if (name === 'lucide-react') return {};
    if (name === '@/lib/supabase-browser') return { getBrowserSupabaseClient: () => { throw new Error('A security helper must not access Auth.'); } };
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { safeInternalRedirect } = loadClientModule('components/auth-form.tsx');
const { profileFromResponse } = loadClientModule('components/account-panel.tsx');

test('post-login navigation preserves valid internal destinations', () => {
  for (const value of ['/account', '/projects', '/admin?tab=education#editor', '/projects?category=analytics', '/projects/revenue-analysis']) {
    assert.equal(safeInternalRedirect(value), value);
  }
});

test('post-login navigation rejects external origins and encoded URL separators', () => {
  const attacks = [
    'https://attacker.example', 'http://attacker.example', 'javascript:alert(1)',
    '//attacker.example', '///attacker.example', '/\\attacker.example',
    '/%5cattacker.example', '/%2f%2fattacker.example', '/%252f%252fattacker.example',
    '/%255cattacker.example', '/\n/attacker.example', '/%0d%0a/attacker.example', '/%09/attacker.example'
  ];
  for (const value of attacks) assert.equal(safeInternalRedirect(value), '/account', value);
});

test('URL normalization cannot convert a local path into a protocol-relative destination', () => {
  for (const value of ['/../%2f%2fattacker.example', '/%2e%2e//attacker.example', '/safe/..//attacker.example', '/safe/%2e%2e/%2fattacker.example']) {
    assert.equal(safeInternalRedirect(value), '/account', value);
  }
});

test('auth and API destinations, malformed escapes, and oversized values fail safely', () => {
  for (const value of [undefined, '', '/login?next=/admin', '/register', '/auth/callback', '/api/auth/profile', '/projects/../login', '/%ZZ', '/' + 'a'.repeat(2049)]) {
    assert.equal(safeInternalRedirect(value), '/account');
  }
});

test('protected profile responses accept only the database role enum', () => {
  for (const role of ['viewer', 'editor', 'super_admin']) {
    const profile = { username: 'account_one', email: 'account@example.test', role };
    assert.deepEqual(profileFromResponse(profile), profile);
  }
  for (const role of ['member', 'admin', 'owner', 'EDITOR', '', null, undefined, 1, ['super_admin']]) {
    assert.equal(profileFromResponse({ username: 'account_one', email: null, role }), null);
  }
});

test('user-controlled metadata cannot supply or override a protected profile role', () => {
  const metadata = { role: 'super_admin' };
  assert.equal(profileFromResponse({ username: 'account_one', email: null, user_metadata: metadata }), null);
  assert.deepEqual(profileFromResponse({ username: 'account_one', email: null, role: 'viewer', user_metadata: metadata, app_metadata: metadata }), {
    username: 'account_one', email: null, role: 'viewer'
  });
});

test('malformed profile fields are rejected rather than granting partial access', () => {
  for (const value of [null, [], {}, { username: 12, email: null, role: 'editor' }, { username: 'account_one', email: { value: 'email' }, role: 'editor' }, { email: null, role: 'super_admin' }]) {
    assert.equal(profileFromResponse(value), null);
  }
  assert.deepEqual(profileFromResponse({ username: null, email: null, role: 'viewer' }), { username: null, email: null, role: 'viewer' });
});
