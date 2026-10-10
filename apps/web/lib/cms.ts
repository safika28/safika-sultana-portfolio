import 'server-only';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { RequestLimiter } from './contact-validation';

export const cmsSections = ['profile', 'skills', 'projects', 'experience', 'education', 'certifications', 'posts', 'settings'] as const;
export type CmsSection = typeof cmsSections[number];
const text = z.string().trim().max(5000);
const short = z.string().trim().max(180);
const safeUrl = z.string().trim().max(2048).refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return !/[\u0000-\u0020]/.test(value);
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'Use an HTTPS link or a local path.');
const tags = z.array(short.min(1)).max(120);
const metric = z.object({ name: short.min(1), value: z.number().finite(), unit: short.optional(), methodology: text.min(1), dataset: short.min(1) }).strict();
const schemas = {
  profile: z.object({ name: short.min(1), title: short.min(1), bio: text, about: text.optional(), location: short.optional(), email: z.string().email().max(254).optional(), phoneNumber: z.string().regex(/^[+\d ()-]{5,30}$/).optional(), phoneHref: z.string().regex(/^tel:[+\d-]{5,30}$/).optional(), linkedInUrl: safeUrl.optional(), githubUrl: safeUrl.optional(), cvUrl: safeUrl.optional(), photoUrl: safeUrl.optional(), availability: short.optional() }).strict(),
  skills: z.object({ title: short.min(1), skills: tags.min(1), description: text.optional() }).strict(),
  projects: z.object({ title: short.min(1), summary: text.min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), category: z.enum(['Data Analytics', 'Machine Learning', 'Deep Learning', 'Business Intelligence', 'Generative AI', 'Web Development']), tags: tags, url: safeUrl.optional(), githubUrl: safeUrl.optional(), liveUrl: safeUrl.optional(), imageUrl: safeUrl.optional(), featured: z.boolean().optional(), complexity: z.enum(['Introductory', 'Intermediate', 'Advanced']).optional(), status: z.enum(['In progress', 'Completed', 'Archived']).optional(), dataset: text.optional(), cleaning: text.optional(), analysis: text.optional(), features: text.optional(), modeling: text.optional(), evaluation: text.optional(), impact: text.optional(), limitations: text.optional(), deployment: text.optional(), metrics: z.array(metric).max(30).optional(), visualizations: z.array(z.object({ title: short.min(1), description: text, imageUrl: safeUrl.optional(), sourceUrl: safeUrl.optional() }).strict()).max(20).optional() }).strict(),
  experience: z.object({ title: short.min(1), organization: short.min(1), dates: short.min(1), description: text, tags: tags.optional() }).strict(),
  education: z.object({ title: short.min(1), institution: short.min(1), dates: short.min(1), description: text.optional(), credentialUrl: safeUrl.optional() }).strict(),
  certifications: z.object({ title: short.min(1), organization: short.min(1), dates: short.optional(), description: text.optional(), credentialUrl: safeUrl.optional(), documentUrl: safeUrl.optional() }).strict(),
  posts: z.object({ title: short.min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120), category: short.min(1), summary: text, body: z.string().trim().max(60_000), tags: tags, publishedAt: z.string().datetime().optional() }).strict(),
  settings: z.object({ title: short.optional(), theme: z.enum(['dark', 'light', 'system']).optional(), showKpis: z.boolean().optional(), featuredOrder: z.array(z.string().max(120)).max(100).optional(), navigation: z.array(z.object({ label: short.min(1), href: safeUrl }).strict()).max(12).optional() }).strict()
};

export class CmsError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

export function getServerDatabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) }) }
  });
}

export async function authorizeAdmin(request: Request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 10_000) throw new CmsError(401, 'Sign in to continue.');
  const db = getServerDatabase();
  if (!db) throw new CmsError(503, 'The content service is not configured.');
  const { data, error } = await db.auth.getUser(header.slice(7));
  if (error || !data.user) throw new CmsError(401, 'Your session has expired. Sign in again.');
  // Role is read afresh from a protected table; user-editable metadata is never trusted.
  const role = await db.from('profiles').select('role').eq('user_id', data.user.id).maybeSingle();
  if (role.error) throw new CmsError(503, 'The content service is unavailable.');
  if (!role.data || !['super_admin', 'editor'].includes(role.data.role)) throw new CmsError(403, 'This account has no content editing access.');
  return { db, userId: data.user.id, role: role.data.role as string };
}

export function checkSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new CmsError(403, 'This request origin is not allowed.');
}

export async function readJsonBody(request: Request, maxBytes = 80_000): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new CmsError(415, 'Use a JSON request.');
  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > maxBytes) throw new CmsError(413, 'The request is too large.');
  if (!request.body) throw new CmsError(400, 'The request is empty.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new CmsError(408, 'The request took too long.')), 10_000); });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new CmsError(413, 'The request is too large.');
      chunks.push(value);
    }
  } catch (error) { void reader.cancel().catch(() => undefined); throw error; }
  finally { clearTimeout(timer); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new CmsError(400, 'The request contains invalid JSON.'); }
}

export function validateContent(input: unknown) {
  const envelope = z.object({ id: z.string().uuid().optional(), section: z.enum(cmsSections), payload: z.unknown(), published: z.boolean(), position: z.number().int().min(0).max(10_000) }).strict().safeParse(input);
  if (!envelope.success) throw new CmsError(400, 'Check the record, publishing status, and position.');
  const payload = schemas[envelope.data.section].safeParse(envelope.data.payload);
  if (!payload.success) throw new CmsError(400, payload.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).slice(0, 5).join(' · '));
  return { ...envelope.data, payload: payload.data };
}

type PublicRecord = Record<string, unknown>;
export type PortfolioContent = { profile: PublicRecord | null; skills: { title: string; skills: string[] }[]; projects: PublicRecord[]; experience: PublicRecord[]; education: PublicRecord[]; certifications: PublicRecord[]; posts: PublicRecord[]; settings: PublicRecord | null; source: 'database' | 'unconfigured' | 'unavailable' };
export async function getPortfolioContent(): Promise<PortfolioContent> {
  const empty: PortfolioContent = { profile: null, skills: [], projects: [], experience: [], education: [], certifications: [], posts: [], settings: null, source: 'unconfigured' };
  const db = getServerDatabase();
  if (!db) return empty;
  try {
    const { data, error } = await db.from('content_records').select('id,section,payload').eq('published', true).order('position').limit(500);
    if (error) return { ...empty, source: 'unavailable' };
    const result: PortfolioContent = { ...empty, source: 'database' };
    for (const record of data || []) {
      if (!cmsSections.includes(record.section)) continue;
      const section = record.section as CmsSection;
      const parsed = schemas[section].safeParse(record.payload);
      if (!parsed.success) continue;
      const payload = { ...parsed.data, id: record.id };
      if (section === 'profile' || section === 'settings') { if (!result[section]) result[section] = payload; }
      else if (section === 'skills') result.skills.push(parsed.data as { title: string; skills: string[] });
      else result[section].push(payload);
    }
    return result;
  } catch { return { ...empty, source: 'unavailable' }; }
}

const limiter = new RequestLimiter();
export async function enforceContactLimit(request: Request, db: NonNullable<ReturnType<typeof getServerDatabase>>) {
  // Forwarded headers are trusted only behind an explicitly configured edge proxy.
  const proxy = process.env.VERCEL || process.env.TRUST_PROXY === 'true';
  const ip = proxy ? (request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown') : 'local';
  const secret = process.env.CONTACT_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const key = createHash('sha256').update(secret).update(ip.slice(0, 100)).digest('hex');
  if (!limiter.consume(key)) throw new CmsError(429, 'Please wait 10 minutes before sending another message.');
  const { data, error } = await db.rpc('consume_contact_limit', { client_hash: key });
  if (error) throw new CmsError(503, 'Messaging is temporarily unavailable. Please use email.');
  if (data !== true) throw new CmsError(429, 'Please wait 10 minutes before sending another message.');
}

export function apiError(error: unknown) {
  if (error instanceof CmsError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store', ...(error.status === 429 ? { 'Retry-After': '600' } : {}) } });
  return Response.json({ error: 'The service is temporarily unavailable. Please try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
