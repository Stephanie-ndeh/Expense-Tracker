-- Reckon — Supabase schema
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- This drops and recreates every table — intended for a fresh start, not a migration.
-- For an existing database, run the files in supabase/migrations/ instead, in order.

drop table if exists public.transactions cascade;
drop table if exists public.categories cascade;
drop table if exists public.people cascade;
drop table if exists public.wallets cascade;
drop table if exists public.profiles cascade;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'FCFA',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index wallets_user_name_unique on public.wallets (user_id, lower(name)) where deleted_at is null;
create unique index wallets_one_default_per_user on public.wallets (user_id) where is_default = true and deleted_at is null;

create table public.categories (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  created_at timestamptz not null default now()
);
create unique index categories_user_kind_name_unique on public.categories (user_id, kind, lower(name));

create table public.people (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create unique index people_user_name_unique on public.people (user_id, lower(name));

create table public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  wallet_id text not null,
  type text not null check (
    type in ('expense', 'income', 'lend', 'repay', 'save', 'withdraw', 'transfer_out', 'transfer_in')
  ),
  amount numeric not null check (amount > 0),
  date date not null,
  note text not null default '',
  label text not null default '',
  category_id text references public.categories (id) on delete set null,
  person_id text references public.people (id) on delete set null,
  transfer_id text,
  planned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (wallet_id, user_id) references public.wallets (id, user_id),
  check ((type in ('transfer_out', 'transfer_in')) = (transfer_id is not null))
);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_wallet_id_idx on public.transactions (wallet_id);
create index transactions_user_date_idx on public.transactions (user_id, date);
create index transactions_transfer_id_idx on public.transactions (transfer_id) where transfer_id is not null;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.people enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
create policy "wallets_insert_own" on public.wallets for insert with check (auth.uid() = user_id);
create policy "wallets_update_own" on public.wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wallets_delete_own" on public.wallets for delete using (auth.uid() = user_id);

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

create policy "people_select_own" on public.people for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "people_delete_own" on public.people for delete using (auth.uid() = user_id);

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

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
