// ═══════════════════════════════════════════════════════════
// CaseFlow — Supabase Client (Browser/Public)
// Only uses NEXT_PUBLIC_ keys. Safe for client-side code.
// ═══════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase Client] Missing environment variables. Browser auth will fail.");
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);
