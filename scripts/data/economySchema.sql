-- The production objects the points economy migrations touch, as a schema
-- snapshot that scripts/simEconomyMigrations.mjs loads into PGlite (Round 673).
--
-- READ ONLY FROM PRODUCTION on 2026-09-29 (Postgres 17.6), with SELECTs
-- through the Supabase MCP and nothing else: pg_attribute and pg_attrdef for
-- the columns and defaults, pg_constraint and pg_index, pg_policies,
-- pg_class.relacl and pg_proc.proacl for the grants, pg_get_functiondef for
-- every function, pg_get_viewdef for the two views, and the rows of
-- game_score_caps (game and max_score). No rehearsal ever runs on production:
-- a BEGIN ... ROLLBACK there takes the same locks a real apply does and
-- stalls live saves. It runs here.
--
-- WHY IT CAN BE TRUSTED AS PRODUCTION. simEconomyMigrations section 0 loads
-- this file and compares md5(pg_get_functiondef) of the save and of the four
-- older SECURITY DEFINER functions, and of auth.uid(), against the values
-- production gave on the same day. A byte out of place in any body fails that
-- section before anything else runs. The policy text, the table ACLs and the
-- defaults are checked by L1 itself, whose preconditions refuse anything but
-- the objects it read.
--
-- WHAT IS NOT PRODUCTION, on purpose:
--   * the roles are NOLOGIN shells with the production names, so SET ROLE and
--     has_*_privilege answer as they do there;
--   * the platform's own SECURITY DEFINER functions outside public (pg_graphql,
--     pgbouncer and vault) are STUBS: same schema, name, arguments, result,
--     owner, security, search_path and grants as production, bodies that do
--     nothing. They exist so simPlayDoor's outside definer check has the
--     production catalog to read in the rehearsal; their md5s are not
--     production's and nothing compares them;
--   * public.user_roles, public.profiles and private.app_secrets are absent.
--     The four older definers only read them, and check_function_bodies is off
--     while they load, exactly as pg_dump does it;
--   * game_score_caps carries game and max_score only (note is null,
--     updated_at the load time); no other table carries rows.
--
-- REFRESH: rerun the SELECTs above read only and rewrite this file, then run
-- node scripts/simEconomyMigrations.mjs. If production changed underneath a
-- migration, its preconditions will say so here first.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin nologin;
create role supabase_auth_admin nologin;
create role pgbouncer nologin;

-- ---------------------------------------------------------------------------
-- schemas
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create schema private;
create schema graphql;
create schema graphql_public;
create schema pgbouncer;
create schema vault;
grant usage on schema graphql, graphql_public to anon, authenticated, service_role;

create type public.app_role as enum ('admin', 'user');

-- ---------------------------------------------------------------------------
-- auth.uid(), Supabase's, byte for byte (md5 ea3b41bf29e2ad573067939329aa088e).
-- Its body has a trailing space after the first select, which editors strip,
-- so it is written as an escape string.
-- ---------------------------------------------------------------------------
create function auth.uid()
 returns uuid
 language sql
 stable
as E'\n  select \n  coalesce(\n    nullif(current_setting(''request.jwt.claim.sub'', true), ''''),\n    (nullif(current_setting(''request.jwt.claims'', true), '''')::jsonb ->> ''sub'')\n  )::uuid\n';
alter function auth.uid() owner to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- the six tables
-- ---------------------------------------------------------------------------
create table public.daily_completions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  game_slug text not null,
  date date not null,
  created_at timestamp with time zone not null default now(),
  constraint daily_completions_pkey primary key (id),
  constraint daily_completions_user_id_game_slug_date_key unique (user_id, game_slug, date)
);
create index idx_daily_completions_user_date on public.daily_completions using btree (user_id, date);

create table public.game_completions (
  id bigint generated always as identity,
  game text not null,
  completed_on date not null default ((now() at time zone 'utc'::text))::date,
  created_at timestamp with time zone not null default now(),
  score integer,
  player_name text,
  constraint game_completions_pkey primary key (id)
);
create index idx_game_completions_day_game on public.game_completions using btree (completed_on, game);
create index idx_game_completions_et_day_game on public.game_completions using btree ((((created_at at time zone 'America/New_York'::text))::date), game) where ((score is not null) and (score > 0));
create index idx_game_completions_et_day_game_cover on public.game_completions using btree ((((created_at at time zone 'America/New_York'::text))::date), game) include (player_name, score, created_at) where ((score is not null) and (score > 0));
create index idx_game_completions_game_score on public.game_completions using btree (game, score) where ((score is not null) and (score > 0));
create index idx_game_completions_player_day on public.game_completions using btree (player_name, completed_on);

create table public.game_score_caps (
  game text not null,
  max_score integer,
  note text,
  updated_at timestamp with time zone not null default now(),
  constraint game_score_caps_pkey primary key (game),
  constraint game_score_caps_max_score_check check (((max_score is null) or (max_score > 0)))
);

create table public.user_best_scores (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  game_type text not null,
  best_score integer not null default 0,
  achieved_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint user_best_scores_pkey primary key (id),
  constraint user_best_scores_user_id_game_type_key unique (user_id, game_type)
);

create table public.user_game_scores (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  game_type text not null,
  score integer not null default 0,
  correct_answers integer not null default 0,
  puzzle_date date,
  created_at timestamp with time zone not null default now(),
  constraint user_game_scores_pkey primary key (id)
);
create index idx_user_game_scores_user on public.user_game_scores using btree (user_id);

create table public.user_scores (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  total_points integer not null default 0,
  games_played_today integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_played_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint user_scores_pkey primary key (id),
  constraint user_scores_user_id_key unique (user_id)
);

-- grants: every client role held everything, row level security the only barrier
grant all on table public.daily_completions, public.game_completions, public.game_score_caps,
                   public.user_best_scores, public.user_game_scores, public.user_scores
  to anon, authenticated, service_role;
grant all on sequence public.game_completions_id_seq to anon, authenticated, service_role;

alter table public.daily_completions enable row level security;
alter table public.game_completions enable row level security;
alter table public.game_score_caps enable row level security;
alter table public.user_best_scores enable row level security;
alter table public.user_game_scores enable row level security;
alter table public.user_scores enable row level security;

-- the thirteen policies, names, commands, roles and expressions as read
create policy daily_completions_ins on public.daily_completions for insert to public with check (auth.uid() = user_id);
create policy daily_completions_read on public.daily_completions for select to public using (true);
create policy "Anyone can log a completion" on public.game_completions for insert to anon, authenticated with check (true);
create policy "Public read completions" on public.game_completions for select to public using (true);
create policy "caps are public read" on public.game_score_caps for select to anon, authenticated using (true);
create policy user_best_scores_ins on public.user_best_scores for insert to public with check (auth.uid() = user_id);
create policy user_best_scores_read on public.user_best_scores for select to public using (true);
create policy user_best_scores_upd on public.user_best_scores for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_game_scores_ins on public.user_game_scores for insert to public with check (auth.uid() = user_id);
create policy user_game_scores_read on public.user_game_scores for select to public using (true);
create policy user_scores_ins on public.user_scores for insert to public with check (auth.uid() = user_id);
create policy user_scores_read on public.user_scores for select to public using (true);
create policy user_scores_upd on public.user_scores for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- the two views over the six (the only ones production has)
-- ---------------------------------------------------------------------------
create view public.game_denominators with (security_invoker = true) as
 SELECT game,
    GREATEST(COALESCE(max_score, ( SELECT percentile_disc(0.99::double precision) WITHIN GROUP (ORDER BY gc.score) AS percentile_disc
           FROM public.game_completions gc
          WHERE gc.game = c.game AND gc.score IS NOT NULL AND gc.score > 0)), 1)::numeric AS max_score
   FROM public.game_score_caps c;

create materialized view public.player_ranks as
 WITH scored AS (
         SELECT gc.player_name,
            gc.game,
            (gc.created_at AT TIME ZONE 'America/New_York'::text)::date AS et_day,
            max(LEAST(gc.score::numeric, d.max_score)) AS day_best,
            d.max_score
           FROM public.game_completions gc
             JOIN public.game_denominators d ON d.game = gc.game
          WHERE gc.score IS NOT NULL AND gc.score > 0 AND gc.player_name IS NOT NULL AND (gc.created_at AT TIME ZONE 'America/New_York'::text)::date <= (now() AT TIME ZONE 'America/New_York'::text)::date
          GROUP BY gc.player_name, gc.game, ((gc.created_at AT TIME ZONE 'America/New_York'::text)::date), d.max_score
        ), totals AS (
         SELECT 'alltime'::text AS period,
            scored.player_name,
            sum(100.0 * scored.day_best / scored.max_score) AS pts,
            count(*) AS plays
           FROM scored
          GROUP BY scored.player_name
        UNION ALL
         SELECT 'today'::text AS period,
            scored.player_name,
            sum(100.0 * scored.day_best / scored.max_score) AS pts,
            count(*) AS plays
           FROM scored
          WHERE scored.et_day = (now() AT TIME ZONE 'America/New_York'::text)::date
          GROUP BY scored.player_name
        )
 SELECT period,
    player_name,
    round(pts) AS total_points,
    plays AS games_played,
    row_number() OVER (PARTITION BY period ORDER BY pts DESC, player_name) AS rank,
    count(*) OVER (PARTITION BY period) AS total_players
   FROM totals;

grant all on table public.game_denominators, public.player_ranks to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- the save, Round 569 (md5 of its definition 5ae76ef7cbf874d58d65ee9050e2023c)
-- ---------------------------------------------------------------------------
create or replace function public.record_auth_completion(
  p_game_slug text,
  p_score integer,
  p_correct integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_games integer;
  v_total integer;
  v_streak integer;
  v_longest integer;
begin
  if v_user is null then
    raise exception 'record_auth_completion needs a signed in user';
  end if;
  if p_game_slug is null or length(p_game_slug) = 0 then
    raise exception 'record_auth_completion needs a game slug';
  end if;

  insert into public.user_game_scores (user_id, game_type, score, correct_answers, puzzle_date)
  values (v_user, p_game_slug, coalesce(p_score, 0), coalesce(p_correct, 0), v_today);

  insert into public.daily_completions (user_id, game_slug, date)
  values (v_user, p_game_slug, v_today)
  on conflict (user_id, game_slug, date) do nothing;

  select count(*) into v_games
  from public.daily_completions
  where user_id = v_user and date = v_today;

  insert into public.user_scores as s
    (user_id, total_points, games_played_today, last_played_at, updated_at, current_streak, longest_streak)
  values
    (v_user, coalesce(p_score, 0), greatest(v_games, 1), now(), now(), 1, 1)
  on conflict (user_id) do update set
    total_points = s.total_points + excluded.total_points,
    games_played_today = excluded.games_played_today,
    current_streak = case
      when (s.last_played_at at time zone 'utc')::date = v_today then coalesce(s.current_streak, 0)
      when (s.last_played_at at time zone 'utc')::date = v_today - 1 then coalesce(s.current_streak, 0) + 1
      else 1
    end,
    longest_streak = greatest(
      coalesce(s.longest_streak, 0),
      case
        when (s.last_played_at at time zone 'utc')::date = v_today then coalesce(s.current_streak, 0)
        when (s.last_played_at at time zone 'utc')::date = v_today - 1 then coalesce(s.current_streak, 0) + 1
        else 1
      end
    ),
    last_played_at = now(),
    updated_at = now()
  returning total_points, current_streak, longest_streak into v_total, v_streak, v_longest;

  insert into public.user_best_scores as b (user_id, game_type, best_score)
  values (v_user, p_game_slug, coalesce(p_score, 0))
  on conflict (user_id, game_type) do update set
    best_score = excluded.best_score,
    achieved_at = now()
  where excluded.best_score > b.best_score;

  return jsonb_build_object(
    'total_points', v_total,
    'current_streak', v_streak,
    'longest_streak', v_longest,
    'games_played_today', greatest(v_games, 1)
  );
end;
$$;
revoke all on function public.record_auth_completion(text, integer, integer) from public, anon;
grant execute on function public.record_auth_completion(text, integer, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- the four SECURITY DEFINER functions in public that predate the economy
-- chain, byte for byte (simPlayDoor pins their md5s)
-- ---------------------------------------------------------------------------
create function public.admin_exists(p_role text default 'admin'::text)
 returns integer
 language sql
 stable security definer
 set search_path to ''
as $function$
  select count(*)::int
  from public.user_roles r
  where r.role::text = p_role;
$function$;
revoke all on function public.admin_exists(text) from public;
grant execute on function public.admin_exists(text) to anon, authenticated, service_role;

create function public.app_secret(p_name text)
 returns text
 language sql
 security definer
 set search_path to 'private', 'pg_temp'
as $function$
  select value from private.app_secrets where name = p_name;
$function$;
revoke all on function public.app_secret(text) from public;
grant execute on function public.app_secret(text) to service_role;

create function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
BEGIN
  INSERT INTO public.profiles (user_id)
  SELECT NEW.id
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id);
  RETURN NEW;
END;
$function$;
revoke all on function public.handle_new_user() from public;
grant execute on function public.handle_new_user() to service_role;

-- has_role's body was saved with CRLF line endings on production, so it is
-- written as an escape string: a file checkout cannot change those bytes.
create function public.has_role(_user_id uuid, _role app_role)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as E'\r\n    SELECT EXISTS (\r\n      SELECT 1 FROM public.user_roles\r\n      WHERE user_id = _user_id AND role = _role\r\n    )\r\n  ';
revoke all on function public.has_role(uuid, app_role) from public;
grant execute on function public.has_role(uuid, app_role) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- platform STUBS: the five SECURITY DEFINER functions production has outside
-- public, with their schema, signature, result, owner, security, search_path
-- and grants as read. The bodies are not the platform's.
-- ---------------------------------------------------------------------------
create function graphql.get_schema_version() returns integer language sql security definer as $$ select 0 $$;
alter function graphql.get_schema_version() owner to supabase_admin;
grant execute on function graphql.get_schema_version() to postgres, anon, authenticated, service_role;

create function graphql.increment_schema_version() returns event_trigger language plpgsql security definer as $$ begin end $$;
alter function graphql.increment_schema_version() owner to supabase_admin;
grant execute on function graphql.increment_schema_version() to postgres, anon, authenticated, service_role;

create function pgbouncer.get_auth(p_usename text) returns table(username text, password text)
  language plpgsql security definer set search_path = '' as $$ begin return; end $$;
alter function pgbouncer.get_auth(text) owner to supabase_admin;
revoke all on function pgbouncer.get_auth(text) from public;
grant execute on function pgbouncer.get_auth(text) to pgbouncer;

create function vault.create_secret(new_secret text, new_name text default null::text, new_description text default ''::text, new_key_id uuid default null::uuid)
  returns uuid language plpgsql security definer set search_path = '' as $$ begin return null; end $$;
alter function vault.create_secret(text, text, text, uuid) owner to supabase_admin;
revoke all on function vault.create_secret(text, text, text, uuid) from public;
grant execute on function vault.create_secret(text, text, text, uuid) to postgres, service_role;

create function vault.update_secret(secret_id uuid, new_secret text default null::text, new_name text default null::text, new_description text default null::text, new_key_id uuid default null::uuid)
  returns void language plpgsql security definer set search_path = '' as $$ begin end $$;
alter function vault.update_secret(uuid, text, text, text, uuid) owner to supabase_admin;
revoke all on function vault.update_secret(uuid, text, text, text, uuid) from public;
grant execute on function vault.update_secret(uuid, text, text, text, uuid) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- the allowlist the save now checks: every game_score_caps row, game and
-- max_score as read (151 rows)
-- ---------------------------------------------------------------------------
insert into public.game_score_caps (game, max_score) values
  ('afl-higher-lower', 270), ('alphabet-sprint', 4), ('ball-iq', 1600), ('baseball-career', 1000),
  ('baseball-connections', 500), ('blind-rank', 60), ('budget-builder', 1120), ('build-your-xi', 500),
  ('buzzer-beater', 3012), ('career', 700), ('career-ladder', 1000), ('career-path', 700),
  ('cbb-dynasty', 1375), ('cbb-grid', null), ('cbb-program', 1000), ('cfb-dynasty', 790),
  ('cfb-higher-lower', 325), ('champ-or-not', 7), ('club-manager', 130), ('clue-auction', null),
  ('college-grid', 900), ('connections', 1000), ('conquest-imperialism', 818),
  ('conquest-mlb-imperialism', 799), ('conquest-nba-imperialism', 774), ('conquest-nhl-imperialism', 450),
  ('conquest-soccer-imperialism', 1037), ('dart-draft', 813), ('darts', 334), ('darts-501', 50),
  ('emoji-guess', 500), ('f1-constructor', 1000), ('f1-driver', 1000), ('f1-higher-lower', 325),
  ('face-off', 470), ('fantasy-draft', 83), ('fight-career', 100), ('fight-gym', 100),
  ('fight-promoter', 100), ('football-connect-4', null), ('football-draft', 1500), ('football-grid', 1000),
  ('football-timeline', 500), ('footle', 700), ('free-kick', 3424), ('front-office', 1325),
  ('gauntlet-draft', 100), ('golf-higher-lower', 155), ('grade-transfer', null), ('guess-cbb-team', 1000),
  ('guess-nascar-driver', 800), ('guess-nfl-team', 1200), ('guess-soccer-club', 1200),
  ('guess-soccer-club-questions', 870), ('guess-tennis-player', 800), ('guess-the-college', 1200),
  ('guess-the-golfer', 500), ('guess-the-nation', 1200), ('guess-the-year', 1000),
  ('guess-transfer-value', null), ('hall-of-champions', null), ('higher-lower', 7000),
  ('higher-lower-transfers', null), ('hockey-career', 1000), ('hockey-grid', 900),
  ('hockey-higher-lower', 325), ('hof-or-bust', 1000), ('idle-arena', null), ('jeopardy', 15000),
  ('lineup-builder', 500), ('list-quiz', null), ('minefield', 390), ('missing-eleven', 100),
  ('missing-five', 100), ('missing-nine', 100), ('missing-xi', 100), ('mlb-connect-4', null),
  ('mlb-front-office', 885), ('mlb-gauntlet-draft', 100), ('mlb-grid', 900), ('mlb-higher-lower', 230),
  ('mlb-my-career', 2192), ('mystery-box', 760), ('nascar-chain', 2000), ('nba-career', 1000),
  ('nba-chain', 1500), ('nba-connect-4', null), ('nba-connections', 1000), ('nba-front-office', 3810),
  ('nba-gauntlet-draft', 100), ('nba-grid', 900), ('nba-higher-lower', 325), ('nba-lineup', 500),
  ('nba-my-career', 2893), ('nba-starting-5', 500), ('nba-stat-line', null), ('nfl-career', 6),
  ('nfl-connect-4', null), ('nfl-connections', 1000), ('nfl-gauntlet-draft', 100), ('nfl-higher-lower', 325),
  ('nfl-my-career', 3651), ('nhl-connect-4', null), ('nhl-connections', 1000), ('nhl-front-office', 2125),
  ('nhl-my-career', 1462), ('olympics', 1000), ('overrated-underrated', 800), ('pack-battle', 54000000),
  ('perfect-lineup', 75), ('perfect-lineup-f1', 94), ('perfect-lineup-nba', 96), ('perfect-lineup-nhl', 93),
  ('perfect-season-mlb', 126), ('perfect-season-nba', 77), ('perfect-season-nfl', 15),
  ('perfect-season-nhl', null), ('player-bingo', null), ('player-stock-market', 100), ('puck-detective', 50),
  ('rank-em', 600), ('rarity-round', 500), ('rebuild', 940), ('score-predictor', 1000),
  ('search-and-discard', 82), ('shirt-number', 1000), ('sign-the-player', 56000000), ('silverware-sort', 11),
  ('soccer-career', 1000), ('soccer-grid', 950), ('sports-bingo', 100), ('sports-millionaire', 1000000),
  ('squad-deal', 100), ('stadium-draft', 350), ('stadium-tycoon', null), ('stat-detective', null),
  ('teammates', 1000), ('tennis-chain', 400), ('tennis-higher-lower', 185), ('tennis-player', 800),
  ('tier-list', 800), ('transfer-path', 1000), ('ufc', 700), ('ufc-chain', 450), ('ufc-game', 600),
  ('who-am-i', null), ('whod-they-beat', 6), ('wonderkid-factory', null), ('world-cup', 800),
  ('world-cup-bracket', null), ('world-xi', 11);

set check_function_bodies = on;
