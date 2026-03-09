export interface HockeyHLPlayer {
  name: string;
  position: string;
  country: string;
  countryFlag: string;
  careerPoints: number;
  teams: string;
}

export const hockeyHLPlayers: HockeyHLPlayer[] = [
  { name: 'Wayne Gretzky', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 2857, teams: 'Edmonton, Los Angeles, St. Louis, New York Rangers' },
  { name: 'Jaromir Jagr', position: 'Forward', country: 'Czech Republic', countryFlag: '🇨🇿', careerPoints: 1921, teams: 'Pittsburgh, Washington, New York Rangers, Florida' },
  { name: 'Mark Messier', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1887, teams: 'Edmonton, New York Rangers, Vancouver' },
  { name: 'Gordie Howe', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1850, teams: 'Detroit, Hartford' },
  { name: 'Ron Francis', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1798, teams: 'Hartford, Pittsburgh, Carolina, Toronto' },
  { name: 'Mario Lemieux', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1723, teams: 'Pittsburgh' },
  { name: 'Steve Yzerman', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1755, teams: 'Detroit' },
  { name: 'Joe Sakic', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1641, teams: 'Quebec, Colorado' },
  { name: 'Sidney Crosby', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1592, teams: 'Pittsburgh' },
  { name: 'Alexander Ovechkin', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 1595, teams: 'Washington' },
  { name: 'Joe Thornton', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1539, teams: 'Boston, San Jose, Toronto, Florida' },
  { name: 'Nicklas Lidstrom', position: 'Defense', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 1142, teams: 'Detroit' },
  { name: 'Patrick Kane', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 1240, teams: 'Chicago, New York Rangers, Detroit' },
  { name: 'Connor McDavid', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1050, teams: 'Edmonton' },
  { name: 'Nathan MacKinnon', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 900, teams: 'Colorado' },
  { name: 'Auston Matthews', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 710, teams: 'Toronto' },
  { name: 'Nikita Kucherov', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 850, teams: 'Tampa Bay' },
  { name: 'Leon Draisaitl', position: 'Forward', country: 'Germany', countryFlag: '🇩🇪', careerPoints: 920, teams: 'Edmonton' },
  { name: 'Cale Makar', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 375, teams: 'Colorado' },
  { name: 'Henrik Lundqvist', position: 'Goalie', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 46, teams: 'New York Rangers' },
  { name: 'Mats Sundin', position: 'Forward', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 1349, teams: 'Quebec, Toronto, Vancouver' },
  { name: 'Teemu Selanne', position: 'Forward', country: 'Finland', countryFlag: '🇫🇮', careerPoints: 1457, teams: 'Winnipeg, Anaheim, San Jose, Colorado' },
  { name: 'Peter Forsberg', position: 'Forward', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 885, teams: 'Quebec, Colorado, Philadelphia, Nashville' },
  { name: 'Pavel Bure', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 779, teams: 'Vancouver, Florida, New York Rangers' },
  { name: 'Ray Bourque', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1579, teams: 'Boston, Colorado' },
  { name: 'Paul Coffey', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1531, teams: 'Edmonton, Pittsburgh, Detroit, Hartford, Philadelphia' },
  { name: 'Phil Kessel', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 992, teams: 'Boston, Toronto, Pittsburgh, Arizona, Vegas' },
  { name: 'Evgeni Malkin', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 1146, teams: 'Pittsburgh' },
  { name: 'Claude Giroux', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 920, teams: 'Philadelphia, Ottawa' },
  { name: 'Patrice Bergeron', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 982, teams: 'Boston' },
  { name: 'Duncan Keith', position: 'Defense', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 664, teams: 'Chicago, Edmonton' },
  { name: 'Erik Karlsson', position: 'Defense', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 740, teams: 'Ottawa, San Jose, Pittsburgh' },
  { name: 'Mikko Rantanen', position: 'Forward', country: 'Finland', countryFlag: '🇫🇮', careerPoints: 610, teams: 'Colorado, Carolina' },
  { name: 'David Pastrnak', position: 'Forward', country: 'Czech Republic', countryFlag: '🇨🇿', careerPoints: 570, teams: 'Boston' },
  { name: 'Jack Eichel', position: 'Forward', country: 'United States', countryFlag: '🇺🇸', careerPoints: 480, teams: 'Buffalo, Vegas' },
  { name: 'Artemi Panarin', position: 'Forward', country: 'Russia', countryFlag: '🇷🇺', careerPoints: 650, teams: 'Chicago, Columbus, New York Rangers' },
  { name: 'Steven Stamkos', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 1038, teams: 'Tampa Bay, Nashville' },
  { name: 'Jonathan Toews', position: 'Forward', country: 'Canada', countryFlag: '🇨🇦', careerPoints: 827, teams: 'Chicago' },
  { name: 'Anze Kopitar', position: 'Forward', country: 'Slovenia', countryFlag: '🇸🇮', careerPoints: 1020, teams: 'Los Angeles' },
  { name: 'Victor Hedman', position: 'Defense', country: 'Sweden', countryFlag: '🇸🇪', careerPoints: 660, teams: 'Tampa Bay' },
];
