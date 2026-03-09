"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseAnon } from "@/lib/supabase";
import { mintTicketNFT, listTicketOnChain } from "@/lib/solana";
import { solToLamports } from "@/lib/utils";
import { WalletButton } from "@/components/WalletButton";

interface EventOption {
  id: string;
  name: string;
  venue: string;
  city: string;
  event_date: string;
}

interface FormData {
  eventId:     string;
  seatSection: string;
  seatRow:     string;
  seatNumber:  string;
  priceSol:    string;
  quantity:    string;
}

type Step = "details" | "saving" | "listing" | "done";

export default function ListTicketPage() {
  const { publicKey, connected, signTransaction } = useWallet();
  const router = useRouter();
  const [events, setEvents]         = useState<EventOption[]>([]);
  const [form, setForm]             = useState<FormData>({
    eventId: "", seatSection: "", seatRow: "", seatNumber: "", priceSol: "", quantity: "1",
  });
  const [step, setStep]             = useState<Step>("details");
  const [mintAddress, setMintAddress] = useState("");
  const [errors, setErrors]         = useState<Partial<FormData>>({});

  useEffect(() => {
    supabaseAnon
      .from("events")
      .select("id, name, venue, city, event_date")
      .order("event_date")
      .then(({ data }) => setEvents(data ?? []));
  }, []);

  const selectedEvent = events.find((e) => e.id === form.eventId);

  function validate(): boolean {
    const errs: Partial<FormData> = {};
    if (!form.eventId)     errs.eventId = "Please select an event";
    if (!form.seatSection) errs.seatSection = "Required";
    const price = parseFloat(form.priceSol);
    if (!form.priceSol || isNaN(price) || price <= 0)
      errs.priceSol = "Enter a valid price";
    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 10)
      errs.quantity = "Enter 1–10";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !publicKey) return;

    try {
      setStep("saving");
      toast.info("Saving your listing…");

      const priceLamports = solToLamports(parseFloat(form.priceSol));
      const event         = selectedEvent!;
      const qty           = parseInt(form.quantity, 10);

      // ── 1. Insert all tickets to DB immediately with "listed" status ──
      const insertedTickets: any[] = [];
      for (let i = 0; i < qty; i++) {
        const seatNum = qty > 1 && form.seatNumber
          ? String((parseInt(form.seatNumber, 10) || 1) + i)
          : (form.seatNumber || "GA");

        const { data: ticket, error: dbError } = await supabaseAnon
          .from("tickets")
          .insert({
            event_id:       form.eventId,
            seller_wallet:  publicKey.toBase58(),
            seat_section:   form.seatSection,
            seat_row:       form.seatRow  || "GA",
            seat_number:    seatNum,
            price_lamports: priceLamports,
            original_price: priceLamports,
            listing_status: "listed",
            listed_at:      new Date().toISOString(),
          })
          .select()
          .single();

        if (dbError) throw new Error(`Failed to save ticket: ${dbError.message}`);
        insertedTickets.push(ticket);
      }

      toast.success(
        qty > 1
          ? `${qty} tickets listed on marketplace!`
          : "Ticket listed on marketplace!"
      );

      // ── 2. Record mint transfers ──────────────────────────────────────
      for (const ticket of insertedTickets) {
        await supabaseAnon.from("transfer_history").insert({
          ticket_id:     ticket.id,
          to_wallet:     publicKey.toBase58(),
          transfer_type: "list",
        });
      }

      // ── 3. Attempt NFT mint + on-chain listing (best-effort) ──────────
      // If the Anchor program isn't deployed yet this will fail gracefully.
      if (signTransaction && insertedTickets.length > 0) {
        setStep("listing");
        toast.info("Attempting on-chain registration…");
        try {
          const mint = await mintTicketNFT({
            walletPublicKey: publicKey.toBase58(),
            signTransaction,
            metadata: {
              name: `${event.name} — Sec ${form.seatSection} Row ${form.seatRow || "GA"} #${form.seatNumber || "GA"}`,
              symbol: "TMKT",
              description: `Ticket for ${event.name} at ${event.venue}, ${event.city}`,
              attributes: [
                { trait_type: "eventName",     value: event.name },
                { trait_type: "eventDate",     value: new Date(event.event_date).toLocaleDateString() },
                { trait_type: "venue",         value: event.venue },
                { trait_type: "city",          value: event.city },
                { trait_type: "seatSection",   value: form.seatSection },
                { trait_type: "seatRow",       value: form.seatRow || "GA" },
                { trait_type: "seatNumber",    value: form.seatNumber || "GA" },
                { trait_type: "originalPrice", value: priceLamports.toString() },
              ],
            },
          });

          setMintAddress(mint);

          await supabaseAnon
            .from("tickets")
            .update({ mint_address: mint })
            .eq("id", insertedTickets[0].id);

          const txSig = await listTicketOnChain({
            mintAddress:      mint,
            priceLamports,
            sellerPublicKey:  publicKey.toBase58(),
            royaltyRecipient: publicKey.toBase58(),
            signTransaction,
          });

          await supabaseAnon.from("transfer_history").insert({
            ticket_id:     insertedTickets[0].id,
            mint_address:  mint,
            from_wallet:   publicKey.toBase58(),
            to_wallet:     "escrow",
            transfer_type: "list",
            tx_signature:  txSig,
          });

          toast.success("On-chain registration complete!");
        } catch (chainErr: any) {
          // On-chain ops failed — listing is still live in DB
          console.warn("[ListTicket] On-chain skipped:", chainErr?.message);
          toast.info("Listed without on-chain NFT (program not deployed).");
        }
      }

      setStep("done");
      setTimeout(() => router.push("/"), 2500);
    } catch (err: any) {
      console.error("[ListTicket] Error:", err);
      toast.error(err?.message ?? "Something went wrong. Please try again.");
      setStep("details");
    }
  }

  // ── Not connected ─────────────────────────────────────────
  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="w-20 h-20 bg-[#FFF0F3] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🎟️</span>
        </div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-3">Sell a Ticket</h1>
        <p className="text-[#64748B] mb-8">Connect your wallet to list a ticket for sale.</p>
        <WalletButton />
      </div>
    );
  }

  // ── Processing state ───────────────────────────────────────
  if (step !== "details") {
    const qty = parseInt(form.quantity, 10) || 1;
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10"
             style={{ boxShadow: "0 4px 16px rgba(15,23,42,0.08)" }}>
          {step === "done" ? (
            <>
              <div className="w-16 h-16 bg-[#ECFDF5] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] mb-2">
                {qty > 1 ? `${qty} Tickets Listed!` : "Ticket Listed!"}
              </h2>
              <p className="text-[#64748B] text-sm">
                {qty > 1
                  ? `Your ${qty} tickets are live on the marketplace.`
                  : "Your ticket is live on the marketplace."}
              </p>
              {mintAddress && (
                <a
                  href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-sm text-[#E8315A] hover:underline"
                >
                  Verify on Solscan ↗
                </a>
              )}
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-[#FFF0F3] rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">{step === "saving" ? "💾" : "📋"}</span>
              </div>
              <h2 className="text-lg font-bold text-[#0F172A] mb-2">
                {step === "saving" ? "Saving your listing…" : "Registering on-chain…"}
              </h2>
              <p className="text-[#64748B] text-sm">
                {step === "saving"
                  ? "Storing your ticket on the marketplace."
                  : "Approve the transaction in your wallet."}
              </p>
              <div className="flex justify-center gap-2 mt-6">
                {(["saving", "listing"] as const).map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-8 rounded-full transition-colors ${
                      step === s ? "bg-[#E8315A]"
                      : s === "saving" && step === "listing" ? "bg-[#059669]"
                      : "bg-[#E2E8F0]"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────
  const priceVal = parseFloat(form.priceSol);
  const qtyVal   = parseInt(form.quantity, 10) || 1;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Sell a Ticket</h1>
        <p className="text-[#64748B] text-sm mt-2">
          Set your price and we'll handle the rest — buyers pay securely via card.
          A 5% total fee applies on sale.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5"
        style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}
      >
        {/* Event */}
        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-2">Event *</label>
          <select
            value={form.eventId}
            onChange={(e) => setForm({ ...form, eventId: e.target.value })}
            className="input w-full px-4 py-3 text-sm text-[#0F172A] bg-[#F8F9FA]"
          >
            <option value="">Select an event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} — {ev.venue} ({new Date(ev.event_date).toLocaleDateString()})
              </option>
            ))}
          </select>
          {errors.eventId && <FieldError msg={errors.eventId} />}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-2">
            Number of Tickets *
          </label>
          <select
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="input w-full px-4 py-3 text-sm text-[#0F172A] bg-[#F8F9FA]"
          >
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <option key={n} value={n}>{n} ticket{n > 1 ? "s" : ""}</option>
            ))}
          </select>
          {errors.quantity && <FieldError msg={errors.quantity} />}
        </div>

        {/* Seat details */}
        <div>
          <p className="text-sm font-semibold text-[#334155] mb-2">Seat Details</p>
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: "seatSection", label: "Section *",  placeholder: "Floor A", required: true  },
              { key: "seatRow",     label: "Row",        placeholder: "12",       required: false },
              { key: "seatNumber",  label: "Seat #",     placeholder: "7",        required: false },
            ] as const).map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="input w-full px-3 py-2.5 text-sm text-[#0F172A] bg-[#F8F9FA]"
                />
                {errors[key] && <FieldError msg={errors[key]!} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-[#94A3B8] mt-2">Row and seat number are optional for General Admission events.</p>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-2">
            Asking Price per Ticket (SOL) *
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm font-mono">◎</span>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={form.priceSol}
              onChange={(e) => setForm({ ...form, priceSol: e.target.value })}
              placeholder="0.500"
              className="input w-full pl-8 pr-4 py-3 text-sm text-[#0F172A] bg-[#F8F9FA]"
            />
          </div>
          {form.priceSol && !isNaN(priceVal) && (
            <p className="text-xs text-[#64748B] mt-1.5">
              You receive ≈ ◎{(priceVal * 0.95).toFixed(4)} per ticket after fees
              {qtyVal > 1 && ` · ◎${(priceVal * 0.95 * qtyVal).toFixed(4)} total`}
            </p>
          )}
          {errors.priceSol && <FieldError msg={errors.priceSol} />}
        </div>

        {/* Live preview */}
        {selectedEvent && form.seatSection && (
          <div className="bg-[#F8F9FA] rounded-xl p-4 border-l-4 border-[#E8315A] text-sm space-y-1">
            <p className="text-[#64748B] text-xs font-semibold uppercase tracking-wide mb-1.5">
              Listing Preview
            </p>
            <p className="text-[#0F172A] font-bold">
              {selectedEvent.name}
              {qtyVal > 1 && <span className="text-[#E8315A] ml-2">×{qtyVal}</span>}
            </p>
            <p className="text-[#64748B]">
              Sec {form.seatSection}
              {form.seatRow    ? ` · Row ${form.seatRow}`    : ""}
              {form.seatNumber ? ` · Seat #${form.seatNumber}` : " · GA"}
              {qtyVal > 1     ? `–${(parseInt(form.seatNumber, 10) || 1) + qtyVal - 1}` : ""}
            </p>
            <p className="text-[#64748B]">{selectedEvent.venue}, {selectedEvent.city}</p>
            <p className="text-[#64748B]">
              {new Date(selectedEvent.event_date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        )}

        <button type="submit" className="btn-primary w-full py-3.5 text-sm font-bold rounded-xl">
          {parseInt(form.quantity, 10) > 1
            ? `List ${form.quantity} Tickets for Sale`
            : "List Ticket for Sale"}
        </button>

        <p className="text-xs text-[#94A3B8] text-center">
          Wallet approval required for on-chain NFT registration (if program is deployed).
        </p>
      </form>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-[#E8315A] text-xs mt-1.5 font-medium">{msg}</p>;
}
