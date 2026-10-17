-- Phase 2: allow renaming wallets.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create policy "wallets_update_own" on public.wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
