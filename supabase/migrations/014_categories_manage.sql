-- Phase C3: hide/rename/merge categories from Me -> Categories.

alter table public.categories add column if not exists hidden boolean not null default false;

-- Atomically moves every transaction off the source category onto the target, then removes the source.
-- A single function body is one implicit transaction, so a failure on either statement rolls back both —
-- nothing can end up half-merged. Scoped to auth.uid() on both sides so a guessed id from another user's
-- account can't be touched.
create or replace function public.merge_categories(source_id text, target_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if source_id = target_id then
    raise exception 'Cannot merge a category into itself';
  end if;
  if not exists (select 1 from categories where id = source_id and user_id = v_user_id) then
    raise exception 'Source category not found';
  end if;
  if not exists (select 1 from categories where id = target_id and user_id = v_user_id) then
    raise exception 'Target category not found';
  end if;

  update transactions set category_id = target_id where category_id = source_id and user_id = v_user_id;
  delete from categories where id = source_id and user_id = v_user_id;
end;
$$;

grant execute on function public.merge_categories(text, text) to authenticated;
