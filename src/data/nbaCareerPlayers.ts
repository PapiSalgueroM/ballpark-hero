export interface NbaCareerPlayer {
  name: string;
  position: string;
  country: string;
  countryFlag: string;
  draftInfo: string;
  teams: string[];
  stats: string[];
  awards: string[];
}

export interface NbaCareerPuzzle {
  id: string;
  player: NbaCareerPlayer;
}

/**
 * NBA Career Path puzzles (task #25, the one missing Career Path sport).
 * Direct analog of hockeyCareerPlayers.ts.
 *
 * PROVENANCE (Round 925, read 2026-10-03). Every line below is in
 * scripts/data/nbaCareerPathVerified2026-10.json with its value on two hosts:
 * nba.com (position, country, draft, award counts), basketball-reference.com,
 * and ESPN's stats and awards feeds (nba.com Legends profiles for Kareem
 * Abdul-Jabbar and Larry Bird, whose careers ESPN does not hold whole). The
 * record's rules say how each line is built; scripts/simNbaCareerPathFacts.mjs
 * fails if this file and the record differ by a character. Change the record
 * first, from two sources, then this file.
 *
 * Players who played in 2025-26 show floor totals ('43,400+ Pts') so the row
 * cannot go stale; retired players show exact totals. An active player whose
 * current team is not the last one he played for has it appended to his teams.
 *
 * ORDER MATTERS. The daily deal is dailyIndex(dateET, 50), a fresh shuffle every
 * 50 days. The 30 players added in Round 925 sit on the indices dealt first after
 * the release, so nobody the old 20 player pool just dealt comes straight back.
 * The record's 'order' note has the numbers. Keep ids stable; append new rows
 * only after rereading that note.
 */
export const nbaCareerPuzzles: NbaCareerPuzzle[] = [
  {
    id: 'nbac-024',
    player: {
      name: 'Nikola Jokic',
      position: 'Center',
      country: 'Serbia',
      countryFlag: '🇷🇸',
      draftInfo: '2nd Round, 41st Pick (2014)',
      teams: ['Denver Nuggets'],
      stats: ['18,000+ Pts', '8,900+ Reb', '6,000+ Ast'],
      awards: ['3× MVP', 'NBA Champion', 'Finals MVP (2023)', '8× All-Star'],
    },
  },
  {
    id: 'nbac-026',
    player: {
      name: 'James Harden',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 3rd Pick (2009)',
      teams: ['Oklahoma City Thunder', 'Houston Rockets', 'Brooklyn Nets', 'Philadelphia 76ers', 'Los Angeles Clippers', 'Cleveland Cavaliers'],
      stats: ['29,300+ Pts', '8,800+ Ast'],
      awards: ['MVP (2018)', '11× All-Star', '8× All-NBA'],
    },
  },
  {
    id: 'nbac-031',
    player: {
      name: 'Ray Allen',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (1996)',
      teams: ['Milwaukee Bucks', 'Seattle SuperSonics', 'Boston Celtics', 'Miami Heat'],
      stats: ['24,505 Pts', '2,973 made threes'],
      awards: ['2× NBA Champion', '10× All-Star', '2× All-NBA', 'Hall of Famer'],
    },
  },
  {
    id: 'nbac-050',
    player: {
      name: 'Chris Bosh',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 4th Pick (2003)',
      teams: ['Toronto Raptors', 'Miami Heat'],
      stats: ['17,189 Pts', '7,592 Reb'],
      awards: ['2× NBA Champion', '11× All-Star', 'All-NBA'],
    },
  },
  {
    id: 'nbac-001',
    player: {
      name: 'LeBron James',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (2003)',
      teams: ['Cleveland Cavaliers', 'Miami Heat', 'Cleveland Cavaliers', 'Los Angeles Lakers', 'Philadelphia 76ers'],
      stats: ['43,400+ Pts', '12,000+ Reb', '12,000+ Ast'],
      awards: ['4× MVP', '4× NBA Champion', '4× Finals MVP', '22× All-Star'],
    },
  },
  {
    id: 'nbac-002',
    player: {
      name: 'Michael Jordan',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 3rd Pick (1984)',
      teams: ['Chicago Bulls', 'Washington Wizards'],
      stats: ['32,292 Pts', '6,672 Reb', '5,633 Ast'],
      awards: ['5× MVP', '6× NBA Champion', '6× Finals MVP', 'Defensive Player of the Year (1988)'],
    },
  },
  {
    id: 'nbac-035',
    player: {
      name: 'Anthony Davis',
      position: 'Forward-Center',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (2012)',
      teams: ['New Orleans Hornets', 'New Orleans Pelicans', 'Los Angeles Lakers', 'Dallas Mavericks', 'Washington Wizards'],
      stats: ['19,300+ Pts', '1,800+ Blk'],
      awards: ['NBA Champion', '10× All-Star', '5× All-NBA', '5× All-Defensive'],
    },
  },
  {
    id: 'nbac-003',
    player: {
      name: 'Kareem Abdul-Jabbar',
      position: 'Center',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (1969)',
      teams: ['Milwaukee Bucks', 'Los Angeles Lakers'],
      stats: ['38,387 Pts', '17,440 Reb'],
      awards: ['6× MVP', '6× NBA Champion', '2× Finals MVP', '19× All-Star'],
    },
  },
  {
    id: 'nbac-037',
    player: {
      name: 'Reggie Miller',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 11th Pick (1987)',
      teams: ['Indiana Pacers'],
      stats: ['25,279 Pts', '2,560 made threes'],
      awards: ['5× All-Star', '3× All-NBA', 'Hall of Famer'],
    },
  },
  {
    id: 'nbac-043',
    player: {
      name: 'Yao Ming',
      position: 'Center',
      country: 'China',
      countryFlag: '🇨🇳',
      draftInfo: '1st Round, 1st Pick (2002)',
      teams: ['Houston Rockets'],
      stats: ['9,247 Pts', '4,494 Reb', '920 Blk'],
      awards: ['8× All-Star', '5× All-NBA', 'Hall of Famer'],
    },
  },
  {
    id: 'nbac-030',
    player: {
      name: 'Paul Pierce',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 10th Pick (1998)',
      teams: ['Boston Celtics', 'Brooklyn Nets', 'Washington Wizards', 'Los Angeles Clippers'],
      stats: ['26,397 Pts', '2,143 made threes'],
      awards: ['NBA Champion', 'Finals MVP (2008)', '10× All-Star', '4× All-NBA'],
    },
  },
  {
    id: 'nbac-021',
    player: {
      name: 'Magic Johnson',
      position: 'Forward-Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (1979)',
      teams: ['Los Angeles Lakers'],
      stats: ['17,707 Pts', '10,141 Ast'],
      awards: ['3× MVP', '5× NBA Champion', '3× Finals MVP', '12× All-Star'],
    },
  },
  {
    id: 'nbac-004',
    player: {
      name: 'Kobe Bryant',
      position: 'Forward-Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 13th Pick (1996)',
      teams: ['Los Angeles Lakers'],
      stats: ['33,643 Pts', '7,047 Reb', '6,306 Ast'],
      awards: ['MVP (2008)', '5× NBA Champion', '2× Finals MVP', '18× All-Star'],
    },
  },
  {
    id: 'nbac-034',
    player: {
      name: 'Kawhi Leonard',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 15th Pick (2011)',
      teams: ['San Antonio Spurs', 'Toronto Raptors', 'Los Angeles Clippers', 'Toronto Raptors'],
      stats: ['16,500+ Pts', '1,300+ Stl'],
      awards: ['2× NBA Champion', '2× Finals MVP', '2× Defensive Player of the Year', '7× All-Star'],
    },
  },
  {
    id: 'nbac-005',
    player: {
      name: 'Tim Duncan',
      position: 'Center-Forward',
      country: 'US Virgin Islands',
      countryFlag: '🇻🇮',
      draftInfo: '1st Round, 1st Pick (1997)',
      teams: ['San Antonio Spurs'],
      stats: ['26,496 Pts', '15,091 Reb', '3,020 Blk'],
      awards: ['2× MVP', '5× NBA Champion', '3× Finals MVP', '15× All-Star'],
    },
  },
  {
    id: 'nbac-040',
    player: {
      name: 'Dennis Rodman',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '2nd Round, 27th Pick (1986)',
      teams: ['Detroit Pistons', 'San Antonio Spurs', 'Chicago Bulls', 'Los Angeles Lakers', 'Dallas Mavericks'],
      stats: ['11,954 Reb', '6,683 Pts'],
      awards: ['5× NBA Champion', '2× Defensive Player of the Year', '2× All-Star', '2× All-NBA'],
    },
  },
  {
    id: 'nbac-038',
    player: {
      name: 'David Robinson',
      position: 'Center',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (1987)',
      teams: ['San Antonio Spurs'],
      stats: ['20,790 Pts', '10,497 Reb', '2,954 Blk'],
      awards: ['MVP (1995)', '2× NBA Champion', 'Defensive Player of the Year (1992)', '10× All-Star'],
    },
  },
  {
    id: 'nbac-049',
    player: {
      name: 'Shai Gilgeous-Alexander',
      position: 'Guard',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 11th Pick (2018)',
      teams: ['Los Angeles Clippers', 'Oklahoma City Thunder'],
      stats: ['13,400+ Pts', '2,800+ Ast'],
      awards: ['2× MVP', 'NBA Champion', 'Finals MVP (2025)', '4× All-Star'],
    },
  },
  {
    id: 'nbac-032',
    player: {
      name: 'Carmelo Anthony',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 3rd Pick (2003)',
      teams: ['Denver Nuggets', 'New York Knicks', 'Oklahoma City Thunder', 'Houston Rockets', 'Portland Trail Blazers', 'Los Angeles Lakers'],
      stats: ['28,289 Pts', '1,731 made threes'],
      awards: ['10× All-Star', '6× All-NBA'],
    },
  },
  {
    id: 'nbac-006',
    player: {
      name: "Shaquille O'Neal",
      position: 'Center',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (1992)',
      teams: ['Orlando Magic', 'Los Angeles Lakers', 'Miami Heat', 'Phoenix Suns', 'Cleveland Cavaliers', 'Boston Celtics'],
      stats: ['28,596 Pts', '13,099 Reb'],
      awards: ['MVP (2000)', '4× NBA Champion', '3× Finals MVP', 'Rookie of the Year (1993)'],
    },
  },
  {
    id: 'nbac-007',
    player: {
      name: 'Stephen Curry',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 7th Pick (2009)',
      teams: ['Golden State Warriors'],
      stats: ['26,500+ Pts', '4,200+ made threes'],
      awards: ['2× MVP', '4× NBA Champion', 'Finals MVP (2022)', '12× All-Star'],
    },
  },
  {
    id: 'nbac-008',
    player: {
      name: 'Kevin Garnett',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (1995)',
      teams: ['Minnesota Timberwolves', 'Boston Celtics', 'Brooklyn Nets', 'Minnesota Timberwolves'],
      stats: ['26,071 Pts', '14,662 Reb'],
      awards: ['MVP (2004)', 'NBA Champion', 'Defensive Player of the Year (2008)', '15× All-Star'],
    },
  },
  {
    id: 'nbac-025',
    player: {
      name: 'Luka Doncic',
      position: 'Guard',
      country: 'Slovenia',
      countryFlag: '🇸🇮',
      draftInfo: '1st Round, 3rd Pick (2018)',
      teams: ['Dallas Mavericks', 'Los Angeles Lakers'],
      stats: ['15,000+ Pts', '4,200+ Ast'],
      awards: ['6× All-Star', 'Rookie of the Year (2019)', '6× All-NBA'],
    },
  },
  {
    id: 'nbac-048',
    player: {
      name: 'Dikembe Mutombo',
      position: 'Center',
      country: 'DR Congo',
      countryFlag: '🇨🇩',
      draftInfo: '1st Round, 4th Pick (1991)',
      teams: ['Denver Nuggets', 'Atlanta Hawks', 'Philadelphia 76ers', 'New Jersey Nets', 'New York Knicks', 'Houston Rockets'],
      stats: ['3,289 Blk', '12,359 Reb'],
      awards: ['4× Defensive Player of the Year', '8× All-Star', '3× All-NBA', '6× All-Defensive'],
    },
  },
  {
    id: 'nbac-042',
    player: {
      name: 'Pau Gasol',
      position: 'Center-Forward',
      country: 'Spain',
      countryFlag: '🇪🇸',
      draftInfo: '1st Round, 3rd Pick (2001)',
      teams: ['Memphis Grizzlies', 'Los Angeles Lakers', 'Chicago Bulls', 'San Antonio Spurs', 'Milwaukee Bucks'],
      stats: ['20,894 Pts', '11,305 Reb'],
      awards: ['2× NBA Champion', '6× All-Star', 'Rookie of the Year (2002)', '4× All-NBA'],
    },
  },
  {
    id: 'nbac-029',
    player: {
      name: 'Dwight Howard',
      position: 'Center-Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (2004)',
      teams: ['Orlando Magic', 'Los Angeles Lakers', 'Houston Rockets', 'Atlanta Hawks', 'Charlotte Hornets', 'Washington Wizards', 'Los Angeles Lakers', 'Philadelphia 76ers', 'Los Angeles Lakers'],
      stats: ['19,485 Pts', '14,627 Reb', '2,228 Blk'],
      awards: ['NBA Champion', '3× Defensive Player of the Year', '8× All-Star', '8× All-NBA'],
    },
  },
  {
    id: 'nbac-033',
    player: {
      name: 'Jason Kidd',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 2nd Pick (1994)',
      teams: ['Dallas Mavericks', 'Phoenix Suns', 'New Jersey Nets', 'Dallas Mavericks', 'New York Knicks'],
      stats: ['12,091 Ast', '2,684 Stl'],
      awards: ['NBA Champion', '10× All-Star', 'Rookie of the Year (1995)', '6× All-NBA'],
    },
  },
  {
    id: 'nbac-023',
    player: {
      name: 'Giannis Antetokounmpo',
      position: 'Forward',
      country: 'Greece',
      countryFlag: '🇬🇷',
      draftInfo: '1st Round, 15th Pick (2013)',
      teams: ['Milwaukee Bucks', 'Miami Heat'],
      stats: ['21,500+ Pts', '8,800+ Reb'],
      awards: ['2× MVP', 'NBA Champion', 'Finals MVP (2021)', 'Defensive Player of the Year (2020)'],
    },
  },
  {
    id: 'nbac-046',
    player: {
      name: 'Jayson Tatum',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 3rd Pick (2017)',
      teams: ['Boston Celtics'],
      stats: ['14,100+ Pts', '4,400+ Reb'],
      awards: ['NBA Champion', '6× All-Star', '5× All-NBA'],
    },
  },
  {
    id: 'nbac-041',
    player: {
      name: 'Manu Ginobili',
      position: 'Guard',
      country: 'Argentina',
      countryFlag: '🇦🇷',
      draftInfo: '2nd Round, 57th Pick (1999)',
      teams: ['San Antonio Spurs'],
      stats: ['14,043 Pts', '4,001 Ast'],
      awards: ['4× NBA Champion', '2× All-Star', '2× All-NBA'],
    },
  },
  {
    id: 'nbac-009',
    player: {
      name: 'Dirk Nowitzki',
      position: 'Forward',
      country: 'Germany',
      countryFlag: '🇩🇪',
      draftInfo: '1st Round, 9th Pick (1998)',
      teams: ['Dallas Mavericks'],
      stats: ['31,560 Pts', '1,982 made threes'],
      awards: ['MVP (2007)', 'NBA Champion', 'Finals MVP (2011)', '14× All-Star'],
    },
  },
  {
    id: 'nbac-010',
    player: {
      name: 'Hakeem Olajuwon',
      position: 'Center',
      country: 'Nigeria',
      countryFlag: '🇳🇬',
      draftInfo: '1st Round, 1st Pick (1984)',
      teams: ['Houston Rockets', 'Toronto Raptors'],
      stats: ['26,946 Pts', '13,748 Reb', '3,830 Blk'],
      awards: ['MVP (1994)', '2× NBA Champion', '2× Finals MVP', '2× Defensive Player of the Year'],
    },
  },
  {
    id: 'nbac-028',
    player: {
      name: 'Karl Malone',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 13th Pick (1985)',
      teams: ['Utah Jazz', 'Los Angeles Lakers'],
      stats: ['36,928 Pts', '14,968 Reb'],
      awards: ['2× MVP', '14× All-Star', '14× All-NBA', '4× All-Defensive'],
    },
  },
  {
    id: 'nbac-044',
    player: {
      name: 'Joel Embiid',
      position: 'Center',
      country: 'Cameroon',
      countryFlag: '🇨🇲',
      draftInfo: '1st Round, 3rd Pick (2014)',
      teams: ['Philadelphia 76ers'],
      stats: ['13,500+ Pts', '5,200+ Reb'],
      awards: ['MVP (2023)', '7× All-Star', '5× All-NBA', '3× All-Defensive'],
    },
  },
  {
    id: 'nbac-011',
    player: {
      name: 'Larry Bird',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 6th Pick (1978)',
      teams: ['Boston Celtics'],
      stats: ['24.3 PPG', '10.0 RPG', '6.3 APG'],
      awards: ['3× MVP', '3× NBA Champion', '2× Finals MVP', 'Rookie of the Year (1980)'],
    },
  },
  {
    id: 'nbac-012',
    player: {
      name: 'Allen Iverson',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (1996)',
      teams: ['Philadelphia 76ers', 'Denver Nuggets', 'Detroit Pistons', 'Memphis Grizzlies', 'Philadelphia 76ers'],
      stats: ['24,368 Pts', '5,624 Ast'],
      awards: ['MVP (2001)', '11× All-Star', 'Rookie of the Year (1997)', '7× All-NBA'],
    },
  },
  {
    id: 'nbac-022',
    player: {
      name: 'Kevin Durant',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 2nd Pick (2007)',
      teams: ['Seattle SuperSonics', 'Oklahoma City Thunder', 'Golden State Warriors', 'Brooklyn Nets', 'Phoenix Suns', 'Houston Rockets'],
      stats: ['32,500+ Pts', '8,200+ Reb'],
      awards: ['MVP (2014)', '2× NBA Champion', '2× Finals MVP', '16× All-Star'],
    },
  },
  {
    id: 'nbac-039',
    player: {
      name: 'Isiah Thomas',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 2nd Pick (1981)',
      teams: ['Detroit Pistons'],
      stats: ['18,822 Pts', '9,061 Ast'],
      awards: ['2× NBA Champion', 'Finals MVP (1990)', '12× All-Star', '5× All-NBA'],
    },
  },
  {
    id: 'nbac-045',
    player: {
      name: 'Tracy McGrady',
      position: 'Guard-Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 9th Pick (1997)',
      teams: ['Toronto Raptors', 'Orlando Magic', 'Houston Rockets', 'New York Knicks', 'Detroit Pistons', 'Atlanta Hawks'],
      stats: ['18,381 Pts', '4,161 Ast'],
      awards: ['7× All-Star', '7× All-NBA', 'Hall of Famer'],
    },
  },
  {
    id: 'nbac-013',
    player: {
      name: 'Dwyane Wade',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (2003)',
      teams: ['Miami Heat', 'Chicago Bulls', 'Cleveland Cavaliers', 'Miami Heat'],
      stats: ['23,165 Pts', '5,701 Ast'],
      awards: ['3× NBA Champion', 'Finals MVP (2006)', '13× All-Star', '8× All-NBA'],
    },
  },
  {
    id: 'nbac-014',
    player: {
      name: 'Charles Barkley',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (1984)',
      teams: ['Philadelphia 76ers', 'Phoenix Suns', 'Houston Rockets'],
      stats: ['23,757 Pts', '12,546 Reb'],
      awards: ['MVP (1993)', '11× All-Star', '11× All-NBA', 'Hall of Famer'],
    },
  },
  {
    id: 'nbac-015',
    player: {
      name: 'Chris Paul',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 4th Pick (2005)',
      teams: ['New Orleans Hornets', 'Los Angeles Clippers', 'Houston Rockets', 'Oklahoma City Thunder', 'Phoenix Suns', 'Golden State Warriors', 'San Antonio Spurs', 'Los Angeles Clippers'],
      stats: ['23,000+ Pts', '12,500+ Ast'],
      awards: ['Rookie of the Year (2006)', '12× All-Star', '11× All-NBA', '9× All-Defensive'],
    },
  },
  {
    id: 'nbac-016',
    player: {
      name: 'Patrick Ewing',
      position: 'Center',
      country: 'Jamaica',
      countryFlag: '🇯🇲',
      draftInfo: '1st Round, 1st Pick (1985)',
      teams: ['New York Knicks', 'Seattle SuperSonics', 'Orlando Magic'],
      stats: ['24,815 Pts', '11,607 Reb'],
      awards: ['Rookie of the Year (1986)', '11× All-Star', 'Hall of Famer', '7× All-NBA'],
    },
  },
  {
    id: 'nbac-036',
    player: {
      name: 'Scottie Pippen',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (1987)',
      teams: ['Chicago Bulls', 'Houston Rockets', 'Portland Trail Blazers', 'Chicago Bulls'],
      stats: ['18,940 Pts', '2,307 Stl'],
      awards: ['6× NBA Champion', '7× All-Star', '7× All-NBA', '10× All-Defensive'],
    },
  },
  {
    id: 'nbac-017',
    player: {
      name: 'John Stockton',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 16th Pick (1984)',
      teams: ['Utah Jazz'],
      stats: ['15,806 Ast', '3,265 Stl'],
      awards: ['10× All-Star', 'Hall of Famer', '11× All-NBA', '5× All-Defensive'],
    },
  },
  {
    id: 'nbac-027',
    player: {
      name: 'Russell Westbrook',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 4th Pick (2008)',
      teams: ['Oklahoma City Thunder', 'Houston Rockets', 'Washington Wizards', 'Los Angeles Lakers', 'Los Angeles Clippers', 'Denver Nuggets', 'Sacramento Kings'],
      stats: ['27,100+ Pts', '9,000+ Reb', '10,300+ Ast'],
      awards: ['MVP (2017)', '9× All-Star', '9× All-NBA'],
    },
  },
  {
    id: 'nbac-018',
    player: {
      name: 'Clyde Drexler',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 14th Pick (1983)',
      teams: ['Portland Trail Blazers', 'Houston Rockets'],
      stats: ['22,195 Pts', '6,677 Reb', '2,207 Stl'],
      awards: ['NBA Champion', '10× All-Star', '5× All-NBA', 'Hall of Famer'],
    },
  },
  {
    id: 'nbac-019',
    player: {
      name: 'Gary Payton',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 2nd Pick (1990)',
      teams: ['Seattle SuperSonics', 'Milwaukee Bucks', 'Los Angeles Lakers', 'Boston Celtics', 'Miami Heat'],
      stats: ['21,813 Pts', '8,966 Ast', '2,445 Stl'],
      awards: ['Defensive Player of the Year (1996)', 'NBA Champion', '9× All-Star', '9× All-NBA'],
    },
  },
  {
    id: 'nbac-020',
    player: {
      name: 'Vince Carter',
      position: 'Guard-Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (1998)',
      teams: ['Toronto Raptors', 'New Jersey Nets', 'Orlando Magic', 'Phoenix Suns', 'Dallas Mavericks', 'Memphis Grizzlies', 'Sacramento Kings', 'Atlanta Hawks'],
      stats: ['25,728 Pts', '2,290 made threes'],
      awards: ['8× All-Star', 'Rookie of the Year (1999)', '2× All-NBA'],
    },
  },
  {
    id: 'nbac-047',
    player: {
      name: 'Derrick Rose',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (2008)',
      teams: ['Chicago Bulls', 'New York Knicks', 'Cleveland Cavaliers', 'Minnesota Timberwolves', 'Detroit Pistons', 'New York Knicks', 'Memphis Grizzlies'],
      stats: ['12,573 Pts', '3,770 Ast'],
      awards: ['MVP (2011)', '3× All-Star', 'Rookie of the Year (2009)', 'All-NBA'],
    },
  },
];
