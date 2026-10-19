/**
 * Round 1501: Club Manager's difficulty. A player's report, 2026-10-14: "plsss
 * make the game harder its simply way too easy". The levels and their words are
 * sport neutral (src/lib/managerDifficulty.ts); this file is Club Manager's
 * table of dials and the small functions the engine calls where a dial bites.
 *
 * The dials, one row per level:
 *   gain    the board's change after a match, when it is up, times this
 *   pain    the same when it is down (after patience and the press)
 *   cut     points off a stay's summer opening, only when that opening is
 *           already under Safe: a season the board liked still opens Safe
 *   cheque  the board's money (day one, every summer, a move) times this
 *   wageRoom the wage ceiling a job starts with times this (never under 60)
 *   mark    the price the market lists FOR YOU times this; the AI's own deals
 *           and every man's value are untouched. Under 1, never under what
 *           selling him straight back banks (markedPriceOf)
 *   edge    strength points the other side adds in your matches only. Round 1512: negative on
 *           Very Easy and Easy. Every reader of oppStrengthVsMe takes that safely: the goal rates
 *           (halfLambdas and matchFacts) clamp to 0.12 to 4.2, the shootout's made up takers and
 *           keeper go through shootoutTakerEdge and shootoutKeeperEdge, which clamp, and the rest
 *           (the talks, the half time read, the next match card) only compare or print the number.
 *
 * Round 1512: five levels. 'normal' is the id of Medium, 'legend' of Impossible; the words are
 * in src/lib/managerDifficulty.ts. The level can change between matches (setDifficulty in
 * clubManagerStart.ts), and every function here reads it where its dial bites, so a change
 * reaches the next match, the next cheque and the next job, and nothing already played.
 *
 * NORMAL IS THE GAME AS IT WAS, TO THE BYTE. Every function below returns its
 * input untouched when ITS dial holds the identity value (1, or 0 for cut and
 * edge), by an early return, never by arithmetic with 1: rounding a budget to
 * 0.1 is not the identity on every double. Nothing here draws from Math.random,
 * and nothing is evaluated at module scope but the table.
 *
 * IMPORTS: types from clubManager.ts, and values only from files that do not
 * import the engine back at runtime (clubManagerStart.ts imports it as a type
 * only, clubManagerBoardVerdict.ts and managerDifficulty.ts import nothing), so
 * the engine can import this file without a cycle. Anything that needs the
 * engine (the board's asks) is handed in by the caller.
 */
import type { BoardObjective, CareerState, MarketPlayer } from '@/lib/clubManager';
import { applyCareerSetup, levelFrom, optionsAtLevel } from '@/lib/clubManagerStart';
import type { CareerSetup } from '@/lib/clubManagerStart';
import { BOARD_SAFE_LINE } from '@/lib/clubManagerBoardVerdict';
import type { DifficultyLevel } from '@/lib/managerDifficulty';

export interface CmDials {
  gain: number;
  pain: number;
  cut: number;
  cheque: number;
  wageRoom: number;
  mark: number;
  edge: number;
}

/** The table, easiest first. Set from measurement (scripts/simCmDifficulty.mjs section 4, its header has the
 *  numbers). Round 1512: the two easy rows mirror Hard and Impossible ('legend'): a kinder board, more money, a
 *  cheaper market for you and a weaker side against you (a negative edge). Their cut stays 0, so a bad season
 *  opens where it would on Medium ('normal'), never higher. */
export const CM_DIFFICULTY_DIALS: Record<DifficultyLevel, CmDials> = {
  veryeasy: { gain: 1.4, pain: 0.6, cut: 0, cheque: 1.5, wageRoom: 1.12, mark: 0.8, edge: -3 },
  easy: { gain: 1.2, pain: 0.8, cut: 0, cheque: 1.2, wageRoom: 1.06, mark: 0.87, edge: -1.5 },
  normal: { gain: 1, pain: 1, cut: 0, cheque: 1, wageRoom: 1, mark: 1, edge: 0 },
  hard: { gain: 0.8, pain: 1.25, cut: 8, cheque: 0.8, wageRoom: 0.94, mark: 1.15, edge: 1.5 },
  legend: { gain: 0.65, pain: 1.5, cut: 14, cheque: 0.65, wageRoom: 0.9, mark: 1.3, edge: 3 },
};

/** The career's level. A save without the key is Normal. */
export function difficultyOf(state: CareerState): DifficultyLevel {
  return levelFrom(state);
}

function dialsOf(state: CareerState): CmDials {
  return CM_DIFFICULTY_DIALS[levelFrom(state)];
}

/** B1: the board's change after one of your matches, before it is rounded. */
export function boardSwing(state: CareerState, delta: number): number {
  const { gain, pain } = dialsOf(state);
  if (delta > 0) return gain === 1 ? delta : delta * gain;
  if (delta < 0) return pain === 1 ? delta : delta * pain;
  return delta;
}

/** B2: a stay's summer opening. At or above Safe it is untouched; under Safe it drops by the cut. */
export function boardOpening(state: CareerState, value: number): number {
  const { cut } = dialsOf(state);
  if (cut === 0 || value >= BOARD_SAFE_LINE) return value;
  return value - cut;
}

/** M1: the board's money, to the nearest 0.1m. */
export function boardCheque(state: CareerState, amount: number): number {
  const { cheque } = dialsOf(state);
  return cheque === 1 ? amount : Math.round(amount * cheque * 10) / 10;
}

/** M2: the wage ceiling a job starts with. Never under 60, the floor wageCapFrom keeps. */
export function wageRoomFor(state: CareerState, cap: number): number {
  const { wageRoom } = dialsOf(state);
  return wageRoom === 1 ? cap : Math.max(60, Math.round(cap * wageRoom));
}

/** T1: one price as the market lists it to you. */
export function markedPrice(state: CareerState, price: number): number {
  const { mark } = dialsOf(state);
  return mark === 1 ? price : Math.max(0.5, Math.round(price * mark * 10) / 10);
}

/** What selling a man you have just signed banks: sellValue's 0.9 of his value (src/lib/clubManager.ts), for a
 *  signing on a deal of two years or more. A number here, not an import, because this file must not import the
 *  engine at runtime; simCmDifficulty section 3 holds it against the engine's own sellValue. */
const SALE_SHARE = 0.9;

/** T1: one man as the market lists him to you. Round 1512 closing check: on an easy row the mark never takes
 *  him under what selling him straight back would bank, and never over the price Medium lists him at. Without
 *  that floor a Very Easy career could buy a man over 30 at 0.72 of his value and sell him at 0.9. The rows
 *  over 1 (Hard and Impossible) are markedPrice exactly, as before. */
export function markedPriceOf(state: CareerState, mp: MarketPlayer): number {
  const { mark } = dialsOf(state);
  if (mark === 1) return mp.price;
  const marked = markedPrice(state, mp.price);
  if (mark > 1 || mp.value === undefined) return marked;
  return Math.min(mp.price, Math.max(marked, Math.round(mp.value * SALE_SHARE * 10) / 10));
}

/** T1: the market as you see it. The same array at Normal; otherwise the same men in
 *  the same order, every field kept, only the price marked (never the value, which a
 *  signing stores on the man and a sale reads back). */
export function marketForMe(state: CareerState, market: MarketPlayer[]): MarketPlayer[] {
  if (dialsOf(state).mark === 1) return market;
  return market.map(mp => ({ ...mp, price: markedPriceOf(state, mp) }));
}

/** P1: what the other side adds to its strength in your match. */
export function oppEdge(state: CareerState): number {
  return dialsOf(state).edge;
}

/** M1 and M2 on a job you have just taken (day one, a takeover, a move in mid season):
 *  the club's money times the cheque, its wage ceiling times the room. A created club's
 *  founders' room (founderWageRoom) is added back whole, so only the base ceiling moves
 *  by the dial and the first summer, which takes that room off, lands where it should.
 *  The opening is NOT cut: a new appointment's mandate is the same at every level. */
export function applyNewJobDials(state: CareerState): CareerState {
  const d = dialsOf(state);
  if (d.cheque === 1 && d.wageRoom === 1) return state;
  const next: CareerState = { ...state, budget: boardCheque(state, state.budget) };
  /* Only when the room dial moves: taking the founders' room off and putting it back is not the identity on
     every double, and a dial at its identity value must leave its number exactly as it was (correction 10). */
  if (state.wageCap !== undefined && d.wageRoom !== 1) {
    const room = state.founderWageRoom ?? 0;
    next.wageCap = wageRoomFor(state, state.wageCap - room) + room;
  }
  return next;
}

/** The board's whole card, rebuilt for this state. The engine's asks need the engine,
 *  so the caller hands the rebuild in (the hook passes clubManagerBoardAsks' builder). */
export type AskRebuild = (state: CareerState) => BoardObjective[];

/** The Dugout step's choice on a career startCareer (and startMidSeason) just made.
 *  Normal with No sacking off is the very object it was given. Otherwise the level is
 *  written on the block, the new job's dials are applied, and on day one (nothing played
 *  yet) the board's asks are rebuilt for the smaller cheque and the marked market. A
 *  takeover keeps the card the club set before you came. No sacking is Round 1342's. */
export function setUpCareer(state: CareerState, setup?: CareerSetup, rebuildAsks?: AskRebuild): CareerState {
  const level = setup?.level ?? 'normal';
  let s = state;
  if (level !== 'normal') {
    /* Round 1512: optionsAtLevel writes the key (and on Very Easy and Easy the leaderboard mark). */
    s = applyNewJobDials({ ...state, startOptions: optionsAtLevel(state, level) });
    if (rebuildAsks && s.week === 0 && !s.midSeasonStart) s = { ...s, boardObjectives: rebuildAsks(s) };
  }
  return applyCareerSetup(s, setup);
}
