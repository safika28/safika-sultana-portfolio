export type GitHubProject = {
  name: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  homepage: string | null;
};

export const GITHUB_PROFILE_URL = 'https://github.com/safika28';

const GITHUB_OWNER = 'safika28';

type ProjectDetails = Pick<GitHubProject, 'title' | 'summary' | 'tags'>;

const projectDetails: Record<string, ProjectDetails> = {
  'End-to-End-Business-Intelligence-AI-Decision-Platform': {
    title: 'Business Intelligence & AI Decisions',
    summary: 'Repository focused on business intelligence and AI-assisted decision-making.',
    tags: ['Business Intelligence', 'AI', 'Decision-Making'],
  },
  'AI-Powered-Customer-Feedback-Sentiment-Intelligence': {
    title: 'Customer Feedback & Sentiment Intelligence',
    summary: 'Repository focused on customer feedback and sentiment intelligence.',
    tags: ['Customer Feedback', 'Sentiment', 'AI'],
  },
  'Healthcare-Operations-Hospital-Readmission-Analytics': {
    title: 'Healthcare Operations & Readmission Analytics',
    summary: 'Repository focused on healthcare operations and hospital readmission analytics.',
    tags: ['Healthcare', 'Operations', 'Analytics'],
  },
  'Product-Funnel-Analytics-A-B-Testing-Platform': {
    title: 'Product Funnel Analytics & A/B Testing',
    summary: 'Repository focused on product funnel analytics and A/B testing.',
    tags: ['Product Analytics', 'Funnels', 'A/B Testing'],
  },
  'Retail-Inventory-Optimization-Demand-Forecasting': {
    title: 'Retail Inventory & Demand Forecasting',
    summary: 'Repository focused on retail inventory optimization and demand forecasting.',
    tags: ['Retail', 'Inventory', 'Forecasting'],
  },
  'HR-Workforce-Analytics-Employee-Attrition-Prediction': {
    title: 'Workforce Analytics & Attrition Prediction',
    summary: 'Repository focused on workforce analytics and employee attrition prediction.',
    tags: ['Workforce', 'Analytics', 'Attrition'],
  },
  'Food-Delivery-Demand-Forecasting-Operations-Analytics': {
    title: 'Food Delivery Demand & Operations Analytics',
    summary: 'Repository focused on food delivery demand forecasting and operations analytics.',
    tags: ['Food Delivery', 'Forecasting', 'Operations'],
  },
  'Customer-Churn-Prediction-Retention-Intelligence': {
    title: 'Customer Churn & Retention Intelligence',
    summary: 'Repository focused on customer churn prediction and retention intelligence.',
    tags: ['Customers', 'Churn', 'Retention'],
  },
  'Banking-Fraud-Detection-Financial-Risk-Analytics': {
    title: 'Banking Fraud & Financial Risk Analytics',
    summary: 'Repository focused on banking fraud detection and financial risk analytics.',
    tags: ['Banking', 'Fraud', 'Risk Analytics'],
  },
  'E-Commerce-Sales-Analytics-Revenue-Prediction': {
    title: 'E-Commerce Sales & Revenue Prediction',
    summary: 'Repository focused on e-commerce sales analytics and revenue prediction.',
    tags: ['E-Commerce', 'Sales', 'Revenue'],
  },
  'safika-sultana-portfolio': {
    title: 'Safika Sultana Portfolio',
    summary: 'A dark-themed portfolio built with Next.js and TypeScript, with a NestJS API and database migration examples.',
    tags: ['Next.js', 'TypeScript', 'NestJS'],
  },
};

// All 11 public repositories verified against GitHub on October 11, 2026.
// The ten analytics repositories have no files yet; their summaries describe
// their named scope without claiming completed features or results.
export const githubProjectSnapshot: GitHubProject[] = Object.entries(projectDetails).map(
  ([name, details]) => ({
    name,
    ...details,
    tags: [...details.tags],
    url: `${GITHUB_PROFILE_URL}/${name}`,
    homepage: name === 'safika-sultana-portfolio'
      ? 'https://safika-sultana-portfolio.vercel.app'
      : null,
  }),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validHomepage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function normalizeRepository(value: unknown): GitHubProject | null {
  if (!isRecord(value) || value.private !== false || !isRecord(value.owner)) return null;
  if (value.owner.login !== GITHUB_OWNER || typeof value.name !== 'string') return null;

  const name = value.name;
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name) || name === '.' || name === '..') return null;

  const url = `${GITHUB_PROFILE_URL}/${name}`;
  if (value.html_url !== url) return null;

  const details = Object.prototype.hasOwnProperty.call(projectDetails, name)
    ? projectDetails[name]
    : undefined;
  const description = typeof value.description === 'string' ? value.description.trim() : '';

  return {
    name,
    title: details?.title ?? name.replace(/[-_]+/g, ' ').trim(),
    summary: description || details?.summary || 'Explore this repository on GitHub for project details and updates.',
    url,
    tags: details ? [...details.tags] : [],
    homepage: validHomepage(value.homepage),
  };
}

export async function getGitHubProjects(): Promise<GitHubProject[]> {
  try {
    const projects = new Map<string, GitHubProject>();

    for (let page = 1; ; page += 1) {
      const response = await fetch(
        `https://api.github.com/users/${GITHUB_OWNER}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'safika-sultana-portfolio',
          },
          next: { revalidate: 3600 },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) throw new Error('GitHub repository request failed.');

      const repositories: unknown = await response.json();
      if (!Array.isArray(repositories)) throw new Error('Invalid GitHub repository response.');

      for (const repository of repositories) {
        const project = normalizeRepository(repository);
        if (project) projects.set(project.name, project);
      }

      if (repositories.length < 100) break;
    }

    if (projects.size === 0) throw new Error('No valid public repositories returned.');
    return Array.from(projects.values());
  } catch {
    return githubProjectSnapshot.map((project) => ({ ...project, tags: [...project.tags] }));
  }
}
