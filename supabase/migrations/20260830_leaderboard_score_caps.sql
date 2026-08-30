-- Round 296: the World Leaderboard stops trusting numbers a stranger can write.
--
-- WHAT IS WRONG TODAY, AND IT IS LIVE RIGHT NOW.
--
-- public.game_completions is deliberately open: anon and authenticated may
-- INSERT with WITH CHECK (true). That is a considered product decision and it
-- is NOT the defect. The site is guest first, the handle is generated in the
-- browser, no PII is sent, and "Most Played Today" needs every visitor and not
-- only the signed in ones. src/lib/completions.ts says so in its own words.
--
-- The defect is what global_leaderboard() and global_rank() then DO with it.
-- They compute each game's denominator FROM THE TABLE ITSELF:
--
--     with maxes as (select game, greatest(max(score),1) from game_completions ...)
--     ... sum(100.0 * day_best / max_score)
--
-- Every input to that sum is client controlled. `game` is free text with no
-- constraint, `score` is an unbounded integer, `completed_on` defaults to today
-- but may be supplied, `player_name` is free text. So:
--
--   1. THE CHEAP ATTACK. Post one row for a game name that does not exist,
--      score 1. That invented game's max becomes 1, your day best IS the max,
--      and the sum awards the full 100 points. Repeat with distinct (game,
--      completed_on) pairs: every row is another 100 points. A few hundred
--      rows puts anybody permanently top of a board that Round 270 linked from
--      every page on the site.
--   2. THE LOUD ATTACK. Post one enormous score for a REAL game and you
--      silently rescale the denominator for every other player of that game.
--   3. Post under anyone's handle, because the name is just a string.
--
-- MEASURED 2026-08-26 BEFORE CHANGING ANYTHING: not exploited. Across 105,726
-- rows, zero games have a maximum more than five times their own 99th
-- percentile. An open door, not a break in. There is one test row in
-- production under the key 'qa-test', player 'QA-Harness-Test', 2026-07-15.
--
-- THE FIX, AND THE MISTAKE THE FIRST DRAFT OF IT MADE.
--
-- The first draft simply froze every denominator from existing data. That
-- would have SILENTLY BROKEN THIRTEEN LIVE GAMES. Thirteen keys the client can
-- send have never recorded a score, so freezing from data alone would have
-- given them no cap and they would have earned zero forever, on a board nobody
-- would think to check. THREE OF THEM SHIPPED IN THE LAST FOUR DAYS
-- (face-off, hall-of-champions, idle-arena), which is the whole argument for
-- deriving this list from the source rather than from the data.
--
-- It was caught by diffing the keys the SOURCE can send (108, extracted by
-- matching useGameCompletion('<key>' and recordCompletion('/<key>') against the
-- keys the DATA holds. Neither list is a subset of the other: the data also
-- holds sixteen keys the client can no longer produce, from retired games and
-- renamed slugs (blind-rank, career-path, cbb-program, darts, darts-501,
-- guess-soccer-club, guess-soccer-club-questions, lineup-builder, nba-lineup,
-- the three perfect-lineup variants, stadium-draft, tennis-player, ufc-game),
-- and those must keep their caps or real historical points would vanish.
--
-- So the table does two jobs, and they are separable on purpose:
--
--   * IT IS THE ALLOWLIST. A game absent from it scores NOTHING. That alone
--     kills attack 1, because an invented key cannot be in the list. Same fail
--     closed rule this project already applies to every AI validator: when we
--     cannot verify we refuse, we never accept.
--   * IT IS THE FROZEN DENOMINATOR, where one is known. That kills attack 2,
--     because max(score) no longer decides anything.
--
-- max_score is NULLABLE on purpose. A real game with no scores yet is in the
-- allowlist with a NULL cap and falls back to the 99th PERCENTILE of its own
-- scores rather than the maximum, so one outlier row cannot move it. That
-- keeps a newly shipped game working the day it ships with no maintenance
-- step, which is the property the old code had and is worth keeping.
--
-- WHAT THIS DOES NOT DO, stated rather than left to be discovered:
--
--   * It does not tighten the INSERT policy. Blocking unknown keys at write
--     time is the obvious next step and is deliberately a separate round: the
--     key space is hand maintained across about a hundred call sites and a
--     constraint written from the route table would stop real games recording.
--     The allowlist makes a bad row worthless without risking a good row being
--     refused.
--   * It does not stop volume. Nothing in row level security can rate limit,
--     so "someone posts a million rows until the spend cap trips" needs an
--     edge function in front of the insert, or a WAF rule.
--   * It does not stop ballot stuffing on the crowd vote games
--     (overrated_votes, poll_votes, tier_list_votes, hof_votes, all
--     WITH CHECK (true)). Same shape, same answer, its own round.
--
-- RE-VERIFIED READ ONLY AGAINST LIVE DATA BEFORE APPLYING, 2026-08-30, over
-- 174,183 rows and 3,982 players: old formula against new, top 100 players
-- whose points change 0, largest change to any total 0, players dropped from
-- the top 100 0. The only row that stops counting is 'qa-test'.
--
-- ROUND 360 SUPERSEDES THE 2026-08-26 DRAFT, WHICH WAS NEVER APPLIED.
-- That draft's half two named the thirteen keys that had no scores ON THAT DAY.
-- Four games shipped since can send a completion and still have no scores:
-- clue-auction, perfect-season-nhl, stat-detective and who-am-i. Applying the
-- draft unchanged would have allowlisted none of them, so all four would have
-- earned zero forever on a board nobody would think to check, which is exactly
-- the mistake the draft's own comments say ITS first draft made. The lesson did
-- not survive four days of shipping, so this version stops relying on anybody
-- noticing: half two carries EVERY key the source can send, derived from the
-- source rather than typed, and simLeaderboardCaps fails if the table and the
-- source ever drift apart again.

create table if not exists public.game_score_caps (
  game       text primary key,
  /* NULL means "allowlisted, denominator not frozen yet": see above. */
  max_score  integer check (max_score is null or max_score > 0),
  note       text,
  updated_at timestamptz not null default now()
);

comment on table public.game_score_caps is
  'Round 360. Two jobs: the allowlist of games that may score on the World Leaderboard, and the frozen per game denominator where one is known. A game absent from this table earns zero, on purpose. A game present with a NULL max_score falls back to the 99th percentile of its own scores. Public read, no public write.';

alter table public.game_score_caps enable row level security;

drop policy if exists "caps are public read" on public.game_score_caps;
create policy "caps are public read"
  on public.game_score_caps for select
  to anon, authenticated
  using (true);

-- No insert, update or delete policy exists, so writes are denied to anon and
-- authenticated. Maintained with the service key only.

-- Half one: every key the DATA holds, frozen at exactly the value the old
-- function computes today. This is why applying this moves nobody's points.
-- 'qa-test' is excluded: it is a test row, not a game.
insert into public.game_score_caps (game, max_score, note)
select gc.game, greatest(max(gc.score), 1), 'frozen from live data 2026-08-30'
from public.game_completions gc
where gc.score is not null and gc.score > 0 and gc.game <> 'qa-test'
group by gc.game
on conflict (game) do nothing;

-- Half two: EVERY key the client can send, derived from source on 2026-08-30
-- by matching useGameCompletion('<key>' and recordCompletion('/<key>') across
-- src, plus two retired routes kept so a late row still counts. Inserted with a
-- NULL denominator, so a game that already has scores keeps the frozen cap half
-- one gave it (on conflict do nothing) and a game with none falls back to its
-- own 99th percentile the day someone finally plays it. Listing all of them
-- rather than only today's gaps is the point: the table becomes complete by
-- construction instead of complete by somebody remembering.
insert into public.game_score_caps (game, max_score, note)
values
  ('afl-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('alphabet-sprint', null, 'allowlisted from source 2026-08-30'),
  ('ball-iq', null, 'allowlisted from source 2026-08-30'),
  ('baseball-career', null, 'allowlisted from source 2026-08-30'),
  ('baseball-connections', null, 'allowlisted from source 2026-08-30'),
  ('budget-builder', null, 'allowlisted from source 2026-08-30'),
  ('build-your-xi', null, 'allowlisted from source 2026-08-30'),
  ('career', null, 'allowlisted from source 2026-08-30'),
  ('career-ladder', null, 'allowlisted from source 2026-08-30'),
  ('cbb-dynasty', null, 'allowlisted from source 2026-08-30'),
  ('cfb-dynasty', null, 'allowlisted from source 2026-08-30'),
  ('cfb-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('champ-or-not', null, 'allowlisted from source 2026-08-30'),
  ('club-manager', null, 'allowlisted from source 2026-08-30'),
  ('clue-auction', null, 'allowlisted from source 2026-08-30'),
  ('college-grid', null, 'allowlisted from source 2026-08-30'),
  ('connections', null, 'allowlisted from source 2026-08-30'),
  ('conquest-imperialism', null, 'allowlisted from source 2026-08-30'),
  ('conquest-mlb-imperialism', null, 'allowlisted from source 2026-08-30'),
  ('conquest-nba-imperialism', null, 'allowlisted from source 2026-08-30'),
  ('conquest-nhl-imperialism', null, 'allowlisted from source 2026-08-30'),
  ('dart-draft', null, 'allowlisted from source 2026-08-30'),
  ('emoji-guess', null, 'allowlisted from source 2026-08-30'),
  ('f1-constructor', null, 'allowlisted from source 2026-08-30'),
  ('f1-driver', null, 'allowlisted from source 2026-08-30'),
  ('f1-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('face-off', null, 'allowlisted from source 2026-08-30'),
  ('fantasy-draft', null, 'allowlisted from source 2026-08-30'),
  ('football-connect-4', null, 'allowlisted from source 2026-08-30'),
  ('football-draft', null, 'allowlisted from source 2026-08-30'),
  ('football-grid', null, 'allowlisted from source 2026-08-30'),
  ('football-timeline', null, 'allowlisted from source 2026-08-30'),
  ('footle', null, 'allowlisted from source 2026-08-30'),
  ('front-office', null, 'allowlisted from source 2026-08-30'),
  ('golf-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('grade-transfer', null, 'retired route, kept so any late row still counts'),
  ('guess-cbb-team', null, 'allowlisted from source 2026-08-30'),
  ('guess-nascar-driver', null, 'allowlisted from source 2026-08-30'),
  ('guess-nfl-team', null, 'allowlisted from source 2026-08-30'),
  ('guess-tennis-player', null, 'allowlisted from source 2026-08-30'),
  ('guess-the-college', null, 'allowlisted from source 2026-08-30'),
  ('guess-the-golfer', null, 'allowlisted from source 2026-08-30'),
  ('guess-the-nation', null, 'allowlisted from source 2026-08-30'),
  ('guess-the-year', null, 'allowlisted from source 2026-08-30'),
  ('guess-transfer-value', null, 'retired route, kept so any late row still counts'),
  ('hall-of-champions', null, 'allowlisted from source 2026-08-30'),
  ('higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('hockey-career', null, 'allowlisted from source 2026-08-30'),
  ('hockey-grid', null, 'allowlisted from source 2026-08-30'),
  ('hockey-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('hof-or-bust', null, 'allowlisted from source 2026-08-30'),
  ('idle-arena', null, 'allowlisted from source 2026-08-30'),
  ('jeopardy', null, 'allowlisted from source 2026-08-30'),
  ('minefield', null, 'allowlisted from source 2026-08-30'),
  ('missing-eleven', null, 'allowlisted from source 2026-08-30'),
  ('missing-five', null, 'allowlisted from source 2026-08-30'),
  ('missing-nine', null, 'allowlisted from source 2026-08-30'),
  ('missing-xi', null, 'allowlisted from source 2026-08-30'),
  ('mlb-connect-4', null, 'allowlisted from source 2026-08-30'),
  ('mlb-front-office', null, 'allowlisted from source 2026-08-30'),
  ('mlb-grid', null, 'allowlisted from source 2026-08-30'),
  ('mlb-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('mlb-my-career', null, 'allowlisted from source 2026-08-30'),
  ('mystery-box', null, 'allowlisted from source 2026-08-30'),
  ('nascar-chain', null, 'allowlisted from source 2026-08-30'),
  ('nba-career', null, 'allowlisted from source 2026-08-30'),
  ('nba-chain', null, 'allowlisted from source 2026-08-30'),
  ('nba-connect-4', null, 'allowlisted from source 2026-08-30'),
  ('nba-connections', null, 'allowlisted from source 2026-08-30'),
  ('nba-front-office', null, 'allowlisted from source 2026-08-30'),
  ('nba-grid', null, 'allowlisted from source 2026-08-30'),
  ('nba-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('nba-my-career', null, 'allowlisted from source 2026-08-30'),
  ('nba-starting-5', null, 'allowlisted from source 2026-08-30'),
  ('nfl-career', null, 'allowlisted from source 2026-08-30'),
  ('nfl-connect-4', null, 'allowlisted from source 2026-08-30'),
  ('nfl-connections', null, 'allowlisted from source 2026-08-30'),
  ('nfl-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('nfl-my-career', null, 'allowlisted from source 2026-08-30'),
  ('nhl-connect-4', null, 'allowlisted from source 2026-08-30'),
  ('nhl-connections', null, 'allowlisted from source 2026-08-30'),
  ('nhl-front-office', null, 'allowlisted from source 2026-08-30'),
  ('nhl-my-career', null, 'allowlisted from source 2026-08-30'),
  ('olympics', null, 'allowlisted from source 2026-08-30'),
  ('pack-battle', null, 'allowlisted from source 2026-08-30'),
  ('perfect-lineup', null, 'allowlisted from source 2026-08-30'),
  ('perfect-season-mlb', null, 'allowlisted from source 2026-08-30'),
  ('perfect-season-nba', null, 'allowlisted from source 2026-08-30'),
  ('perfect-season-nfl', null, 'allowlisted from source 2026-08-30'),
  ('perfect-season-nhl', null, 'allowlisted from source 2026-08-30'),
  ('puck-detective', null, 'allowlisted from source 2026-08-30'),
  ('rank-em', null, 'allowlisted from source 2026-08-30'),
  ('rarity-round', null, 'allowlisted from source 2026-08-30'),
  ('rebuild', null, 'allowlisted from source 2026-08-30'),
  ('score-predictor', null, 'allowlisted from source 2026-08-30'),
  ('shirt-number', null, 'allowlisted from source 2026-08-30'),
  ('sign-the-player', null, 'allowlisted from source 2026-08-30'),
  ('silverware-sort', null, 'allowlisted from source 2026-08-30'),
  ('soccer-career', null, 'allowlisted from source 2026-08-30'),
  ('soccer-grid', null, 'allowlisted from source 2026-08-30'),
  ('sports-millionaire', null, 'allowlisted from source 2026-08-30'),
  ('squad-deal', null, 'allowlisted from source 2026-08-30'),
  ('stadium-tycoon', null, 'allowlisted from source 2026-08-30'),
  ('stat-detective', null, 'allowlisted from source 2026-08-30'),
  ('teammates', null, 'allowlisted from source 2026-08-30'),
  ('tennis-chain', null, 'allowlisted from source 2026-08-30'),
  ('tennis-higher-lower', null, 'allowlisted from source 2026-08-30'),
  ('transfer-path', null, 'allowlisted from source 2026-08-30'),
  ('ufc', null, 'allowlisted from source 2026-08-30'),
  ('ufc-chain', null, 'allowlisted from source 2026-08-30'),
  ('who-am-i', null, 'allowlisted from source 2026-08-30'),
  ('whod-they-beat', null, 'allowlisted from source 2026-08-30'),
  ('wonderkid-factory', null, 'allowlisted from source 2026-08-30'),
  ('world-cup', null, 'allowlisted from source 2026-08-30'),
  ('world-xi', null, 'allowlisted from source 2026-08-30')
on conflict (game) do nothing;

/* The denominator for one game: the frozen cap when there is one, otherwise
   the 99th percentile of that game's own scores, floored at 1. A percentile
   rather than a maximum so one outlier row cannot move it. */
create or replace view public.game_denominators as
  select c.game,
         greatest(
           coalesce(
             c.max_score,
             (select percentile_disc(0.99) within group (order by gc.score)
              from public.game_completions gc
              where gc.game = c.game and gc.score is not null and gc.score > 0)
           ),
           1
         )::numeric as max_score
  from public.game_score_caps c;

create or replace function public.global_leaderboard(p_period text default 'alltime', p_games text[] default null)
returns table(rank bigint, player_name text, total_points numeric, games_played bigint)
language sql
stable
set search_path to 'public'
as $function$
  with best as (
    select gc.player_name, gc.game, gc.completed_on,
           max(least(gc.score, d.max_score))::numeric as day_best, d.max_score
    from public.game_completions gc
    /* INNER join to the allowlist. A game not in it is not scored. This one
       line is what makes an invented game key worth nothing. */
    join public.game_denominators d on d.game = gc.game
    where gc.score is not null and gc.score > 0 and gc.player_name is not null
      and (p_games is null or gc.game = any(p_games))
      and (p_period <> 'today' or gc.completed_on = (now() at time zone 'utc')::date)
      /* A day in the future is not a day anybody played. */
      and gc.completed_on <= (now() at time zone 'utc')::date
    group by gc.player_name, gc.game, gc.completed_on, d.max_score
  ),
  totals as (
    select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts, count(*) as plays
    from best b group by b.player_name
  )
  select row_number() over (order by t.pts desc, t.player_name asc) as rank,
         t.player_name, round(t.pts)::numeric as total_points, t.plays as games_played
  from totals t
  order by t.pts desc, t.player_name asc
  limit 100;
$function$;

create or replace function public.global_rank(p_player text, p_period text default 'alltime', p_games text[] default null)
returns table(rank bigint, total_points numeric, total_players bigint)
language sql
stable
set search_path to 'public'
as $function$
  with best as (
    select gc.player_name, gc.game, gc.completed_on,
           max(least(gc.score, d.max_score))::numeric as day_best, d.max_score
    from public.game_completions gc
    join public.game_denominators d on d.game = gc.game
    where gc.score is not null and gc.score > 0 and gc.player_name is not null
      and (p_games is null or gc.game = any(p_games))
      and (p_period <> 'today' or gc.completed_on = (now() at time zone 'utc')::date)
      and gc.completed_on <= (now() at time zone 'utc')::date
    group by gc.player_name, gc.game, gc.completed_on, d.max_score
  ),
  totals as (
    select b.player_name, sum(100.0 * b.day_best / b.max_score) as pts
    from best b group by b.player_name
  ),
  ranked as (
    select t.player_name, t.pts,
           row_number() over (order by t.pts desc, t.player_name asc) as rn,
           count(*) over () as cnt
    from totals t
  )
  select r.rn as rank, round(r.pts)::numeric as total_points, r.cnt as total_players
  from ranked r
  where r.player_name = p_player;
$function$;


-- Applied 2026-08-30. Then get_advisors was run, as this repo's database rules
-- require after any DDL, and it raised one ERROR against the new view: it was
-- created without security_invoker, so it defaulted to running with its owner's
-- rights. It exposes nothing today, because game_completions and
-- game_score_caps both already carry public read policies, so this closes no
-- leak. It is still the right setting: if game_completions is ever restricted,
-- a definer view would go on serving those rows to everyone and nothing would
-- say so.
alter view public.game_denominators set (security_invoker = true);
