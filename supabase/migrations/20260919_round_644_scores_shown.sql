-- Round 644: Soccer Career records the legacy score it shows, out of 100, and
-- every past day keeps exactly the leaderboard points it had. Player Bingo and
-- Rarity Round get the caps their recorded scores now need, and the signed in
-- tables are brought onto the same scale.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The release manager applies it
-- through the Supabase MCP after review, in the order below.
--
-- =====================================================================
-- ORDER OF OPERATIONS. PUBLISH FIRST, THEN APPLY WITH P FILLED IN.
-- =====================================================================
--   1. Publish the client that records the legacy score.
--   2. Note P, the moment the live bundle flipped to it (the first moment a
--      visitor loading the site gets the new code).
--   3. Put P into the ONE placeholder below ('SET_P_HERE', keep the quotes,
--      for example '2026-09-20 14:05:00+00') and apply this file. It refuses
--      to run while the placeholder is still there, and refuses a P that is
--      in the future or before 2026-09-19.
--   4. Rerun PART 2 on its own after a few hours and again after a few days.
--      A tab opened before P keeps recording the old formula until it
--      reloads; part 2 catches those rows and brings the signed in tables back
--      in line. It is safe to run any number of times.
--
-- NEVER RUN ANY STATEMENT OF PART 1 ON ITS OWN, outside its block. The guard
-- inside the block (the soccer-career cap still reading 1000, and no record of
-- part 1 having run) is the only thing that stops a second division of the
-- same rows. The created_at < P bound does not: a row already divided sits
-- before P too. And always follow part 1 with part 2.
--
-- WHY P SPLITS THE ROWS. Every soccer-career row written before P came from
-- the old formula (200 a Ballon d'Or, 150 a Champions League or a World Cup,
-- 50 a league title, capped at 1000), and every row written after P by the new
-- client is a legacy score from 0 to 100. The two scales overlap at 50 and 100,
-- so the value alone cannot say which is which; the time can. Rows after P
-- above 100 can only be an old tab, which is what part 2 looks for.
--
-- =====================================================================
-- WHAT WAS WRONG
-- =====================================================================
-- src/pages/SoccerCareer.tsx recorded that trophy formula on retirement while
-- the retirement screen and the share card showed the legacy score out of
-- 100. The formula never looked at where a career began, and the build editor
-- lets anyone type a 99 starting overall, so a 99 build ran to the cap on most
-- careers: 4,060 of 7,048 rows in the 30 days before sat exactly at 1000. The
-- client now records the legacy score, which knows the start (The Climb in
-- calculateLegacy: a 99 start costs 16 points).
--
-- MEASURED READ ONLY ON PRODUCTION, 2026-09-19, BEFORE WRITING THIS:
--   public.game_completions, game = 'soccer-career': 206,623 rows, 19,738
--     with a score above 0, every one a multiple of 50, none above 1000,
--     11,868 at 1000.
--   public.user_game_scores, game_type = 'soccer-career': 2,234 above 0, 3,298
--     at 0, all multiples of 50, 1,469 at 1000.
--   public.user_best_scores, game_type = 'soccer-career': 424 rows, every one
--     equal to its player's max(score) in user_game_scores; no best row without
--     plays; one player with plays and no best row (left as it is).
--   public.game_score_caps: soccer-career 1000, player-bingo NULL (all 1,966 of
--     its rows are NULL, so its view denominator is 1), rarity-round 500.
--
-- WHY THE RESCALE KEEPS EVERY LEADERBOARD POINT. The board (global_leaderboard,
-- global_rank and the player_ranks view, 20260911_leaderboard_eastern_day.sql)
-- scores a player's day as 100 * min(day best, cap) / cap. Pre-P rows become
-- round(s / 10) against a cap of 100. For any s from 0 to 1000,
--     min(round(s / 10), 100) / 100  and  min(s, 1000) / 1000
-- differ by at most 0.005, half a point on one player day, and by nothing when
-- s is a multiple of 10, which every stored row is. round is monotone, so the
-- day best of the rescaled rows is the rescale of the day best. Checked on the
-- live rows with this read only query (P stands in as now()):
--
--   with days as (
--     select gc.player_name, (gc.created_at at time zone 'America/New_York')::date as et_day,
--            max(least(gc.score, 1000))::numeric as old_best,
--            max(least(round(gc.score / 10.0)::integer, 100))::numeric as new_best
--     from public.game_completions gc
--     where gc.game = 'soccer-career' and gc.score > 0 and gc.player_name is not null
--       and gc.created_at < now()
--     group by 1, 2
--   )
--   select count(*) as player_days,
--          sum(100.0 * old_best / 1000) as old_points,
--          sum(100.0 * new_best / 100) as new_points,
--          max(abs(100.0 * old_best / 1000 - 100.0 * new_best / 100)) as worst_day_diff,
--          count(*) filter (where old_best <> new_best * 10) as days_changed
--   from days;
--
--   Result 2026-09-19: player_days 9,336, old_points 825,035.0000, new_points
--   825,035.0000, worst_day_diff 0, days_changed 0. scripts/simScoreShown.mjs
--   section 4 runs the same normalisation over the live score histogram and
--   over every integer from 0 to 3000 (control SCORE_SHOWN_CONTROL=norescale).
--
-- NO CACHED CAP TO BUST. game_denominators is a plain view over
-- game_score_caps, read live by global_leaderboard and global_rank, and the
-- materialized player_ranks is rebuilt every five minutes by the
-- refresh-player-ranks cron job (20260831_disk_io_leaderboard_cache.sql).
-- Nothing else copies a per game cap. The rescale moves no point total, so the
-- cache is right either side of its next refresh.
--
-- =====================================================================
-- THE SIGNED IN TABLES
-- =====================================================================
-- user_game_scores (one row a play) is rescaled with the same P split as
-- game_completions.
--
-- user_best_scores is NOT divided. It is rebuilt from user_game_scores as each
-- player's max(score), touching only rows that differ. Dividing it would be
-- wrong: record_auth_completion replaces a best only when the new score is
-- higher, so an old tab's 800 after P can replace a real best of 84, and ten
-- times less than 800 is 80, below the real best. The rebuild reads the rows
-- themselves, after they are on the new scale. Dry run, read only: 409 of the
-- 424 soccer-career bests change, and every rebuilt best equals both its
-- player's rescaled max(score) and the old best divided by ten (0 mismatches).
--
-- user_scores.total_points IS recomputed, as the last step of part 2, to the
-- rule the owner's decision set on 2026-09-19 (docs/PROJECT-STATE.md, the
-- inflated points item, RESOLVED that morning): one row per game per day, the
-- day's best, capped by game_denominators, summed. Measured read only just
-- before writing this, that rule (day = puzzle_date, inner join to
-- game_denominators, least(max(score), max_score)) reproduces 529 of 544
-- accounts exactly; the 15 that differ all saved after the morning's
-- recompute, because record_auth_completion still adds each save's raw score
-- to total_points. That drift is Round 648's to fix, not this file's. The
-- recompute has to run here because the rescale and the new caps change what
-- that rule gives. Dry run, read only, 2026-09-19 evening, with P standing in
-- as now(): it moves 412 of 544 accounts by 902,152 points in all, 410 of them
-- accounts with soccer-career plays (901,642 of the points), and the table
-- total from 2,181,909 to 1,279,757. For the 119 accounts with no soccer-career
-- play it gives exactly the morning's rule (119 of 119), and 117 of them hold
-- that value today (the other 2 saved since the morning). It runs after the
-- backup, and on every rerun of part 2.
--
-- Not touched: the browser's own lifetime points (src/lib/streaks.ts, backed
-- up to profiles.streak_state), which live in each browser. Rarity Round's
-- rows before Round 644 cannot be split by mode (Rarity and Crowd Says wrote
-- the same key), so they stay as stored.
--
-- BACKUP FIRST, IN THE SAME TRANSACTION. private.r644_soccer_scores_bak holds
-- the before value of every row this file changes: soccer-career game rows
-- above 0 (id, score, created_at) from game_completions and user_game_scores,
-- soccer-career bests (user_id, best_score) and every user_scores total
-- (user_id, total_points), each tagged with the part that wrote it. It lives in
-- the private schema, which the API does not serve, and anon and authenticated
-- are revoked on it anyway (CLAUDE.md database rules).

-- =====================================================================
-- P. THE ONE VALUE TO FILL IN.
-- =====================================================================
create table if not exists private.r644_state (
  id integer primary key default 1 check (id = 1),
  publish_time timestamptz not null,
  part1_done_at timestamptz
);
revoke all on private.r644_state from public, anon, authenticated;

create table if not exists private.r644_soccer_scores_bak (
  source text not null,
  row_id text,
  user_id uuid,
  value integer,
  created_at timestamptz,
  backed_up_at timestamptz not null default now()
);
revoke all on private.r644_soccer_scores_bak from public, anon, authenticated;

do $$
declare
  v_p text := 'SET_P_HERE';
  v_ts timestamptz;
  v_prior timestamptz;
begin
  if v_p = 'SET_P_HERE' then
    raise exception 'Round 644: P is still the placeholder. Publish first, then set P to the moment the live bundle flipped.';
  end if;
  v_ts := v_p::timestamptz;
  if v_ts < '2026-09-19 00:00:00+00' or v_ts > now() then
    raise exception 'Round 644: P % must be a publish time on or after 2026-09-19 and not in the future.', v_ts;
  end if;
  select publish_time into v_prior from private.r644_state where id = 1;
  if v_prior is null then
    insert into private.r644_state (id, publish_time) values (1, v_ts);
  elsif v_prior <> v_ts then
    raise exception 'Round 644: P % differs from the P % recorded when this first ran.', v_ts, v_prior;
  end if;
end $$;

-- =====================================================================
-- PART 1. RUNS ONCE. One block: the guard, the backup, the two rescales and
-- the caps. Never run a statement of it on its own.
-- =====================================================================
do $$
declare
  v_p timestamptz;
  v_done timestamptz;
  v_cap integer;
begin
  select publish_time, part1_done_at into v_p, v_done from private.r644_state where id = 1;
  if v_p is null then
    raise exception 'Round 644 part 1: no P recorded, so nothing can be split.';
  end if;
  select max_score into v_cap from public.game_score_caps where game = 'soccer-career';
  if v_done is not null then
    raise notice 'Round 644 part 1 already ran at %, skipped.', v_done;
    return;
  end if;
  /* Not run yet, but the cap has moved off the old scale: something else
     changed it, and dividing now could divide a second time. Stop and ask. */
  if v_cap is distinct from 1000 then
    raise exception 'Round 644 part 1: the soccer-career cap reads %, not 1000, so the rows may not be on the old scale any more. Nothing was changed.', v_cap;
  end if;

  insert into private.r644_soccer_scores_bak (source, row_id, value, created_at)
    select 'part1:game_completions', gc.id::text, gc.score, gc.created_at
    from public.game_completions gc
    where gc.game = 'soccer-career' and gc.score > 0;
  insert into private.r644_soccer_scores_bak (source, row_id, user_id, value, created_at)
    select 'part1:user_game_scores', s.id::text, s.user_id, s.score, s.created_at
    from public.user_game_scores s
    where s.game_type = 'soccer-career' and s.score > 0;
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part1:user_best_scores', b.user_id, b.best_score
    from public.user_best_scores b
    where b.game_type = 'soccer-career';
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part1:user_scores', u.user_id, u.total_points
    from public.user_scores u;

  /* Every row before P is the old formula, so no value filter. */
  update public.game_completions
     set score = round(score / 10.0)::integer
   where game = 'soccer-career' and score > 0 and created_at < v_p;
  update public.user_game_scores
     set score = round(score / 10.0)::integer
   where game_type = 'soccer-career' and score > 0 and created_at < v_p;

  /* The caps, each the game's real ceiling, read from the code:
       soccer-career 100: calculateLegacy clamps the legacy score to 0..100.
       player-bingo 1700: twelve lines (winningLines in src/lib/playerBingo.ts)
         at 100 each plus the 500 blackout bonus. It records from this round.
       rarity-round 500: five rounds at 100 at most. From this round only
         Rarity runs carry a score (the obscurity total, recordedRunScore in
         src/lib/rarityRound.ts); Crowd Says records a play with no score.
         Stamping this row also tells the page when the switch landed: its
         today standing counts only rows written since updated_at. */
  insert into public.game_score_caps (game, max_score, note)
  values
    ('soccer-career', 100, 'Round 644: the legacy score out of 100; history before the publish rescaled from the old 0 to 1000 formula'),
    ('player-bingo', 1700, 'Round 644: engine ceiling, 12 lines at 100 plus the 500 blackout bonus'),
    ('rarity-round', 500, 'Round 644: engine ceiling, 5 rounds at 100; only Rarity runs are ranked, higher is better')
  on conflict (game) do update
    set max_score = excluded.max_score,
        note = excluded.note,
        updated_at = now();

  update private.r644_state set part1_done_at = now() where id = 1;
end $$;

-- =====================================================================
-- PART 2. RERUNNABLE. Old tabs after P, then the bests, then the totals.
-- Run it again on its own a few hours after the publish and a few days after.
-- =====================================================================
do $$
declare
  v_p timestamptz;
begin
  select publish_time into v_p from private.r644_state where id = 1 and part1_done_at is not null;
  if v_p is null then
    raise exception 'Round 644 part 2: part 1 has not run, so there is no scale to bring anything onto.';
  end if;

  /* A soccer-career score above 100 after P can only be an old tab. */
  insert into private.r644_soccer_scores_bak (source, row_id, value, created_at)
    select 'part2:game_completions', gc.id::text, gc.score, gc.created_at
    from public.game_completions gc
    where gc.game = 'soccer-career' and gc.created_at >= v_p and gc.score > 100;
  update public.game_completions
     set score = round(score / 10.0)::integer
   where game = 'soccer-career' and created_at >= v_p and score > 100;

  insert into private.r644_soccer_scores_bak (source, row_id, user_id, value, created_at)
    select 'part2:user_game_scores', s.id::text, s.user_id, s.score, s.created_at
    from public.user_game_scores s
    where s.game_type = 'soccer-career' and s.created_at >= v_p and s.score > 100;
  update public.user_game_scores
     set score = round(score / 10.0)::integer
   where game_type = 'soccer-career' and created_at >= v_p and score > 100;

  /* Bests, rebuilt from the plays and never divided. */
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part2:user_best_scores', b.user_id, b.best_score
    from public.user_best_scores b
    join (select s.user_id, max(s.score) as best
            from public.user_game_scores s
           where s.game_type = 'soccer-career'
           group by s.user_id) m on m.user_id = b.user_id
    where b.game_type = 'soccer-career' and b.best_score is distinct from m.best;
  update public.user_best_scores b
     set best_score = m.best
    from (select s.user_id, max(s.score) as best
            from public.user_game_scores s
           where s.game_type = 'soccer-career'
           group by s.user_id) m
   where b.user_id = m.user_id
     and b.game_type = 'soccer-career'
     and b.best_score is distinct from m.best;

  /* Totals, to the 2026-09-19 rule: one row per game per day, the day's
     best, capped by game_denominators, summed. Last, after the backup. */
  create temporary table r644_totals on commit drop as
    select u.user_id,
           coalesce((
             select sum(g.best)
               from (select s.game_type, s.puzzle_date, least(max(s.score), d.max_score) as best
                       from public.user_game_scores s
                       join public.game_denominators d on d.game = s.game_type
                      where s.user_id = u.user_id
                      group by s.game_type, s.puzzle_date, d.max_score) g
           ), 0)::integer as pts
      from public.user_scores u;
  insert into private.r644_soccer_scores_bak (source, user_id, value)
    select 'part2:user_scores', u.user_id, u.total_points
    from public.user_scores u
    join r644_totals t on t.user_id = u.user_id
    where u.total_points is distinct from t.pts;
  update public.user_scores u
     set total_points = t.pts
    from r644_totals t
   where t.user_id = u.user_id
     and u.total_points is distinct from t.pts;
  drop table if exists r644_totals;
end $$;
