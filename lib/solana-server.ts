// ── lib/solana-server.ts — Server-side Solana helpers ─────────
// Runs ONLY on the server (API routes, server components).
// Uses the platform keypair from environment variables to sign
// on-chain transactions.  Never expose to the browser.

import {
  Connection,
  PublicKey,
  Keypair,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createUmi } from "@metaplex-foundation/umi";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as umiPublicKey } from "@metaplex-foundation/umi";

import IDL from "./idl/ticket_mint_marketplace.json";

// ── Config ────────────────────────────────────────────────────
const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_ENDPOINT ?? clusterApiUrl("devnet");

// Deferred so Next.js doesn't call new PublicKey() with placeholder
// strings at build time — only resolved when the functions are actually called.
function getProgramId(): PublicKey {
  return new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID ?? PublicKey.default.toBase58()
  );
}

function getPlatformFeeWallet(): PublicKey {
  return new PublicKey(
    process.env.NEXT_PUBLIC_PLATFORM_FEE_WALLET ?? PublicKey.default.toBase58()
  );
}

// ── Platform keypair ──────────────────────────────────────────
// Loaded from PLATFORM_KEYPAIR_SECRET env var.
// Format: JSON array of bytes (same as solana-keygen output).
// This wallet:
//   - Signs the on-chain buy_ticket transaction after Stripe payment
//   - Is the platform fee recipient
//   - Must have SOL to pay for transaction fees
function loadPlatformKeypair(): Keypair {
  const secret = process.env.PLATFORM_KEYPAIR_SECRET;
  if (!secret) {
    throw new Error("PLATFORM_KEYPAIR_SECRET environment variable is not set");
  }
  const secretKey = Uint8Array.from(JSON.parse(secret));
  return Keypair.fromSecretKey(secretKey);
}

function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}

// ── executeBuyTicket ──────────────────────────────────────────
// Called by the Stripe webhook to execute the on-chain NFT transfer.
//
// The platform keypair signs as the "buyer" (fee wallet) in this
// server-side flow.  The NFT is transferred from escrow → buyer wallet.
//
// In a production system you would have the buyer pre-authorize
// a transaction.  For this MVP the platform acts as the signing
// intermediary after fiat payment confirmation.

export async function executeBuyTicket(params: {
  mintAddress: string;
  buyerWallet: string;
  sellerWallet: string;
  ticketId: string;
}): Promise<string> {
  const { mintAddress, buyerWallet, sellerWallet } = params;

  const connection      = getConnection();
  const platformKeypair = loadPlatformKeypair();
  const PROGRAM_ID      = getProgramId();
  const PLATFORM_FEE_WALLET = getPlatformFeeWallet();
  const mint            = new PublicKey(mintAddress);
  const seller          = new PublicKey(sellerWallet);
  const buyer           = new PublicKey(buyerWallet);

  // Build a minimal wallet shim from the keypair — avoids importing
  // anchor.Wallet which pulls in @solana/wallet-adapter-wallets at build time.
  const wallet = {
    publicKey: platformKeypair.publicKey,
    signTransaction: async <T extends web3.Transaction | web3.VersionedTransaction>(tx: T): Promise<T> => {
      if (tx instanceof web3.Transaction) {
        tx.partialSign(platformKeypair);
      } else {
        (tx as web3.VersionedTransaction).sign([platformKeypair]);
      }
      return tx;
    },
    signAllTransactions: async <T extends web3.Transaction | web3.VersionedTransaction>(txs: T[]): Promise<T[]> => {
      for (const tx of txs) {
        if (tx instanceof web3.Transaction) {
          tx.partialSign(platformKeypair);
        } else {
          (tx as web3.VersionedTransaction).sign([platformKeypair]);
        }
      }
      return txs;
    },
  };
  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: "confirmed",
  });
  const program = new Program(IDL as any, provider);

  // Derive listing PDA
  const [listingPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), mint.toBuffer(), seller.toBuffer()],
    PROGRAM_ID
  );

  // Token accounts
  const escrowATA = getAssociatedTokenAddressSync(mint, listingPDA, true);
  const buyerATA  = getAssociatedTokenAddressSync(mint, buyer);

  // Fetch listing to get royalty_recipient
  const listingAccount = await (program.account as any).listingAccount.fetch(listingPDA);
  const royaltyRecipient = (listingAccount as any).royaltyRecipient as PublicKey;

  // Execute buy_ticket instruction
  // The platform keypair signs (it's paying the Solana tx fees)
  // The SOL distribution happens inside the Anchor instruction
  const txSig = await (program as any).methods
    .buyTicket()
    .accounts({
      buyer:              buyer,
      seller:             seller,
      platformFeeWallet:  PLATFORM_FEE_WALLET,
      royaltyRecipient:   royaltyRecipient,
      mint:               mint,
      listing:            listingPDA,
      escrowTokenAccount: escrowATA,
      buyerTokenAccount:  buyerATA,
      tokenProgram:       TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:      web3.SystemProgram.programId,
      rent:               web3.SYSVAR_RENT_PUBKEY,
    })
    .signers([platformKeypair])
    .rpc({ commitment: "confirmed" });

  return txSig;
}

// ── validateTicketOnChain ─────────────────────────────────────
// Used by the /validate/[mintAddress] page (server component).
// Returns on-chain NFT status without requiring a wallet.

export interface OnChainValidation {
  mintAddress: string;
  exists: boolean;
  supply: number;
  currentOwner: string | null;
  decimals: number;
}

export async function validateTicketOnChain(
  mintAddress: string
): Promise<OnChainValidation> {
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);

  // Fetch mint account info
  const mintInfo = await connection.getParsedAccountInfo(mint);

  if (!mintInfo.value) {
    return {
      mintAddress,
      exists: false,
      supply: 0,
      currentOwner: null,
      decimals: 0,
    };
  }

  const parsed = (mintInfo.value.data as any)?.parsed?.info;
  const supply  = parseInt(parsed?.supply ?? "0", 10);
  const decimals = parsed?.decimals ?? 0;

  // Find the current holder (the account that has the 1 token)
  let currentOwner: string | null = null;
  try {
    const tokenAccounts = await connection.getParsedProgramAccounts(
      new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: mint.toBase58() } },
        ],
      }
    );

    for (const account of tokenAccounts) {
      const info = (account.account.data as any)?.parsed?.info;
      if (info?.tokenAmount?.amount === "1") {
        currentOwner = info.owner;
        break;
      }
    }
  } catch (err) {
    console.warn("[validateTicketOnChain] Could not fetch token accounts:", err);
  }

  return {
    mintAddress,
    exists: true,
    supply,
    currentOwner,
    decimals,
  };
}
