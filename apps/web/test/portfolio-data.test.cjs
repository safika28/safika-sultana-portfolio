const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const emptyContent = () => ({ profile: null, skills: [], projects: [], experience: [], education: [], certifications: [], posts: [], settings: null, source: 'unconfigured' });
const repository = (name, extra = {}) => ({ name, title: name, summary: 'A verified public repository.', url: `https://github.com/safika28/${name}`, homepage: null, tags: ['Python'], category: 'Data Analytics', language: 'Python', stars: 31, forks: 7, updatedAt: '2026-10-10T10:00:00Z', createdAt: '2026-01-01T10:00:00Z', size: 120, sourceStatus: 'available', metadataSource: 'github', ...extra });

function bridge(content, projects) {
  const modules = new Map();
  function load(relative) {
    const absolute = path.resolve(__dirname, '..', relative);
    if (modules.has(absolute)) return modules.get(absolute).exports;
    const module = { exports: {} }; modules.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, esModuleInterop: true } }).outputText;
    const localRequire = (name) => {
      if (name === 'server-only') return {};
      // React's request-scoped cache is an identity boundary in this isolated test.
      if (name === 'react') return { cache: (fn) => fn };
      if (name === './cms') return { getPortfolioContent: async () => content };
      if (name === './github-projects') return { getGitHubProjects: async () => projects, GITHUB_PROFILE_URL: 'https://github.com/safika28', projectCategories: ['Data Analytics', 'Machine Learning', 'Deep Learning', 'Business Intelligence', 'Generative AI', 'Web Development'] };
      if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), `${name}.ts`)));
      return require(name);
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  return load('lib/portfolio-data.ts').getPortfolioData;
}

test('published case studies enrich a genuine repository without losing GitHub facts', async () => {
  const original = repository('Sales-Analysis', { topics: ['pandas', 'analytics'] });
  const content = { ...emptyContent(), source: 'database', projects: [{ slug: 'sales-analysis', title: 'Sales decision support', summary: 'A documented retail analysis.', category: 'Business Intelligence', tags: ['Python', 'Power BI'], githubUrl: 'https://github.com/safika28/sales-analysis', featured: true, status: 'Completed' }] };
  const result = await bridge(content, [original])();
  assert.equal(result.projects.length, 1);
  const project = result.projects[0];
  assert.equal(project.title, 'Sales decision support');
  assert.equal(project.summary, 'A documented retail analysis.');
  assert.deepEqual(project.tags, ['Python', 'Power BI']);
  for (const key of ['language', 'stars', 'forks', 'updatedAt', 'createdAt', 'size', 'sourceStatus']) assert.equal(project[key], original[key], `GitHub ${key} must remain authentic`);
  assert.deepEqual(project.topics, ['pandas', 'analytics']);
  assert.equal(original.title, 'Sales-Analysis'); // Shared upstream data is not mutated.
});

test('evaluation evidence and actual visualization assets reach project detail data', async () => {
  const metric = { name: 'RMSE', value: 12.4, unit: 'USD', dataset: 'Held-out retail sales, Jan–Mar 2026', methodology: 'Chronological holdout, no future feature leakage.' };
  const visualization = { title: 'Forecast residuals', description: 'Errors on the held-out period.', imageUrl: '/charts/residuals.png', sourceUrl: 'https://github.com/safika28/Forecast/blob/main/evaluation.ipynb' };
  const content = { ...emptyContent(), source: 'database', projects: [{ slug: 'forecast', title: 'Forecast', summary: 'Demand forecasting case study.', category: 'Machine Learning', tags: ['Python'], githubUrl: 'https://github.com/safika28/Forecast', imageUrl: '/charts/forecast.png', metrics: [metric], visualizations: [visualization], dataset: 'Retail transactions.', evaluation: 'Chronological holdout.', limitations: 'Seasonal shifts require monitoring.' }] };
  const { projects } = await bridge(content, [repository('Forecast')])();
  assert.deepEqual(projects[0].evaluationMetrics, [metric]);
  assert.equal(projects[0].imageUrl, '/charts/forecast.png');
  assert.deepEqual(projects[0].visualizations, [visualization]);
  assert.equal(projects[0].caseStudy.dataset, 'Retail transactions.');
  assert.equal(projects[0].caseStudy.limitations, 'Seasonal shifts require monitoring.');
});

test('an empty CMS preserves the owner supplied contact details and all 108 unique skills', async () => {
  const content = emptyContent();
  const result = await bridge(content, [repository('Portfolio')])();
  assert.equal(result.profile.name, 'Safika Sultana');
  assert.equal(result.profile.location, 'Electronic City, Bengaluru');
  assert.equal(result.profile.email, 'safikasultana90@gmail.com');
  assert.equal(result.profile.phoneHref, 'tel:+918822971471');
  assert.equal(result.profile.cvUrl, null);
  const skills = result.skillGroups.flatMap((group) => group.skills);
  assert.equal(skills.length, 108); assert.equal(new Set(skills).size, 108);
  for (const skill of ['Python', 'SQL', 'PyTorch', 'Next.js', 'Supabase', 'Codex']) assert.ok(skills.includes(skill));
  assert.deepEqual(result.content.experience, []); assert.deepEqual(result.content.education, []);
});

test('duplicate published skill categories combine their skills in one visitor category', async () => {
  const content = { ...emptyContent(), source: 'database', skills: [{ title: 'Programming', skills: ['Python', 'SQL'] }, { title: 'programming', skills: ['SQL', 'TypeScript'] }, { title: 'Databases', skills: ['PostgreSQL'] }] };
  const result = await bridge(content, [])();
  assert.deepEqual(result.skillGroups, [{ title: 'Programming', skills: ['Python', 'SQL', 'TypeScript'] }, { title: 'Databases', skills: ['PostgreSQL'] }]);
});

test('featured project ordering accepts mixed case and preserves unlisted repositories', async () => {
  const source = [repository('Alpha'), repository('Beta'), repository('Unlisted')];
  const content = { ...emptyContent(), source: 'database', settings: { featuredOrder: ['BETA', 'aLpHa', 'missing-repository'] } };
  const result = await bridge(content, source)();
  assert.deepEqual(result.projects.map((project) => project.name), ['Beta', 'Alpha', 'Unlisted']);
  assert.deepEqual(source.map((project) => project.name), ['Alpha', 'Beta', 'Unlisted']);
});

test('supplied certificates stay visible and a published update retains its original PDF', async () => {
  const content = { ...emptyContent(), source: 'database', certifications: [{ id: 'database-record', title: 'Google Ads for Beginners', organization: 'Coursera', dates: '3 March 2025', description: 'Updated owner description.' }] };
  const result = await bridge(content, [])();
  assert.equal(result.content.certifications.length, 3);
  const certificate = result.content.certifications.find(record => record.title === 'Google Ads for Beginners');
  assert.equal(certificate.description, 'Updated owner description.');
  assert.equal(certificate.documentUrl, '/certificates/coursera-9sfv0uhpv9z6.pdf');
  assert.equal(certificate.credentialUrl, 'https://coursera.org/share/bd8f78c3f59d26a370735caace008dde');
  assert.ok(result.content.certifications.some(record => record.title === '100 Days of Code: The Complete Python Pro Bootcamp'));
  assert.ok(result.content.certifications.some(record => record.title === 'Data Analyst Skillpath: Zero to Hero in Excel, SQL & Python'));
});
