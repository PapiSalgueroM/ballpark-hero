export interface TennisChainLink {
  playerName: string;
  slamConnection?: string; // e.g. "Beaten at Wimbledon 2008"
}

export type TennisChainMode = 'daily' | 'unlimited';

export type TennisChainBadge = {
  name: string;
  emoji: string;
  threshold: number;
};

export const TENNIS_CHAIN_BADGES: TennisChainBadge[] = [
  { name: 'Club Player', emoji: '🎾', threshold: 3 },
  { name: 'Pro Circuit', emoji: '🏅', threshold: 5 },
  { name: 'Grand Slam Champion', emoji: '🏆', threshold: 10 },
];

export interface TennisChainState {
  currentPlayer: string;
  chain: TennisChainLink[];
  score: number;
  rawScore: number;
  gameStatus: 'playing' | 'ended';
  usedPlayers: Set<string>;
  gameOverReason?: string;
  mode: TennisChainMode;
  earnedBadge?: TennisChainBadge;
}

export function getTennisChainMultiplier(chainLength: number): number {
  if (chainLength >= 10) return 2.0;
  if (chainLength >= 5) return 1.5;
  return 1.0;
}

export function getTennisEarnedBadge(chainLength: number): TennisChainBadge | undefined {
  const sorted = [...TENNIS_CHAIN_BADGES].sort((a, b) => b.threshold - a.threshold);
  return sorted.find(b => chainLength >= b.threshold);
}

// Starting players for daily/unlimited modes (mix of ATP & WTA)
export const TENNIS_CHAIN_STARTERS: string[] = [
  'Roger Federer',
  'Rafael Nadal',
  'Novak Djokovic',
  'Serena Williams',
  'Steffi Graf',
  'Pete Sampras',
  'Andre Agassi',
  'Venus Williams',
  'Martina Navratilova',
  'John McEnroe',
  'Boris Becker',
  'Andy Murray',
  'Bjorn Borg',
  'Chris Evert',
  'Monica Seles',
  'Justine Henin',
  'Kim Clijsters',
  'Maria Sharapova',
  'Naomi Osaka',
  'Iga Swiatek',
  'Carlos Alcaraz',
  'Jannik Sinner',
  'Stan Wawrinka',
  'Marat Safin',
  'Lleyton Hewitt',
  'Gustavo Kuerten',
  'Juan Martin del Potro',
  'Ashleigh Barty',
  'Li Na',
  'Angelique Kerber',
];

// Common aliases for autocomplete
export const TENNIS_PLAYER_ALIASES: Record<string, string[]> = {
  'Roger Federer': ['Fed', 'RF', 'FedEx'],
  'Rafael Nadal': ['Rafa', 'Nadal', 'Bull'],
  'Novak Djokovic': ['Nole', 'Djoker', 'Djoko'],
  'Serena Williams': ['Serena', 'SW'],
  'Venus Williams': ['Venus', 'VW'],
  'Steffi Graf': ['Steffi', 'Fräulein Forehand'],
  'Pete Sampras': ['Pistol Pete'],
  'Andre Agassi': ['Agassi'],
  'Andy Murray': ['Murray', 'Muzza'],
  'Martina Navratilova': ['Martina'],
  'John McEnroe': ['McEnroe', 'Mac'],
  'Boris Becker': ['Becker', 'Boom Boom'],
  'Maria Sharapova': ['Masha', 'Sharapova'],
  'Naomi Osaka': ['Osaka'],
  'Iga Swiatek': ['Iga'],
  'Carlos Alcaraz': ['Carlitos', 'Alcaraz'],
  'Jannik Sinner': ['Sinner', 'Jannik'],
  'Bjorn Borg': ['Borg', 'Ice Borg'],
  'Monica Seles': ['Seles'],
  'Chris Evert': ['Chrissie', 'Evert'],
  'Ashleigh Barty': ['Ash Barty', 'Barty'],
  'Stan Wawrinka': ['Stan the Man', 'Wawrinka'],
  'Juan Martin del Potro': ['Delpo', 'Del Potro'],
  'Li Na': ['Li Na'],
  'Marat Safin': ['Safin'],
  'Lleyton Hewitt': ['Hewitt', 'Rusty'],
  'Kim Clijsters': ['Clijsters'],
  'Justine Henin': ['Henin'],
  'Angelique Kerber': ['Kerber', 'Angie'],
  'Gustavo Kuerten': ['Guga', 'Kuerten'],
};

// All known tennis players for autocomplete
export const ALL_TENNIS_PLAYERS: string[] = [
  ...TENNIS_CHAIN_STARTERS,
  'Daniil Medvedev',
  'Alexander Zverev',
  'Dominic Thiem',
  'Stefanos Tsitsipas',
  'Casper Ruud',
  'Holger Rune',
  'Felix Auger-Aliassime',
  'Denis Shapovalov',
  'Matteo Berrettini',
  'Hubert Hurkacz',
  'Taylor Fritz',
  'Frances Tiafoe',
  'Tommy Paul',
  'Ben Shelton',
  'Aryna Sabalenka',
  'Coco Gauff',
  'Elena Rybakina',
  'Jessica Pegula',
  'Ons Jabeur',
  'Barbora Krejcikova',
  'Marketa Vondrousova',
  'Bianca Andreescu',
  'Emma Raducanu',
  'Simona Halep',
  'Petra Kvitova',
  'Victoria Azarenka',
  'Caroline Wozniacki',
  'Garbiñe Muguruza',
  'Sloane Stephens',
  'Flavia Pennetta',
  'Samantha Stosur',
  'Svetlana Kuznetsova',
  'Jelena Ostapenko',
  'Sofia Kenin',
  'Marion Bartoli',
  'Francesca Schiavone',
  'Anastasia Myskina',
  'Amélie Mauresmo',
  'Lindsay Davenport',
  'Martina Hingis',
  'Jennifer Capriati',
  'Mary Pierce',
  'Arantxa Sanchez Vicario',
  'Conchita Martinez',
  'Gabriela Sabatini',
  'Hana Mandlikova',
  'Tracy Austin',
  'Virginia Ruzici',
  'Jim Courier',
  'Stefan Edberg',
  'Ivan Lendl',
  'Mats Wilander',
  'Jimmy Connors',
  'Arthur Ashe',
  'Jan-Michael Gambill',
  'Patrick Rafter',
  'Yevgeny Kafelnikov',
  'Thomas Johansson',
  'Andy Roddick',
  'Robin Soderling',
  'Gaston Gaudio',
  'Albert Costa',
  'Thomas Muster',
  'Michael Chang',
  'Sergi Bruguera',
  'Andres Gomez',
  'Michael Stich',
  'Richard Krajicek',
  'Goran Ivanisevic',
  'Marin Cilic',
  'Grigor Dimitrov',
  'Nick Kyrgios',
  'Kei Nishikori',
  'Milos Raonic',
  'David Ferrer',
  'Jo-Wilfried Tsonga',
  'Tomas Berdych',
  'Fernando Verdasco',
  'Nikolay Davydenko',
  'David Nalbandian',
  'Tommy Haas',
  'Marcos Baghdatis',
];
