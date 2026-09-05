-- Round 458: the Player Stock Market opens in a past season and needs, for
-- that one season, every row whose player the table still tracks in the
-- latest full season, with that latest value beside it. PostgREST cannot
-- join a table to itself, so the Round 329 engine read eight whole seasons
-- and the latest one to find the overlap: measured through its real fetch
-- on 2026-09-05, 39 to 42 paged requests and 6.6 to 7.2 MB (37,528 to
-- 40,652 rows, 9.5 to 11.7 seconds) before a single card could be dealt.
-- This view IS the overlap: 431 rows for a 2015 start, 2,191 for 2022.
--
-- The latest full season is the newest year carrying at least 1,000 rows,
-- so a partial load of next year's rows (fifty names) cannot shrink the pool
-- to those fifty; the season only moves when it is really there.
-- One row per start season row: DISTINCT ON keeps one latest row per name
-- (the dearest) so a duplicated name in the latest season cannot double a
-- row here. Read only, security_invoker so the base table's public read
-- policy is what applies. Measured before creation: 87 ms for 2022 (2,191
-- rows, parallel hash join, every buffer a cache hit); through the anon
-- REST path afterwards, 0.35 to 0.40 s and 24 KiB gzipped for the same
-- season. The security advisor after creation showed only the standard
-- GraphQL exposure note every public view on the project carries.
-- Applied through the Supabase MCP on 2026-09-05; kept here as the record.

CREATE OR REPLACE VIEW public.player_market_tracked WITH (security_invoker = true) AS
WITH latest AS (
  SELECT year FROM public.player_market_values
  GROUP BY year HAVING count(*) >= 1000
  ORDER BY year DESC LIMIT 1
), final AS (
  SELECT DISTINCT ON (player_name) player_name, year, market_value_usd
  FROM public.player_market_values
  WHERE year = (SELECT year FROM latest) AND market_value_usd > 0
  ORDER BY player_name, market_value_usd DESC, id DESC
)
SELECT a.id, a.rank, a.player_name, a.position, a.age, a.nationality, a.club,
       a.market_value_usd, a.matches, a.year, a.goals, a.assists, a.yellow_cards, a.red_cards,
       f.year AS final_year, f.market_value_usd AS final_value_usd
FROM public.player_market_values a
JOIN final f ON f.player_name = a.player_name;

GRANT SELECT ON public.player_market_tracked TO anon, authenticated;
