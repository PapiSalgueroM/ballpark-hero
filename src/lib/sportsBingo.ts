import { Player } from '@/types/game';
import { dailyPrngSeed } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

/**
 * Sports Bingo (Round 323, one of the three new games from the owner's
 * 2026-08-28 review): "a card of conditions, open packs on a timer, mark
 * squares when a pull matches, most squares wins".
 *
 * Data rules, per the house law: every condition is derived from fields the
 * pool already carries (position, age, nationality, league, market value,
 * goals, assists), nothing is invented, and the pool is the same
 * fetchSquadPool('current') feed Squad Deal plays from (live top of the
 * market, with the baked trivia pool as its offline fallback), so every
 * player who can appear in a pack is a real, verified footballer.
 *
 * Determinism: the daily card and its ten packs come from one Lehmer stream
 * seeded with dailyPrngSeed (NOT the raw date, see dateUtils' Round 212
 * note), so every player in the world opens the same card and the same
 * packs on the same ET date. Unlimited mode takes a random seed.
 *
 * Completability: after the packs are drawn, every card condition is
 * checked against the whole sequence; a condition no pack can satisfy gets
 * a matching player swapped in deterministically. So a perfect player can
 * always, in principle, black out the card. The harness proves this over
 * hundreds of seeds rather than trusting this comment.
 */

export interface BingoCondition {
  id: string;
  /** Short square label, must stay readable in a 5x5 grid cell. */
  label: string;
  test: (p: Player) => boolean;
}

const DEF = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MID = new Set(['CDM', 'CM', 'CAM']);
const WIDE = new Set(['LW', 'RW', 'LM', 'RM']);
const FWD = new Set(['ST', 'CF']);
const TOP5 = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);

export const CONDITIONS: BingoCondition[] = [
  { id: 'gk', label: 'A goalkeeper', test: p => p.position === 'GK' },
  { id: 'def', label: 'A defender', test: p => DEF.has(p.position) },
  { id: 'fullback', label: 'A full back', test: p => p.position === 'LB' || p.position === 'RB' || p.position === 'LWB' || p.position === 'RWB' },
  { id: 'cb', label: 'A centre back', test: p => p.position === 'CB' },
  { id: 'mid', label: 'A central mid', test: p => MID.has(p.position) },
  { id: 'winger', label: 'A winger', test: p => WIDE.has(p.position) },
  { id: 'striker', label: 'A striker', test: p => FWD.has(p.position) },
  { id: 'age30', label: 'Age 30 or older', test: p => p.age >= 30 },
  { id: 'age23', label: 'Age 23 or younger', test: p => p.age > 0 && p.age <= 23 },
  { id: 'prime', label: 'Age 25 to 29', test: p => p.age >= 25 && p.age <= 29 },
  { id: 'wonderkid', label: 'Age 21 or younger', test: p => p.age > 0 && p.age <= 21 },
  { id: 'v100', label: 'Worth 100M+', test: p => p.marketValue >= 100 },
  { id: 'v60', label: 'Worth 60M+', test: p => p.marketValue >= 60 },
  { id: 'v40', label: 'Worth 40M+', test: p => p.marketValue >= 40 },
  { id: 'vcheap', label: 'Worth under 20M', test: p => p.marketValue < 20 },
  { id: 'g10', label: '10+ goals', test: p => p.goals >= 10 },
  { id: 'g15', label: '15+ goals', test: p => p.goals >= 15 },
  { id: 'a7', label: '7+ assists', test: p => p.assists >= 7 },
  { id: 'ga15', label: '15+ goals plus assists', test: p => p.goals + p.assists >= 15 },
  { id: 'brazil', label: 'A Brazilian', test: p => p.nationality === 'Brazil' },
  { id: 'france', label: 'A Frenchman', test: p => p.nationality === 'France' },
  { id: 'england', label: 'An Englishman', test: p => p.nationality === 'England' },
  { id: 'spain', label: 'A Spaniard', test: p => p.nationality === 'Spain' },
  { id: 'argentina', label: 'An Argentine', test: p => p.nationality === 'Argentina' },
  { id: 'germany', label: 'A German', test: p => p.nationality === 'Germany' },
  { id: 'portugal', label: 'A Portuguese', test: p => p.nationality === 'Portugal' },
  { id: 'netherlands', label: 'A Dutchman', test: p => p.nationality === 'Netherlands' },
  { id: 'pl', label: 'Premier League', test: p => p.league === 'Premier League' },
  { id: 'laliga', label: 'La Liga', test: p => p.league === 'La Liga' },
  { id: 'seriea', label: 'Serie A', test: p => p.league === 'Serie A' },
  { id: 'bundesliga', label: 'Bundesliga', test: p => p.league === 'Bundesliga' },
  { id: 'ligue1', label: 'Ligue 1', test: p => p.league === 'Ligue 1' },
  { id: 'offpiste', label: 'Outside the top 5 leagues', test: p => !TOP5.has(p.league) },
];

const BY_ID = new Map(CONDITIONS.map(c => [c.id, c]));
export function conditionById(id: string): BingoCondition {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`unknown bingo condition ${id}`);
  return c;
}

export const CARD_SIZE = 25;
export const FREE_INDEX = 12;
export const PACK_COUNT = 10;
export const PACK_SIZE = 5;
export const PACK_SECONDS = 15;

/** Deterministic Lehmer stream, the same generator the other dailies use. */
export function lehmer(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface BingoGame {
  /** 24 condition ids in board order; the free centre is NOT in this list,
   *  square index maps through squareCondition below. */
  cardIds: string[];
  packs: Player[][];
}

/** Square index (0..24) to its condition id, or null for the free centre. */
export function squareCondition(game: BingoGame, square: number): BingoCondition | null {
  if (square === FREE_INDEX) return null;
  const idx = square < FREE_INDEX ? square : square - 1;
  return conditionById(game.cardIds[idx]);
}

/**
 * Builds a full game: 24 distinct conditions plus 10 packs of 5 distinct
 * players, all off one seed, with the completability pass described in the
 * module header.
 */
export function buildGame(pool: Player[], seed: number): BingoGame {
  const rng = lehmer(seed);
  const cardIds = shuffled(CONDITIONS, rng).slice(0, CARD_SIZE - 1).map(c => c.id);

  const need = PACK_COUNT * PACK_SIZE;
  const drawn = shuffled(pool, rng).slice(0, Math.min(need, pool.length));
  while (drawn.length < need && pool.length > 0) drawn.push(pool[Math.floor(rng() * pool.length)]);

  /* Completability: every condition on the card must be satisfiable by at
     least one player somewhere in the sequence. A condition nothing matches
     gets a matching player from the pool swapped over the least useful
     drawn player, deterministic because the scan orders are deterministic.
     Two details the harness caught in its first run and this now handles:
     the evicted player must never be another condition's SOLE satisfier
     (one seed in three hundred lost a square exactly that way), and the
     pass repeats until stable in case a swap changes the picture. */
  const conds = cardIds.map(conditionById);
  for (let round = 0; round < conds.length; round += 1) {
    let swapped = false;
    for (const cond of conds) {
      if (drawn.some(p => cond.test(p))) continue;
      const replacement = pool.find(p => cond.test(p) && !drawn.includes(p));
      if (!replacement) continue; /* the pool itself cannot satisfy it; the harness fails this loudly */
      const soleSatisfiers = new Set<Player>();
      for (const c of conds) {
        const matches = drawn.filter(p => c.test(p));
        if (matches.length === 1) soleSatisfiers.add(matches[0]);
      }
      let worstIdx = -1;
      let worstScore = Infinity;
      for (let i = 0; i < drawn.length; i += 1) {
        if (soleSatisfiers.has(drawn[i])) continue;
        const score = conds.filter(c => c.test(drawn[i])).length;
        if (score < worstScore) { worstScore = score; worstIdx = i; }
      }
      if (worstIdx === -1) continue;
      drawn[worstIdx] = replacement;
      swapped = true;
    }
    if (!swapped) break;
  }

  const packs: Player[][] = [];
  for (let i = 0; i < PACK_COUNT; i += 1) packs.push(drawn.slice(i * PACK_SIZE, (i + 1) * PACK_SIZE));
  return { cardIds, packs };
}

/** The daily seed: one shared card and pack sequence per ET date. */
export function dailySeed(dateStr: string): number {
  return dailyPrngSeed(dateStr);
}

/**
 * The finished daily, kept across a refresh (Round 428). Before this, a
 * refresh after the result dealt the same card and the same ten packs again
 * with every answer known, and the second run recorded a second completion.
 * Only the marked board is kept: every number on the result screen derives
 * from it, and the card and packs come back from the seed. Read through the
 * shared fail closed helper (scripts/sweepSaves.mjs feeds this key garbage),
 * and nothing here touches localStorage at module scope, because
 * scripts/simSportsBingo.mjs bundles this file under node.
 */
const SLUG = 'sports-bingo';

export interface DailyBingoRecord {
  date: string;
  marked: boolean[];
}

export function loadDailyBingo(date: string): DailyBingoRecord | null {
  return readDailyRecord<DailyBingoRecord>(SLUG, date, f => {
    const { marked } = f;
    if (!Array.isArray(marked) || marked.length !== CARD_SIZE || !marked.every(x => typeof x === 'boolean')) return null;
    return { date, marked: marked as boolean[] };
  });
}

export function saveDailyBingo(rec: DailyBingoRecord): void {
  writeDailyRecord(SLUG, rec.date, { marked: rec.marked });
}

/** Which squares the CURRENT pack can still claim. */
export function claimableSquares(game: BingoGame, pack: Player[], marked: boolean[]): number[] {
  const out: number[] = [];
  for (let sq = 0; sq < CARD_SIZE; sq += 1) {
    if (marked[sq] || sq === FREE_INDEX) continue;
    const cond = squareCondition(game, sq);
    if (cond && pack.some(p => cond.test(p))) out.push(sq);
  }
  return out;
}

/** Completed rows, columns and diagonals for a marked board (free centre counts). */
export function lineCount(marked: boolean[]): number {
  const at = (r: number, c: number) => r * 5 + c === FREE_INDEX || marked[r * 5 + c];
  let lines = 0;
  for (let r = 0; r < 5; r += 1) if ([0, 1, 2, 3, 4].every(c => at(r, c))) lines += 1;
  for (let c = 0; c < 5; c += 1) if ([0, 1, 2, 3, 4].every(r => at(r, c))) lines += 1;
  if ([0, 1, 2, 3, 4].every(i => at(i, i))) lines += 1;
  if ([0, 1, 2, 3, 4].every(i => at(i, 4 - i))) lines += 1;
  return lines;
}

/**
 * Sitewide ~100 scale (the Round 315 rule): squares carry most of it, lines
 * top it up, a full blackout is exactly 100.
 * 24 squares x 3 = 72, plus 12 lines x 2 = 24, plus the 4 point blackout
 * bonus = 100.
 */
export function scoreGame(marked: boolean[]): number {
  const squares = marked.filter((m, i) => m && i !== FREE_INDEX).length;
  const lines = lineCount(marked);
  const blackout = squares === CARD_SIZE - 1 ? 4 : 0;
  return squares * 3 + lines * 2 + blackout;
}

export type CpuLevel = 'casual' | 'sharp' | 'ruthless';
/* Tuned twice against the harness's 120 game measurement, because the
   first two tunings both flattened near the 24 square ceiling: claimable
   squares are plentiful, so generous caps let every level finish close to
   a blackout (21 vs 23 squares, an unfelt difference, and a versus mode
   nobody could win). Throughput is capped low instead so the levels spread
   BELOW the ceiling and a person can genuinely race all three. */
export const CPU_LEVELS: { id: CpuLevel; label: string; blurb: string; accuracy: number; maxPerPack: number }[] = [
  { id: 'casual', label: 'Casual', blurb: 'Misses plenty', accuracy: 0.3, maxPerPack: 1 },
  { id: 'sharp', label: 'Sharp', blurb: 'Catches most pulls', accuracy: 0.55, maxPerPack: 2 },
  { id: 'ruthless', label: 'Ruthless', blurb: 'Almost never blinks', accuracy: 0.85, maxPerPack: 3 },
];

/**
 * The CPU's claims for one pack on ITS OWN board state. Same claimable set a
 * person gets, each claim kept with the level's accuracy, capped per pack so
 * a strong CPU still cannot inhale a whole card off one lucky pack.
 */
export function cpuClaims(game: BingoGame, pack: Player[], cpuMarked: boolean[], level: CpuLevel, rng: () => number): number[] {
  const spec = CPU_LEVELS.find(l => l.id === level) ?? CPU_LEVELS[0];
  const options = claimableSquares(game, pack, cpuMarked);
  const out: number[] = [];
  for (const sq of options) {
    if (out.length >= spec.maxPerPack) break;
    if (rng() < spec.accuracy) out.push(sq);
  }
  return out;
}
