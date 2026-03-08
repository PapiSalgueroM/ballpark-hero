export interface BaseballCareerPlayer {
  name: string;
  position: string;
  draftInfo: string;
  firstTeam: string;
  teams: string[];
  stats: string[];
  awards: string[];
}

export interface BaseballCareerPuzzle {
  id: string;
  player: BaseballCareerPlayer;
}

export const baseballCareerPuzzles: BaseballCareerPuzzle[] = [
  {
    id: 'bc-001',
    player: {
      name: 'Mike Trout',
      position: 'Center Fielder',
      draftInfo: '1st Round, 25th Pick (2009)',
      firstTeam: 'Los Angeles Angels',
      teams: ['Los Angeles Angels'],
      stats: ['.303 AVG', '378 HR', '940 RBI'],
      awards: ['3× AL MVP', '10× All-Star', '9× Silver Slugger'],
    },
  },
  {
    id: 'bc-002',
    player: {
      name: 'Clayton Kershaw',
      position: 'Starting Pitcher',
      draftInfo: '1st Round, 7th Pick (2006)',
      firstTeam: 'Los Angeles Dodgers',
      teams: ['Los Angeles Dodgers'],
      stats: ['2.48 ERA', '2,944 SO', '210 W'],
      awards: ['3× NL Cy Young', 'NL MVP (2014)', '9× All-Star', '2020 World Series Champion'],
    },
  },
  {
    id: 'bc-003',
    player: {
      name: 'Derek Jeter',
      position: 'Shortstop',
      draftInfo: '1st Round, 6th Pick (1992)',
      firstTeam: 'New York Yankees',
      teams: ['New York Yankees'],
      stats: ['.310 AVG', '260 HR', '1,311 RBI'],
      awards: ['5× World Series Champion', '14× All-Star', 'AL ROY (1996)', '5× Gold Glove'],
    },
  },
  {
    id: 'bc-004',
    player: {
      name: 'Albert Pujols',
      position: 'First Baseman',
      draftInfo: '13th Round, 402nd Pick (1999)',
      firstTeam: 'St. Louis Cardinals',
      teams: ['St. Louis Cardinals', 'Los Angeles Angels', 'Los Angeles Dodgers'],
      stats: ['.296 AVG', '703 HR', '2,218 RBI'],
      awards: ['3× NL MVP', '2× World Series Champion', '11× All-Star', '6× Silver Slugger'],
    },
  },
  {
    id: 'bc-005',
    player: {
      name: 'Shohei Ohtani',
      position: 'Designated Hitter / Pitcher',
      draftInfo: 'International Free Agent (2017)',
      firstTeam: 'Los Angeles Angels',
      teams: ['Los Angeles Angels', 'Los Angeles Dodgers'],
      stats: ['.275 AVG', '225 HR', '38 W', '3.01 ERA'],
      awards: ['2× AL MVP', '2024 NL MVP', '4× All-Star', '2024 World Series Champion'],
    },
  },
  {
    id: 'bc-006',
    player: {
      name: 'Mariano Rivera',
      position: 'Relief Pitcher',
      draftInfo: 'Amateur Free Agent (1990)',
      firstTeam: 'New York Yankees',
      teams: ['New York Yankees'],
      stats: ['2.21 ERA', '652 SV', '1,173 SO'],
      awards: ['5× World Series Champion', '13× All-Star', '1999 World Series MVP', 'First unanimous HOF selection'],
    },
  },
  {
    id: 'bc-007',
    player: {
      name: 'Mookie Betts',
      position: 'Right Fielder',
      draftInfo: '5th Round, 172nd Pick (2011)',
      firstTeam: 'Boston Red Sox',
      teams: ['Boston Red Sox', 'Los Angeles Dodgers'],
      stats: ['.292 AVG', '260 HR', '775 RBI'],
      awards: ['AL MVP (2018)', '2× World Series Champion', '6× Gold Glove', '8× All-Star'],
    },
  },
  {
    id: 'bc-008',
    player: {
      name: 'Pedro Martinez',
      position: 'Starting Pitcher',
      draftInfo: 'Amateur Free Agent (1988)',
      firstTeam: 'Los Angeles Dodgers',
      teams: ['Los Angeles Dodgers', 'Montreal Expos', 'Boston Red Sox', 'New York Mets', 'Philadelphia Phillies'],
      stats: ['2.93 ERA', '3,154 SO', '219 W'],
      awards: ['3× Cy Young', '2004 World Series Champion', '8× All-Star', 'Hall of Fame (2015)'],
    },
  },
  {
    id: 'bc-009',
    player: {
      name: 'Ichiro Suzuki',
      position: 'Right Fielder',
      draftInfo: 'International Free Agent (2000)',
      firstTeam: 'Seattle Mariners',
      teams: ['Seattle Mariners', 'New York Yankees', 'Miami Marlins'],
      stats: ['.311 AVG', '117 HR', '3,089 MLB Hits'],
      awards: ['AL MVP (2001)', 'AL ROY (2001)', '10× All-Star', '10× Gold Glove'],
    },
  },
  {
    id: 'bc-010',
    player: {
      name: 'Aaron Judge',
      position: 'Right Fielder',
      draftInfo: '1st Round, 32nd Pick (2013)',
      firstTeam: 'New York Yankees',
      teams: ['New York Yankees'],
      stats: ['.275 AVG', '290 HR', '620 RBI'],
      awards: ['AL MVP (2022)', 'AL ROY (2017)', '5× All-Star', '62 HR in 2022'],
    },
  },
  {
    id: 'bc-011',
    player: {
      name: 'Justin Verlander',
      position: 'Starting Pitcher',
      draftInfo: '1st Round, 2nd Pick (2004)',
      firstTeam: 'Detroit Tigers',
      teams: ['Detroit Tigers', 'Houston Astros', 'New York Mets'],
      stats: ['3.24 ERA', '3,416 SO', '262 W'],
      awards: ['2× AL Cy Young', 'AL MVP (2011)', '2017 & 2022 World Series Champion', '9× All-Star'],
    },
  },
  {
    id: 'bc-012',
    player: {
      name: 'David Ortiz',
      position: 'Designated Hitter',
      draftInfo: 'International Free Agent (1992)',
      firstTeam: 'Minnesota Twins',
      teams: ['Minnesota Twins', 'Boston Red Sox'],
      stats: ['.286 AVG', '541 HR', '1,768 RBI'],
      awards: ['3× World Series Champion', '10× All-Star', '7× Silver Slugger', '2013 World Series MVP'],
    },
  },
  {
    id: 'bc-013',
    player: {
      name: 'Max Scherzer',
      position: 'Starting Pitcher',
      draftInfo: '1st Round, 11th Pick (2006)',
      firstTeam: 'Arizona Diamondbacks',
      teams: ['Arizona Diamondbacks', 'Detroit Tigers', 'Washington Nationals', 'Los Angeles Dodgers', 'New York Mets', 'Texas Rangers'],
      stats: ['3.16 ERA', '3,407 SO', '214 W'],
      awards: ['3× Cy Young', '2019 World Series Champion', '8× All-Star', '2 No-Hitters'],
    },
  },
  {
    id: 'bc-014',
    player: {
      name: 'Bryce Harper',
      position: 'Right Fielder / First Baseman',
      draftInfo: '1st Round, 1st Pick (2010)',
      firstTeam: 'Washington Nationals',
      teams: ['Washington Nationals', 'Philadelphia Phillies'],
      stats: ['.277 AVG', '310 HR', '870 RBI'],
      awards: ['2× NL MVP', '2022 World Series Champion', '7× All-Star', 'NL ROY (2012)'],
    },
  },
  {
    id: 'bc-015',
    player: {
      name: 'Ken Griffey Jr.',
      position: 'Center Fielder',
      draftInfo: '1st Round, 1st Pick (1987)',
      firstTeam: 'Seattle Mariners',
      teams: ['Seattle Mariners', 'Cincinnati Reds', 'Chicago White Sox'],
      stats: ['.284 AVG', '630 HR', '1,836 RBI'],
      awards: ['AL MVP (1997)', '13× All-Star', '10× Gold Glove', 'Hall of Fame (2016)'],
    },
  },
];
