"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";
import { listTicketOnChain } from "@/lib/solana";
import { supabaseAnon } from "@/lib/supabase";
import { solToLamports } from "@/lib/utils";
import type { TicketNFT } from "@/lib/solana";

interface ResellModalProps {
  nft: TicketNFT;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResellModal({ nft, onClose, onSuccess }: ResellModalProps) {
  const { publicKey, signTransaction } = useWallet();
  const [priceSol, setPriceSol] = useState("");
  const [loading, setLoading] = useState(false);

  const attr = (key: string) => nft.attributes?.find((a) => a.trait_type === key)?.value ?? "";

  async function handleResell() {
    if (!publicKey || !signTransaction) return;
    const price = parseFloat(priceSol);
    if (!priceSol || isNaN(price) || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    setLoading(true);
    try {
      const priceLamports = solToLamports(price);

      const txSig = await listTicketOnChain({
        mintAddress:      nft.mintAddress,
        priceLamports,
        sellerPublicKey:  publicKey.toBase58(),
        royaltyRecipient: publicKey.toBase58(),
        signTransaction,
      });

      await supabaseAnon
        .from("tickets")
        .update({
          listing_status: "listed",
          price_lamports: priceLamports,
          seller_wallet:  publicKey.toBase58(),
          listed_at:      new Date().toISOString(),
        })
        .eq("mint_address", nft.mintAddress);

      await supabaseAnon.from("transfer_history").insert({
        mint_address:   nft.mintAddress,
        from_wallet:    publicKey.toBase58(),
        to_wallet:      "escrow",
        transfer_type:  "list",
        price_lamports: priceLamports,
        tx_signature:   txSig,
      });

      onSuccess();
    } catch (err: any) {
      console.error("[ResellModal]", err);
      toast.error(err?.message ?? "Failed to list ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in border border-[#E2E8F0]"
           style={{ boxShadow: "0 20px 40px rgba(15,23,42,0.15)" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#F1F5F9]">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Sell this Ticket</h2>
            <p className="text-sm text-[#64748B] mt-0.5">Set your asking price</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#F8F9FA] hover:bg-[#F1F5F9] text-[#64748B]
                       hover:text-[#0F172A] transition-colors flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Ticket summary */}
          <div className="bg-[#F8F9FA] rounded-xl p-4 border-l-4 border-[#E8315A]">
            <p className="font-semibold text-[#0F172A] text-sm">{nft.name}</p>
            <div className="flex gap-3 mt-2">
              {[
                { label: "Section", value: attr("seatSection") },
                { label: "Row",     value: attr("seatRow") },
                { label: "Seat",    value: attr("seatNumber") },
              ].map((item) => (
                <div key={item.label} className="flex-1 bg-white rounded-lg p-2 text-center border border-[#E2E8F0]">
                  <div className="text-[9px] text-[#94A3B8] uppercase font-semibold">{item.label}</div>
                  <div className="text-[#0F172A] font-bold text-sm">{item.value}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#64748B] mt-2">{attr("eventDate")} · {attr("venue")}</p>
          </div>

          {/* Price input */}
          <div>
            <label className="block text-sm font-semibold text-[#334155] mb-2">
              Your asking price (SOL)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] font-mono text-sm">◎</span>
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="0.500"
                value={priceSol}
                onChange={(e) => setPriceSol(e.target.value)}
                className="input w-full pl-8 pr-4 py-3 text-[#0F172A] text-sm"
                autoFocus
              />
            </div>
            {priceSol && !isNaN(parseFloat(priceSol)) && parseFloat(priceSol) > 0 && (
              <p className="text-xs text-[#64748B] mt-1.5">
                You receive ≈ ◎{(parseFloat(priceSol) * 0.95).toFixed(4)} after 5% fees
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 py-3 text-sm font-semibold rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleResell}
              disabled={loading || !priceSol}
              className="btn-primary flex-1 py-3 text-sm font-bold rounded-xl"
            >
              {loading ? "Listing…" : "List for Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
