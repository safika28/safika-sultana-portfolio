import { BarChart3, Database, ShieldCheck, Users } from 'lucide-react';

const stats = [
  { label: 'Published posts', value: '18', icon: Database },
  { label: 'Active visitors', value: '2.4K', icon: Users },
  { label: 'Conversion rate', value: '6.8%', icon: BarChart3 },
  { label: 'Security status', value: 'Healthy', icon: ShieldCheck }
];

export default function AdminPage() {
  return (
    <main className="container-shell py-20">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Admin portal</p>
          <h1 className="mt-4 font-heading text-4xl text-primary md:text-6xl">Content control center</h1>
        </div>
        <button className="rounded-full bg-gradient-to-r from-accent to-accent-hover px-5 py-3 text-sm font-medium text-background shadow-[0_0_24px_rgba(16,185,129,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]">Publish update</button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="panel p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">{label}</p>
              <Icon size={18} className="text-accent" />
            </div>
            <p className="mt-6 text-3xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="panel p-6">
          <h2 className="text-2xl text-primary">Latest publishing activity</h2>
          <div className="mt-6 space-y-4">
            {[{ title: 'Case study refresh', meta: 'Updated 2 hours ago' }, { title: 'New project launch', meta: 'Published yesterday' }, { title: 'Analytics summary', meta: 'Scheduled for Friday' }].map((entry) => (
              <div key={entry.title} className="flex items-center justify-between rounded-2xl border border-border bg-elevated p-4">
                <div>
                  <p className="text-base text-primary">{entry.title}</p>
                  <p className="text-sm text-secondary">{entry.meta}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-xs uppercase tracking-[0.18em] text-accent">Live</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <h2 className="text-2xl text-primary">Security overview</h2>
          <ul className="mt-6 space-y-4 text-secondary">
            <li>Roles configured: super_admin, editor, viewer</li>
            <li>JWT verification enabled through Supabase issuer checks</li>
            <li>RLS policies prepared for administrative operations</li>
            <li>Audit logging reserved for privileged actions</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
