import type { Metadata } from 'next';
import { BlogExplorer } from '@/components/blog-explorer';
import { getPortfolioData } from '@/lib/portfolio-data';

export const metadata: Metadata = { title: 'Research Notes', description: 'Published research notes, data science tutorials, and technical project documentation by Safika Sultana.' };
const parameter = (value: string | string[] | undefined) => typeof value === 'string' ? value.trim().slice(0, 180) : '';

export default async function BlogPage({ searchParams }: { searchParams: { q?: string | string[]; category?: string | string[]; tag?: string | string[] } }) {
  const { content } = await getPortfolioData();
  return <main className="dashboard-page space-y-4"><header><p className="eyebrow">Documentation &amp; ideas</p><h1 className="dashboard-heading">Research notes</h1><p className="mt-1 text-sm text-secondary">Published tutorials, experiments, and analytical thinking.</p></header><BlogExplorer posts={content.posts} filters={{ search: parameter(searchParams.q), category: parameter(searchParams.category), tag: parameter(searchParams.tag) }} /></main>;
}
