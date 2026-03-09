// ── lib/utils.ts — Shared utility functions ───────────────────

import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merger (shadcn/ui pattern) ─────────────────
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ── SOL / Lamport conversions ─────────────────────────────────
export function lamportsToSol(lamports: number): number {
  return parseFloat((lamports / LAMPORTS_PER_SOL).toFixed(6));
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

// ── Wallet address shortener ──────────────────────────────────
// "4xKqZ...Mf3B" format for display
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

// ── Date formatting ───────────────────────────────────────────
export function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
}

export function formatEventTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// ── Solscan URL builders ──────────────────────────────────────
const CLUSTER = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export function solscanTx(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=${CLUSTER}`;
}

export function solscanToken(mintAddress: string): string {
  return `https://solscan.io/token/${mintAddress}?cluster=${CLUSTER}`;
}

export function solscanAccount(address: string): string {
  return `https://solscan.io/account/${address}?cluster=${CLUSTER}`;
}

// ── Number formatting ─────────────────────────────────────────
export function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style:    "currency",
    currency: "USD",
  }).format(cents / 100);
}
