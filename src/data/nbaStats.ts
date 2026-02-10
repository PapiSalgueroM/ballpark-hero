import type { StatChallenge } from '@/types/nba';

const statPool: Omit<StatChallenge, 'direction'>[] = [
  { stat: 'Career Points Per Game', unit: 'PPG', emoji: '🏀' },
  { stat: 'Career Assists Per Game', unit: 'APG', emoji: '🎯' },
  { stat: 'Career Rebounds Per Game', unit: 'RPG', emoji: '📊' },
  { stat: 'Career Steals Per Game', unit: 'SPG', emoji: '🤏' },
  { stat: 'Career Blocks Per Game', unit: 'BPG', emoji: '🚫' },
  { stat: 'Career Three Pointers Made', unit: '3PM', emoji: '🎯' },
  { stat: 'Championships Won', unit: 'Rings', emoji: '💍' },
  { stat: 'Career Games Played', unit: 'GP', emoji: '📅' },
  { stat: 'Career Fouls Per Game', unit: 'FPG', emoji: '😤' },
  { stat: 'Height', unit: 'inches', emoji: '📏' },
  { stat: 'Weight', unit: 'lbs', emoji: '⚖️' },
  { stat: 'Career Minutes Per Game', unit: 'MPG', emoji: '⏱️' },
  { stat: 'Career Free Throw Percentage', unit: 'FT%', emoji: '🎯' },
];

export function getRandomStatChallenge(): StatChallenge {
  const stat = statPool[Math.floor(Math.random() * statPool.length)];
  const direction: 'highest' | 'lowest' = Math.random() > 0.5 ? 'highest' : 'lowest';
  return { ...stat, direction };
}

/** Display names for spinner animation */
export const STAT_DISPLAY_NAMES = statPool.map(s => `${s.emoji} ${s.stat}`);
