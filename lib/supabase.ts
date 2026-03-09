// ── Supabase clients ──────────────────────────────────────────
// Two clients:
//   supabaseAnon    — uses NEXT_PUBLIC_SUPABASE_ANON_KEY
//                     Safe for client-side use. RLS enforced.
//   supabaseServer  — uses SUPABASE_SERVICE_ROLE_KEY
//                     Server-only. Bypasses RLS for webhook writes.
//
// Never expose the service role key to the browser.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

// ── Anon client (client-side safe) ───────────────────────────
export const supabaseAnon = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false, // Wallet is the auth — no Supabase sessions
    },
  }
);

// ── Server client (service role — never bundle to browser) ────
// Only import this in:
//   - app/api/** route handlers
//   - Server components (app/page.tsx etc.)
//   - lib/solana-server.ts
export const supabaseServer = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// Alias for webhook route clarity
export const supabaseService = supabaseServer;

// ── Type helpers ──────────────────────────────────────────────
export type SupabaseClient = typeof supabaseAnon;
