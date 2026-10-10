import 'server-only';
import { cache } from 'react';
import { getPortfolioContent } from './cms';
import { getGitHubProjects, GITHUB_PROFILE_URL, projectCategories, type GitHubProject } from './github-projects';
import { profileContact } from './profile-contact';
import { skillGroups as defaultSkillGroups } from './site-data';
import { suppliedCertifications } from './certifications';
import { suppliedEducation } from './education';

export type PortfolioProfile = {
  name: string; title: string; bio: string; about: string; location: string;
  email: string; phoneNumber: string; phoneHref: string; linkedInUrl: string | null;
  githubUrl: string; cvUrl: string | null; photoUrl: string; availability: string | null;
};

const defaults: PortfolioProfile = {
  ...profileContact, name: 'Safika Sultana', title: 'Data Scientist & Developer',
  bio: 'I turn data into clear decisions through analytics and thoughtful product execution.',
  about: 'I build dashboards, trusted metrics, and practical insights that help teams act with confidence.',
  githubUrl: GITHUB_PROFILE_URL, photoUrl: '/home-portrait.png', availability: null,
};

const string = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const getPortfolioData = cache(async () => {
  const [content, github] = await Promise.all([getPortfolioContent(), getGitHubProjects()]);
  const credentials = new Map(suppliedCertifications.map(record => [`${record.organization}|${record.title}`.toLowerCase(), { ...record }]));
  for (const record of content.certifications) {
    const key = `${record.organization}|${record.title}`.toLowerCase();
    credentials.set(key, { ...credentials.get(key), ...record });
  }
  content.certifications = Array.from(credentials.values());
  const education = new Map(suppliedEducation.map(record => [`${record.institution}|${record.title}`.toLowerCase(), { ...record }]));
  for (const record of content.education) {
    const key = `${record.institution}|${record.title}`.toLowerCase();
    education.set(key, { ...education.get(key), ...record });
  }
  content.education = Array.from(education.values());
  const profile = { ...defaults };
  if (content.profile) {
    for (const key of Object.keys(defaults) as (keyof PortfolioProfile)[]) {
      const value = string(content.profile[key]);
      if (value) profile[key] = value;
    }
  }
  const projects: GitHubProject[] = github.map((project) => ({ ...project }));
  for (const record of content.projects) {
    const slug = string(record.slug)!;
    const url = string(record.githubUrl) || string(record.url) || '';
    const name = url.match(/github\.com\/safika28\/([^/?#]+)/i)?.[1] || slug;
    const existing = projects.findIndex((project) => project.name.toLowerCase() === name.toLowerCase() || project.name.toLowerCase() === slug);
    const base = existing >= 0 ? projects[existing] : { name: slug, title: string(record.title)!, summary: string(record.summary)!, url, tags: [], homepage: null };
    const caseStudy: Record<string, string> = {};
    const fields = { dataset: 'dataset', cleaning: 'cleaning', analysis: 'eda', features: 'featureEngineering', modeling: 'modeling', evaluation: 'evaluation', impact: 'impact', limitations: 'limitations', deployment: 'architecture' };
    for (const [from, to] of Object.entries(fields)) { const value = string(record[from]); if (value) caseStudy[to] = value; }
    if (Array.isArray(record.visualizations)) caseStudy.visualizations = record.visualizations.map((entry) => {
      const item = entry as Record<string, unknown>;
      return [string(item.title), string(item.description), string(item.sourceUrl)].filter(Boolean).join(' — ');
    }).join('\n\n');
    const metrics = Array.isArray(record.metrics) ? record.metrics as { name: string; value: number; unit?: string; methodology: string; dataset: string }[] : [];
    const project: GitHubProject = {
      ...base, title: string(record.title)!, summary: string(record.summary)!,
      url: url || base.url, homepage: string(record.liveUrl) || base.homepage,
      tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string') : base.tags,
      category: projectCategories.includes(record.category as typeof projectCategories[number]) ? record.category as typeof projectCategories[number] : base.category,
      caseStudy, metrics: Object.fromEntries(metrics.map((metric) => [metric.name, `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`])),
      evaluationMetrics: metrics, featured: record.featured === true,
      imageUrl: string(record.imageUrl), visualizations: Array.isArray(record.visualizations) ? record.visualizations as NonNullable<GitHubProject['visualizations']> : undefined,
      status: record.status as GitHubProject['status'], complexity: record.complexity as GitHubProject['complexity'],
      metadataSource: 'cms', published: true,
    };
    if (existing >= 0) projects[existing] = project; else projects.push(project);
  }
  const order = Array.isArray(content.settings?.featuredOrder) ? (content.settings.featuredOrder as string[]).map(name => name.toLowerCase()) : [];
  if (order.length) projects.sort((a, b) => { const left = order.indexOf(a.name.toLowerCase()); const right = order.indexOf(b.name.toLowerCase()); return (left < 0 ? Infinity : left) - (right < 0 ? Infinity : right); });
  const groupedSkills = new Map<string, {title:string;skills:string[]}>();
  for (const group of content.skills.length ? content.skills : defaultSkillGroups) {
    const key = group.title.toLocaleLowerCase();
    const previous = groupedSkills.get(key);
    groupedSkills.set(key, { title: previous?.title || group.title, skills: Array.from(new Set([...(previous?.skills || []), ...group.skills])) });
  }
  const skillGroups = Array.from(groupedSkills.values());
  return { profile, content, projects, skillGroups };
});
