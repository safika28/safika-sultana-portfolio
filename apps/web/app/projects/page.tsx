import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ArrowUpRight, Github } from 'lucide-react';
import { ProjectExplorer } from '@/components/project-explorer';
import { GITHUB_PROFILE_URL, projectCategories } from '@/lib/github-projects';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Explore Safika Sultana’s public analytics, machine learning, and development repositories with verified GitHub metadata.',
};

export default async function ProjectsPage() {
  const { projects } = await getPortfolioData();
  const hasSnapshotMetadata = projects.some((project) => project.metadataSource === 'snapshot');

  return <main className="dashboard-page space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="eyebrow">Project explorer</p><h1 className="dashboard-heading">From business questions to source code.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">Explore {projects.length} projects and public repositories by scope, technology, and source availability.</p></div>
      <a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex min-h-11 items-center gap-2 px-3 text-xs"><Github size={15} aria-hidden="true" />GitHub profile<ArrowUpRight size={13} aria-hidden="true" /></a>
    </header>
    {hasSnapshotMetadata ? <p className="panel border-amber-400/25 px-3 py-2 text-xs leading-5 text-secondary" role="status">GitHub is temporarily unavailable. Showing the last verified repository list; current language, stars, forks, dates, and source status are unavailable.</p> : null}
    <Suspense fallback={<div className="panel animate-pulse p-4 text-sm text-secondary" role="status">Loading project filters…</div>}><ProjectExplorer projects={projects} categories={projectCategories} /></Suspense>
  </main>;
}
