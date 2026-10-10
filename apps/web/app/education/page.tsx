import type { Metadata } from 'next';
import { TimelineRecords } from '@/components/timeline-records';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Education', description: 'Safika Sultana’s academic background, from secondary school to B.Tech in Computer Science and Engineering.' };

export default async function EducationPage() {
  const { content } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Academic background</p><h1 className="dashboard-heading">Education</h1><p className="mt-1 text-sm text-secondary">My academic journey in computer science and engineering.</p></header><TimelineRecords records={content.education} type="education" /></main>;
}
