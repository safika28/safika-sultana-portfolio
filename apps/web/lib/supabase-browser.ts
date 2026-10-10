'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;
let clientConfiguration = '';

/** Share one persisted session across registration, the account menu, and the CMS. */
export function getBrowserSupabaseClient(url: string | null, publicKey: string | null) {
  if (!url || !publicKey) return null;
  const configuration = `${url}:${publicKey}`;
  if (!browserClient || clientConfiguration !== configuration) {
    browserClient = createClient(url, publicKey, {
      auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (input, init) => {
        const timeout = AbortSignal.timeout(15_000);
        const signal = init?.signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([init.signal, timeout]) : init?.signal || timeout;
        return fetch(input, { ...init, signal });
      } }
    });
    clientConfiguration = configuration;
  }
  return browserClient;
}
