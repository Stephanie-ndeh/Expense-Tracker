-- Phase 2.5 (5/7): enforce amount > 0.
-- Run this once in the Supabase SQL editor, after 005.
--
-- Run this first to check for violators — if it returns any rows, fix or soft-delete
-- them before running the ALTER below, or the ALTER will fail:
--   select id, user_id, type, amount from public.transactions where amount <= 0;

alter table public.transactions add constraint transactions_amount_positive check (amount > 0);
