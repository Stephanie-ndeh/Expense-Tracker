-- Phase 2.5 (6/7): switch created_at from bigint epoch-ms to timestamptz.
-- Run this once in the Supabase SQL editor, after 006.
-- The old bigint columns are kept (renamed to created_at_ms) as a fallback, not dropped.

alter table public.wallets rename column created_at to created_at_ms;
alter table public.wallets add column created_at timestamptz not null default now();
update public.wallets set created_at = to_timestamp(created_at_ms / 1000.0);

alter table public.transactions rename column created_at to created_at_ms;
alter table public.transactions add column created_at timestamptz not null default now();
update public.transactions set created_at = to_timestamp(created_at_ms / 1000.0);
