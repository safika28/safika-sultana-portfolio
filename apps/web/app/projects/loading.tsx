export default function ProjectsLoading() {
  return <div className="dashboard-page space-y-4" role="status" aria-label="Loading projects"><div className="h-16 animate-pulse rounded-xl bg-elevated" /><div className="h-32 animate-pulse rounded-xl bg-elevated" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl border border-border bg-surface" />)}</div><span className="sr-only">Loading projects</span></div>;
}
