import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { getPublicAuthConfig } from '@/lib/auth-config';

export const metadata: Metadata = { title: 'Sign In', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { next?: string | string[] } }) {
  const redirectTo = typeof searchParams.next === 'string' ? searchParams.next : undefined;
  return <main className="dashboard-page space-y-4"><header className="mx-auto max-w-md"><p className="eyebrow">Welcome back</p><h1 className="dashboard-heading">Sign in</h1><p className="mt-1 text-sm text-secondary">Use your username or email to access your account.</p></header><AuthForm mode="login" {...getPublicAuthConfig()} redirectTo={redirectTo} /></main>;
}
