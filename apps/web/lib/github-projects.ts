import { cache } from 'react';
import { unstable_cache } from 'next/cache';

export const projectCategories = [
  'Data Analytics',
  'Machine Learning',
  'Deep Learning',
  'Business Intelligence',
  'Generative AI',
  'Web Development',
] as const;

export type ProjectCategory = (typeof projectCategories)[number];

export type GitHubProject = {
  name: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  homepage: string | null;
  category?: ProjectCategory;
  language?: string | null;
  topics?: string[];
  stars?: number | null;
  forks?: number | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  /** Repository size reported by GitHub in KiB; not an implementation score. */
  size?: number | null;
  /** Verified with the contents endpoint, never inferred from repository size. */
  sourceStatus?: 'available' | 'empty' | null;
  metadataSource?: 'github' | 'snapshot' | 'cms';
  caseStudy?: Record<string, string>;
  metrics?: Record<string, string | number>;
  evaluationMetrics?: { name: string; value: number; unit?: string; dataset: string; methodology: string }[];
  featured?: boolean;
  status?: 'In progress' | 'Completed' | 'Archived';
  complexity?: 'Introductory' | 'Intermediate' | 'Advanced';
  imageUrl?: string;
  visualizations?: { title: string; description: string; imageUrl?: string; sourceUrl?: string }[];
  published?: boolean;
};

export const GITHUB_PROFILE_URL = 'https://github.com/safika28';

const GITHUB_OWNER = 'safika28';

type ProjectDetails = Pick<GitHubProject, 'title' | 'summary' | 'tags' | 'category'>;

const projectDetails: Record<string, ProjectDetails> = {
  'End-to-End-Business-Intelligence-AI-Decision-Platform': {
    title: 'Business Intelligence & AI Decisions',
    summary: 'Repository focused on business intelligence and AI-assisted decision-making.',
    tags: ['Business Intelligence', 'AI', 'Decision-Making'],
    category: 'Business Intelligence',
  },
  'AI-Powered-Customer-Feedback-Sentiment-Intelligence': {
    title: 'Customer Feedback & Sentiment Intelligence',
    summary: 'Repository focused on customer feedback and sentiment intelligence.',
    tags: ['Customer Feedback', 'Sentiment', 'AI'],
    category: 'Data Analytics',
  },
  'Healthcare-Operations-Hospital-Readmission-Analytics': {
    title: 'Healthcare Operations & Readmission Analytics',
    summary: 'Repository focused on healthcare operations and hospital readmission analytics.',
    tags: ['Healthcare', 'Operations', 'Analytics'],
    category: 'Data Analytics',
  },
  'Product-Funnel-Analytics-A-B-Testing-Platform': {
    title: 'Product Funnel Analytics & A/B Testing',
    summary: 'Repository focused on product funnel analytics and A/B testing.',
    tags: ['Product Analytics', 'Funnels', 'A/B Testing'],
    category: 'Data Analytics',
  },
  'Retail-Inventory-Optimization-Demand-Forecasting': {
    title: 'Retail Inventory & Demand Forecasting',
    summary: 'Repository focused on retail inventory optimization and demand forecasting.',
    tags: ['Retail', 'Inventory', 'Forecasting'],
    category: 'Machine Learning',
  },
  'HR-Workforce-Analytics-Employee-Attrition-Prediction': {
    title: 'Workforce Analytics & Attrition Prediction',
    summary: 'Repository focused on workforce analytics and employee attrition prediction.',
    tags: ['Workforce', 'Analytics', 'Attrition'],
    category: 'Machine Learning',
  },
  'Food-Delivery-Demand-Forecasting-Operations-Analytics': {
    title: 'Food Delivery Demand & Operations Analytics',
    summary: 'Repository focused on food delivery demand forecasting and operations analytics.',
    tags: ['Food Delivery', 'Forecasting', 'Operations'],
    category: 'Machine Learning',
  },
  'Customer-Churn-Prediction-Retention-Intelligence': {
    title: 'Customer Churn & Retention Intelligence',
    summary: 'Repository focused on customer churn prediction and retention intelligence.',
    tags: ['Customers', 'Churn', 'Retention'],
    category: 'Machine Learning',
  },
  'Banking-Fraud-Detection-Financial-Risk-Analytics': {
    title: 'Banking Fraud & Financial Risk Analytics',
    summary: 'Repository focused on banking fraud detection and financial risk analytics.',
    tags: ['Banking', 'Fraud', 'Risk Analytics'],
    category: 'Machine Learning',
  },
  'E-Commerce-Sales-Analytics-Revenue-Prediction': {
    title: 'E-Commerce Sales & Revenue Prediction',
    summary: 'Repository focused on e-commerce sales analytics and revenue prediction.',
    tags: ['E-Commerce', 'Sales', 'Revenue'],
    category: 'Machine Learning',
  },
  'safika-sultana-portfolio': {
    title: 'Safika Sultana Portfolio',
    summary: 'A dark-themed portfolio built with Next.js and TypeScript, with a NestJS API and database migration examples.',
    tags: ['Next.js', 'TypeScript', 'NestJS'],
    category: 'Web Development',
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
    homepage: null,
    language: null,
    topics: [],
    stars: null,
    forks: null,
    updatedAt: null,
    createdAt: null,
    size: null,
    sourceStatus: name === 'safika-sultana-portfolio' ? 'available' : 'empty',
    metadataSource: 'snapshot',
  }),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validHomepage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  // The repository's former public alias returned DEPLOYMENT_NOT_FOUND.
  // A current live URL can be published through the CMS or GitHub metadata.
  if (value.replace(/\/$/, '') === 'https://safika-sultana-portfolio.vercel.app') return null;

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
    category: details?.category,
    language: typeof value.language === 'string' && value.language.length <= 80 ? value.language : null,
    topics: Array.isArray(value.topics)
      ? value.topics.filter((topic): topic is string => typeof topic === 'string' && /^[a-z0-9-]{1,50}$/.test(topic))
      : [],
    stars: validCount(value.stargazers_count),
    forks: validCount(value.forks_count),
    updatedAt: validDate(value.updated_at),
    createdAt: validDate(value.created_at),
    size: validCount(value.size),
    sourceStatus: null,
    metadataSource: 'github',
  };
}

function validCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function validDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

const githubRequestOptions = {
  headers: {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'safika-sultana-portfolio',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  next: { revalidate: 3600 },
};

const getSourceStatus = unstable_cache(async (name: string): Promise<GitHubProject['sourceStatus']> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${encodeURIComponent(name)}/contents`,
      { ...githubRequestOptions, signal: AbortSignal.timeout(5000) },
    );
    const contents: unknown = await response.json();
    if (response.ok && Array.isArray(contents)) {
      return contents.some((entry) => isRecord(entry) && (entry.type === 'file' || entry.type === 'dir'))
        ? 'available'
        : null;
    }
    // A generic 404 can also mean missing permissions or a deleted repository.
    if (response.status === 404 && isRecord(contents) && contents.message === 'This repository is empty.') {
      return 'empty';
    }
  } catch {
    // Missing source evidence must not erase valid repository metadata.
  }
  return null;
}, ['github-source-availability-v1'], { revalidate: 3600 });

export function getProjectTechnologies(project: GitHubProject): string[] {
  return Array.from(new Set([
    ...(project.language ? [project.language] : []),
    ...(project.topics ?? []),
    ...(project.metadataSource === 'cms' ? project.tags : []),
  ]));
}

export function formatRepositoryDate(value: string | null | undefined): string {
  if (!value) return 'Unavailable';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : 'Unavailable';
}

export function sourceStatusLabel(project: GitHubProject): string {
  if (!project.url) return 'Source not linked';
  if (project.sourceStatus === 'available') return 'Source available';
  if (project.sourceStatus === 'empty') return 'Awaiting source';
  return 'Source unverified';
}

export const getGitHubProjects = cache(async (): Promise<GitHubProject[]> => {
  try {
    const projects = new Map<string, GitHubProject>();

    for (let page = 1; ; page += 1) {
      const response = await fetch(
        `https://api.github.com/users/${GITHUB_OWNER}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
        {
          ...githubRequestOptions,
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
    const result = Array.from(projects.values());
    // Limit concurrency and cache each request to stay within public API limits.
    for (let start = 0; start < result.length; start += 4) {
      await Promise.all(result.slice(start, start + 4).map(async (project) => {
        project.sourceStatus = await getSourceStatus(project.name);
      }));
    }
    return result;
  } catch {
    return githubProjectSnapshot.map((project) => ({ ...project, tags: [...project.tags], topics: [] }));
  }
});
