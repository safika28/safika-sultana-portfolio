import 'server-only';
import { portfolioSupabaseProject } from './supabase-project';

export function getPublicAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? portfolioSupabaseProject.url;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? portfolioSupabaseProject.publishableKey;
  let configured = false;
  try { configured = Boolean(url && publicKey && !/YOUR_|PLACEHOLDER/i.test(`${url} ${publicKey}`) && ['https:', 'http:'].includes(new URL(url).protocol)); } catch { /* Missing or invalid deployment configuration. */ }
  return { url: configured ? url : null, publicKey: configured ? publicKey : null, configured };
}
