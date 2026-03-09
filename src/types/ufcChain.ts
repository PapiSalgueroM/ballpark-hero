export interface UfcFighter {
  name: string;
  nickname?: string;
  weightClass: string;
  record: string;
  wins: number;
  losses: number;
  draws: number;
  isHallOfFamer?: boolean;
}

export interface FightResult {
  winner: string;
  loser: string;
  event: string;
  method: string;
  round: number;
  time: string;
  wasChampionshipFight?: boolean;
}

export interface ChainLink {
  fighter: UfcFighter;
  defeatedBy?: UfcFighter;
  bonusPoints?: number;
}

export type GameMode = 'daily' | 'unlimited' | 'hall-of-fame' | 'weight-class';

export type Badge = {
  name: string;
  emoji: string;
  threshold: number;
};

export const BADGES: Badge[] = [
  { name: 'On A Roll', emoji: '🔗', threshold: 3 },
  { name: 'Contender', emoji: '🥊', threshold: 5 },
  { name: 'Champion', emoji: '🏆', threshold: 10 },
  { name: 'GOAT', emoji: '🐐', threshold: 15 },
];

export const WEIGHT_CLASSES = [
  'Heavyweight',
  'Light Heavyweight',
  'Middleweight',
  'Welterweight',
  'Lightweight',
  'Featherweight',
  'Bantamweight',
  'Flyweight',
] as const;

export type WeightClass = typeof WEIGHT_CLASSES[number];

export interface GameState {
  currentFighter: UfcFighter;
  chain: ChainLink[];
  score: number;
  rawScore: number;
  gameStatus: 'playing' | 'ended';
  usedFighters: Set<string>;
  gameOverReason?: string;
  correctAnswer?: UfcFighter;
  mode: GameMode;
  selectedWeightClass?: WeightClass;
  earnedBadge?: Badge;
}

export function getChainLengthMultiplier(chainLength: number): number {
  if (chainLength >= 10) return 2.0;
  if (chainLength >= 5) return 1.5;
  return 1.0;
}

export function getEarnedBadge(chainLength: number): Badge | undefined {
  const sortedBadges = [...BADGES].sort((a, b) => b.threshold - a.threshold);
  return sortedBadges.find(badge => chainLength >= badge.threshold);
}