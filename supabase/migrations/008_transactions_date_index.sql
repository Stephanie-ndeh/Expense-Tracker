-- Phase 2.5 (7/7): composite index for date-range queries.
-- Run this once in the Supabase SQL editor, after 007.

create index transactions_user_date_idx on public.transactions (user_id, date);
