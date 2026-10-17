-- Phase 7: recurring entries.
-- Run this once in the Supabase SQL editor.

create table public.recurring_rules (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  wallet_id text not null,
  type text not null check (type in ('expense', 'income', 'lend', 'repay', 'save', 'withdraw', 'borrow', 'payback')),
  amount numeric not null check (amount > 0),
  note text not null default '',
  label text not null default '',
  category_id text references public.categories (id) on delete set null,
  person_id text references public.people (id) on delete set null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  start_date date not null,
  end_date date,
  last_generated_date date,
  paused boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (wallet_id, user_id) references public.wallets (id, user_id),
  check (end_date is null or end_date >= start_date)
);

create index recurring_rules_user_id_idx on public.recurring_rules (user_id);

alter table public.recurring_rules enable row level security;

create policy "recurring_rules_select_own" on public.recurring_rules for select using (auth.uid() = user_id);
create policy "recurring_rules_insert_own" on public.recurring_rules for insert with check (auth.uid() = user_id);
create policy "recurring_rules_update_own" on public.recurring_rules for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_rules_delete_own" on public.recurring_rules for delete using (auth.uid() = user_id);

create trigger recurring_rules_set_updated_at before update on public.recurring_rules
  for each row execute function public.set_updated_at();
