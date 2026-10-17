-- Phase 2.5 bugfix: 007 renamed created_at to created_at_ms but left it NOT NULL
-- with no default. New rows only populate the new timestamptz created_at column,
-- so every insert was failing a not-null constraint on the legacy column.
-- created_at_ms is just a fallback for pre-migration rows — safe to make nullable.

alter table public.wallets alter column created_at_ms drop not null;
alter table public.transactions alter column created_at_ms drop not null;
