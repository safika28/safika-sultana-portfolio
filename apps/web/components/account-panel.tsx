'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowRight, LoaderCircle, LogOut, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { getBrowserSupabaseClient } from '@/lib/supabase-browser';

type AccountProfile = { username: string | null; email: string | null; role: 'super_admin' | 'editor' | 'viewer' };
type AccountPanelProps = { url: string | null; publicKey: string | null; configured: boolean };

export function profileFromResponse(value: unknown): AccountProfile | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.username !== 'string' && record.username !== null) return null;
  if (typeof record.email !== 'string' && record.email !== null) return null;
  if (record.role !== 'super_admin' && record.role !== 'editor' && record.role !== 'viewer') return null;
  return { username: record.username, email: record.email, role: record.role };
}

export function AccountPanel({ url, publicKey, configured }: AccountPanelProps) {
  const router = useRouter();
  const client = useMemo(() => configured && url && publicKey ? getBrowserSupabaseClient(url, publicKey) : null, [configured, url, publicKey]);
  const [session, setSession] = useState<Session | null>(null);
  const [profileResponse, setProfileResponse] = useState<{ token: string; value: AccountProfile } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!client) { setSessionLoading(false); return; }
    let active = true;
    let receivedEvent = false;
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      receivedEvent = true;
      setSession(nextSession);
      setSessionLoading(false);
    });
    client.auth.getSession().then(({ data: result, error }) => {
      if (!active || receivedEvent) return;
      setSession(error ? null : result.session);
      setSessionLoading(false);
      if (error) setNotice('Your session could not be restored. Please sign in again.');
    }).catch(() => {
      if (!active || receivedEvent) return;
      setSessionLoading(false);
      setNotice('Your session could not be restored. Please sign in again.');
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [client]);

  const token = session?.access_token;
  const profile = profileResponse?.token === token ? profileResponse?.value ?? null : null;
  useEffect(() => {
    setProfileResponse(null);
    if (!token) { setProfileLoading(false); return; }
    const accessToken = token;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    setProfileLoading(true);
    setNotice('');
    async function loadProfile() {
      try {
        const response = await fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Please sign in again.' : 'Your account details could not be loaded. Please try again.');
        const result: unknown = await response.json();
        const nextProfile = profileFromResponse(result);
        if (!nextProfile) throw new Error('Your account details could not be loaded. Please try again.');
        if (active) setProfileResponse({ token: accessToken, value: nextProfile });
      } catch (error) {
        if (active) setNotice(error instanceof Error && error.name === 'AbortError' ? 'The request timed out. Please try again.' : error instanceof Error ? error.message : 'Your account details could not be loaded.');
      } finally {
        clearTimeout(timer);
        if (active) setProfileLoading(false);
      }
    }
    void loadProfile();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [token, refresh]);

  async function signOut() {
    if (!client || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw new Error('Sign-out could not be completed. Please try again.');
      setSession(null);
      setProfileResponse(null);
      router.replace('/login');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Sign-out could not be completed.'); }
    finally { setBusy(false); }
  }

  if (!client) return <section className="panel mx-auto max-w-xl p-4 sm:p-5"><h2 className="dashboard-heading">Account access is temporarily unavailable</h2><p className="mt-2 text-sm text-secondary">You can continue exploring the portfolio or get in touch directly.</p><Link href="/contact" className="button-secondary mt-4 inline-flex">Contact</Link></section>;
  if (sessionLoading) return <section className="panel mx-auto flex max-w-xl items-center gap-2 p-4 text-sm text-secondary" role="status"><LoaderCircle size={17} className="animate-spin text-accent" aria-hidden="true" />Loading your account…</section>;
  if (!session) return <section className="panel mx-auto max-w-xl p-4 sm:p-5"><UserRound size={23} className="text-accent" aria-hidden="true" /><h2 className="dashboard-heading mt-3">Sign in to view your account</h2>{notice && <p role="alert" className="mt-2 text-sm text-danger">{notice}</p>}<div className="mt-4 flex flex-wrap gap-2"><Link href="/login?next=%2Faccount" className="button-primary">Sign in<ArrowRight size={14} aria-hidden="true" /></Link><Link href="/register" className="button-secondary">Create account</Link></div></section>;

  return <section className="panel mx-auto max-w-xl p-4 sm:p-5" aria-label="Your account">
    <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-accent/10 text-accent"><UserRound size={22} aria-hidden="true" /></span><div className="min-w-0"><h2 className="dashboard-heading break-words">{profile?.username || 'Your account'}</h2><p className="mt-0.5 text-xs text-secondary">Personal account</p></div></div>
    {profileLoading ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-secondary"><LoaderCircle size={15} className="animate-spin" aria-hidden="true" />Loading account details…</p> : profile && <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm"><div><dt className="text-xs text-secondary">Username</dt><dd className="mt-1 break-words text-primary">{profile.username || 'Not set'}</dd></div><div><dt className="text-xs text-secondary">Email</dt><dd className="mt-1 break-all text-primary">{profile.email || 'Not available'}</dd></div><div><dt className="text-xs text-secondary">Account role</dt><dd className="mt-1 text-primary">{profile.role === 'super_admin' ? 'Administrator' : profile.role === 'editor' ? 'Editor' : 'Member'}</dd></div></dl>}
    {notice && <p role="alert" className="mt-4 rounded-lg border border-danger/30 p-3 text-sm text-danger">{notice}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      {profile && (profile.role === 'super_admin' || profile.role === 'editor') && <Link href="/admin" className="button-primary"><ShieldCheck size={16} aria-hidden="true" />Open content studio</Link>}
      {!profile && !profileLoading && <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={busy} className="button-secondary"><RefreshCw size={15} aria-hidden="true" />Retry account details</button>}
      <button type="button" onClick={signOut} disabled={busy} className="button-secondary disabled:opacity-60"><LogOut size={15} aria-hidden="true" />{busy ? 'Signing out…' : 'Sign out'}</button>
    </div>
  </section>;
}
