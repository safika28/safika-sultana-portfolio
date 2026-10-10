import type { Metadata } from 'next';
import { TimelineRecords } from '@/components/timeline-records';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Education', description: 'Published education and academic qualifications from Safika Sultana’s portfolio.' };

export default async function EducationPage() {
  const { content } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Academic background</p><h1 className="dashboard-heading">Education</h1><p className="mt-1 text-sm text-secondary">Published institutions, qualifications, and supporting details.</p></header><TimelineRecords records={content.education} type="education" /></main>;
}
