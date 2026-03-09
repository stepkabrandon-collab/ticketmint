# Ticket Mint 🎟️

> **Secondary ticket marketplace where every ticket is a Solana NFT.**
> Verifiable ownership · Instant transfers · Enforced royalties · Zero double-selling

Built with: Next.js 14 · Anchor 0.30 · Metaplex UMI · Supabase · Stripe · Phantom

---

## Architecture Overview

```
Browser (Phantom Wallet)
    │
    ├── Next.js App Router (client + server components)
    │       ├── Marketplace pages (server-rendered, Supabase reads)
    │       ├── List Ticket page  (client: UMI mint + Anchor list)
    │       ├── My Tickets page   (client: UMI fetch, Anchor resell)
    │       └── Validate page     (server: on-chain verification)
    │
    ├── Supabase Postgres (off-chain data, fast reads)
    │       ├── events, tickets, transfer_history
    │       └── stripe_sessions (idempotent payment tracking)
    │
    ├── Stripe Checkout (fiat on-ramp)
    │       └── Webhook → API route → Anchor buy_ticket on-chain
    │
    └── Solana Devnet
            ├── Anchor Program: list_ticket / buy_ticket / cancel_listing
            ├── Metaplex NFTs: mint → metadata PDA → master edition
            └── PDA Escrow: holds NFT during listing
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18+ | https://nodejs.org |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | 1.18+ | `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"` |
| Anchor CLI | 0.30.1 | `cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install 0.30.1 && avm use 0.30.1` |
| Phantom Wallet | latest | https://phantom.app |

---

## Setup Steps

### 1. Clone & Install

```bash
git clone https://github.com/your-org/ticket-mint.git
cd ticket-mint
npm install
```

Install Node.js polyfills for wallet adapter:

```bash
npm install crypto-browserify stream-browserify stream-http https-browserify browserify-zlib path-browserify
```

---

### 2. Configure Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `supabase/schema.sql`
3. Copy your credentials from **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

---

### 3. Fund Your Devnet Wallet

```bash
# Generate a new wallet (or use existing ~/.config/solana/id.json)
solana-keygen new --outfile ~/.config/solana/id.json

# Set cluster to devnet
solana config set --url devnet

# Check your address
solana address

# Airdrop SOL (do this multiple times if needed — 2 SOL per call)
solana airdrop 2
solana airdrop 2
solana airdrop 2

# Verify balance
solana balance
```

---

### 4. Build & Deploy the Anchor Program

```bash
# Build the Rust program
anchor build

# This prints your program ID — copy it!
# You'll see: "ticket_mint_marketplace" has been updated.

# Update the program ID in THREE places:
# 1. declare_id!() in programs/ticket-mint-marketplace/src/lib.rs
# 2. [programs.devnet] in Anchor.toml
# 3. NEXT_PUBLIC_PROGRAM_ID in .env.local

# Deploy to devnet
anchor deploy

# Verify deployment
solana program show <YOUR_PROGRAM_ID> --url devnet
```

After deploying, regenerate the IDL:

```bash
anchor build  # re-run to update target/idl/
cp target/idl/ticket_mint_marketplace.json lib/idl/
```

---

### 5. Generate Platform Keypair

The platform keypair signs on-chain transactions after Stripe webhooks:

```bash
# Generate
solana-keygen new --outfile platform-keypair.json

# Fund it on devnet
solana airdrop 2 $(solana-keygen pubkey platform-keypair.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey platform-keypair.json) --url devnet

# Get the secret key array for .env.local
cat platform-keypair.json
# Copy the JSON array → PLATFORM_KEYPAIR_SECRET

# Get the public key → NEXT_PUBLIC_PLATFORM_FEE_WALLET
solana-keygen pubkey platform-keypair.json
```

**Update `programs/ticket-mint-marketplace/src/lib.rs`:**

```rust
pub mod platform {
    use anchor_lang::prelude::*;
    declare_id!("YOUR_PLATFORM_FEE_WALLET_ADDRESS_HERE");
}
```

Then rebuild and redeploy the program.

---

### 6. Configure Stripe (Test Mode)

1. Create account at [stripe.com](https://stripe.com)
2. Go to **Developers → API Keys**
3. Copy:
   - **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`
   - **Publishable key** (`pk_test_...`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Set up the webhook:**

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret (whsec_...) → STRIPE_WEBHOOK_SECRET
```

---

### 7. Configure Environment

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=<your-deployed-program-id>
NEXT_PUBLIC_PLATFORM_FEE_WALLET=<platform-keypair-pubkey>
PLATFORM_KEYPAIR_SECRET=[1,2,3,...]
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

### 8. Seed Sample Data

```bash
npm run seed
```

This creates 5 events (Taylor Swift, NFL, NBA, Coachella, UFC) with
6 demo ticket listings each in Supabase.

---

### 9. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Setting Up Phantom for Devnet

1. Open Phantom browser extension
2. Click the **gear icon** (Settings)
3. Go to **Developer Settings → Change Network**
4. Select **Devnet**
5. Your wallet now uses devnet SOL

To get devnet SOL in Phantom:
- Visit [faucet.solana.com](https://faucet.solana.com) and paste your address
- Or: `solana airdrop 2 <YOUR_PHANTOM_ADDRESS> --url devnet`

---

## User Flows

### Listing a Ticket
1. Connect Phantom (devnet)
2. Navigate to **/list-ticket**
3. Select event, enter seat details + price
4. **Approve Transaction 1** in Phantom → Mint NFT via Metaplex UMI
5. **Approve Transaction 2** in Phantom → List on Anchor marketplace (transfers NFT to escrow PDA)
6. Ticket appears on homepage marketplace

### Buying a Ticket
1. Connect Phantom
2. Find a ticket on the marketplace
3. Click **Buy Now** → redirected to Stripe Checkout
4. Pay with test card: `4242 4242 4242 4242` (any exp/CVC)
5. Stripe webhook fires → Anchor `buy_ticket` executes:
   - Seller receives 95% of price
   - Platform receives 2.5%
   - Royalty recipient receives 2.5%
   - NFT transferred from escrow → buyer wallet
6. Ticket appears in buyer's **/my-tickets**

### Reselling a Ticket
1. Connect Phantom (as ticket owner)
2. Go to **/my-tickets** — NFTs fetched via Metaplex UMI
3. Click **Resell** → enter new price
4. **Approve transaction** → calls `list_ticket` again
5. Ticket is live on marketplace for next buyer

### Validating at the Door
1. Buyer opens **/my-tickets** → clicks **Show QR**
2. Venue staff scans QR code
3. Opens **/validate/[mintAddress]**
4. Server verifies on-chain: NFT exists, supply = 1, owner matches
5. Shows **VALID** ✓ or **TRANSFERRED** / **INVALID**

---

## Viewing Tickets on Solscan

Every NFT has a Solscan link. From any ticket detail page, click the mint address link:

```
https://solscan.io/token/<MINT_ADDRESS>?cluster=devnet
```

This shows:
- Full transfer history
- Current holder
- Metadata (name, attributes)
- On-chain program interaction logs

---

## Switching to Helius RPC (Production)

Helius provides much higher rate limits and DAS (Digital Asset Standard) support,
which makes `fetchAllDigitalAssetByOwner` significantly faster.

1. Get an API key at [helius.dev](https://www.helius.dev)
2. Update `.env.local`:

```env
NEXT_PUBLIC_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
```

3. Update `Anchor.toml`:

```toml
[provider]
cluster = "mainnet"
wallet = "~/.config/solana/id.json"
```

4. Deploy program to mainnet: `anchor deploy --provider.cluster mainnet`
5. Update all program IDs + redeploy

---

## Vercel + Supabase Production Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

In the Vercel dashboard, add all environment variables from `.env.local`.

**Important:** For the Stripe webhook in production, create a new webhook
endpoint in the Stripe Dashboard pointing to:
```
https://your-domain.vercel.app/api/stripe/webhook
```

### Supabase Production Checklist

- [ ] Enable **Row Level Security** on all tables (already in schema.sql)
- [ ] Set up **Point-in-Time Recovery** (paid plans)
- [ ] Add your Vercel domain to **Authentication → URL Configuration**
- [ ] Review **Database → Performance** for slow queries after launch
- [ ] Consider enabling **Supabase Edge Functions** for webhook processing

### Custom Domain

```bash
vercel domains add yourdomain.com
```

Update `NEXT_PUBLIC_APP_URL` and the Stripe webhook URL.

---

## Project Structure

```
ticket-mint/
├── Anchor.toml                          # Anchor workspace config
├── programs/
│   └── ticket-mint-marketplace/
│       ├── Cargo.toml
│       └── src/lib.rs                   # Anchor program (list/buy/cancel)
├── supabase/
│   └── schema.sql                       # Full Postgres schema + RLS
├── app/
│   ├── globals.css                      # Brand design tokens
│   ├── layout.tsx                       # Root layout + Nav + Wallet
│   ├── page.tsx                         # Marketplace homepage
│   ├── marketplace/[id]/page.tsx        # Ticket detail + Buy
│   ├── my-tickets/page.tsx              # Owned NFTs
│   ├── list-ticket/page.tsx             # Mint + list flow
│   ├── validate/[mintAddress]/page.tsx  # QR validation
│   └── api/
│       └── stripe/
│           ├── checkout/route.ts        # Create Stripe session
│           └── webhook/route.ts         # Handle payment → NFT transfer
├── components/
│   ├── WalletProviders.tsx              # Solana wallet adapter context
│   ├── WalletButton.tsx                 # Connect/disconnect UI
│   ├── TicketCard.tsx                   # Marketplace grid card
│   ├── SearchFilters.tsx                # Filter UI (client)
│   ├── QRTicket.tsx                     # QR code generator
│   ├── BuyTicketButton.tsx              # Initiates Stripe checkout
│   └── ResellModal.tsx                  # Re-list owned ticket
├── lib/
│   ├── supabase.ts                      # Supabase clients (anon + service)
│   ├── solana.ts                        # Client: UMI mint, Anchor calls
│   ├── solana-server.ts                 # Server: webhook buyer execution
│   ├── stripe.ts                        # Stripe client singleton
│   ├── utils.ts                         # lamports↔SOL, address format
│   └── idl/
│       └── ticket_mint_marketplace.json # Anchor program IDL
├── zustand/
│   └── store.ts                         # Global state (user, filters)
├── seed.ts                              # Admin seed: 5 events + tickets
├── .env.example                         # Copy to .env.local
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── tsconfig.json
```

---

## On-Chain Program Details

### Instructions

| Instruction | Signer | Action |
|-------------|--------|--------|
| `list_ticket(price, royalty)` | Seller | NFT → escrow PDA. Creates ListingAccount. |
| `buy_ticket()` | Buyer (or platform server) | SOL splits: 95% seller / 2.5% platform / 2.5% royalty. NFT → buyer. Closes listing. |
| `cancel_listing()` | Seller | NFT → seller back. Closes listing. |

### PDA Seeds

```
listing PDA:     ["listing", mint_pubkey, seller_pubkey]
escrow ATA:      Associated token account of listing PDA for the mint
```

### Fee Structure

| Recipient | Basis Points | % |
|-----------|-------------|---|
| Seller | 9,500 bps | 95% |
| Platform | 250 bps | 2.5% |
| Royalty | 250 bps | 2.5% |

---

## Test Card Numbers (Stripe)

| Card | Result |
|------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0025 0000 3155 | 3D Secure auth required |

Use any future expiry and any 3-digit CVC.

---

## Troubleshooting

**"Transaction simulation failed"**
- Ensure your wallet and program are both on devnet
- Check that your wallet has enough SOL: `solana balance`
- Airdrop more: `solana airdrop 2`

**"Program not found"**
- Deploy the Anchor program first: `anchor deploy`
- Update `NEXT_PUBLIC_PROGRAM_ID` in `.env.local`

**"Missing SUPABASE_SERVICE_ROLE_KEY"**
- The service role key is required for server-side writes
- Copy from: Supabase Dashboard → Project Settings → API → service_role

**Stripe webhook not receiving events**
- Ensure `stripe listen` CLI is running in a separate terminal
- Check the webhook secret matches `STRIPE_WEBHOOK_SECRET`

**NFTs not appearing in My Tickets**
- Standard devnet RPC doesn't support DAS; use Helius devnet endpoint
- Helius devnet: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`

**Metaplex UMI `walletAdapterIdentity` error**
- Ensure `@solana/wallet-adapter-react-ui/styles.css` is imported in layout
- The WalletProviders component must wrap all client components

---

## License

MIT — build freely, ship boldly.
