-- Phase 8: money to-do list.
-- Run this once in the Supabase SQL editor.

create table public.todos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  amount numeric check (amount is null or amount > 0),
  type text check (type is null or type in ('expense', 'income', 'lend', 'repay', 'save', 'withdraw', 'borrow', 'payback')),
  due_date date,
  wallet_id text,
  done boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (wallet_id, user_id) references public.wallets (id, user_id)
);

create index todos_user_id_idx on public.todos (user_id);

alter table public.todos enable row level security;

create policy "todos_select_own" on public.todos for select using (auth.uid() = user_id);
create policy "todos_insert_own" on public.todos for insert with check (auth.uid() = user_id);
create policy "todos_update_own" on public.todos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "todos_delete_own" on public.todos for delete using (auth.uid() = user_id);

create trigger todos_set_updated_at before update on public.todos
  for each row execute function public.set_updated_at();
