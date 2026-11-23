-- All-competition first-team Liverpool appearances for both Alisson rows.
-- https://www.lfchistory.net/players/1330
-- https://www.11v11.com/players/alisson-becker-250168/
-- https://www.liverpoolfc.com/news/alisson-becker-becomes-seventh-liverpool-goalkeeper-reach-300-appearances/
do $$
declare
  expected record;
  row_id uuid;
  prior_appearances integer;
  prior_sort_order smallint;
begin
  for expected in
    select * from (values
      ('Alisson', '2018-2019', 6, 47, 51),
      ('Alisson', '2019-2020', 7, 37, 37),
      ('Alisson', '2020-2021', 8, 44, 42),
      ('Alisson', '2021-2022', 9, 55, 54),
      ('Alisson', '2022-2023', 10, 44, 47),
      ('Alisson', '2023-2024', 11, 42, 32),
      ('Alisson', '2024-2025', 12, 22, 35),
      ('Alisson Becker', '2018-2019', 6, 51, 51),
      ('Alisson Becker', '2019-2020', 7, 29, 37),
      ('Alisson Becker', '2020-2021', 8, 44, 42),
      ('Alisson Becker', '2021-2022', 9, 46, 54),
      ('Alisson Becker', '2022-2023', 10, 37, 47),
      ('Alisson Becker', '2023-2024', 11, 41, 32),
      ('Alisson Becker', '2024-2025', 12, 28, 35)
    ) as targets(player_name, season, sort_order, old_apps, new_apps)
  loop
    select s.id, s.appearances, s.sort_order
      into strict row_id, prior_appearances, prior_sort_order
      from public.career_seasons s
      join public.career_players p on p.id = s.player_id
      where p.player_name = expected.player_name
        and p.nationality = 'Brazil' and p.position = 'GK'
        and s.club = 'Liverpool' and s.season = expected.season
      for update of s;

    if prior_sort_order <> expected.sort_order
      or prior_appearances not in (expected.old_apps, expected.new_apps) then
      raise exception 'Unexpected Liverpool stint for % %: order %, appearances %',
        expected.player_name, expected.season, prior_sort_order, prior_appearances;
    end if;

    update public.career_seasons
      set appearances = expected.new_apps
      where id = row_id and appearances <> expected.new_apps;
  end loop;
end
$$;
