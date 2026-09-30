-- The production objects economy step E3 (Round 677) touches beyond
-- scripts/data/economySchema.sql, as a snapshot scripts/simEconomyMigrations.mjs
-- loads into PGlite after that file, for the E3 sections only.
--
-- READ ONLY FROM PRODUCTION on 2026-09-30 (Postgres 17.6), with SELECTs through
-- the Supabase MCP and nothing else: pg_attribute and pg_attrdef for the
-- columns and defaults of public.profiles, pg_constraint and pg_indexes,
-- pg_policies, pg_class.relacl, pg_trigger (none on profiles), and
-- pg_default_acl for the privileges a new object in public gets.
--
-- WHY E3 NEEDS IT.
--   * public.name_is_owned reads profiles (display_name, username, user_id),
--     and the door names an account's board row from it. Production had 870
--     profiles, 23 with a display name, 24 with a username, 41 distinct names
--     case folded, and no name shared by two accounts. The longest display
--     name was 12 characters, the longest username 16.
--   * The default privileges are why E3 revokes explicitly: on production a
--     table the migration role (postgres) creates in public gets every
--     privilege for anon and authenticated, and a function gets EXECUTE for
--     PUBLIC, anon and authenticated. A rehearsal without them would prove a
--     grant E3 never has to take away.
--
-- WHAT IS NOT PRODUCTION, on purpose:
--   * profiles carries no foreign key to auth.users(id) (on delete cascade on
--     production): auth.users is not in the snapshot. Nothing in E3 reads it.
--   * no row. The harness inserts its own test profiles.
--   * the supabase_admin default privileges are left out: migrations run as
--     postgres, so only postgres's apply to what E3 creates.

-- ---------------------------------------------------------------------------
-- public.profiles, columns, constraints, grants and policies as read
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  username text,
  display_name text,
  avatar_url text,
  streak_state jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_user_id_key unique (user_id),
  constraint profiles_username_key unique (username)
);
grant all on table public.profiles to anon, authenticated, service_role;
alter table public.profiles enable row level security;
create policy "Public read profiles" on public.profiles for select to public using (true);
create policy "Users manage own profile" on public.profiles for all to public
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- the default privileges postgres's new objects in public get on production
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to anon, authenticated, service_role;
