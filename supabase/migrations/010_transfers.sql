-- Phase 5: transfers between wallets, stored as a linked pair sharing transfer_id.
-- Run this once in the Supabase SQL editor.

alter table public.transactions add column transfer_id text;
create index transactions_transfer_id_idx on public.transactions (transfer_id) where transfer_id is not null;

alter table public.transactions drop constraint transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (type in ('expense', 'income', 'lend', 'repay', 'save', 'withdraw', 'transfer_out', 'transfer_in'));

alter table public.transactions add constraint transactions_transfer_id_consistency
  check ((type in ('transfer_out', 'transfer_in')) = (transfer_id is not null));
