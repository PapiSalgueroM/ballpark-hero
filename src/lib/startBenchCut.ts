import { daySeed, mulberry32, type ModeDef, type RankPlayer } from '@/lib/blindRank';

/**
 * START, BENCH, CUT — KOT4Q's staple format (docs/YOUTUBER_FORMATS.md).
 * Every round deals 3 players + a stat context. Assign one to START, one to
 * BENCH, one to CUT; truth = the trio ranked by the hidden stat (Start #1,
 * Bench #2, Cut #3). Five rounds per run. Daily (date-seeded, same trios for
 * everyone) + unlimited. Player pool + RNG are shared with Blind Rank —
 * fetchBlindRankPool() is the data spine (top-200 by 2026 market value).
 */

export type SbcSlot = 'start' | 'bench' | 'cut';

/** Slot order = truth rank order: best of the trio starts, worst gets cut. */
export const SLOTS: SbcSlot[] = ['start', 'bench', 'cut'];

export interface SbcRound {
  mode: ModeDef;
  players: RankPlayer[]; // exactly 3
}

export interface SbcResult {
  total: number;
  exact: number;      // 3, 1 or 0 — never 2 (see scoreSbcRound)
  perfect: boolean;
  truth: SbcSlot[];   // truth[i] = correct slot for players[i]
}

export const ROUNDS_PER_RUN = 5;

/** Same stat spine as Blind Rank, re-phrased for the start/bench/cut choice. */
export const SBC_MODES: ModeDef[] = [
  {
    id: 'value',
    title: 'Market Value',
    question: 'START the most valuable (2026), CUT the cheapest',
    unit: p => `$${p.marketValueM}M`,
    stat: p => p.marketValueM,
    descending: true,
  },
  {
    id: 'goals',
    title: 'Career Goals',
    question: 'START the top scorer, CUT the fewest career goals',
    unit: p => `${p.goals} goals`,
    stat: p => p.goals,
    descending: true,
  },
  {
    id: 'assists',
    title: 'Career Assists',
    question: 'START the top creator, CUT the fewest career assists',
    unit: p => `${p.assists} assists`,
    stat: p => p.assists,
    descending: true,
  },
  {
    id: 'age',
    title: 'Age',
    question: 'Youth wins: START the YOUNGEST, CUT the oldest',
    unit: p => `${p.age} yrs`,
    stat: p => p.age,
    descending: false,
  },
];

/** Blind Rank's ET-anchored day number, salted so the two dailies don't share an RNG stream. */
export function sbcDaySeed(date = new Date()): number {
  return (daySeed(date) ^ 0x53bc) >>> 0;
}

/**
 * Build a full 5-round run. Stat contexts rotate (shuffled mode order, then
 * round i takes modes[i % 4]) so a run always mixes categories. Each trio is
 * re-drawn until the 3 stat values are strictly distinct (ties would make the
 * truth unfair), goals/assists trios need a >= 20 spread so the choice isn't a
 * coin flip, and players don't repeat across the run unless the draw gets
 * stuck. Deterministic when a seed is provided (daily), random otherwise.
 */
export function buildSbcRun(pool: RankPlayer[], seed?: number): SbcRound[] | null {
  if (pool.length < 20) return null;
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;

  const modeOrder = [...SBC_MODES];
  for (let i = modeOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [modeOrder[i], modeOrder[j]] = [modeOrder[j], modeOrder[i]];
  }

  const rounds: SbcRound[] = [];
  const usedGlobal = new Set<number>();
  for (let r = 0; r < ROUNDS_PER_RUN; r++) {
    const mode = modeOrder[r % modeOrder.length];
    let round: SbcRound | null = null;
    for (let attempt = 0; attempt < 60 && !round; attempt++) {
      const allowRepeats = attempt >= 40; // relax cross-round uniqueness if stuck
      const picked: RankPlayer[] = [];
      const used = new Set<number>();
      while (picked.length < 3) {
        const i = Math.floor(rng() * pool.length);
        if (used.has(i)) continue;
        if (!allowRepeats && usedGlobal.has(i)) continue;
        used.add(i);
        picked.push(pool[i]);
      }
      const stats = picked.map(mode.stat);
      if (new Set(stats).size !== 3) continue;
      const spread = Math.max(...stats) - Math.min(...stats);
      if ((mode.id === 'goals' || mode.id === 'assists') && spread < 20) continue;
      used.forEach(i => usedGlobal.add(i));
      round = { mode, players: picked };
    }
    if (!round) return null;
    rounds.push(round);
  }
  return rounds;
}

/** truth[i] = the slot players[i] deserves: best stat starts, worst is cut. */
export function trueSlots(players: RankPlayer[], mode: ModeDef): SbcSlot[] {
  const order = [0, 1, 2].sort((a, b) => mode.descending
    ? mode.stat(players[b]) - mode.stat(players[a])
    : mode.stat(players[a]) - mode.stat(players[b]));
  const slots: SbcSlot[] = ['bench', 'bench', 'bench'];
  order.forEach((playerIdx, rank) => { slots[playerIdx] = SLOTS[rank]; });
  return slots;
}

/**
 * Score one locked-in trio. Assignments form a permutation of the 3 slots, so
 * exact matches can only be 3 (perfect), 1, or 0 — if two placements are
 * right the third must be too, so a "2 correct" tier cannot exist.
 * Perfect trio = 30 + 10 x streakBefore (back-to-back perfects escalate),
 * exactly one right = 10, otherwise 0. Max run = 30+40+50+60+70 = 250.
 */
export function scoreSbcRound(
  assignments: (SbcSlot | null)[],
  players: RankPlayer[],
  mode: ModeDef,
  streakBefore: number,
): SbcResult {
  const truth = trueSlots(players, mode);
  let exact = 0;
  assignments.forEach((slot, i) => { if (slot !== null && slot === truth[i]) exact++; });
  const perfect = exact === 3;
  const total = perfect ? 30 + 10 * streakBefore : exact === 1 ? 10 : 0;
  return { total, exact, perfect, truth };
}
