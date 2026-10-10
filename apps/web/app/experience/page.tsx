import type { Metadata } from 'next';
import { TimelineRecords } from '@/components/timeline-records';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Experience', description: 'Safika Sultana’s professional journey, learning, and practical projects.' };

export default async function ExperiencePage() {
  const { content } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Career journey</p><h1 className="dashboard-heading">Experience</h1><p className="mt-1 text-sm text-secondary">{content.experience.length ? 'Professional roles, responsibilities, and applied technologies.' : 'Building skills through coursework and personal projects.'}</p></header><TimelineRecords records={content.experience} type="experience" /></main>;
}
