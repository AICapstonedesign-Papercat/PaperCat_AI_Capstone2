// Service-role Supabase client for server-side reads/writes that must bypass RLS —
// e.g. the shared paper_overviews cache, which every user reads but only the Edge
// Function itself writes to. Never expose this client or its key to the app.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically into every
// Edge Function by Supabase (local and hosted) — no `supabase secrets set` needed.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export function supabaseAdmin() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available to this function.');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
