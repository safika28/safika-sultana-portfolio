export default function Loading() {
  return <main className="dashboard-page" aria-label="Loading workspace" aria-busy="true"><div className="skeleton h-52" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map(item => <div key={item} className="skeleton h-24" />)}</div><div className="skeleton h-72" /><span className="sr-only">Loading content…</span></main>;
}
