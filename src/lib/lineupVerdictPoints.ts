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
 * fixed ladder, the top rung records 500, so a perfect lineup records the
 * same 500 it always did, and a label no ladder knows (the "Error" card, or
 * anything a judge invents) records 0: an unjudged lineup is not a scored one.
 *
 * THE BASELINE, after the second review. The first cut spread each ladder
 * from 0 at its BOTTOM rung, and the bottom rung is one no real lineup can
 * reach: the referees keep it for made up names, and neither page lets a
 * made up name in (Build Your XI checks every pick with validate-player,
 * which fails closed, and Starting 5 fills a slot only from a suggestion).
 * So a lineup of real players still paid: an XI of known flops the live
 * referee judged read Relegation Battle, 125 of 500, and a random legal XI
 * read through the function's market value read about 266. Now each ladder
 * has a baseline, the rung a random legal lineup of real players reaches, and
 * only a rung ABOVE it pays: the baseline and everything under it record 0,
 * and the rungs above it are spread evenly up to 500 at the top.
 *
 *   Build Your XI, referee: Top 4 Finish. scripts/simFreePoints.mjs deals
 *     400 random legal XIs of real players (the position gate, one pick a
 *     team, the repo's 2026 snapshot of the value table) and reads them
 *     through the function's own market value read, the one piece of its code
 *     that puts an XI on this ladder: 279 read Europa League Level, 112 Top 4
 *     Finish, 9 Mid-Table, none higher. Top 4 Finish has to be the baseline:
 *     paying it would hand a random XI 125 points more than a quarter of the
 *     time. The live referee was harsher than that read: probed on 2026-09-28
 *     with random legal XIs of the same kind, it answered Relegation Battle
 *     and Mid-Table where the read says Europa League Level.
 *   Build Your XI, offline judge: Solid. The same 400 XIs through the real
 *     offline judge: 265 Mid-Table, 133 Solid, 2 Relegation Scrap.
 *   NBA Starting 5, referee: Solid Rotation, the top three verdicts paying
 *     like Build Your XI's. This one is not measured: the deployed
 *     nba-evaluate-lineup (version 5) runs no AI that answers, so there is no
 *     referee verdict on a random five to read until the repo copy is
 *     deployed and probed (owed in docs/PROJECT-STATE.md). simFreePoints holds
 *     that it pays no more of its top verdicts than the measured XI ladder.
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
/** The rung a random legal XI of real players reaches on the referee's ladder. */
export const XI_REFEREE_BASELINE = 'Top 4 Finish';

/** Build Your XI, the offline judge, best first. */
export const XI_OFFLINE_LADDER = [
  'World Class',
  'Contenders',
  'Solid',
  'Mid-Table',
  'Relegation Scrap',
] as const;
/** The rung a random legal XI of real players reaches with the offline judge. */
export const XI_OFFLINE_BASELINE = 'Solid';

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
/** The rung a random legal five is held to on the referee's ladder (not yet
 *  measured against the live referee, see the header). */
export const FIVE_REFEREE_BASELINE = 'Solid Rotation';

export interface JudgedVerdict {
  rating: string;
  /** Set by the page when the verdict came from the offline judge. */
  judge?: 'offline';
}

/** A verdict body as the referee functions send one. */
export interface RefereeVerdict {
  rating: string;
  headline: string;
  analysis: string;
}

/*
 * Round 645, after review: the referees' stand-ins. When the AI referee is
 * out (quota, a refusal, an answer it cannot parse) the evaluate-lineup
 * function still answers 200 with a verdict of its own: a market value read
 * ("Quick market-value read while our pundit's offline", or, with fewer than
 * four names priced, a flat Top 4 Finish "benefit of the doubt"), and on an
 * exception a flat Top 4 Finish placeholder. The first cut scored those on the
 * referee ladder, so the market read's bottom rung, Relegation Battle, paid 125
 * of 500 for the worst XI there is and the flat Top 4 Finish paid 313 for any
 * XI. nba-evaluate-lineup does the same with its own quick data read
 * (statFallback): it rates the five by how many of the names it finds in the
 * stats table, whatever the challenge asked, so five real names read All-Star
 * Starters (429 of 500) on any challenge, and on an exception it sends a flat
 * Solid Rotation placeholder (286). The repo held an older copy of that
 * function until the second fix of this round, so the first fix caught a
 * stand-in the live function never sends; a live probe on 2026-09-28 came
 * back from statFallback. Nothing in those bodies but their own words tells
 * them from a referee verdict, so these are the words, lower cased, and
 * simFreePoints runs the functions' own fallback code and holds that every
 * body it can send is caught here. A caught body is a referee failure like a
 * refused request: the page hands the lineup to the offline judge, so a
 * degraded Build Your XI is scored on the same basis as any other offline one
 * (the quality of the XI, its worst verdict 0), and a degraded Starting 5
 * records 0.
 */
const XI_STAND_IN_WORDS = ['market-value read', 'pundit is taking a'];
const FIVE_STAND_IN_WORDS = ['ai analyst is offline', 'analyst is taking a'];

function bodyOf(body: unknown): RefereeVerdict | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.rating !== 'string' || typeof b.analysis !== 'string' || !b.rating.trim() || !b.analysis.trim()) return null;
  return { rating: b.rating, headline: typeof b.headline === 'string' ? b.headline : '', analysis: b.analysis };
}

/** A referee body the page may score, or null when it is not a referee
 *  verdict (malformed, or one of the function's stand-ins). */
function refereeVerdict(body: unknown, standInWords: readonly string[]): RefereeVerdict | null {
  const v = bodyOf(body);
  if (!v) return null;
  const words = `${v.headline} ${v.analysis}`.toLowerCase();
  return standInWords.some(w => words.includes(w)) ? null : v;
}

/** A Build Your XI referee body the page may score, or null. */
export function xiRefereeVerdict(body: unknown): RefereeVerdict | null {
  return refereeVerdict(body, XI_STAND_IN_WORDS);
}

/** An NBA Starting 5 referee body the page may score, or null. */
export function fiveRefereeVerdict(body: unknown): RefereeVerdict | null {
  return refereeVerdict(body, FIVE_STAND_IN_WORDS);
}

function labelKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** A label's rung on a ladder, 0 at the top, or -1 when it is not on it. */
export function rungOf(label: string, ladder: readonly string[]): number {
  const key = labelKey(label);
  return ladder.findIndex(l => labelKey(l) === key);
}

/** Points for a label on a ladder: its top rung pays LINEUP_PERFECT, the
 *  baseline and every rung under it 0, the rungs between evenly spread, and
 *  a label not on the ladder 0. */
export function ladderPoints(label: string, ladder: readonly string[], baseline: string): number {
  const rung = rungOf(label, ladder);
  const base = rungOf(baseline, ladder);
  if (rung < 0 || base <= 0 || rung >= base) return 0;
  return Math.round((LINEUP_PERFECT * (base - rung)) / base);
}

/** What a finished Build Your XI records. */
export function buildXiPoints(verdict: JudgedVerdict | null): number {
  if (!verdict) return 0;
  return verdict.judge === 'offline'
    ? ladderPoints(verdict.rating, XI_OFFLINE_LADDER, XI_OFFLINE_BASELINE)
    : ladderPoints(verdict.rating, XI_REFEREE_LADDER, XI_REFEREE_BASELINE);
}

/** The line under a Build Your XI result's points: where the points start. */
export function xiPointsNote(verdict: JudgedVerdict): string {
  const base = verdict.judge === 'offline' ? XI_OFFLINE_BASELINE : XI_REFEREE_BASELINE;
  return `Points start above ${base}. A random XI of real players almost never gets past it.`;
}

/** What a finished NBA Starting 5 records. The offline judge cannot read the
 *  challenge, so its verdict records 0. */
export function startingFivePoints(verdict: JudgedVerdict | null): number {
  if (!verdict || verdict.judge === 'offline') return 0;
  return ladderPoints(verdict.rating, FIVE_REFEREE_LADDER, FIVE_REFEREE_BASELINE);
}
