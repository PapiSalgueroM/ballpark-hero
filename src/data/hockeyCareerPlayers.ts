export interface HockeyCareerPlayer {
  name: string;
  position: string;
  country: string;
  countryFlag: string;
  draftInfo: string;
  teams: string[];
  stats: string[];
  awards: string[];
}

export interface HockeyCareerPuzzle {
  id: string;
  player: HockeyCareerPlayer;
}

export const hockeyCareerPuzzles: HockeyCareerPuzzle[] = [
  {
    id: 'hc-001',
    player: {
      name: 'Wayne Gretzky',
      position: 'Forward',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: 'Undrafted (WHA signing, 1978)',
      teams: ['Edmonton Oilers', 'Los Angeles Kings', 'St. Louis Blues', 'New York Rangers'],
      stats: ['894 G', '1,963 A', '2,857 Pts'],
      awards: ['9× Hart Trophy', '4× Stanley Cup Champion', '10× Art Ross Trophy', 'Hall of Fame (1999)'],
    },
  },
  {
    id: 'hc-002',
    player: {
      name: 'Sidney Crosby',
      position: 'Forward',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 1st Pick (2005)',
      teams: ['Pittsburgh Penguins'],
      stats: ['592 G', '1,000 A', '1,592 Pts'],
      awards: ['2× Hart Trophy', '3× Stanley Cup Champion', '2× Conn Smythe Trophy', '2× Art Ross Trophy'],
    },
  },
  {
    id: 'hc-003',
    player: {
      name: 'Alexander Ovechkin',
      position: 'Forward',
      country: 'Russia',
      countryFlag: '🇷🇺',
      draftInfo: '1st Round, 1st Pick (2004)',
      teams: ['Washington Capitals'],
      stats: ['868 G', '680 A', '1,548 Pts'],
      awards: ['3× Hart Trophy', 'Stanley Cup Champion (2018)', '9× Maurice Richard Trophy', 'Conn Smythe Trophy (2018)'],
    },
  },
  {
    id: 'hc-004',
    player: {
      name: 'Connor McDavid',
      position: 'Forward',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 1st Pick (2015)',
      teams: ['Edmonton Oilers'],
      stats: ['335 G', '620 A', '955 Pts'],
      awards: ['4× Hart Trophy', '5× Art Ross Trophy', '3× Ted Lindsay Award', 'Conn Smythe Trophy (2025)'],
    },
  },
  {
    id: 'hc-005',
    player: {
      name: 'Mario Lemieux',
      position: 'Forward',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 1st Pick (1984)',
      teams: ['Pittsburgh Penguins'],
      stats: ['690 G', '1,033 A', '1,723 Pts'],
      awards: ['3× Hart Trophy', '2× Stanley Cup Champion', '2× Conn Smythe Trophy', 'Hall of Fame (1997)'],
    },
  },
  {
    id: 'hc-006',
    player: {
      name: 'Nicklas Lidstrom',
      position: 'Defense',
      country: 'Sweden',
      countryFlag: '🇸🇪',
      draftInfo: '3rd Round, 53rd Pick (1989)',
      teams: ['Detroit Red Wings'],
      stats: ['264 G', '878 A', '1,142 Pts'],
      awards: ['7× Norris Trophy', '4× Stanley Cup Champion', 'Conn Smythe Trophy (2002)', 'Hall of Fame (2015)'],
    },
  },
  {
    id: 'hc-007',
    player: {
      name: 'Patrick Roy',
      position: 'Goalie',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '3rd Round, 51st Pick (1984)',
      teams: ['Montreal Canadiens', 'Colorado Avalanche'],
      stats: ['.910 SV%', '2.54 GAA', '551 W'],
      awards: ['3× Vezina Trophy', '4× Stanley Cup Champion', '3× Conn Smythe Trophy', 'Hall of Fame (2006)'],
    },
  },
  {
    id: 'hc-008',
    player: {
      name: 'Jaromir Jagr',
      position: 'Forward',
      country: 'Czech Republic',
      countryFlag: '🇨🇿',
      draftInfo: '1st Round, 5th Pick (1990)',
      teams: ['Pittsburgh Penguins', 'Washington Capitals', 'New York Rangers', 'Philadelphia Flyers', 'Dallas Stars', 'Boston Bruins', 'New Jersey Devils', 'Florida Panthers', 'Calgary Flames'],
      stats: ['766 G', '1,155 A', '1,921 Pts'],
      awards: ['Hart Trophy (1999)', '2× Stanley Cup Champion', '5× Art Ross Trophy', 'Hall of Fame (2024)'],
    },
  },
  {
    id: 'hc-009',
    player: {
      name: 'Martin Brodeur',
      position: 'Goalie',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 20th Pick (1990)',
      teams: ['New Jersey Devils', 'St. Louis Blues'],
      stats: ['.912 SV%', '2.24 GAA', '691 W'],
      awards: ['4× Vezina Trophy', '3× Stanley Cup Champion', '5× Jennings Trophy', 'Hall of Fame (2018)'],
    },
  },
  {
    id: 'hc-010',
    player: {
      name: 'Nathan MacKinnon',
      position: 'Forward',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 1st Pick (2013)',
      teams: ['Colorado Avalanche'],
      stats: ['290 G', '520 A', '810 Pts'],
      awards: ['Hart Trophy (2024)', 'Stanley Cup Champion (2022)', 'Calder Trophy (2014)', 'Lady Byng Trophy (2020)'],
    },
  },
  {
    id: 'hc-011',
    player: {
      name: 'Bobby Orr',
      position: 'Defense',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 4th Pick (1966)',
      teams: ['Boston Bruins', 'Chicago Blackhawks'],
      stats: ['270 G', '645 A', '915 Pts'],
      awards: ['3× Hart Trophy', '8× Norris Trophy', '2× Stanley Cup Champion', 'Hall of Fame (1979)'],
    },
  },
  {
    id: 'hc-012',
    player: {
      name: 'Auston Matthews',
      position: 'Forward',
      country: 'United States',
      countryFlag: '🇺🇸',
      draftInfo: '1st Round, 1st Pick (2016)',
      teams: ['Toronto Maple Leafs'],
      stats: ['370 G', '270 A', '640 Pts'],
      awards: ['Hart Trophy (2022)', '3× Maurice Richard Trophy', 'Calder Trophy (2017)', 'Ted Lindsay Award (2022)'],
    },
  },
  {
    id: 'hc-013',
    player: {
      name: 'Cale Makar',
      position: 'Defense',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '1st Round, 4th Pick (2017)',
      teams: ['Colorado Avalanche'],
      stats: ['95 G', '280 A', '375 Pts'],
      awards: ['Norris Trophy (2022)', 'Conn Smythe Trophy (2022)', 'Stanley Cup Champion (2022)', 'Calder Trophy (2020)'],
    },
  },
  {
    id: 'hc-014',
    player: {
      name: 'Henrik Lundqvist',
      position: 'Goalie',
      country: 'Sweden',
      countryFlag: '🇸🇪',
      draftInfo: '7th Round, 205th Pick (2000)',
      teams: ['New York Rangers'],
      stats: ['.918 SV%', '2.43 GAA', '459 W'],
      awards: ['Vezina Trophy (2012)', '5× All-Star', 'Olympic Gold Medal (2006)', 'Hall of Fame (2023)'],
    },
  },
  {
    id: 'hc-015',
    player: {
      name: 'Mark Messier',
      position: 'Forward',
      country: 'Canada',
      countryFlag: '🇨🇦',
      draftInfo: '3rd Round, 48th Pick (1979)',
      teams: ['Edmonton Oilers', 'New York Rangers', 'Vancouver Canucks'],
      stats: ['694 G', '1,193 A', '1,887 Pts'],
      awards: ['2× Hart Trophy', '6× Stanley Cup Champion', 'Conn Smythe Trophy (1984)', 'Hall of Fame (2007)'],
    },
  },
];
