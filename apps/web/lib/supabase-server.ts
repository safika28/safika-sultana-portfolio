import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getPublicAuthConfig } from './auth-config';

/** Public credentials plus the user's verified bearer token keep RLS in force. */
export function getPublicDatabase(accessToken?: string) {
  const { url, publicKey, configured } = getPublicAuthConfig();
  if (!configured || !url || !publicKey) return null;
  return createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}), fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(10_000) }) }
  });
}
