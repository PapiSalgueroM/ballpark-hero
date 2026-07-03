export interface NbaTeam {
  name: string;
  abbreviation: string;
}

export const NBA_TEAMS: NbaTeam[] = [
  { name: 'Atlanta Hawks', abbreviation: 'atl' },
  { name: 'Boston Celtics', abbreviation: 'bos' },
  { name: 'Brooklyn Nets', abbreviation: 'bkn' },
  { name: 'Charlotte Hornets', abbreviation: 'cha' },
  { name: 'Chicago Bulls', abbreviation: 'chi' },
  { name: 'Cleveland Cavaliers', abbreviation: 'cle' },
  { name: 'Dallas Mavericks', abbreviation: 'dal' },
  { name: 'Denver Nuggets', abbreviation: 'den' },
  { name: 'Detroit Pistons', abbreviation: 'det' },
  { name: 'Golden State Warriors', abbreviation: 'gs' },
  { name: 'Houston Rockets', abbreviation: 'hou' },
  { name: 'Indiana Pacers', abbreviation: 'ind' },
  { name: 'LA Clippers', abbreviation: 'lac' },
  { name: 'Los Angeles Lakers', abbreviation: 'lal' },
  { name: 'Memphis Grizzlies', abbreviation: 'mem' },
  { name: 'Miami Heat', abbreviation: 'mia' },
  { name: 'Milwaukee Bucks', abbreviation: 'mil' },
  { name: 'Minnesota Timberwolves', abbreviation: 'min' },
  { name: 'New Orleans Pelicans', abbreviation: 'no' },
  { name: 'New York Knicks', abbreviation: 'ny' },
  { name: 'Oklahoma City Thunder', abbreviation: 'okc' },
  { name: 'Orlando Magic', abbreviation: 'orl' },
  { name: 'Philadelphia 76ers', abbreviation: 'phi' },
  { name: 'Phoenix Suns', abbreviation: 'phx' },
  { name: 'Portland Trail Blazers', abbreviation: 'por' },
  { name: 'Sacramento Kings', abbreviation: 'sac' },
  { name: 'San Antonio Spurs', abbreviation: 'sa' },
  { name: 'Toronto Raptors', abbreviation: 'tor' },
  { name: 'Utah Jazz', abbreviation: 'utah' },
  { name: 'Washington Wizards', abbreviation: 'wsh' },
];

export function getRandomNbaTeams(count: number): NbaTeam[] {
  const shuffled = [...NBA_TEAMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
