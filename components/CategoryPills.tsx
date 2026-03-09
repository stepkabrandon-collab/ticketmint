"use client";

// ── CategoryPills ─────────────────────────────────────────────
// Row of clickable category filter pills below the hero.
// Sets the ?category= URL param; the server filters by keywords.

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const CATEGORIES = [
  { id: "all",      label: "All Events",  emoji: "🎟️" },
  { id: "concerts", label: "Concerts",    emoji: "🎤" },
  { id: "sports",   label: "Sports",      emoji: "🏆" },
  { id: "festival", label: "Festivals",   emoji: "🎡" },
  { id: "theater",  label: "Theater",     emoji: "🎭" },
  { id: "comedy",   label: "Comedy",      emoji: "😂" },
];

export function CategoryPills() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeCategory = searchParams.get("category") ?? "all";

  function selectCategory(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "all") {
      params.delete("category");
    } else {
      params.set("category", id);
    }
    // Clear text search when switching category
    params.delete("q");
    startTransition(() => router.push(`/?${params.toString()}`));
  }

  const isActive = (id: string) =>
    id === "all" ? activeCategory === "all" || !searchParams.get("category") : activeCategory === id;

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => selectCategory(cat.id)}
          disabled={isPending}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
            transition-all duration-150 border
            ${isActive(cat.id)
              ? "bg-[#E8315A] text-white border-[#E8315A] shadow-md"
                + " shadow-[rgba(232,49,90,0.25)]"
              : "bg-white text-[#334155] border-[#E2E8F0] hover:border-[#E8315A]"
                + " hover:text-[#E8315A] hover:bg-[#FFF0F3]"
            }
          `}
        >
          <span className="text-base leading-none">{cat.emoji}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
