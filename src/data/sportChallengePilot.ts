export type PilotSport = 'soccer' | 'nba';

// The two names are the actual finalists, including the losing finalist.
// The points are editorial difficulty. Freeze this bank for version 1.
type Final = readonly [year: number, points: 10 | 15 | 20, first: string, second: string];
export const finals: Record<PilotSport, readonly Final[]> = {
  soccer: [
    [2010, 10, 'Spain', 'Netherlands'],
    [2014, 10, 'Germany', 'Argentina'],
    [2018, 10, 'France', 'Croatia'],
    [2022, 10, 'Argentina', 'France'],
    [1994, 15, 'Brazil', 'Italy'],
    [1998, 15, 'France', 'Brazil'],
    [2002, 15, 'Brazil', 'Germany'],
    [2006, 15, 'Italy', 'France'],
    [1930, 20, 'Uruguay', 'Argentina'],
    [1938, 20, 'Italy', 'Hungary'],
    [1958, 20, 'Brazil', 'Sweden'],
    [1962, 20, 'Brazil', 'Czechoslovakia'],
  ],
  nba: [
    [2021, 10, 'Milwaukee Bucks', 'Phoenix Suns'],
    [2022, 10, 'Golden State Warriors', 'Boston Celtics'],
    [2023, 10, 'Denver Nuggets', 'Miami Heat'],
    [2024, 10, 'Boston Celtics', 'Dallas Mavericks'],
    [2011, 15, 'Dallas Mavericks', 'Miami Heat'],
    [2014, 15, 'San Antonio Spurs', 'Miami Heat'],
    [2016, 15, 'Cleveland Cavaliers', 'Golden State Warriors'],
    [2019, 15, 'Toronto Raptors', 'Golden State Warriors'],
    [1995, 20, 'Houston Rockets', 'Orlando Magic'],
    [2000, 20, 'Los Angeles Lakers', 'Indiana Pacers'],
    [2004, 20, 'Detroit Pistons', 'Los Angeles Lakers'],
    [2009, 20, 'Los Angeles Lakers', 'Orlando Magic'],
  ],
};

export const factCheckDate = '2026-11-26';
export const independentSource: Record<PilotSport, string> = {
  soccer: 'https://www.rsssf.org/tablesw/worldcup.html',
  nba: 'https://www.ultimatenba.com/en/history/finals/',
};

export function finalsSource(sport: PilotSport, year: number) {
  if (sport === 'nba') return 'https://www.nba.com/news/history-nba-champions';
  const article = year <= 1978
    ? 'world-cup-champions-1930-1978-uruguay-italy-germany-brazil-england-argentina'
    : 'world-cup-champions-1982-2026-italy-argentina-germany-brazil-france-spain';
  return 'https://www.fifa.com/en/tournaments/mens/worldcup/articles/' + article;
}

export const teamAliases: Record<string, string[]> = {
  Brazil: ['Brasil', 'BRA'], Germany: ['Deutschland', 'GER'], Italy: ['Italia', 'ITA'],
  Croatia: ['Hrvatska', 'CRO'], Netherlands: ['Nederland', 'the Netherlands', 'Holland', 'NED'],
  Spain: ['España', 'ESP'], Sweden: ['Sverige', 'SWE'], France: ['FRA'], Argentina: ['ARG'],
  Hungary: ['Magyarország', 'HUN'], Czechoslovakia: ['Československo', 'TCH'], Uruguay: ['URU'],
  'Los Angeles Lakers': ['LA Lakers', 'LAL'], 'Cleveland Cavaliers': ['Cavs', 'CLE'],
  'Dallas Mavericks': ['Mavs', 'DAL'], 'Golden State Warriors': ['GSW', 'Dubs'],
  'San Antonio Spurs': ['SAS'], 'Milwaukee Bucks': ['MIL'], 'Boston Celtics': ['BOS'],
  'Denver Nuggets': ['DEN'], 'Miami Heat': ['MIA'], 'Phoenix Suns': ['PHX'],
  'Toronto Raptors': ['TOR'], 'Houston Rockets': ['HOU'], 'Orlando Magic': ['ORL'],
  'Indiana Pacers': ['IND'], 'Detroit Pistons': ['DET'],
};
