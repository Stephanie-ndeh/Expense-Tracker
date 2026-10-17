-- Phase 2.5 (2/7): categories & people tables, backfilled from existing transaction labels.
-- Run this once in the Supabase SQL editor, after 002.
--
-- Case-insensitive duplicate labels are merged into one category/person row
-- (the alphabetically-earliest spelling wins as the canonical name).
-- The existing `label` column on transactions is left untouched as a fallback.

create table public.categories (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  created_at timestamptz not null default now()
);
create unique index categories_user_kind_name_unique on public.categories (user_id, kind, lower(name));
alter table public.categories enable row level security;
create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories for delete using (auth.uid() = user_id);

create table public.people (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);
create unique index people_user_name_unique on public.people (user_id, lower(name));
alter table public.people enable row level security;
create policy "people_select_own" on public.people for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "people_delete_own" on public.people for delete using (auth.uid() = user_id);

alter table public.transactions add column category_id text references public.categories (id) on delete set null;
alter table public.transactions add column person_id text references public.people (id) on delete set null;

-- Backfill categories from distinct expense/income labels.
insert into public.categories (id, user_id, name, kind)
select gen_random_uuid()::text, user_id, min(label), kind
from (
  select user_id, label, type as kind
  from public.transactions
  where type in ('expense', 'income') and btrim(label) <> ''
) t
group by user_id, kind, lower(label);

update public.transactions t
set category_id = c.id
from public.categories c
where t.category_id is null
  and t.type in ('expense', 'income')
  and t.user_id = c.user_id
  and c.kind = t.type
  and lower(t.label) = lower(c.name);

-- Backfill people from distinct lend/repay labels.
insert into public.people (id, user_id, name)
select gen_random_uuid()::text, user_id, min(label)
from (
  select user_id, label
  from public.transactions
  where type in ('lend', 'repay') and btrim(label) <> ''
) t
group by user_id, lower(label);

update public.transactions t
set person_id = p.id
from public.people p
where t.person_id is null
  and t.type in ('lend', 'repay')
  and t.user_id = p.user_id
  and lower(t.label) = lower(p.name);
