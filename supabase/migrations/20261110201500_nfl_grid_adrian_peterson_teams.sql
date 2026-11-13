-- Adrian Peterson (2007 draft, pick 7) played for New Orleans in 2017 and Tennessee and Seattle in 2021.
-- https://www.nfl.com/players/adrian-peterson/stats/career
-- https://www.neworleanssaints.com/news/john-deshazier-coach-sean-payton-calls-adrian-peterson-trade-a-win-win-19549661
-- The other Adrian Peterson (2002 draft, pick 199) is a separate Bears player.
do $migration$
declare
  target_id constant text := '00-0025394';
  old_teams constant text[] := array['ARI', 'DET', 'MIN', 'WAS'];
  new_teams constant text[] := array['ARI', 'DET', 'MIN', 'NO', 'SEA', 'TEN', 'WAS'];
  old_display constant text := 'Adrian Peterson (2007-2020)';
  new_display constant text := 'Adrian Peterson (2007-2021)';
  old_norm constant text := regexp_replace(lower(old_display), '[^a-z0-9]+', ' ', 'g');
  new_norm constant text := regexp_replace(lower(new_display), '[^a-z0-9]+', ' ', 'g');
  player public.nfl_grid_players%rowtype;
  updated integer;
begin
  select * into strict player from public.nfl_grid_players
  where id = target_id for update;

  if (player.name, player.first_season, player.pos, player.college,
      player.draft_year, player.draft_round, player.draft_pick, player.undrafted,
      player.pass4k, player.rush1k, player.rec1k, player.sb_wins, player.dup)
    is distinct from ('Adrian Peterson', 2007, array['RB'], 'Oklahoma',
      2007, 1, 7, false, 0, 8, 0, 0, true) then
    raise exception 'NFL Grid identity or career facts changed for %', target_id;
  end if;

  if (player.teams, player.last_season, player.display_name, player.name_norm)
    is not distinct from (new_teams, 2021, new_display, new_norm) then
    return;
  end if;
  if (player.teams, player.last_season, player.display_name, player.name_norm)
    is distinct from (old_teams, 2020, old_display, old_norm) then
    raise exception 'NFL Grid teams, season or label changed before the correction for %', target_id;
  end if;

  update public.nfl_grid_players
  set teams = new_teams, last_season = 2021, display_name = new_display, name_norm = new_norm
  where id = target_id;
  get diagnostics updated = row_count;
  if updated <> 1 then raise exception 'Expected one NFL Grid row updated for %, updated %', target_id, updated; end if;
end
$migration$;
