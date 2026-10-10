import type { Metadata } from 'next';
import { AuthCallback } from '@/components/auth-callback';
import { getPublicAuthConfig } from '@/lib/auth-config';

export const metadata: Metadata = { title: 'Confirm account', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default function CallbackPage() { return <main className="dashboard-page"><AuthCallback {...getPublicAuthConfig()} /></main>; }
