-- NBA Grid report a305345d. Andre Drummond played 12:26 for the Knicks on 2026-11-04.
-- https://statsdmz.nba.com/pdfs/20261104/20261104_CHINYK_book.pdf
-- https://www.basketball-reference.com/boxscores/202611040NYK.html
-- This verifies franchise membership. The aggregate statistics remain through 2025-26.
do $migration$
declare
  current_teams text;
  updated integer;
begin
  select teams into strict current_teams
  from public.nba_player_stats
  where id = 268 and player_name = 'Andre Drummond'
    and year_from = '2012-13' and year_to = '2025-26' and position = 'C'
  for update;

  if current_teams = 'BRK,CHI,CLE,DET,LAL,NYK,PHI' then return; end if;
  if current_teams is distinct from 'BRK,CHI,CLE,DET,LAL,PHI' then
    raise exception 'Andre Drummond franchise memberships changed before the Knicks correction';
  end if;

  update public.nba_player_stats
  set teams = 'BRK,CHI,CLE,DET,LAL,NYK,PHI'
  where id = 268;
  get diagnostics updated = row_count;
  if updated <> 1 then raise exception 'Expected one Andre Drummond row updated, got %', updated; end if;
end
$migration$;
