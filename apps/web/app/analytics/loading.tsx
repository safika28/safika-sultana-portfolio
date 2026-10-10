export default function AnalyticsLoading() {
  return (
    <main className="dashboard-page space-y-4" role="status" aria-label="Loading analytics workspace">
      <span className="sr-only">Loading repository analytics…</span>
      <div className="h-6 w-48 rounded-md bg-elevated" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="panel h-28 bg-elevated/40" />)}
      </div>
      <div className="panel h-16 bg-elevated/40" />
      <div className="grid gap-3 xl:grid-cols-[1.65fr_1fr]">
        <div className="panel h-96 bg-elevated/40" /><div className="panel h-72 bg-elevated/40" />
      </div>
    </main>
  );
}
