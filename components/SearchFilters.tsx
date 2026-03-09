"use client";

// ── SearchFilters ─────────────────────────────────────────────
// Refine bar: sort, price range, date range, section.
// Sort auto-applies on change; other filters require Apply.

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest listings" },
  { value: "price_asc",  label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "date_asc",   label: "Date: Soonest first" },
];

export function SearchFilters() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [sort,     setSort]     = useState(searchParams.get("sort")     ?? "newest");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [section,  setSection]  = useState(searchParams.get("section")  ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo,   setDateTo]   = useState(searchParams.get("dateTo")   ?? "");
  const [qty,      setQty]      = useState(searchParams.get("qty")      ?? "1");

  const buildParams = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams(searchParams.toString());
    const values: Record<string, string> = {
      sort, minPrice, maxPrice, section, dateFrom, dateTo, qty, ...overrides,
    };
    for (const [k, v] of Object.entries(values)) {
      if (v && v !== "newest" && v !== "1") p.set(k, v);
      else p.delete(k);
    }
    return p.toString();
  }, [sort, minPrice, maxPrice, section, dateFrom, dateTo, qty, searchParams]);

  const apply = useCallback(() => {
    startTransition(() => router.push(`/?${buildParams()}`));
  }, [buildParams, router]);

  const handleSortChange = (value: string) => {
    setSort(value);
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "newest") p.set("sort", value); else p.delete("sort");
    startTransition(() => router.push(`/?${p.toString()}`));
  };

  const handleQtyChange = (value: string) => {
    setQty(value);
    const p = new URLSearchParams(searchParams.toString());
    if (value && value !== "1") p.set("qty", value); else p.delete("qty");
    startTransition(() => router.push(`/?${p.toString()}`));
  };

  const hasRefineValues = minPrice || maxPrice || section || dateFrom || dateTo;

  const clearRefine = () => {
    setMinPrice(""); setMaxPrice(""); setSection(""); setDateFrom(""); setDateTo("");
    const p = new URLSearchParams(searchParams.toString());
    ["minPrice", "maxPrice", "section", "dateFrom", "dateTo"].forEach((k) => p.delete(k));
    startTransition(() => router.push(`/?${p.toString()}`));
  };

  return (
    <div
      className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 space-y-3"
      style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}
    >
      {/* Row 1: Sort + Quantity (auto-apply) */}
      <div className="flex flex-wrap items-end gap-3">
        <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide self-center mr-1">
          Sort &amp; Filter:
        </span>

        {/* Sort */}
        <div className="min-w-[180px]">
          <label className="block text-xs font-semibold text-[#334155] mb-1">Sort by</label>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="input w-full px-3 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Quantity needed */}
        <div className="min-w-[140px]">
          <label className="block text-xs font-semibold text-[#334155] mb-1">Tickets needed</label>
          <select
            value={qty}
            onChange={(e) => handleQtyChange(e.target.value)}
            className="input w-full px-3 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
          >
            <option value="1">1 ticket</option>
            <option value="2">2 tickets</option>
            <option value="3">3 tickets</option>
            <option value="4">4+ tickets</option>
          </select>
        </div>
      </div>

      {/* Row 2: Price + Date + Section (require Apply) */}
      <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-[#F1F5F9]">
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
          <div className="min-w-[80px]">
            <label className="block text-xs font-semibold text-[#334155] mb-1">Min $</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs font-mono">$</span>
              <input
                type="number" min="0" step="10" placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                className="input w-full pl-5 pr-2 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
              />
            </div>
          </div>
          <span className="text-[#CBD5E1] pb-2 text-lg leading-none">—</span>
          <div className="min-w-[80px]">
            <label className="block text-xs font-semibold text-[#334155] mb-1">Max $</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-xs font-mono">$</span>
              <input
                type="number" min="0" step="10" placeholder="Any"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && apply()}
                className="input w-full pl-5 pr-2 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
              />
            </div>
          </div>
        </div>

        {/* Date range */}
        <div className="flex items-end gap-2">
          <div className="min-w-[130px]">
            <label className="block text-xs font-semibold text-[#334155] mb-1">From date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input w-full px-3 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-semibold text-[#334155] mb-1">To date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input w-full px-3 py-2 text-sm text-[#0F172A] bg-[#F8F9FA]"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={apply}
            disabled={isPending}
            className="btn-primary px-4 py-2 text-sm min-h-[44px]"
          >
            {isPending ? "…" : "Apply"}
          </button>
          {hasRefineValues && (
            <button onClick={clearRefine} className="btn-secondary px-3 py-2 text-sm min-h-[44px]">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
