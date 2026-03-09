"use client";

// ── HeroSearch ────────────────────────────────────────────────
// The main search bar embedded in the hero section.
// Submits a ?q= query param which the server uses to filter
// tickets by matching event name.

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function HeroSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    // Preserve price/section refinements if already set
    const min = searchParams.get("minPrice");
    const max = searchParams.get("maxPrice");
    if (min) params.set("minPrice", min);
    if (max) params.set("maxPrice", max);
    startTransition(() => router.push(`/?${params.toString()}`));
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2 bg-white rounded-2xl p-2.5
                      border-2 border-transparent focus-within:border-[#E8315A]
                      transition-all duration-200"
           style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3), 0 8px 24px rgba(232,49,90,0.15)" }}>
        {/* Search icon */}
        <div className="pl-2 text-[#94A3B8] flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by artist, team, or event name…"
          className="flex-1 py-3.5 px-2 text-[#0F172A] text-base bg-transparent
                     outline-none placeholder-[#94A3B8] font-medium"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-7 py-3.5 text-sm font-bold rounded-xl flex-shrink-0 min-h-[48px]"
        >
          {isPending ? "Searching…" : "Find Tickets"}
        </button>
      </div>
    </form>
  );
}
