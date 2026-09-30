-- Round 706: nfl_draft_picks, the repeated drafts, the placeholder rows and the unparsed rounds.
--
-- NOT APPLIED. Written 2026-09-30 from read only SELECTs; the desktop lane applies it through the
-- Supabase MCP. Fence: scripts/simCollegeTables.mjs, which mirrors every step below on a pull of the
-- live table, requires the counts to equal the constants in this file, and requires the result to
-- pass every check (so it is green before this lands and after).
--
-- No foreign key points at this table (checked in pg_constraint), so nothing is repointed.
--
-- STEP 1, EXACT COPIES. A row with a lower id twin equal in every column but id (year, round, pick,
--   player_name, position, team, college) is deleted; the lowest id stays. Measured: 500 groups, 1,000
--   rows. The 2024 draft was loaded three times (254 slots three times over, identical) and so was
--   2025 (240 slots), plus the forfeit rows loaded with them (2024 pick 85, 2025 picks 148 and 151).
--   Sample: 2024 held 770 rows for 257 picks and 2025 held 747; after steps 1 and 2 each holds 257,
--   one per pick (read back below).
--
-- STEP 2, PLACEHOLDER ROWS. A row whose player_name mentions a forfeit, or that has no position and
--   no college, is a sentence about a pick, not a player: "Selection forfeited", "The Seattle
--   Seahawks forfeited their 1978 fourth round pick...", "Selection moved down 12 spots" (2017 pick
--   128), "no pick, penalized by NFL for staging illegal workouts..." (1978 pick 89), and the 1990
--   Dallas row at pick 0. Measured: 77 such rows, 71 left after step 1, and no player row lacks both a
--   position and a college. Every one shares its slot with the real pick or sits at pick 0, so no
--   pick is lost. scripts/lib/draftRounds.mjs isPlaceholderDraftRow is the same rule in code.
--
-- STEP 2b, THE 13 INVENTED 1977 ROWS. The 1977 tail (picks 280 to 335) was copied from Wikipedia's
--   draft article, and 13 of its rows are vandalism that article still carried on 2026-09-30 at 12 of
--   the 13 picks: paired surnames with generic first names ("Adam Dzierdzik" and "Anthony Dzierdzik",
--   "Kyle Ecke" and "Elliot Ecke", two Venderveens), "Wide Reciaver", "Defensive Line Men", and a team
--   called "Baltimore Fatsos", the only team string in the table that no NFL club ever had. Two
--   sources on two organisations, drafthistory.com (index.php/years/1977) and profootballarchives.com
--   (drafts/1977nfldraft.html), read 2026-09-30, agree on who was really taken at every one of the 13
--   picks, and neither is any of these names:
--     id 14568  pick 280  "Sammy Strock"        (record: Chuck Rodgers, Buccaneers, DB, North Dakota State)
--     id 14569  pick 281  "John Bafia"          (record: Bill Westbeld, Seahawks, T, Dayton)
--     id 14608  pick 320  "Adam Dzierdzik"      (record: Dave Greenwood, Lions, G, Iowa State)
--     id 14610  pick 322  "Kyle Ecke"           (record: Terry Irving, Bears, DB, Jackson State)
--     id 14611  pick 323  "Stephen Aragon"      (record: Scott Martin, 49ers, G, North Dakota)
--     id 14612  pick 324  "Ethan Ranney"        (record: Scott Levenhagen, Broncos, TE, Western Illinois)
--     id 14613  pick 325  "Anthony Dzierdzik"   (record: Leo Tierney, Browns, C, Georgia Tech)
--     id 14614  pick 326  "Ethan Venderveen"    (record: Alex Percival, Bengals, WR, Morehouse)
--     id 14615  pick 327  "Justin Venderveen"   (record: Curtis Kirkland, Redskins, DE, Missouri)
--     id 14616  pick 328  "Elliot Ecke"         (record: Rick Fenlaw, Cardinals, LB, Texas)
--     id 14617  pick 329  "Charlie Kirk"        (record: I.V. Wilson, Seahawks, DT, Tulsa)
--     id 14618  pick 330  "Benedict Fernzi"     (record: Barry Caudill, Rams, C, Southern Mississippi)
--     id 14619  pick 331  "Jakob Cepon"         (record: Bill Deutsch, Colts, RB, North Dakota)
--   They are deleted by (id, player_name), not replaced: the real picks go in only when a round
--   inserts them from both sources (docs/audits/college-tables-2026-09-30.md has the record). The
--   other 43 rows of the tail match both sources. Deleting the 13 leaves 1977's tail 43 rows for 56
--   picks, so step 3's one row per pick condition fails for 1977 and its 43 rows get round NULL (known
--   not to be the first round, not guessed), the same treatment as 1982. Eight of the 13 sat in the
--   College Grid key as draft-only entries (scripts/data/collegeGridPlayers.json, "draft:1977-320" and
--   the rest), so that key and nfl_grid_players are both regenerated after this lands.
--
-- STEP 3, ROUNDS. The scrape saved an unparsed round as 1. Rounds 2 and later are internally
--   consistent, so where round two starts is where round one ends, and a row filed round 1 at a pick
--   past that point is known to be wrong. Measured: 1,936 such rows in 12 drafts. For each:
--     a = the parsed round block (round 2 or later) just below its pick, b = the one just above.
--     GAP (a and b): the picks between them are rounds a+1 to b-1 when both blocks hold the same
--       number of picks S and the gap is exactly (b - a - 1) times S picks with one row per pick.
--     TAIL (a, no b): the picks after a are the rounds after it when a and the parsed round below it
--       hold the same S picks, and the tail is a whole number of S with one row per pick.
--     Then round = a + 1 + (pick - last pick of a - 1) / S. Anything else, or a draft whose parsed
--     blocks are not one row per pick (1939, 1941, 1956, 1984, 1994), gets round NULL: known not to
--     be the first round, and not guessed.
--   Measured: 1,653 derived (1946 230, 1950 299, 1970 130, 1971 156, 1972 234, 1973 182, 1974 130,
--   1975 208, 1976 84) and 270 set NULL (1941 144, 1977 43, 1982 83). 1977 would have derived 56
--   rounds, and would have been right about them (drafthistory.com: round 11 is 280 to 307, round 12
--   is 308 to 335), but only because the 13 invented rows filled its picks; see step 2b.
--   Sample checks, the derivation against the record (drafthistory.com draft pages, and Wikipedia's
--   draft articles as the spot check, both read 2026-09-30):
--     1976 pick 472, Pat McNeil: round 17 (drafthistory.com: round 17, pick 472; round 15 starts at
--       404; the draft ends at 487, round 17; Wikipedia: 17 rounds, 487 picks).
--     1970 pick 313 round 13 (Billy Main) and pick 442 round 17 (Rayford Jenkins): drafthistory.com.
--     1971 to 1975: 17 rounds of 26, 442 picks each year (drafthistory.com's round tables and each
--       year's Wikipedia draft article, both read 2026-09-30), so round r is picks 26(r-1)+1 to 26r.
--       The derivation agrees at every pick checked: 1971 200 round 8 (Ted Gregory), 300 round 12,
--       400 round 16 (Glenn Tucker), 442 round 17 (Charles Hill); 1972 150 round 6 (Curt Watson), 250
--       round 10 (Mike Franks), 350 round 14, 440 and 442 round 17 (Dick Schmalz, Alphonso Cain); 1973
--       260 round 10, 330 round 13 (Alan Kelso), 400 round 16 (Ken Muhlbeier), 442 round 17; 1974 320
--       round 13, 380 round 15 (Ransom Terrell), 440 and 442 round 17 (Willie Townsend, Ken
--       Dickerson); 1975 240 round 10 (Hank Englehardt), 300 round 12 (Andre Roundtree), 380 round 15
--       (Brison Manor), 442 round 17 (Stan Hegener). The names in parentheses are the table's rows at
--       those picks and drafthistory.com's; where a name is left out the two disagree on the player
--       (1972 pick 350: the table has Ed Rideout, drafthistory.com has Don Zimmerman, whom the table
--       files at 300), which is a player question for another round, not a round question.
--     1946 pick 51 round 7, pick 280 round 29, pick 281 round 30: drafthistory.com.
--     1950 pick 93 round 8, pick 391 round 30: Wikipedia (30 rounds, 391 picks).
--     1982 is why a tail must divide: drafthistory.com has round 10 at 252 to 279, round 11 at 280 to
--       306 (27 picks) and round 12 at 307 to 334, so a flat 28 per round would have filed 307 to 334
--       one round early. Its 83 rows are set NULL here; those three blocks can be written once a second
--       source agrees.
--
-- LEFT ALONE, on purpose:
--   * 23 drafts with no parsed round 2 at all (1942 to 1945, 1949, 1951 to 1955, 1957 to 1969; 7,567
--     rows, every one filed round 1). Which of their picks were the first round is not in the table,
--     and nulling them would erase the real first rounders with the false ones. They need each year's
--     round size from two sources. nfl_grid_players judges 292 players from these years "First Round
--     Pick" (262 of them past pick 16) and 275 more past the boundary of the drafts this file fixes;
--     that table is regenerated from this one (scripts/genNflGridData.mjs).
--   * 5 slots holding two DIFFERENT players: 1941 pick 38 (Ray Frick, Charlie O'Rourke), 1953 pick 50
--     (Charlie Ane, Jack Little), 1956 pick 342 (Wes Thompson, Bob Hughes), 1956 pick 346 (Jim Nelson,
--     Billy Krietemeyer), 1984 pick 230 (Zack Barnes, Bruce Kozerski). One of each pair is at the wrong
--     pick, and which one needs a source. Deleting either would delete a real draftee.
--   * The mirrored names ("Last, FirstFirst Last"), the HOF and trailing number suffixes. Readers
--     already read them as names (genCollegeGridData readDraftName).
--
-- AFTER THIS LANDS. cleanDraftPicks returns the same rows minus exactly the 13 invented ones, with the
-- same round one boundaries (the fence proves both), so the College Grid key loses its eight 1977
-- draft-only entries and nothing else: regenerate scripts/data/collegeGridPlayers.json.
-- scripts/genNflGridData.mjs --check will differ: the triple loads defeated its "exactly one row" rule
-- for 2024 and 2025 draftees, and the derived rounds change draft_round for the late picks it copied
-- as round 1. Regenerate nfl_grid_players after.
--
-- FAILS CLOSED. Every count is checked against the constant it was measured at; any difference
-- raises, and the whole block changes nothing.

do $migration$
declare
  expected_rows_before     constant integer := 28015;
  expected_exact_copies    constant integer := 1000;
  expected_placeholders    constant integer := 71;
  expected_invented        constant integer := 13;
  expected_rounds_derived  constant integer := 1653;
  expected_rounds_unknown  constant integer := 270;
  expected_rows_after      constant integer := 26931;
  n integer;
begin
  select count(*) into n from public.nfl_draft_picks;
  if n <> expected_rows_before then
    raise exception 'Round 706: nfl_draft_picks holds % rows, measured %. Nothing was changed.', n, expected_rows_before;
  end if;

  -- STEP 1
  delete from public.nfl_draft_picks d
   using public.nfl_draft_picks k
   where k.id < d.id
     and k.year = d.year
     and k.round is not distinct from d.round
     and k.pick is not distinct from d.pick
     and k.player_name = d.player_name
     and k.position is not distinct from d.position
     and k.team is not distinct from d.team
     and k.college is not distinct from d.college;
  get diagnostics n = row_count;
  if n <> expected_exact_copies then
    raise exception 'Round 706: step 1 deleted % exact copies, measured %. Nothing was changed.', n, expected_exact_copies;
  end if;

  -- STEP 2
  delete from public.nfl_draft_picks
   where player_name ~* 'forfeit'
      or (nullif(btrim(position), '') is null and nullif(btrim(college), '') is null);
  get diagnostics n = row_count;
  if n <> expected_placeholders then
    raise exception 'Round 706: step 2 deleted % placeholder rows, measured %. Nothing was changed.', n, expected_placeholders;
  end if;

  -- STEP 2b
  delete from public.nfl_draft_picks
   where year = 1977
     and (id, player_name) in (
       (14568, 'Sammy Strock'), (14569, 'John Bafia'), (14608, 'Adam Dzierdzik'), (14610, 'Kyle Ecke'),
       (14611, 'Stephen Aragon'), (14612, 'Ethan Ranney'), (14613, 'Anthony Dzierdzik'),
       (14614, 'Ethan Venderveen'), (14615, 'Justin Venderveen'), (14616, 'Elliot Ecke'),
       (14617, 'Charlie Kirk'), (14618, 'Benedict Fernzi'), (14619, 'Jakob Cepon'));
  get diagnostics n = row_count;
  if n <> expected_invented then
    raise exception 'Round 706: step 2b deleted % invented 1977 rows, measured %. Nothing was changed.', n, expected_invented;
  end if;

  -- STEP 3
  create temporary table r706_rounds on commit drop as
  with blocks as (
    select year, round, min(pick) as lo, max(pick) as hi, count(distinct pick) as n, count(*) as c
      from public.nfl_draft_picks where round >= 2 group by year, round
  ),
  bad_years as (
    select year from blocks where n <> hi - lo + 1 or c <> n
    union
    select b1.year from blocks b1 join blocks b2 on b1.year = b2.year and b1.round < b2.round and b1.hi >= b2.lo
  ),
  r1_end as (select year, lo - 1 as r1_end from blocks where round = 2),
  unparsed as (
    select p.id, p.year, p.pick from public.nfl_draft_picks p join r1_end e on e.year = p.year
     where p.round = 1 and p.pick > e.r1_end
  ),
  placed as (
    select u.id, u.year, u.pick, a.round as a_round, a.hi as a_hi, a.n as a_n,
           b.round as b_round, b.lo as b_lo, b.n as b_n, pa.n as pa_n, y.max_pick
      from unparsed u
      left join lateral (select round, hi, n from blocks x where x.year = u.year and x.hi < u.pick order by x.hi desc limit 1) a on true
      left join lateral (select round, lo, n from blocks x where x.year = u.year and x.lo > u.pick order by x.lo asc limit 1) b on true
      left join lateral (select n from blocks x where x.year = u.year and x.round < a.round order by x.round desc limit 1) pa on true
      join (select year, max(pick) as max_pick from public.nfl_draft_picks group by year) y on y.year = u.year
  ),
  segments as (
    select year, a_round, count(*) as rows_in, count(distinct pick) as picks_in from placed group by year, a_round
  )
  select p.id,
         case when p.year in (select year from bad_years) or p.a_round is null then null
              when p.b_round is not null and p.a_n = p.b_n and p.b_round - p.a_round - 1 >= 1
                   and p.b_lo - 1 - p.a_hi = (p.b_round - p.a_round - 1) * p.a_n
                   and s.rows_in = p.b_lo - 1 - p.a_hi and s.picks_in = s.rows_in
                then p.a_round + 1 + (p.pick - p.a_hi - 1) / p.a_n
              when p.b_round is null and p.pa_n = p.a_n and p.max_pick - p.a_hi >= p.a_n
                   and (p.max_pick - p.a_hi) % p.a_n = 0
                   and s.rows_in = p.max_pick - p.a_hi and s.picks_in = s.rows_in
                then p.a_round + 1 + (p.pick - p.a_hi - 1) / p.a_n
              else null end as new_round
    from placed p join segments s on s.year = p.year and s.a_round is not distinct from p.a_round;

  select count(*) into n from r706_rounds where new_round is not null;
  if n <> expected_rounds_derived then
    raise exception 'Round 706: step 3 derives % rounds, measured %. Nothing was changed.', n, expected_rounds_derived;
  end if;
  select count(*) into n from r706_rounds where new_round is null;
  if n <> expected_rounds_unknown then
    raise exception 'Round 706: step 3 leaves % rounds unknown, measured %. Nothing was changed.', n, expected_rounds_unknown;
  end if;

  update public.nfl_draft_picks p set round = r.new_round from r706_rounds r where r.id = p.id and p.round = 1;
  get diagnostics n = row_count;
  if n <> expected_rounds_derived + expected_rounds_unknown then
    raise exception 'Round 706: step 3 updated % rows, expected %. Nothing was changed.', n, expected_rounds_derived + expected_rounds_unknown;
  end if;
  -- Steps 1, 2 and 2b: the harness reads these constants, so a step's count lives here and nowhere else.
  if expected_rows_before - expected_exact_copies - expected_placeholders - expected_invented <> expected_rows_after then
    raise exception 'Round 706: the constants do not add up. Nothing was changed.';
  end if;

  -- The sample checks, read back.
  select count(*) into n from public.nfl_draft_picks where year = 1976 and pick = 472 and player_name = 'Pat McNeil' and round = 17;
  if n <> 1 then raise exception 'Round 706: 1976 pick 472 (Pat McNeil) is not round 17. Nothing was changed.'; end if;
  select count(*) into n from public.nfl_draft_picks where year = 1970 and ((pick = 313 and round = 13) or (pick = 442 and round = 17));
  if n <> 2 then raise exception 'Round 706: 1970 picks 313 and 442 are not rounds 13 and 17. Nothing was changed.'; end if;
  select count(*) into n from public.nfl_draft_picks where year = 1950 and ((pick = 93 and round = 8) or (pick = 391 and round = 30));
  if n <> 2 then raise exception 'Round 706: 1950 picks 93 and 391 are not rounds 8 and 30. Nothing was changed.'; end if;
  select count(*) into n from public.nfl_draft_picks where year = 1982 and pick between 252 and 334 and round is not null;
  if n <> 0 then raise exception 'Round 706: 1982 picks 252 to 334 still carry a round. Nothing was changed.'; end if;
  select count(*) into n from public.nfl_draft_picks where year = 1977 and pick between 280 and 335;
  if n <> 43 then raise exception 'Round 706: 1977 picks 280 to 335 hold % rows, expected 43. Nothing was changed.', n; end if;
  select count(*) into n from public.nfl_draft_picks where year = 1977 and pick between 280 and 335 and round is not null;
  if n <> 0 then raise exception 'Round 706: 1977 picks 280 to 335 still carry a round. Nothing was changed.'; end if;
  select count(*) into n from public.nfl_draft_picks where team = 'Baltimore Fatsos' or player_name in ('Adam Dzierdzik', 'Benedict Fernzi', 'Jakob Cepon');
  if n <> 0 then raise exception 'Round 706: an invented 1977 row is still there. Nothing was changed.'; end if;
  select count(*) into n from public.nfl_draft_picks where year in (2024, 2025) group by year having count(*) <> 257 limit 1;
  if found then raise exception 'Round 706: 2024 or 2025 does not hold 257 rows. Nothing was changed.'; end if;

  -- No row filed round 1 past its year's first round is left.
  select count(*) into n
    from public.nfl_draft_picks p
    join (select year, min(pick) - 1 as r1_end from public.nfl_draft_picks where round = 2 group by year) e on e.year = p.year
   where p.round = 1 and p.pick > e.r1_end;
  if n <> 0 then raise exception 'Round 706: % rows are still round 1 past their first round. Nothing was changed.', n; end if;

  select count(*) into n from public.nfl_draft_picks;
  if n <> expected_rows_after then
    raise exception 'Round 706: nfl_draft_picks ends at % rows, expected %. Nothing was changed.', n, expected_rows_after;
  end if;
end
$migration$;
