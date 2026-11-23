-- Optional account backups are separate from the three playable browser saves.
create table public.soccer_career_account_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  slot smallint not null check (slot between 1 and 3),
  revision uuid not null default pg_catalog.gen_random_uuid(),
  save_text text not null check (pg_catalog.octet_length(save_text) between 1 and 2000000),
  saved_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (user_id, slot)
);

alter table public.soccer_career_account_saves enable row level security;

create policy "Signed-in owners manage their own career backups"
  on public.soccer_career_account_saves
  for all to authenticated
  using (
    (select auth.uid()) = user_id
    and (select auth.jwt()->>'is_anonymous') is distinct from 'true'
  )
  with check (
    (select auth.uid()) = user_id
    and (select auth.jwt()->>'is_anonymous') is distinct from 'true'
  );

-- The API grants data access explicitly. The privacy export only needs SELECT.
revoke all on table public.soccer_career_account_saves from public, anon, authenticated, service_role;
grant select on table public.soccer_career_account_saves to authenticated, service_role;
grant insert (user_id, slot, save_text), update (save_text), delete
  on table public.soccer_career_account_saves to authenticated;

-- Every update rotates the server revision, even if the supplied save is identical.
create function public.set_soccer_career_account_save_metadata()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.revision := pg_catalog.gen_random_uuid();
  new.saved_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke all on function public.set_soccer_career_account_save_metadata()
  from public, anon, authenticated, service_role;

create trigger set_soccer_career_account_save_metadata
  before update on public.soccer_career_account_saves
  for each row execute function public.set_soccer_career_account_save_metadata();
