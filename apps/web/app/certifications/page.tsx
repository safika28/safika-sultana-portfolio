import type { Metadata } from 'next';
import { TimelineRecords } from '@/components/timeline-records';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Certifications', description: 'Published certifications and credential verification links from Safika Sultana’s portfolio.' };

export default async function CertificationsPage() {
  const { content } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Credentials &amp; learning</p><h1 className="dashboard-heading">Certifications</h1><p className="mt-1 text-sm text-secondary">Published credentials with verification links when available.</p></header><TimelineRecords records={content.certifications} type="certifications" /></main>;
}
