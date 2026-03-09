"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { lamportsToSol } from "@/lib/utils";

const SOL_TO_USD = 150;

interface BrokerTicket {
  id: string;
  seat_section: string;
  seat_row: string;
  seat_number: string;
  price_lamports: number;
  listing_status: string;
  listed_at: string | null;
  sold_at: string | null;
  events: { name: string; venue: string; event_date: string } | null;
}

interface UploadResult {
  uploaded: number;
  failed: number;
  errors: string[];
}

export default function BrokerPage() {
  const { publicKey, connected } = useWallet();
  const [user,     setUser]     = useState<any>(null);
  const [tickets,  setTickets]  = useState<BrokerTicket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result,   setResult]   = useState<UploadResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, [supabase]);

  const loadTickets = useCallback(async () => {
    if (!connected && !publicKey) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select(`id, seat_section, seat_row, seat_number, price_lamports, listing_status, listed_at, sold_at,
               events ( name, venue, event_date )`)
      .eq("seller_wallet", publicKey!.toBase58())
      .order("listed_at", { ascending: false });
    setTickets((data ?? []) as unknown as BrokerTicket[]);
    setLoading(false);
  }, [connected, publicKey, supabase]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const listed = tickets.filter((t) => t.listing_status === "listed").length;
  const sold   = tickets.filter((t) => t.listing_status === "sold").length;
  const earnings = tickets
    .filter((t) => t.listing_status === "sold")
    .reduce((sum, t) => sum + lamportsToSol(t.price_lamports) * 0.95 * SOL_TO_USD, 0);

  function downloadTemplate() {
    const csv = "event_name,event_date,venue,city,section,row,seat,price_usd,quantity\n" +
                "Taylor Swift — The Eras Tour,2026-06-15,SoFi Stadium,Los Angeles CA,Floor A,1,12,350,1";
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "ticketmint-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    if (publicKey) formData.append("sellerWallet", publicKey.toBase58());
    try {
      const res  = await fetch("/api/broker/bulk-upload", { method: "POST", body: formData });
      const data = await res.json();
      setResult(data);
      if (data.uploaded > 0) loadTickets();
    } catch {
      setResult({ uploaded: 0, failed: 1, errors: ["Upload failed. Please try again."] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <div className="text-5xl mb-5">📊</div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-3">Broker Portal</h1>
        <p className="text-[#64748B] mb-6">Connect your Phantom wallet to access the broker dashboard.</p>
        <p className="text-sm text-[#94A3B8]">Your wallet address identifies your listings on-chain.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A]">Broker Portal</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Wallet: <span className="font-mono text-[#E8315A]">{publicKey?.toBase58().slice(0, 8)}…</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/broker/analytics"
                className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2 min-h-[44px]">
            📈 Analytics
          </Link>
          <Link href="/list-ticket"
                className="btn-primary px-4 py-2.5 text-sm font-bold min-h-[44px] flex items-center">
            + Add Single Listing
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Listings", value: tickets.length, color: "text-[#0F172A]" },
          { label: "Active",         value: listed,          color: "text-[#059669]" },
          { label: "Sold",           value: sold,            color: "text-[#7C3AED]" },
          { label: "Est. Earnings",  value: `$${earnings.toFixed(0)}`, color: "text-[#E8315A]" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
               style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
            <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* CSV Upload */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 mb-6"
           style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">Bulk Upload via CSV</h2>
            <p className="text-sm text-[#64748B] mt-0.5">
              Upload multiple ticket listings at once using a CSV file.
            </p>
          </div>
          <button onClick={downloadTemplate}
                  className="btn-secondary px-4 py-2.5 text-sm flex items-center gap-2 flex-shrink-0 min-h-[44px]">
            ⬇ Download Template
          </button>
        </div>

        <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-8 text-center
                        hover:border-[#E8315A] transition-colors cursor-pointer"
             onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
          <div className="text-3xl mb-3">📂</div>
          <p className="text-sm font-semibold text-[#334155]">
            {uploading ? "Uploading…" : "Click to select CSV file"}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Columns: event_name, event_date, venue, city, section, row, seat, price_usd, quantity
          </p>
        </div>

        {result && (
          <div className={`mt-4 rounded-xl p-4 ${result.failed === 0 ? "bg-[#ECFDF5] border border-[#A7F3D0]" : "bg-[#FFF7ED] border border-[#FED7AA]"}`}>
            <p className={`font-semibold text-sm ${result.failed === 0 ? "text-[#065F46]" : "text-[#92400E]"}`}>
              ✅ {result.uploaded} tickets uploaded
              {result.failed > 0 && ` · ⚠️ ${result.failed} rows failed`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-xs text-[#92400E] space-y-1">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Listings table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden"
           style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
        <div className="px-6 py-4 border-b border-[#F1F5F9]">
          <h2 className="text-lg font-bold text-[#0F172A]">Your Listings</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#94A3B8] text-sm">Loading…</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#64748B] text-sm mb-4">No listings yet.</p>
            <Link href="/list-ticket" className="btn-primary px-5 py-2.5 text-sm inline-block">
              Add Your First Listing
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-[#F1F5F9]">
                  {["Event", "Seat", "Price", "Status", "Listed", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8F9FA]">
                {tickets.map((t) => {
                  const ev = t.events as any;
                  const statusClasses: Record<string, string> = {
                    listed:    "badge-available",
                    sold:      "badge-sold",
                    draft:     "badge-draft",
                    cancelled: "badge-cancelled",
                  };
                  return (
                    <tr key={t.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#0F172A] line-clamp-1">{ev?.name ?? "—"}</p>
                        <p className="text-xs text-[#64748B]">{ev?.venue ?? ""}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#334155]">
                        Sec {t.seat_section} · Row {t.seat_row} · #{t.seat_number}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#0F172A]">
                        ${Math.round(lamportsToSol(t.price_lamports) * SOL_TO_USD)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses[t.listing_status] ?? ""}`}>
                          {t.listing_status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#64748B] text-xs">
                        {t.listed_at ? new Date(t.listed_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/marketplace/${t.id}`}
                              className="text-xs text-[#E8315A] hover:underline font-medium">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
