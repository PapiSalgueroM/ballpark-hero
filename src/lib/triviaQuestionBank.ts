import { supabase } from '@/integrations/supabase/client';
import { dateSeed } from '@/lib/dateUtils';
import { flagFor, fmtCompactUsd } from '@/lib/dealPlayers';
import { clearlyAhead } from '@/lib/clearWinner';
import namesakeList from '@/data/marketNamesakes.json';

/**
 * Shared multiple-choice question GENERATOR for game-show format games
 * (Sports Millionaire first, with more ladder and buzzer formats to follow per
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

/** the year of the market values the questions read; exported so simTriviaBank reads its templates off it */
export const CURRENT_YEAR = 2026;

// ---------------------------------------------------------------------------
// Round 1552: one right answer a question
// ---------------------------------------------------------------------------

/**
 * Three ways a question here could have two right answers, or none:
 *
 * 1. TIES. "Who is worth the most" drew four players and marked the first of
 *    a sort right, with no check that the top two differ. Market values sit on
 *    round numbers (the top band of 2026 has 109 players on 17 values), so two
 *    of the four sharing the top value was routine, and one wrong answer ends
 *    the climb. It now asks only when the top value beats the second by Face
 *    Off's MIN_RATIO (src/lib/clearWinner.ts).
 * 2. THE TENSE. "Which club does X play for?" and "right now" read a dated
 *    snapshot (the 2026 rows), so every window since it was taken turns some of
 *    them false. Round 661 fixed the same thing for shirt numbers. The club,
 *    position and value questions now name the data they come from instead of
 *    today ("plays" was the last present tense one, moved after review).
 * 3. NAMESAKES. The pool keeps one row per name, so when two footballers share
 *    a display name the row is one of them and the question cannot say which.
 *    src/data/marketNamesakes.json lists those names (scripts/genMarketNamesakes.mjs
 *    derives it from the saved raw rows) and they are left out of every
 *    question built from the market pool, as the subject and as an option.
 *
 * The daily ladder is seeded by its date and is the same fifteen questions for
 * everybody, so it switches on a day boundary: dates before ONE_ANSWER_FROM
 * keep the rules they were dealt under (LEGACY), so a release in the middle of
 * a day does not re-deal that day. Unlimited and Swap Question use the new
 * rules at once. Once ONE_ANSWER_FROM is in the past on the live site, LEGACY
 * and the date check can go.
 */
export const ONE_ANSWER_FROM = '2026-10-25';

export interface DealRules {
  /** false only for daily dates before ONE_ANSWER_FROM */
  oneAnswer: boolean;
}

const ONE_ANSWER: DealRules = { oneAnswer: true };
const LEGACY: DealRules = { oneAnswer: false };

/** Derived from the 2026 slice: when CURRENT_YEAR moves, rerun scripts/genMarketNamesakes.mjs over the new one. */
export const MARKET_NAMESAKES: ReadonlySet<string> = new Set(namesakeList.names);

/** The rules a daily ladder for this ET date is dealt under. */
export function rulesForDate(dateStr: string): DealRules {
  return dateStr < ONE_ANSWER_FROM ? LEGACY : ONE_ANSWER;
}

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
      /* ROUND 366: market_value_usd is nowhere near a total order. The largest
         single tie block in the current slice is 1,161 rows, LARGER than the
         1,000 row page, so that block is guaranteed to straddle a .range()
         boundary rather than merely able to. bandForDifficulty slices this
         array by fractional index, so band membership is decided by array
         position. */
      .order('player_name', { ascending: true })
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
    .order('year', { ascending: false })
    /* Completeness rather than a real risk: at most two rows share a year, so
       the remap is a pair swap inside one year. It costs nothing. */
    .order('rank', { ascending: true })
    .order('player_name', { ascending: true });
  if (error || !data) return [];
  return data as BallonRow[];
}

async function fetchShirtNumbers(): Promise<ShirtRow[]> {
  const { data, error } = await supabase
    .from('shirt_number_puzzles')
    .select('player_name, club, league, nationality, kit_number')
    /* ROUND 366: this had no order at all, and pickWithRng indexes these rows
       directly, so one UPDATE changed the whole fifteen question ladder for a
       date while the leaderboard treated it as one puzzle. 154 rows, 154
       distinct names. */
    .order('player_name', { ascending: true });
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

/** Round 1552: the band with every namesake taken out, under the one answer rules. */
function askableBand(sortedDesc: MarketRow[], difficulty: number, rules: DealRules): MarketRow[] {
  const band = bandForDifficulty(sortedDesc, difficulty);
  return rules.oneAnswer ? band.filter((p) => !MARKET_NAMESAKES.has(p.player_name)) : band;
}

/** Round 1552: what the club column holds when a man had no club. None of these is a
 *  club, so none is asked as an answer or offered as a wrong one (a man released since
 *  the snapshot would make "Without Club" a second right answer). */
const NOT_A_CLUB = new Set(['Without Club', 'Retired', 'Career break', 'Unknown']);

/** Round 1552 review: a reserve or youth side and its first team (Real Madrid Castilla and Real
 *  Madrid, Chelsea FC U21 and Chelsea FC, Atalanta U23 and Atalanta BC) read as one club to a
 *  player, so under the one answer rules the one is never offered as a wrong answer beside the
 *  other. The key drops a reserve mark and a leading or trailing FC style word. Two clubs it
 *  wrongly joins only lose a distractor, which another club replaces. */
const RESERVE_MARK = /\s+(?:U\d{2}|B|II|Reserves|Youth|Juniors|Primavera|Castilla)$/i;
const CLUB_WORD = /^(?:FC|CF|SC|AC|BC|CD|Club)\s+|\s+(?:FC|CF|SC|AC|BC|CD)$/gi;
export function clubFamily(club: string): string {
  return club.trim().replace(RESERVE_MARK, '').replace(CLUB_WORD, '').trim().toLowerCase();
}

/** The first row of each name, in order. Round 1552 swapped a findIndex per row for a
 *  Set (the same rows in the same order): over the deep band of about 4,400 rows the old
 *  filter made some ten million name comparisons per question on a phone. */
function firstOfEachName(rows: MarketRow[]): MarketRow[] {
  const seen = new Set<string>();
  return rows.filter((p) => {
    if (seen.has(p.player_name)) return false;
    seen.add(p.player_name);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Question type 1: "Which club was X at in the CURRENT_YEAR market values?"
// ---------------------------------------------------------------------------

export function buildClubQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
  rules: DealRules = ONE_ANSWER,
): TriviaQuestion | null {
  const isClub = (c: string | null): c is string => !!c && !(rules.oneAnswer && NOT_A_CLUB.has(c));
  const band = askableBand(pool, difficulty, rules);
  const withClub = band.filter((p) => isClub(p.club));
  const correct = pickWithRng(withClub, rng);
  if (!correct) return null;

  // Distractor clubs: other clubs present in the full pool for this year,
  // excluding the correct player's own club.
  const otherClubs = Array.from(
    new Set(pool.map((p) => p.club).filter((c): c is string => isClub(c) && c !== correct.club)),
  );
  const family = rules.oneAnswer ? clubFamily(correct.club as string) : null;
  const wrongClubs = family === null ? otherClubs : otherClubs.filter((c) => clubFamily(c) !== family);
  const distractors = shuffleWithRng(wrongClubs, rng).slice(0, 3);
  if (distractors.length < 3) return null;

  const options = shuffleWithRng([correct.club as string, ...distractors], rng);
  return {
    question: rules.oneAnswer
      ? `Which club was ${correct.player_name} at in the ${CURRENT_YEAR} market values?`
      : `Which club does ${correct.player_name} play for?`,
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
  rules: DealRules = ONE_ANSWER,
): TriviaQuestion | null {
  const band = askableBand(pool, difficulty, rules);
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
// Question type 4: "Who was listed at POSITION in the CURRENT_YEAR market values?"
// ---------------------------------------------------------------------------

export function buildPositionQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
  rules: DealRules = ONE_ANSWER,
): TriviaQuestion | null {
  const band = askableBand(pool, difficulty, rules);
  const withPos = band.filter((p) => p.position);
  const correct = pickWithRng(withPos, rng);
  if (!correct) return null;

  const others = band.filter((p) => p.position && p.position !== correct.position && p.player_name !== correct.player_name);
  const distractors = firstOfEachName(shuffleWithRng(others, rng)).slice(0, 3);
  if (distractors.length < 3) return null;

  const optionPlayers = shuffleWithRng([correct, ...distractors], rng);
  const options = optionPlayers.map((p) => p.player_name);
  return {
    question: rules.oneAnswer
      ? `Who was listed at ${correct.position} in the ${CURRENT_YEAR} market values?`
      : `Which of these players plays ${correct.position}?`,
    options,
    correctIndex: optionPlayers.findIndex((p) => p.player_name === correct.player_name),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// Question type 5: "Who was worth the most?" (4-player, pick the most valuable)
// ---------------------------------------------------------------------------

/** Round 1552: how many fours a worth the most question draws before it gives up on a
 *  clear top value. The harness measures how often the last draw is reached per band. */
export const WORTH_MORE_DRAWS = 12;

export function buildWorthMoreQuestion(
  pool: MarketRow[],
  difficulty: number,
  rng: () => number,
  rules: DealRules = ONE_ANSWER,
): TriviaQuestion | null {
  const band = askableBand(pool, difficulty, rules);
  const unique = firstOfEachName(band);
  if (unique.length < 4) return null;

  for (let draw = 0; draw < (rules.oneAnswer ? WORTH_MORE_DRAWS : 1); draw++) {
    const four = shuffleWithRng(unique, rng).slice(0, 4);
    const sorted = [...four].sort((a, b) => b.market_value_usd - a.market_value_usd);
    const mostValuable = sorted[0];
    // Round 1552: the top value must beat the second clearly, or two answers are right.
    if (rules.oneAnswer && !clearlyAhead(sorted[0].market_value_usd, sorted[1].market_value_usd)) continue;

    const options = shuffleWithRng(four.map((p) => p.player_name), rng);
    return {
      question: rules.oneAnswer
        ? `Who was worth the most in the ${CURRENT_YEAR} market values?`
        : 'Who is worth more right now (highest market value)?',
      options,
      correctIndex: options.indexOf(mostValuable.player_name),
      difficulty,
    };
  }
  return null;
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
  // Round 661: this used to ask what the player "wears", in the present tense,
  // over a table that is a snapshot and holds retired men as well as current
  // ones. Every transfer window turned a batch of these into false questions,
  // and a number Bobby Moore wore has never been a claim about today. Naming
  // the club and asking what he HAS WORN there is the same question and it
  // stays true after he leaves.
  return {
    question: `What shirt number has ${correct.player_name} worn at ${correct.club}?`,
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
  rules: DealRules,
): TriviaQuestion | null {
  const sortedMarket = pool.market; // already sorted desc by fetchMarketPool
  switch (type) {
    case 'which-club':
      return buildClubQuestion(sortedMarket, difficulty, rng, rules);
    case 'nationality':
      return buildNationalityQuestion(sortedMarket, difficulty, rng, rules);
    case 'ballon-dor':
      return buildBallonDorQuestion(pool.ballonDor, difficulty, rng);
    case 'which-position':
      return buildPositionQuestion(sortedMarket, difficulty, rng, rules);
    case 'worth-more':
      return buildWorthMoreQuestion(sortedMarket, difficulty, rng, rules);
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
  rules: DealRules = ONE_ANSWER,
): TriviaQuestion | null {
  const candidates = shuffleWithRng(
    ALL_TYPES.filter((t) => !excludeTypes.includes(t)),
    rng,
  );
  for (const type of candidates.length > 0 ? candidates : ALL_TYPES) {
    const q = buildOfType(type, pool, difficulty, rng, rules);
    if (q) return q;
  }
  return null;
}

/**
 * Round 1573: how many draws one step of a ladder makes before it gives up.
 * A step throws back a question whose text the ladder already holds, and
 * three of the six types have few texts: every worth the most question reads
 * the same, a position question names one of about a dozen labels, and a
 * Ballon d'Or question one of 17 to 27 years in its band. With eight draws
 * 9 of 240,000 Unlimited ladders dealt over simTriviaBank's 2026 fixture (the
 * saved 2026 market rows, with a position filled in by a hash of the name
 * where the saved pull has none) lost a step and came back 14 long, which on
 * the page is the error screen (3 of 1,000 on that fixture when the Ballon
 * d'Or and shirt number reads fail, since those two types then build
 * nothing). The loop stops at the first fresh question, so a step that finds
 * one within eight draws makes exactly the draws it always made: every ladder
 * that was whole, the daily's included, is dealt exactly as before, and only
 * a step that would have been dropped draws on. It stays bounded so a pool that truly cannot
 * fill a ladder still ends in the page's error card, never a frozen tab.
 * scripts/simTriviaBank.mjs section 9 holds both.
 */
export const LADDER_ATTEMPTS = 64;

/**
 * Builds a full ladder of `count` questions with no duplicate question text,
 * ramping difficulty 1..count. Used directly by Sports Millionaire (15
 * questions) and reusable by any future ladder-style game-show game.
 */
export function generateQuestionLadder(
  pool: TriviaPool,
  count: number,
  rng: () => number,
  rules: DealRules = ONE_ANSWER,
): TriviaQuestion[] {
  const ladder: TriviaQuestion[] = [];
  const seenQuestions = new Set<string>();
  for (let i = 1; i <= count; i++) {
    let attempts = 0;
    let q: TriviaQuestion | null = null;
    while (attempts < LADDER_ATTEMPTS) {
      q = generateQuestion(pool, i, rng, [], rules);
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
  return generateQuestionLadder(pool, count, rng, rulesForDate(dateStr));
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
