export interface NascarChainLink {
  driverName: string;
  connection?: string; // e.g. "Beat to 2003 Cup title"
}

export type NascarChainMode = 'daily' | 'unlimited';

export type NascarChainBadge = {
  name: string;
  emoji: string;
  threshold: number;
};

export const NASCAR_CHAIN_BADGES: NascarChainBadge[] = [
  { name: 'Pit Crew', emoji: '🏁', threshold: 3 },
  { name: 'Cup Contender', emoji: '🏅', threshold: 5 },
  { name: 'NASCAR Legend', emoji: '🏆', threshold: 10 },
];

export interface NascarChainState {
  currentDriver: string;
  chain: NascarChainLink[];
  score: number;
  rawScore: number;
  gameStatus: 'playing' | 'ended';
  usedDrivers: Set<string>;
  gameOverReason?: string;
  mode: NascarChainMode;
  earnedBadge?: NascarChainBadge;
}

export function getNascarChainMultiplier(chainLength: number): number {
  if (chainLength >= 10) return 2.0;
  if (chainLength >= 5) return 1.5;
  return 1.0;
}

export function getNascarEarnedBadge(chainLength: number): NascarChainBadge | undefined {
  const sorted = [...NASCAR_CHAIN_BADGES].sort((a, b) => b.threshold - a.threshold);
  return sorted.find(b => chainLength >= b.threshold);
}

export const NASCAR_CHAIN_STARTERS: string[] = [
  'Dale Earnhardt',
  'Jeff Gordon',
  'Jimmie Johnson',
  'Richard Petty',
  'Dale Earnhardt Jr.',
  'Tony Stewart',
  'Kyle Busch',
  'Kevin Harvick',
  'Denny Hamlin',
  'Chase Elliott',
  'Joey Logano',
  'Martin Truex Jr.',
  'Brad Keselowski',
  'Kurt Busch',
  'Matt Kenseth',
  'Carl Edwards',
  'Rusty Wallace',
  'Mark Martin',
  'Bill Elliott',
  'Terry Labonte',
  'Bobby Labonte',
  'Jeff Burton',
  'Ryan Newman',
  'Kasey Kahne',
  'Kyle Larson',
];

export const NASCAR_DRIVER_ALIASES: Record<string, string[]> = {
  'Dale Earnhardt': ['The Intimidator', 'Earnhardt Sr', 'Dale Sr'],
  'Dale Earnhardt Jr.': ['Junior', 'Jr', 'Dale Jr'],
  'Jeff Gordon': ['Wonder Boy', 'Rainbow Warrior'],
  'Jimmie Johnson': ['JJ', 'Seven-Time'],
  'Richard Petty': ['The King', 'King Richard'],
  'Tony Stewart': ['Smoke'],
  'Kyle Busch': ['Rowdy', 'KFB'],
  'Kevin Harvick': ['Happy Harvick', 'The Closer'],
  'Chase Elliott': ['Chase'],
  'Joey Logano': ['Sliced Bread'],
  'Kyle Larson': ['Larson'],
  'Denny Hamlin': ['Hamlin'],
  'Martin Truex Jr.': ['MTJ', 'Truex'],
  'Brad Keselowski': ['Bad Brad', 'Kes'],
  'Kurt Busch': ['The Outlaw'],
  'Rusty Wallace': ['Rusty'],
  'Mark Martin': ['Mark'],
  'Bill Elliott': ['Awesome Bill', 'Million Dollar Bill'],
  'Carl Edwards': ['Cousin Carl'],
};

export const ALL_NASCAR_DRIVERS: string[] = [
  ...NASCAR_CHAIN_STARTERS,
  'David Pearson',
  'Cale Yarborough',
  'Darrell Waltrip',
  'Bobby Allison',
  'Davey Allison',
  'Alan Kulwicki',
  'Ernie Irvan',
  'Ricky Rudd',
  'Sterling Marling',
  'Michael Waltrip',
  'Ward Burton',
  'Jamie McMurray',
  'Clint Bowyer',
  'Ryan Blaney',
  'William Byron',
  'Alex Bowman',
  'Ross Chastain',
  'Christopher Bell',
  'Tyler Reddick',
  'Bubba Wallace',
  'Daniel Suarez',
  'Aric Almirola',
  'Austin Dillon',
  'Erik Jones',
  'Greg Biffle',
  'Marcos Ambrose',
  'Juan Pablo Montoya',
  'AJ Allmendinger',
  'Ricky Stenhouse Jr.',
  'Chris Buescher',
  'Austin Cindric',
  'Ty Gibbs',
  'Noah Gragson',
  'Bobby Isaac',
  'Lee Petty',
  'Ned Jarrett',
  'Buck Baker',
  'Herb Thomas',
  'Tim Flock',
  'Rex White',
  'Joe Weatherly',
  'Fred Lorenzen',
  'Benny Parsons',
  'Bobby Isaac',
];
