import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "100% Buyer Guarantee",
  description: "Every ticket purchased on Ticket Mint is 100% verified and backed by our buyer guarantee. Secure checkout, authentic tickets, and a full refund if your event is cancelled.",
};

const GUARANTEES = [
  {
    icon: "🛡️",
    title: "100% Verified Tickets",
    body: "Every ticket on Ticket Mint is backed by blockchain verification. Each ticket is a unique NFT — impossible to counterfeit, duplicate, or transfer fraudulently. You'll always receive exactly what you paid for.",
  },
  {
    icon: "🔒",
    title: "Secure Checkout",
    body: "Payments are processed by Stripe, a PCI-compliant payment provider trusted by millions of businesses worldwide. We never store your card details. Apple Pay and Google Pay are supported for extra security.",
  },
  {
    icon: "💰",
    title: "Money-Back if Event is Cancelled",
    body: "If an event is officially cancelled (not postponed), you'll receive a full refund to your original payment method within 5–10 business days. No questions asked. Contact support@ticketmint.io to initiate a refund.",
  },
  {
    icon: "⚡",
    title: "Instant Ticket Delivery",
    body: "Your ticket is delivered immediately after purchase as a blockchain-verified NFT. Access your tickets anytime in the My Tickets section. No waiting, no postal delays, no lost tickets.",
  },
  {
    icon: "🤝",
    title: "Authentic Sellers",
    body: "All sellers on Ticket Mint are verified through blockchain identity. Seller wallets are publicly linked to each listing, creating full transparency and accountability. Scam sellers have nowhere to hide.",
  },
  {
    icon: "📱",
    title: "Venue Entry Guarantee",
    body: "Every ticket comes with a scannable QR code for venue entry. The QR code is tied to your unique NFT and cannot be reused or duplicated. Simply show the QR code in the My Tickets section at the venue.",
  },
];

const FAQS = [
  {
    q: "What happens if my event is postponed?",
    a: "If an event is postponed (not cancelled), your ticket remains valid for the new date. We'll notify you of any date changes. If you cannot attend the new date, you may relist your ticket on the marketplace.",
  },
  {
    q: "How do I get a refund if the event is cancelled?",
    a: "Email support@ticketmint.io with your order number and we'll process a full refund to your original payment method within 5–10 business days.",
  },
  {
    q: "What if the ticket doesn't work at the venue?",
    a: "In the rare case a ticket doesn't scan at the venue, contact our support team immediately. We'll work directly with the event organiser to resolve the issue or provide a full refund.",
  },
  {
    q: "Are resale prices regulated?",
    a: "Ticket Mint is a peer-to-peer marketplace — sellers set their own prices. We do not cap resale prices. However, all transactions are transparent and all tickets are verified.",
  },
  {
    q: "How is a ticket verified on the blockchain?",
    a: "Each ticket is minted as a Metaplex NFT on the Solana blockchain. The NFT contains verifiable metadata including the event, venue, seat, and seller. You can verify any ticket on Solscan using the ticket's mint address.",
  },
  {
    q: "Can I resell my ticket after buying?",
    a: "Yes! You can relist any ticket you've purchased on the Ticket Mint marketplace. Go to My Tickets, tap the Sell button on any ticket, set your price, and it goes live instantly.",
  },
];

export default function GuaranteePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">

      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ECFDF5] rounded-2xl mb-5">
          <span className="text-3xl">🛡️</span>
        </div>
        <h1 className="text-4xl font-extrabold text-[#0F172A] mb-4">100% Buyer Guarantee</h1>
        <p className="text-lg text-[#64748B] max-w-xl mx-auto leading-relaxed">
          Every ticket purchased on Ticket Mint is backed by blockchain verification and our
          full buyer protection policy. Shop with complete confidence.
        </p>
      </div>

      {/* Guarantee cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {GUARANTEES.map((g) => (
          <div
            key={g.title}
            className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
            style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}
          >
            <div className="text-3xl mb-3">{g.icon}</div>
            <h3 className="font-bold text-[#0F172A] mb-2">{g.title}</h3>
            <p className="text-sm text-[#64748B] leading-relaxed">{g.body}</p>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="bg-[#F8F9FA] rounded-2xl border border-[#E2E8F0] p-6 mb-16">
        <div className="flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { value: "100%",     label: "Authentic tickets" },
            { value: "Instant",  label: "Ticket delivery" },
            { value: "Stripe",   label: "Secure payments" },
            { value: "Solana",   label: "Blockchain verified" },
          ].map((b) => (
            <div key={b.label}>
              <div className="text-2xl font-extrabold text-[#0F172A]">{b.value}</div>
              <div className="text-xs text-[#94A3B8] uppercase tracking-wide font-medium mt-0.5">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-12">
        <h2 className="text-2xl font-extrabold text-[#0F172A] mb-6">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="bg-white rounded-xl border border-[#E2E8F0] group"
              style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer
                                  font-semibold text-[#0F172A] text-sm list-none select-none
                                  hover:text-[#E8315A] transition-colors">
                {faq.q}
                <span className="text-[#94A3B8] group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-4 text-sm text-[#64748B] leading-relaxed border-t border-[#F1F5F9] pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-[#E8315A] to-[#7C3AED] rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-extrabold mb-2">Ready to buy with confidence?</h2>
        <p className="text-white/80 mb-6 text-sm">
          Browse thousands of verified tickets backed by our 100% buyer guarantee.
        </p>
        <Link
          href="/"
          className="inline-block bg-white text-[#E8315A] font-bold px-8 py-3 rounded-xl text-sm
                     hover:bg-[#FFF0F3] transition-colors"
        >
          Browse Tickets →
        </Link>
      </div>

      {/* Support footer */}
      <p className="text-center text-sm text-[#94A3B8] mt-8">
        Questions about our guarantee?{" "}
        <a href="mailto:support@ticketmint.io" className="text-[#E8315A] hover:underline">
          support@ticketmint.io
        </a>
      </p>
    </div>
  );
}
