-- The verified 2015 New York City FC season supplies the Villa link in Transfer Path.
-- Row and sources are recorded in scripts/data/careerLampardNycfc2015.json.
do $migration$
declare
  lampard constant uuid := 'a0000001-0000-0000-0000-000000000133';
  conflicts integer;
  matching integer;
begin
  perform 1 from public.career_players
    where id = lampard and player_name = 'Frank Lampard'
    for update;
  if not found then
    raise exception 'Frank Lampard career identity changed';
  end if;

  select count(*), count(*) filter (
    where season = '2015' and club = 'New York City FC' and sort_order = 13
      and appearances = 10 and goals = 3 and assists = 1 and market_value = 0
  ) into conflicts, matching
  from public.career_seasons
  where player_id = lampard
    and (sort_order = 13 or (season = '2015' and club = 'New York City FC'));

  if conflicts = 1 and matching = 1 then
    return;
  end if;
  if conflicts <> 0 or
    (select array_agg(sort_order::integer order by sort_order) from public.career_seasons where player_id = lampard)
      is distinct from array(select generate_series(0, 12)) or
    not exists (
      select 1 from public.career_seasons
      where player_id = lampard and sort_order = 12 and season = '2013-2014' and club = 'Chelsea'
    ) then
    raise exception 'Frank Lampard career rows changed before the NYCFC correction';
  end if;

  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order)
  values (lampard, '2015', 'New York City FC', 3, 1, 10, 0, 13);
end
$migration$;
