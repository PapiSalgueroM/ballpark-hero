-- Round 421 addendum: higher-lower-transfers joins the leaderboard allowlist.
-- APPLIED 2026-09-03.
--
-- Found by simLeaderboardCaps section 4 while gating Round 421, which was
-- otherwise unrelated to the leaderboard. The suite had been green twice
-- earlier the same night, so nothing in the code changed: what changed is that
-- somebody PLAYED the game. Two completions exist, the most recent stamped
-- 2026-09-03, and the key had no row in game_score_caps, so those points were
-- being discarded in silence.
--
-- This is the exact failure mode Round 360 accepted when it made the table the
-- authority, and it is why section 4 reads the completions table rather than
-- the source: a key can be absent from BOTH halves, and the only signal left is
-- somebody having played it. It is also worth noting where this key lives.
-- /higher-lower-transfers is routed in src/App.tsx but its entry in
-- src/data/gameRegistry.ts is commented out, so it is reachable and unlisted,
-- which is precisely the kind of page a source-derived list can miss and a
-- player can still find.
--
-- NULL denominator, not a number invented here. The scores this game can record
-- are an endless streak with no natural ceiling, and every other higher-lower
-- cap in the table already equals its own observed maximum because the cap
-- clamps what gets stored, so deriving one from the data would be circular. A
-- null falls back to the 99th percentile of its own scores, which is the
-- documented behaviour in docs/LEADERBOARD-SECURITY.md and what every game
-- allowlisted before it was played uses.
insert into public.game_score_caps (game, max_score, note)
values ('higher-lower-transfers', null, 'allowlisted Round 421 addendum after section 4 found recorded scores with no row')
on conflict (game) do nothing;
