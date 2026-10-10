'use client';

import Link from 'next/link';
import { LogIn, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase-browser';

export function AuthStatus({ url, publicKey }: { url: string | null; publicKey: string | null }) {
  const client = useMemo(() => getBrowserSupabaseClient(url, publicKey), [url, publicKey]);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    if (!client) return;
    let active = true;
    let receivedEvent = false;
    const { data } = client.auth.onAuthStateChange((_event, session) => { if (active) { receivedEvent = true; setSignedIn(Boolean(session)); } });
    void client.auth.getSession().then(({ data: result }) => { if (active && !receivedEvent) setSignedIn(Boolean(result.session)); }).catch(() => undefined);
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [client]);
  const Icon = signedIn ? UserRound : LogIn;
  return <Link href={signedIn ? '/account' : '/login'} aria-label={signedIn ? 'Your account' : 'Sign in'} className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium hover:border-accent"><Icon size={17} aria-hidden="true" /><span className="hidden sm:inline">{signedIn ? 'Account' : 'Sign in'}</span></Link>;
}
