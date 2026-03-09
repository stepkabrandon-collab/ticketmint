"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { lamportsToSol } from "@/lib/utils";
import Link from "next/link";

const SOL_TO_USD = 150;

interface SoldTicket {
  price_lamports: number;
  sold_at: string | null;
  events: { name: string } | null;
}

export default function BrokerAnalyticsPage() {
  const { publicKey, connected } = useWallet();
  const [tickets, setTickets]   = useState<SoldTicket[]>([]);
  const [loading, setLoading]   = useState(true);

  const supabase = createClientComponentClient();

  const load = useCallback(async () => {
    if (!publicKey) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("tickets")
      .select("price_lamports, sold_at, events ( name )")
      .eq("seller_wallet", publicKey.toBase58())
      .eq("listing_status", "sold")
      .order("sold_at", { ascending: true });
    setTickets((data ?? []) as SoldTicket[]);
    setLoading(false);
  }, [publicKey, supabase]);

  useEffect(() => { load(); }, [load]);

  if (!connected) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-[#64748B]">Connect your wallet to view analytics.</p>
      </div>
    );
  }

  // ── Derived stats ───────────────────────────────────────────
  const totalEarnings = tickets.reduce(
    (s, t) => s + lamportsToSol(t.price_lamports) * 0.95 * SOL_TO_USD, 0
  );
  const avgPrice = tickets.length
    ? tickets.reduce((s, t) => s + lamportsToSol(t.price_lamports) * SOL_TO_USD, 0) / tickets.length
    : 0;

  // Sales by event
  const byEvent = tickets.reduce<Record<string, { sales: number; revenue: number }>>((acc, t) => {
    const name = (t.events as any)?.name ?? "Unknown";
    if (!acc[name]) acc[name] = { sales: 0, revenue: 0 };
    acc[name].sales++;
    acc[name].revenue += lamportsToSol(t.price_lamports) * SOL_TO_USD;
    return acc;
  }, {});
  const eventChartData = Object.entries(byEvent)
    .map(([name, d]) => ({ name: name.split(" —")[0].slice(0, 20), ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Sales over time (monthly)
  const byMonth = tickets.reduce<Record<string, number>>((acc, t) => {
    if (!t.sold_at) return acc;
    const key = t.sold_at.slice(0, 7); // "YYYY-MM"
    acc[key] = (acc[key] ?? 0) + lamportsToSol(t.price_lamports) * SOL_TO_USD;
    return acc;
  }, {});
  const timeChartData = Object.entries(byMonth)
    .sort()
    .map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }));

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/broker" className="btn-secondary px-4 py-2 text-sm">← Dashboard</Link>
        <h1 className="text-2xl font-extrabold text-[#0F172A]">Sales Analytics</h1>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#94A3B8]">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Sold",       value: tickets.length },
              { label: "Total Earned",     value: `$${totalEarnings.toFixed(0)}` },
              { label: "Avg Ticket Price", value: `$${avgPrice.toFixed(0)}` },
              { label: "Pending Payout",   value: `$${(totalEarnings * 0.9).toFixed(0)}` },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[#E2E8F0] p-5"
                   style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
                <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">{s.label}</p>
                <p className="text-3xl font-extrabold text-[#0F172A]">{s.value}</p>
              </div>
            ))}
          </div>

          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-16 text-center">
              <p className="text-[#64748B]">No sales yet. Start listing tickets to see analytics here.</p>
            </div>
          ) : (
            <>
              {/* Revenue by event */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
                   style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
                <h2 className="text-base font-bold text-[#0F172A] mb-6">Revenue by Event</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={eventChartData} margin={{ top: 5, right: 20, bottom: 60, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip formatter={(v: number) => [`$${v.toFixed(0)}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="#E8315A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Sales over time */}
              {timeChartData.length > 1 && (
                <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6"
                     style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
                  <h2 className="text-base font-bold text-[#0F172A] mb-6">Monthly Revenue</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timeChartData} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v: number) => [`$${v}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top events table */}
              <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden"
                   style={{ boxShadow: "0 2px 8px rgba(15,23,42,0.06)" }}>
                <div className="px-6 py-4 border-b border-[#F1F5F9]">
                  <h2 className="text-base font-bold text-[#0F172A]">Top Selling Events</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#F1F5F9]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Event</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Tickets Sold</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-[#94A3B8] uppercase">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F8F9FA]">
                    {Object.entries(byEvent).sort((a, b) => b[1].revenue - a[1].revenue).map(([name, d]) => (
                      <tr key={name} className="hover:bg-[#F8F9FA]">
                        <td className="px-5 py-3.5 font-medium text-[#0F172A]">{name}</td>
                        <td className="px-5 py-3.5 text-[#64748B]">{d.sales}</td>
                        <td className="px-5 py-3.5 font-bold text-[#059669]">${d.revenue.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
