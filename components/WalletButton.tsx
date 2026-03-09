"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortenAddress } from "@/lib/utils";

export function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0]
                        rounded-lg px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#059669]" />
          <span className="text-sm font-mono text-[#334155]">
            {shortenAddress(publicKey.toBase58())}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-xs text-[#94A3B8] hover:text-[#E8315A] transition-colors
                     px-2 py-1.5 rounded-lg hover:bg-[#FFF0F3] font-medium"
          title="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={() => setVisible(true)}
        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        aria-label="Sign in to buy or sell tickets"
      >
        <PhantomIcon />
        Connect Wallet
      </button>
      {/* Tooltip */}
      <div className="absolute right-0 top-full mt-2 whitespace-nowrap bg-[#0F172A] text-white
                      text-xs font-medium px-3 py-1.5 rounded-lg pointer-events-none
                      opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
           style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
        Sign in to buy or sell tickets
        <div className="absolute -top-1 right-5 w-2 h-2 bg-[#0F172A] rotate-45" />
      </div>
    </div>
  );
}

function PhantomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <circle cx="64" cy="64" r="64" fill="#AB9FF2" />
      <path
        d="M110.584 64.9142H99.142C99.142 41.8335 80.9626 23.0625 58.5827 23.0625C36.4789 23.0625 18.4789 41.4665 18.0625 64.2529C17.6284 87.8937 37.4271 107.938 60.4668 107.938H64.6869C85.5871 107.938 110.584 89.5625 110.584 64.9142Z"
        fill="white"
      />
      <ellipse cx="79.2" cy="61.6" rx="5.6" ry="8" fill="#AB9FF2" />
      <ellipse cx="58.4" cy="61.6" rx="5.6" ry="8" fill="#AB9FF2" />
    </svg>
  );
}
