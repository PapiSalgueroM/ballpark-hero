insert into public.game_score_caps (game, max_score, note)
values ('closing-time', 100, 'Three fourth quarters: two points for a win, one for overtime, zero for a loss, normalized to 100')
on conflict (game) do nothing;
