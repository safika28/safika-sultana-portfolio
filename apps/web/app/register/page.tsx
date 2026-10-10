import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { getPublicAuthConfig } from '@/lib/auth-config';

export const metadata: Metadata = { title: 'Create Account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return <main className="dashboard-page space-y-4"><header className="mx-auto max-w-md"><p className="eyebrow">Join the workspace</p><h1 className="dashboard-heading">Create an account</h1><p className="mt-1 text-sm text-secondary">Choose a username and sign up with your email.</p></header><AuthForm mode="register" {...getPublicAuthConfig()} /></main>;
}
