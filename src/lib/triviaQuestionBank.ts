import { supabase } from '@/integrations/supabase/client';
import { dateSeed } from '@/lib/dateUtils';
import { flagFor, fmtCompactUsd } from '@/lib/dealPlayers';

/**
 * Shared multiple-choice question GENERATOR for game-show format games
 * (Sports Millionaire first; Beat the Chaser and others to follow per
 * MASTER_PLAN task #199). Rather than hand-authoring a fixed question pool,
 * this builds questions on the fly from live Supabase tables so the pool is
 * effectively as large as the underlying data (player_market_values alone has
 * 170k+ rows). Every question type returns the same shape so any game-show
 * board can render/consume them identically.
 *
 * DATA SOURCES (verified live on flawuiqbvjobmkfkauhw via execute_sql before
 * writing this file, 2026-07-06):
 * - player_market_values: player_name, position, nationality, club,
 *   market_value_usd, year. 171,567 rows, years 2004-2026. No "league"
 *   column exists, so club-tier distractors are drawn from other clubs that
 *   appear in the same year slice (same football ecosystem) rather than a
 *   literal league match.
 * - player_market_values_dedup: same columns, VIEW that is DISTINCT ON
 *   (player_name, year) so each player appears once per year. Used here to
 *   avoid duplicate-row artifacts in "who is worth more" and position
 *   questions.
 * - ballon_dor: id, year, rank, player_name, nationality, club, points,
 *   award_type ('Men' / 'Women', 69 + 7 rows). 76 rows total.
 * - shirt_number_puzzles: id, player_name, club, league, nationality,
 *   kit_number, fun_fact. 154 rows.
 *
 * GAP CLOSED (2026-08-12, Round 52): ballon_dor previously had RLS enabled
 * with NO SELECT policy, so anon clients got [] and the Ballon d'Or question
 * type never generated. The public-read policy now exists (verified in
 * pg_policy: "Allow public read", FOR SELECT USING (true)), matching
 * player_market_values and shirt_number_puzzles, so all 6 question types are
 * live. The graceful degradation below (per-type fallback in
 * generateQuestion()) stays as a safety net.
 *
 * DIFFICULTY MODEL
 * difficulty is 1-15, matching Sports Millionaire's 15-question ladder.
 * Callers request a difficulty and this module maps it to a market-value
 * band: 1-5 draws from the very top of player_market_values (household
 * names), 6-10 draws from an upper-mid band, 11-15 draws from a deep-cut
 * band. Ballon d'Or and shirt-number questions use their own difficulty
 * heuristics documented per-function below.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: number; // 1-15
}

export type QuestionType =
  | 'which-club'
  | 'nationality'
  | 'ballon-dor'
  | 'which-position'
  | 'worth-more'
  | 'shirt-number';

// ---------------------------------------------------------------------------
// Internal row shapes + pool fetch
// ---------------------------------------------------------------------------

interface MarketRow {
  player_name: string;
  position: string | null;
  nationality: string | null;
  club: string | null;
  market_value_usd: number;
}

interface BallonRow {
  year: number;
  rank: number;
  player_name: string;
  nationality: string | null;
  club: string | null;
  award_type: string | null;
}

interface ShirtRow {
  player_name: string;
  club: string;
  league: string;
  nationality: string;
  kit_number: number;
}

const CURRENT_YEAR = 2026;

/** Simple seeded RNG (mulberry32) so daily mode can produce a deterministic sequence. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWithRng<T>(arr: T[], rng: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Fetches the working pool for the current year, paged past PostgREST's
 * 1000-row cap. Capped at a generous page count so a single game boot never
 * fires unbounded requests; the current-year slice is a few thousand rows.
 */
async function fetchMarketPool(): Promise<MarketRow[]> {
  const cols = 'player_name, position, nationality, club, market_value_usd';
  const pageSize = 1000;
  const rows: MarketRow[] = [];
  for (let page = 0; page < 10; page++) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select(cols)
      .eq('year', CURRENT_YEAR)
      .order('market_value_usd', { ascending: false })
      .range(from, to);
    if (error || !data || data.length === 0) break;
    rows.push(
      ...data
        .filter((r) => r.player_name && r.market_value_usd)
        .map((r) => ({
          player_name: r.player_name as string,
          position: r.position,
          nationality: r.nationality,
          club: r.club,
          market_value_usd: Number(r.market_value_usd),
        })),
    );
    if (data.length < pageSize) break;
  }
  return rows;
}

async function fetchBallonDor(): Promise<BallonRow[]> {
  const { data, error } = await supabase
    .from('ballon_dor')
    .select('year, rank, player_name, nationality, club, award_type')
    .order('year', { ascending: false });
  if (error || !data) return [];
  return data as BallonRow[];
}

async function fetchShirtNumbers(): Promise<ShirtRow[]> {
  const { data, error } = await supabase
    .from('shirt_number_puzzles')
    .select('player_name, club, league, nationality, kit_number');
  if (error || !data) return [];
  return data as ShirtRow[];
}

export interface TriviaPool {
  market: MarketRow[];
  ballonDor: BallonRow[];
  shirtNumbers: ShirtRow[];
}

/** Loads every source table once. Callers should fetch this at game boot and
 *  reuse it for every question generated in a session. */
export async function loadTriviaPool(): Promise<TriviaPool> {
  const [market, ballonDor, shirtNumbers] = await Promise.all([
    fetchMarketPool(),
    fetchBallonDor(),
    fetchShirtNumbers(),
  ]);
  return { market, ballonDor, shirtNumbers };
}

export function isTriviaPoolPlayable(pool: TriviaPool): boolean {
  return pool.market.length >= 200;
}

// ---------------------------------------------------------------------------
// Difficulty -> value band mapping (drives "which club" / "nationality" / etc.)
// ---------------------------------------------------------------------------

/**
 * Splits the market pool (already sorted desc by value from fetchMarketPool)
 * into three difficulty bands. Band 1 (difficulty 1-5) is the top slice of
 * famous names; band 3 (11-15) is deep cuts. Bands overlap slightly by using
 * fractional cut points on the sorted array rather than hardcoded ranks, so
 * this scales whether the pool has 2,000 or 6,000 rows for the year.
 */
function bandForDifficulty(sortedDesc: MarketRow[], difficulty: number): MarketRow[] {
  const n = sortedDesc.length;
  if (n === 0) return [];
  let start: number, end: number;
  if (difficulty <= 5) {
    start = 0;
    end = Math.max(30, Math.floor(n * 0.02)); // top ~2% or top 30, whichever is bigger
  } else if (difficulty <= 10) {
    start = Math.floor(n * 0.02);
    end = Math.floor(n * 0.2);
  } else {
    start = Math.floor(n * 0.2);
    end = n;
  }
  end = Math.max(end, start + 20);
  return sortedDesc.slice(start, Math.min(end, n));
}

// ---------------------------------------------------------------------------
// Question type 1: "Which club does X play for?"
// ---------------------------------------------------------------------------

export function buildClubQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  const band = bandForDifficulty(pool, difficulty);
  const withClub = band.filter((p) => p.club);
  const correct = pickWithRng(withClub, rng);
  if (!correct) return null;

  // Distractor clubs: other clubs present in the full pool for this year,
  // excluding the correct player's own club.
  const otherClubs = Array.from(
    new Set(pool.map((p) => p.club).filter((c): c is string => !!c && c !== correct.club)),
  );
  const distractors = shuffleWithRng(otherClubs, rng).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correct.club as string, ...distractors], rng);
  return {
    question: `Which club does ${correct.player_name} play for?`,
    options,
    correctIndex: options.indexOf(correct.club as string),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Question type 2: "What nationality is X?"
// ---------------------------------------------------------------------------

export function buildNationalityQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  const band = bandForDifficulty(pool, difficulty);
  const withNat = band.filter((p) => p.nationality);
  const correct = pickWithRng(withNat, rng);
  if (!correct) return null;

  const otherNats = Array.from(
    new Set(pool.map((p) => p.nationality).filter((n): n is string => !!n && n !== correct.nationality)),
  );
  const distractors = shuffleWithRng(otherNats, rng).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correct.nationality as string, ...distractors], rng);
  return {
    question: `What nationality is ${correct.player_name}?`,
    options,
    correctIndex: options.indexOf(correct.nationality as string),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Question type 3: "Who won the Ballon d'Or in YEAR?"
// ---------------------------------------------------------------------------

/**
 * Difficulty ramp: recent, widely-remembered years are easy; older or
 * less-discussed years are hard. Verified live: the table carries BOTH the
 * Men's award (69 rows) and Women's award (7 rows) tagged via award_type,
 * each with its own rank=1 winner for the same year (e.g. 2025 has both
 * Ousmane Dembele and Aitana Bonmati at rank 1). Filtering to
 * award_type = 'Men' keeps "Who won the Ballon d'Or in YEAR" unambiguous,
 * matching the classic single-winner framing; the men's award also has
 * enough years (69) to support a real difficulty ramp, unlike the women's
 * award's 7 rows.
 */
export function buildBallonDorQuestion(
  rows: BallonRow[],
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  const winners = rows.filter((r) => r.rank === 1 && r.award_type === 'Men');
  if (winners.length < 4) return null;

  const sortedByRecency = [...winners].sort((a, b) => b.year - a.year);
  const n = sortedByRecency.length;
  let band: BallonRow[];
  if (difficulty <= 5) {
    band = sortedByRecency.slice(0, Math.max(8, Math.floor(n * 0.25)));
  } else if (difficulty <= 10) {
    band = sortedByRecency.slice(Math.floor(n * 0.25), Math.floor(n * 0.65));
  } else {
    band = sortedByRecency.slice(Math.floor(n * 0.65), n);
  }
  if (band.length === 0) band = sortedByRecency;

  const correct = pickWithRng(band, rng);
  if (!correct) return null;

  // Distractors: winners from nearby years (within +/- 6 years), falling
  // back to any other winner if the neighborhood is too thin.
  let nearby = winners.filter(
    (w) => w.player_name !== correct.player_name && Math.abs(w.year - correct.year) <= 6,
  );
  if (nearby.length < 3) {
    nearby = winners.filter((w) => w.player_name !== correct.player_name);
  }
  const distractorNames = Array.from(new Set(shuffleWithRng(nearby, rng).map((w) => w.player_name))).slice(0, 3);
  if (distractorNames.length < 3) return null;

  const options = shuffleWithRng([correct.player_name, ...distractorNames], rng);
  return {
    question: `Who won the Ballon d'Or in ${correct.year}?`,
    options,
    correctIndex: options.indexOf(correct.player_name),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Question type 4: "Which of these players plays POSITION?"
// ---------------------------------------------------------------------------

export function buildPositionQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  const band = bandForDifficulty(pool, difficulty);
  const withPos = band.filter((p) => p.position);
  const correct = pickWithRng(withPos, rng);
  if (!correct) return null;

  const others = band.filter((p) => p.position && p.position !== correct.position && p.player_name !== correct.player_name);
  const distractors = shuffleWithRng(others, rng)
    .filter((p, i, arr) => arr.findIndex((x) => x.player_name === p.player_name) === i)
    .slice(0, 3);
  if (distractors.length < 3) return null;

  const optionPlayers = shuffleWithRng([correct, ...distractors], rng);
  const options = optionPlayers.map((p) => p.player_name);
  return {
    question: `Which of these players plays ${correct.position}?`,
    options,
    correctIndex: optionPlayers.findIndex((p) => p.player_name === correct.player_name),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Question type 5: "Who is worth more?" (4-player, pick the most valuable)
// ---------------------------------------------------------------------------

export function buildWorthMoreQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  const band = bandForDifficulty(pool, difficulty);
  const unique = band.filter((p, i, arr) => arr.findIndex((x) => x.player_name === p.player_name) === i);
  if (unique.length < 4) return null;

  const four = shuffleWithRng(unique, rng).slice(0, 4);
  const sorted = [...four].sort((a, b) => b.market_value_usd - a.market_value_usd);
  const mostValuable = sorted[0];

  const options = shuffleWithRng(four.map((p) => p.player_name), rng);
  return {
    question: 'Who is worth more right now (highest market value)?',
    options,
    correctIndex: options.indexOf(mostValuable.player_name),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Question type 6: "What shirt number does X wear?"
// ---------------------------------------------------------------------------

export function buildShirtNumberQuestion(
  rows: ShirtRow[],
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  if (rows.length < 4) return null;
  const correct = pickWithRng(rows, rng);
  if (!correct) return null;

  // Distractor numbers: other real kit numbers from the pool, deduped,
  // biased toward numbers reasonably close in range so options aren't
  // trivially guessable by magnitude alone.
  const otherNumbers = Array.from(
    new Set(rows.map((r) => r.kit_number).filter((n) => n !== correct.kit_number)),
  );
  const close = otherNumbers.filter((n) => Math.abs(n - correct.kit_number) <= 15);
  const pickFrom = close.length >= 3 ? close : otherNumbers;
  const distractors = shuffleWithRng(pickFrom, rng).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correct.kit_number, ...distractors], rng).map(String);
  return {
    question: `What shirt number does ${correct.player_name} wear?`,
    options,
    correctIndex: options.indexOf(String(correct.kit_number)),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Master generator: picks a question type + builds it, retrying on failure
// ---------------------------------------------------------------------------

const ALL_TYPES: QuestionType[] = [
  'which-club',
  'nationality',
  'ballon-dor',
  'which-position',
  'worth-more',
  'shirt-number',
];

function buildOfType(
  type: QuestionType,
  pool: TriviaPool,
  difficulty: number,
  rng: () => number,
): TriviaQuestion | null {
  const sortedMarket = pool.market; // already sorted desc by fetchMarketPool
  switch (type) {
    case 'which-club':
      return buildClubQuestion(sortedMarket, difficulty, rng);
    case 'nationality':
      return buildNationalityQuestion(sortedMarket, difficulty, rng);
    case 'ballon-dor':
      return buildBallonDorQuestion(pool.ballonDor, difficulty, rng);
    case 'which-position':
      return buildPositionQuestion(sortedMarket, difficulty, rng);
    case 'worth-more':
      return buildWorthMoreQuestion(sortedMarket, difficulty, rng);
    case 'shirt-number':
      return buildShirtNumberQuestion(pool.shirtNumbers, difficulty, rng);
    default:
      return null;
  }
}

/**
 * Generates a single question at the requested difficulty. Tries a
 * shuffled order of question types (seeded by rng, so daily mode is
 * reproducible) and falls back through them until one succeeds, since not
 * every type is guaranteed to have enough data at every difficulty band
 * (e.g. Ballon d'Or only has 76 rows total).
 */
export function generateQuestion(
  pool: TriviaPool,
  difficulty: number,
  rng: () => number,
  excludeTypes: QuestionType[] = [],
): TriviaQuestion | null {
  const candidates = shuffleWithRng(
    ALL_TYPES.filter((t) => !excludeTypes.includes(t)),
    rng,
  );
  for (const type of candidates.length > 0 ? candidates : ALL_TYPES) {
    const q = buildOfType(type, pool, difficulty, rng);
    if (q) return q;
  }
  return null;
}

/**
 * Builds a full ladder of `count` questions with no duplicate question text,
 * ramping difficulty 1..count. Used directly by Sports Millionaire (15
 * questions) and reusable by any future ladder-style game-show game.
 */
export function generateQuestionLadder(
  pool: TriviaPool,
  count: number,
  rng: () => number,
): TriviaQuestion[] {
  const ladder: TriviaQuestion[] = [];
  const seenQuestions = new Set<string>();
  for (let i = 1; i <= count; i++) {
    let attempts = 0;
    let q: TriviaQuestion | null = null;
    while (attempts < 8) {
      q = generateQuestion(pool, i, rng);
      attempts++;
      if (q && !seenQuestions.has(q.question)) break;
      q = null;
    }
    if (q) {
      seenQuestions.add(q.question);
      ladder.push(q);
    }
  }
  return ladder;
}

// ---------------------------------------------------------------------------
// Seeded daily variant + unlimited random variant
// ---------------------------------------------------------------------------

/** Deterministic ladder for the given ET date string, shared by every player. */
export function generateDailyLadder(pool: TriviaPool, dateStr: string, count: number): TriviaQuestion[] {
  const rng = mulberry32(dateSeed(dateStr));
  return generateQuestionLadder(pool, count, rng);
}

/** Fresh random ladder for unlimited play. */
export function generateRandomLadder(pool: TriviaPool, count: number): TriviaQuestion[] {
  const seed = Math.floor(Math.random() * 2 ** 31);
  const rng = mulberry32(seed);
  return generateQuestionLadder(pool, count, rng);
}

// Re-exported so game-show pages can format player values without importing
// dealPlayers.ts directly (keeps the game-show family's public surface in one place).
export { flagFor, fmtCompactUsd };
