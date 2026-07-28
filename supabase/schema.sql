-- Reckon — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- This drops and recreates both tables — intended for a fresh start, not a migration.

drop table if exists public.transactions cascade;
drop table if exists public.wallets cascade;

create table public.wallets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at bigint not null,
  updated_at timestamptz not null default now()
);
create unique index wallets_user_name_unique on public.wallets (user_id, lower(name));

create table public.transactions (
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
  updated_at timestamptz not null default now()
);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_wallet_id_idx on public.transactions (wallet_id);

alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
create policy "wallets_insert_own" on public.wallets for insert with check (auth.uid() = user_id);
create policy "wallets_delete_own" on public.wallets for delete using (auth.uid() = user_id);

create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
