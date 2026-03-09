"use client";

// ── WalletProviders ───────────────────────────────────────────
// Wraps the app with:
//   1. Solana wallet adapter context (Phantom default)
//   2. Auto-register user in Supabase on first connect
//
// This is a client component because wallet adapter needs
// browser APIs.  Layout imports it via dynamic() with ssr:false.

import React, { FC, ReactNode, useCallback, useEffect, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

import { useTicketStore } from "@/zustand/store";
import { supabaseAnon } from "@/lib/supabase";

// ── Inner component that handles user registration ────────────
function WalletEffect({ children }: { children: ReactNode }) {
  const { publicKey, connected } = useWallet();
  const setUser = useTicketStore((s) => s.setUser);

  const registerUser = useCallback(async (walletAddress: string) => {
    try {
      // Upsert user by wallet address — safe to call on every connect
      const { data, error } = await supabaseAnon
        .from("users")
        .upsert({ wallet_address: walletAddress }, { onConflict: "wallet_address" })
        .select()
        .single();

      if (error) {
        console.error("[WalletEffect] Failed to register user:", error.message);
        return;
      }

      setUser(data);
    } catch (err) {
      console.error("[WalletEffect] Unexpected error:", err);
    }
  }, [setUser]);

  useEffect(() => {
    if (connected && publicKey) {
      registerUser(publicKey.toBase58());
    } else {
      setUser(null);
    }
  }, [connected, publicKey, registerUser, setUser]);

  return <>{children}</>;
}

// ── Main provider ─────────────────────────────────────────────
export const WalletProviders: FC<{ children: ReactNode }> = ({ children }) => {
  // Use devnet — switch to mainnet-beta for production
  const network = WalletAdapterNetwork.Devnet;

  // Prefer Helius RPC in production (set NEXT_PUBLIC_RPC_ENDPOINT in .env)
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? clusterApiUrl(network),
    [network]
  );

  // Empty array — Phantom (and other wallets) are auto-detected via the
  // Wallet Standard. No explicit adapter import needed for 0.19.x+.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletEffect>{children}</WalletEffect>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
