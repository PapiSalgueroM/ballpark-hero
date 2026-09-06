-- Round 486: 144 NBA players get their names back. APPLIED 2026-09-06.
--
-- FOUND by the site wide audit of 2026-09-06 and reproduced against production:
-- NBA Chain answered "Nikola Jokic does not appear in our NBA records
-- (1949-2024)", and the same for Luka Doncic and Nikola Vucevic, while Durant
-- and Curry resolved normally. The game was played that day.
--
-- The names are double encoded UTF-8: "Nikola JokiÄ‡", "Luka DonÄiÄ‡",
-- "Dennis SchrÃ¶der", "Dario Å ariÄ‡". Two tables carry it and every other
-- player-name table on the site is clean: 53 were censused, and the apparent
-- hits elsewhere were false positives on correctly spelled Portuguese
-- ("Ânderson Polga", "Ângelo"), which is why the detector keys on a character
-- in U+0080-U+00BF, the artifact range, and NOT on the letters Ã or Â. A repair
-- driven by the naive detector would have corrupted real names.
--   nba_player_team_stints    393 rows, 144 people   (feeds NBA Chain)
--   bref_nba_player_seasons   902 rows, 144 people   (also feeds nbaHLPlayers,
--     localLineupEval, nbaStatLine, perfectSeasonNba and statDetective, so
--     these names were being DISPLAYED broken in several other games too)
--
-- TWO corruption classes, and the naive repair throws on the second:
--   1. Plain double encoding, recovered by reading the text back as LATIN1 and
--      decoding it as UTF8.
--   2. 56 rows where the second byte was a non-breaking space that later got
--      normalised to a plain space, giving the invalid pair 0xC5 0x20. Those
--      are the Š names. Restoring the non-breaking space first recovers them:
--      Šarūnas Jasikevičius, Šarūnas Marčiulionis, Bruno Šundov, Dario Šarić.
--
-- Dry run before applying: 1,295 rows detected, 1,295 convert cleanly, 1,295
-- change. No row fails. Verified after: 0 broken rows in either table.
--
-- THIS IS ONLY HALF THE DEFECT. See 20260906_nba_stints_name_folded.sql for the
-- lookup half, without which repairing the names changes nothing for a player.
-- Fence: scripts/simNbaChainNames.mjs.
update public.nba_player_team_stints
   set player_name = convert_from(convert_to(replace(player_name, 'Å ', 'Å' || chr(160)), 'LATIN1'), 'UTF8')
 where player_name ~ ('[' || chr(128) || '-' || chr(191) || ']');

update public.bref_nba_player_seasons
   set player_name = convert_from(convert_to(replace(player_name, 'Å ', 'Å' || chr(160)), 'LATIN1'), 'UTF8')
 where player_name ~ ('[' || chr(128) || '-' || chr(191) || ']');
