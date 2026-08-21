-- ALREADY APPLIED to the live project on 2026-08-20 (Round 232). Safe to
-- re-run: it replaces the table's contents with the verified list.
--
-- Why: cfb_national_champions was a corrupted scrape and every row was
-- suspect. Losing scores were stored as records (Alabama "16-44" for the
-- 2018 season Clemson won 44-16), runners-up were stored as champions
-- (USC for the 2005 season Texas won 41-38 in the Rose Bowl; Ohio State
-- THREE TIMES for the 2006 season Florida won 41-14; Iowa for 1985, which
-- Oklahoma won), there were duplicate rows, and about half the real
-- champions were missing entirely: no Texas, no Penn State, no BYU, no
-- Colorado, no 2014 Ohio State, no 2016 Clemson, no 2020 Alabama, no 2021
-- Georgia. The List Quiz reads this table as "every school with a
-- national title in our records", so players were being taught wrong
-- history, and simCollegeGrid (Round 232) uses it to prove College Grid
-- cells answerable.
--
-- The rebuild: one row per season 1981 through 2025, split-title seasons
-- carried per selector (1990 Colorado/Georgia Tech, 1991 Miami/
-- Washington, 1997 Michigan/Nebraska, 2003 LSU/USC). Years are SEASONS:
-- the 2025 row is the title game played 2026-01-19, Indiana 27-21 over
-- Miami (FL) for their first title, verified against ESPN, NCAA.com and
-- NPR on 2026-08-20. Records are the title game result from the
-- champion's side in the BCS/CFP era and the season record where no
-- single title game existed.

BEGIN;

DELETE FROM cfb_national_champions;

INSERT INTO cfb_national_champions (year, champion, selector, record, coach) VALUES
(1981, 'Clemson', 'AP & Coaches', 'Beat Nebraska 22-15, Orange Bowl', 'Danny Ford'),
(1982, 'Penn State', 'AP & Coaches', 'Beat Georgia 27-23, Sugar Bowl', 'Joe Paterno'),
(1983, 'Miami (FL)', 'AP & Coaches', 'Beat Nebraska 31-30, Orange Bowl', 'Howard Schnellenberger'),
(1984, 'BYU', 'AP & Coaches', '13-0 season', 'LaVell Edwards'),
(1985, 'Oklahoma', 'AP & Coaches', 'Beat Penn State 25-10, Orange Bowl', 'Barry Switzer'),
(1986, 'Penn State', 'AP & Coaches', 'Beat Miami (FL) 14-10, Fiesta Bowl', 'Joe Paterno'),
(1987, 'Miami (FL)', 'AP & Coaches', 'Beat Oklahoma 20-14, Orange Bowl', 'Jimmy Johnson'),
(1988, 'Notre Dame', 'AP & Coaches', 'Beat West Virginia 34-21, Fiesta Bowl', 'Lou Holtz'),
(1989, 'Miami (FL)', 'AP & Coaches', '11-1 season', 'Dennis Erickson'),
(1990, 'Colorado', 'AP Poll', '11-1-1 season', 'Bill McCartney'),
(1990, 'Georgia Tech', 'Coaches Poll', '11-0-1 season', 'Bobby Ross'),
(1991, 'Miami (FL)', 'AP Poll', '12-0 season', 'Dennis Erickson'),
(1991, 'Washington', 'Coaches Poll', '12-0 season', 'Don James'),
(1992, 'Alabama', 'AP & Coaches', 'Beat Miami (FL) 34-13, Sugar Bowl', 'Gene Stallings'),
(1993, 'Florida State', 'AP & Coaches', 'Beat Nebraska 18-16, Orange Bowl', 'Bobby Bowden'),
(1994, 'Nebraska', 'AP & Coaches', 'Beat Miami (FL) 24-17, Orange Bowl', 'Tom Osborne'),
(1995, 'Nebraska', 'AP & Coaches', 'Beat Florida 62-24, Fiesta Bowl', 'Tom Osborne'),
(1996, 'Florida', 'AP & Coaches', 'Beat Florida State 52-20, Sugar Bowl', 'Steve Spurrier'),
(1997, 'Michigan', 'AP Poll', 'Beat Washington State 21-16, Rose Bowl', 'Lloyd Carr'),
(1997, 'Nebraska', 'Coaches Poll', 'Beat Tennessee 42-17, Orange Bowl', 'Tom Osborne'),
(1998, 'Tennessee', 'BCS', 'Beat Florida State 23-16', 'Phillip Fulmer'),
(1999, 'Florida State', 'BCS', 'Beat Virginia Tech 46-29', 'Bobby Bowden'),
(2000, 'Oklahoma', 'BCS', 'Beat Florida State 13-2', 'Bob Stoops'),
(2001, 'Miami (FL)', 'BCS', 'Beat Nebraska 37-14', 'Larry Coker'),
(2002, 'Ohio State', 'BCS', 'Beat Miami (FL) 31-24 in 2OT', 'Jim Tressel'),
(2003, 'LSU', 'BCS', 'Beat Oklahoma 21-14', 'Nick Saban'),
(2003, 'USC', 'AP Poll', 'Beat Michigan 28-14, Rose Bowl', 'Pete Carroll'),
(2004, 'USC', 'BCS', 'Beat Oklahoma 55-19', 'Pete Carroll'),
(2005, 'Texas', 'BCS', 'Beat USC 41-38, Rose Bowl', 'Mack Brown'),
(2006, 'Florida', 'BCS', 'Beat Ohio State 41-14', 'Urban Meyer'),
(2007, 'LSU', 'BCS', 'Beat Ohio State 38-24', 'Les Miles'),
(2008, 'Florida', 'BCS', 'Beat Oklahoma 24-14', 'Urban Meyer'),
(2009, 'Alabama', 'BCS', 'Beat Texas 37-21', 'Nick Saban'),
(2010, 'Auburn', 'BCS', 'Beat Oregon 22-19', 'Gene Chizik'),
(2011, 'Alabama', 'BCS', 'Beat LSU 21-0', 'Nick Saban'),
(2012, 'Alabama', 'BCS', 'Beat Notre Dame 42-14', 'Nick Saban'),
(2013, 'Florida State', 'BCS', 'Beat Auburn 34-31', 'Jimbo Fisher'),
(2014, 'Ohio State', 'CFP', 'Beat Oregon 42-20', 'Urban Meyer'),
(2015, 'Alabama', 'CFP', 'Beat Clemson 45-40', 'Nick Saban'),
(2016, 'Clemson', 'CFP', 'Beat Alabama 35-31', 'Dabo Swinney'),
(2017, 'Alabama', 'CFP', 'Beat Georgia 26-23 in OT', 'Nick Saban'),
(2018, 'Clemson', 'CFP', 'Beat Alabama 44-16', 'Dabo Swinney'),
(2019, 'LSU', 'CFP', 'Beat Clemson 42-25', 'Ed Orgeron'),
(2020, 'Alabama', 'CFP', 'Beat Ohio State 52-24', 'Nick Saban'),
(2021, 'Georgia', 'CFP', 'Beat Alabama 33-18', 'Kirby Smart'),
(2022, 'Georgia', 'CFP', 'Beat TCU 65-7', 'Kirby Smart'),
(2023, 'Michigan', 'CFP', 'Beat Washington 34-13', 'Jim Harbaugh'),
(2024, 'Ohio State', 'CFP', 'Beat Notre Dame 34-23', 'Ryan Day'),
(2025, 'Indiana', 'CFP', 'Beat Miami (FL) 27-21', 'Curt Cignetti');

COMMIT;
