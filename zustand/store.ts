// ── Zustand Global Store ──────────────────────────────────────
// Lightweight client-side state for:
//   - Connected user (populated from Supabase on wallet connect)
//   - Marketplace filters (synced with URL params)
//   - UI state (modals, loading)

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ── Types ─────────────────────────────────────────────────────
export interface User {
  id: string;
  wallet_address: string;
  created_at: string;
}

export interface MarketplaceFilters {
  eventId:  string;
  section:  string;
  minPrice: string;
  maxPrice: string;
}

export interface TicketStore {
  // ── User ────────────────────────────────────────────────────
  user: User | null;
  setUser: (user: User | null) => void;

  // ── Marketplace filters ──────────────────────────────────────
  filters: MarketplaceFilters;
  setFilter: <K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K]
  ) => void;
  resetFilters: () => void;

  // ── UI state ─────────────────────────────────────────────────
  isListingModalOpen: boolean;
  setListingModalOpen: (open: boolean) => void;

  // ── NFT cache (owned tickets) ────────────────────────────────
  ownedNFTCount: number;
  setOwnedNFTCount: (count: number) => void;
}

const defaultFilters: MarketplaceFilters = {
  eventId:  "",
  section:  "",
  minPrice: "",
  maxPrice: "",
};

// ── Store ─────────────────────────────────────────────────────
export const useTicketStore = create<TicketStore>()(
  devtools(
    (set) => ({
      // User
      user:    null,
      setUser: (user) => set({ user }),

      // Filters
      filters:     defaultFilters,
      setFilter:   (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      resetFilters: () => set({ filters: defaultFilters }),

      // UI
      isListingModalOpen:    false,
      setListingModalOpen:   (open) => set({ isListingModalOpen: open }),

      // NFTs
      ownedNFTCount:    0,
      setOwnedNFTCount: (count) => set({ ownedNFTCount: count }),
    }),
    { name: "ticket-mint-store" }
  )
);
