export const pilotSports = ['soccer', 'nba', 'nfl', 'nhl', 'mlb'] as const;
export type PilotSport = typeof pilotSports[number];

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
  nfl: [
    [2014, 10, 'Seattle Seahawks', 'Denver Broncos'],
    [2018, 10, 'Philadelphia Eagles', 'New England Patriots'],
    [2021, 10, 'Tampa Bay Buccaneers', 'Kansas City Chiefs'],
    [2022, 10, 'Los Angeles Rams', 'Cincinnati Bengals'],
    [2008, 15, 'New York Giants', 'New England Patriots'],
    [2009, 15, 'Pittsburgh Steelers', 'Arizona Cardinals'],
    [2010, 15, 'New Orleans Saints', 'Indianapolis Colts'],
    [2011, 15, 'Green Bay Packers', 'Pittsburgh Steelers'],
    [1986, 20, 'Chicago Bears', 'New England Patriots'],
    [1993, 20, 'Dallas Cowboys', 'Buffalo Bills'],
    [1998, 20, 'Denver Broncos', 'Green Bay Packers'],
    [2001, 20, 'Baltimore Ravens', 'New York Giants'],
  ],
  // Difficulty follows the era of the final.
  nhl: [
    [2019, 10, 'St. Louis Blues', 'Boston Bruins'],
    [2021, 10, 'Tampa Bay Lightning', 'Montreal Canadiens'],
    [2023, 10, 'Vegas Golden Knights', 'Florida Panthers'],
    [2024, 10, 'Florida Panthers', 'Edmonton Oilers'],
    [2003, 15, 'New Jersey Devils', 'Mighty Ducks of Anaheim'],
    [2006, 15, 'Carolina Hurricanes', 'Edmonton Oilers'],
    [2010, 15, 'Chicago Blackhawks', 'Philadelphia Flyers'],
    [2014, 15, 'Los Angeles Kings', 'New York Rangers'],
    [1967, 20, 'Toronto Maple Leafs', 'Montreal Canadiens'],
    [1983, 20, 'New York Islanders', 'Edmonton Oilers'],
    [1991, 20, 'Pittsburgh Penguins', 'Minnesota North Stars'],
    [1994, 20, 'New York Rangers', 'Vancouver Canucks'],
  ],
  // Recent finals score 10, the 1997 to 2008 group scores 15, and earlier finals score 20.
  mlb: [
    [2016, 10, 'Chicago Cubs', 'Cleveland Indians'],
    [2019, 10, 'Washington Nationals', 'Houston Astros'],
    [2021, 10, 'Atlanta Braves', 'Houston Astros'],
    [2023, 10, 'Texas Rangers', 'Arizona Diamondbacks'],
    [1997, 15, 'Florida Marlins', 'Cleveland Indians'],
    [2002, 15, 'Anaheim Angels', 'San Francisco Giants'],
    [2004, 15, 'Boston Red Sox', 'St. Louis Cardinals'],
    [2008, 15, 'Philadelphia Phillies', 'Tampa Bay Rays'],
    [1955, 20, 'Brooklyn Dodgers', 'New York Yankees'],
    [1969, 20, 'New York Mets', 'Baltimore Orioles'],
    [1979, 20, 'Pittsburgh Pirates', 'Baltimore Orioles'],
    [1984, 20, 'Detroit Tigers', 'San Diego Padres'],
  ],
};

export const factCheckDate = '2026-11-26';
export const independentSource: Record<PilotSport, string> = {
  soccer: 'https://www.rsssf.org/tablesw/worldcup.html',
  nba: 'https://www.ultimatenba.com/en/history/finals/',
  mlb: 'https://www.baseball-almanac.com/ws/wsmenu.shtml',
  nhl: 'https://thehockeywriters.com/docs/stanley-cup/',
  nfl: 'https://static.www.nfl.com/league/apps/league-site/media-guides/2024/2024-Record-and-Fact-Book.pdf',
};

export function finalsSource(sport: PilotSport, year: number) {
  if (sport === 'mlb') return 'https://www.mlb.com/postseason/history/' + year;
  if (sport === 'nhl') return 'https://media.nhl.com/site/asset/public/ext/2025-26/2026StanleyCupFinal.pdf';
  if (sport === 'nfl') return 'https://www.foxsports.com/nfl-super-bowl-winners-and-results';
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
  'Seattle Seahawks': ['SEA'], 'Denver Broncos': ['DEN'], 'Philadelphia Eagles': ['PHI'],
  'New England Patriots': ['NE', 'Pats'], 'Tampa Bay Buccaneers': ['TB', 'Bucs'],
  'Kansas City Chiefs': ['KC'], 'Los Angeles Rams': ['LAR', 'LA Rams'], 'Cincinnati Bengals': ['CIN'],
  'New York Giants': ['NYG', 'NY Giants'], 'Pittsburgh Steelers': ['PIT'], 'Arizona Cardinals': ['ARI'],
  'New Orleans Saints': ['NO'], 'Indianapolis Colts': ['IND'], 'Green Bay Packers': ['GB'],
  'Chicago Bears': ['CHI'], 'Dallas Cowboys': ['DAL'], 'Buffalo Bills': ['BUF'], 'Baltimore Ravens': ['BAL'],
  'St. Louis Blues': ['St Louis', 'Blues'], 'Boston Bruins': ['Boston', 'Bruins'],
  'Tampa Bay Lightning': ['Tampa Bay', 'Lightning'], 'Montreal Canadiens': ['Montreal', 'Canadiens', 'Habs'],
  'Vegas Golden Knights': ['Vegas', 'Golden Knights', 'Knights'], 'Florida Panthers': ['Florida', 'Panthers'],
  'Edmonton Oilers': ['Edmonton', 'Oilers'], 'New Jersey Devils': ['New Jersey', 'Devils'],
  'Mighty Ducks of Anaheim': ['Anaheim', 'Mighty Ducks', 'Anaheim Mighty Ducks', 'Ducks', 'Anaheim Ducks'],
  'Carolina Hurricanes': ['Carolina', 'Hurricanes'], 'Chicago Blackhawks': ['Chicago', 'Blackhawks'],
  'Philadelphia Flyers': ['Philadelphia', 'Flyers'], 'Los Angeles Kings': ['Kings', 'LA Kings'],
  'New York Rangers': ['Rangers', 'NY Rangers'], 'Toronto Maple Leafs': ['Toronto', 'Maple Leafs', 'Leafs'],
  'New York Islanders': ['Islanders', 'NY Islanders'], 'Pittsburgh Penguins': ['Pittsburgh', 'Penguins'],
  'Minnesota North Stars': ['Minnesota', 'North Stars'], 'Vancouver Canucks': ['Vancouver', 'Canucks'],
  'Chicago Cubs': ['Cubs'],
  'Cleveland Indians': ['Cleveland', 'Indians'],
  'Washington Nationals': ['Washington', 'Nationals', 'Nats'],
  'Houston Astros': ['Houston', 'Astros'],
  'Atlanta Braves': ['Atlanta', 'Braves'],
  'Texas Rangers': ['Texas', 'Rangers'],
  'Arizona Diamondbacks': ['Arizona', 'Diamondbacks', 'D-backs'],
  'Florida Marlins': ['Florida', 'Marlins'],
  'Anaheim Angels': ['Anaheim', 'Angels'],
  'San Francisco Giants': ['San Francisco', 'SF Giants', 'Giants'],
  'Boston Red Sox': ['Boston', 'Red Sox'],
  'St. Louis Cardinals': ['St Louis', 'Cardinals'],
  'Philadelphia Phillies': ['Philadelphia', 'Phillies'],
  'Tampa Bay Rays': ['Tampa Bay', 'Rays'],
  'Brooklyn Dodgers': ['Brooklyn', 'Dodgers'],
  'New York Yankees': ['NY Yankees', 'Yankees'],
  'New York Mets': ['NY Mets', 'Mets'],
  'Baltimore Orioles': ['Baltimore', 'Orioles'],
  'Pittsburgh Pirates': ['Pittsburgh', 'Pirates'],
  'Detroit Tigers': ['Detroit', 'Tigers'],
  'San Diego Padres': ['San Diego', 'Padres'],
};
