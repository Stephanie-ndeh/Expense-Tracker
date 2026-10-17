-- Phase 6: "money you owe" — borrow/payback types, linked to the people table.
-- Run this once in the Supabase SQL editor.

alter table public.transactions drop constraint transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check (
    type in (
      'expense', 'income', 'lend', 'repay', 'save', 'withdraw',
      'transfer_out', 'transfer_in', 'borrow', 'payback'
    )
  );
