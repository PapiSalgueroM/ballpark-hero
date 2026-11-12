-- Soccer Perfect Season score allowlist. Apply through the release lane.
-- The engine's highest possible score is 100 after 38 wins and 114 points.
insert into public.game_score_caps (game, max_score, note)
values ('soccer-perfect-season', 100, '38-match Soccer Perfect Season; normalized points from 0 to 100')
on conflict (game) do nothing;
