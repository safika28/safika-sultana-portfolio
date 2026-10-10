'use client';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { getBrowserSupabaseClient } from '@/lib/supabase-browser';
import { Database, LogOut, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { CmsFields, normalizeEditorPayload } from './cms-fields';

type Section = 'profile' | 'skills' | 'projects' | 'experience' | 'education' | 'certifications' | 'posts' | 'settings';
type ContentRecord = { id: string; section: Section; payload: Record<string, unknown>; published: boolean; position: number; updated_at: string };
type Message = { id: string; name: string; email: string; subject: string; message: string; status: string; created_at: string };
const sections: Section[] = ['profile', 'skills', 'projects', 'experience', 'education', 'certifications', 'posts', 'settings'];
const templates: Record<Section, Record<string, unknown>> = {
  profile: { name: 'Safika Sultana', title: 'Data Scientist / Machine Learning Engineer / Data Analyst', bio: 'I turn data into clear decisions through analytics and thoughtful product execution.', location: 'Electronic City, Bengaluru', email: 'safikasultana90@gmail.com', phoneNumber: '8822971471', phoneHref: 'tel:+918822971471', linkedInUrl: 'https://www.linkedin.com/in/safika-sultana-82b41027b/', githubUrl: 'https://github.com/safika28', photoUrl: '/home-portrait.png' },
  skills: { title: '', skills: [] },
  projects: { title: '', slug: '', summary: '', category: 'Data Analytics', tags: [], status: 'In progress', metrics: [], visualizations: [] },
  experience: { title: '', organization: '', dates: '', description: '', tags: [] },
  education: { title: '', institution: '', dates: '', description: '' },
  certifications: { title: '', organization: '', dates: '' },
  posts: { title: '', slug: '', category: 'Research notes', summary: '', body: '', tags: [] },
  settings: { theme: 'dark', showKpis: true, featuredOrder: [], navigation: [] }
};
const fieldHelp: Record<Section, string> = {
  profile: 'Use name, title, bio, about, location, email, phoneNumber, phoneHref, linkedInUrl, githubUrl, cvUrl, photoUrl, and availability. Resume and photograph accept HTTPS links or local paths.',
  skills: 'Give the category a title and add skill names to the skills array. Optional description explains evidence or scope.',
  projects: 'Optional fields: githubUrl, liveUrl, imageUrl, url, featured, complexity, dataset, cleaning, analysis, features, modeling, evaluation, impact, limitations, deployment. Each metric needs name, numeric value, methodology, and dataset; unit is optional. Visualizations need title and description, with optional imageUrl and sourceUrl.',
  experience: 'Use title, organization, dates, description, and optional tags. Publish only verified experience.',
  education: 'Use title, institution, dates, and optional grade, status, logoUrl, logoAlt, logoFit, description, and credentialUrl.',
  certifications: 'Use title and organization, with optional dates, description, credentialUrl, and documentUrl.',
  posts: 'Use title, slug, category, summary, body, and tags. Optional publishedAt uses an ISO date. Content is displayed as plain text.',
  settings: 'Control theme (dark, light, system), showKpis, featuredOrder (project slugs), and navigation (label and local href). Settings require the super_admin role.'
};

export function AdminConsole({ url, publicKey, configured }: { url: string | null; publicKey: string | null; configured: boolean }) {
  const client = useMemo(() => getBrowserSupabaseClient(url, publicKey), [url, publicKey]);
  const [session, setSession] = useState<Session | null>(null);
  const activeToken = useRef<string | null>(null);
  const sessionUser = useRef<string | null>(null);
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [role, setRole] = useState('');
  const [section, setSection] = useState<Section>('profile');
  const [selected, setSelected] = useState<ContentRecord | null>(null);
  const [payload, setPayload] = useState(JSON.stringify(templates.profile, null, 2));
  const [published, setPublished] = useState(false);
  const [position, setPosition] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!session) throw new Error('Sign in to continue.');
    const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...init.headers }, signal: AbortSignal.timeout(15_000) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
    return result;
  }, [session]);
  const load = useCallback(async () => {
    setLoading(true);
    try { const token = session?.access_token; const result = await request('/api/admin/content'); if (activeToken.current !== token) return; setRecords(result.records); setMessages(result.messages); setRole(result.role); }
    catch (error) { if (activeToken.current === session?.access_token) { setRecords([]); setMessages([]); setRole(''); setNotice(error instanceof Error ? error.message : 'Content could not be loaded.'); } }
    finally { if (activeToken.current === session?.access_token) setLoading(false); }
  }, [request, session]);
  useEffect(() => {
    if (!client) return;
    let active = true;
    let receivedEvent = false;
    const updateSession = (nextSession: Session | null) => {
      if (!active) return;
      if (nextSession?.user.id !== sessionUser.current) { setRecords([]); setMessages([]); setRole(''); setSelected(null); setPayload(JSON.stringify(templates.profile, null, 2)); setNotice(''); }
      sessionUser.current = nextSession?.user.id || null;
      activeToken.current = nextSession?.access_token || null; setSession(nextSession);
    };
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => { receivedEvent = true; updateSession(nextSession); });
    void client.auth.getSession().then(({ data: result }) => { if (!receivedEvent) updateSession(result.session); }).catch(() => { if (!receivedEvent) updateSession(null); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [client]);
  useEffect(() => { if (session) void load(); }, [session, load]);
  function selectRecord(record: ContentRecord | null, nextSection = section) {
    setSelected(record); setSection(nextSection); setPayload(JSON.stringify(record?.payload || templates[nextSection], null, 2)); setPublished(record?.published || false); setPosition(record?.position || 0); setNotice('');
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      let parsed: unknown; try { parsed = normalizeEditorPayload(section, JSON.parse(payload)); } catch { throw new Error('Fix the JSON formatting before saving.'); }
      await request('/api/admin/content', { method: selected ? 'PATCH' : 'POST', body: JSON.stringify({ ...(selected ? { id: selected.id } : {}), section, payload: parsed, published, position }) });
      await load(); selectRecord(null); setNotice('Record saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'The record could not be saved.'); } finally { setBusy(false); }
  }
  async function remove() {
    if (!selected || !window.confirm('Delete this record permanently?')) return;
    setBusy(true); setNotice('');
    try { await request('/api/admin/content', { method: 'DELETE', body: JSON.stringify({ id: selected.id }) }); await load(); selectRecord(null); setNotice('Record deleted.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'The record could not be deleted.'); } finally { setBusy(false); }
  }
  async function updateMessage(id: string, status: string) {
    setBusy(true); setNotice('');
    try { await request('/api/admin/messages', { method: 'PATCH', body: JSON.stringify({ id, status }) }); await load(); setNotice('Message status updated.'); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'The message could not be updated.'); } finally { setBusy(false); }
  }
  const inputClass = 'min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20';
  if (!configured || !client) return <section className="panel space-y-3 p-4"><ShieldCheck className="text-accent" size={24} aria-hidden="true" /><h2 className="text-lg font-semibold">Content studio is temporarily unavailable</h2><p className="text-sm text-secondary">Please try again later.</p></section>;
  return <div className="space-y-4">
    {notice && <p role="status" className="panel break-words p-3 text-sm">{notice}</p>}
    {!session ? <section className="panel max-w-md space-y-4 p-4"><ShieldCheck size={22} className="text-accent" aria-hidden="true" /><h2 className="text-lg font-semibold">Administrator access</h2><p className="text-sm text-secondary">Sign in with your approved account to manage portfolio content.</p><Link href="/login?next=%2Fadmin" className="button-primary">Sign in</Link><Link href="/register" className="button-secondary">Create account</Link></section> : <>
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-3"><p className="text-sm text-secondary">{session.user.email}{role && <span className="ml-2 chip">{role}</span>}</p><button type="button" className="button-secondary inline-flex min-h-11 items-center gap-2 px-3" onClick={() => { void client.auth.signOut(); }}><LogOut size={15} aria-hidden="true" />Sign out</button></div>
      {loading && <p role="status" className="text-sm text-secondary">Loading saved content…</p>}
      {role && <><div className="flex flex-wrap gap-2" role="group" aria-label="Content sections">{sections.map((item) => <button key={item} type="button" aria-pressed={item === section} className={`${item === section ? 'button-primary' : 'button-secondary'} min-h-11 px-3 capitalize`} onClick={() => selectRecord(null, item)}>{item}</button>)}</div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
          <section className="panel min-w-0 p-4"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-base font-semibold"><Database size={17} className="text-accent" aria-hidden="true" />Saved records</h2><button type="button" className="button-secondary inline-flex min-h-11 items-center gap-1 px-3" onClick={() => selectRecord(null)}><Plus size={16} aria-hidden="true" />New</button></div><div className="space-y-2">{records.filter((record) => record.section === section).map((record) => <button key={record.id} type="button" className={`w-full rounded-lg border p-3 text-left ${selected?.id === record.id ? 'border-accent bg-accent/10' : 'border-border'}`} onClick={() => selectRecord(record)}><span className="block break-words text-sm font-medium">{String(record.payload.title || record.payload.name || record.section)}</span><span className="mt-1 block text-xs text-secondary">{record.published ? 'Published' : 'Draft'} · Position {record.position}</span></button>)}{!records.some((record) => record.section === section) && <p className="text-sm text-secondary">No saved {section} records yet.</p>}</div></section>
          <form onSubmit={save} className="panel min-w-0 space-y-3 p-4"><h2 className="text-base font-semibold">{selected ? 'Edit' : 'Create'} {section} record</h2><p id="admin-payload-help" className="text-xs leading-relaxed text-secondary">{fieldHelp[section]}</p><CmsFields section={section} payload={payload} onChange={setPayload} disabled={busy} /><details className="rounded-lg border border-border p-3"><summary className="min-h-11 cursor-pointer text-xs text-secondary">Advanced content editor</summary><label htmlFor="admin-payload" className="mb-1 mt-2 block text-sm">Structured content (JSON)</label><textarea id="admin-payload" value={payload} onChange={(event) => setPayload(event.target.value)} rows={12} maxLength={75_000} spellCheck={false} disabled={busy} aria-describedby="admin-payload-help" className={`${inputClass} font-mono text-xs`} /></details><div className="flex flex-wrap items-center gap-4"><label className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} disabled={busy} className="h-4 w-4 accent-accent" />Publish</label><label className="inline-flex items-center gap-2 text-sm" htmlFor="admin-position">Position<input id="admin-position" type="number" min={0} max={10_000} value={position} onChange={(event) => setPosition(Number(event.target.value))} disabled={busy} className={`${inputClass} max-w-24`} /></label></div><div className="flex flex-wrap gap-2"><button disabled={busy} className="button-primary inline-flex min-h-11 items-center gap-2 px-4"><Save size={16} aria-hidden="true" />{busy ? 'Saving…' : 'Save record'}</button>{selected && role === 'super_admin' && <button type="button" disabled={busy} onClick={remove} className="button-secondary inline-flex min-h-11 items-center gap-2 px-3 text-red-400"><Trash2 size={16} aria-hidden="true" />Delete</button>}</div></form>
        </div>
        <section className="panel space-y-3 p-4"><h2 className="text-base font-semibold">Contact messages ({messages.length})</h2><p className="text-xs text-secondary">Most recent 100 inquiries. Visible only to approved editors and administrators.</p>{messages.length === 0 && <p className="text-sm text-secondary">No inquiries have been received.</p>}{messages.map((message) => <article key={message.id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words text-sm font-semibold">{message.subject || 'Inquiry'}</h3><label className="inline-flex items-center gap-2 text-xs" htmlFor={`status-${message.id}`}>Status<select id={`status-${message.id}`} value={message.status} disabled={busy} onChange={(event) => { void updateMessage(message.id, event.target.value); }} className="min-h-11 rounded-lg border border-border bg-background px-2">{['new', 'reviewing', 'closed'].map((status) => <option key={status}>{status}</option>)}</select></label></div><p className="mt-1 break-words text-xs text-secondary">{message.name} · {message.email} · {new Date(message.created_at).toLocaleDateString()}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm">{message.message}</p></article>)}</section>
      </>}
    </>}
  </div>;
}
