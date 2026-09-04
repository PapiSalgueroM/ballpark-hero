-- Round 432, audit blocker 6: mlb_grid_players becomes a table.
--
-- It was a VIEW. Every page read from /mlb-grid and /mlb-connect-4 (four
-- pages of 1,000 rows through src/lib/gridEngine.ts, plus two autocomplete
-- legs per keystroke) recomputed all 3,264 careers from lahman_appearances
-- (110,423 rows), lahman_batting (110,495) and lahman_people (20,673): an
-- external merge sort of 4.5 MB and a five batch hash aggregate spilled to
-- disk under a 2 MB work_mem, 695 ms of CPU and 7 MB of temp per page
-- (pg_stat_statements, 867 calls, mean 700.8 ms, 772,497 temp blocks). The
-- anon role runs under statement_timeout = 3s on a shared Micro instance, so
-- whenever anything else was running the query was cancelled (SQLSTATE
-- 57014: 138 cancellations of this one query in 24 hours, 62 in a single
-- hour) and the page showed "Couldn't load MLB career data right now". The
-- cache was warm throughout (EXPLAIN: shared hit=6235, zero shared reads);
-- it was concurrency, not a cold start, and not a missing index, because
-- every scan is a whole table aggregate. The NHL and NBA siblings run the
-- identical engine against plain tables at about 35 ms with no temp.
--
-- The pool is frozen (the Lahman copy ends 2021 and the view keeps careers
-- finished by 2019), so a stored copy is exact. Same name, same eight
-- columns, same types (CREATE TABLE AS preserves them), so no line of src
-- changes and the deployed bundle keeps working. Primary key on playerid
-- (3,264 distinct, none null). The house precedent is
-- supabase/migrations/20260820_materialize_transfer_grade_pool.sql.
--
-- THIS FILE IS THE REBUILD PROCEDURE. Re-run it after a Lahman reload: it
-- drops whichever relation carries the name and rebuilds the pool from the
-- source tables. Apply it as one batch (the Supabase MCP does; psql wants
-- --single-transaction) so a failure leaves the old relation in place.
-- scripts/simMlbGridPool.mjs holds the result to the record (Ruth, Aaron,
-- Jeter), the row floor and the page's own request under a burst.
--
-- To restore the view if it is ever wanted: DROP TABLE public.mlb_grid_players;
-- then CREATE VIEW public.mlb_grid_players WITH (security_invoker = on) AS
-- followed by the SELECT below. It carried no grants beyond the default ACL
-- and nothing depended on it (pg_depend, pg_proc and cron.job were empty).
--
-- CREATE TABLE AS leaves RLS off, the 2026-07-22 lesson: enabled here with
-- the one public read policy, the same shape as nfl_grid_players.
-- Applied through the Supabase MCP on 2026-09-04; kept here as the record.

DROP VIEW IF EXISTS public.mlb_grid_players;
DROP TABLE IF EXISTS public.mlb_grid_players;

-- The view's own definition, captured with pg_get_viewdef on 2026-09-04.
CREATE TABLE public.mlb_grid_players AS
 WITH app AS (
         SELECT a.playerid,
            t.franchid,
            a.yearid,
            COALESCE(a.g_all, 0::bigint) AS g
           FROM lahman_appearances a
             JOIN lahman_teams t ON t.teamid = a.teamid AND t.yearid = a.yearid
        ), career AS (
         SELECT app.playerid,
            string_agg(DISTINCT app.franchid, ','::text) AS franchises,
            min(app.yearid) AS first_year,
            max(app.yearid) AS last_year,
            sum(app.g) AS games
           FROM app
          GROUP BY app.playerid
        ), bat AS (
         SELECT lahman_batting.playerid,
            sum(COALESCE(lahman_batting.h, 0::bigint)) AS hits,
            sum(COALESCE(lahman_batting.hr, 0::bigint)) AS hrs
           FROM lahman_batting
          GROUP BY lahman_batting.playerid
        ), pool AS (
         SELECT c.playerid,
            c.franchises,
            c.first_year,
            c.last_year,
            c.games,
            COALESCE(b.hits, 0::numeric) AS hits,
            COALESCE(b.hrs, 0::numeric) AS hrs,
            btrim((pe.namefirst || ' '::text) || pe.namelast) AS base_name
           FROM career c
             LEFT JOIN bat b ON b.playerid = c.playerid
             JOIN lahman_people pe ON pe.playerid = c.playerid
          WHERE c.last_year <= 2019 AND c.games >= 500::numeric
        ), named AS (
         SELECT p.playerid,
            p.franchises,
            p.first_year,
            p.last_year,
            p.games,
            p.hits,
            p.hrs,
            p.base_name,
            count(*) OVER (PARTITION BY (lower(p.base_name))) AS name_ct
           FROM pool p
        )
 SELECT playerid,
        CASE
            WHEN name_ct > 1 THEN ((((base_name || ' ('::text) || first_year) || '-'::text) || last_year) || ')'::text
            ELSE base_name
        END AS player_name,
    franchises,
    first_year,
    last_year,
    games,
    hits,
    hrs
   FROM named;

ALTER TABLE public.mlb_grid_players ADD PRIMARY KEY (playerid);
ALTER TABLE public.mlb_grid_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.mlb_grid_players FOR SELECT USING (true);
