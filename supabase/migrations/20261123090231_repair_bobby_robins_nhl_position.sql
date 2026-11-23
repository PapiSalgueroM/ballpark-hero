-- Bobby Robins played right wing in all three NHL games for Boston in 2014-15.
-- https://api-web.nhle.com/v1/gamecenter/2014020002/boxscore
-- https://api-web.nhle.com/v1/gamecenter/2014020009/boxscore
-- https://api-web.nhle.com/v1/gamecenter/2014020018/boxscore
-- https://www.eliteprospects.com/player/10502/bobby-robins
-- https://goriverhawks.com/news/2014/10/9/MICE_1009144936
-- To roll back, run with reverse_repair true before reversing either prior import repair.

do $repair$
declare
  reverse_repair constant boolean := false;
  prior_position constant text := 'C';
  verified_position constant text := 'RW';
  original text := case when reverse_repair then verified_position else prior_position end;
  desired text := case when reverse_repair then prior_position else verified_position end;
  row_id integer;
  observed text;
  core jsonb;
begin
  perform set_config('lock_timeout', '5s', true);

  begin
    select id, position, jsonb_build_array(year_from, games, goals, assists, points, plus_minus, pim)
      into strict row_id, observed, core
      from public.nhl_player_stats
      where player_name = 'Bobby Robins' and teams = 'BOS' and year_to = '2014-15'
      for update;
  exception
    when no_data_found or too_many_rows then
      raise exception 'Bobby Robins position repair: source identity mismatch';
  end;

  if core is distinct from '["2014-15",3,0,0,0,0,14]'::jsonb then
    raise exception 'Bobby Robins position repair: prior import repairs do not match';
  end if;
  if observed = desired then
    return;
  end if;
  if observed is distinct from original then
    raise exception 'Bobby Robins position repair: source position mismatch';
  end if;

  update public.nhl_player_stats
    set position = desired
    where id = row_id
    returning position into observed;
  if observed is distinct from desired then
    raise exception 'Bobby Robins position repair: write mismatch';
  end if;
end;
$repair$;
