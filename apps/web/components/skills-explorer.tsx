'use client';

import Link from 'next/link';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { SkillIcon } from '@/components/content-icons';
import type { GitHubProject } from '@/lib/github-projects';

type SkillGroup = { title: string; skills: string[] };

function normalizeTechnology(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = { reactjs: 'react', nodejs: 'node', nextjs: 'nextjs', expressjs: 'express', microsoftexcel: 'excel' };
  return aliases[normalized] ?? normalized;
}

const brandColors: Record<string, string> = {
  Python: '#60A5FA', SQL: '#22D3EE', Pandas: '#A78BFA', NumPy: '#60A5FA',
  'Power BI': '#FBBF24', TypeScript: '#60A5FA', JavaScript: '#FBBF24',
  'React.js': '#22D3EE', 'Next.js': '#94A3B8', Docker: '#60A5FA',
  PostgreSQL: '#60A5FA', Supabase: '#34D399', TensorFlow: '#FB923C',
  PyTorch: '#FB923C', MongoDB: '#34D399', 'Hugging Face': '#FBBF24',
};

export function SkillsExplorer({ groups, projects }: { groups: SkillGroup[]; projects: GitHubProject[] }) {
  const matrixId = useId();
  const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [openGroups, setOpenGroups] = useState(() => new Set(groups[0] ? [groups[0].title] : []));
  const uniqueGroups = useMemo(() => {
    const seen = new Set<string>();
    const categories = new Map<string, SkillGroup>();
    for (const group of groups) {
      const categoryKey = group.title.trim().toLowerCase();
      const categoryGroup = categories.get(categoryKey) ?? { title: group.title.trim(), skills: [] };
      categories.set(categoryKey, categoryGroup);
      for (const skill of group.skills) {
        const key = skill.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        categoryGroup.skills.push(skill.trim());
      }
    }
    return Array.from(categories.values()).filter((group) => group.skills.length);
  }, [groups]);
  const totalSkills = uniqueGroups.reduce((total, group) => total + group.skills.length, 0);
  const filteredGroups = useMemo(() => uniqueGroups
    .filter((group) => category === 'all' || group.title === category)
    .map((group) => ({ ...group, skills: group.skills.filter((skill) => skill.toLowerCase().includes(query.trim().toLowerCase())) }))
    .filter((group) => group.skills.length), [category, query, uniqueGroups]);
  const matchingSkills = filteredGroups.reduce((total, group) => total + group.skills.length, 0);
  const evidence = useMemo(() => {
    const byTechnology = new Map<string, GitHubProject[]>();
    for (const project of projects) {
      const technologies = [...(project.language ? [project.language] : []), ...(project.metadataSource === 'cms' ? project.tags : [])];
      for (const technology of Array.from(new Set(technologies.map(normalizeTechnology)))) {
        const records = byTechnology.get(technology) ?? [];
        records.push(project);
        byTechnology.set(technology, records);
      }
    }
    return byTechnology;
  }, [projects]);
  const categories = ['all', ...uniqueGroups.map((group) => group.title)];

  function selectCategory(value: string, focusIndex?: number) {
    setCategory(value);
    setOpenGroups(new Set(value === 'all' ? uniqueGroups.slice(0, 1).map((group) => group.title) : [value]));
    if (focusIndex != null) {
      const button = categoryRefs.current[focusIndex];
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function handleCategoryKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % categories.length; break;
      case 'ArrowLeft': nextIndex = (index - 1 + categories.length) % categories.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = categories.length - 1; break;
      default: return;
    }
    event.preventDefault();
    selectCategory(categories[nextIndex], nextIndex);
  }

  function setSearch(value: string) {
    setQuery(value);
    setOpenGroups(new Set(uniqueGroups.filter((group) => value.trim()
      ? group.skills.some((skill) => skill.toLowerCase().includes(value.trim().toLowerCase()))
      : category === 'all' ? group.title === uniqueGroups[0]?.title : group.title === category,
    ).map((group) => group.title)));
  }

  function toggleGroup(title: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title); else next.add(title);
      return next;
    });
  }

  function reset() {
    setQuery('');
    selectCategory('all');
  }

  return <section className="panel overflow-hidden" aria-label="Technology intelligence matrix">
    <div className="space-y-3 border-b border-border p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-primary">Technology intelligence</p><span className="chip text-xs">{totalSkills} listed skills</span></div>
      <label className="relative block"><span className="sr-only">Search skills</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary" aria-hidden="true" /><input type="search" maxLength={120} value={query} onChange={(event) => setSearch(event.target.value)} placeholder="Search a technology or skill…" className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-[13px] text-primary placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Skill categories">{categories.map((item, index) => <button key={item} ref={(button) => { categoryRefs.current[index] = button; }} type="button" aria-pressed={category === item} onClick={() => selectCategory(item)} onKeyDown={(event) => handleCategoryKey(event, index)} className={`min-h-11 shrink-0 rounded-lg border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${category === item ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border bg-background text-secondary hover:text-primary'}`}>{item === 'all' ? 'All categories' : item}</button>)}</div>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs leading-5 text-secondary" role="status" aria-live="polite">{matchingSkills} of {totalSkills} skills · expand a category</p>{query || category !== 'all' ? <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><SlidersHorizontal size={13} aria-hidden="true" />Reset</button> : <button type="button" onClick={() => setOpenGroups(new Set())} className="min-h-11 rounded-lg px-2 text-xs text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Collapse all</button>}</div>
    </div>

    <div className="max-h-[min(52vh,360px)] overflow-y-auto overscroll-contain" tabIndex={0} aria-label="Scrollable skill categories">
      {filteredGroups.length ? filteredGroups.map((group, groupIndex) => {
        const open = openGroups.has(group.title);
        const panelId = `${matrixId}-skills-${uniqueGroups.findIndex((item) => item.title === group.title)}`;
        const projectEvidence = group.skills.flatMap((skill) => (evidence.get(normalizeTechnology(skill)) ?? []).map((project) => ({ skill, project })));
        return <div key={group.title} className="border-b border-border last:border-b-0">
          <h2><button type="button" id={`${panelId}-button`} aria-expanded={open} aria-controls={panelId} onClick={() => toggleGroup(group.title)} className="flex min-h-12 w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium text-primary hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"><span className="flex min-w-0 items-center gap-2"><span className="shrink-0 font-mono text-[11px] text-accent">{String(groupIndex + 1).padStart(2, '0')}</span><span className="min-w-0 break-words">{group.title}</span></span><span className="flex shrink-0 items-center gap-2 text-xs text-secondary">{group.skills.length}<ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></span></button></h2>
          <div id={panelId} hidden={!open} role="region" aria-labelledby={`${panelId}-button`} className="space-y-3 border-t border-border/60 bg-background/30 p-3">
            <div className="flex flex-wrap gap-1.5">{group.skills.map((skill) => <span key={skill} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-elevated px-2 py-1.5 text-[13px] leading-5 text-primary"><span style={{ color: brandColors[skill] ?? 'var(--accent)' }}><SkillIcon label={skill} size={15} /></span><span className="min-w-0 break-words">{skill}</span></span>)}</div>
            {projectEvidence.length ? <div className="space-y-1 border-t border-border pt-2"><p className="text-xs text-secondary">Published project references</p>{projectEvidence.slice(0, 6).map(({ skill, project }) => <Link key={`${skill}-${project.name}`} href={`/projects/${encodeURIComponent(project.name)}`} className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-2 text-xs text-accent hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><span className="min-w-0 flex-1 break-words"><span className="font-medium">{skill}</span> · {project.title}</span><ArrowUpRight size={14} className="shrink-0" aria-hidden="true" /></Link>)}</div> : null}
          </div>
        </div>;
      }) : <div className="p-6 text-center"><p className="text-sm text-primary">No matching skills</p><p className="mt-1 text-xs text-secondary">Try another term or select all categories.</p><button type="button" onClick={reset} className="button-secondary mt-3 text-xs">Clear filters</button></div>}
    </div>
    <p className="border-t border-border px-3 py-2 text-xs leading-5 text-secondary">Skills are provided by the portfolio owner. Project references use GitHub language or published CMS technology records; no proficiency percentages or certifications are inferred.</p>
  </section>;
}
