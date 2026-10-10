import type { Metadata } from 'next';
import { TimelineRecords } from '@/components/timeline-records';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Experience', description: 'Published professional experience and responsibilities from Safika Sultana’s portfolio.' };

export default async function ExperiencePage() {
  const { content } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Professional timeline</p><h1 className="dashboard-heading">Experience</h1><p className="mt-1 text-sm text-secondary">Published roles, responsibilities, and applied technologies.</p></header><TimelineRecords records={content.experience} type="experience" /></main>;
}
