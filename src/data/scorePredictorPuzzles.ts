export interface ScorePredictorPuzzle {
  id: string;
  sport: 'soccer' | 'nfl' | 'nba';
  homeTeam: string;
  awayTeam: string;
  competition: string;
  date: string;
  hint: string;
  homeScore: number;
  awayScore: number;
  funFact: string;
}

const scorePredictorPuzzles: ScorePredictorPuzzle[] = [
  // ── SOCCER ──
  { id: 'sp-1', sport: 'soccer', homeTeam: 'AC Milan', awayTeam: 'Liverpool', competition: 'Champions League Final', date: 'May 25, 2005', hint: 'The Istanbul miracle comeback', homeScore: 3, awayScore: 3, funFact: 'Liverpool came back from 3-0 down at half time and won on penalties.' },
  { id: 'sp-2', sport: 'soccer', homeTeam: 'Barcelona', awayTeam: 'PSG', competition: 'Champions League R16 2nd Leg', date: 'March 8, 2017', hint: 'La Remontada: trailing 4-0 on aggregate', homeScore: 6, awayScore: 1, funFact: 'Sergi Roberto scored the winning goal in the 95th minute.' },
  { id: 'sp-3', sport: 'soccer', homeTeam: 'Brazil', awayTeam: 'Germany', competition: 'World Cup Semi-Final', date: 'July 8, 2014', hint: 'The Mineirazo: a host nation humiliation', homeScore: 1, awayScore: 7, funFact: 'Germany scored 5 goals in 18 first-half minutes.' },
  { id: 'sp-4', sport: 'soccer', homeTeam: 'Leicester City', awayTeam: 'Manchester United', competition: 'Premier League', date: 'September 21, 2014', hint: 'The Foxes announce themselves to the world', homeScore: 5, awayScore: 3, funFact: 'Leicester trailed 3-1 before scoring 4 unanswered goals.' },
  { id: 'sp-5', sport: 'soccer', homeTeam: 'Manchester United', awayTeam: 'Bayern Munich', competition: 'Champions League Final', date: 'May 26, 1999', hint: 'Stoppage time treble drama', homeScore: 2, awayScore: 1, funFact: 'United scored twice in injury time through Sheringham and Solskjær.' },
  { id: 'sp-6', sport: 'soccer', homeTeam: 'Spain', awayTeam: 'Netherlands', competition: 'World Cup Final', date: 'July 11, 2010', hint: 'Tiki-taka crowns its king', homeScore: 1, awayScore: 0, funFact: 'Iniesta scored the only goal in extra time.' },
  { id: 'sp-7', sport: 'soccer', homeTeam: 'Real Madrid', awayTeam: 'Eintracht Frankfurt', competition: 'European Cup Final', date: 'May 18, 1960', hint: 'The greatest final ever played', homeScore: 7, awayScore: 3, funFact: 'Di Stéfano scored a hat trick and Puskás scored four.' },
  { id: 'sp-8', sport: 'soccer', homeTeam: 'Liverpool', awayTeam: 'Barcelona', competition: 'Champions League Semi-Final 2nd Leg', date: 'May 7, 2019', hint: 'Corner taken quickly... ORIGI!', homeScore: 4, awayScore: 0, funFact: 'Liverpool overturned a 3-0 first-leg deficit without Salah and Firmino.' },
  { id: 'sp-9', sport: 'soccer', homeTeam: 'Argentina', awayTeam: 'France', competition: 'World Cup Final', date: 'December 18, 2022', hint: 'Messi\'s crowning glory, or was it?', homeScore: 3, awayScore: 3, funFact: 'Mbappé scored a hat trick but Argentina won on penalties.' },
  { id: 'sp-10', sport: 'soccer', homeTeam: 'Manchester City', awayTeam: 'QPR', competition: 'Premier League Final Day', date: 'May 13, 2012', hint: 'AGÜEROOOO!', homeScore: 3, awayScore: 2, funFact: 'Agüero scored in the 94th minute to win City\'s first title in 44 years.' },
  { id: 'sp-11', sport: 'soccer', homeTeam: 'Greece', awayTeam: 'Portugal', competition: 'Euro 2004 Final', date: 'July 4, 2004', hint: 'The ultimate underdog story', homeScore: 1, awayScore: 0, funFact: 'Greece were 80-1 outsiders before the tournament began.' },
  { id: 'sp-12', sport: 'soccer', homeTeam: 'AC Milan', awayTeam: 'Barcelona', competition: 'Champions League Final', date: 'May 24, 1994', hint: 'The Dream Team meets its nightmare', homeScore: 4, awayScore: 0, funFact: 'Cruyff\'s Barcelona were heavily favoured but got dismantled.' },
  { id: 'sp-13', sport: 'soccer', homeTeam: 'Tottenham', awayTeam: 'Ajax', competition: 'Champions League Semi-Final 2nd Leg', date: 'May 8, 2019', hint: 'Lucas Moura\'s hat trick miracle', homeScore: 3, awayScore: 2, funFact: 'Moura scored the winner in the 96th minute to send Spurs to the final.' },
  { id: 'sp-14', sport: 'soccer', homeTeam: 'Italy', awayTeam: 'Brazil', competition: 'World Cup Final', date: 'July 17, 1994', hint: 'The first World Cup final decided on penalties', homeScore: 0, awayScore: 0, funFact: 'Roberto Baggio missed the decisive penalty for Italy.' },
  { id: 'sp-15', sport: 'soccer', homeTeam: 'Chelsea', awayTeam: 'Bayern Munich', competition: 'Champions League Final', date: 'May 19, 2012', hint: 'Drogba\'s destiny at the Allianz Arena', homeScore: 1, awayScore: 1, funFact: 'Drogba equalised in the 88th minute and scored the winning penalty.' },

  // ── NFL ──
  { id: 'nfl-1', sport: 'nfl', homeTeam: 'New York Giants', awayTeam: 'New England Patriots', competition: 'Super Bowl XLII', date: 'February 3, 2008', hint: 'The Helmet Catch game: ending a perfect season', homeScore: 17, awayScore: 14, funFact: 'The Giants ended the Patriots\' quest for a 19-0 perfect season.' },
  { id: 'nfl-2', sport: 'nfl', homeTeam: 'New England Patriots', awayTeam: 'Atlanta Falcons', competition: 'Super Bowl LI', date: 'February 5, 2017', hint: '28-3: the greatest comeback in Super Bowl history', homeScore: 34, awayScore: 28, funFact: 'The first Super Bowl to go to overtime after the Patriots rallied from 25 points down.' },
  { id: 'nfl-3', sport: 'nfl', homeTeam: 'Philadelphia Eagles', awayTeam: 'New England Patriots', competition: 'Super Bowl LII', date: 'February 4, 2018', hint: 'Philly Special: a backup QB\'s masterpiece', homeScore: 41, awayScore: 33, funFact: 'Nick Foles caught a touchdown pass on a trick play called the Philly Special.' },
  { id: 'nfl-4', sport: 'nfl', homeTeam: 'New England Patriots', awayTeam: 'Seattle Seahawks', competition: 'Super Bowl XLIX', date: 'February 1, 2015', hint: 'Malcolm Butler\'s goal-line interception', homeScore: 28, awayScore: 24, funFact: 'Seattle threw on the 1-yard line instead of handing off to Marshawn Lynch.' },
  { id: 'nfl-5', sport: 'nfl', homeTeam: 'Kansas City Chiefs', awayTeam: 'San Francisco 49ers', competition: 'Super Bowl LIV', date: 'February 2, 2020', hint: 'Mahomes\' first ring: a 4th quarter comeback', homeScore: 31, awayScore: 20, funFact: 'The Chiefs trailed 20-10 in the 4th quarter before scoring 21 unanswered points.' },
  { id: 'nfl-6', sport: 'nfl', homeTeam: 'Denver Broncos', awayTeam: 'Carolina Panthers', competition: 'Super Bowl 50', date: 'February 7, 2016', hint: 'Peyton Manning\'s farewell ride', homeScore: 24, awayScore: 10, funFact: 'Manning retired as a champion, and the Broncos\' defense dominated Cam Newton.' },
  { id: 'nfl-7', sport: 'nfl', homeTeam: 'Green Bay Packers', awayTeam: 'Kansas City Chiefs', competition: 'Super Bowl I', date: 'January 15, 1967', hint: 'The very first Super Bowl', homeScore: 35, awayScore: 10, funFact: 'The game wasn\'t called the Super Bowl at the time: it was the AFL-NFL Championship.' },
  { id: 'nfl-8', sport: 'nfl', homeTeam: 'New York Jets', awayTeam: 'Baltimore Colts', competition: 'Super Bowl III', date: 'January 12, 1969', hint: 'Joe Namath guaranteed a victory', homeScore: 16, awayScore: 7, funFact: 'Namath\'s guarantee is one of the most famous moments in sports history.' },
  { id: 'nfl-9', sport: 'nfl', homeTeam: 'Pittsburgh Steelers', awayTeam: 'Arizona Cardinals', competition: 'Super Bowl XLIII', date: 'February 1, 2009', hint: 'Santonio Holmes\' toe-tapping catch', homeScore: 27, awayScore: 23, funFact: 'James Harrison returned an interception 100 yards for a touchdown.' },
  { id: 'nfl-10', sport: 'nfl', homeTeam: 'Tampa Bay Buccaneers', awayTeam: 'Kansas City Chiefs', competition: 'Super Bowl LV', date: 'February 7, 2021', hint: 'Brady\'s 7th ring, in a new uniform', homeScore: 31, awayScore: 9, funFact: 'Tom Brady won the Super Bowl in his first season with Tampa Bay.' },

  // ── NBA ──
  { id: 'nba-1', sport: 'nba', homeTeam: 'Cleveland Cavaliers', awayTeam: 'Golden State Warriors', competition: 'NBA Finals Game 7', date: 'June 19, 2016', hint: 'The Block, The Shot, The Stop: down 3-1', homeScore: 93, awayScore: 89, funFact: 'Cleveland became the first team to rally from a 3-1 Finals deficit.' },
  { id: 'nba-2', sport: 'nba', homeTeam: 'Chicago Bulls', awayTeam: 'Utah Jazz', competition: 'NBA Finals Game 6', date: 'June 14, 1998', hint: 'Jordan\'s last shot as a Bull', homeScore: 87, awayScore: 86, funFact: 'MJ hit the game-winning shot with 5.2 seconds left for his 6th title.' },
  { id: 'nba-3', sport: 'nba', homeTeam: 'Golden State Warriors', awayTeam: 'Toronto Raptors', competition: 'NBA Finals Game 6', date: 'June 13, 2019', hint: 'The North finally gets its crown', homeScore: 110, awayScore: 114, funFact: 'Kawhi Leonard led the Raptors to their first-ever NBA championship.' },
  { id: 'nba-4', sport: 'nba', homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', competition: 'NBA Finals Game 7', date: 'June 17, 2010', hint: 'Kobe\'s 5th: the rivalry renewed', homeScore: 83, awayScore: 79, funFact: 'The Lakers won despite Kobe shooting 6-for-24 from the field.' },
  { id: 'nba-5', sport: 'nba', homeTeam: 'San Antonio Spurs', awayTeam: 'Miami Heat', competition: 'NBA Finals Game 6', date: 'June 18, 2013', hint: 'Ray Allen\'s clutch three-pointer', homeScore: 100, awayScore: 103, funFact: 'Ray Allen hit a corner three with 5.2 seconds left to force overtime.' },
  { id: 'nba-6', sport: 'nba', homeTeam: 'Golden State Warriors', awayTeam: 'Oklahoma City Thunder', competition: 'WCF Game 7', date: 'May 30, 2016', hint: 'Klay Thompson\'s record-breaking performance', homeScore: 96, awayScore: 88, funFact: 'Warriors came back from 3-1 down, and Klay scored 11 straight in the 4th quarter.' },
  { id: 'nba-7', sport: 'nba', homeTeam: 'Boston Celtics', awayTeam: 'Los Angeles Lakers', competition: 'NBA Finals Game 4', date: 'June 12, 2008', hint: 'The biggest comeback in Finals history (at the time)', homeScore: 97, awayScore: 91, funFact: 'The Celtics erased a 24-point deficit to win.' },
  { id: 'nba-8', sport: 'nba', homeTeam: 'Dallas Mavericks', awayTeam: 'Miami Heat', competition: 'NBA Finals Game 6', date: 'June 12, 2011', hint: 'Dirk\'s moment: dethroning the Big Three', homeScore: 105, awayScore: 95, funFact: 'Nowitzki won his only championship, denying LeBron\'s first ring with Miami.' },
  { id: 'nba-9', sport: 'nba', homeTeam: 'Philadelphia 76ers', awayTeam: 'Los Angeles Lakers', competition: 'NBA Finals Game 1', date: 'June 6, 2001', hint: 'Iverson steps over Lue', homeScore: 107, awayScore: 101, funFact: 'The 76ers stunned the heavily favoured Lakers in OT, their only win of the series.' },
  { id: 'nba-10', sport: 'nba', homeTeam: 'Denver Nuggets', awayTeam: 'Miami Heat', competition: 'NBA Finals Game 5', date: 'June 12, 2023', hint: 'Jokić completes the journey', homeScore: 94, awayScore: 89, funFact: 'Nikola Jokić won Finals MVP as Denver claimed their first-ever NBA title.' },
];

export default scorePredictorPuzzles;
