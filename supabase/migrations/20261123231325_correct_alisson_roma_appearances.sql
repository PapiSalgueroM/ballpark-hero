-- Alisson's Roma appearance totals include every competitive match.
-- AS Roma confirms 64 total. His first season includes the Porto qualifier.
-- https://www.asroma.com/en/news/41269/transfer-agreed-for-alisson-to-join-liverpool
-- https://www.asroma.com/en/news/43033/porto-1-1-roma-giallorossi-grab-away-goal-in-hard-fought-draw
do $$
declare
  expected record;
  row_id uuid;
  prior_appearances integer;
  prior_sort_order smallint;
begin
  for expected in
    select * from (values
      ('Alisson', '2016-2017', 4, 40, 15),
      ('Alisson', '2017-2018', 5, 48, 49),
      ('Alisson Becker', '2016-2017', 4, 37, 15),
      ('Alisson Becker', '2017-2018', 5, 49, 49)
    ) as targets(player_name, season, sort_order, old_apps, new_apps)
  loop
    select s.id, s.appearances, s.sort_order
      into strict row_id, prior_appearances, prior_sort_order
      from public.career_seasons s
      join public.career_players p on p.id = s.player_id
      where p.player_name = expected.player_name
        and p.nationality = 'Brazil' and p.position = 'GK'
        and s.club = 'Roma' and s.season = expected.season
      for update of s;

    if prior_sort_order <> expected.sort_order
      or prior_appearances not in (expected.old_apps, expected.new_apps) then
      raise exception 'Unexpected Roma stint for % %: order %, appearances %',
        expected.player_name, expected.season, prior_sort_order, prior_appearances;
    end if;

    update public.career_seasons
      set appearances = expected.new_apps
      where id = row_id and appearances <> expected.new_apps;
  end loop;
end
$$;
