"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/",            label: "Browse" },
  { href: "/my-tickets",  label: "My Tickets" },
  { href: "/list-ticket", label: "Sell Tickets" },
  { href: "/guarantee",   label: "Guarantee" },
];

const NavWallet = dynamic(
  () => import("@/components/WalletButton").then((m) => m.WalletButton),
  { ssr: false, loading: () => <div className="h-9 w-24 rounded-lg bg-[#F1F5F9] animate-pulse" /> }
);

export function Navbar() {
  const [open,    setOpen]    = useState(false);
  const [user,    setUser]    = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <nav
      className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0]"
      style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.06)" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="w-8 h-8 bg-[#E8315A] rounded-lg flex items-center justify-center
                          group-hover:bg-[#C41E45] transition-colors">
            <span className="text-white text-base leading-none">🎟</span>
          </div>
          <span className="text-lg font-bold text-[#0F172A] tracking-tight">
            Ticket<span className="text-[#E8315A]">Mint</span>
          </span>
        </a>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href}
               className="px-4 py-2 rounded-lg text-[#334155] hover:text-[#0F172A]
                          hover:bg-[#F8F9FA] transition-colors">
              {label}
            </a>
          ))}
          {user && (
            <a href="/broker"
               className="px-4 py-2 rounded-lg text-[#334155] hover:text-[#0F172A]
                          hover:bg-[#F8F9FA] transition-colors">
              Broker Portal
            </a>
          )}
        </div>

        {/* Right: auth + wallet + hamburger */}
        <div className="flex items-center gap-2">
          {/* Wallet button (Phantom) */}
          <NavWallet />

          {/* Supabase auth state */}
          {authReady && (
            user ? (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-[#64748B] font-medium max-w-[120px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <a href="/login"
                   className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg">
                  Sign In
                </a>
                <a href="/signup"
                   className="btn-primary px-3 py-1.5 text-xs font-semibold rounded-lg">
                  Sign Up
                </a>
              </div>
            )
          )}

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg
                       hover:bg-[#F8F9FA] transition-colors text-[#334155]"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-[#E2E8F0] bg-white px-3 py-2 space-y-0.5">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)}
               className="flex items-center px-4 py-3.5 rounded-xl text-[#334155]
                          hover:bg-[#F8F9FA] hover:text-[#0F172A] text-sm font-medium
                          transition-colors min-h-[44px]">
              {label}
            </a>
          ))}
          {user && (
            <a href="/broker" onClick={() => setOpen(false)}
               className="flex items-center px-4 py-3.5 rounded-xl text-[#334155]
                          hover:bg-[#F8F9FA] text-sm font-medium transition-colors min-h-[44px]">
              Broker Portal
            </a>
          )}
          {authReady && (
            <div className="border-t border-[#F1F5F9] pt-2 mt-2">
              {user ? (
                <>
                  <p className="px-4 py-2 text-xs text-[#94A3B8]">{user.email}</p>
                  <button onClick={signOut}
                          className="w-full text-left px-4 py-3.5 rounded-xl text-sm
                                     font-medium text-[#E8315A] hover:bg-[#FFF0F3] min-h-[44px]">
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex gap-2 px-2 py-2">
                  <a href="/login"  className="btn-secondary flex-1 py-2.5 text-sm text-center rounded-xl">Sign In</a>
                  <a href="/signup" className="btn-primary  flex-1 py-2.5 text-sm text-center rounded-xl">Sign Up</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
