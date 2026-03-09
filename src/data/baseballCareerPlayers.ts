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
      stats: ['.299 AVG', '385 HR', '960 RBI'],
      awards: ['3× AL MVP', '11× All-Star', '9× Silver Slugger'],
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
      stats: ['.285 AVG', '270+ HR', '38 W', '3.01 ERA'],
      awards: ['2× AL MVP', '2024 NL MVP', '4× All-Star', '2× World Series Champion (2024, 2025)'],
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
      stats: ['.290 AVG', '290+ HR', '850+ RBI'],
      awards: ['AL MVP (2018)', '3× World Series Champion (2018, 2024, 2025)', '6× Gold Glove', '9× All-Star'],
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
      stats: ['.275 AVG', '310+ HR', '680+ RBI'],
      awards: ['AL MVP (2022)', 'AL ROY (2017)', '6× All-Star', '62 HR in 2022'],
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
      stats: ['.280 AVG', '320+ HR', '900+ RBI'],
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
  {
    id: 'bc-016',
    player: {
      name: 'Juan Soto',
      position: 'Right Fielder',
      draftInfo: 'International Free Agent (2015)',
      firstTeam: 'Washington Nationals',
      teams: ['Washington Nationals', 'San Diego Padres', 'New York Yankees', 'New York Mets'],
      stats: ['.285 AVG', '200+ HR', '600+ RBI'],
      awards: ['2019 World Series Champion', '5× All-Star', '4× Silver Slugger', 'Batting Title (2020)'],
    },
  },
  {
    id: 'bc-017',
    player: {
      name: 'Ronald Acuna Jr.',
      position: 'Right Fielder',
      draftInfo: 'International Free Agent (2014)',
      firstTeam: 'Atlanta Braves',
      teams: ['Atlanta Braves'],
      stats: ['.280 AVG', '160+ HR', '450+ RBI'],
      awards: ['NL MVP (2023)', 'NL ROY (2018)', '3× All-Star', '40-70 Club (2023)'],
    },
  },
  {
    id: 'bc-018',
    player: {
      name: 'Freddie Freeman',
      position: 'First Baseman',
      draftInfo: '2nd Round, 78th Pick (2007)',
      firstTeam: 'Atlanta Braves',
      teams: ['Atlanta Braves', 'Los Angeles Dodgers'],
      stats: ['.295 AVG', '320+ HR', '1,100+ RBI'],
      awards: ['NL MVP (2020)', '2× World Series Champion (2021, 2024)', '8× All-Star', '3× Silver Slugger'],
    },
  },
  {
    id: 'bc-019',
    player: {
      name: 'Trea Turner',
      position: 'Shortstop',
      draftInfo: '1st Round, 13th Pick (2014)',
      firstTeam: 'Washington Nationals',
      teams: ['Washington Nationals', 'Los Angeles Dodgers', 'Philadelphia Phillies'],
      stats: ['.290 AVG', '160+ HR', '550+ RBI'],
      awards: ['2019 World Series Champion', '3× All-Star', '2× Stolen Base Leader', 'Silver Slugger'],
    },
  },
  {
    id: 'bc-020',
    player: {
      name: 'Corey Seager',
      position: 'Shortstop',
      draftInfo: '1st Round, 18th Pick (2012)',
      firstTeam: 'Los Angeles Dodgers',
      teams: ['Los Angeles Dodgers', 'Texas Rangers'],
      stats: ['.285 AVG', '190+ HR', '600+ RBI'],
      awards: ['2020 World Series MVP', '2023 World Series MVP', 'NL ROY (2016)', '3× All-Star'],
    },
  },
];
