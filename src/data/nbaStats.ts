import type { StatChallenge } from '@/types/nba';
import { NBA_FIVE_CHALLENGES } from '@/lib/nbaStartingFiveScore';

/* Round 1555: the wheel holds only the challenges the record can total (see
   src/lib/nbaStartingFiveScore.ts). Championships, fouls, height, weight,
   minutes and FT% left it: nothing on the page could put a real number on
   them, so a model's say-so was the only judge. */
const statPool: Omit<StatChallenge, 'direction'>[] = NBA_FIVE_CHALLENGES.map(({ stat, unit, emoji }) => ({ stat, unit, emoji }));

export function getRandomStatChallenge(): StatChallenge {
  const stat = statPool[Math.floor(Math.random() * statPool.length)];
  const direction: 'highest' | 'lowest' = Math.random() > 0.5 ? 'highest' : 'lowest';
  return { ...stat, direction };
}

/** Display names for spinner animation */
export const STAT_DISPLAY_NAMES = statPool.map(s => `${s.emoji} ${s.stat}`);
