-- Round 481: "Most Played Today" counts people, not rows. APPLIED 2026-09-06.
--
-- The home page's first section under the hero says "most played today". The
-- function behind it ranked by count(*) over game_completions, and the season
-- simulations record a completion per season, so one person leaving Club
-- Manager running outranked a game hundreds of people really played and the
-- section quietly became a list of which simulations somebody had left open.
--
-- MEASURED on 2026-09-06 before the change:
--   9,822 completion rows that day, from 185 distinct players.
--   club-manager      4,469 rows from   32 people
--   soccer-career     4,391 rows from  131 people
--   mlb-front-office    434 rows from    2 people   <- third on the home page
-- Ranked by people it reads soccer-career 131, club-manager 32, nba-my-career
-- 10, which is what the section claims to show. Over the previous 21 days,
-- 194,161 of 276,577 completions (70 percent) came from sessions where one
-- player recorded 50 or more of one game in one day, every one of them a
-- season simulation, so this was not a rare skew.
--
-- p_min is now a floor on PEOPLE rather than on rows, which is what the caller
-- always meant: a game two people played is not "most played". player_name is
-- set on every row (9,822 of 9,822 that day), so counting it distinctly loses
-- nothing.
--
-- scripts/simMostPlayed.mjs is the fence, and it had to be written against the
-- live database because the defect lived there and no source check could see
-- it. Control: MOST_PLAYED_CONTROL=rows.
create or replace function public.most_played_today(p_min integer default 3, p_limit integer default 3)
returns table (game text, plays bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select gc.game, count(distinct gc.player_name) as plays
  from public.game_completions gc
  join public.game_score_caps c on c.game = gc.game
  where gc.completed_on = (now() at time zone 'utc')::date
  group by gc.game
  having count(distinct gc.player_name) >= greatest(p_min, 1)
  order by count(distinct gc.player_name) desc, gc.game asc
  limit least(greatest(p_limit, 1), 20);
$$;
