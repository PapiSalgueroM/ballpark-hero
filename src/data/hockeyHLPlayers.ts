export interface HockeyHLPlayer {
  name: string;
  position: string;
  country: string;
  countryFlag: string;
  careerPoints: number;
  /** Final season the total is through, or "unverified" for the two goalies. */
  lastSeason: string;
  teams: string;
}

export const hockeyHLPlayers: HockeyHLPlayer[] = [
  { name: 'Wayne Gretzky', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 2857, teams: 'Edmonton, Los Angeles, St. Louis, New York Rangers', lastSeason: '1998-99' },
  { name: 'Jaromir Jagr', position: 'Forward', country: 'Czech Republic', countryFlag: '🇨🇿', careerPoints: 1921, teams: 'Pittsburgh, Washington, New York Rangers, Florida', lastSeason: '2017-18' },
  { name: 'Mark Messier', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1887, teams: 'Edmonton, New York Rangers, Vancouver', lastSeason: '2003-04' },
  { name: 'Gordie Howe', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1850, teams: 'Detroit, Hartford', lastSeason: '1979-80' },
  { name: 'Ron Francis', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1798, teams: 'Hartford, Pittsburgh, Carolina, Toronto', lastSeason: '2003-04' },
  { name: 'Mario Lemieux', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1723, teams: 'Pittsburgh', lastSeason: '2005-06' },
  { name: 'Steve Yzerman', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1755, teams: 'Detroit', lastSeason: '2005-06' },
  { name: 'Joe Sakic', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1641, teams: 'Quebec, Colorado', lastSeason: '2008-09' },
  { name: 'Sidney Crosby', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1761, teams: 'Pittsburgh', lastSeason: '2025-26' },
  { name: 'Alexander Ovechkin', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 1684, teams: 'Washington', lastSeason: '2025-26' },
  { name: 'Joe Thornton', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1539, teams: 'Boston, San Jose, Toronto, Florida', lastSeason: '2021-22' },
  { name: 'Nicklas Lidstrom', position: 'Defense', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 1142, teams: 'Detroit', lastSeason: '2011-12' },
  { name: 'Patrick Kane', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 1399, teams: 'Chicago, New York Rangers, Detroit', lastSeason: '2025-26' },
  { name: 'Connor McDavid', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1215, teams: 'Edmonton', lastSeason: '2025-26' },
  { name: 'Nathan MacKinnon', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1141, teams: 'Colorado', lastSeason: '2025-26' },
  { name: 'Auston Matthews', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 780, teams: 'Toronto', lastSeason: '2025-26' },
  { name: 'Nikita Kucherov', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 1122, teams: 'Tampa Bay', lastSeason: '2025-26' },
  { name: 'Leon Draisaitl', position: 'Forward', country: 'Germany', countryFlag: '🇩🇪', careerPoints: 1053, teams: 'Edmonton', lastSeason: '2025-26' },
  { name: 'Cale Makar', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 503, teams: 'Colorado', lastSeason: '2025-26' },
  { name: 'Henrik Lundqvist', position: 'Goalie', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 46, teams: 'New York Rangers', lastSeason: 'unverified' },
  { name: 'Mats Sundin', position: 'Forward', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 1349, teams: 'Quebec, Toronto, Vancouver', lastSeason: '2008-09' },
  { name: 'Teemu Selanne', position: 'Forward', country: 'Finland', countryFlag: '🇫🇮', careerPoints: 1457, teams: 'Winnipeg, Anaheim, San Jose, Colorado', lastSeason: '2013-14' },
  { name: 'Peter Forsberg', position: 'Forward', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 885, teams: 'Quebec, Colorado, Philadelphia, Nashville', lastSeason: '2010-11' },
  { name: 'Pavel Bure', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 779, teams: 'Vancouver, Florida, New York Rangers', lastSeason: '2002-03' },
  { name: 'Ray Bourque', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1579, teams: 'Boston, Colorado', lastSeason: '2000-01' },
  { name: 'Paul Coffey', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1531, teams: 'Edmonton, Pittsburgh, Detroit, Hartford, Philadelphia', lastSeason: '2000-01' },
  { name: 'Phil Kessel', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 992, teams: 'Boston, Toronto, Pittsburgh, Arizona, Vegas', lastSeason: '2022-23' },
  { name: 'Evgeni Malkin', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 1407, teams: 'Pittsburgh', lastSeason: '2025-26' },
  { name: 'Claude Giroux', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1162, teams: 'Philadelphia, Ottawa', lastSeason: '2025-26' },
  { name: 'Patrice Bergeron', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1040, teams: 'Boston', lastSeason: '2022-23' },
  { name: 'Duncan Keith', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 646, teams: 'Chicago, Edmonton', lastSeason: '2021-22' },
  { name: 'Erik Karlsson', position: 'Defense', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 936, teams: 'Ottawa, San Jose, Pittsburgh', lastSeason: '2025-26' },
  { name: 'Mikko Rantanen', position: 'Forward', country: 'Finland', countryFlag: '🇫🇮', careerPoints: 781, teams: 'Colorado, Carolina', lastSeason: '2025-26' },
  { name: 'David Pastrnak', position: 'Forward', country: 'Czech Republic', countryFlag: '🇨🇿', careerPoints: 932, teams: 'Boston', lastSeason: '2025-26' },
  { name: 'Jack Eichel', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 691, teams: 'Buffalo, Vegas', lastSeason: '2025-26' },
  { name: 'Artemi Panarin', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 952, teams: 'Chicago, Columbus, New York Rangers', lastSeason: '2025-26' },
  { name: 'Steven Stamkos', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1251, teams: 'Tampa Bay, Nashville', lastSeason: '2025-26' },
  { name: 'Jonathan Toews', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 911, teams: 'Chicago', lastSeason: '2025-26' },
  { name: 'Anze Kopitar', position: 'Forward', country: 'Slovenia', countryFlag: '🇸🇮', careerPoints: 1314, teams: 'Los Angeles', lastSeason: '2025-26' },
  { name: 'Victor Hedman', position: 'Defense', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 811, teams: 'Tampa Bay', lastSeason: '2025-26' },
  { name: 'Kirill Kaprizov', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 475, teams: 'Minnesota', lastSeason: '2025-26' },
  { name: 'Jason Robertson', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 486, teams: 'Dallas', lastSeason: '2025-26' },
  { name: 'Matthew Tkachuk', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 668, teams: 'Calgary, Florida', lastSeason: '2025-26' },
  { name: 'Brady Tkachuk', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 463, teams: 'Ottawa', lastSeason: '2025-26' },
  { name: 'Igor Shesterkin', position: 'Goalie', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 18, teams: 'New York Rangers', lastSeason: 'unverified' },
];
