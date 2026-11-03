-- Round 1583, checksummed and all or nothing (written by scripts/qa/nbaConnections1583Migration.mjs from the
-- read only exports): 4 rows. Each is rewritten only while md5(groups_json::text) equals the hash exported just
-- before; the payload's own md5 is checked first; anything but 4 of 4 raises and rolls back.
do $$
declare
  payload text := $pl$[
{"t":"nba","id":"nbaconn-001","h":"741a226f858ab896f6f277b1b01f997c","n":[{"theme":"28,000+ career points","players":["Karl Malone","Kobe Bryant","Michael Jordan","Dirk Nowitzki","Carmelo Anthony"],"difficulty":"yellow"},{"theme":"Played for the Miami Heat (as of 2025-26)","players":["Dwyane Wade","Alonzo Mourning","Chris Bosh","Udonis Haslem","Tim Hardaway"],"difficulty":"green"},{"theme":"10,000+ career assists","players":["John Stockton","Jason Kidd","Steve Nash","Mark Jackson","Chris Paul"],"difficulty":"blue"},{"theme":"Drafted #1 overall","players":["Allen Iverson","Yao Ming","Dwight Howard","John Wall","Zion Williamson"],"difficulty":"purple"}]},
{"t":"nba","id":"nbaconn-002","h":"f4bdd1f09448b579989f475030e39cbd","n":[{"theme":"Played for the Chicago Bulls (as of 2025-26)","players":["Derrick Rose","Joakim Noah","Jimmy Butler","Luol Deng","Scottie Pippen"],"difficulty":"yellow"},{"theme":"2,000+ career three-pointers","players":["Stephen Curry","Ray Allen","Reggie Miller","James Harden","Klay Thompson"],"difficulty":"green"},{"theme":"Born in France","players":["Victor Wembanyama","Rudy Gobert","Ian Mahinmi","Boris Diaw","Evan Fournier"],"difficulty":"blue"},{"theme":"14,000+ career rebounds","players":["Kareem Abdul-Jabbar","Elvin Hayes","Moses Malone","Tim Duncan","Kevin Garnett"],"difficulty":"purple"}]},
{"t":"nba","id":"nbaconn-003","h":"68f8643d7b8475ebdc9863b26d520c54","n":[{"theme":"Played for the Golden State Warriors (as of 2025-26)","players":["Stephen Curry","Draymond Green","Chris Mullin","Andre Iguodala","Monta Ellis"],"difficulty":"yellow"},{"theme":"Played for the New York Knicks (as of 2025-26)","players":["Patrick Ewing","Allan Houston","Amar'e Stoudemire","Julius Randle","Derek Harper"],"difficulty":"green"},{"theme":"Born in Canada","players":["Jamal Murray","Shai Gilgeous-Alexander","Tristan Thompson","Dillon Brooks","Bennedict Mathurin"],"difficulty":"blue"},{"theme":"Drafted #2 overall","players":["Ja Morant","Brandon Ingram","Victor Oladipo","Jalen Green","Marvin Bagley III"],"difficulty":"purple"}]},
{"t":"nba","id":"nbaconn-004","h":"70104530c62fb7ab1bda54d6125e262f","n":[{"theme":"Played for the Boston Celtics (as of 2025-26)","players":["Larry Bird","Kevin McHale","Paul Pierce","Jayson Tatum","Jaylen Brown"],"difficulty":"yellow"},{"theme":"Played for the Los Angeles Lakers (as of 2025-26)","players":["James Worthy","Pau Gasol","Anthony Davis","Byron Scott","Lamar Odom"],"difficulty":"green"},{"theme":"Born in Africa","players":["Joel Embiid","Hakeem Olajuwon","Dikembe Mutombo","Serge Ibaka","Pascal Siakam"],"difficulty":"blue"},{"theme":"Played for the Sacramento Kings (as of 2025-26)","players":["Chris Webber","Peja Stojaković","Mike Bibby","De'Aaron Fox","Jason Williams"],"difficulty":"purple"}]}
]$pl$;
  rec record;
  rewritten int := 0;
  already int := 0;
  drifted text[] := '{}';
  cnt int;
begin
  if md5(payload) <> '733f60eb27f810aa95ef5fa95de40da7' then
    raise exception 'Round 1583: payload checksum mismatch, nothing applied';
  end if;
  for rec in select * from jsonb_to_recordset(payload::jsonb) as x(t text, id text, h text, n jsonb) loop
    if (rec.t = 'nba' and exists (select 1 from public.nba_connections_puzzles c where c.puzzle_id = rec.id and c.groups_json = rec.n)) then
      already := already + 1;
    else
      if rec.t = 'nba' then
      update public.nba_connections_puzzles c set groups_json = rec.n where c.puzzle_id = rec.id and md5(c.groups_json::text) = rec.h;
      else
        raise exception 'Round 1583: unknown table %', rec.t;
      end if;
      get diagnostics cnt = row_count;
      if cnt > 0 then rewritten := rewritten + 1; else drifted := drifted || (rec.t || ':' || rec.id); end if;
    end if;
  end loop;
  if rewritten + already <> 4 then
    raise exception 'Round 1583: % rewritten, % already current, drifted %: nothing applied', rewritten, already, drifted;
  end if;
  raise notice 'Round 1583: % rewritten, % already current, 0 drifted', rewritten, already;
end
$$;
