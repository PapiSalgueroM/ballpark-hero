-- Round 729: cfb_heisman_winners, verified row by row. UNAPPLIED: do not run this
-- until someone has read it; it was written by a session that may not write to
-- production.
--
-- WHAT WAS DONE. All 91 rows (1935 to 2025, one per year, Archie Griffin twice)
-- were read with a SELECT on 2026-09-30 and checked against two sources:
--   the award body   https://www.heisman.com/heisman-winners/ (each row's own
--                    profile page is named in the record)
--   ESPN             https://www.espn.com/college-football/story/_/id/47245473/college-football-positions-most-heisman-trophies
--                    (every winner with school and position), with year, winner
--                    and school also read on
--                    https://www.espn.com/college-football/story/_/id/35213207/heisman-winners-list
-- The per row record, with both sources' readings, is
-- scripts/data/heismanVerified2026-09.json, and scripts/simHeisman.mjs holds this
-- file's end state to it.
--
-- WHAT IT FOUND. Year, winner and school are right on all 91 rows (name and
-- school spellings that differ between the sources are explained per row in the
-- record and left as the table has them). 23 position codes are not what either
-- source prints: the era codes HB, E, HB/QB and HB/P, and one FB. Each line
-- below names both readings; the table takes the code both print, and for 1944,
-- where the award body prints HB and ESPN prints RB for the same halfback, the
-- award body's HB. Nothing is
-- missing (every year 1935 to 2025 has its winner; the 2026 award is given in
-- December), and there is no junk or placeholder row, so nothing is inserted or
-- deleted.
--
-- THE CHANGES, position only, each as both sources print it:
--   1935 Jay Berwanger (id 1): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/jay-berwanger/
--   1936 Larry Kelley (id 2): E to TE. heisman.com TE, ESPN TE. https://www.heisman.com/heisman-winners/larry-kelley/
--   1939 Nile Kinnick (id 5): HB/QB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/nile-kinnick/
--   1940 Tom Harmon (id 6): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/tom-harmon/
--   1941 Bruce Smith (id 7): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/bruce-smith/
--   1942 Frank Sinkwich (id 8): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/frank-sinkwich/
--   1944 Les Horvath (id 10): HB/QB to HB. heisman.com HB, ESPN RB. https://www.heisman.com/heisman-winners/les-horvath/
--   1946 Glenn Davis (id 12): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/glenn-davis/
--   1948 Doak Walker (id 14): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/doak-walker/
--   1949 Leon Hart (id 15): E to TE. heisman.com TE, ESPN TE. https://www.heisman.com/heisman-winners/leon-hart/
--   1950 Vic Janowicz (id 16): HB/P to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/vic-janowicz/
--   1951 Dick Kazmaier (id 17): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/dick-kazmaier/
--   1952 Billy Vessels (id 18): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/billy-vessels/
--   1953 John Lattner (id 19): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/john-lattner/
--   1955 Howard "Hopalong" Cassady (id 21): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/howard-cassady/
--   1957 John David Crow (id 23): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/john-david-crow/
--   1958 Pete Dawkins (id 24): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/pete-dawkins/
--   1959 Billy Cannon (id 25): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/billy-cannon/
--   1960 Joe Bellino (id 26): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/joe-bellino/
--   1961 Ernie Davis (id 27): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/ernie-davis/
--   1965 Mike Garrett (id 31): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/mike-garrett/
--   1968 O.J. Simpson (id 34): HB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/oj-simpson/
--   1969 Steve Owens (id 35): FB to RB. heisman.com RB, ESPN RB. https://www.heisman.com/heisman-winners/steve-owens/
--
-- STATEMENT COUNTS: one UPDATE, 23 rows. No INSERT, no DELETE, no DDL.
--
-- FAIL CLOSED. Before anything changes, all 91 rows must still be exactly as read
-- (id, year, winner, school, position); if any row moved, was added or was
-- removed, the block raises and nothing is changed. The UPDATE touches a row only
-- where its position is still the one read, must touch exactly 23 rows, and the
-- whole table must then equal the verified end state below, or the block raises
-- and the transaction rolls back.
--
-- READERS. src/lib/listQuiz.ts reads winner only. The College Grid key
-- (scripts/genCollegeGridData.mjs) reads position only for 1966 and later, where
-- the one change (1969 FB to RB) maps to the same RB group, so the key does not
-- move. The Record Books Heisman page (src/data/recordBooks.json) was baked from
-- the verified record, so it already shows the end state.
do $migration$
declare
  n integer;
  bad text;
begin
  /* 1. the table as read on 2026-09-30, all 91 rows */
  with read_state(id, year, winner, school, position) as (values
    (1, 1935, 'Jay Berwanger', 'Chicago', 'HB'),
    (2, 1936, 'Larry Kelley', 'Yale', 'E'),
    (3, 1937, 'Clinton Frank', 'Yale', 'HB'),
    (4, 1938, 'Davey O''Brien', 'TCU', 'QB'),
    (5, 1939, 'Nile Kinnick', 'Iowa', 'HB/QB'),
    (6, 1940, 'Tom Harmon', 'Michigan', 'HB'),
    (7, 1941, 'Bruce Smith', 'Minnesota', 'HB'),
    (8, 1942, 'Frank Sinkwich', 'Georgia', 'HB'),
    (9, 1943, 'Angelo Bertelli', 'Notre Dame', 'QB'),
    (10, 1944, 'Les Horvath', 'Ohio State', 'HB/QB'),
    (11, 1945, 'Felix "Doc" Blanchard', 'Army', 'FB'),
    (12, 1946, 'Glenn Davis', 'Army', 'HB'),
    (13, 1947, 'Johnny Lujack', 'Notre Dame', 'QB'),
    (14, 1948, 'Doak Walker', 'SMU', 'HB'),
    (15, 1949, 'Leon Hart', 'Notre Dame', 'E'),
    (16, 1950, 'Vic Janowicz', 'Ohio State', 'HB/P'),
    (17, 1951, 'Dick Kazmaier', 'Princeton', 'HB'),
    (18, 1952, 'Billy Vessels', 'Oklahoma', 'HB'),
    (19, 1953, 'John Lattner', 'Notre Dame', 'HB'),
    (20, 1954, 'Alan Ameche', 'Wisconsin', 'FB'),
    (21, 1955, 'Howard "Hopalong" Cassady', 'Ohio State', 'HB'),
    (22, 1956, 'Paul Hornung', 'Notre Dame', 'QB'),
    (23, 1957, 'John David Crow', 'Texas A&M', 'HB'),
    (24, 1958, 'Pete Dawkins', 'Army', 'HB'),
    (25, 1959, 'Billy Cannon', 'LSU', 'HB'),
    (26, 1960, 'Joe Bellino', 'Navy', 'HB'),
    (27, 1961, 'Ernie Davis', 'Syracuse', 'HB'),
    (28, 1962, 'Terry Baker', 'Oregon State', 'QB'),
    (29, 1963, 'Roger Staubach', 'Navy', 'QB'),
    (30, 1964, 'John Huarte', 'Notre Dame', 'QB'),
    (31, 1965, 'Mike Garrett', 'USC', 'HB'),
    (32, 1966, 'Steve Spurrier', 'Florida', 'QB'),
    (33, 1967, 'Gary Beban', 'UCLA', 'QB'),
    (34, 1968, 'O.J. Simpson', 'USC', 'HB'),
    (35, 1969, 'Steve Owens', 'Oklahoma', 'FB'),
    (36, 1970, 'Jim Plunkett', 'Stanford', 'QB'),
    (37, 1971, 'Pat Sullivan', 'Auburn', 'QB'),
    (38, 1972, 'Johnny Rodgers', 'Nebraska', 'WR'),
    (39, 1973, 'John Cappelletti', 'Penn State', 'RB'),
    (40, 1974, 'Archie Griffin', 'Ohio State', 'RB'),
    (41, 1975, 'Archie Griffin', 'Ohio State', 'RB'),
    (42, 1976, 'Tony Dorsett', 'Pittsburgh', 'RB'),
    (43, 1977, 'Earl Campbell', 'Texas', 'RB'),
    (44, 1978, 'Billy Sims', 'Oklahoma', 'RB'),
    (45, 1979, 'Charles White', 'USC', 'RB'),
    (46, 1980, 'George Rogers', 'South Carolina', 'RB'),
    (47, 1981, 'Marcus Allen', 'USC', 'RB'),
    (48, 1982, 'Herschel Walker', 'Georgia', 'RB'),
    (49, 1983, 'Mike Rozier', 'Nebraska', 'RB'),
    (50, 1984, 'Doug Flutie', 'Boston College', 'QB'),
    (51, 1985, 'Bo Jackson', 'Auburn', 'RB'),
    (52, 1986, 'Vinny Testaverde', 'Miami (FL)', 'QB'),
    (53, 1987, 'Tim Brown', 'Notre Dame', 'WR'),
    (54, 1988, 'Barry Sanders', 'Oklahoma State', 'RB'),
    (55, 1989, 'Andre Ware', 'Houston', 'QB'),
    (56, 1990, 'Ty Detmer', 'BYU', 'QB'),
    (57, 1991, 'Desmond Howard', 'Michigan', 'WR'),
    (58, 1992, 'Gino Torretta', 'Miami (FL)', 'QB'),
    (59, 1993, 'Charlie Ward', 'Florida State', 'QB'),
    (60, 1994, 'Rashaan Salaam', 'Colorado', 'RB'),
    (61, 1995, 'Eddie George', 'Ohio State', 'RB'),
    (62, 1996, 'Danny Wuerffel', 'Florida', 'QB'),
    (63, 1997, 'Charles Woodson', 'Michigan', 'CB'),
    (64, 1998, 'Ricky Williams', 'Texas', 'RB'),
    (65, 1999, 'Ron Dayne', 'Wisconsin', 'RB'),
    (66, 2000, 'Chris Weinke', 'Florida State', 'QB'),
    (67, 2001, 'Eric Crouch', 'Nebraska', 'QB'),
    (68, 2002, 'Carson Palmer', 'USC', 'QB'),
    (69, 2003, 'Jason White', 'Oklahoma', 'QB'),
    (70, 2004, 'Matt Leinart', 'USC', 'QB'),
    (71, 2005, 'Reggie Bush', 'USC', 'RB'),
    (72, 2006, 'Troy Smith', 'Ohio State', 'QB'),
    (73, 2007, 'Tim Tebow', 'Florida', 'QB'),
    (74, 2008, 'Sam Bradford', 'Oklahoma', 'QB'),
    (75, 2009, 'Mark Ingram', 'Alabama', 'RB'),
    (76, 2010, 'Cam Newton', 'Auburn', 'QB'),
    (77, 2011, 'Robert Griffin III', 'Baylor', 'QB'),
    (78, 2012, 'Johnny Manziel', 'Texas A&M', 'QB'),
    (79, 2013, 'Jameis Winston', 'Florida State', 'QB'),
    (80, 2014, 'Marcus Mariota', 'Oregon', 'QB'),
    (81, 2015, 'Derrick Henry', 'Alabama', 'RB'),
    (82, 2016, 'Lamar Jackson', 'Louisville', 'QB'),
    (83, 2017, 'Baker Mayfield', 'Oklahoma', 'QB'),
    (84, 2018, 'Kyler Murray', 'Oklahoma', 'QB'),
    (85, 2019, 'Joe Burrow', 'LSU', 'QB'),
    (86, 2020, 'DeVonta Smith', 'Alabama', 'WR'),
    (87, 2021, 'Bryce Young', 'Alabama', 'QB'),
    (88, 2022, 'Caleb Williams', 'USC', 'QB'),
    (89, 2023, 'Jayden Daniels', 'LSU', 'QB'),
    (90, 2024, 'Travis Hunter', 'Colorado', 'CB/WR'),
    (91, 2025, 'Fernando Mendoza', 'Indiana', 'QB')
  )
  select string_agg(coalesce(t.year, r.year)::text || ' (id ' || coalesce(t.id, r.id)::text || ')', ', ')
    into bad
  from read_state r
  full join public.cfb_heisman_winners t on t.id = r.id
  where r.id is null or t.id is null
     or t.year is distinct from r.year
     or t.winner is distinct from r.winner
     or t.school is distinct from r.school
     or t.position is distinct from r.position;
  if bad is not null then
    raise exception 'Round 729: cfb_heisman_winners moved since it was read on 2026-09-30: %. Nothing was changed.', bad;
  end if;

  /* 2. the corrections, each only where the row still holds the value read */
  with fix(id, year, was, now) as (values
    (1, 1935, 'HB', 'RB'),
    (2, 1936, 'E', 'TE'),
    (5, 1939, 'HB/QB', 'RB'),
    (6, 1940, 'HB', 'RB'),
    (7, 1941, 'HB', 'RB'),
    (8, 1942, 'HB', 'RB'),
    (10, 1944, 'HB/QB', 'HB'),
    (12, 1946, 'HB', 'RB'),
    (14, 1948, 'HB', 'RB'),
    (15, 1949, 'E', 'TE'),
    (16, 1950, 'HB/P', 'RB'),
    (17, 1951, 'HB', 'RB'),
    (18, 1952, 'HB', 'RB'),
    (19, 1953, 'HB', 'RB'),
    (21, 1955, 'HB', 'RB'),
    (23, 1957, 'HB', 'RB'),
    (24, 1958, 'HB', 'RB'),
    (25, 1959, 'HB', 'RB'),
    (26, 1960, 'HB', 'RB'),
    (27, 1961, 'HB', 'RB'),
    (31, 1965, 'HB', 'RB'),
    (34, 1968, 'HB', 'RB'),
    (35, 1969, 'FB', 'RB')
  )
  update public.cfb_heisman_winners t
     set position = f.now
    from fix f
   where t.id = f.id and t.year = f.year and t.position = f.was;
  get diagnostics n = row_count;
  if n <> 23 then
    raise exception 'Round 729: expected to correct 23 positions, corrected %. Rolled back.', n;
  end if;

  /* 3. the end state: the verified record, all 91 rows */
  with end_state(id, year, winner, school, position) as (values
    (1, 1935, 'Jay Berwanger', 'Chicago', 'RB'),
    (2, 1936, 'Larry Kelley', 'Yale', 'TE'),
    (3, 1937, 'Clinton Frank', 'Yale', 'HB'),
    (4, 1938, 'Davey O''Brien', 'TCU', 'QB'),
    (5, 1939, 'Nile Kinnick', 'Iowa', 'RB'),
    (6, 1940, 'Tom Harmon', 'Michigan', 'RB'),
    (7, 1941, 'Bruce Smith', 'Minnesota', 'RB'),
    (8, 1942, 'Frank Sinkwich', 'Georgia', 'RB'),
    (9, 1943, 'Angelo Bertelli', 'Notre Dame', 'QB'),
    (10, 1944, 'Les Horvath', 'Ohio State', 'HB'),
    (11, 1945, 'Felix "Doc" Blanchard', 'Army', 'FB'),
    (12, 1946, 'Glenn Davis', 'Army', 'RB'),
    (13, 1947, 'Johnny Lujack', 'Notre Dame', 'QB'),
    (14, 1948, 'Doak Walker', 'SMU', 'RB'),
    (15, 1949, 'Leon Hart', 'Notre Dame', 'TE'),
    (16, 1950, 'Vic Janowicz', 'Ohio State', 'RB'),
    (17, 1951, 'Dick Kazmaier', 'Princeton', 'RB'),
    (18, 1952, 'Billy Vessels', 'Oklahoma', 'RB'),
    (19, 1953, 'John Lattner', 'Notre Dame', 'RB'),
    (20, 1954, 'Alan Ameche', 'Wisconsin', 'FB'),
    (21, 1955, 'Howard "Hopalong" Cassady', 'Ohio State', 'RB'),
    (22, 1956, 'Paul Hornung', 'Notre Dame', 'QB'),
    (23, 1957, 'John David Crow', 'Texas A&M', 'RB'),
    (24, 1958, 'Pete Dawkins', 'Army', 'RB'),
    (25, 1959, 'Billy Cannon', 'LSU', 'RB'),
    (26, 1960, 'Joe Bellino', 'Navy', 'RB'),
    (27, 1961, 'Ernie Davis', 'Syracuse', 'RB'),
    (28, 1962, 'Terry Baker', 'Oregon State', 'QB'),
    (29, 1963, 'Roger Staubach', 'Navy', 'QB'),
    (30, 1964, 'John Huarte', 'Notre Dame', 'QB'),
    (31, 1965, 'Mike Garrett', 'USC', 'RB'),
    (32, 1966, 'Steve Spurrier', 'Florida', 'QB'),
    (33, 1967, 'Gary Beban', 'UCLA', 'QB'),
    (34, 1968, 'O.J. Simpson', 'USC', 'RB'),
    (35, 1969, 'Steve Owens', 'Oklahoma', 'RB'),
    (36, 1970, 'Jim Plunkett', 'Stanford', 'QB'),
    (37, 1971, 'Pat Sullivan', 'Auburn', 'QB'),
    (38, 1972, 'Johnny Rodgers', 'Nebraska', 'WR'),
    (39, 1973, 'John Cappelletti', 'Penn State', 'RB'),
    (40, 1974, 'Archie Griffin', 'Ohio State', 'RB'),
    (41, 1975, 'Archie Griffin', 'Ohio State', 'RB'),
    (42, 1976, 'Tony Dorsett', 'Pittsburgh', 'RB'),
    (43, 1977, 'Earl Campbell', 'Texas', 'RB'),
    (44, 1978, 'Billy Sims', 'Oklahoma', 'RB'),
    (45, 1979, 'Charles White', 'USC', 'RB'),
    (46, 1980, 'George Rogers', 'South Carolina', 'RB'),
    (47, 1981, 'Marcus Allen', 'USC', 'RB'),
    (48, 1982, 'Herschel Walker', 'Georgia', 'RB'),
    (49, 1983, 'Mike Rozier', 'Nebraska', 'RB'),
    (50, 1984, 'Doug Flutie', 'Boston College', 'QB'),
    (51, 1985, 'Bo Jackson', 'Auburn', 'RB'),
    (52, 1986, 'Vinny Testaverde', 'Miami (FL)', 'QB'),
    (53, 1987, 'Tim Brown', 'Notre Dame', 'WR'),
    (54, 1988, 'Barry Sanders', 'Oklahoma State', 'RB'),
    (55, 1989, 'Andre Ware', 'Houston', 'QB'),
    (56, 1990, 'Ty Detmer', 'BYU', 'QB'),
    (57, 1991, 'Desmond Howard', 'Michigan', 'WR'),
    (58, 1992, 'Gino Torretta', 'Miami (FL)', 'QB'),
    (59, 1993, 'Charlie Ward', 'Florida State', 'QB'),
    (60, 1994, 'Rashaan Salaam', 'Colorado', 'RB'),
    (61, 1995, 'Eddie George', 'Ohio State', 'RB'),
    (62, 1996, 'Danny Wuerffel', 'Florida', 'QB'),
    (63, 1997, 'Charles Woodson', 'Michigan', 'CB'),
    (64, 1998, 'Ricky Williams', 'Texas', 'RB'),
    (65, 1999, 'Ron Dayne', 'Wisconsin', 'RB'),
    (66, 2000, 'Chris Weinke', 'Florida State', 'QB'),
    (67, 2001, 'Eric Crouch', 'Nebraska', 'QB'),
    (68, 2002, 'Carson Palmer', 'USC', 'QB'),
    (69, 2003, 'Jason White', 'Oklahoma', 'QB'),
    (70, 2004, 'Matt Leinart', 'USC', 'QB'),
    (71, 2005, 'Reggie Bush', 'USC', 'RB'),
    (72, 2006, 'Troy Smith', 'Ohio State', 'QB'),
    (73, 2007, 'Tim Tebow', 'Florida', 'QB'),
    (74, 2008, 'Sam Bradford', 'Oklahoma', 'QB'),
    (75, 2009, 'Mark Ingram', 'Alabama', 'RB'),
    (76, 2010, 'Cam Newton', 'Auburn', 'QB'),
    (77, 2011, 'Robert Griffin III', 'Baylor', 'QB'),
    (78, 2012, 'Johnny Manziel', 'Texas A&M', 'QB'),
    (79, 2013, 'Jameis Winston', 'Florida State', 'QB'),
    (80, 2014, 'Marcus Mariota', 'Oregon', 'QB'),
    (81, 2015, 'Derrick Henry', 'Alabama', 'RB'),
    (82, 2016, 'Lamar Jackson', 'Louisville', 'QB'),
    (83, 2017, 'Baker Mayfield', 'Oklahoma', 'QB'),
    (84, 2018, 'Kyler Murray', 'Oklahoma', 'QB'),
    (85, 2019, 'Joe Burrow', 'LSU', 'QB'),
    (86, 2020, 'DeVonta Smith', 'Alabama', 'WR'),
    (87, 2021, 'Bryce Young', 'Alabama', 'QB'),
    (88, 2022, 'Caleb Williams', 'USC', 'QB'),
    (89, 2023, 'Jayden Daniels', 'LSU', 'QB'),
    (90, 2024, 'Travis Hunter', 'Colorado', 'CB/WR'),
    (91, 2025, 'Fernando Mendoza', 'Indiana', 'QB')
  )
  select string_agg(coalesce(t.year, e.year)::text || ' (id ' || coalesce(t.id, e.id)::text || ')', ', ')
    into bad
  from end_state e
  full join public.cfb_heisman_winners t on t.id = e.id
  where e.id is null or t.id is null
     or t.year is distinct from e.year
     or t.winner is distinct from e.winner
     or t.school is distinct from e.school
     or t.position is distinct from e.position;
  if bad is not null then
    raise exception 'Round 729: after the corrections the table still differs from the verified record: %. Rolled back.', bad;
  end if;
end
$migration$;
