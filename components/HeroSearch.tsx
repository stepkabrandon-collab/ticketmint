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
      <div className="flex items-center gap-2 bg-white rounded-2xl p-2
                      border-2 border-[#E2E8F0] focus-within:border-[#E8315A]
                      transition-colors"
           style={{ boxShadow: "0 8px 32px rgba(15,23,42,0.12)" }}>
        {/* Search icon */}
        <div className="pl-3 text-[#94A3B8] flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
          className="flex-1 py-3 px-2 text-[#0F172A] text-base bg-transparent
                     outline-none placeholder-[#94A3B8]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary px-6 py-3 text-sm font-bold rounded-xl flex-shrink-0"
        >
          {isPending ? "Searching…" : "Find Tickets"}
        </button>
      </div>
    </form>
  );
}
