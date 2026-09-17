import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side (service role) — bypasses RLS, used in API routes only
// Returns a new client per call — safe for serverless
export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
