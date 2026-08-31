-- Round 361: the rest of the public write surface. APPLIED 2026-08-30.
--
-- Round 360 stopped the World Leaderboard trusting numbers a stranger can
-- write. This asks the same question of the other eighteen anon writable
-- tables, and only that question: does the site read this table back and show
-- it to another visitor as a fact? The openness is not the defect, it is the
-- guest first design, and every table that is merely open and never read is
-- left alone deliberately. Seven are recorded as needing nothing in
-- docs/security/WRITE-SURFACE-EVIDENCE.md so nobody audits them again.
--
-- PRE FLIGHT, run against live immediately before applying: every predicate
-- below matches all existing rows. Violations counted, per table: 0.
-- Every bound is derived from the game's own source, never from what the data
-- happens to contain today, because a bound that rejects legitimate play is
-- worse than no bound and every one of these write paths swallows its error.

-- The three chain leaderboards. Each board selects from its own table and
-- draws a top ten to every finisher before they have written anything, so one
-- forged row takes rank 1 and shows attacker chosen text to every player.
-- Ceilings from source: a link adds 100 raw, UFC adds a 50 championship bonus
-- on top, and getChainLengthMultiplier caps at 2.0, so legitimate play reaches
-- exactly chain_length * 300 for UFC and * 200 for the other two and never
-- passes it. Mode lists are the full unions in src/types/*Chain.ts. 30
-- characters is the nickname input's own maxLength, which until now was
-- enforced only in the browser. "mode is not null" is not redundant: the
-- column is nullable, and a bare IN test is satisfied by NULL.
alter table public.ufc_chain_scores add constraint ufc_chain_scores_sane check (
  chain_length >= 0 and chain_length <= 200
  and score >= 0 and score <= chain_length * 300
  and length(btrim(nickname)) between 1 and 30
  and mode is not null
  and mode in ('daily','unlimited','hall-of-fame','weight-class'));

alter table public.tennis_chain_scores add constraint tennis_chain_scores_sane check (
  chain_length >= 0 and chain_length <= 200
  and score >= 0 and score <= chain_length * 200
  and length(btrim(nickname)) between 1 and 30
  and mode is not null and mode in ('daily','unlimited'));

alter table public.nascar_chain_scores add constraint nascar_chain_scores_sane check (
  chain_length >= 0 and chain_length <= 200
  and score >= 0 and score <= chain_length * 200
  and length(btrim(nickname)) between 1 and 30
  and mode is not null and mode in ('daily','unlimited'));

-- The three grid rarity tables. Both halves of the "N% of players picked this"
-- fraction are raw counts over an open table, and the aggregation groups by
-- (puzzle_id, cell_index), so table size never enters it: the busiest live
-- bucket holds 43 rows and the average is between 2.5 and 5.1, which means
-- roughly twenty rows own any cell. cell_index is exactly what the source can
-- send, because every board is nine cells indexed rowIdx * 3 + colIdx over
-- [0,1,2]. No puzzle_id pattern on purpose: the pools are generated and grow,
-- so a fixed shape would start refusing real writes silently.
alter table public.soccer_grid_selections add constraint soccer_grid_selections_sane check (
  cell_index >= 0 and cell_index <= 8
  and char_length(player_name) between 1 and 100
  and char_length(puzzle_id) between 1 and 50);

alter table public.college_grid_selections add constraint college_grid_selections_sane check (
  cell_index >= 0 and cell_index <= 8
  and char_length(player_name) between 1 and 100
  and char_length(puzzle_id) between 1 and 50);

alter table public.football_grid_selections add constraint football_grid_selections_sane check (
  cell_index >= 0 and cell_index <= 8
  and char_length(player_name) between 1 and 100
  and char_length(puzzle_id) between 1 and 50);

-- The Community Vote donut on Hall of Fame or Bust counts every row for the
-- player with no filter, and the busiest player holds 27 votes. The id shape is
-- from src/data/hofPlayers.ts; the digit range is 1 to 3 rather than the 1 to 2
-- the data needs, so a sixth or a hundredth player does not require a migration.
alter table public.hof_votes add constraint hof_votes_sane check (
  vote in ('hof','bust')
  and player_id ~ '^(soc|nfl|nba|mlb|nhl)-[0-9]{1,3}$');

-- Poll of the Day renders a percentage and a total on the home page. choice is
-- genuinely source derived (CHOICE_KEYS, and the tally already discards
-- anything else, so this buys tidiness rather than protection). poll_key is NOT
-- source derived: polls are seeded by hand in the database, the live maximum is
-- 28 characters, and 100 is headroom for future seeding and nothing more.
alter table public.poll_votes add constraint poll_votes_sane check (
  choice in ('a','b','c','d')
  and char_length(poll_key) between 1 and 100);

-- cbb_daily and nascar_daily do not hold scores. They hold the ANSWER to the
-- daily puzzle. The client reads whatever row exists for the date and plays it,
-- both tables carry UNIQUE (puzzle_date), both are empty, and the edge function
-- that should fill them returns early when a row already exists, so it will
-- never correct a planted one. Nothing in the browser writes them: the client
-- only inserts into cbb_scores and nascar_scores. So an anonymous insert could
-- permanently choose the daily puzzle every visitor gets, for any date, and the
-- legitimate writer would decline to fix it. The only writers are the two edge
-- functions, which use the service role key and bypass RLS entirely.
drop policy if exists "cbb_daily_ins" on public.cbb_daily;
drop policy if exists "nascar_daily_ins" on public.nascar_daily;

-- Most Played Today, moved off the client. useMostPlayed selected the day's
-- rows with no order and no range, and PostgREST truncates at 1,000: with 3,550
-- rows today it ranked an arbitrary slice of the early hours, found only two
-- games clearing the five play threshold, and silently served the curated
-- fallback trio instead. Today's real top three were club-manager 2638,
-- soccer-career 547 and nba-my-career 132; the truncated read saw
-- club-manager 990, budget-builder 7 and ball-iq 1.
--
-- Aggregating in the database fixes the truncation and stops shipping thousands
-- of rows to a phone to count them. The join to game_score_caps is deliberate:
-- it reuses Round 360's allowlist, so an invented game key cannot trend either.
create or replace function public.most_played_today(p_min integer default 5, p_limit integer default 3)
returns table(game text, plays bigint)
language sql
stable
set search_path to 'public'
as $function$
  select gc.game, count(*) as plays
  from public.game_completions gc
  join public.game_score_caps c on c.game = gc.game
  where gc.completed_on = (now() at time zone 'utc')::date
  group by gc.game
  having count(*) >= greatest(p_min, 1)
  order by count(*) desc, gc.game asc
  limit least(greatest(p_limit, 1), 20);
$function$;
