import type { Metadata } from 'next';
import { AdminConsole } from '@/components/admin-console';
import { getPublicAuthConfig } from '@/lib/auth-config';

export const metadata: Metadata = { title: 'Administrator', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function AdminPage() {
  return <main className="dashboard-page space-y-4"><div><p className="eyebrow">Private workspace</p><h1 className="dashboard-heading mt-1">Content control center</h1><p className="mt-2 text-sm text-secondary">Manage real portfolio content and collaboration inquiries.</p></div><AdminConsole {...getPublicAuthConfig()} /></main>;
}
