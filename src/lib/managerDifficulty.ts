/**
 * Round 1501: how hard a manager career plays. Sport neutral on purpose: the
 * levels, their words and the reader of a raw save value live here, and each
 * game binds its own dials to them (Club Manager's are in
 * src/lib/clubManagerDifficulty.ts). A GM or front office game that wants the
 * same three levels imports this file and writes its own table.
 *
 * Pure. Imports nothing, draws nothing, and holds nothing at module scope but
 * literals, so any engine can import it without an import cycle.
 */

export type DifficultyLevel = 'normal' | 'hard' | 'legend';

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ['normal', 'hard', 'legend'];

/** The words on the tiles. Short, because three of them share one row on a phone. */
export const DIFFICULTY_INFO: Record<DifficultyLevel, { label: string; blurb: string }> = {
  normal: { label: 'Normal', blurb: 'The game as it has always played.' },
  hard: { label: 'Hard', blurb: 'Less money, a stricter board, tougher games.' },
  legend: { label: 'Legend', blurb: 'Everything against you. Good luck.' },
};

/** A raw save value as a level: 'hard' and 'legend' read as themselves, anything else is Normal. */
export function readLevel(raw: unknown): DifficultyLevel {
  return raw === 'hard' || raw === 'legend' ? raw : 'normal';
}
