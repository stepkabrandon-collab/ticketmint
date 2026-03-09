-- ============================================================
-- Ticket Mint — Supabase Postgres Schema
-- ============================================================
-- Run via: supabase db push  OR  paste into Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── users ────────────────────────────────────────────────────
-- Created automatically on first wallet connect.
-- wallet_address IS the identity — no passwords.
create table if not exists public.users (
  id                uuid primary key default uuid_generate_v4(),
  wallet_address    text not null unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── events ───────────────────────────────────────────────────
-- Seeded by admin seed script (seed.ts).
create table if not exists public.events (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  venue       text not null,
  city        text not null,
  event_date  timestamptz not null,
  image_url   text,
  description text,
  created_at  timestamptz not null default now()
);

-- ── tickets ──────────────────────────────────────────────────
-- Each row corresponds to one Metaplex NFT.
-- mint_address is the on-chain SPL mint pubkey (unique key).
create table if not exists public.tickets (
  id               uuid primary key default uuid_generate_v4(),
  event_id         uuid not null references public.events(id) on delete cascade,
  mint_address     text unique,                -- null until minted
  seller_wallet    text not null,              -- current seller (matches Anchor listing)
  owner_wallet     text,                       -- current NFT owner after purchase
  seat_section     text not null,
  seat_row         text not null,
  seat_number      text not null,
  price_lamports   bigint not null,
  original_price   bigint not null,            -- used for royalty basis
  listing_status   text not null default 'draft'
                     check (listing_status in ('draft','listed','sold','cancelled')),
  stripe_session_id text,                      -- Stripe Checkout session tracking
  stripe_payment_intent text,
  buyer_email      text,                       -- collected before Stripe checkout
  listed_at        timestamptz,
  sold_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── transfer_history ─────────────────────────────────────────
-- Mirrors on-chain transfers for fast UI rendering.
-- Solscan is the source of truth; this is a read cache.
create table if not exists public.transfer_history (
  id            uuid primary key default uuid_generate_v4(),
  ticket_id     uuid not null references public.tickets(id) on delete cascade,
  mint_address  text not null,
  from_wallet   text,
  to_wallet     text not null,
  tx_signature  text,                          -- Solana tx signature
  transfer_type text not null check (transfer_type in ('mint','list','buy','cancel','p2p')),
  price_lamports bigint,
  transferred_at timestamptz not null default now()
);

-- ── stripe_sessions ──────────────────────────────────────────
-- Tracks Stripe Checkout sessions so the webhook can be idempotent.
create table if not exists public.stripe_sessions (
  id                   uuid primary key default uuid_generate_v4(),
  stripe_session_id    text not null unique,
  ticket_id            uuid not null references public.tickets(id),
  buyer_wallet         text not null,
  buyer_email          text,                   -- collected in UI before Stripe redirect
  amount_usd_cents     bigint not null,
  status               text not null default 'pending'
                         check (status in ('pending','complete','expired','failed')),
  on_chain_tx          text,                   -- Solana tx sig after NFT transfer
  created_at           timestamptz not null default now(),
  completed_at         timestamptz
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_tickets_event_id       on public.tickets(event_id);
create index if not exists idx_tickets_seller_wallet  on public.tickets(seller_wallet);
create index if not exists idx_tickets_owner_wallet   on public.tickets(owner_wallet);
create index if not exists idx_tickets_listing_status on public.tickets(listing_status);
create index if not exists idx_tickets_mint_address   on public.tickets(mint_address);
create index if not exists idx_transfer_mint          on public.transfer_history(mint_address);
create index if not exists idx_stripe_session_id      on public.stripe_sessions(stripe_session_id);

-- ── updated_at trigger ───────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger tickets_updated_at
  before update on public.tickets
  for each row execute procedure public.handle_updated_at();

-- ── Row Level Security ───────────────────────────────────────
-- Auth strategy: anon key for reads, service role key for writes
-- from the Next.js backend (webhook, server actions).
-- Frontend only ever uses anon key.

alter table public.users          enable row level security;
alter table public.events         enable row level security;
alter table public.tickets        enable row level security;
alter table public.transfer_history enable row level security;
alter table public.stripe_sessions  enable row level security;

-- users: anyone can read; only service role can insert/update
create policy "users_select_all"
  on public.users for select using (true);

create policy "users_insert_service"
  on public.users for insert
  with check (auth.role() = 'service_role');

create policy "users_update_service"
  on public.users for update
  using (auth.role() = 'service_role');

-- events: public read-only
create policy "events_select_all"
  on public.events for select using (true);

create policy "events_insert_service"
  on public.events for insert
  with check (auth.role() = 'service_role');

-- tickets: public read; service role for all mutations
create policy "tickets_select_all"
  on public.tickets for select using (true);

create policy "tickets_insert_service"
  on public.tickets for insert
  with check (auth.role() = 'service_role');

create policy "tickets_update_service"
  on public.tickets for update
  using (auth.role() = 'service_role');

-- transfer_history: public read, service role writes
create policy "transfer_history_select_all"
  on public.transfer_history for select using (true);

create policy "transfer_history_insert_service"
  on public.transfer_history for insert
  with check (auth.role() = 'service_role');

-- stripe_sessions: service role only (sensitive payment data)
create policy "stripe_sessions_service_only"
  on public.stripe_sessions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ── Migrations ────────────────────────────────────────────────
-- Run these in the Supabase SQL editor if the tables already exist
-- (i.e. you ran the original schema before these columns were added).

alter table public.tickets
  add column if not exists buyer_email text;

alter table public.stripe_sessions
  add column if not exists buyer_email text;
