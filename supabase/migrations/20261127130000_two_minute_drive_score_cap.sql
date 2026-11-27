insert into public.game_score_caps (game, max_score, note)
values ('two-minute-drive', 100, 'Standalone possession: 100 for a win, 50 for overtime, 0 for a loss')
on conflict (game) do nothing;
