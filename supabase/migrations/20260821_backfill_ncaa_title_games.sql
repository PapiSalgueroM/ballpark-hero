-- APPLIED live on 2026-08-21 (Round 246). Safe to re-run: every update
-- only fills rows whose runner_up is NULL, so a second pass matches
-- nothing.
--
-- Why: the men's championship rows carried champions only. This fills
-- the beaten finalist and the title game score for all 87 championships
-- (1939 through 2026; 2020 was cancelled and has no row).
--
-- Verification, the Round 239 method: FOX Sports' championship list
-- (1939-2024, fetched 2026-08-21) was machine-checked against the
-- database and the champions agree on every year, with the era-name
-- conventions ruled in the database's favor where they differ in form
-- only (Oklahoma A&M, NC State, Loyola Chicago are the same schools the
-- source spells Oklahoma State, North Carolina State and Loyola (Ill.)).
-- The 1955 runner-up is recorded as La Salle to match the table's own
-- 1954 champion spelling. The two seasons past the source's end were
-- verified separately: 2025 Florida 65-63 over Houston (ESPN, CBS and
-- NBC, the comeback from twelve down) and 2026 Michigan 69-63 over
-- UConn (verified against news coverage the day the Round 232 rebuild
-- shipped). Spot checks against known history throughout: the 1957
-- triple overtime 54-53, Texas Western's 1966 title as UTEP over
-- Kentucky, NC State 54-52 in 1983, Villanova 66-64 in 1985, UNLV by
-- thirty in 1990, Hayward's near-miss 61-59 in 2010, Jenkins at the
-- buzzer 77-74 in 2016, Virginia's overtime 85-77 in 2019.
--
-- The Record Books men's basketball section gains Runner-up and Score
-- columns; simRecords pins them complete.

BEGIN;

UPDATE ncaa_basketball_champions SET runner_up = 'Ohio State', score = '46-33' WHERE year = 1939 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas', score = '60-42' WHERE year = 1940 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Washington State', score = '39-34' WHERE year = 1941 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Dartmouth', score = '53-38' WHERE year = 1942 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Georgetown', score = '46-34' WHERE year = 1943 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Dartmouth', score = '42-40' WHERE year = 1944 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'NYU', score = '49-45' WHERE year = 1945 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'North Carolina', score = '43-40' WHERE year = 1946 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Oklahoma', score = '58-47' WHERE year = 1947 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Baylor', score = '58-42' WHERE year = 1948 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Oklahoma A&M', score = '46-36' WHERE year = 1949 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Bradley', score = '71-68' WHERE year = 1950 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas State', score = '68-58' WHERE year = 1951 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'St. John''s', score = '80-63' WHERE year = 1952 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas', score = '69-68' WHERE year = 1953 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Bradley', score = '92-76' WHERE year = 1954 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'La Salle', score = '77-63' WHERE year = 1955 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Iowa', score = '83-71' WHERE year = 1956 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas', score = '54-53' WHERE year = 1957 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Seattle', score = '84-72' WHERE year = 1958 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'West Virginia', score = '71-70' WHERE year = 1959 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'California', score = '75-55' WHERE year = 1960 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Ohio State', score = '70-65' WHERE year = 1961 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Ohio State', score = '71-59' WHERE year = 1962 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Cincinnati', score = '60-58' WHERE year = 1963 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Duke', score = '98-83' WHERE year = 1964 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan', score = '91-80' WHERE year = 1965 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kentucky', score = '72-65' WHERE year = 1966 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Dayton', score = '79-64' WHERE year = 1967 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'North Carolina', score = '78-55' WHERE year = 1968 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Purdue', score = '92-72' WHERE year = 1969 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Jacksonville', score = '80-69' WHERE year = 1970 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Villanova', score = '68-62' WHERE year = 1971 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Florida State', score = '81-76' WHERE year = 1972 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Memphis State', score = '87-66' WHERE year = 1973 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Marquette', score = '76-64' WHERE year = 1974 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kentucky', score = '92-85' WHERE year = 1975 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan', score = '86-68' WHERE year = 1976 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'North Carolina', score = '67-59' WHERE year = 1977 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Duke', score = '94-88' WHERE year = 1978 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Indiana State', score = '75-64' WHERE year = 1979 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'UCLA', score = '59-54' WHERE year = 1980 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'North Carolina', score = '63-50' WHERE year = 1981 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Georgetown', score = '63-62' WHERE year = 1982 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Houston', score = '54-52' WHERE year = 1983 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Houston', score = '84-75' WHERE year = 1984 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Georgetown', score = '66-64' WHERE year = 1985 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Duke', score = '72-69' WHERE year = 1986 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Syracuse', score = '74-73' WHERE year = 1987 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Oklahoma', score = '83-79' WHERE year = 1988 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Seton Hall', score = '80-79' WHERE year = 1989 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Duke', score = '103-73' WHERE year = 1990 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas', score = '72-65' WHERE year = 1991 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan', score = '71-51' WHERE year = 1992 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan', score = '77-71' WHERE year = 1993 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Duke', score = '76-72' WHERE year = 1994 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Arkansas', score = '89-78' WHERE year = 1995 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Syracuse', score = '76-67' WHERE year = 1996 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kentucky', score = '84-79' WHERE year = 1997 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Utah', score = '78-69' WHERE year = 1998 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Duke', score = '77-74' WHERE year = 1999 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Florida', score = '89-76' WHERE year = 2000 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Arizona', score = '82-72' WHERE year = 2001 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Indiana', score = '64-52' WHERE year = 2002 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas', score = '81-78' WHERE year = 2003 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Georgia Tech', score = '82-73' WHERE year = 2004 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Illinois', score = '75-70' WHERE year = 2005 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'UCLA', score = '73-57' WHERE year = 2006 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Ohio State', score = '84-75' WHERE year = 2007 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Memphis', score = '75-68' WHERE year = 2008 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan State', score = '89-72' WHERE year = 2009 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Butler', score = '61-59' WHERE year = 2010 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Butler', score = '53-41' WHERE year = 2011 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kansas', score = '67-59' WHERE year = 2012 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan', score = '82-76' WHERE year = 2013 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Kentucky', score = '60-54' WHERE year = 2014 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Wisconsin', score = '68-63' WHERE year = 2015 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'North Carolina', score = '77-74' WHERE year = 2016 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Gonzaga', score = '71-65' WHERE year = 2017 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Michigan', score = '79-62' WHERE year = 2018 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Texas Tech', score = '85-77' WHERE year = 2019 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Gonzaga', score = '86-70' WHERE year = 2021 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'North Carolina', score = '72-69' WHERE year = 2022 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'San Diego State', score = '76-59' WHERE year = 2023 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Purdue', score = '75-60' WHERE year = 2024 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'Houston', score = '65-63' WHERE year = 2025 AND division = 'Men''s D1' AND runner_up IS NULL;
UPDATE ncaa_basketball_champions SET runner_up = 'UConn', score = '69-63' WHERE year = 2026 AND division = 'Men''s D1' AND runner_up IS NULL;

COMMIT;
