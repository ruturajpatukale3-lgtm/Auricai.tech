// ═══════════════════════════════════════════════════════════
// CaseFlow — Supabase Admin Client (Server-Only)
// Uses SERVICE_ROLE_KEY to bypass RLS. NEVER import in client code.
// ═══════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceRoleKey) {
  throw new Error("[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY is missing. Background operations will fail.");
}

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
