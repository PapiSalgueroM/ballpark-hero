-- Round 531 (2026-09-11), NOT APPLIED by the builder: for the desktop lane to
-- read and apply through the Supabase MCP.
--
-- The 2026 rows of player_market_values carry nine one-row club spellings
-- beside the spelling every other row of that club uses (found by the
-- players pool bake, scripts/bakePlayers.mjs, which maps clubs to leagues by
-- the table's own spelling and so could not place these nine). Each is the
-- same club as its canonical spelling, checked by the other rows at that
-- club in the same table (Sunderland AFC 24 rows, Cagliari Calcio 15,
-- Juventus FC 15 or more, Real Betis Balompié, Besiktas JK, Fenerbahce 21,
-- Kasimpasa, Fluminense Football Club 12, Deportivo de La Coruña 4). Nothing
-- here is a fact about a player: only the club string is normalised, and only
-- for the named row id, so a re-run is a no-op.
--
-- Not touched on purpose: "Liverpool FC Montevideo", the U21, U19, II, B and
-- "Atlètic" sides. Those are different teams, not spellings.

update public.player_market_values set club = 'Sunderland AFC'           where id = 176453 and year = 2026 and club = 'Sunderland';
update public.player_market_values set club = 'Cagliari Calcio'          where id = 176457 and year = 2026 and club = 'Cagliari';
update public.player_market_values set club = 'Juventus FC'              where id = 176488 and year = 2026 and club = 'Juventus';
update public.player_market_values set club = 'Real Betis Balompié'      where id = 176489 and year = 2026 and club = 'Real Betis';
update public.player_market_values set club = 'Besiktas JK'              where id = 176420 and year = 2026 and club = 'Besiktas';
update public.player_market_values set club = 'Fenerbahce'               where id = 176476 and year = 2026 and club = 'Fenerbahçe';
update public.player_market_values set club = 'Kasimpasa'                where id = 176472 and year = 2026 and club = 'Kasımpaşa';
update public.player_market_values set club = 'Fluminense Football Club' where id = 176459 and year = 2026 and club = 'Fluminense FC';
update public.player_market_values set club = 'Deportivo de La Coruña'   where id = 176480 and year = 2026 and club = 'Deportivo A Coruña';

-- After applying: node scripts/bakePlayers.mjs (Xhaka, Winks, Locatelli, Roca,
-- Ndidi, Demirbay, Hulk and Aubameyang can then resolve a league and rejoin
-- the pool where the seed names them), then node scripts/simPlayersPool.mjs.
