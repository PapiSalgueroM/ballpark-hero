\set ON_ERROR_STOP on
-- Run only in a fresh, disposable CI database. Every fixture is fictional.
begin;
do $$ begin
  if current_database() <> 'account_privacy_test' then
    raise exception 'Refusing privacy fixtures outside account_privacy_test';
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists(select 1 from pg_roles where rolname='supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;
create schema auth;
create schema storage;
create table auth.users (id uuid primary key);
create table auth.mfa_factors (id uuid primary key, user_id uuid references auth.users(id) on delete cascade, status text);
grant usage on schema auth to supabase_auth_admin;
grant select, delete on auth.users to supabase_auth_admin;
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
create table storage.objects (id uuid, bucket_id text, name text, owner uuid, owner_id text);
create table storage.buckets (id text, name text, owner uuid, owner_id text);
create table public.bootroom_event_log (
  event_log_id uuid,
  save_id uuid,
  event_id text,
  year integer,
  week integer,
  choice_taken text
);
create table public.bootroom_facilities (
  save_id uuid,
  training_level integer,
  medical_level integer,
  commercial_level integer,
  scout_infra_level integer,
  scout_depth integer,
  scout_reach integer,
  scout_speed integer,
  upgrade_in_progress text,
  upgrade_completes_year integer
);
create table public.bootroom_match (
  match_id uuid,
  save_id uuid,
  year integer,
  week integer,
  opponent text,
  is_home boolean,
  goals_for integer,
  goals_against integer,
  scorers jsonb,
  assists jsonb
);
create table public.bootroom_save (
  save_id uuid primary key,
  user_id uuid,
  club text,
  start_year integer,
  current_year integer,
  current_week integer,
  seed bigint,
  cash_usd bigint,
  board_standing numeric,
  player_trust numeric,
  market_rep numeric,
  heat integer,
  integrity_flags integer,
  status text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
create table public.bootroom_save_player (
  save_id uuid,
  player_name text,
  position text,
  age integer,
  nationality text,
  current_value_usd integer,
  wage_usd integer,
  is_anchor boolean,
  squad_number integer,
  is_starter boolean,
  form numeric,
  morale numeric,
  fitness numeric,
  injured_until_week integer,
  acquired_year integer,
  acquired_fee_usd integer
);
create table public.bootroom_scout_report (
  report_id uuid,
  save_id uuid,
  player_name text,
  scouted_year integer,
  scout_depth integer,
  projected_delta numeric,
  band_low numeric,
  band_high numeric,
  verdict_text text,
  ambiguous boolean,
  noise_seed bigint,
  created_week integer,
  created_at timestamp with time zone
);
create table public.bootroom_transfer_log (
  transfer_id uuid,
  save_id uuid,
  player_name text,
  direction text,
  fee_usd integer,
  year integer,
  player_age integer,
  value_at_time integer,
  had_scout_report boolean,
  scout_verdict text,
  created_at timestamp with time zone
);
create table public.daily_badges (
  id uuid,
  user_id uuid,
  date date,
  streak_days integer,
  created_at timestamp with time zone
);
create table public.daily_completions (
  id uuid,
  user_id uuid,
  game_slug text,
  date date,
  created_at timestamp with time zone
);
create table public.fantasy_draft_votes (
  id uuid,
  voted_team text,
  user_id uuid,
  created_at timestamp with time zone
);
create table public.overrated_votes (
  id uuid,
  player_name text,
  year integer,
  vote text,
  user_id uuid,
  created_at timestamp with time zone
);
create table public.profiles (
  id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  streak_state jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
create table public.saved_brackets (
  id text,
  user_id uuid,
  bracket_data jsonb,
  created_at timestamp with time zone
);
create table public.tier_list_votes (
  id uuid,
  player_name text,
  year integer,
  tier text,
  user_id uuid,
  created_at timestamp with time zone
);
create table public.transfer_grade_votes (
  id uuid,
  player_name text,
  move_year integer,
  to_club text,
  grade text,
  user_id uuid,
  created_at timestamp with time zone
);
create table public.user_best_scores (
  id uuid,
  user_id uuid,
  game_type text,
  best_score integer,
  achieved_at timestamp with time zone,
  created_at timestamp with time zone
);
create table public.user_game_scores (
  id uuid,
  user_id uuid,
  game_type text,
  score integer,
  correct_answers integer,
  puzzle_date date,
  created_at timestamp with time zone
);
create table public.user_preferences (
  id uuid,
  user_id uuid,
  favourite_game text,
  favourite_team text,
  favourite_player text,
  time_spent_minutes integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
create table public.user_roles (
  id uuid,
  user_id uuid,
  role text
);
create table public.user_scores (
  id uuid,
  user_id uuid,
  total_points integer,
  games_played_today integer,
  current_streak integer,
  longest_streak integer,
  last_played_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_at timestamp with time zone
);
create table public.user_scores_bak_20260919 (
  id uuid,
  user_id uuid,
  total_points integer,
  games_played_today integer,
  current_streak integer,
  longest_streak integer,
  last_played_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_at timestamp with time zone
);

-- These ten cascades already exist in the observed production catalog.
alter table public.bootroom_save add foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.profiles add foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.user_preferences add foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.user_roles add foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.bootroom_event_log add foreign key (save_id) references public.bootroom_save(save_id) on delete cascade;
alter table public.bootroom_facilities add foreign key (save_id) references public.bootroom_save(save_id) on delete cascade;
alter table public.bootroom_match add foreign key (save_id) references public.bootroom_save(save_id) on delete cascade;
alter table public.bootroom_save_player add foreign key (save_id) references public.bootroom_save(save_id) on delete cascade;
alter table public.bootroom_scout_report add foreign key (save_id) references public.bootroom_save(save_id) on delete cascade;
alter table public.bootroom_transfer_log add foreign key (save_id) references public.bootroom_save(save_id) on delete cascade;

insert into auth.users values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.bootroom_save(save_id,user_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
insert into public.daily_badges(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.daily_completions(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.fantasy_draft_votes(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.overrated_votes(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.profiles(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.saved_brackets(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.tier_list_votes(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.transfer_grade_votes(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.user_best_scores(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.user_game_scores(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.user_preferences(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.user_roles(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.user_scores(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.user_scores_bak_20260919(id,user_id) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222');
insert into public.bootroom_event_log(save_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.bootroom_facilities(save_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.bootroom_match(save_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.bootroom_save_player(save_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.bootroom_scout_report(save_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.bootroom_transfer_log(save_id) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

-- Preserve a pre-migration orphan, and preserve duplicate backup rows in export.
insert into public.user_scores_bak_20260919(id,user_id) values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','99999999-9999-4999-8999-999999999999'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111');
insert into public.overrated_votes(user_id) values (null);
insert into public.tier_list_votes(user_id) values (null);
insert into public.transfer_grade_votes(user_id) values (null);
grant select on all tables in schema public, storage to service_role;
grant insert on public.overrated_votes, public.tier_list_votes, public.transfer_grade_votes to service_role;
grant select, insert, update on all tables in schema public to anon, authenticated;
alter table public.bootroom_save enable row level security;
create policy own_account on public.bootroom_save to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.daily_badges enable row level security;
create policy own_account on public.daily_badges to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.daily_completions enable row level security;
create policy own_account on public.daily_completions to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.fantasy_draft_votes enable row level security;
create policy own_account on public.fantasy_draft_votes to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.overrated_votes enable row level security;
create policy own_account on public.overrated_votes to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.profiles enable row level security;
create policy own_account on public.profiles to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.saved_brackets enable row level security;
create policy own_account on public.saved_brackets to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.tier_list_votes enable row level security;
create policy own_account on public.tier_list_votes to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.transfer_grade_votes enable row level security;
create policy own_account on public.transfer_grade_votes to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.user_best_scores enable row level security;
create policy own_account on public.user_best_scores to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.user_game_scores enable row level security;
create policy own_account on public.user_game_scores to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.user_preferences enable row level security;
create policy own_account on public.user_preferences to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.user_roles enable row level security;
create policy own_account on public.user_roles to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.user_scores enable row level security;
create policy own_account on public.user_scores to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.user_scores_bak_20260919 enable row level security;
create policy own_account on public.user_scores_bak_20260919 to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Match the three current permissive INSERT policies before applying the fix.
drop policy own_account on public.overrated_votes;
drop policy own_account on public.tier_list_votes;
drop policy own_account on public.transfer_grade_votes;
create policy vote_insert on public.overrated_votes for insert to anon,authenticated with check (true);
create policy vote_insert on public.tier_list_votes for insert to anon,authenticated with check (true);
create policy vote_insert on public.transfer_grade_votes for insert to anon,authenticated with check (true);

\if :{?PRIVACY_MIGRATION_FILE}
\i :PRIVACY_MIGRATION_FILE
\else
\ir ../supabase/migrations/20261021000000_account_privacy.sql
\endif

set local role anon;
do $$ declare t text; begin
  foreach t in array array['overrated_votes','tier_list_votes','transfer_grade_votes'] loop
    execute format('insert into public.%I(user_id) values (null)',t);
    begin
      execute format('insert into public.%I(user_id) values ($1)',t) using '11111111-1111-4111-8111-111111111111'::uuid;
      raise exception 'Anonymous non-NULL vote unexpectedly allowed';
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare t text; begin
  foreach t in array array['overrated_votes','tier_list_votes','transfer_grade_votes'] loop
    execute format('insert into public.%I(user_id) values (null)',t);
    execute format('insert into public.%I(user_id) values ($1)',t) using '11111111-1111-4111-8111-111111111111'::uuid;
    begin
      execute format('insert into public.%I(user_id) values ($1)',t) using '22222222-2222-4222-8222-222222222222'::uuid;
      raise exception 'Vote attributed to B unexpectedly allowed';
    exception when insufficient_privilege then null;
    end;
  end loop;
end $$;
reset role;
-- Remove just the extra own fixtures so export has one direct row per table.
delete from public.overrated_votes where user_id='11111111-1111-4111-8111-111111111111' and id is null;
delete from public.tier_list_votes where user_id='11111111-1111-4111-8111-111111111111' and id is null;
delete from public.transfer_grade_votes where user_id='11111111-1111-4111-8111-111111111111' and id is null;
set local role service_role;
insert into public.overrated_votes(id,user_id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111');
insert into public.tier_list_votes(id,user_id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111');
insert into public.transfer_grade_votes(id,user_id) values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111111');
reset role;
delete from public.overrated_votes where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
delete from public.tier_list_votes where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
delete from public.transfer_grade_votes where id='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

-- The aggregate cannot silently stop at a normal 1000-row API page.
insert into public.user_game_scores(user_id,score)
  select '11111111-1111-4111-8111-111111111111'::uuid,n from generate_series(1,1005) n;
do $$ begin
  if jsonb_array_length(public.account_privacy_export('11111111-1111-4111-8111-111111111111')->'user_game_scores') <> 1006 then
    raise exception 'Account export lost rows past 1000';
  end if;
end $$;
delete from public.user_game_scores where user_id='11111111-1111-4111-8111-111111111111' and id is null;

-- The service-only functions must not become public RPCs.
set local role anon;
do $$ begin
  begin
    perform public.account_privacy_export('11111111-1111-4111-8111-111111111111');
    raise exception 'Anonymous export unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.account_privacy_deletion_blockers('11111111-1111-4111-8111-111111111111');
    raise exception 'Anonymous preflight unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin
    perform public.account_privacy_export('22222222-2222-4222-8222-222222222222');
    raise exception 'Authenticated direct export unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.account_privacy_deletion_blockers('22222222-2222-4222-8222-222222222222');
    raise exception 'Authenticated direct preflight unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role service_role;
do $$
declare data jsonb; t text; row_data jsonb;
begin
  data := public.account_privacy_export('11111111-1111-4111-8111-111111111111');
  if (select count(*) from jsonb_object_keys(data)) <> 21 then raise exception 'Incomplete export table coverage'; end if;
  foreach t in array array[
    'bootroom_save','daily_badges','daily_completions','fantasy_draft_votes','overrated_votes','profiles','saved_brackets',
    'tier_list_votes','transfer_grade_votes','user_best_scores','user_game_scores','user_preferences','user_roles','user_scores','user_scores_bak_20260919'
  ] loop
    if jsonb_array_length(data->t) <> (case when t='user_scores_bak_20260919' then 2 else 1 end) then
      raise exception 'Missing, duplicate or foreign account rows in %', t;
    end if;
    for row_data in select value from jsonb_array_elements(data->t) loop
      if row_data->>'user_id' <> '11111111-1111-4111-8111-111111111111' then raise exception 'Foreign user exported'; end if;
    end loop;
  end loop;
  foreach t in array array['bootroom_event_log','bootroom_facilities','bootroom_match','bootroom_save_player','bootroom_scout_report','bootroom_transfer_log'] loop
    if jsonb_array_length(data->t) <> 1 or data->t->0->>'save_id' <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then
      raise exception 'Foreign or missing child rows in %', t;
    end if;
  end loop;
  if public.account_privacy_deletion_blockers('11111111-1111-4111-8111-111111111111') <> '{"admin":false,"storage":false}'::jsonb then
    raise exception 'Unexpected initial deletion blocker';
  end if;
end $$;
reset role;
-- New fields must not silently expand the fixed export field allowlist.
alter table public.profiles add column future_private_token text;
update public.profiles set future_private_token='NEVER_EXPORT';
do $$ begin
  if public.account_privacy_export('11111111-1111-4111-8111-111111111111')::text like '%NEVER_EXPORT%' then
    raise exception 'Export widened with a newly added column';
  end if;
end $$;
update public.user_roles set role='admin' where user_id='11111111-1111-4111-8111-111111111111';
do $$ begin
  begin
    delete from auth.users where id='11111111-1111-4111-8111-111111111111';
    raise exception 'Admin deletion unexpectedly allowed';
  exception when raise_exception then
    if sqlerrm <> 'account_privacy_manual_required' then raise; end if;
  end;
  if not exists(select 1 from auth.users where id='11111111-1111-4111-8111-111111111111') then
    raise exception 'Admin account was lost';
  end if;
end $$;
insert into storage.objects(owner_id) values ('11111111-1111-4111-8111-111111111111');
do $$ begin
  if public.account_privacy_deletion_blockers('11111111-1111-4111-8111-111111111111') <> '{"admin":true,"storage":true}'::jsonb then
    raise exception 'Admin or modern Storage ownership missed';
  end if;
end $$;
delete from storage.objects;
update public.user_roles set role='user' where user_id='11111111-1111-4111-8111-111111111111';
insert into storage.buckets(owner) values ('11111111-1111-4111-8111-111111111111');
do $$ begin
  if not (public.account_privacy_deletion_blockers('11111111-1111-4111-8111-111111111111')->>'storage')::boolean then
    raise exception 'Legacy Storage ownership missed';
  end if;
  begin
    delete from auth.users where id='11111111-1111-4111-8111-111111111111';
    raise exception 'Storage owner deletion unexpectedly allowed';
  exception when raise_exception then
    if sqlerrm <> 'account_privacy_manual_required' then raise; end if;
  end;
end $$;
delete from storage.buckets;
update public.user_roles set role='user' where user_id='11111111-1111-4111-8111-111111111111';
insert into auth.mfa_factors(id,user_id,status) values ('11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','verified');
do $$ begin
  begin
    delete from auth.users where id='11111111-1111-4111-8111-111111111111';
    raise exception 'Verified MFA deletion unexpectedly allowed';
  exception when raise_exception then
    if sqlerrm <> 'account_privacy_manual_required' then raise; end if;
  end;
end $$;
delete from auth.mfa_factors where user_id='11111111-1111-4111-8111-111111111111';
-- Real RLS, with a still-valid A subject, refuses writing a B-owned row.
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  begin
    insert into public.user_game_scores(user_id) values ('22222222-2222-4222-8222-222222222222');
    raise exception 'Cross-account RLS write unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role supabase_auth_admin;
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
reset role;
do $$
declare t text; n bigint;
begin
  foreach t in array array[
    'bootroom_save','daily_badges','daily_completions','fantasy_draft_votes','overrated_votes','profiles','saved_brackets',
    'tier_list_votes','transfer_grade_votes','user_best_scores','user_game_scores','user_preferences','user_roles','user_scores','user_scores_bak_20260919'
  ] loop
    execute format('select count(*) from public.%I where user_id=$1', t) into n using '11111111-1111-4111-8111-111111111111'::uuid;
    if n <> 0 then raise exception 'A rows survived deletion in %', t; end if;
    execute format('select count(*) from public.%I where user_id=$1', t) into n using '22222222-2222-4222-8222-222222222222'::uuid;
    if n <> 1 then raise exception 'B rows changed in %', t; end if;
  end loop;
  foreach t in array array['bootroom_event_log','bootroom_facilities','bootroom_match','bootroom_save_player','bootroom_scout_report','bootroom_transfer_log'] loop
    execute format('select count(*) from public.%I where save_id=$1', t) into n using 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
    if n <> 0 then raise exception 'A children survived in %',t; end if;
    execute format('select count(*) from public.%I where save_id=$1', t) into n using 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid;
    if n <> 1 then raise exception 'B children changed in %',t; end if;
  end loop;
  if not exists(select 1 from public.user_scores_bak_20260919 where user_id='99999999-9999-4999-8999-999999999999') then
    raise exception 'NOT VALID migration removed a historical orphan';
  end if;
  foreach t in array array['overrated_votes','tier_list_votes','transfer_grade_votes'] loop
    execute format('select count(*) from public.%I where user_id is null', t) into n;
    if n <> 3 then raise exception 'Guest NULL votes changed in %',t; end if;
  end loop;
end $$;
-- Stale A claims still satisfy own-row RLS, but the new FKs stop recreation.
set local role authenticated;
do $$
declare t text;
begin
  foreach t in array array[
    'daily_badges','daily_completions','fantasy_draft_votes','overrated_votes','saved_brackets','tier_list_votes',
    'transfer_grade_votes','user_best_scores','user_game_scores','user_scores','user_scores_bak_20260919'
  ] loop
    begin
      execute format('insert into public.%I(user_id) values ($1)', t) using '11111111-1111-4111-8111-111111111111'::uuid;
      raise exception 'Stale JWT recreated account data in %',t;
    exception when foreign_key_violation then null;
    end;
  end loop;
end $$;
reset role;
select 'PASS: account privacy cascades, fixed export, RPC grants, RLS and stale JWT fixtures' as result;
\if :{?PRIVACY_CONCURRENCY_SETUP}
commit;
\else
rollback;
\endif

