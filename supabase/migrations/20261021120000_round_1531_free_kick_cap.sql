-- Round 1531: the Free Kick leaderboard cap for the new ladder. UNAPPLIED, for the release lane.
--
-- PR180 (Round 1091) moves every walled kick after the opening penalty outside the
-- area (Math.max(17, ...) in src/lib/freeKick.ts), so a flawless run pays more:
-- maxRunScore adds (distance - 11) * 6 per kick. The stored cap is 3424 (Round 433,
-- never committed as a migration; the figure is quoted in
-- 20260904_caps_allowlist_buzzer_beater.sql).
--
-- THE NUMBER IS MEASURED, NOT GUESSED, by the method of Rounds 433 and 445: the
-- highest maxRunScore over the real daily seeds. Over the 1096 dates from
-- 2026-01-01 to 2028-12-31 a flawless run pays at most 3499 on the new ladder
-- (3497 over the 800 dates from 2026-01-01), against 3448 on the old one. 1031 of
-- those 1096 days are above 3424 on the new ladder (68 were already above it on the
-- old one). An unlimited run uses a random seed and can pay up to 3523 (50000 seeds),
-- so a near flawless unlimited run is still clamped, as before. scripts/simFreeKick.mjs
-- section 6 holds this number against the ladder.
--
-- WHAT APPLYING IT CHANGES. global_leaderboard sums 100 * day_best / max_score, so
-- every Free Kick day ever played, old days included, is worth 3424 / 3499 of what it
-- was, about 2.1 percent less, and a flawless run on the new ladder is worth 100
-- again instead of being clamped there from about 97.9 percent of the way. Not
-- applying it leaves the top of the board clamped; real scores sit far below either
-- number (the skilled bot averages about 1170). The lead decides.
--
-- greatest() means applying it can never lower a cap that is already higher.
insert into public.game_score_caps (game, max_score, note)
values ('free-kick', 3499, 'Round 1531: a flawless daily run on the Round 1091 ladder. Measured over the 1096 real dates of 2026 to 2028, a flawless run pays at most 3499; unlimited runs can pay up to 3523 and are clamped.')
on conflict (game) do update
  set max_score = greatest(public.game_score_caps.max_score, excluded.max_score),
      note = excluded.note;
