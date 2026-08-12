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
 * PROVENANCE (2026-07-22): team memberships, career points/rebounds/assists
 * and draft slots verified against nba_player_stats / nba_players_extended_v2
 * / nba_draft_picks during the Connections authoring session (exact numbers
 * below match those query results; active players use "+"-style totals so
 * they don't go stale). Team ORDER within a career and awards are standard
 * record-book facts (same convention the hockey file uses). Ewing's Jamaica
 * birthplace comes straight from nba_players_extended_v2.
 */
export const nbaCareerPuzzles: NbaCareerPuzzle[] = [
  {
    id: 'nbac-001',
    player: {
      name: 'LeBron James',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (2003)',
      teams: ['Cleveland Cavaliers', 'Miami Heat', 'Cleveland Cavaliers', 'Los Angeles Lakers'],
      stats: ['43,000+ Pts', '12,000+ Reb', '11,900+ Ast'],
      awards: ['4× MVP', '4× NBA Champion', '4× Finals MVP', 'All-time scoring leader'],
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
      awards: ['5× MVP', '6× NBA Champion', '6× Finals MVP', '10× scoring champion'],
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
    id: 'nbac-004',
    player: {
      name: 'Kobe Bryant',
      position: 'Guard',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 13th Pick (1996)',
      teams: ['Los Angeles Lakers'],
      stats: ['33,643 Pts', '7,047 Reb', '6,306 Ast'],
      awards: ['MVP (2008)', '5× NBA Champion', '2× Finals MVP', '18× All-Star'],
    },
  },
  {
    id: 'nbac-005',
    player: {
      name: 'Tim Duncan',
      position: 'Forward-Center',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (1997)',
      teams: ['San Antonio Spurs'],
      stats: ['26,496 Pts', '15,091 Reb', '3,020 Blk'],
      awards: ['2× MVP', '5× NBA Champion', '3× Finals MVP', '15× All-Star'],
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
      stats: ['26,000+ Pts', '4,200+ made threes (all-time record)'],
      awards: ['2× MVP', '4× NBA Champion', 'Finals MVP (2022)', 'First unanimous MVP (2016)'],
    },
  },
  {
    id: 'nbac-008',
    player: {
      name: 'Kevin Garnett',
      position: 'Forward',
      country: 'USA',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 5th Pick (1995, straight out of high school)',
      teams: ['Minnesota Timberwolves', 'Boston Celtics', 'Brooklyn Nets', 'Minnesota Timberwolves'],
      stats: ['26,071 Pts', '14,662 Reb'],
      awards: ['MVP (2004)', 'NBA Champion (2008)', 'Defensive Player of the Year', '15× All-Star'],
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
      stats: ['31,560 Pts', '11,489 Reb'],
      awards: ['MVP (2007)', 'NBA Champion (2011)', 'Finals MVP (2011)', '14× All-Star'],
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
      stats: ['26,946 Pts', '13,748 Reb', '3,800+ Blk (all-time record)'],
      awards: ['MVP (1994)', '2× NBA Champion', '2× Finals MVP', '2× Defensive Player of the Year'],
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
      stats: ['21,791 Pts', '8,974 Reb', '5,695 Ast'],
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
      awards: ['MVP (2001)', '4× scoring champion', '11× All-Star', 'Rookie of the Year (1997)'],
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
      awards: ['3× NBA Champion', 'Finals MVP (2006)', 'Scoring champion (2009)', '13× All-Star'],
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
      awards: ['MVP (1993)', '11× All-Star', '2× Olympic gold (Dream Team)'],
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
      teams: ['New Orleans Hornets', 'Los Angeles Clippers', 'Houston Rockets', 'Oklahoma City Thunder', 'Phoenix Suns', 'Golden State Warriors', 'San Antonio Spurs'],
      stats: ['23,000+ Pts', '12,500+ Ast'],
      awards: ['Rookie of the Year (2006)', '12× All-Star', '5× assists champion', '6× steals champion'],
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
      awards: ['Rookie of the Year (1986)', '11× All-Star', 'Hall of Fame (2008)'],
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
      stats: ['15,806 Ast (all-time record)', '3,265 Stl (all-time record)'],
      awards: ['10× All-Star', '9× assists champion', 'Hall of Fame (2009)'],
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
      awards: ['NBA Champion (1995)', '10× All-Star', 'Dream Team gold (1992)'],
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
      awards: ['Defensive Player of the Year (1996)', 'NBA Champion (2006)', '9× All-Star', 'Nicknamed "The Glove"'],
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
      stats: ['25,728 Pts', 'Played a record 22 seasons'],
      awards: ['Slam Dunk Contest champion (2000)', '8× All-Star', 'Rookie of the Year (1999)'],
    },
  },
];
