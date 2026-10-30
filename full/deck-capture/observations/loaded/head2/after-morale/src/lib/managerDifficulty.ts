/**
 * Round 1501: how hard a manager career plays. Sport neutral on purpose: the
 * levels, their words and the reader of a raw save value live here, and each
 * game binds its own dials to them (Club Manager's are in
 * src/lib/clubManagerDifficulty.ts). A GM or front office game that wants the
 * same levels imports this file and writes its own table.
 *
 * Round 1512: five levels, easiest first. The saved ids of Round 1501 stay as
 * they were ('normal', 'hard', 'legend'), only their words on screen changed
 * (Medium, Hard, Impossible), so every save written before reads exactly as it
 * did; the two new ids are 'veryeasy' and 'easy'. Absent is still Medium.
 *
 * Pure. Imports nothing, draws nothing, and holds nothing at module scope but
 * literals, so any engine can import it without an import cycle.
 */

export type DifficultyLevel = 'veryeasy' | 'easy' | 'normal' | 'hard' | 'legend';

/** Easiest first, the order the tiles show them in. */
export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ['veryeasy', 'easy', 'normal', 'hard', 'legend'];

/** The words on the tiles. Short labels, because the tiles are small on a phone. */
export const DIFFICULTY_INFO: Record<DifficultyLevel, { label: string; blurb: string }> = {
  veryeasy: { label: 'Very Easy', blurb: 'A patient board, lots of money, cheap signings and weaker opponents.' },
  easy: { label: 'Easy', blurb: 'A kinder board, more money and a bit of help in every match.' },
  normal: { label: 'Medium', blurb: 'The game as it has always played.' },
  hard: { label: 'Hard', blurb: 'Less money, a stricter board, tougher games.' },
  legend: { label: 'Impossible', blurb: 'Everything against you. Good luck.' },
};

/** A raw save value as a level: the five ids read as themselves, anything else is Medium ('normal'). */
export function readLevel(raw: unknown): DifficultyLevel {
  return raw === 'veryeasy' || raw === 'easy' || raw === 'hard' || raw === 'legend' ? raw : 'normal';
}

/** The two levels easier than Medium. A career that is ever on one of them posts no leaderboard score. */
export function isEasyLevel(level: DifficultyLevel): boolean {
  return level === 'veryeasy' || level === 'easy';
}
