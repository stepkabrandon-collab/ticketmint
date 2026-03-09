// ── OAuth + Magic Link Callback ───────────────────────────────
// Supabase redirects here after Google/Apple OAuth or magic link.
// Exchanges the PKCE code for a session, sets the auth cookie,
// then redirects to the app.

import { createServerClient, type CookieOptions } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl  = new URL(request.url);
  const code        = requestUrl.searchParams.get("code");
  const next        = requestUrl.searchParams.get("next") ?? "/";
  const cookieStore = cookies();

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string)                           { return cookieStore.get(name)?.value; },
          set(name: string, value: string, opts: CookieOptions) { try { cookieStore.set({ name, value, ...opts }); } catch {} },
          remove(name: string, opts: CookieOptions)  { try { cookieStore.delete({ name, ...opts }); } catch {} },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
