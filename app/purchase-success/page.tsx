// ── Purchase Success Page ──────────────────────────────────────
// Server component — retrieves Stripe session and displays order details.
// Linked from success_url in /api/stripe/checkout with ?session_id=xxx

import { stripe } from "@/lib/stripe";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Order Confirmed — Ticket Mint" };

export default async function PurchaseSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  if (!sessionId) redirect("/");

  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.retrieve>> & {
    line_items?: { data: Array<{ description: string | null; quantity: number | null; amount_total: number }> };
  };

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    }) as any;
  } catch {
    redirect("/");
  }

  if (!session || session.payment_status !== "paid") redirect("/");

  const lineItem = (session as any).line_items?.data?.[0];

  // Product description is the ticket name we set in checkout route:
  // "Event Name — Sec X Row Y #Z"
  const ticketDesc: string = lineItem?.description ?? "Event Ticket";
  const dashIdx = ticketDesc.indexOf(" — ");
  const eventName = dashIdx !== -1 ? ticketDesc.slice(0, dashIdx) : ticketDesc;
  const seatInfo  = dashIdx !== -1 ? ticketDesc.slice(dashIdx + 3) : "";
  const quantity  = lineItem?.quantity ?? 1;
  const totalUsd  = ((session.amount_total ?? 0) / 100).toFixed(2);
  const currency  = (session.currency ?? "usd").toUpperCase();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      {/* Success card */}
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden"
        style={{ boxShadow: "0 8px 32px rgba(15,23,42,0.10)" }}
      >
        {/* Header band */}
        <div className="bg-gradient-to-r from-[#059669] to-[#10B981] px-8 py-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Payment Confirmed!</h1>
          <p className="text-white/80 text-sm mt-2">
            Your ticket is secured on the blockchain.
          </p>
        </div>

        {/* Order details */}
        <div className="px-8 py-7 space-y-5">
          {/* Event */}
          <div className="bg-[#F8F9FA] rounded-xl p-5 border border-[#E2E8F0]">
            <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest mb-2">
              Event
            </p>
            <p className="font-bold text-[#0F172A] text-lg leading-tight">{eventName}</p>
            {seatInfo && (
              <p className="text-[#64748B] text-sm mt-1">{seatInfo}</p>
            )}
          </div>

          {/* Order summary */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-[#64748B]">Quantity</span>
              <span className="text-[#0F172A] font-semibold">
                {quantity} ticket{quantity !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t border-[#F1F5F9] pt-3">
              <span className="text-[#64748B]">Total Paid</span>
              <span className="text-[#0F172A] font-bold text-base">
                {currency} ${totalUsd}
              </span>
            </div>
          </div>

          {/* Session reference */}
          <p className="text-[11px] text-[#CBD5E1] font-mono break-all text-center">
            Order #{sessionId.slice(-12).toUpperCase()}
          </p>

          {/* CTAs */}
          <div className="space-y-3 pt-2">
            <Link
              href="/my-tickets"
              className="btn-primary w-full py-3.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
            >
              View My Tickets
            </Link>
            <Link
              href="/"
              className="block w-full py-3 text-sm font-semibold text-[#64748B] text-center hover:text-[#0F172A] transition-colors"
            >
              Browse More Events
            </Link>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-[#94A3B8] mt-6">
        Your ticket NFT will appear in your wallet after the blockchain transaction confirms.
        <br />
        Questions? Contact{" "}
        <a href="mailto:support@ticketmint.io" className="text-[#E8315A] hover:underline">
          support@ticketmint.io
        </a>
      </p>
    </div>
  );
}
