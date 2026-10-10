'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ArrowUpRight, CheckCircle2, ChevronDown, Clock3, Code2, ExternalLink, FolderGit2, GitFork, Github, Search, SlidersHorizontal, Star } from 'lucide-react';
import { ProjectIcon, SkillIcon } from '@/components/content-icons';
import type { GitHubProject, ProjectCategory } from '@/lib/github-projects';

type SortOrder = 'recent' | 'featured' | 'complexity';

function technologiesFor(project: GitHubProject): string[] {
  return Array.from(new Set([...(project.language ? [project.language] : []), ...(project.topics ?? []), ...(project.metadataSource === 'cms' ? project.tags : [])]));
}

function sourceLabel(project: GitHubProject): string {
  if (!project.url) return 'Source not linked';
  if (project.sourceStatus === 'available') return 'Source available';
  if (project.sourceStatus === 'empty') return 'Awaiting source';
  return 'Source unverified';
}

function updatedLabel(value?: string | null): string {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    : 'Date unavailable';
}

export function ProjectExplorer({ projects, categories }: { projects: GitHubProject[]; categories: readonly ProjectCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const query = (searchParams.get('q') ?? '').slice(0, 120);
  const [searchInput, setSearchInput] = useState(query);
  const submittedSearches = useRef(new Set<string>());
  const requestedCategory = searchParams.get('category');
  const category = categories.find((item) => item === requestedCategory) ?? 'all';
  const requestedSort = searchParams.get('sort');
  const sort: SortOrder = requestedSort === 'featured' || requestedSort === 'complexity' ? requestedSort : 'recent';
  const technologies = useMemo(() => Array.from(new Set(projects.flatMap(technologiesFor))).sort((a, b) => a.localeCompare(b)), [projects]);
  const requestedTechnology = searchParams.get('technology');
  const technology = requestedTechnology && technologies.includes(requestedTechnology) ? requestedTechnology : 'all';

  const setFilter = useCallback((key: string, value: string, replace = false) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all' || (key === 'sort' && value === 'recent')) next.delete(key);
    else next.set(key, value);
    const destination = `${pathname}${next.size ? `?${next.toString()}` : ''}`;
    startTransition(() => {
      if (replace) router.replace(destination, { scroll: false });
      else router.push(destination, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (submittedSearches.current.has(query)) submittedSearches.current.delete(query);
    else setSearchInput(query);
  }, [query]);

  useEffect(() => {
    if (searchInput === query) return;
    const timer = setTimeout(() => {
      submittedSearches.current.add(searchInput);
      setFilter('q', searchInput, true);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchInput, setFilter]);

  function resetFilters() {
    submittedSearches.current.clear();
    setSearchInput('');
    startTransition(() => router.push(pathname, { scroll: false }));
  }

  const filtered = useMemo(() => {
    const search = searchInput.trim().toLowerCase();
    const matches = projects.filter((project) => {
      if (category !== 'all' && project.category !== category) return false;
      if (technology !== 'all' && !technologiesFor(project).includes(technology)) return false;
      return !search || [project.title, project.name, project.summary, ...(project.tags ?? []), ...technologiesFor(project)].join(' ').toLowerCase().includes(search);
    });
    return matches.sort((a, b) => {
      if (sort === 'featured') {
        const featuredA = Number(a.featured === true) * 10 + Number(Boolean(a.homepage)) + Number(a.sourceStatus === 'available');
        const featuredB = Number(b.featured === true) * 10 + Number(Boolean(b.homepage)) + Number(b.sourceStatus === 'available');
        return featuredB - featuredA || (b.stars ?? -1) - (a.stars ?? -1) || a.title.localeCompare(b.title);
      }
      if (sort === 'complexity') {
        const levels = { Introductory: 1, Intermediate: 2, Advanced: 3 };
        return (b.complexity ? levels[b.complexity] : 0) - (a.complexity ? levels[a.complexity] : 0) || (b.size ?? -1) - (a.size ?? -1) || a.title.localeCompare(b.title);
      }
      return (b.updatedAt ? Date.parse(b.updatedAt) : 0) - (a.updatedAt ? Date.parse(a.updatedAt) : 0) || a.title.localeCompare(b.title);
    });
  }, [category, projects, searchInput, sort, technology]);

  return (
    <div className="space-y-4">
      <section className="panel space-y-3 p-3 sm:p-4" aria-label="Project filters">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_190px]">
          <label className="relative block">
            <span className="sr-only">Search projects</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" />
            <input type="search" value={searchInput} maxLength={120} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search projects, problems, topics…" className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-primary placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
          </label>
          <label className="relative block">
            <span className="sr-only">Filter by technology</span>
            <select value={technology} onChange={(event) => setFilter('technology', event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="all">All technologies</option>
              {technologies.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Sort projects</span>
            <select value={sort} onChange={(event) => setFilter('sort', event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="recent">Recently updated</option>
              <option value="featured">Featured first</option>
              <option value="complexity">Complexity / source size</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Project categories">
          {(['all', ...categories] as const).map((item) => {
            const count = item === 'all' ? projects.length : projects.filter((project) => project.category === item).length;
            return <button key={item} type="button" onClick={() => setFilter('category', item)} aria-pressed={category === item} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${category === item ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border bg-background text-secondary hover:border-accent/30 hover:text-primary'}`}>
              {item === 'all' ? 'All projects' : item}<span className="rounded-md bg-elevated px-1.5 py-0.5 text-[11px]">{count}</span>
            </button>;
          })}
        </div>
        <p className="text-xs leading-5 text-secondary">Scope and technologies come from GitHub or published records. Featured ordering prioritizes curated projects, then available source and demos. Complexity uses published levels or repository footprint.</p>
      </section>

      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-xs text-secondary">{isPending ? 'Updating filters…' : `${filtered.length} of ${projects.length} projects`}</p>
        {searchInput || category !== 'all' || technology !== 'all' || sort !== 'recent' ? <button type="button" onClick={resetFilters} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><SlidersHorizontal size={14} aria-hidden="true" /> Reset filters</button> : null}
      </div>

      {filtered.length ? <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-busy={isPending}>
        {filtered.map((project) => <article key={project.name} data-repository={project.name} className="panel flex min-w-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-br from-accent/10 via-surface to-elevated p-3">
            {project.imageUrl ? <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-background"><Image src={project.imageUrl} alt={`${project.title} preview`} fill sizes="64px" unoptimized={project.imageUrl.startsWith('http')} className="object-cover" /><span className="absolute bottom-1 right-1 rounded border border-border bg-background/90 p-0.5 text-accent"><ProjectIcon name={project.name} size={12} /></span></div> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-background/60 text-accent"><ProjectIcon name={project.name} size={23} /></div>}
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-medium text-secondary">{project.category ?? 'Repository'}</p>
              <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${project.sourceStatus === 'available' ? 'text-success' : 'text-secondary'}`}>{project.sourceStatus === 'available' ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock3 size={12} aria-hidden="true" />}{sourceLabel(project)}</p>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
            <h2 className="text-base font-semibold leading-6 text-primary"><Link href={`/projects/${encodeURIComponent(project.name)}`} className="flex min-h-11 items-center rounded hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{project.title}</Link></h2>
            <p className="text-[13px] leading-5 text-secondary">{project.summary}</p>
            <div className="flex flex-wrap gap-1.5">
              {project.status ? <span className="chip text-[11px]">{project.status}</span> : null}
              {technologiesFor(project).length ? technologiesFor(project).map((item) => <span key={item} className="chip inline-flex items-center gap-1 text-[11px]"><SkillIcon label={item} size={12} className="text-accent" />{item}</span>) : <span className="inline-flex items-center gap-1 text-[11px] text-secondary"><Code2 size={12} aria-hidden="true" />Technology not published</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-secondary">
              <span className="inline-flex items-center gap-1"><Star size={12} aria-hidden="true" /><span className="sr-only">Stars: </span>{project.stars ?? '—'}</span>
              <span className="inline-flex items-center gap-1"><GitFork size={12} aria-hidden="true" /><span className="sr-only">Forks: </span>{project.forks ?? '—'}</span>
              <span className="inline-flex items-center gap-1"><Clock3 size={12} aria-hidden="true" /><span className="sr-only">Updated: </span>{updatedLabel(project.updatedAt)}</span>
            </div>
            <details className="rounded-lg border border-border bg-background/50">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-xs text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Repository details<ChevronDown size={14} aria-hidden="true" /></summary>
              <div className="space-y-2 border-t border-border p-3 text-xs leading-5 text-secondary">
                <p><span className="font-medium text-primary">Business scope: </span>{project.tags.join(' · ') || 'See the original repository for scope.'}</p>
                <p>{project.sourceStatus === 'available' ? 'Public repository files are available. Published source does not imply a completed or validated model.' : project.sourceStatus === 'empty' ? 'The repository currently has no published files. Dataset, methodology, and results are awaiting publication.' : 'Source availability could not be verified. Open the repository to check its latest state.'}</p>
                <p>GitHub source footprint: {project.size == null ? 'unavailable' : `${project.size.toLocaleString('en-US')} KiB`}.</p>
                {project.complexity ? <p>Published complexity: {project.complexity}.</p> : null}
                <Link href={`/projects/${encodeURIComponent(project.name)}`} className="inline-flex min-h-11 items-center gap-1 text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">View case study <ArrowUpRight size={13} aria-hidden="true" /></Link>
              </div>
            </details>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-2">
              {project.url ? <a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} on GitHub (opens in a new tab)`} className="button-secondary inline-flex min-h-11 items-center gap-1.5 px-3 text-xs"><Github size={14} aria-hidden="true" />GitHub<ArrowUpRight size={12} aria-hidden="true" /></a> : null}
              {project.homepage ? <a href={project.homepage} target="_blank" rel="noopener noreferrer" aria-label={`${project.title} live application (opens in a new tab)`} className="button-primary inline-flex min-h-11 items-center gap-1.5 px-3 text-xs"><ExternalLink size={14} aria-hidden="true" />Live app</a> : <span className="inline-flex min-h-11 items-center px-1 text-[11px] text-secondary">No live demo published</span>}
            </div>
          </div>
        </article>)}
      </div> : <div className="empty-state panel flex flex-col items-center gap-3 p-6 text-center"><FolderGit2 size={30} className="text-accent" aria-hidden="true" /><h2 className="text-base font-semibold">No matching projects</h2><p className="text-sm text-secondary">Try a different search or clear the filters.</p><button type="button" onClick={resetFilters} className="button-secondary min-h-11 px-4 text-sm">Show all projects</button></div>}
    </div>
  );
}
