import type { GitHubProject } from '@/lib/github-projects';
import { skillGroups } from '@/lib/site-data';

export type ChartDatum = { label: string; count: number };
export type AnalyticsView = 'categories' | 'topics' | 'languages' | 'updates';

export const PROJECT_CATEGORIES = [
  'Data Analytics',
  'Machine Learning',
  'Deep Learning',
  'Business Intelligence',
  'Generative AI',
  'Web Development',
] as const;

// Categories describe repository scope; they do not imply completed work.
export function projectCategory(project: GitHubProject): string {
  if (project.category) return project.category;
  const scope = `${project.name} ${project.tags.join(' ')}`.toLowerCase();
  if (/portfolio|next\.js|web-development/.test(scope)) return 'Web Development';
  if (/business-intelligence/.test(scope)) return 'Business Intelligence';
  if (/generative|rag|llm/.test(scope)) return 'Generative AI';
  if (/deep-learning|neural/.test(scope)) return 'Deep Learning';
  if (/prediction|forecasting|fraud|sentiment/.test(scope)) return 'Machine Learning';
  return 'Data Analytics';
}

export function countLabels(labels: string[]): ChartDatum[] {
  const counts = new Map<string, number>();
  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  return Array.from(counts, ([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function projectChartData(projects: GitHubProject[], view: AnalyticsView): ChartDatum[] {
  switch (view) {
    case 'topics':
      return countLabels(projects.flatMap((project) => Array.from(new Set(project.tags))));
    case 'languages':
      return countLabels(projects.map((project) => project.language || 'Not reported'));
    case 'updates':
      return countLabels(projects.flatMap((project) => {
        if (!project.updatedAt || !Number.isFinite(Date.parse(project.updatedAt))) return [];
        return [project.updatedAt.slice(0, 7)];
      })).sort((left, right) => left.label.localeCompare(right.label));
    default:
      return countLabels(projects.map(projectCategory));
  }
}

export const skillDataset = skillGroups.flatMap((group) =>
  group.skills.map((name) => ({ name, category: group.title })),
);

export function skillChartData(category = 'all'): ChartDatum[] {
  return countLabels(skillDataset
    .filter((skill) => category === 'all' || skill.category === category)
    .map((skill) => skill.category));
}

// Each repository row has these nine fields in the analysis. A missing
// language is counted as absent metadata, including repositories without code.
export function repositoryQuality(projects: GitHubProject[]) {
  const fields = ['name', 'title', 'url', 'summary', 'tags', 'category', 'language', 'updatedAt', 'homepage'] as const;
  const missing = projects.reduce((total, project) => total + fields.reduce((count, field) => {
    const value = field === 'category' ? projectCategory(project) : project[field];
    return count + (value == null || value === '' || (Array.isArray(value) && value.length === 0) ? 1 : 0);
  }, 0), 0);
  return { rows: projects.length, columns: fields.length, missing, fields };
}

export function filterRepositories(projects: GitHubProject[], category: string, updatedSince: string) {
  return projects.filter((project) => {
    if (category !== 'all' && projectCategory(project) !== category) return false;
    if (!updatedSince) return true;
    if (!project.updatedAt || !Number.isFinite(Date.parse(project.updatedAt))) return false;
    return project.updatedAt.slice(0, 10) >= updatedSince;
  });
}
