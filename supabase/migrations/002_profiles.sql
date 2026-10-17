-- Phase 2.5 (1/7): profiles table — currency moves from localStorage into Supabase.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- Your current currency label lives in this browser's localStorage, which SQL can't read.
-- After running this, the app will create your profile defaulting to 'FCFA' the next time
-- you load it — just re-type your real currency once in Settings afterward.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'FCFA',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
