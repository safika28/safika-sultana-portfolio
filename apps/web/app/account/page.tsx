import type { Metadata } from 'next';
import { AccountPanel } from '@/components/account-panel';
import { getPublicAuthConfig } from '@/lib/auth-config';

export const metadata: Metadata = { title: 'Your Account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return <main className="dashboard-page space-y-4"><header className="mx-auto max-w-xl"><p className="eyebrow">Personal workspace</p><h1 className="dashboard-heading">Your account</h1><p className="mt-1 text-sm text-secondary">View your profile and manage your sign-in session.</p></header><AccountPanel {...getPublicAuthConfig()} /></main>;
}
