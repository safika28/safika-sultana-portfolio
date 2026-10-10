import type { Metadata } from 'next';
import AnalyticsWorkspace from '@/components/analytics-workspace';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Explore Safika Sultana’s public repository metadata and listed technologies in an interactive analytics workspace.',
};

export default async function AnalyticsPage() {
  const { projects, skillGroups } = await getPortfolioData();
  return <AnalyticsWorkspace projects={projects} skillGroups={skillGroups} />;
}
