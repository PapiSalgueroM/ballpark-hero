-- Quarantine eight career season rows whose club assignment is disproven.
-- Exact replacement stats are intentionally not guessed. Each player keeps
-- the last season whose complete tuple is still supported by our records.
--
-- Rollback values are the eight tuples below. Restore one only after its club,
-- goals, assists, appearances and market value have two independent sources.

do $migration$
declare
  rejected record;
  matching_rows integer;
  removed_rows integer := 0;
  removed_this_row integer;
begin
  for rejected in
    select *
    from (values
      ('Luka Modrić', '2025-2026', 'Real Madrid', 1, 3, 20, 2, 17),
      ('Jadon Sancho', '2025-2026', 'Chelsea', 4, 3, 20, 22, 8),
      ('Angel Di María', '2025-2026', 'Benfica', 3, 5, 20, 2, 18),
      ('Darwin Núñez', '2025-2026', 'Liverpool', 12, 5, 22, 50, 6),
      ('André Onana', '2025-2026', 'Manchester United', 0, 0, 22, 25, 8),
      ('Gianluigi Donnarumma', '2025-2026', 'PSG', 0, 0, 22, 32, 10),
      ('Alejandro Garnacho', '2025-2026', 'Manchester United', 9, 6, 35, 50, 3),
      ('Rasmus Højlund', '2025-2026', 'Manchester United', 14, 5, 33, 55, 4)
    ) as rows(player_name, season, club, goals, assists, appearances, market_value, sort_order)
  loop
    select count(*)
      into matching_rows
    from public.career_seasons s
    join public.career_players p on p.id = s.player_id
    where p.player_name = rejected.player_name
      and s.season = rejected.season
      and s.club = rejected.club
      and s.goals = rejected.goals
      and s.assists = rejected.assists
      and s.appearances = rejected.appearances
      and s.market_value = rejected.market_value
      and s.sort_order = rejected.sort_order;

    if matching_rows <> 1 then
      raise exception 'Expected one exact rejected career row for %, found %',
        rejected.player_name, matching_rows;
    end if;

    delete from public.career_seasons s
    using public.career_players p
    where p.id = s.player_id
      and p.player_name = rejected.player_name
      and s.season = rejected.season
      and s.club = rejected.club
      and s.goals = rejected.goals
      and s.assists = rejected.assists
      and s.appearances = rejected.appearances
      and s.market_value = rejected.market_value
      and s.sort_order = rejected.sort_order;

    get diagnostics removed_this_row = row_count;
    removed_rows := removed_rows + removed_this_row;
  end loop;

  if removed_rows <> 8 then
    raise exception 'Expected to quarantine 8 career rows, removed %', removed_rows;
  end if;
end
$migration$;
