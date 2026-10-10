import type { Metadata } from 'next';
import { SkillsExplorer } from '@/components/skills-explorer';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Skills', description: 'Explore Safika Sultana’s skills in analytics, machine learning, AI, data engineering, web development, and deployment.' };

export default async function SkillsPage() {
  const { skillGroups, projects } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Skills matrix</p><h1 className="dashboard-heading">Data, AI, and product execution.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-secondary">A compact technology map. Search across the full skill list or expand one category at a time.</p></header><SkillsExplorer groups={skillGroups} projects={projects} /></main>;
}
