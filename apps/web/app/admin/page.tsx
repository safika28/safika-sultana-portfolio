import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';

export const metadata: Metadata = { title: 'Administrator', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function AdminPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || null;
  return <main className="dashboard-page space-y-4"><div><p className="eyebrow">Private workspace</p><h1 className="dashboard-heading mt-1">Content control center</h1><p className="mt-2 text-sm text-secondary">Manage real portfolio content and collaboration inquiries.</p></div><AdminConsole url={url} publicKey={publicKey} configured={Boolean(url && publicKey && process.env.SUPABASE_SERVICE_ROLE_KEY)} /></main>;
}
