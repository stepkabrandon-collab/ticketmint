"use client";

// ── SearchFilters ─────────────────────────────────────────────
// Compact "Refine results" bar — price range and section only.
// Event discovery is handled by the hero search + category pills.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

export function SearchFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [section,  setSection]  = useState(searchParams.get("section")  ?? "");

  const apply = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice); else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice); else params.delete("maxPrice");
    if (section)  params.set("section",  section);  else params.delete("section");
    startTransition(() => router.push(`/?${params.toString()}`));
  }, [minPrice, maxPrice, section, router, searchParams]);

  const hasValues = minPrice || maxPrice || section;

  return (
    <div className="flex flex-wrap items-end gap-3 bg-white border border-[#E2E8F0]
                    rounded-2xl px-4 py-3"
         style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>

      <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide self-center mr-1">
        Refine:
      </span>

      {/* Section */}
      <div className="min-w-[120px]">
        <label className="block text-xs font-semibold text-[#334155] mb-1">Section</label>
        <input
          type="text"
          placeholder="e.g. Floor A"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
          className="input w-full px-3 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
        />
      </div>

      {/* Price range */}
      <div className="flex items-end gap-2">
        <div className="min-w-[90px]">
          <label className="block text-xs font-semibold text-[#334155] mb-1">Min price</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs font-mono">$</span>
            <input
              type="number" min="0" step="10" placeholder="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="input w-full pl-6 pr-2 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
            />
          </div>
        </div>
        <span className="text-[#CBD5E1] pb-2 text-lg leading-none">—</span>
        <div className="min-w-[90px]">
          <label className="block text-xs font-semibold text-[#334155] mb-1">Max price</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs font-mono">$</span>
            <input
              type="number" min="0" step="10" placeholder="Any"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              className="input w-full pl-6 pr-2 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={apply}
          disabled={isPending}
          className="btn-primary px-4 py-2 text-sm"
        >
          {isPending ? "…" : "Apply"}
        </button>
        {hasValues && (
          <button
            onClick={() => {
              setMinPrice(""); setMaxPrice(""); setSection("");
              // Remove refine params but keep q/category
              const params = new URLSearchParams(searchParams.toString());
              params.delete("minPrice"); params.delete("maxPrice"); params.delete("section");
              startTransition(() => router.push(`/?${params.toString()}`));
            }}
            className="btn-secondary px-3 py-2 text-sm"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
