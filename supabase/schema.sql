-- Big Steph (Ledger) — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists public.wallets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  wallet_id text not null,
  type text not null,
  amount numeric not null,
  date date not null,
  note text not null default '',
  label text not null default '',
  planned boolean not null default false,
  created_at bigint not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_updated_at_idx on public.transactions (updated_at);
create index if not exists wallets_user_id_idx on public.wallets (user_id);
create index if not exists wallets_updated_at_idx on public.wallets (updated_at);

alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id);
create policy "wallets_insert_own" on public.wallets
  for insert with check (auth.uid() = user_id);
create policy "wallets_update_own" on public.wallets
  for update using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id);

-- Keep updated_at current on every upsert so the client can pull "changed since last sync".
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger wallets_set_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
