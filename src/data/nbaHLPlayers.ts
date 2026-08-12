/**
 * NBA Higher/Lower pool, top 80 career scorers, baked from
 * bref_nba_player_seasons on 2026-07-22.
 *
 * HOW IT WAS AGGREGATED (matters if you regenerate): bref stores traded
 * seasons as a combined '2TM'/'3TM' row PLUS per-team rows, so a naive
 * sum(pts) double-counts every traded season. Career totals here are
 * sum over seasons of MAX(pts per player-season), which keeps exactly the
 * combined row. Verified against known careers: Kareem 38,387, Jordan 32,292,
 * Wilt 31,419, Iverson 24,368, Jamal Crawford 19,419, all exact.
 * "Eddie Johnson" was excluded: two different NBA Eddie Johnsons share the
 * name and their merged "career" ranked 8th all-time.
 *
 * No nationality here (bref has none), unlike hockeyHLPlayers there is no
 * flag; the card shows position, era and teams instead.
 */
export interface NbaHLPlayer {
  name: string;
  position: string;
  /** Up to 5 franchise codes, alphabetical. */
  teams: string;
  careerPoints: number;
  /** Final season, for era context on the card. */
  lastSeason: string;
}

export const nbaHLPlayers: NbaHLPlayer[] = [
  { name: 'LeBron James', position: 'SF', teams: 'CLE, LAL, MIA', careerPoints: 42184, lastSeason: '2024-25' },
  { name: 'Kareem Abdul-Jabbar', position: 'C', teams: 'LAL, MIL', careerPoints: 38387, lastSeason: '1988-89' },
  { name: 'Karl Malone', position: 'PF', teams: 'LAL, UTA', careerPoints: 36928, lastSeason: '2003-04' },
  { name: 'Kobe Bryant', position: 'SG', teams: 'LAL', careerPoints: 33643, lastSeason: '2015-16' },
  { name: 'Michael Jordan', position: 'SG', teams: 'CHI, WAS', careerPoints: 32292, lastSeason: '2002-03' },
  { name: 'Dirk Nowitzki', position: 'PF', teams: 'DAL', careerPoints: 31560, lastSeason: '2018-19' },
  { name: 'Wilt Chamberlain', position: 'C', teams: 'LAL, PHI, PHW, SFW', careerPoints: 31419, lastSeason: '1972-73' },
  { name: 'Kevin Durant', position: 'SF', teams: 'BRK, GSW, OKC, PHO, SEA', careerPoints: 30571, lastSeason: '2024-25' },
  { name: "Shaquille O'Neal", position: 'C', teams: 'BOS, CLE, LAL, MIA, ORL', careerPoints: 28596, lastSeason: '2010-11' },
  { name: 'Carmelo Anthony', position: 'SF', teams: 'DEN, HOU, LAL, NYK, OKC', careerPoints: 28289, lastSeason: '2021-22' },
  { name: 'James Harden', position: 'PG', teams: 'BRK, HOU, LAC, OKC, PHI', careerPoints: 27687, lastSeason: '2024-25' },
  { name: 'Moses Malone', position: 'C', teams: 'ATL, BUF, HOU, MIL, PHI', careerPoints: 27409, lastSeason: '1994-95' },
  { name: 'Elvin Hayes', position: 'PF', teams: 'BAL, CAP, HOU, SDR, WSB', careerPoints: 27313, lastSeason: '1983-84' },
  { name: 'Hakeem Olajuwon', position: 'C', teams: 'HOU, TOR', careerPoints: 26946, lastSeason: '2001-02' },
  { name: 'Oscar Robertson', position: 'PG', teams: 'CIN, MIL', careerPoints: 26710, lastSeason: '1973-74' },
  { name: 'Dominique Wilkins', position: 'SF', teams: 'ATL, BOS, LAC, ORL, SAS', careerPoints: 26668, lastSeason: '1998-99' },
  { name: 'Tim Duncan', position: 'C', teams: 'SAS', careerPoints: 26496, lastSeason: '2015-16' },
  { name: 'Paul Pierce', position: 'SF', teams: 'BOS, BRK, LAC, WAS', careerPoints: 26397, lastSeason: '2016-17' },
  { name: 'John Havlicek', position: 'SF', teams: 'BOS', careerPoints: 26395, lastSeason: '1977-78' },
  { name: 'Russell Westbrook', position: 'PG', teams: 'DEN, HOU, LAC, LAL, OKC', careerPoints: 26205, lastSeason: '2024-25' },
  { name: 'Kevin Garnett', position: 'PF', teams: 'BOS, BRK, MIN', careerPoints: 26071, lastSeason: '2015-16' },
  { name: 'Vince Carter', position: 'SG', teams: 'ATL, DAL, MEM, NJN, ORL', careerPoints: 25728, lastSeason: '2019-20' },
  { name: 'Alex English', position: 'SF', teams: 'DAL, DEN, IND, MIL', careerPoints: 25613, lastSeason: '1990-91' },
  { name: 'Stephen Curry', position: 'PG', teams: 'GSW', careerPoints: 25386, lastSeason: '2024-25' },
  { name: 'DeMar DeRozan', position: 'SG', teams: 'CHI, SAC, SAS, TOR', careerPoints: 25292, lastSeason: '2024-25' },
  { name: 'Reggie Miller', position: 'SG', teams: 'IND', careerPoints: 25279, lastSeason: '2004-05' },
  { name: 'Jerry West', position: 'PG', teams: 'LAL', careerPoints: 25192, lastSeason: '1973-74' },
  { name: 'Patrick Ewing', position: 'C', teams: 'NOH, NYK, ORL, SEA', careerPoints: 24818, lastSeason: '2010-11' },
  { name: 'Ray Allen', position: 'SG', teams: 'BOS, MIA, MIL, SEA', careerPoints: 24505, lastSeason: '2013-14' },
  { name: 'Allen Iverson', position: 'SG', teams: 'DEN, DET, MEM, PHI', careerPoints: 24368, lastSeason: '2009-10' },
  { name: 'Charles Barkley', position: 'PF', teams: 'HOU, PHI, PHO', careerPoints: 23757, lastSeason: '1999-00' },
  { name: 'Robert Parish', position: 'C', teams: 'BOS, CHH, CHI, GSW', careerPoints: 23334, lastSeason: '1996-97' },
  { name: 'Adrian Dantley', position: 'SF', teams: 'BUF, DAL, DET, IND, LAL', careerPoints: 23177, lastSeason: '1990-91' },
  { name: 'Dwyane Wade', position: 'SG', teams: 'CHI, CLE, MIA', careerPoints: 23165, lastSeason: '2018-19' },
  { name: 'Elgin Baylor', position: 'SF', teams: 'LAL, MNL', careerPoints: 23149, lastSeason: '1971-72' },
  { name: 'Chris Paul', position: 'PG', teams: 'GSW, HOU, LAC, NOH, NOK', careerPoints: 23011, lastSeason: '2024-25' },
  { name: 'Damian Lillard', position: 'PG', teams: 'MIL, POR', careerPoints: 22598, lastSeason: '2024-25' },
  { name: 'Clyde Drexler', position: 'SG', teams: 'HOU, POR', careerPoints: 22195, lastSeason: '1997-98' },
  { name: 'Gary Payton', position: 'PG', teams: 'BOS, LAL, MIA, MIL, SEA', careerPoints: 21813, lastSeason: '2006-07' },
  { name: 'Larry Bird', position: 'SF', teams: 'BOS', careerPoints: 21791, lastSeason: '1991-92' },
  { name: 'Hal Greer', position: 'SG', teams: 'PHI, SYR', careerPoints: 21586, lastSeason: '1972-73' },
  { name: 'Walt Bellamy', position: 'C', teams: 'ATL, BAL, CHP, CHZ, DET', careerPoints: 20941, lastSeason: '1974-75' },
  { name: 'Pau Gasol', position: 'C', teams: 'CHI, LAL, MEM, MIL, SAS', careerPoints: 20894, lastSeason: '2018-19' },
  { name: 'Bob Pettit', position: 'PF', teams: 'MLH, STL', careerPoints: 20880, lastSeason: '1964-65' },
  { name: 'David Robinson', position: 'C', teams: 'SAS', careerPoints: 20790, lastSeason: '2002-03' },
  { name: 'George Gervin', position: 'SG', teams: 'CHI, SAS', careerPoints: 20708, lastSeason: '1985-86' },
  { name: 'LaMarcus Aldridge', position: 'PF', teams: 'BRK, POR, SAS', careerPoints: 20558, lastSeason: '2021-22' },
  { name: 'Giannis Antetokounmpo', position: 'PF', teams: 'MIL', careerPoints: 20538, lastSeason: '2024-25' },
  { name: 'Mitch Richmond', position: 'SG', teams: 'GSW, LAL, SAC, WAS', careerPoints: 20497, lastSeason: '2001-02' },
  { name: 'Joe Johnson', position: 'SG', teams: 'ATL, BOS, BRK, HOU, MIA', careerPoints: 20407, lastSeason: '2021-22' },
  { name: 'Tom Chambers', position: 'PF', teams: 'CHH, PHI, PHO, SDC, SEA', careerPoints: 20049, lastSeason: '1997-98' },
  { name: 'Antawn Jamison', position: 'PF', teams: 'CLE, DAL, GSW, LAC, LAL', careerPoints: 20042, lastSeason: '2013-14' },
  { name: 'John Stockton', position: 'PG', teams: 'UTA', careerPoints: 19711, lastSeason: '2002-03' },
  { name: 'Bernard King', position: 'SF', teams: 'GSW, NJN, NYK, UTA, WSB', careerPoints: 19655, lastSeason: '1992-93' },
  { name: 'Clifford Robinson', position: 'PF', teams: 'DET, GSW, NJN, PHO, POR', careerPoints: 19591, lastSeason: '2006-07' },
  { name: 'Walter Davis', position: 'SG', teams: 'DEN, PHO, POR', careerPoints: 19521, lastSeason: '1991-92' },
  { name: 'Dwight Howard', position: 'C', teams: 'ATL, CHO, HOU, LAL, ORL', careerPoints: 19485, lastSeason: '2021-22' },
  { name: 'Tony Parker', position: 'PG', teams: 'CHO, SAS', careerPoints: 19473, lastSeason: '2018-19' },
  { name: 'Terry Cummings', position: 'PF', teams: 'GSW, MIL, NYK, PHI, SAS', careerPoints: 19460, lastSeason: '1999-00' },
  { name: 'Jamal Crawford', position: 'SG', teams: 'ATL, BRK, CHI, GSW, LAC', careerPoints: 19419, lastSeason: '2019-20' },
  { name: 'Bob Lanier', position: 'C', teams: 'DET, MIL', careerPoints: 19248, lastSeason: '1983-84' },
  { name: 'Gail Goodrich', position: 'SG', teams: 'LAL, NOJ, PHO', careerPoints: 19181, lastSeason: '1978-79' },
  { name: 'Reggie Theus', position: 'SG', teams: 'ATL, CHI, KCK, NJN, ORL', careerPoints: 19015, lastSeason: '1990-91' },
  { name: 'Dale Ellis', position: 'SG', teams: 'CHH, DAL, DEN, MIL, SAS', careerPoints: 19004, lastSeason: '1999-00' },
  { name: 'Anthony Davis', position: 'C', teams: 'DAL, LAL, NOH, NOP', careerPoints: 18978, lastSeason: '2024-25' },
  { name: 'Scottie Pippen', position: 'SF', teams: 'CHI, HOU, POR', careerPoints: 18940, lastSeason: '2003-04' },
  { name: 'Jason Terry', position: 'SG', teams: 'ATL, BOS, BRK, DAL, HOU', careerPoints: 18881, lastSeason: '2017-18' },
  { name: 'Chet Walker', position: 'SF', teams: 'CHI, PHI, SYR', careerPoints: 18831, lastSeason: '1974-75' },
  { name: 'Isiah Thomas', position: 'PG', teams: 'DET', careerPoints: 18822, lastSeason: '1993-94' },
  { name: 'Bob McAdoo', position: 'C', teams: 'BOS, BUF, DET, LAL, NJN', careerPoints: 18787, lastSeason: '1985-86' },
  { name: 'Paul George', position: 'SF', teams: 'IND, LAC, OKC, PHI', careerPoints: 18697, lastSeason: '2024-25' },
  { name: 'Zach Randolph', position: 'PF', teams: 'LAC, MEM, NYK, POR, SAC', careerPoints: 18578, lastSeason: '2017-18' },
  { name: 'Mark Aguirre', position: 'SF', teams: 'DAL, DET, LAC', careerPoints: 18458, lastSeason: '1993-94' },
  { name: 'Dolph Schayes', position: 'PF', teams: 'PHI, SYR', careerPoints: 18438, lastSeason: '1963-64' },
  { name: 'Kyrie Irving', position: 'PG', teams: 'BOS, BRK, CLE, DAL', careerPoints: 18433, lastSeason: '2024-25' },
  { name: 'Rick Barry', position: 'SF', teams: 'GSW, HOU, SFW', careerPoints: 18395, lastSeason: '1979-80' },
  { name: 'Tracy McGrady', position: 'SG', teams: 'ATL, DET, HOU, NYK, ORL', careerPoints: 18381, lastSeason: '2011-12' },
  { name: 'Julius Erving', position: 'SF', teams: 'PHI', careerPoints: 18364, lastSeason: '1986-87' },
  { name: 'Glen Rice', position: 'SF', teams: 'CHH, HOU, LAC, LAL, MIA', careerPoints: 18336, lastSeason: '2003-04' },
  { name: 'Dave Bing', position: 'PG', teams: 'BOS, DET, WSB', careerPoints: 18327, lastSeason: '1977-78' },
];
