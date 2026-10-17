-- Phase 2.5 (4/7): referential integrity + one-default-wallet guarantee.
-- Run this once in the Supabase SQL editor, after 004.
--
-- If the foreign key below fails, first run this to find orphaned rows:
--   select t.id, t.wallet_id, t.user_id from public.transactions t
--   left join public.wallets w on w.id = t.wallet_id and w.user_id = t.user_id
--   where w.id is null;

alter table public.wallets add constraint wallets_id_user_unique unique (id, user_id);

alter table public.transactions
  add constraint transactions_wallet_user_fkey
  foreign key (wallet_id, user_id) references public.wallets (id, user_id);

alter table public.transactions
  add constraint transactions_type_check
  check (type in ('expense', 'income', 'lend', 'repay', 'save', 'withdraw'));

create unique index wallets_one_default_per_user
  on public.wallets (user_id)
  where is_default = true and deleted_at is null;
