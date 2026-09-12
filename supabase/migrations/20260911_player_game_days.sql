-- Round 539: the achievement case counts game DAYS, because rows were never finishes.
--
-- Round 527 shipped an achievement case derived from public.game_completions,
-- and the adversarial pass found three separate ways that was wrong. All three
-- are fixed by asking the database a different question, which is what this
-- function is.
--
-- WHAT WAS WRONG, measured on production rather than argued.
--
-- 1. THE ROWS ARE AN ACTIVITY LOG, NOT A LIST OF FINISHES. recordActivity in
--    src/lib/completions.ts inserts a row per CLUB MANAGER MATCH and per
--    SOCCER CAREER SEASON, not per session. Site wide, 376,818 rows collapse
--    to 25,182 distinct (player, game, Eastern day) triples, a factor of 15.
--    At the top of the table one handle holds 6,440 rows against 121 real
--    game days, a factor of 53. So "Finish 1,000 games" was reachable off a
--    single Club Manager save, and it was the round's legendary tile.
--
-- 2. THE CLIENT READ THE MOST RECENT 1,000 ROWS. Every fact was therefore
--    computed over a sliding window that moves as a player keeps playing, so
--    achievements UN EARNED themselves: nine tiles, both hidden ones among
--    them, disappear from a real history once a thousand newer rows land in
--    front of them. The file's own comment promised the opposite, that
--    "playing more can never take one back off you". Counting deduplicated
--    days instead shrinks the deepest player on the site from 6,440 rows to
--    121 pairs, so no cap is doing any work any more and the counts are exact.
--
-- 3. THE DAY WAS A UTC DAY. completed_on defaults to
--    ((now() AT TIME ZONE 'utc'))::date, which the Round 537 migration already
--    measured as wrong for 20.3% of completions: every play from 20:00 to
--    23:59 Eastern files to the next day. That over credited "play on ten
--    different days" and under credited "ten different games in a single day",
--    which is the same defect pointing in two directions at once. The Eastern
--    day comes from created_at here, exactly as Round 537 does it, so the two
--    surfaces finally agree on when a day is.
--
-- WHAT THIS RETURNS AND WHY IT IS SHAPED THIS WAY. One row per distinct
-- (game, Eastern day) the player has. The sport a game belongs to lives in
-- src/data/gameRegistry.ts and nowhere in this database, so the mapping stays
-- on the client; handing back the pairs rather than a pre-aggregated count is
-- what lets the client answer "most sports in one day" without the registry
-- ever having to exist in SQL. The pairs are tiny: 121 rows for the deepest
-- player on the site today.
--
-- COST. game_completions is the table Round 370 exists for, after global_rank
-- burned 1.9 billion buffer blocks and tripped the Disk IO budget, so this is
-- deliberately cheap: one equality on player_name, which the leading column of
-- idx_game_completions_player_day already covers (read off pg_indexes rather
-- than assumed), and the grouping runs over that one player's rows alone.
-- It is called once per own profile view.

create or replace function public.player_game_days(p_player text)
 returns table(game text, et_day date)
 language sql
 stable
 security invoker
 set search_path to 'public'
as $function$
  select gc.game, (gc.created_at at time zone 'America/New_York')::date as et_day
  from public.game_completions gc
  where gc.player_name = p_player
    and gc.game is not null
  group by gc.game, (gc.created_at at time zone 'America/New_York')::date
  order by et_day desc, gc.game
  /* A ceiling far above anything real, so a pathological handle cannot make a
     profile page slow. The deepest player on the site is at 121. If this ever
     truncates anybody, the counts become a floor rather than a lie, and they
     still only ever grow. */
  limit 5000;
$function$;

comment on function public.player_game_days(text) is
  'Round 539. Distinct (game, Eastern day) pairs for one player, for the profile achievement case. Read only. See supabase/migrations/20260911_player_game_days.sql for why rows are not finishes.';

revoke all on function public.player_game_days(text) from public;
grant execute on function public.player_game_days(text) to anon, authenticated, service_role;
