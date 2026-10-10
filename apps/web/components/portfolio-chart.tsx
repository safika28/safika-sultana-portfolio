'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { projectChartData, type ChartDatum } from '@/lib/analytics-data';
import type { GitHubProject } from '@/lib/github-projects';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function AnalyticsBarChart({ data, label, onSelect, height = 240 }: {
  data: ChartDatum[];
  label: string;
  onSelect?: (label: string) => void;
  height?: number | string;
}) {
  const reducedMotion = useReducedMotion();
  if (data.length === 0) {
    return <div className="empty-state flex min-h-[220px] items-center justify-center text-center">No records match this view. Try another filter or dataset.</div>;
  }
  return (
    <div role="img" aria-label={`${label}. ${data.map((entry) => `${entry.label}: ${entry.count}`).join('; ')}.`}
      className="min-w-0" style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 0 }} accessibilityLayer>
          <CartesianGrid stroke="var(--dashboard-border, #1F3A2D)" horizontal={false} strokeDasharray="3 4" />
          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--dashboard-muted, #A2B8AA)', fontSize: 11 }} />
          <YAxis type="category" dataKey="label" width={112} tickLine={false} axisLine={false}
            tick={{ fill: 'var(--dashboard-muted, #A2B8AA)', fontSize: 11 }}
            tickFormatter={(value: string) => value.length > 17 ? `${value.slice(0, 15)}…` : value} />
          <Tooltip cursor={{ fill: 'rgb(var(--color-accent, 52 211 153) / 0.08)' }}
            contentStyle={{ background: 'var(--dashboard-elevated, #153426)', border: '1px solid var(--dashboard-border, #1F3A2D)', borderRadius: 10, color: 'var(--dashboard-text, #F0FDF4)', fontSize: 12 }}
            labelStyle={{ color: 'var(--dashboard-text, #F0FDF4)' }}
            formatter={(value: number) => [value, 'Records']} />
          <Bar dataKey="count" fill="var(--accent, #34D399)" radius={[0, 5, 5, 0]} maxBarSize={24}
            isAnimationActive={!reducedMotion} animationDuration={180}
            onClick={(entry: ChartDatum) => onSelect?.(entry.label)}>
            {data.map((entry, index) => <Cell key={entry.label} fill={`var(--chart-${index % 7 + 1}, #34D399)`} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PortfolioChart({ projects }: { projects: GitHubProject[] }) {
  const [view, setView] = useState<'categories' | 'topics'>('categories');
  const [selected, setSelected] = useState<string | null>(null);
  const allData = projectChartData(projects, view);
  const data = allData.slice(0, 7);
  const selectedPoint = data.find((point) => point.label === selected);
  return (
    <section className="panel min-w-0 p-3 sm:p-4" aria-labelledby="portfolio-signal-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Repository intelligence</p>
          <h2 id="portfolio-signal-title" className="dashboard-heading flex items-center gap-2"><BarChart3 size={17} className="text-accent" aria-hidden="true" />Portfolio by focus</h2>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5" aria-label="Portfolio chart view">
          {(['categories', 'topics'] as const).map((option) => (
            <button type="button" key={option} onClick={() => { setView(option); setSelected(null); }} aria-pressed={view === option}
              className={`min-h-11 rounded-md px-3 text-xs capitalize transition-colors ${view === option ? 'bg-accent/10 text-accent' : 'text-secondary hover:bg-elevated'}`}>
              {option}
            </button>
          ))}
        </div>
      </div>
      <AnalyticsBarChart data={data} label={`Public repository ${view}`} onSelect={setSelected} height={220} />
      <p className="mt-2 min-h-5 text-xs text-secondary" aria-live="polite">
        {selectedPoint ? `${selectedPoint.label}: ${selectedPoint.count} repositories.` : `${projects.length} public repositories · ${view === 'topics' ? 'Top seven curated scope topics' : 'Categories describe repository scope'}.`}
      </p>
      <details className="mt-2 text-xs">
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-accent">View chart data &amp; source</summary>
        <ul className="grid gap-1.5">
          {allData.map((point) => <li key={point.label} className="flex min-w-0 justify-between gap-3"><span className="min-w-0 break-words">{point.label}</span><strong>{point.count}</strong></li>)}
        </ul>
        <p className="mt-3 text-secondary">Source: public GitHub repositories. Topics and categories are curated scope labels; counts do not indicate completed projects, proficiency, or model results.</p>
      </details>
    </section>
  );
}

export default PortfolioChart;
