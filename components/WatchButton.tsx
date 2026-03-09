"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "sonner";

export function WatchButton({ eventId }: { eventId: string }) {
  const { publicKey, connected } = useWallet();
  const [watching,     setWatching]     = useState(false);
  const [showInput,    setShowInput]    = useState(false);
  const [targetPrice,  setTargetPrice]  = useState("");
  const [loading,      setLoading]      = useState(false);
  const [checkDone,    setCheckDone]    = useState(false);
  const [userEmail,    setUserEmail]    = useState<string | null>(null);

  // Check initial watch state + get auth email for alerts
  useEffect(() => {
    const supabase = createClientComponentClient();
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });
    if (!connected || !publicKey) { setCheckDone(true); return; }
    fetch(`/api/watchlist?wallet=${publicKey.toBase58()}&eventId=${eventId}`)
      .then((r) => r.json())
      .then((d) => { setWatching(d.watching); setCheckDone(true); })
      .catch(() => setCheckDone(true));
  }, [connected, publicKey, eventId]);

  async function handleRemove() {
    if (!publicKey) return;
    setLoading(true);
    try {
      await fetch("/api/watchlist", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ wallet: publicKey.toBase58(), eventId }),
      });
      setWatching(false);
      toast.success("Removed from watchlist");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!publicKey) return;
    setLoading(true);
    try {
      const price = targetPrice ? Math.round(parseFloat(targetPrice) * 100) : null;
      await fetch("/api/watchlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          wallet: publicKey.toBase58(), eventId,
          targetPrice: price,
          userEmail: userEmail ?? undefined,
        }),
      });
      setWatching(true);
      setShowInput(false);
      setTargetPrice("");
      toast.success("Added to watchlist!");
    } finally {
      setLoading(false);
    }
  }

  function handleButtonClick() {
    if (!connected || !publicKey) {
      toast.error("Connect your wallet to watch events");
      return;
    }
    if (watching) {
      handleRemove();
    } else {
      setShowInput(true);
    }
  }

  if (!checkDone) return null;

  if (showInput) {
    return (
      <div className="bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#E8315A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm font-semibold text-[#0F172A]">Watch this event</p>
        </div>
        <div>
          <label className="block text-xs text-[#64748B] mb-1.5">
            Alert me when tickets drop below: <span className="text-[#94A3B8]">(optional)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">$</span>
              <input
                type="number"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Any price"
                autoFocus
                className="input w-full pl-7 pr-3 py-2.5 text-sm"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="btn-primary px-4 py-2.5 text-sm min-h-[44px]"
            >
              {loading ? "…" : "Watch"}
            </button>
            <button
              onClick={() => { setShowInput(false); setTargetPrice(""); }}
              className="btn-secondary px-3 py-2.5 text-sm min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleButtonClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border
                  text-sm font-semibold transition-all min-h-[44px] ${
        watching
          ? "bg-[#FFF0F3] border-[#FECDD3] text-[#E8315A]"
          : "bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#E8315A] hover:text-[#E8315A]"
      }`}
    >
      <svg
        className="w-4 h-4"
        fill={watching ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
      {watching ? "Watching" : "Watch this event"}
    </button>
  );
}
