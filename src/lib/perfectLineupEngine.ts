// Generic, config-driven engine for Perfect Lineup variants (NBA, F1, ...).
// The original soccer version (src/data/perfectLineup.ts) is intentionally left
// untouched; this engine powers the newer sports through a LineupConfig.
import { makeRng } from '@/data/perfectLineup';
import { skillPoints } from '@/lib/skillPoints';

export type SlotGrade = 'green' | 'yellow' | 'black';

export interface GenericConstraint {
  dim: string | null; // dimension key, e.g. 'team' | 'era'; null = any
  value: string | null;
  label: string | null; // human label of the dimension, e.g. 'Team'
}

export interface GenericSlot {
  id: number;
  label: string; // position/role label
  allowed: string[]; // allowed position values; [] = any position
  constraint: GenericConstraint;
}

export interface GenericSimResult {
  rating: number; // 0..100
  chemistry: number; // 0..100
  squadValue: number; // sum of ratings
  grade: string;
  slotGrades: SlotGrade[];
}

export interface LineupDimension<P> {
  key: string;
  label: string;
  valueOf: (p: P) => string;
}

export interface LineupConfig<P> {
  gameId: string;
  gameName: string;
  gamePath: string;
  formation: { label: string; allowed: string[] }[];
  pool: P[];
  nameOf: (p: P) => string;
  positionOf: (p: P) => string;
  ratingOf: (p: P) => number; // 0..100
  subtitleOf: (p: P) => string; // shown in the picker, e.g. "Lakers · 96"
  dimensions: LineupDimension<P>[];
  chemistryOf: ((p: P) => string)[]; // shared values grant chemistry
  constrainedSlots: number;
  /** Maps a result into the displayed scoreline + share score string. */
  scoreline: (r: GenericSimResult) => { big: string; shareScore: string };
}

const MIN_CONSTRAINT_DEPTH = 4;

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function positionOk<P>(config: LineupConfig<P>, slot: GenericSlot, p: P): boolean {
  return slot.allowed.length === 0 || slot.allowed.includes(config.positionOf(p));
}

function constraintOk<P>(config: LineupConfig<P>, slot: GenericSlot, p: P): boolean {
  if (!slot.constraint.dim || slot.constraint.value == null) return true;
  const dim = config.dimensions.find((d) => d.key === slot.constraint.dim);
  if (!dim) return true;
  return dim.valueOf(p) === slot.constraint.value;
}

export function rollLineup<P>(config: LineupConfig<P>, seed: number): GenericSlot[] {
  const rng = makeRng(seed);
  const slots: GenericSlot[] = config.formation.map((f, i) => ({
    id: i,
    label: f.label,
    allowed: f.allowed,
    constraint: { dim: null, value: null, label: null },
  }));

  const toConstrain = shuffle(
    slots.map((s) => s.id),
    rng,
  ).slice(0, config.constrainedSlots);

  for (const id of toConstrain) {
    const slot = slots[id];
    const positionPool = config.pool.filter((p) => positionOk(config, slot, p));
    const dim = config.dimensions[Math.floor(rng() * config.dimensions.length)];
    const counts = new Map<string, number>();
    for (const p of positionPool) {
      const k = dim.valueOf(p);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const candidates = [...counts.entries()]
      .filter(([, n]) => n >= MIN_CONSTRAINT_DEPTH)
      .map(([k]) => k);
    if (candidates.length === 0) continue;
    const value = candidates[Math.floor(rng() * candidates.length)];
    slot.constraint = { dim: dim.key, value, label: dim.label };
  }

  return slots;
}

export function eligiblePlayers<P>(config: LineupConfig<P>, slot: GenericSlot, usedNames: Set<string>): P[] {
  return config.pool
    .filter(
      (p) =>
        positionOk(config, slot, p) &&
        !usedNames.has(config.nameOf(p)) &&
        constraintOk(config, slot, p),
    )
    .sort((a, b) => config.ratingOf(b) - config.ratingOf(a));
}

/**
 * Round 646: the top of the lineup rating, the clamp in simulate reads it, and
 * so the most the F1, NBA and NHL Perfect Lineups can record (they record the
 * rating). game_score_caps holds it for perfect-lineup-f1, perfect-lineup-nba
 * and perfect-lineup-nhl (scripts/simCapsAreCeilings.mjs).
 */
export const PERFECT_LINEUP_RATING_CEILING = 100;

export function simulate<P>(config: LineupConfig<P>, picks: P[]): GenericSimResult {
  const ratings = picks.map((p) => Math.max(1, Math.min(100, config.ratingOf(p))));
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;

  let chemPts = 0;
  for (const accessor of config.chemistryOf) {
    const counts = new Map<string, number>();
    for (const p of picks) {
      const v = accessor(p);
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    for (const p of picks) {
      if ((counts.get(accessor(p)) || 0) >= 2) chemPts++;
    }
  }
  const chemistry = Math.round((chemPts / (picks.length * config.chemistryOf.length)) * 100);

  const rating = Math.round(Math.min(PERFECT_LINEUP_RATING_CEILING, avg * 0.8 + chemistry * 0.2));
  const squadValue = ratings.reduce((s, r) => s + r, 0);
  const grade =
    rating >= 92 ? 'A+' : rating >= 84 ? 'A' : rating >= 74 ? 'B' : rating >= 62 ? 'C' : 'D';
  const slotGrades: SlotGrade[] = ratings.map((r) => (r >= 88 ? 'green' : r >= 75 ? 'yellow' : 'black'));

  return { rating, chemistry, squadValue, grade, slotGrades };
}

/**
 * Round 645: the ratings the worst and the best picks reach on this board.
 * Slot by slot in formation order, each name used once, the worst board takes
 * the lowest rated eligible player and the best board the highest. Measured
 * before this round over 300 dealt boards: the worst picks already rated 73
 * to 82 (NBA), 77 to 79 (NHL) and 65 to 76 (F1), against best boards of 82 to
 * 91, so the rating the game recorded was most of the way to perfect before a
 * single decision. A slot with nobody eligible leaves no board to measure,
 * and reads as a zero of 0 and a perfect of 100.
 */
export function lineupBounds<P>(config: LineupConfig<P>, slots: GenericSlot[]): { zero: number; perfect: number } {
  const board = (worst: boolean): number | null => {
    const used = new Set<string>();
    const picks: P[] = [];
    for (const slot of slots) {
      const el = eligiblePlayers(config, slot, used);
      if (el.length === 0) return null;
      const p = worst ? el[el.length - 1] : el[0];
      used.add(config.nameOf(p));
      picks.push(p);
    }
    return simulate(config, picks).rating;
  };
  const zero = board(true);
  const perfect = board(false);
  return zero === null || perfect === null ? { zero: 0, perfect: 100 } : { zero, perfect };
}

/** Round 645: what a finished lineup records and its result card shows: the
 *  rating above what the worst picks on the same board reach. The best board
 *  records its rating, exactly as before, and the worst board records 0. */
export function lineupPoints<P>(config: LineupConfig<P>, slots: GenericSlot[], result: GenericSimResult | null): number {
  if (!result) return 0;
  const { zero, perfect } = lineupBounds(config, slots);
  return skillPoints(result.rating, zero, perfect);
}

const GRADE_EMOJI: Record<SlotGrade, string> = { green: '🟩', yellow: '🟨', black: '⬛' };

export function slotGradesToEmoji(grades: SlotGrade[]): string {
  const cells = grades.map((g) => GRADE_EMOJI[g]);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 5) rows.push(cells.slice(i, i + 5).join(''));
  return rows.join('\n');
}

export function describeConstraint(c: GenericConstraint): string {
  return c.value ?? 'Any';
}
