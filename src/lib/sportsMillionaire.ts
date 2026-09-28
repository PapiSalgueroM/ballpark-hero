import {
  TriviaPool,
  TriviaQuestion,
  loadTriviaPool,
  isTriviaPoolPlayable,
  generateDailyLadder,
  generateRandomLadder,
  generateQuestion,
} from '@/lib/triviaQuestionBank';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

/**
 * Sports Millionaire: a climbing money ladder quiz built on
 * top of the shared triviaQuestionBank generator (MASTER_PLAN task #199,
 * "New games: game-show formats"). This module holds the display money
 * ladder, safe havens, lifeline mechanics, and pure game-state transitions.
 * The React page (SportsMillionaire.tsx) owns UI/animation state only.
 */

export const LADDER_SIZE = 15;

/** Display-only dollar ladder. Internally the game tracks the QUESTION INDEX
 *  (0-14) as the source of truth; this array is purely presentational, one
 *  entry per question, index-aligned with the questions array. */
export const MONEY_LADDER = [
  100, 200, 300, 500, 1_000,
  2_000, 4_000, 8_000, 16_000, 32_000,
  64_000, 125_000, 250_000, 500_000, 1_000_000,
];

/**
 * Round 646: the most a Sports Millionaire daily can record, the dollar amount
 * reached, so the top rung of MONEY_LADDER: 1,000,000 for all fifteen right.
 * game_score_caps holds it for sports-millionaire
 * (scripts/simCapsAreCeilings.mjs).
 */
export const SPORTS_MILLIONAIRE_CEILING = Math.max(...MONEY_LADDER);

/** Safe havens at Q5 and Q10 (1-indexed question numbers), i.e. array
 *  indices 4 and 9. A wrong answer drops the player back to the last safe
 *  haven cleared, or to $0 if none was reached. */
export const SAFE_HAVEN_INDICES = [4, 9];

export function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/** The guaranteed amount if the player walks away or misses at questionIndex (0-based, not yet answered). */
export function safeHavenAmount(lastAnsweredIndex: number): number {
  // lastAnsweredIndex = index of the last question answered CORRECTLY (-1 if none).
  let guaranteed = 0;
  for (const havenIdx of SAFE_HAVEN_INDICES) {
    if (lastAnsweredIndex >= havenIdx) {
      guaranteed = MONEY_LADDER[havenIdx];
    }
  }
  return guaranteed;
}

export type LifelineId = 'fifty-fifty' | 'ask-crowd' | 'swap-question';

export interface LifelineState {
  used: Record<LifelineId, boolean>;
}

export function freshLifelines(): LifelineState {
  return { used: { 'fifty-fifty': false, 'ask-crowd': false, 'swap-question': false } };
}

/**
 * 50:50: removes two of the three wrong options, keeping the correct one and
 * one random wrong one. Returns the set of option indices that remain visible.
 */
export function applyFiftyFifty(question: TriviaQuestion, rng: () => number = Math.random): Set<number> {
  const wrongIndices = question.options.map((_, i) => i).filter((i) => i !== question.correctIndex);
  // Shuffle wrong indices, keep just one
  for (let i = wrongIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
  }
  const keptWrong = wrongIndices[0];
  return new Set([question.correctIndex, keptWrong]);
}

/**
 * Ask the Crowd: generates a fake poll distribution biased toward the
 * correct answer. The bias strength scales with difficulty (harder
 * questions get a less confident, noisier crowd, mirroring a "harder
 * question = crowd less sure" feel) and is randomized run to run so it
 * never functions as a reliable answer-reveal.
 */
export function generateCrowdPoll(question: TriviaQuestion, rng: () => number = Math.random): number[] {
  const n = question.options.length;
  // Confidence: easy questions (difficulty 1) -> crowd very sure (~70% base).
  // Hard questions (difficulty 15) -> crowd much less sure (~35% base).
  const baseConfidence = 0.72 - (question.difficulty / 15) * 0.37;
  const noise = () => (rng() - 0.5) * 0.12; // +/- 6% jitter per option

  const weights = new Array(n).fill(0).map((_, i) => {
    if (i === question.correctIndex) return Math.max(0.15, baseConfidence + noise());
    return Math.max(0.03, (1 - baseConfidence) / (n - 1) + noise());
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const pcts = weights.map((w) => Math.round((w / total) * 100));

  // Rounding correction so percentages sum to exactly 100.
  const diff = 100 - pcts.reduce((a, b) => a + b, 0);
  pcts[question.correctIndex] += diff;
  return pcts;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type QuestionOutcome = 'correct' | 'wrong';

export interface QuestionAttemptRecord {
  questionIndex: number;
  question: TriviaQuestion;
  selectedIndex: number | null;
  outcome: QuestionOutcome | null;
  lifelinesUsedOnThis: LifelineId[];
}

export interface MillionaireGameState {
  mode: 'daily' | 'unlimited';
  ladder: TriviaQuestion[];
  currentIndex: number; // 0-14
  lifelines: LifelineState;
  visibleOptions: Set<number> | null; // active 50:50 result for current question, null = all visible
  crowdPoll: number[] | null; // active Ask the Crowd result for current question
  lockedInIndex: number | null; // option locked in, awaiting reveal
  status: 'playing' | 'won-question' | 'wrong' | 'walked-away' | 'completed-all';
  lastCorrectIndex: number; // -1 if none yet
  finalAmount: number | null; // set once the run ends (win/lose/walk)
}

export function initMillionaireState(mode: 'daily' | 'unlimited', ladder: TriviaQuestion[]): MillionaireGameState {
  return {
    mode,
    ladder,
    currentIndex: 0,
    lifelines: freshLifelines(),
    visibleOptions: null,
    crowdPoll: null,
    lockedInIndex: null,
    status: 'playing',
    lastCorrectIndex: -1,
    finalAmount: null,
  };
}

/** Amount currently "in the bank" conceptually (what walking away right now would pay). */
export function currentWalkAwayAmount(state: MillionaireGameState): number {
  if (state.lastCorrectIndex < 0) return 0;
  return MONEY_LADDER[state.lastCorrectIndex];
}

/** Amount a wrong answer at the current question drops the player to. */
export function dropAmountOnWrong(state: MillionaireGameState): number {
  return safeHavenAmount(state.lastCorrectIndex);
}

// ---------------------------------------------------------------------------
// Question pool loading (shared trivia bank)
// ---------------------------------------------------------------------------

export interface LoadResult {
  pool: TriviaPool | null;
  ladder: TriviaQuestion[];
}

/* Round 645 part three, second fix: the daily ladder is dealt for the day the
   page files it under (`day`, its pin), not whatever the clock says when the
   pool lands, so the ladder and the record always name the same day. */
export async function loadMillionairePool(mode: 'daily' | 'unlimited', day: string = getTodayET()): Promise<LoadResult> {
  const pool = await loadTriviaPool();
  if (!isTriviaPoolPlayable(pool)) {
    return { pool: null, ladder: [] };
  }
  const ladder = mode === 'daily'
    ? generateDailyLadder(pool, day, LADDER_SIZE)
    : generateRandomLadder(pool, LADDER_SIZE);
  return { pool, ladder };
}

export function buildFreshLadder(pool: TriviaPool, mode: 'daily' | 'unlimited', day: string = getTodayET()): TriviaQuestion[] {
  return mode === 'daily'
    ? generateDailyLadder(pool, day, LADDER_SIZE)
    : generateRandomLadder(pool, LADDER_SIZE);
}

// ---------------------------------------------------------------------------
// The daily record (Round 428)
// ---------------------------------------------------------------------------

/**
 * One finished daily a day, kept under `sports-millionaire-daily-${date}`
 * through src/lib/dailyRecord.ts. The page had nothing across a refresh, so
 * a finished ladder came back at question 1 with every answer already seen
 * in green, and each replay paid the dollar amount into the leaderboard
 * again. These four fields are everything the result screen, the share
 * text and the emoji grid are computed from; lifelines and poll state do
 * not touch the result and are not kept. The read fails closed on shape:
 * the indices are range checked against the ladder and the amount must be
 * a finite number, or a broken record would draw "Game over: $NaN" and a
 * grid sliced by a bad index.
 */
export interface MillionaireDailyRecord {
  currentIndex: number;
  lastCorrectIndex: number;
  finalAmount: number;
  walkedAway: boolean;
}

const DAILY_SLUG = 'sports-millionaire';

function validateDailyRecord(fields: Record<string, unknown>): MillionaireDailyRecord | null {
  const { currentIndex, lastCorrectIndex, finalAmount, walkedAway } = fields;
  if (!Number.isInteger(currentIndex) || (currentIndex as number) < 0 || (currentIndex as number) >= LADDER_SIZE) return null;
  if (!Number.isInteger(lastCorrectIndex) || (lastCorrectIndex as number) < -1 || (lastCorrectIndex as number) > (currentIndex as number)) return null;
  if (typeof finalAmount !== 'number' || !Number.isFinite(finalAmount) || finalAmount < 0) return null;
  if (typeof walkedAway !== 'boolean') return null;
  return {
    currentIndex: currentIndex as number,
    lastCorrectIndex: lastCorrectIndex as number,
    finalAmount,
    walkedAway,
  };
}

export function loadDailyRecord(dateStr: string): MillionaireDailyRecord | null {
  return readDailyRecord(DAILY_SLUG, dateStr, validateDailyRecord);
}

export function saveDailyRecord(dateStr: string, record: MillionaireDailyRecord): void {
  writeDailyRecord(DAILY_SLUG, dateStr, { ...record });
}

/**
 * Round 645 part three fix: the daily ladder part climbed, on the same key.
 * The page saved only once the run had ended, so a refresh on question six
 * dealt the same seeded ladder from question one with every answer already
 * seen and all three lifelines fresh. The climb is now filed the moment an
 * answer is locked in (before its reveal) and the moment a lifeline is used:
 * the question on screen, the lifelines spent, a swapped question, the 50:50
 * and crowd readings for the question on screen, and an outcome decided but
 * not yet shown. `at` is always one past the last right answer, so the money
 * is derived from it, never stored. It carries no `finalAmount`, so
 * loadDailyRecord refuses it, and this refuses anything carrying one, so the
 * two readers never accept the same record. A record whose outcome is set is
 * a run whose end was never shown: the page shows it on the way back, and
 * that is the finish recorded.
 */
export interface MillionaireProgress {
  /** The question on screen, 0 based; every one before it was answered right. */
  at: number;
  lifelines: LifelineState;
  /** Swap Question's replacement, and the question index it replaced. */
  swap: { at: number; question: TriviaQuestion } | null;
  /** The 50:50's two remaining options, for the question on screen. */
  visible: number[] | null;
  /** The crowd's poll, for the question on screen. */
  crowd: number[] | null;
  /** Decided at `at` and not yet shown: a wrong answer, or the million. */
  outcome: 'wrong' | 'million' | null;
}

function isQuestion(v: unknown): v is TriviaQuestion {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const q = v as Record<string, unknown>;
  return typeof q.question === 'string' && q.question.trim() !== ''
    && Array.isArray(q.options) && q.options.length >= 2 && q.options.every(o => typeof o === 'string')
    && Number.isInteger(q.correctIndex) && (q.correctIndex as number) >= 0 && (q.correctIndex as number) < q.options.length
    && typeof q.difficulty === 'number' && Number.isFinite(q.difficulty);
}

function validateProgress(fields: Record<string, unknown>, ladder: TriviaQuestion[]): MillionaireProgress | null {
  if (fields.finalAmount !== undefined) return null;
  const { at, lifelines, swap, visible, crowd, outcome } = fields;
  if (!Number.isInteger(at) || (at as number) < 0 || (at as number) >= Math.min(LADDER_SIZE, ladder.length)) return null;
  const now = at as number;
  if (outcome !== null && outcome !== 'wrong' && outcome !== 'million') return null;
  if (outcome === 'million' && now !== LADDER_SIZE - 1) return null;
  if (!lifelines || typeof lifelines !== 'object' || Array.isArray(lifelines)) return null;
  const used = (lifelines as { used?: unknown }).used as Record<string, unknown> | undefined;
  if (!used || typeof used !== 'object') return null;
  const ids: LifelineId[] = ['fifty-fifty', 'ask-crowd', 'swap-question'];
  if (!ids.every(id => typeof used[id] === 'boolean')) return null;
  const state: LifelineState = { used: { 'fifty-fifty': used['fifty-fifty'] as boolean, 'ask-crowd': used['ask-crowd'] as boolean, 'swap-question': used['swap-question'] as boolean } };
  let swapped: MillionaireProgress['swap'] = null;
  if (swap !== null) {
    const s = swap as Record<string, unknown>;
    if (!state.used['swap-question'] || !s || typeof s !== 'object' || !Number.isInteger(s.at) || (s.at as number) < 0 || (s.at as number) > now || !isQuestion(s.question)) return null;
    swapped = { at: s.at as number, question: s.question };
  } else if (state.used['swap-question']) return null;
  const onScreen = swapped && swapped.at === now ? swapped.question : ladder[now];
  let kept: number[] | null = null;
  if (visible !== null) {
    if (!state.used['fifty-fifty'] || !Array.isArray(visible) || visible.length !== 2 || new Set(visible).size !== 2) return null;
    if (!visible.every(i => Number.isInteger(i) && i >= 0 && i < onScreen.options.length) || !visible.includes(onScreen.correctIndex)) return null;
    kept = visible as number[];
  }
  let poll: number[] | null = null;
  if (crowd !== null) {
    if (!state.used['ask-crowd'] || !Array.isArray(crowd) || crowd.length !== onScreen.options.length) return null;
    if (!crowd.every(p => Number.isInteger(p) && p >= 0 && p <= 100) || crowd.reduce((a: number, b) => a + (b as number), 0) !== 100) return null;
    poll = crowd as number[];
  }
  return { at: now, lifelines: state, swap: swapped, visible: kept, crowd: poll, outcome: outcome as MillionaireProgress['outcome'] };
}

/** `ladder` is today's ladder as dealt, before any swap. */
export function loadDailyProgress(dateStr: string, ladder: TriviaQuestion[]): MillionaireProgress | null {
  return readDailyRecord(DAILY_SLUG, dateStr, fields => validateProgress(fields, ladder));
}

export function saveDailyProgress(dateStr: string, progress: MillionaireProgress): void {
  writeDailyRecord(DAILY_SLUG, dateStr, {
    at: progress.at,
    lifelines: progress.lifelines,
    swap: progress.swap,
    visible: progress.visible,
    crowd: progress.crowd,
    outcome: progress.outcome,
  });
}

/**
 * Swap Question lifeline: replaces the current question with a freshly
 * generated one at the SAME difficulty, drawn from the same pool. Uses
 * generateQuestion() directly (not generateRandomLadder, which always ramps
 * from difficulty 1) so a swap on a hard, late-ladder question stays hard
 * instead of quietly handing back an easy replacement. Retries a handful of
 * times to avoid handing back the exact same question text, then falls back
 * to the original question if generation fails (extremely unlikely given
 * pool size, but keeps the game from breaking).
 */
export function swapQuestion(pool: TriviaPool, current: TriviaQuestion): TriviaQuestion {
  const rng = () => Math.random();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateQuestion(pool, current.difficulty, rng);
    if (candidate && candidate.question !== current.question) return candidate;
  }
  return current;
}

// ---------------------------------------------------------------------------
// Emoji grid / share helpers
// ---------------------------------------------------------------------------

export function buildMillionaireEmojiGrid(state: MillionaireGameState): string {
  // Questions actually attempted: every question up through lastCorrectIndex
  // was answered correctly, PLUS the one at currentIndex if the run ended on
  // a wrong answer there (status 'wrong'). A walk-away or full clear never
  // attempted currentIndex, so it's excluded in those cases.
  const reached = state.status === 'wrong' ? state.currentIndex + 1 : Math.max(state.lastCorrectIndex + 1, 0);
  const pips = state.ladder.slice(0, reached).map((_, i) => {
    if (i <= state.lastCorrectIndex) return '🟩';
    return '🟥';
  });
  const header = state.status === 'walked-away'
    ? `Sports Millionaire: walked away with ${fmtMoney(state.finalAmount ?? 0)}`
    : state.finalAmount === MONEY_LADDER[MONEY_LADDER.length - 1]
      ? `Sports Millionaire: WON $1,000,000!`
      : `Sports Millionaire: ${fmtMoney(state.finalAmount ?? 0)}`;
  return [header, pips.join('') || '⬜'].join('\n');
}
