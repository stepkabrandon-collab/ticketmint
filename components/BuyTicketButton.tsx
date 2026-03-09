"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { lamportsToSol } from "@/lib/utils";

interface BuyTicketButtonProps {
  ticketId:     string;
  pricelamports: number;
  mintAddress:  string;
  sellerWallet: string;
  eventName:    string;
}

type Stage = "idle" | "email" | "loading";

export function BuyTicketButton({
  ticketId,
  pricelamports,
  mintAddress,
  sellerWallet,
  eventName,
}: BuyTicketButtonProps) {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [stage, setStage]       = useState<Stage>("idle");
  const [email, setEmail]       = useState("");
  const [emailError, setEmailError] = useState("");

  const usdEstimate = (lamportsToSol(pricelamports) * 150).toFixed(2);

  function handleBuyClick() {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }
    setStage("email");
  }

  async function handleCheckout() {
    // Validate email
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    setStage("loading");

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          buyerWallet: publicKey!.toBase58(),
          buyerEmail:  trimmed,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout session");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      console.error("[BuyTicketButton]", err);
      toast.error(err?.message ?? "Purchase failed. Please try again.");
      setStage("email");
    }
  }

  // ── Loading ────────────────────────────────────────────────
  if (stage === "loading") {
    return (
      <div className="space-y-4">
        <button disabled className="btn-primary w-full py-4 text-base font-bold rounded-xl opacity-80 cursor-not-allowed">
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin inline-block">⟳</span>
            Redirecting to checkout…
          </span>
        </button>
      </div>
    );
  }

  // ── Email collection ───────────────────────────────────────
  if (stage === "email") {
    return (
      <div className="space-y-3">
        {/* Email form card */}
        <div className="bg-[#F8F9FA] rounded-xl border border-[#E2E8F0] p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 bg-[#FFF0F3] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-[#E8315A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A] leading-tight">
                Where should we send your receipt?
              </p>
              <p className="text-xs text-[#64748B] mt-0.5">
                Your order confirmation will be emailed here.
              </p>
            </div>
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCheckout()}
            placeholder="you@example.com"
            autoFocus
            className="input w-full px-4 py-3 text-sm text-[#0F172A] bg-white"
            style={{ borderColor: emailError ? "#E8315A" : undefined }}
          />
          {emailError && (
            <p className="text-xs text-[#E8315A] mt-1.5 font-medium">{emailError}</p>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleCheckout}
          className="btn-primary w-full py-4 text-base font-bold rounded-xl"
        >
          Continue to Checkout — ${usdEstimate}
        </button>

        {/* Cancel */}
        <button
          onClick={() => { setStage("idle"); setEmail(""); setEmailError(""); }}
          className="w-full text-sm text-[#94A3B8] hover:text-[#64748B] transition-colors py-1"
        >
          ← Back
        </button>
      </div>
    );
  }

  // ── Idle (default) ─────────────────────────────────────────
  return (
    <div className="space-y-4">
      <button
        onClick={handleBuyClick}
        className="btn-primary w-full py-4 text-base font-bold rounded-xl"
      >
        {connected
          ? `Buy Now with Stripe — $${usdEstimate}`
          : "Connect Wallet to Buy"}
      </button>

      {/* Trust signals */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-[#64748B]">
        {["Secure Stripe checkout", "Ticket delivered instantly", "Authenticity guaranteed"].map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className="text-[#059669] font-bold">✓</span> {s}
          </span>
        ))}
      </div>

      <p className="text-xs text-center text-[#94A3B8]">
        {connected
          ? "Wallet connected — ready to checkout."
          : "You'll be asked to connect your wallet to complete the purchase."}
      </p>
    </div>
  );
}
