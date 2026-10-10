'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Database, Expand, FlaskConical, Lightbulb, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import {
  countLabels,
  filterRepositories,
  projectCategory,
  projectChartData,
  repositoryQuality,
  skillDataset,
  type AnalyticsView,
  type ChartDatum,
} from '@/lib/analytics-data';
import { GITHUB_PROFILE_URL, type GitHubProject } from '@/lib/github-projects';
import { AnalyticsBarChart } from '@/components/portfolio-chart';

type Dataset = 'repositories' | 'skills';
const repositoryViews: { value: AnalyticsView; label: string }[] = [
  { value: 'categories', label: 'Categories' },
  { value: 'topics', label: 'Topics' },
  { value: 'languages', label: 'Languages' },
  { value: 'updates', label: 'Updates' },
];

function ChartTable({ data, onSelect }: { data: ChartDatum[]; onSelect: (label: string) => void }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-left text-xs sm:text-sm">
        <caption className="sr-only">Complete chart values. Select a row to inspect its count.</caption>
        <thead className="text-secondary"><tr><th scope="col" className="py-2 pr-3 font-medium">Group</th><th scope="col" className="py-2 text-right font-medium">Count</th><th scope="col" className="py-2 pl-3 text-right font-medium">Share</th></tr></thead>
        <tbody>{data.map((row) => (
          <tr key={row.label} className="border-t border-border">
            <th scope="row" className="min-w-0 pr-3 font-normal"><button type="button" onClick={() => onSelect(row.label)} className="min-h-11 w-full break-words py-2 text-left text-primary hover:text-accent">{row.label}</button></th>
            <td className="py-2 text-right font-mono">{row.count}</td>
            <td className="py-2 pl-3 text-right text-secondary">{total ? `${Math.round(row.count / total * 100)}%` : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
      {!data.length && <p className="py-4 text-secondary">No chart records are available for this selection.</p>}
    </div>
  );
}

export function AnalyticsWorkspace({ projects, skillGroups }: {
  projects: GitHubProject[];
  skillGroups?: { title: string; skills: string[] }[];
}) {
  const [dataset, setDataset] = useState<Dataset>('repositories');
  const [category, setCategory] = useState('all');
  const [updatedSince, setUpdatedSince] = useState('');
  const [view, setView] = useState<AnalyticsView>('categories');
  const [selected, setSelected] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const skills = useMemo(() => skillGroups
    ? skillGroups.flatMap((group) => group.skills.map((name) => ({ name, category: group.title })))
    : skillDataset, [skillGroups]);
  const selectedProjects = useMemo(() => filterRepositories(projects, category, updatedSince), [projects, category, updatedSince]);
  const selectedSkills = useMemo(() => skills.filter((skill) => category === 'all' || skill.category === category), [category, skills]);
  const allData = dataset === 'repositories'
    ? projectChartData(selectedProjects, view)
    : countLabels(selectedSkills.map((skill) => skill.category));
  const data = allData.slice(0, view === 'updates' ? 12 : 10);
  const quality = dataset === 'repositories'
    ? repositoryQuality(selectedProjects)
    : { rows: selectedSkills.length, columns: 2, missing: 0, fields: ['name', 'category'] };
  const cells = quality.rows * quality.columns;
  const available = cells ? Math.round((cells - quality.missing) / cells * 100) : null;
  const categories = dataset === 'repositories'
    ? Array.from(new Set(projects.map(projectCategory))).sort()
    : Array.from(new Set(skills.map((skill) => skill.category)));
  const chartTitle = dataset === 'skills' ? 'Skills by category' : ({
    categories: 'Repositories by category', topics: 'Curated scope topic distribution',
    languages: 'Primary repository languages', updates: 'Latest update month',
  })[view];
  const selectedPoint = allData.find((point) => point.label === selected);
  const leadingGroup = allData.reduce<ChartDatum | null>((largest, point) => !largest || point.count > largest.count ? point : largest, null);
  const knownLanguages = selectedProjects.filter((project) => project.language).length;
  const deployments = selectedProjects.filter((project) => project.homepage).length;
  const evaluatedProjects = selectedProjects.filter((project) => project.published !== false && project.metrics && Object.keys(project.metrics).length > 0);
  const activeFilters = Number(category !== 'all') + Number(Boolean(updatedSince));
  const snapshotRecords = projects.filter((project) => project.metadataSource === 'snapshot').length;
  const curatedRecords = projects.filter((project) => project.metadataSource === 'cms').length;

  useEffect(() => {
    if (!fullscreen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus();
    };
  }, [fullscreen]);

  function changeDataset(next: Dataset) {
    setDataset(next);
    setCategory('all');
    setUpdatedSince('');
    setView('categories');
    setSelected(null);
  }

  function clearFilters() {
    setCategory('all');
    setUpdatedSince('');
    setSelected(null);
  }

  return (
    <main className="dashboard-page space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Explore the evidence</p>
          <h1 className="dashboard-heading">Analytics workspace</h1>
          <p className="mt-1 max-w-2xl text-sm text-secondary">Explore public repository metadata and the skills listed in this portfolio.</p>
        </div>
        <span className="chip inline-flex items-center gap-1.5"><Database size={13} className="text-mint" aria-hidden="true" />Public portfolio records</span>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Selected dataset overview">
        {[
          { label: 'Records', value: quality.rows, hint: dataset === 'repositories' ? 'Public repositories' : 'Owner-listed skills' },
          { label: 'Variables', value: quality.columns, hint: 'Fields in this analysis' },
          { label: 'Missing cells', value: quality.missing, hint: 'Includes optional metadata' },
          { label: 'Metadata present', value: available == null ? '—' : `${available}%`, hint: 'Filled cells / total cells' },
        ].map((stat) => (
          <div className="panel min-w-0 p-3" key={stat.label}>
            <p className="text-xs text-secondary">{stat.label}</p>
            <p className="my-1 font-mono text-2xl font-semibold text-primary">{stat.value}</p>
            <p className="text-[11px] leading-4 text-secondary">{stat.hint}</p>
          </div>
        ))}
      </section>

      <details className="panel p-3 sm:p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
          <span className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-accent" aria-hidden="true" />Dataset &amp; filters</span>
          <span className="text-xs text-secondary">{dataset === 'repositories' ? 'Repositories' : 'Skills'}{activeFilters ? ` · ${activeFilters} applied` : ' · All records'}</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1.5 text-xs text-secondary">Dataset
            <select value={dataset} onChange={(event) => changeDataset(event.target.value as Dataset)} className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-primary">
              <option value="repositories">Public GitHub repositories</option><option value="skills">Owner-listed skills</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-secondary">Category
            <select value={category} onChange={(event) => { setCategory(event.target.value); setSelected(null); }} className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-primary">
              <option value="all">All categories</option>{categories.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs text-secondary">Updated on or after
            <input type="date" disabled={dataset === 'skills'} value={updatedSince} onChange={(event) => { setUpdatedSince(event.target.value); setSelected(null); }} className="min-h-11 min-w-0 w-full rounded-lg border border-border bg-surface px-3 text-sm text-primary disabled:opacity-40" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-xl text-xs text-secondary">Date filters exclude repositories with unavailable update dates. Skill records do not have publication dates.</p>
          <button type="button" className="button-secondary min-h-11 inline-flex items-center gap-1.5" onClick={clearFilters}><RotateCcw size={13} aria-hidden="true" />Reset filters</button>
        </div>
      </details>

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
        <section className="panel min-w-0 p-3 sm:p-4" aria-labelledby="analytics-chart-title">
          <div className="flex items-center justify-between gap-2">
            <h2 className="dashboard-heading flex min-w-0 items-center gap-2" id="analytics-chart-title"><BarChart3 size={17} className="shrink-0 text-accent" aria-hidden="true" />{chartTitle}</h2>
            <button type="button" className="button-secondary inline-flex min-h-11 shrink-0 items-center gap-1.5 px-3" onClick={() => setFullscreen(true)} aria-label="Expand chart to full screen"><Expand size={15} aria-hidden="true" /><span className="hidden sm:inline">Expand</span></button>
          </div>
          {dataset === 'repositories' && <div className="my-3 flex min-w-0 gap-1 overflow-x-auto rounded-lg border border-border p-0.5" aria-label="Analytics chart view">
            {repositoryViews.map((option) => <button key={option.value} type="button" aria-pressed={view === option.value} onClick={() => { setView(option.value); setSelected(null); }}
              className={`min-h-11 flex-1 whitespace-nowrap rounded-md px-2 text-xs transition-colors ${view === option.value ? 'bg-accent/10 text-accent' : 'text-secondary hover:bg-elevated'}`}>{option.label}</button>)}
          </div>}
          <div className="mt-3 h-[220px] min-w-0 sm:h-[260px]"><AnalyticsBarChart data={data} label={chartTitle} onSelect={setSelected} height="100%" /></div>
          <p className="mt-3 min-h-8 text-xs leading-5 text-secondary" aria-live="polite">
            {selectedPoint ? `${selectedPoint.label}: ${selectedPoint.count} ${dataset === 'skills' ? 'skills' : view === 'topics' ? 'topic assignments' : 'repositories'}.` : 'Tap a bar or select a row in the data table to inspect a group.'}
            {allData.length > data.length ? ` Showing ${data.length} of ${allData.length} groups; all values are in the table.` : ''}
          </p>
          <details className="mt-2 border-t border-border pt-1">
            <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-accent">Chart data table</summary>
            <ChartTable data={allData} onSelect={setSelected} />
          </details>
        </section>

        <div className="grid content-start gap-3">
          <section className="panel p-3 sm:p-4" aria-labelledby="analytics-insights-title">
            <h2 id="analytics-insights-title" className="dashboard-heading flex items-center gap-2"><Lightbulb size={17} className="shrink-0 text-leaf" aria-hidden="true" />Data-supported observations</h2>
            <ul className="mt-3 space-y-3 text-sm leading-5">
              <li>{leadingGroup ? <><strong className="text-primary">{leadingGroup.label}</strong> has the largest count in this view: <strong className="text-accent">{leadingGroup.count}</strong>.</> : 'No records match the current selection. Clear filters to restore the overview.'}</li>
              {dataset === 'repositories' ? <>
                <li><strong className="text-primary">{knownLanguages} of {selectedProjects.length}</strong> repositories report a primary language. Missing language metadata can indicate an empty repository.</li>
                <li><strong className="text-primary">{deployments} of {selectedProjects.length}</strong> repositories provide a homepage link. A link does not establish production readiness or business impact.</li>
              </> : <>
                <li><strong className="text-primary">{selectedSkills.length}</strong> owner-listed skills span <strong className="text-accent">{allData.length}</strong> selected categories.</li>
                <li>Explore projects for supporting evidence. Listing a skill does not measure proficiency.</li>
              </>}
            </ul>
            <Link href={dataset === 'skills' ? '/skills' : '/projects'} className="button-secondary mt-3 inline-flex min-h-11 items-center">Explore {dataset === 'skills' ? 'skills' : 'repositories'}</Link>
          </section>

          <section className="panel p-3 sm:p-4" aria-labelledby="analytics-model-title">
            <h2 id="analytics-model-title" className="dashboard-heading flex items-center gap-2"><FlaskConical size={17} className="shrink-0 text-leaf" aria-hidden="true" />Model evaluation</h2>
            {evaluatedProjects.length ? <div className="mt-3 space-y-3">
              {evaluatedProjects.map((project) => <details key={project.name} className="rounded-lg border border-border px-3">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-primary">{project.title}</summary>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pb-3 text-xs">
                  {Object.entries(project.metrics ?? {}).map(([metric, value]) => <div key={metric}><dt className="break-words text-secondary">{metric}</dt><dd className="mt-1 break-words font-mono text-accent">{value}</dd></div>)}
                </dl>
                <Link href={`/projects/${encodeURIComponent(project.name)}`} className="mb-2 inline-flex min-h-11 items-center text-xs text-accent underline underline-offset-4">Read evaluation methodology</Link>
              </details>)}
              <p className="text-xs leading-5 text-secondary">These are author-published project metrics. Compare values only when datasets, evaluation splits, metric definitions, and methodology are compatible.</p>
            </div> : <div className="empty-state mt-3">
              <p className="text-sm font-medium text-primary">Evaluation data not provided</p>
              <p className="mt-1 text-xs leading-5 text-secondary">No trained model, test split, or evaluation results are published in these records. Model comparisons and prediction outputs will appear when verifiable artifacts are available.</p>
            </div>}
          </section>
        </div>
      </div>

      <section className="panel p-3 sm:p-4" aria-labelledby="analytics-method-title">
        <h2 id="analytics-method-title" className="dashboard-heading">Source &amp; methodology</h2>
        <div className="mt-2 grid gap-3 text-xs leading-5 text-secondary md:grid-cols-2">
          <p>{dataset === 'repositories' ? <><a href={GITHUB_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline underline-offset-4">Safika’s public GitHub repositories</a> are fetched server-side and cached for up to one hour. {snapshotRecords ? `${snapshotRecords} records currently use the verified fallback snapshot. ` : ''}{curatedRecords ? `${curatedRecords} records include published CMS content. ` : ''}Categories and topics describe repository scope, rather than verified implementations.</> : 'The skills dataset is the portfolio owner’s provided list, organized into categories. Each row represents one listed skill. Counts describe this list and do not represent certifications, experience duration, or proficiency.'}</p>
          <p>Fields: {quality.fields.join(', ')}. Missing cells include optional metadata such as a homepage or primary language and are not necessarily errors. Topic counts can include several labels per repository. Update charts count each repository’s latest recorded update month; they do not measure commits, contributions, or project completion.</p>
        </div>
      </section>

      <dialog ref={dialogRef} aria-labelledby="expanded-chart-title" onCancel={(event) => { event.preventDefault(); setFullscreen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) setFullscreen(false); }}
        className="max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-5xl overflow-y-auto rounded-xl border border-border bg-surface p-3 text-primary shadow-2xl backdrop:bg-background/90 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="expanded-chart-title" className="dashboard-heading">{chartTitle}</h2><button type="button" ref={closeRef} aria-label="Close expanded chart" onClick={() => setFullscreen(false)} className="button-secondary flex min-h-11 min-w-11 items-center justify-center"><X size={18} aria-hidden="true" /></button></div>
        {fullscreen && <AnalyticsBarChart data={data} label={chartTitle} onSelect={setSelected} height="58dvh" />}
        <p className="mt-3 text-xs text-secondary" aria-live="polite">{selectedPoint ? `${selectedPoint.label}: ${selectedPoint.count}.` : 'Tap a bar or choose a row below. Press Escape to close.'}</p>
        <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-accent">Chart data table</summary><ChartTable data={allData} onSelect={setSelected} /></details>
      </dialog>
    </main>
  );
}

export default AnalyticsWorkspace;
