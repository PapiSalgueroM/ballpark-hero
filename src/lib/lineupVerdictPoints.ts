/**
 * Round 645 part two: Build Your XI and NBA Starting 5 score the verdict.
 *
 * WHAT WAS WRONG. Both games recorded `verdict ? 500 : 0`: any lineup that
 * reached a verdict, including the "Error" card the page shows when nothing
 * could judge it and a Sunday League verdict for made up names, recorded 500
 * of a 500 cap. The verdict the result screen headlines never reached the
 * number.
 *
 * WHAT THIS IS. The verdict is the score. Each judge gives one label off a
 * fixed ladder, and the ladder is spread evenly from 0 at its bottom rung to
 * 500 at its top, so a perfect lineup records the same 500 it always did and
 * the worst verdict records 0. A label no ladder knows (the "Error" card, or
 * anything a judge invents) records 0: an unjudged lineup is not a scored one.
 *
 * THE OFFLINE JUDGE. When the AI referee is out of quota the page falls back
 * to src/lib/localLineupEval.ts so the game still finishes. For Build Your XI
 * that judge reads the same thing the referee does, the quality of the XI (off
 * real market values), so its own five rung ladder is scored the same way.
 * For NBA Starting 5 it does not: the challenge is "highest" or "lowest" of a
 * stat, and the offline judge rates career peaks whatever the challenge
 * asked, so a five of stars reads All-Time Five on a "lowest points"
 * challenge. It cannot tell a good answer from a bad one, so an offline
 * Starting 5 verdict records 0, the way a validator that cannot check an
 * answer never accepts it.
 *
 * The labels are the ones the judges are told to give, word for word:
 * supabase/functions/evaluate-lineup and nba-evaluate-lineup for the referee,
 * localLineupEval.ts for the offline judge. Matching ignores case, emoji and
 * punctuation. simFreePoints holds that every label in those files is on a
 * ladder here, so a judge that grows a new rung cannot quietly score 0.
 */

/** The most a lineup verdict records, the value both games always paid. */
export const LINEUP_PERFECT = 500;

/** Build Your XI, the AI referee, best first. */
export const XI_REFEREE_LADDER = [
  'Treble Winners',
  'Champions League Winners',
  'League Champions',
  'Top 4 Finish',
  'Europa League Level',
  'Mid-Table',
  'Relegation Battle',
  'Relegated',
  'Sunday League',
] as const;

/** Build Your XI, the offline judge, best first. */
export const XI_OFFLINE_LADDER = [
  'World Class',
  'Contenders',
  'Solid',
  'Mid-Table',
  'Relegation Scrap',
] as const;

/** NBA Starting 5, the AI referee, best first. */
export const FIVE_REFEREE_LADDER = [
  'GOAT Squad',
  'All-Star Starters',
  'Playoff Contenders',
  'Solid Rotation',
  'Regular Season',
  'Bench Warmers',
  'G-League Level',
  'Picked From the Stands',
] as const;

export interface JudgedVerdict {
  rating: string;
  /** Set by the page when the verdict came from the offline judge. */
  judge?: 'offline';
}

function labelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Points for a label on a ladder: its top rung pays LINEUP_PERFECT, its
 *  bottom rung 0, evenly between, and a label not on it 0. */
export function ladderPoints(label: string, ladder: readonly string[]): number {
  const key = labelKey(label);
  const rung = ladder.findIndex(l => labelKey(l) === key);
  if (rung < 0 || ladder.length < 2) return 0;
  const bottom = ladder.length - 1;
  return Math.round((LINEUP_PERFECT * (bottom - rung)) / bottom);
}

/** What a finished Build Your XI records. */
export function buildXiPoints(verdict: JudgedVerdict | null): number {
  if (!verdict) return 0;
  return ladderPoints(verdict.rating, verdict.judge === 'offline' ? XI_OFFLINE_LADDER : XI_REFEREE_LADDER);
}

/** What a finished NBA Starting 5 records. The offline judge cannot read the
 *  challenge, so its verdict records 0. */
export function startingFivePoints(verdict: JudgedVerdict | null): number {
  if (!verdict || verdict.judge === 'offline') return 0;
  return ladderPoints(verdict.rating, FIVE_REFEREE_LADDER);
}
