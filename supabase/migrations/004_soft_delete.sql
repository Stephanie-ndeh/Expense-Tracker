-- Phase 2.5 (3/7): soft delete — transactions/wallets are marked deleted, not removed.
-- Run this once in the Supabase SQL editor, after 003.

alter table public.transactions add column deleted_at timestamptz;
alter table public.wallets add column deleted_at timestamptz;

-- The old unique index didn't account for soft-deleted rows — a deleted wallet's name
-- would permanently block reusing that name. Rebuild it to only cover live wallets.
-- (This drops and recreates an INDEX, not any data — no rows are touched.)
drop index if exists public.wallets_user_name_unique;
create unique index wallets_user_name_unique on public.wallets (user_id, lower(name)) where deleted_at is null;
