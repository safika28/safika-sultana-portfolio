const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the isolated server modules for Node's test runner. The database boundary
// is mocked; all validation, authorization, and request handling stays real.
let database;
const cache = new Map();
function load(file) {
  const absolute = path.resolve(__dirname, '..', file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const module = { exports: {} }; cache.set(absolute, module);
  const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true } }).outputText;
  const localRequire = (name) => {
    if (name === 'server-only') return {};
    if (name === '@supabase/supabase-js') return { createClient: () => database };
    if (name === 'next/cache') return { revalidatePath: () => undefined };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), `${name}.ts`)));
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { contactSchema, RequestLimiter } = load('lib/contact-validation.ts');
const { authorizeAdmin, validateContent, readJsonBody, checkSameOrigin, enforceContactLimit, getPortfolioContent } = load('lib/cms.ts');
const contactRoute = load('app/api/contact/route.ts');
const contentRoute = load('app/api/admin/content/route.ts');
const valid = { name: 'A visitor', email: 'visitor@example.com', subject: 'A collaboration', message: 'I would like to discuss a project.', website: '' };
const original = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
test.before(() => { process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key'; });
test.after(() => { for (const [name, value] of [['SUPABASE_URL', original.url], ['SUPABASE_SERVICE_ROLE_KEY', original.key]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
test('contact validates bounds, unknown fields, email, and the honeypot', () => {
  assert.equal(contactSchema.safeParse(valid).success, true);
  for (const input of [{ ...valid, name: 'a' }, { ...valid, email: 'invalid' }, { ...valid, message: 'short' }, { ...valid, subject: 'x'.repeat(161) }, { ...valid, website: 'spam' }, { ...valid, role: 'admin' }]) assert.equal(contactSchema.safeParse(input).success, false);
});
test('process limiter enforces its window and resets at expiration', () => {
  const limiter = new RequestLimiter(2, 1000);
  assert.equal(limiter.consume('client', 10), true);
  assert.equal(limiter.consume('client', 11), true);
  assert.equal(limiter.consume('client', 12), false);
  assert.equal(limiter.consume('another', 12), true);
  assert.equal(limiter.consume('client', 1010), true);
});
test('CMS rejects script URLs and invented metric records without methodology', () => {
  assert.throws(() => validateContent({ section: 'profile', published: true, position: 0, payload: { name: 'Owner', title: 'Title', bio: '', photoUrl: 'javascript:alert(1)' } }), { status: 400 });
  assert.throws(() => validateContent({ section: 'projects', published: true, position: 0, payload: { title: 'Test', slug: 'test', summary: 'Test case', category: 'Machine Learning', tags: [], metrics: [{ name: 'Accuracy', value: 95 }] } }), { status: 400 });
  assert.throws(() => validateContent({ section: 'profile', published: true, position: 0, payload: { name: 'Owner', title: 'Title', bio: '', role: 'super_admin' } }), { status: 400 });
});

test('education accepts academic details and rejects unsafe institution logos', () => {
  const input = { section: 'education', published: true, position: 0, payload: { title: 'Class 12', institution: 'Ramanujan Junior College, Nagaon', dates: '2022', grade: '78%', status: 'Completed', logoUrl: '/institutions/ramanujan.png', logoAlt: 'Ramanujan seal', logoFit: 'cover' } };
  assert.equal(validateContent(input).payload.logoUrl, '/institutions/ramanujan.png');
  assert.throws(() => validateContent({ ...input, payload: { ...input.payload, logoUrl: 'javascript:alert(1)' } }), { status: 400 });
});
test('bounded JSON parser rejects content type and streamed oversized bodies', async () => {
  await assert.rejects(() => readJsonBody(new Request('http://localhost/api', { method: 'POST', body: '{}' })), { status: 415 });
  await assert.rejects(() => readJsonBody(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(20) }), 10), { status: 413 });
  await assert.rejects(() => readJsonBody(new Request('http://localhost/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })), { status: 400 });
});
test('cross-origin mutations are rejected', () => {
  assert.throws(() => checkSameOrigin(new Request('https://portfolio.example/api', { headers: { Origin: 'https://attacker.example' } })), { status: 403 });
  assert.doesNotThrow(() => checkSameOrigin(new Request('https://portfolio.example/api', { headers: { Origin: 'https://portfolio.example' } })));
});
const authRequest = () => new Request('https://portfolio.example/api/admin', { headers: { Authorization: 'Bearer token' } });
test('admin access requires a valid Auth user and protected database role', async () => {
  await assert.rejects(() => authorizeAdmin(new Request('https://portfolio.example/api/admin')), { status: 401 });
  database = { auth: { getUser: async () => ({ data: { user: null }, error: new Error('expired') }) } };
  await assert.rejects(() => authorizeAdmin(authRequest()), { status: 401 });
  let readUserId;
  const makeDb = (role) => ({ auth: { getUser: async () => ({ data: { user: { id: 'real-user', email_confirmed_at: '2026-10-11', user_metadata: { role: 'super_admin' } } }, error: null }) }, from: () => ({ select: () => ({ eq: (_field, value) => { readUserId = value; return { maybeSingle: async () => ({ data: { role }, error: null }) }; } }) }) });
  database = makeDb('viewer');
  await assert.rejects(() => authorizeAdmin(authRequest()), { status: 403 });
  database = makeDb('editor');
  const result = await authorizeAdmin(authRequest());
  assert.equal(result.role, 'editor'); assert.equal(readUserId, 'real-user');
});
test('durable limiter fails closed when the database rejects a request', async () => {
  await assert.rejects(() => enforceContactLimit(new Request('http://localhost/api/contact'), { rpc: async () => ({ data: false, error: null }) }), { status: 429 });
  await assert.rejects(() => enforceContactLimit(new Request('http://localhost/api/contact'), { rpc: async () => ({ data: null, error: new Error('offline') }) }), { status: 503 });
});
test('unconfigured CMS returns empty records, with no fabricated analytics', async () => {
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = '';
  const content = await getPortfolioContent();
  assert.equal(content.source, 'unconfigured'); assert.deepEqual(content.projects, []); assert.deepEqual(content.experience, []);
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
});
test('public CMS reads only published records and drops schema-invalid payloads', async () => {
  const input = [
    { id: 'public', section: 'skills', payload: { title: 'Programming', skills: ['Python'] }, published: true },
    { id: 'draft', section: 'skills', payload: { title: 'Private draft', skills: ['SQL'] }, published: false },
    { id: 'invalid', section: 'profile', payload: { name: 'Owner', title: 'Title', bio: '', linkedInUrl: 'javascript:alert(1)' }, published: true }
  ];
  let filter;
  database = { from: () => ({ select: () => ({ eq: (field, value) => { filter = [field, value]; return { order: () => ({ limit: async () => ({ data: input.filter((record) => record[field] === value), error: null }) }) }; } }) }) };
  const content = await getPortfolioContent();
  assert.deepEqual(filter, ['published', true]);
  assert.deepEqual(content.skills, [{ title: 'Programming', skills: ['Python'] }]);
  assert.equal(content.profile, null); assert.equal(content.source, 'database');
});
const jsonRequest = (url, data, token) => new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer token' } : {}) }, body: JSON.stringify(data) });
test('Next contact route never confirms an unconfigured or failed insert', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let response = await contactRoute.POST(jsonRequest('http://localhost/api/contact', valid));
  assert.equal(response.status, 503);
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'route-test-key';
  database = { rpc: async () => ({ data: true, error: null }), from: () => ({ insert: async () => ({ error: new Error('unavailable') }) }) };
  response = await contactRoute.POST(jsonRequest('http://localhost/api/contact', valid));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).message, undefined);
});
test('Next contact route confirms storage only after inserting validated fields', async () => {
  let inserted;
  database = { rpc: async () => ({ data: true, error: null }), from: () => ({ insert: async (value) => { inserted = value; return { error: null }; } }) };
  const response = await contactRoute.POST(jsonRequest('http://localhost/api/contact', valid));
  assert.equal(response.status, 201); assert.equal(inserted.website, undefined); assert.equal(inserted.message, valid.message);
});
test('Next contact route rejects invalid input and a exhausted durable limit', async () => {
  let response = await contactRoute.POST(jsonRequest('http://localhost/api/contact', { ...valid, message: 'short' }));
  assert.equal(response.status, 400);
  database = { rpc: async () => ({ data: false, error: null }) };
  response = await contactRoute.POST(jsonRequest('http://localhost/api/contact', valid));
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '600');
});
function adminDatabase(role) {
  return { auth: { getUser: async () => ({ data: { user: { id: 'approved-user', email_confirmed_at: '2026-10-11' } }, error: null }) }, from: (table) => table === 'portfolio_profiles' ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role }, error: null }) }) }) } : { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { section: 'settings' }, error: null }) }) }) } };
}
test('CMS mutation routes enforce roles, schemas, and settings permissions', async () => {
  let response = await contentRoute.POST(jsonRequest('http://localhost/api/admin/content', {}));
  assert.equal(response.status, 401);
  database = adminDatabase('viewer');
  response = await contentRoute.POST(jsonRequest('http://localhost/api/admin/content', {}, true));
  assert.equal(response.status, 403);
  database = adminDatabase('editor');
  response = await contentRoute.POST(jsonRequest('http://localhost/api/admin/content', { section: 'projects', payload: { title: 'Incomplete' }, published: true, position: 0 }, true));
  assert.equal(response.status, 400);
  response = await contentRoute.POST(jsonRequest('http://localhost/api/admin/content', { section: 'settings', payload: { theme: 'dark' }, published: true, position: 0 }, true));
  assert.equal(response.status, 403);
  response = await contentRoute.PATCH(jsonRequest('http://localhost/api/admin/content', { id: '9a225d37-0b99-4d37-aee2-b8795745da49', section: 'skills', payload: { title: 'Programming', skills: ['Python'] }, published: true, position: 0 }, true));
  assert.equal(response.status, 403); // An editor cannot change a settings record's section to bypass the restriction.
});
