-- Round 1583 (2026-10-31): NBA Connections, the four file boards decided in place and dated.
--
-- UNAPPLIED. Written for review; the lead applies it at a release, away from midnight ET and never beside a gate
-- on live tables, after the release carrying Round 1567's matcher (src/lib/connectionsSolvedMatch.ts) and this
-- round's page and dialog is proven live. Never rehearsed on production (BEGIN ... ROLLBACK still takes the locks):
-- it is rehearsed in PGlite (scripts/qa/rehearseNbaConnections1583.mjs). Written by scripts/qa/nbaConnections1583Migration.mjs
-- from src/data/nbaConnectionsPuzzles.ts at b4a331a9cb1db7411b91538eaeaf29385d2ce3a9 (the old boards) and 4708a3d5965729156892f3e538633b2c3cfef96d (the new);
-- never edit it by hand.
--
-- What it does: rewrites, IN PLACE, the 4 rows of nba_connections_puzzles the shipped file also holds
-- (nbaconn-001 to nbaconn-004). Same puzzle_id, same sort_order, same row count, same order and colours of the four
-- groups, so dailyIndex deals the same board on the same day and nothing reshuffles. Only groups_json changes.
-- Rows nbaconn-005 to 020 (the table rows past the file) are not touched: they are Round 1586's.
--
-- Why: no NBA board had ever been held to two hosts, and one tile was false: Tony Parker sat in "Born in France"
-- on nbaconn-002 (born in Bruges, Belgium). He leaves it for Victor Wembanyama; Nicolas Batum (a season from 2,000
-- career three-pointers beside that group) leaves it for Ian Mahinmi; DeMarcus Cousins (rostered by the 2019-20
-- Lakers without a game, beside the Lakers group) leaves nbaconn-004 for De'Aaron Fox. Every club group is dated
-- "(as of 2025-26)", so a trade can never give a board a second right answer. Every member stands on two hosts
-- (scripts/data/nbaConnectionsVerified-2026-10.json).
--
-- The guard: a row is rewritten only while it still holds the base file's board (jsonb equality); the lead's
-- 2026-10-29 export held exactly that for all four (compare mode). A row that holds anything else is left alone and
-- named in a NOTICE, never overwritten blind.
--
-- A saved daily guess keeps the groups it solved as they were saved, so apply on a day this rewrites no dealt
-- board: node scripts/qa/connectionsDealtDay1583.mjs nba=<export> <YYYY-MM-DD> +40
-- To apply as one checksummed, all or nothing step: node scripts/qa/nbaConnections1583Migration.mjs checksummed nba=<export> <out.sql>
--
-- A re-run after a good apply is a no-op (no row still holds its base board).

-- nba_connections_puzzles: 4 boards (4 known old values)
do $$
declare
  rewritten int := 0;
  already int := 0;
  drifted text[] := '{}';
  missing text[] := '{}';
  r record;
begin
  create temp table r1583_nba (puzzle_id text, old_groups jsonb, new_groups jsonb) on commit drop;
  insert into r1583_nba (puzzle_id, old_groups, new_groups) values
    ('nbaconn-001', '[{"theme":"28,000+ career points","players":["Karl Malone","Kobe Bryant","Michael Jordan","Dirk Nowitzki","Carmelo Anthony"],"difficulty":"yellow"},{"theme":"Played for the Miami Heat","players":["Dwyane Wade","Alonzo Mourning","Chris Bosh","Udonis Haslem","Tim Hardaway"],"difficulty":"green"},{"theme":"10,000+ career assists","players":["John Stockton","Jason Kidd","Steve Nash","Mark Jackson","Chris Paul"],"difficulty":"blue"},{"theme":"Drafted #1 overall","players":["Allen Iverson","Yao Ming","Dwight Howard","John Wall","Zion Williamson"],"difficulty":"purple"}]', '[{"theme":"28,000+ career points","players":["Karl Malone","Kobe Bryant","Michael Jordan","Dirk Nowitzki","Carmelo Anthony"],"difficulty":"yellow"},{"theme":"Played for the Miami Heat (as of 2025-26)","players":["Dwyane Wade","Alonzo Mourning","Chris Bosh","Udonis Haslem","Tim Hardaway"],"difficulty":"green"},{"theme":"10,000+ career assists","players":["John Stockton","Jason Kidd","Steve Nash","Mark Jackson","Chris Paul"],"difficulty":"blue"},{"theme":"Drafted #1 overall","players":["Allen Iverson","Yao Ming","Dwight Howard","John Wall","Zion Williamson"],"difficulty":"purple"}]'),
    ('nbaconn-002', '[{"theme":"Played for the Chicago Bulls","players":["Derrick Rose","Joakim Noah","Jimmy Butler","Luol Deng","Scottie Pippen"],"difficulty":"yellow"},{"theme":"2,000+ career three-pointers","players":["Stephen Curry","Ray Allen","Reggie Miller","James Harden","Klay Thompson"],"difficulty":"green"},{"theme":"Born in France","players":["Tony Parker","Rudy Gobert","Nicolas Batum","Boris Diaw","Evan Fournier"],"difficulty":"blue"},{"theme":"14,000+ career rebounds","players":["Kareem Abdul-Jabbar","Elvin Hayes","Moses Malone","Tim Duncan","Kevin Garnett"],"difficulty":"purple"}]', '[{"theme":"Played for the Chicago Bulls (as of 2025-26)","players":["Derrick Rose","Joakim Noah","Jimmy Butler","Luol Deng","Scottie Pippen"],"difficulty":"yellow"},{"theme":"2,000+ career three-pointers","players":["Stephen Curry","Ray Allen","Reggie Miller","James Harden","Klay Thompson"],"difficulty":"green"},{"theme":"Born in France","players":["Victor Wembanyama","Rudy Gobert","Ian Mahinmi","Boris Diaw","Evan Fournier"],"difficulty":"blue"},{"theme":"14,000+ career rebounds","players":["Kareem Abdul-Jabbar","Elvin Hayes","Moses Malone","Tim Duncan","Kevin Garnett"],"difficulty":"purple"}]'),
    ('nbaconn-003', '[{"theme":"Played for the Golden State Warriors","players":["Stephen Curry","Draymond Green","Chris Mullin","Andre Iguodala","Monta Ellis"],"difficulty":"yellow"},{"theme":"Played for the New York Knicks","players":["Patrick Ewing","Allan Houston","Amar''e Stoudemire","Julius Randle","Derek Harper"],"difficulty":"green"},{"theme":"Born in Canada","players":["Jamal Murray","Shai Gilgeous-Alexander","Tristan Thompson","Dillon Brooks","Bennedict Mathurin"],"difficulty":"blue"},{"theme":"Drafted #2 overall","players":["Ja Morant","Brandon Ingram","Victor Oladipo","Jalen Green","Marvin Bagley III"],"difficulty":"purple"}]', '[{"theme":"Played for the Golden State Warriors (as of 2025-26)","players":["Stephen Curry","Draymond Green","Chris Mullin","Andre Iguodala","Monta Ellis"],"difficulty":"yellow"},{"theme":"Played for the New York Knicks (as of 2025-26)","players":["Patrick Ewing","Allan Houston","Amar''e Stoudemire","Julius Randle","Derek Harper"],"difficulty":"green"},{"theme":"Born in Canada","players":["Jamal Murray","Shai Gilgeous-Alexander","Tristan Thompson","Dillon Brooks","Bennedict Mathurin"],"difficulty":"blue"},{"theme":"Drafted #2 overall","players":["Ja Morant","Brandon Ingram","Victor Oladipo","Jalen Green","Marvin Bagley III"],"difficulty":"purple"}]'),
    ('nbaconn-004', '[{"theme":"Played for the Boston Celtics","players":["Larry Bird","Kevin McHale","Paul Pierce","Jayson Tatum","Jaylen Brown"],"difficulty":"yellow"},{"theme":"Played for the Los Angeles Lakers","players":["James Worthy","Pau Gasol","Anthony Davis","Byron Scott","Lamar Odom"],"difficulty":"green"},{"theme":"Born in Africa","players":["Joel Embiid","Hakeem Olajuwon","Dikembe Mutombo","Serge Ibaka","Pascal Siakam"],"difficulty":"blue"},{"theme":"Played for the Sacramento Kings","players":["Chris Webber","Peja Stojaković","Mike Bibby","DeMarcus Cousins","Jason Williams"],"difficulty":"purple"}]', '[{"theme":"Played for the Boston Celtics (as of 2025-26)","players":["Larry Bird","Kevin McHale","Paul Pierce","Jayson Tatum","Jaylen Brown"],"difficulty":"yellow"},{"theme":"Played for the Los Angeles Lakers (as of 2025-26)","players":["James Worthy","Pau Gasol","Anthony Davis","Byron Scott","Lamar Odom"],"difficulty":"green"},{"theme":"Born in Africa","players":["Joel Embiid","Hakeem Olajuwon","Dikembe Mutombo","Serge Ibaka","Pascal Siakam"],"difficulty":"blue"},{"theme":"Played for the Sacramento Kings (as of 2025-26)","players":["Chris Webber","Peja Stojaković","Mike Bibby","De''Aaron Fox","Jason Williams"],"difficulty":"purple"}]')
  ;
  for r in select distinct puzzle_id, new_groups from r1583_nba loop
    if not exists (select 1 from public.nba_connections_puzzles c where c.puzzle_id = r.puzzle_id) then
      missing := missing || r.puzzle_id;
    elsif exists (select 1 from public.nba_connections_puzzles c where c.puzzle_id = r.puzzle_id and c.groups_json = r.new_groups) then
      already := already + 1;
    else
      update public.nba_connections_puzzles c
         set groups_json = r.new_groups
       where c.puzzle_id = r.puzzle_id
         and c.groups_json in (select o.old_groups from r1583_nba o where o.puzzle_id = r.puzzle_id);
      if found then
        rewritten := rewritten + 1;
      else
        drifted := drifted || r.puzzle_id;
      end if;
    end if;
  end loop;
  drop table r1583_nba;
  raise notice 'Round 1583 nba_connections_puzzles: % boards rewritten, % already current, % drifted from every known old board (left alone): %, % not in the table: %',
    rewritten, already, coalesce(array_length(drifted, 1), 0), drifted, coalesce(array_length(missing, 1), 0), missing;
end
$$;
