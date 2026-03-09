"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { lamportsToSol } from "@/lib/utils";

interface BuyTicketButtonProps {
  ticketId: string;
  pricelamports: number;
  mintAddress: string;
  sellerWallet: string;
  eventName: string;
}

export function BuyTicketButton({
  ticketId,
  pricelamports,
  mintAddress,
  sellerWallet,
  eventName,
}: BuyTicketButtonProps) {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [loading, setLoading] = useState(false);

  const usdEstimate = (lamportsToSol(pricelamports) * 150).toFixed(2);

  async function handleBuy() {
    if (!connected || !publicKey) {
      setVisible(true);
      // After wallet connects the user can click again — don't block here
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, buyerWallet: publicKey.toBase58() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout session");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("[BuyTicketButton]", err);
      toast.error(err?.message ?? "Purchase failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleBuy}
        disabled={loading}
        className="btn-primary w-full py-4 text-base font-bold rounded-xl"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block">⟳</span>
            Redirecting to checkout…
          </span>
        ) : (
          `Buy Now with Stripe — $${usdEstimate}`
        )}
      </button>

      {/* Trust signals */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-[#64748B]">
        {[
          "Secure Stripe checkout",
          "Ticket delivered instantly",
          "Authenticity guaranteed",
        ].map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="text-[#059669] font-bold">✓</span> {s}
          </span>
        ))}
      </div>

      <p className="text-xs text-center text-[#94A3B8]">
        {connected ? "Wallet connected — ready to checkout." : "You'll be asked to connect your wallet to complete the purchase."}
      </p>
    </div>
  );
}
