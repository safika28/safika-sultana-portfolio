'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase-browser';

export function AuthCallback({ url, publicKey }: { url: string | null; publicKey: string | null }) {
  const router = useRouter();
  const client = useMemo(() => getBrowserSupabaseClient(url, publicKey), [url, publicKey]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (!client) { window.history.replaceState(null, '', '/auth/callback'); setError(true); return; }
    // Supabase's implicit flow imports the confirmation fragment into the shared session.
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      // Remove confirmation credentials from the address bar before navigation or an error state.
      window.history.replaceState(null, '', '/auth/callback');
      if (sessionError || !data.session) { setError(true); return; }
      router.replace('/account'); router.refresh();
    }).catch(() => { if (active) { window.history.replaceState(null, '', '/auth/callback'); setError(true); } });
    return () => { active = false; };
  }, [client, router]);
  return <div className="panel mx-auto max-w-md space-y-4 p-5" role="status"><h1 className="text-lg font-semibold">{error ? 'Confirm your account' : 'Finishing sign-in…'}</h1><p className="text-sm text-secondary">{error ? 'The confirmation link may have expired. Sign in after confirming your email, or register again to request a new link.' : 'Checking your confirmation link and opening your account.'}</p>{error && <Link href="/login" className="button-primary">Go to sign in</Link>}</div>;
}
