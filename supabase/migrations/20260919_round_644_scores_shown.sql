-- Round 644: Soccer Career records the legacy score it shows, out of 100, and
-- every past day keeps exactly the leaderboard points it had. Player Bingo and
-- Rarity Round get the caps their recorded scores now need.
--
-- NOT APPLIED BY THE ROUND THAT WROTE IT. The integrator applies it through
-- the Supabase MCP after review. Read "ORDER OF OPERATIONS" before applying.
--
-- WHAT WAS WRONG. src/pages/SoccerCareer.tsx recorded its own formula on
-- retirement: 200 a Ballon d'Or, 150 a Champions League or a World Cup, 50 a
-- league title, capped at 1000. It never looked at where the career began, and
-- the build editor lets anyone type a 99 starting overall, so a 99 build ran
-- to the cap on most careers while the retirement screen and the share card
-- showed a different number, the legacy score out of 100. The client now
-- records that legacy score, which accounts for the start (The Climb in
-- calculateLegacy: a 99 start costs 16 points, a long climb earns up to 8).
--
-- MEASURED READ ONLY ON PRODUCTION, 2026-09-19, BEFORE WRITING THIS:
--   public.game_completions, game = 'soccer-career':
--     206,623 rows, 19,738 with a score above 0.
--     Every one of the 19,738 is a multiple of 50 (the old formula can only
--     make multiples of 50), none is above 1000, and 11,868 sit at 1000.
--   public.user_game_scores, game_type = 'soccer-career': 2,234 above 0, 3,298
--     at 0, all multiples of 50, 1,469 at 1000.
--   public.user_best_scores, game_type = 'soccer-career': 409 above 0, 15 at 0,
--     all multiples of 50, 346 at 1000.
--   public.game_score_caps: soccer-career 1000, player-bingo NULL (its view
--     denominator is 1 because no row has ever held a score: all 1,966
--     player-bingo rows are NULL), rarity-round 500.
--
-- WHY THE RESCALE KEEPS EVERY POINT. The leaderboard (global_leaderboard,
-- global_rank and the player_ranks view, 20260911_leaderboard_eastern_day.sql)
-- scores a player's day as 100 * min(day best, cap) / cap. Old rows are on the
-- 0 to 1000 scale against a cap of 1000; after this they are round(s / 10)
-- against a cap of 100. For any s from 0 to 1000,
--     min(round(s / 10), 100) / 100  and  min(s, 1000) / 1000
-- differ by at most 0.005, half a leaderboard point on one player day, and by
-- exactly nothing when s is a multiple of 10, which every stored row is.
-- round is monotone, so the day best of the rescaled rows is the rescale of
-- the day best, and no day changes which row wins it. Checked on the live
-- rows, not only argued, with this read only query:
--
--   with days as (
--     select gc.player_name, (gc.created_at at time zone 'America/New_York')::date as et_day,
--            max(least(gc.score, 1000))::numeric as old_best,
--            max(least(round(gc.score / 10.0)::integer, 100))::numeric as new_best
--     from public.game_completions gc
--     where gc.game = 'soccer-career' and gc.score > 0 and gc.player_name is not null
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
--   825,035.0000, worst_day_diff 0, days_changed 0 (6,882 of those days sat
--   at the old cap). scripts/simScoreShown.mjs section 4 runs the same
--   normalisation over the live score histogram above and over every integer
--   from 0 to 1000, and its control SCORE_SHOWN_CONTROL=norescale shows what
--   setting the cap without the rescale would have done.
--
-- NO CACHED CAP TO BUST. game_denominators is a plain view over
-- game_score_caps, read live by global_leaderboard and global_rank, and the
-- materialized player_ranks is rebuilt every five minutes by the
-- refresh-player-ranks cron job (20260831_disk_io_leaderboard_cache.sql). No
-- other function or table copies a per game cap (grep of supabase/migrations
-- and src for game_denominators, game_score_caps and max_score). Since the
-- rescale moves no point total, the cache is right before and after its next
-- refresh either way.
--
-- THE SIGNED IN TABLES. record_auth_completion writes the raw score into
-- user_game_scores (one row a play) and user_best_scores (best per game, only
-- replaced by a higher number). Both are rescaled here: without it an old 800
-- best would outrank every legacy score forever, and the profile's recent
-- plays would mix two scales. user_scores.total_points is NOT touched. It is a
-- running sum of raw scores across every game, it is already known to
-- disagree with the rows it sums (19,857 points short, see
-- 20260914120000_record_auth_completion.sql), how historical points are
-- treated is an open owner decision, and Round 648 is claimed to rebuild the
-- profile total with each record clamped at its game's cap. That round reads
-- user_game_scores, which is why those rows must be on the new scale first.
--
-- ORDER OF OPERATIONS, because the client and the database do not switch at
-- the same instant. Old scale rows are always multiples of 50 from 0 to 1000,
-- new scale rows are 0 to 100, so the two overlap only at 50 and 100.
--   1. Apply this migration, then publish the client that records the legacy
--      score straight after. Part 1 runs once only (it checks the cap still
--      reads 1000, and part 3 changes it), so reapplying the file cannot divide
--      a row twice.
--   2. After the publish, run part 2 again, and once more a few days later.
--      A tab opened before the publish keeps recording the old formula until
--      it reloads; part 2 rescales any such row above 100 (it cannot be new
--      scale) and is safe to run any number of times. Until it runs, such a
--      row counts as a full 100 on its day. An old tab's 50 or 100 cannot be
--      told apart from a new score and stays as it is.
--   If the client is published first instead, new scale rows that land before
--   this runs are judged against the old cap of 1000 until it does, and any of
--   them at exactly 50 or 100 would be divided by ten by part 1.

-- Part 1. History, exactly once: only while the soccer-career cap still reads
-- 1000. Rows at 0 or NULL are left as they are.
update public.game_completions gc
   set score = round(gc.score / 10.0)::integer
 where gc.game = 'soccer-career'
   and gc.score > 0
   and (gc.score % 50 = 0 or gc.score > 100)
   and exists (select 1 from public.game_score_caps c where c.game = 'soccer-career' and c.max_score = 1000);

update public.user_game_scores s
   set score = round(s.score / 10.0)::integer
 where s.game_type = 'soccer-career'
   and s.score > 0
   and (s.score % 50 = 0 or s.score > 100)
   and exists (select 1 from public.game_score_caps c where c.game = 'soccer-career' and c.max_score = 1000);

update public.user_best_scores b
   set best_score = round(b.best_score / 10.0)::integer
 where b.game_type = 'soccer-career'
   and b.best_score > 0
   and (b.best_score % 50 = 0 or b.best_score > 100)
   and exists (select 1 from public.game_score_caps c where c.game = 'soccer-career' and c.max_score = 1000);

-- Part 2. Stragglers from a tab opened before the publish. A soccer-career
-- score above 100 can only be the old formula. Idempotent: rerun it after the
-- publish and again a few days later.
update public.game_completions
   set score = round(score / 10.0)::integer
 where game = 'soccer-career' and score > 100;

update public.user_game_scores
   set score = round(score / 10.0)::integer
 where game_type = 'soccer-career' and score > 100;

update public.user_best_scores
   set best_score = round(best_score / 10.0)::integer
 where game_type = 'soccer-career' and best_score > 100;

-- Part 3. The caps, each the game's real ceiling, read from the code:
--   soccer-career 100: calculateLegacy clamps the legacy score to 0..100.
--   player-bingo 1700: twelve lines (five rows, five columns, two diagonals,
--     winningLines in src/lib/playerBingo.ts) at 100 each, plus the 500
--     blackout bonus when all 24 tiles are filled. It records from Round 644.
--   rarity-round 500: five rounds at 100 at most, in both modes, now that
--     Rarity records its obscurity total (recordedRunScore in
--     src/lib/rarityRound.ts). Its rows before Round 644 cannot be split by
--     mode (Rarity and Crowd Says wrote the same key), so they stay as stored.
insert into public.game_score_caps (game, max_score, note)
values
  ('soccer-career', 100, 'Round 644: the legacy score out of 100; history rescaled from the old 0 to 1000 formula'),
  ('player-bingo', 1700, 'Round 644: engine ceiling, 12 lines at 100 plus the 500 blackout bonus'),
  ('rarity-round', 500, 'Round 644: engine ceiling, 5 rounds at 100; both modes record higher is better')
on conflict (game) do update
  set max_score = excluded.max_score,
      note = excluded.note,
      updated_at = now();
