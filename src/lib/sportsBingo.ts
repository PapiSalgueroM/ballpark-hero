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
 *
 * Round 727, pass the device and custom cards (spec section 71). The deal
 * now hands out one card PER SEAT off one stream, and the ten packs are the
 * same objects for every seat, so a table of four is four cards hearing one
 * call. The completability pass runs over the union of every seat's
 * conditions, so each card can still be blacked out from the shared packs.
 * Conditions carry a family (position, age, value, output, nationality,
 * league) and a table can keep or drop whole families; a pick that cannot
 * fill 24 squares is topped up from the rest of the bank and says so
 * (`fallback`), never dealt short. The table itself is plain data and pure
 * functions, the shape Rebuild's seats settled in Round 461, so
 * scripts/simBingoSeats.mjs drives it with no page. A one seat deal with
 * every family is byte for byte the Round 323 deal, which keeps the daily
 * card where it was.
 */

export type BingoFamily = 'position' | 'age' | 'value' | 'output' | 'nationality' | 'league';

export interface BingoCondition {
  id: string;
  /** Short square label, must stay readable in a 5x5 grid cell. */
  label: string;
  /** Round 727: the family a custom card keeps or drops. */
  family: BingoFamily;
  test: (p: Player) => boolean;
}

export const FAMILIES: { id: BingoFamily; label: string; blurb: string }[] = [
  { id: 'position', label: 'Positions', blurb: 'keeper, centre back, winger' },
  { id: 'age', label: 'Ages', blurb: '21 or younger, 30 or older' },
  { id: 'value', label: 'Values', blurb: '100M plus, under 20M' },
  { id: 'output', label: 'Goals and assists', blurb: '10 plus goals, 7 plus assists' },
  { id: 'nationality', label: 'Nationalities', blurb: 'a Brazilian, a Spaniard' },
  { id: 'league', label: 'Leagues', blurb: 'Premier League, Serie A' },
];
export const ALL_FAMILIES: BingoFamily[] = FAMILIES.map(f => f.id);

const DEF = new Set(['CB', 'LB', 'RB', 'LWB', 'RWB']);
const MID = new Set(['CDM', 'CM', 'CAM']);
const WIDE = new Set(['LW', 'RW', 'LM', 'RM']);
const FWD = new Set(['ST', 'CF']);
const TOP5 = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);

export const CONDITIONS: BingoCondition[] = [
  { id: 'gk', label: 'A goalkeeper', family: 'position', test: p => p.position === 'GK' },
  { id: 'def', label: 'A defender', family: 'position', test: p => DEF.has(p.position) },
  { id: 'fullback', label: 'A full back', family: 'position', test: p => p.position === 'LB' || p.position === 'RB' || p.position === 'LWB' || p.position === 'RWB' },
  { id: 'cb', label: 'A centre back', family: 'position', test: p => p.position === 'CB' },
  { id: 'mid', label: 'A central mid', family: 'position', test: p => MID.has(p.position) },
  { id: 'winger', label: 'A winger', family: 'position', test: p => WIDE.has(p.position) },
  { id: 'striker', label: 'A striker', family: 'position', test: p => FWD.has(p.position) },
  { id: 'age30', label: 'Age 30 or older', family: 'age', test: p => p.age >= 30 },
  { id: 'age23', label: 'Age 23 or younger', family: 'age', test: p => p.age > 0 && p.age <= 23 },
  { id: 'prime', label: 'Age 25 to 29', family: 'age', test: p => p.age >= 25 && p.age <= 29 },
  { id: 'wonderkid', label: 'Age 21 or younger', family: 'age', test: p => p.age > 0 && p.age <= 21 },
  { id: 'v100', label: 'Worth 100M+', family: 'value', test: p => p.marketValue >= 100 },
  { id: 'v60', label: 'Worth 60M+', family: 'value', test: p => p.marketValue >= 60 },
  { id: 'v40', label: 'Worth 40M+', family: 'value', test: p => p.marketValue >= 40 },
  { id: 'vcheap', label: 'Worth under 20M', family: 'value', test: p => p.marketValue < 20 },
  { id: 'g10', label: '10+ goals', family: 'output', test: p => p.goals >= 10 },
  { id: 'g15', label: '15+ goals', family: 'output', test: p => p.goals >= 15 },
  { id: 'a7', label: '7+ assists', family: 'output', test: p => p.assists >= 7 },
  { id: 'ga15', label: '15+ goals plus assists', family: 'output', test: p => p.goals + p.assists >= 15 },
  { id: 'brazil', label: 'A Brazilian', family: 'nationality', test: p => p.nationality === 'Brazil' },
  { id: 'france', label: 'A Frenchman', family: 'nationality', test: p => p.nationality === 'France' },
  { id: 'england', label: 'An Englishman', family: 'nationality', test: p => p.nationality === 'England' },
  { id: 'spain', label: 'A Spaniard', family: 'nationality', test: p => p.nationality === 'Spain' },
  { id: 'argentina', label: 'An Argentine', family: 'nationality', test: p => p.nationality === 'Argentina' },
  { id: 'germany', label: 'A German', family: 'nationality', test: p => p.nationality === 'Germany' },
  { id: 'portugal', label: 'A Portuguese', family: 'nationality', test: p => p.nationality === 'Portugal' },
  { id: 'netherlands', label: 'A Dutchman', family: 'nationality', test: p => p.nationality === 'Netherlands' },
  { id: 'pl', label: 'Premier League', family: 'league', test: p => p.league === 'Premier League' },
  { id: 'laliga', label: 'La Liga', family: 'league', test: p => p.league === 'La Liga' },
  { id: 'seriea', label: 'Serie A', family: 'league', test: p => p.league === 'Serie A' },
  { id: 'bundesliga', label: 'Bundesliga', family: 'league', test: p => p.league === 'Bundesliga' },
  { id: 'ligue1', label: 'Ligue 1', family: 'league', test: p => p.league === 'Ligue 1' },
  { id: 'offpiste', label: 'Outside the top 5 leagues', family: 'league', test: p => !TOP5.has(p.league) },
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

/** The bank a custom card draws from: every condition in the chosen families, in bank order. */
export function allowedConditions(families: readonly BingoFamily[]): BingoCondition[] {
  const keep = new Set(families);
  return CONDITIONS.filter(c => keep.has(c.family));
}

export interface BingoDeal {
  /** One card per seat, 24 ids each, in seat order. */
  cards: string[][];
  /** The one pack sequence every seat is shown. */
  packs: Player[][];
  /** How many conditions the chosen families offered. */
  allowed: number;
  /** True when the families could not fill 24 squares and the rest of the
   *  bank topped every card up. The page says so; the card is never short. */
  fallback: boolean;
}

/**
 * Deals a table: one card per seat plus the ten packs every seat is shown,
 * all off one seed, with the completability pass described in the module
 * header run over the union of every seat's conditions.
 *
 * A seat's card is a shuffle of the allowed bank. When the bank is short of
 * 24 the card takes the whole bank plus a top up drawn from the dropped
 * families, drawn afresh per seat so the top ups differ, and `fallback` is
 * set. With every family kept and one seat the stream is consumed in exactly
 * the Round 323 order, so buildGame below deals the same daily it always has.
 */
export function dealCards(pool: Player[], seed: number, seats: number, families: readonly BingoFamily[] = ALL_FAMILIES): BingoDeal {
  const rng = lehmer(seed);
  const allowed = allowedConditions(families);
  const rest = CONDITIONS.filter(c => !allowed.includes(c));
  const fallback = allowed.length < CARD_SIZE - 1;
  const cards: string[][] = [];
  for (let s = 0; s < Math.max(1, seats); s += 1) {
    const bank = fallback ? [...allowed, ...shuffled(rest, rng).slice(0, CARD_SIZE - 1 - allowed.length)] : allowed;
    cards.push(shuffled(bank, rng).slice(0, CARD_SIZE - 1).map(c => c.id));
  }

  const need = PACK_COUNT * PACK_SIZE;
  const drawn = shuffled(pool, rng).slice(0, Math.min(need, pool.length));
  while (drawn.length < need && pool.length > 0) drawn.push(pool[Math.floor(rng() * pool.length)]);

  /* Completability: every condition on every card must be satisfiable by at
     least one player somewhere in the sequence. A condition nothing matches
     gets a matching player from the pool swapped over the least useful
     drawn player, deterministic because the scan orders are deterministic.
     Two details the harness caught in its first run and this now handles:
     the evicted player must never be another condition's SOLE satisfier
     (one seed in three hundred lost a square exactly that way), and the
     pass repeats until stable in case a swap changes the picture. */
  const conds = [...new Set(cards.flat())].map(conditionById);
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
  return { cards, packs, allowed: allowed.length, fallback };
}

/**
 * Builds a solo game: 24 distinct conditions plus 10 packs of 5 distinct
 * players, all off one seed. A one seat, every family deal.
 */
export function buildGame(pool: Player[], seed: number): BingoGame {
  const deal = dealCards(pool, seed, 1);
  return { cardIds: deal.cards[0], packs: deal.packs };
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

function isBoard(x: unknown): x is boolean[] {
  return Array.isArray(x) && x.length === CARD_SIZE && x.every(v => typeof v === 'boolean');
}

export function loadDailyBingo(date: string): DailyBingoRecord | null {
  return readDailyRecord<DailyBingoRecord>(SLUG, date, f => {
    const { marked } = f;
    if (!isBoard(marked)) return null;
    return { date, marked };
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

/** Marked squares, the free centre not counted. */
export function squaresOf(marked: boolean[]): number {
  return marked.filter((m, i) => m && i !== FREE_INDEX).length;
}

/**
 * Sitewide ~100 scale (the Round 315 rule): squares carry most of it, lines
 * top it up, a full blackout is exactly 100.
 * 24 squares x 3 = 72, plus 12 lines x 2 = 24, plus the 4 point blackout
 * bonus = 100.
 */
export function scoreGame(marked: boolean[]): number {
  const squares = squaresOf(marked);
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

/* ---------------- Round 727: the table, two to four seats on one phone ---------------- */

export type BingoGoal = 'line' | 'card';
export const GOALS: { id: BingoGoal; label: string; blurb: string }[] = [
  { id: 'line', label: 'First line', blurb: 'First to a full row, column or diagonal' },
  { id: 'card', label: 'Full card', blurb: 'Most squares after pack 10, a blackout ends it early' },
];

export type BingoDifficulty = 'relaxed' | 'standard' | 'quick';
export const DIFFICULTIES: { id: BingoDifficulty; label: string; seconds: number }[] = [
  { id: 'relaxed', label: 'Relaxed', seconds: 20 },
  { id: 'standard', label: 'Standard', seconds: PACK_SECONDS },
  { id: 'quick', label: 'Quick', seconds: 10 },
];
export function secondsFor(difficulty: BingoDifficulty): number {
  return (DIFFICULTIES.find(d => d.id === difficulty) ?? DIFFICULTIES[1]).seconds;
}

export type SeatKind = 'human' | 'cpu';
export const MIN_SEATS = 2;
export const MAX_SEATS = 4;

export interface BingoSeatSetup {
  kind: SeatKind;
  name: string;
  /** The temper a CPU seat plays with; ignored on a human seat. */
  level: CpuLevel;
}

export interface BingoSeat extends BingoSeatSetup {
  index: number;
  marked: boolean[];
  /** How many players this seat had been shown, over the whole game, when
   *  it first met the goal. Null until it does. The tie rule reads it. */
  doneAt: number | null;
}

export interface BingoTableSetup {
  seats: BingoSeatSetup[];
  families: BingoFamily[];
  difficulty: BingoDifficulty;
  goal: BingoGoal;
}

export type TablePhase = 'handover' | 'turn' | 'done';

export interface BingoTable {
  seed: number;
  goal: BingoGoal;
  difficulty: BingoDifficulty;
  families: BingoFamily[];
  allowed: number;
  fallback: boolean;
  /** The ten packs, the same objects for every seat. Saved with the table,
   *  because the live pool can change under a resumed game and the seed
   *  alone would then deal different packs. */
  packs: Player[][];
  /** One card per seat, in seat order. */
  cards: string[][];
  seats: BingoSeat[];
  /** The pack on the table, 0 based. Every seat takes a turn on it before the next opens. */
  packIndex: number;
  /** The seat in the chair. */
  turn: number;
  /** Players of the open pack turned face up so far, this turn. */
  revealed: number;
  phase: TablePhase;
}

export function goalMet(marked: boolean[], goal: BingoGoal): boolean {
  return goal === 'line' ? lineCount(marked) >= 1 : squaresOf(marked) === CARD_SIZE - 1;
}

/** A seat's view of the deal: its own card over the shared packs. */
export function seatGame(t: BingoTable, index: number): BingoGame {
  return { cardIds: t.cards[index], packs: t.packs };
}

/** Players shown to the seat in the chair so far, over the whole game. */
export function revealsUsed(t: BingoTable): number {
  return t.packIndex * PACK_SIZE + t.revealed;
}

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export function defaultSeats(count: number): BingoSeatSetup[] {
  return Array.from({ length: Math.min(MAX_SEATS, Math.max(MIN_SEATS, count)) }, (_, i) => ({ kind: 'human' as SeatKind, name: DEFAULT_NAMES[i], level: 'casual' as CpuLevel }));
}

function withSeat(t: BingoTable, seat: BingoSeat): BingoTable {
  return { ...t, seats: t.seats.map(s => (s.index === seat.index ? seat : s)) };
}

/* A CPU seat's stream is its own, keyed by the deal, the pack and the seat,
   so its luck can never move which packs the table sees and a resumed game
   plays the same CPU turn it would have played before the refresh. */
function cpuRng(t: BingoTable, seat: number): () => number {
  return lehmer(((t.seed ^ (0x5bf03635 + t.packIndex * 7919 + seat * 104729)) >>> 0) || 7);
}

/** A seat count outside two to four is clamped, and a table with no human
 *  seat gets one, because somebody is holding the phone. */
export function createTable(pool: Player[], seed: number, setup: BingoTableSetup): BingoTable {
  const base = setup.seats.slice(0, MAX_SEATS).map(s => ({ ...s, name: s.name.trim() || 'Player' }));
  while (base.length < MIN_SEATS) base.push({ kind: 'cpu', name: `${CPU_LEVELS[0].label} CPU`, level: 'casual' });
  if (!base.some(s => s.kind === 'human')) base[0] = { ...base[0], kind: 'human' };
  /* Two seats with one name (two Sharp CPUs, two people both called Sam) get numbered, so the result reads. */
  const seen = new Map<string, number>();
  for (const s of base) {
    const n = (seen.get(s.name) ?? 0) + 1;
    seen.set(s.name, n);
    if (n > 1) s.name = `${s.name} ${n}`;
  }
  const families = setup.families.filter((f, i, a) => a.indexOf(f) === i);
  const deal = dealCards(pool, seed, base.length, families);
  const seats: BingoSeat[] = base.map((s, index) => ({ ...s, index, marked: new Array(CARD_SIZE).fill(false), doneAt: null }));
  return settleCpu({
    seed, goal: setup.goal, difficulty: setup.difficulty, families,
    allowed: deal.allowed, fallback: deal.fallback, packs: deal.packs, cards: deal.cards,
    seats, packIndex: 0, turn: 0, revealed: 0, phase: 'handover',
  });
}

/** The human seat in the chair takes the phone: its turn on the open pack begins, nothing turned up yet. */
export function openTurn(t: BingoTable): BingoTable {
  if (t.phase !== 'handover') return t;
  const seat = t.seats[t.turn];
  if (!seat || seat.kind !== 'human') return t;
  return { ...t, phase: 'turn', revealed: 0 };
}

/** Turns the next player of the open pack face up. */
export function revealNext(t: BingoTable): BingoTable {
  if (t.phase !== 'turn' || t.revealed >= PACK_SIZE) return t;
  return { ...t, revealed: t.revealed + 1 };
}

/** The seat in the chair claims a square a player already turned up satisfies. Anything else is refused unchanged. */
export function claimSquare(t: BingoTable, sq: number): BingoTable {
  if (t.phase !== 'turn') return t;
  const seat = t.seats[t.turn];
  if (!seat || seat.marked[sq]) return t;
  const shown = t.packs[t.packIndex].slice(0, t.revealed);
  if (!claimableSquares(seatGame(t, seat.index), shown, seat.marked).includes(sq)) return t;
  const marked = [...seat.marked];
  marked[sq] = true;
  const doneAt = seat.doneAt ?? (goalMet(marked, t.goal) ? revealsUsed(t) : null);
  return withSeat(t, { ...seat, marked, doneAt });
}

/** The turn is over (the clock ran out or the seat said so): the phone moves on. */
export function closeTurn(t: BingoTable): BingoTable {
  if (t.phase !== 'turn') return t;
  return settleCpu(advance(t));
}

/* The next seat on this pack, or the next pack, or the end: the table stops
   after the round in which somebody met the goal, so every seat has seen the
   same packs, and after pack ten regardless. */
function advance(t: BingoTable): BingoTable {
  const turn = t.turn + 1;
  if (turn < t.seats.length) return { ...t, turn, revealed: 0, phase: 'handover' };
  const over = t.seats.some(s => s.doneAt !== null) || t.packIndex + 1 >= PACK_COUNT;
  if (over) return { ...t, turn: 0, revealed: 0, phase: 'done' };
  return { ...t, turn: 0, packIndex: t.packIndex + 1, revealed: 0, phase: 'handover' };
}

/* CPU seats in the chair play at once, the whole pack face up, so the phone
   only ever stops on a human. */
function settleCpu(t: BingoTable): BingoTable {
  let cur = t;
  while (cur.phase === 'handover' && cur.seats[cur.turn]?.kind === 'cpu') {
    const seat = cur.seats[cur.turn];
    const marked = [...seat.marked];
    for (const sq of cpuClaims(seatGame(cur, seat.index), cur.packs[cur.packIndex], marked, seat.level, cpuRng(cur, seat.index))) marked[sq] = true;
    const shown = { ...cur, revealed: PACK_SIZE };
    const doneAt = seat.doneAt ?? (goalMet(marked, cur.goal) ? revealsUsed(shown) : null);
    cur = advance(withSeat(shown, { ...seat, marked, doneAt }));
  }
  return cur;
}

export interface BingoVerdict {
  /** Seat indexes sharing the win; one in the ordinary case. */
  winners: number[];
  /** 'goal' when somebody met it, 'squares' when nobody did and the count decided. */
  by: 'goal' | 'squares';
}

/**
 * The rule, in order: the seat that met the goal having been shown the fewest
 * players; level on that, the most squares; still level, the win is shared.
 * Nobody met it: most squares, shared when level.
 */
export function declareWinner(t: BingoTable): BingoVerdict {
  const met = t.seats.filter(s => s.doneAt !== null);
  let field = t.seats;
  if (met.length > 0) {
    const first = Math.min(...met.map(s => s.doneAt as number));
    field = met.filter(s => s.doneAt === first);
  }
  const top = Math.max(...field.map(s => squaresOf(s.marked)));
  return { winners: field.filter(s => squaresOf(s.marked) === top).map(s => s.index), by: met.length > 0 ? 'goal' : 'squares' };
}

/* ---------------- the table save, read fail closed ---------------- */

const TABLE_KEY = 'sports-bingo-table';
const TABLE_VERSION = 1;

function isPlayer(x: unknown): x is Player {
  if (!x || typeof x !== 'object') return false;
  const p = x as Record<string, unknown>;
  return typeof p.name === 'string' && typeof p.position === 'string' && typeof p.nationality === 'string'
    && typeof p.league === 'string' && typeof p.club === 'string'
    && typeof p.age === 'number' && typeof p.marketValue === 'number' && typeof p.goals === 'number' && typeof p.assists === 'number';
}

function isSeat(x: unknown, index: number): x is BingoSeat {
  if (!x || typeof x !== 'object') return false;
  const s = x as Record<string, unknown>;
  return s.index === index && (s.kind === 'human' || s.kind === 'cpu') && typeof s.name === 'string'
    && CPU_LEVELS.some(l => l.id === s.level) && isBoard(s.marked)
    && (s.doneAt === null || (typeof s.doneAt === 'number' && Number.isInteger(s.doneAt) && s.doneAt >= 1));
}

/** The saved table, or null for anything that is not exactly one. Pure, so the harness feeds it strings. */
export function parseBingoTable(raw: string | null): BingoTable | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const wrap = parsed as Record<string, unknown>;
    if (wrap.v !== TABLE_VERSION || !wrap.table || typeof wrap.table !== 'object') return null;
    const t = wrap.table as Record<string, unknown>;
    if (typeof t.seed !== 'number' || !Number.isFinite(t.seed)) return null;
    if (!GOALS.some(g => g.id === t.goal) || !DIFFICULTIES.some(d => d.id === t.difficulty)) return null;
    if (!Array.isArray(t.families) || !t.families.every(f => ALL_FAMILIES.includes(f as BingoFamily))) return null;
    if (typeof t.allowed !== 'number' || typeof t.fallback !== 'boolean') return null;
    if (!Array.isArray(t.packs) || t.packs.length !== PACK_COUNT || !t.packs.every(p => Array.isArray(p) && p.length === PACK_SIZE && p.every(isPlayer))) return null;
    if (!Array.isArray(t.seats) || t.seats.length < MIN_SEATS || t.seats.length > MAX_SEATS || !t.seats.every(isSeat)) return null;
    const seats = t.seats as BingoSeat[];
    if (!seats.some(s => s.kind === 'human')) return null;
    if (!Array.isArray(t.cards) || t.cards.length !== seats.length
      || !t.cards.every(c => Array.isArray(c) && c.length === CARD_SIZE - 1 && c.every(id => typeof id === 'string' && BY_ID.has(id)))) return null;
    if (typeof t.packIndex !== 'number' || !Number.isInteger(t.packIndex) || t.packIndex < 0 || t.packIndex >= PACK_COUNT) return null;
    if (typeof t.turn !== 'number' || !Number.isInteger(t.turn) || t.turn < 0 || t.turn >= seats.length) return null;
    if (typeof t.revealed !== 'number' || !Number.isInteger(t.revealed) || t.revealed < 0 || t.revealed > PACK_SIZE) return null;
    if (t.phase !== 'handover' && t.phase !== 'turn' && t.phase !== 'done') return null;
    /* The phone only ever stops on a human. */
    if (t.phase !== 'done' && seats[t.turn].kind !== 'human') return null;
    return {
      seed: t.seed, goal: t.goal as BingoGoal, difficulty: t.difficulty as BingoDifficulty,
      families: t.families as BingoFamily[], allowed: t.allowed, fallback: t.fallback,
      packs: t.packs as Player[][], cards: t.cards as string[][], seats,
      packIndex: t.packIndex, turn: t.turn, revealed: t.revealed, phase: t.phase as TablePhase,
    };
  } catch {
    return null;
  }
}

export function loadBingoTable(): BingoTable | null {
  try {
    return parseBingoTable(localStorage.getItem(TABLE_KEY));
  } catch {
    return null;
  }
}

export function saveBingoTable(t: BingoTable): void {
  try {
    localStorage.setItem(TABLE_KEY, JSON.stringify({ v: TABLE_VERSION, table: t }));
  } catch {
    /* storage full or blocked: the game still plays, it just will not survive a refresh */
  }
}

export function clearBingoTable(): void {
  try {
    localStorage.removeItem(TABLE_KEY);
  } catch {
    /* nothing to clear */
  }
}
