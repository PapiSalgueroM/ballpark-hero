-- All-competition first-team Liverpool assists for both Alisson rows.
-- https://theanalyst.com/players/4096/alisson-becker/career
-- https://www.lfchistory.net/players/1330
do $$
declare
  expected record;
  row_id uuid;
  prior_assists integer;
  prior_sort_order smallint;
begin
  for expected in
    select * from (values
      ('Alisson', '2018-2019', 6, 1, 0),
      ('Alisson', '2019-2020', 7, 0, 1),
      ('Alisson', '2020-2021', 8, 0, 0),
      ('Alisson', '2021-2022', 9, 1, 1),
      ('Alisson', '2022-2023', 10, 0, 1),
      ('Alisson', '2023-2024', 11, 0, 0),
      ('Alisson', '2024-2025', 12, 0, 0),
      ('Alisson Becker', '2018-2019', 6, 1, 0),
      ('Alisson Becker', '2019-2020', 7, 0, 1),
      ('Alisson Becker', '2020-2021', 8, 0, 0),
      ('Alisson Becker', '2021-2022', 9, 0, 1),
      ('Alisson Becker', '2022-2023', 10, 0, 1),
      ('Alisson Becker', '2023-2024', 11, 0, 0),
      ('Alisson Becker', '2024-2025', 12, 0, 0)
    ) as targets(player_name, season, sort_order, old_assists, new_assists)
  loop
    select s.id, s.assists, s.sort_order
      into strict row_id, prior_assists, prior_sort_order
      from public.career_seasons s
      join public.career_players p on p.id = s.player_id
      where p.player_name = expected.player_name
        and p.nationality = 'Brazil' and p.position = 'GK'
        and s.club = 'Liverpool' and s.season = expected.season
      for update of s;

    if prior_sort_order <> expected.sort_order
      or prior_assists is null
      or prior_assists not in (expected.old_assists, expected.new_assists) then
      raise exception 'Unexpected Liverpool assist stint for % %: order %, assists %',
        expected.player_name, expected.season, prior_sort_order, prior_assists;
    end if;

    update public.career_seasons
      set assists = expected.new_assists
      where id = row_id and assists <> expected.new_assists;
  end loop;
end
$$;
