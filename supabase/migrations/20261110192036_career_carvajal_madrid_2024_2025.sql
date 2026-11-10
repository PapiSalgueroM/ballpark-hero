-- The verified 2024-2025 Real Madrid season supplies the Endrick link in Transfer Path.
-- Row and sources are recorded in scripts/data/careerCarvajalMadrid2024.json.
do $migration$
declare
  carvajal constant uuid := 'a0000001-0000-0000-0000-000000000074';
  conflicts integer;
  matching integer;
  desired record;
  current_min_steps integer;
  current_hint text;
begin
  perform 1 from public.career_players
    where id = carvajal and player_name = 'Dani Carvajal' and nationality = 'Spain' and position = 'RB'
    for update;
  if not found then
    raise exception 'Dani Carvajal career identity changed';
  end if;

  select count(*), count(*) filter (
    where season = '2024-2025' and club = 'Real Madrid' and sort_order = 12
      and appearances = 12 and goals = 1 and assists = 1 and market_value = 0
  ) into conflicts, matching
  from public.career_seasons
  where player_id = carvajal
    and (sort_order = 12 or (btrim(season) = '2024-2025' and lower(btrim(club)) = 'real madrid'));

  if conflicts <> matching or matching > 1 then
    raise exception 'Dani Carvajal has a conflicting 2024-2025 career row';
  end if;
  if (select array_agg(sort_order::integer order by sort_order)
      from public.career_seasons where player_id = carvajal and sort_order <> 12)
      is distinct from array(select generate_series(0, 11)) or not exists (
      select 1 from public.career_seasons
      where player_id = carvajal and sort_order = 11 and season = '2023-2024' and club = 'Real Madrid'
    ) then
    raise exception 'Dani Carvajal career rows changed before the Real Madrid correction';
  end if;
  if matching = 0 then
    insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order)
    values (carvajal, '2024-2025', 'Real Madrid', 1, 1, 12, 0, 12);
  end if;

  -- Only these stored entries became invalid on the new graph. The career row
  -- and the five rule entries must be on the same side of the migration.
  for desired in
    select * from (values
      ('tpa-679', 'Dani Carvajal', 'Estêvão', 'classic', 3, 'Two middle men at least. The first was at Real Madrid with Dani Carvajal; the last was at Palmeiras with Estêvão.', 2, 'One middle man does it. He was at Real Madrid with Dani Carvajal and at Palmeiras with Estêvão.'),
      ('tpa-730', 'Dani Carvajal', 'Kylian Mbappé', 'classic', 2, 'One middle man does it. He was at Real Madrid with Dani Carvajal and at PSG with Kylian Mbappé.', 1, 'Direct link. They were at Real Madrid together.'),
      ('tpa-730', 'Dani Carvajal', 'Kylian Mbappé', 'europe', 2, 'One middle man does it. He was at Real Madrid with Dani Carvajal and at PSG with Kylian Mbappé.', 1, 'Direct link. They were at Real Madrid together.'),
      ('tpa-902', 'Dani Carvajal', 'Endrick', 'classic', 2, 'One middle man does it. He was at Real Madrid with Dani Carvajal and, in another season, at Real Madrid with Endrick.', 1, 'Direct link. They were at Real Madrid together.'),
      ('tpa-902', 'Dani Carvajal', 'Endrick', 'europe', 2, 'One middle man does it. He was at Real Madrid with Dani Carvajal and, in another season, at Real Madrid with Endrick.', 1, 'Direct link. They were at Real Madrid together.')
    ) as rows(puzzle_id, player_a, player_b, rule, old_min_steps, old_hint, min_steps, hint)
    order by puzzle_id, rule
  loop
    select case desired.rule when 'classic' then p.min_steps else p.europe_min_steps end,
           case desired.rule when 'classic' then p.hint else p.europe_hint end
      into strict current_min_steps, current_hint
    from public.transfer_path_puzzles p
    where p.puzzle_id = desired.puzzle_id and p.player_a = desired.player_a and p.player_b = desired.player_b
    for update;

    if matching = 1 then
      if (current_min_steps, current_hint) is distinct from (desired.min_steps, desired.hint) then
        raise exception 'Carvajal season exists but Transfer Path % under % differs from the correction', desired.puzzle_id, desired.rule;
      end if;
    else
      if (current_min_steps, current_hint) is distinct from (desired.old_min_steps, desired.old_hint) then
        raise exception 'Transfer Path % under % changed before the Carvajal correction', desired.puzzle_id, desired.rule;
      end if;
      if desired.rule = 'classic' then
        update public.transfer_path_puzzles set min_steps = desired.min_steps, hint = desired.hint
        where puzzle_id = desired.puzzle_id;
      else
        update public.transfer_path_puzzles set europe_min_steps = desired.min_steps, europe_hint = desired.hint
        where puzzle_id = desired.puzzle_id;
      end if;
    end if;
  end loop;
end
$migration$;
