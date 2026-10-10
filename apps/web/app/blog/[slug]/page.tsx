import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPortfolioData } from '@/lib/portfolio-data';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

async function getPost(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
  const { content } = await getPortfolioData();
  return content.posts.find((post) => text(post.slug) === slug) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  return { title: post ? text(post.title) : 'Note unavailable', description: post ? text(post.summary).slice(0, 160) : 'This research note is unavailable.' };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();
  const title = text(post.title);
  const body = text(post.body);
  const publishedAt = text(post.publishedAt);
  const dateValid = publishedAt && Number.isFinite(Date.parse(publishedAt));
  const dateLabel = dateValid ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(publishedAt)) : null;
  const paragraphs = body.split(/\r?\n\s*\r?\n/).filter(Boolean);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const tags = Array.isArray(post.tags) ? post.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  return (
    <main className="dashboard-page space-y-3">
      <Link href="/blog" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-accent"><ArrowLeft size={14} aria-hidden="true" />All research notes</Link>
      <article className="panel mx-auto max-w-4xl p-3 sm:p-6">
        <header className="border-b border-border pb-4"><p className="eyebrow">{text(post.category)}</p><h1 className="mt-2 break-words text-xl font-semibold leading-tight text-primary sm:text-2xl">{title}</h1><div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">{dateLabel && <time dateTime={publishedAt}>{dateLabel}</time>}{wordCount > 0 && <span>{Math.max(1, Math.ceil(wordCount / 200))} min read · estimated</span>}</div><p className="mt-3 break-words text-sm leading-6 text-secondary">{text(post.summary)}</p>{tags.length > 0 && <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Article tags">{tags.map((tag, index) => <li key={`${tag}-${index}`}><Link href={`/blog?tag=${encodeURIComponent(tag)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-accent hover:border-accent">{tag}</Link></li>)}</ul>}</header>
        <div className="space-y-4 pt-5">{paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line break-words text-[13px] leading-7 text-primary sm:text-sm">{paragraph}</p>) : <p className="text-sm text-secondary">The article body has not been published yet.</p>}</div>
      </article>
    </main>
  );
}
