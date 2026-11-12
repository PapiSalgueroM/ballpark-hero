-- NBA Grid report 469858d8. Marcus Smart played for the Rockets on 2026-10-21 and 2026-10-31.
-- https://statsdmz.nba.com/pdfs/20261021/20261021_DALHOU.pdf
-- https://www.basketball-reference.com/boxscores/202610210HOU.html
-- https://statsdmz.nba.com/pdfs/20261031/20261031_OKCHOU.pdf
-- https://www.nba.com/watch/video/marcus-smart-presser-full-10
-- His Lakers appearance: https://statsdmz.nba.com/pdfs/20251110/20251110_LALCHA_book.pdf
-- This adds franchise membership while retaining the stored 2025-26 career statistics snapshot.
do $migration$
declare
  current_teams text;
  updated integer;
begin
  select teams into strict current_teams
  from public.nba_player_stats
  where id = 557 and player_name = 'Marcus Smart'
    and year_from = '2014-15' and year_to = '2025-26' and position = 'G'
  for update;

  if current_teams = 'BOS,HOU,LAL,MEM,WAS' then return; end if;
  if current_teams is distinct from 'BOS,LAL,MEM,WAS' then
    raise exception 'Marcus Smart franchise memberships changed before the Rockets correction';
  end if;

  update public.nba_player_stats
  set teams = 'BOS,HOU,LAL,MEM,WAS'
  where id = 557;
  get diagnostics updated = row_count;
  if updated <> 1 then raise exception 'Expected one Marcus Smart row updated, got %', updated; end if;
end
$migration$;
