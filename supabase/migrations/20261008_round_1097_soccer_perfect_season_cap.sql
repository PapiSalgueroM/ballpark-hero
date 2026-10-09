-- Round 1097: Soccer Perfect Season cap. UNAPPLIED, for the release lane.
-- The fictional challenge awards 3 points per win and 1 per draw across
-- 38 matches. Its 114-point ceiling becomes a rounded site score of 100.
-- Completion submits that normalized score, not the league points.
-- F must verify and apply this allowlist row before the game launches.
-- Preserve any existing row so its authoritative value can be reviewed.

insert into public.game_score_caps (game, max_score, note)
values ('soccer-perfect-season', 100, 'Round 1097: fictional 38-match challenge, 114 points normalized to a site score of 100')
on conflict (game) do nothing;
