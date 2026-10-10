'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { GitHubProject } from '@/lib/github-projects';

const Chart = dynamic(() => import('./portfolio-chart'), { ssr: false, loading: () => <div className="skeleton h-[300px]" aria-label="Loading portfolio chart" /> });

export function LazyPortfolioChart({ projects }: { projects: GitHubProject[] }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '180px' });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="min-h-[330px] min-w-0">{visible ? <Chart projects={projects} /> : <section className="panel min-h-[330px] p-3 sm:p-4"><p className="eyebrow">Repository intelligence</p><h2 className="dashboard-heading">Portfolio by focus</h2><p className="mt-3 text-sm">Explore the categories and scope of {projects.length} public repositories.</p><Link href="/analytics" className="button-secondary mt-4">Open analytics</Link></section>}</div>;
}
