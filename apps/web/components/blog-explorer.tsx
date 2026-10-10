'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpenText, Search, X } from 'lucide-react';

export type BlogFilters = { search: string; category: string; tag: string };
type Post = { title: string; slug: string; category: string; summary: string; body: string; tags: string[]; publishedAt: string };
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function normalizedPost(record: Record<string, unknown>): Post | null {
  const title = text(record.title);
  const slug = text(record.slug);
  if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  return { title, slug, category: text(record.category), summary: text(record.summary), body: text(record.body),
    tags: Array.isArray(record.tags) ? record.tags.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())) : [], publishedAt: text(record.publishedAt) };
}

function queryUrl(filters: BlogFilters) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('q', filters.search.trim());
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);
  const query = params.toString();
  return query ? `/blog?${query}` : '/blog';
}

function publicationLabel(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}

export function BlogExplorer({ posts: records, filters }: { posts: Record<string, unknown>[]; filters: BlogFilters }) {
  const router = useRouter();
  const posts = useMemo(() => records.map(normalizedPost).filter((post): post is Post => post !== null), [records]);
  const [search, setSearch] = useState(filters.search);
  const [category, setCategory] = useState(filters.category);
  useEffect(() => { setSearch(filters.search); setCategory(filters.category); }, [filters.search, filters.category]);
  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort();
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort();
  const searchTerms = filters.search.toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = posts.filter((post) => {
    if (filters.category && post.category !== filters.category) return false;
    if (filters.tag && !post.tags.includes(filters.tag)) return false;
    const searchable = `${post.title} ${post.summary} ${post.category} ${post.tags.join(' ')}`.toLowerCase();
    return searchTerms.every((term) => searchable.includes(term));
  });

  if (!posts.length) return (
    <section className="panel p-4 sm:p-5">
      <BookOpenText size={22} className="text-accent" aria-hidden="true" />
      <h2 className="dashboard-heading mt-3">Research notes are on the way</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-secondary">There are no published articles yet. Explore the public repositories for current project documentation, or get in touch about a collaboration.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link href="/projects" className="button-primary inline-flex min-h-11 items-center">Explore projects</Link><Link href="/contact" className="button-secondary inline-flex min-h-11 items-center">Get in touch</Link></div>
    </section>
  );

  return (
    <div className="space-y-3">
      <section className="panel p-3 sm:p-4" aria-label="Search and filter articles">
        <form onSubmit={(event) => { event.preventDefault(); router.push(queryUrl({ search, category, tag: filters.tag })); }} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(150px,200px)_auto]">
          <label className="relative min-w-0"><span className="sr-only">Search article titles, summaries, and tags</span><Search size={15} className="absolute left-3 top-3.5 text-secondary" aria-hidden="true" /><input type="search" name="q" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search research notes" maxLength={180} className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-primary placeholder:text-secondary" /></label>
          <label className="min-w-0"><span className="sr-only">Article category</span><select name="category" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-primary"><option value="">All categories</option>{categories.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <button type="submit" className="button-primary min-h-11">Apply filters</button>
        </form>
        {tags.length > 0 && <details className="mt-2"><summary className="min-h-11 cursor-pointer break-words py-3 text-xs font-medium text-accent">Filter by tag{filters.tag ? ` · ${filters.tag}` : ''}</summary><div className="flex flex-wrap gap-1.5">{tags.map((tag) => <Link key={tag} href={queryUrl({ ...filters, tag: filters.tag === tag ? '' : tag })} aria-current={filters.tag === tag ? 'true' : undefined} className={`inline-flex min-h-11 min-w-0 max-w-full items-center rounded-lg border px-3 py-2 text-xs ${filters.tag === tag ? 'border-accent bg-accent/10 text-accent' : 'border-border text-secondary hover:border-accent/50'}`}><span className="min-w-0 break-words">{tag}</span></Link>)}</div></details>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-secondary" aria-live="polite">{filtered.length} of {posts.length} published notes</p>{(filters.search || filters.category || filters.tag) && <Link href="/blog" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-accent"><X size={13} aria-hidden="true" />Clear filters</Link>}</div>
      </section>

      {filtered.length ? <div className="grid gap-2 lg:grid-cols-2">
        {filtered.map((post) => {
          const dateLabel = publicationLabel(post.publishedAt);
          const wordCount = post.body.split(/\s+/).filter(Boolean).length;
          return <article key={post.slug} className="panel min-w-0 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary"><span className="text-accent">{post.category}</span>{dateLabel && <time dateTime={post.publishedAt}>{dateLabel}</time>}{wordCount > 0 && <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>}</div>
            <h2 className="mt-2 text-sm font-semibold leading-5 text-primary"><Link href={`/blog/${post.slug}`} className="flex min-h-11 min-w-0 items-center gap-2 hover:text-accent"><span className="min-w-0 break-words">{post.title}</span><ArrowUpRight size={14} className="shrink-0 text-accent" aria-hidden="true" /></Link></h2>
            <p className="mt-1 line-clamp-3 break-words text-[13px] leading-5 text-secondary">{post.summary}</p>
            {post.tags.length > 0 && <ul className="mt-3 flex flex-wrap gap-1" aria-label="Article tags">{post.tags.map((tag, index) => <li key={`${tag}-${index}`} className="chip max-w-full whitespace-normal break-words">{tag}</li>)}</ul>}
          </article>;
        })}
      </div> : <section className="panel p-4"><h2 className="text-sm font-semibold text-primary">No notes match these filters</h2><p className="mt-1 text-[13px] text-secondary">Try a different search or clear the category and tag selections.</p><Link href="/blog" className="button-secondary mt-3 inline-flex min-h-11 items-center">Show all notes</Link></section>}
    </div>
  );
}
