-- gen_random_uuid() below needs pgcrypto — enabled by default on Supabase projects,
-- but declared here explicitly so this migration doesn't depend on that silently.
create extension if not exists pgcrypto;

-- Hard-deletes everything the user has logged (transactions, todos, people, categories,
-- and any non-default wallets), then re-seeds the default category set — a full account
-- reset, not a soft delete. Scoped entirely to auth.uid(); no parameters, so there's
-- nothing a caller could pass to target another user's data.
--
-- Deletion order respects FKs: transactions/todos (reference wallets) go first, then
-- people/categories (transactions.person_id/category_id are "on delete set null", so
-- order between those two and transactions doesn't actually matter, but this keeps the
-- dependency direction obvious), then non-default wallets last.
--
-- There is deliberately no recurring_rules cleanup here yet — that table doesn't exist
-- on this branch (Phase 7 is still unmerged); add it to this function in a follow-up
-- migration once that branch lands.
create or replace function public.clear_all_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from transactions where user_id = v_user_id;
  delete from todos where user_id = v_user_id;
  delete from people where user_id = v_user_id;
  delete from categories where user_id = v_user_id;
  delete from wallets where user_id = v_user_id and is_default = false;

  insert into categories (id, user_id, name, kind, hidden)
  select gen_random_uuid()::text, v_user_id, name, 'expense', false
  from unnest(array[
    'Food', 'Transport', 'Bills', 'Airtime/Data', 'Shopping', 'Health',
    'Personal care', 'Household', 'Fitness', 'Family', 'Church/Giving', 'Other'
  ]) as name;

  insert into categories (id, user_id, name, kind, hidden)
  select gen_random_uuid()::text, v_user_id, name, 'income', false
  from unnest(array['Salary', 'Business', 'Gift', 'Other']) as name;
end;
$$;

grant execute on function public.clear_all_data() to authenticated;
