-- HELD, NOT APPLIED. The body record_auth_completion(text, integer, integer)
-- takes at T0 (Round 691, the release midnight), written in Round 677 so it
-- goes through the same internals as the door, and fenced now.
--
-- It is not a migration and not in supabase/migrations on purpose: no chain
-- reader, no tool and no person should take it for a step. Round 691's T0
-- file carries it inside its own DO block, with T0's preconditions (E3b
-- applied, the release window, the save still at L1's recorded md5) in front
-- and its proofs behind.
--
-- Spec: docs/design/POINTS-ECONOMY-V2.md section 6 ("The shim"): tabs from
-- before the release keep calling this three argument function for up to
-- 14 days (Round 694 drops it). From T0 it is a claim at finish, on the
-- Eastern day, through private.play_finish (the door's own settle), with:
--   rows untagged (score_scale null), so the legacy rule values them; their
--     ranked_day is the claim day like every ranked row;
--   no add to total_points, ever (play_finish never writes it);
--   user_best_scores still written, which the old profile reads;
--   no board row: the old client inserts its own board row before it calls
--     the save, so writing one here would count every old tab play twice;
--   the score clamped to 0 .. the game's hard maximum from L1
--     (private.game_hard_max) and the clamp counted, never refused;
--   a game not in game_rules counted as "unknown game" and answered
--     {ranked: false, reason: "old client"}, nothing written;
--   the same per player advisory lock as the door, so a shim finish and a
--     door call for one player never interleave;
--   the 569 answer's keys (total_points, the streaks, games_played_today)
--     beside ranked, day and points, for any old reader.
-- The signature does not change and nothing else may carry the name: a
-- second record_auth_completion with a default makes every 3 argument call
-- ambiguous (PGRST203). simEconomyMigrations holds that (control overload).
--
-- OPEN CALL FOR ROUND 691, not decided here: in a game whose scale or rules
-- changed, the legacy period closes at the release midnight, so an old tab's
-- untagged row there is worth 0 (spec conflict 21). This body still claims at
-- finish there, so an old tab played first spends that day's ranked slot on a
-- row worth nothing, and the player's new tab plays practice that day.
-- Bounded (old tabs, 14 days, after Round 667's stale chunk reload), but
-- Round 691 may prefer the shim to answer practice without claiming when the
-- untagged row would join no open period.
--
-- REHEARSED IN PGLITE: scripts/simEconomyMigrations.mjs applies it after E3
-- and E3c and proves each point above.

create or replace function public.record_auth_completion(
  p_game_slug text,
  p_score integer,
  p_correct integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_rule public.game_rules%rowtype;
begin
  if v_user is null then
    raise exception 'record_auth_completion needs a signed in user';
  end if;
  if p_game_slug is null or length(p_game_slug) = 0 then
    raise exception 'record_auth_completion needs a game slug';
  end if;
  if length(p_game_slug) > 64 then
    raise exception 'record_auth_completion refused: a game slug is at most 64 characters, this one is %', length(p_game_slug)
      using errcode = '22023';
  end if;
  select * into v_rule from public.game_rules r where r.game = p_game_slug;
  if not found then
    perform private.play_count(p_game_slug, 'unknown game');
    return jsonb_build_object('ranked', false, 'reason', 'old client');
  end if;
  perform pg_advisory_xact_lock(hashtextextended('record_play ' || v_user::text, 0));
  return private.play_finish(v_rule.game, 'finish', v_rule.pays, v_rule.scale, gen_random_uuid(), 0,
                             p_score, p_correct, null, 'shim');
end;
$$;
revoke all on function public.record_auth_completion(text, integer, integer) from public;
revoke all on function public.record_auth_completion(text, integer, integer) from anon;
grant execute on function public.record_auth_completion(text, integer, integer) to authenticated;
