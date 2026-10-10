-- Round 1145: Stat Detective showed a "Career span" built only from the seasons
-- the page fetches, and it fetches rows with minutes >= 500. A season under 500
-- minutes did not exist for it, so a man who faded out on the bench lost the end
-- of his career on screen. A player reported one on 2026-10-09 (shown 1990-1996,
-- real rows 1989-90 to 2000-01). Measured read only that morning:
-- bref_nba_player_seasons holds 30,462 rows and 4,774 names, the page reads
-- 19,938 of them, and 1,845 of 2,973 profiles showed a span that was not the
-- career (1,432 ended too early, 816 started too late).
--
-- This view is the career of each MAN, not of each name. The first draft of it
-- grouped by player_name alone, and a review caught what that does: two men can
-- share a name, the table has no person key (person_key is null on every row),
-- and a namesake with 38 minutes in 1977-78 would have stretched a famous
-- 1992-2001 career back to 1978. So a row is one name AND one cohort:
--
--   cohort     the year the season started minus the age the source lists for
--              it. One man has one cohort (he is a year older every season), so
--              two men who share a name land in two rows. null when the row has
--              no age. The page calls two cohorts of one name the same man when
--              they sit within two years of each other.
--   rows_500   how many of those rows have minutes >= 500. The page builds its
--              guessable profiles from exactly those rows, so this says which of
--              the men behind a name the profile is actually about. A namesake
--              with rows_500 = 0 never touches the profile's span.
--   teams      every team code the man has a row for, comma separated. The
--              "Career franchises" clue and the shared franchise chip read it,
--              so a nine game stint counts as having played there.
--
-- The first four columns are the first draft's, in the same order and types, so
-- create or replace works whether or not that draft was ever applied. A row
-- whose season is not text like '1989-90' is no season and is left out. season
-- is text, so min and max sort in season order. Read by the page in pages of
-- 1000 ordered by (player_name, cohort), which is unique. Read only,
-- security_invoker so the base table's public read policy is what applies.
--
-- The 500 below is MIN_MINUTES in src/lib/statDetective.ts;
-- src/test/statDetectiveSpans.test.tsx fails if the two ever differ.
--
-- NOT APPLIED BY THE BUILDER. The lead applies it before the page that reads it
-- ships; without it the page fails closed into its retry state. The SQL was run
-- against a fixture table in an embedded Postgres by
-- scripts/qa/rehearseCareerSpansView.mjs, never against the live project.
--
-- Read only checks for the lead after applying (expected answers in the round's
-- report): select count(*), count(*) filter (where cohort is null) from
-- public.bref_nba_career_spans;

create or replace view public.bref_nba_career_spans with (security_invoker = true) as
  select player_name,
         min(season) as first_season,
         max(season) as last_season,
         count(*)::int as rows,
         cohort,
         (count(*) filter (where minutes >= 500))::int as rows_500,
         string_agg(distinct team, ',') as teams
  from (
    select player_name, season, team, minutes,
           (case when season ~ '^[0-9]{4}-[0-9]{2}$' then left(season, 4)::int end - age)::int as cohort
    from public.bref_nba_player_seasons
    where player_name is not null and season ~ '^[0-9]{4}-[0-9]{2}$'
  ) as seasons
  group by player_name, cohort;
grant select on public.bref_nba_career_spans to anon, authenticated;
