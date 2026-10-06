// Career Ladder: guess the mystery footballer from their career, one stint at a time.
// Data lives in Supabase: career_players (identity) + career_seasons (the ladder rows).
import { foldSpecialLatin } from '@/lib/nameFold';
import { supabase } from '@/integrations/supabase/client';
import { dailyPrngSeed, dateSeed, dayNumber } from '@/lib/dateUtils';
import { storedSpelling, type PlayerEntity } from '@/lib/playerSearch';

export interface CareerStint {
  season: string;
  club: string;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  marketValue: number | null;
  sortOrder: number;
}

export interface CareerPlayer {
  id: string;
  name: string;
  nationality: string;
  position: string;
  seasons: CareerStint[];
}

export const MAX_GUESSES = 6;
export const MIN_STINTS = 4;
export const BASE_SCORE = 1000;
export const REVEAL_PENALTY = 150;
export const WRONG_GUESS_PENALTY = 100;
export const SCORE_FLOOR = 100;

/**
 * Daily-mode action log, persisted to localStorage via useDailyPuzzle.
 * Mirrors the CareerAction pattern in useCareerGame.ts (the sibling
 * "Career Path" game): a flat list of actions replayed to derive state,
 * rather than persisting revealed/wrongGuesses/score directly. There is no
 * explicit 'lost' action. CareerLadder.tsx derives the loss phase by
 * counting 'wrong' actions against MAX_GUESSES, the same way useCareerGame.ts
 * derives its own loss condition from a wrong-action count.
 */
export type LadderAction =
  | { t: 'reveal' }
  | { t: 'wrong'; name: string }
  | { t: 'won'; score: number }
  | { t: 'give' };

/**
 * Round 718: the first ET day the rotation deals. Every day before it keeps
 * the pick it always had (legacyDailyPick), so nobody's finished ladder turns
 * into another man on reload. Set after the day this shipped; if the release
 * slips past it, move it later, never earlier, and the roster's since dates
 * with it. scripts/simCareerLadderRotation.mjs holds the days before it to the
 * old pick, refuses a start before 2026-10-15, and goes red when the date
 * arrives while origin/main does not carry it (a save the old code wrote that
 * morning has no puzzle id, so the hook could not tell it was made against
 * another man). Since the Round 718 fix the daily save also carries the
 * answer's id (useDailyPuzzle), so a day whose answer changed under a
 * player starts fresh instead of crediting his finished log to another man;
 * the date is the fence for the days already played, the id is the fence
 * for everything else.
 */
export const ROTATION_START = '2026-10-15';

/**
 * Round 718 fix: the line between the daily's two sides, peak market value in
 * whole millions: at or under it is the harder side, above it the easier one.
 * A fixed line rather than legendPool's median, because the median moves with
 * the count. It decides a man's side once, when scripts/genCareerLadderRoster.mjs
 * first writes him into the roster; the walk reads the side from the roster
 * and never from his seasons (see rotationPick). On the 2026-10-01 tables it
 * puts 125 of 244 eligible men on the harder side. Legend mode in Unlimited
 * keeps legendPool; this is the daily's split only.
 */
export const ROTATION_SPLIT_VALUE = 50;

/**
 * One line of the daily rotation's roster, src/data/careerLadderRoster.json:
 * [career_players id, side, since, name]. Side is 'h' (the harder side), 'e'
 * (the easier side) or 'x' (out). A line counts for every cycle of the walk
 * that starts on or after `since` (an ET date), until a later line for the
 * same man. A man keeps the side of his first line for good; a later 'h' or
 * 'e' only brings him back in. The name is for people reading the file.
 */
export type RosterEntry = ReadonlyArray<string>;

/**
 * Today's Career Ladder player: same result for every user on the same ET
 * date. Days before ROTATION_START use the old pick (eligibility: at least
 * MIN_STINTS seasons, as startRound() in CareerLadder.tsx), every day from it
 * on uses the rotation over `roster` (rotationPick). The page passes the
 * committed roster.
 */
export function pickDailyPlayer(pool: CareerPlayer[], dateStr: string, roster: ReadonlyArray<RosterEntry>): CareerPlayer | null {
  if (dayNumber(dateStr) < dayNumber(ROTATION_START)) return legacyDailyPick(pool, dateStr);
  return rotationPick(pool, dateStr, roster);
}

/**
 * Round 718: the daily as a rotation, so nobody sees the same ladder again
 * for months (spec section 110, "do not allow puzzle repetition too quickly").
 *
 * The old pick below was the date as a number modulo the pool, and it
 * repeated fast: two lists sorted the same way (the harder half and the whole
 * pool) took turns, so one man could come up in both inside a few weeks, and
 * the date number jumps at every month end, which lands the walk back on
 * ground it covered weeks ago.
 *
 * The owner's July lean stays exactly as the guide describes it: two days in
 * three come from the harder side, the third day from the other side. Each
 * side is walked in one fixed order, every man once, before anyone comes
 * back. So a harder side man returns only after the whole harder side has
 * been dealt (about a day and a half per man in it) and the other side only
 * after all of that side (three days per man). With the 2026-10-01 roster
 * (244 men, 125 and 119 a side) that is 187 days and 357 days.
 *
 * WHO IS IN THE WALK COMES FROM THE ROSTER, NEVER FROM THE LIVE TABLES. The
 * walk is a pure function of the date, so it recomputes every past cycle each
 * time it is asked, and a man who turns up in a past cycle he was not dealt
 * in pushes today's position back onto men dealt days ago. The first version
 * walked the live side, so a newcomer moved everybody (repeat gap: one day).
 * The second froze each cycle on career_players.created_at, which a season
 * row added to or removed from a man already in the table still got round:
 * a 4th season making him eligible, a peak crossing the line, a quarantined
 * row (the Round 718 review measured repeat gaps of one to three days). The
 * tables keep no history, so the history lives in the roster: append only,
 * written by scripts/genCareerLadderRoster.mjs with a since date after the
 * release, so a change only ever reaches cycles that have not started yet.
 *
 * The live pool only decides whether today's man can be dealt. A man the
 * roster has in but the pool has not (gone from the table, or under
 * MIN_STINTS seasons now) stays in the walk, because dropping him would move
 * everybody forward and his return would move them back. His day goes to a
 * stand in, the man half a cycle round the easier side's walk (the point
 * furthest from both of his own days, about 180 days either way), and nobody
 * else moves. A man the pool has but the roster has not is never dealt until
 * the generator writes him in. simCareerLadderRotation section 7 goes red
 * while the roster and the live tables disagree, so neither state lasts.
 */
function rotationPick(pool: CareerPlayer[], dateStr: string, roster: ReadonlyArray<RosterEntry>): CareerPlayer | null {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  if (eligible.length === 0) return null;
  const available = new Map(eligible.map(p => [p.id, p]));
  const k = dayNumber(dateStr) - dayNumber(ROTATION_START);
  const { harder, easier } = rosterSides(roster);
  let today: Walk, pos: number, spare: Walk, sparePos: number;
  if (harder.length === 0 || easier.length === 0) {
    // A roster all on one side is one list, walked a day at a time.
    today = spare = { men: harder.length > 0 ? harder : easier, dayOf: p => p };
    pos = sparePos = k;
  } else {
    // Day 0 and 1 of every three are the harder side's, day 2 the other side's.
    spare = { men: easier, dayOf: p => 3 * p + 2 };
    sparePos = Math.floor(k / 3);
    if (k % 3 === 2) {
      today = spare;
      pos = sparePos;
    } else {
      today = { men: harder, dayOf: p => 3 * Math.floor(p / 2) + (p % 2) };
      pos = k - Math.floor(k / 3);
    }
  }
  if (today.men.length > 0) {
    const { order, offset } = walkCycle(today, pos);
    const man = available.get(order[offset]);
    if (man) return man;
    const stand = walkCycle(spare, sparePos);
    const n = stand.order.length;
    for (let j = Math.floor(n / 2); j < Math.floor(n / 2) + n; j++) {
      const sub = available.get(stand.order[(stand.offset + j) % n]);
      if (sub) return sub;
    }
  }
  // The roster names nobody the pool holds (an empty roster, or a pool that
  // is not the live table): one list in the same order, so the day still has
  // a man. The live table never gets here while section 7 is green.
  const ids = rotationOrder(eligible.map(p => p.id));
  return available.get(ids[k % ids.length]) ?? null;
}

interface RosterMan { id: string; spans: Array<{ day: number; isIn: boolean }> }
interface Walk { men: RosterMan[]; dayOf: (pos: number) => number }

/**
 * The cycle of a walk that holds position `pos`: its men in deal order, and
 * pos's place among them. `dayOf` turns a position into the day offset from
 * ROTATION_START it is dealt on. Cycle after cycle from the start, a cycle's
 * men are the walk's men the roster has in on the cycle's first day, and the
 * cycle is as long as that. Nothing here reads the live pool or how many men
 * the side has today, so a roster line dated after a cycle began changes
 * nothing before the next cycle. A walk with nobody in on a cycle's first day
 * (only possible while every line is dated later) deals everyone it names,
 * so the loop always moves on.
 */
function walkCycle(walk: Walk, pos: number): { order: string[]; offset: number } {
  const startDay = dayNumber(ROTATION_START);
  let cycleStart = 0;
  for (;;) {
    const cycleDay = startDay + walk.dayOf(cycleStart);
    let men = walk.men.filter(m => inOn(m, cycleDay));
    if (men.length === 0) men = walk.men;
    if (pos < cycleStart + men.length) return { order: rotationOrder(men.map(m => m.id)), offset: pos - cycleStart };
    cycleStart += men.length;
  }
}

/** Whether the roster has a man in on `day`: his last line dated on or before it says so. */
function inOn(m: RosterMan, day: number): boolean {
  let isIn = false;
  for (const s of m.spans) {
    if (s.day > day) break;
    isIn = s.isIn;
  }
  return isIn;
}

type RosterSides = { harder: RosterMan[]; easier: RosterMan[] };
const parsedRosters = new WeakMap<ReadonlyArray<RosterEntry>, RosterSides>();

/** The roster's men on each side, each with his lines in date order. A malformed line is skipped. */
function rosterSides(roster: ReadonlyArray<RosterEntry>): RosterSides {
  const known = parsedRosters.get(roster);
  if (known) return known;
  const men = new Map<string, { side: string; spans: RosterMan['spans'] }>();
  for (const [id, side, since] of roster) {
    if (!id || !(side === 'h' || side === 'e' || side === 'x') || !/^\d{4}-\d{2}-\d{2}$/.test(since ?? '')) continue;
    let m = men.get(id);
    if (!m) men.set(id, (m = { side: '', spans: [] }));
    if (!m.side && side !== 'x') m.side = side;
    m.spans.push({ day: dayNumber(since), isIn: side !== 'x' });
  }
  const sides: RosterSides = { harder: [], easier: [] };
  for (const [id, m] of men) {
    if (!m.side) continue;
    m.spans.sort((a, b) => a.day - b.day);
    (m.side === 'h' ? sides.harder : sides.easier).push({ id, spans: m.spans });
  }
  parsedRosters.set(roster, sides);
  return sides;
}

const orderKeys = new Map<string, number>();

/** Ids in the fixed rotation order: by a hash of the id, ties by id. */
function rotationOrder(ids: string[]): string[] {
  const key = (id: string) => {
    let v = orderKeys.get(id);
    if (v === undefined) orderKeys.set(id, (v = dailyPrngSeed(`career-ladder:${id}`)));
    return v;
  };
  return [...ids].sort((a, b) => key(a) - key(b) || a.localeCompare(b));
}

/**
 * The pick every day before ROTATION_START had, kept exactly as it shipped
 * so those days keep their answers.
 */
function legacyDailyPick(pool: CareerPlayer[], dateStr: string): CareerPlayer | null {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  if (eligible.length === 0) return null;
  // Difficulty skew (owner request, July 2026): two of every three days draw
  // from the harder half of the pool (lower peak market value); every third
  // day the whole pool is fair game, so superstars still appear. Everything
  // stays deterministic per ET date - every user shares one daily player.
  const seed = dateSeed(dateStr);
  const harder = legendPool(pool);
  const source = seed % 3 === 0 || harder.length === 0 ? eligible : harder;
  // Sort by id for a stable, reproducible ordering before indexing. Pool
  // arrival order from Supabase is not guaranteed to be stable run to run.
  const sorted = [...source].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[seed % sorted.length];
}

/**
 * Prominence signal for difficulty: the player's peak single-season market
 * value in whole millions of euros. Every one of the 3514 career_seasons
 * rows carries market_value (verified against the live table 2026-07-15),
 * so this needs no extra fetch and no guesswork.
 */
export function peakValue(p: CareerPlayer): number {
  let peak = 0;
  for (const s of p.seasons) {
    if ((s.marketValue ?? 0) > peak) peak = s.marketValue ?? 0;
  }
  return peak;
}

export type LadderDifficulty = 'standard' | 'legend';

/**
 * Legend pool: the harder half of the eligible pool - players at or below
 * the pool's median peak market value, i.e. the deeper cuts rather than the
 * Ronaldos. Ties at the boundary break by id so the split is deterministic
 * regardless of fetch order. Falls back to the full eligible pool when the
 * pool is too small for a meaningful split.
 */
export function legendPool(pool: CareerPlayer[]): CareerPlayer[] {
  const eligible = pool.filter(p => p.seasons.length >= MIN_STINTS);
  if (eligible.length < 20) return eligible;
  const sorted = [...eligible].sort(
    (a, b) => peakValue(b) - peakValue(a) || a.id.localeCompare(b.id),
  );
  return sorted.slice(Math.floor(sorted.length / 2));
}

/** Lowercase + strip accents so "Raphaël" matches "raphael". */
export function normalizeName(s: string): string {
  return foldSpecialLatin(
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim(),
  );
}

/** One row of the guess box's suggestion list. */
export interface LadderSuggestion {
  /** What the row shows and what picking it submits: a pool man's own spelling, else the search's name. */
  name: string;
  /** Unique per man in the list (the React key). */
  key: string;
  /** Only on a namesake the pool does not hold: his club, position and latest year, from the search. */
  hint?: string;
}

/**
 * The guess box's suggestions (Round 668 fix, from the review). The page used
 * to merge the soccer search's rows by folded name, which undid the search's
 * namesake split: typing "ederson" offered only one Ederson. It now keeps the
 * search's own identity. The pool's names lead, as before. A search row is
 * the pool man himself when his folded name is the pool name's and either
 * the search found nobody else under it (the table's "Pavel Nedved" is the
 * pool's "Pavel Nedv\u011bd", one man spelled two ways across two tables) or he is
 * spelled exactly as the pool spells him. Any other row under that name is a
 * namesake: offered on its own line with the search's club, position and
 * year, and never the answer (ladderGuessWins). Measured 2026-09-28: 4 of the
 * 253 pool names are shared by more than one man in the table (Ra\u00fal,
 * Ederson, Pepe, Cafu), and in all 4 the pool's spelling is the pool man's
 * own spelling there. `wrong` holds the names already guessed, compared as
 * spelled, so a wrong guess on a namesake does not hide the pool man.
 */
export function ladderSuggestions(
  poolNames: string[],
  found: PlayerEntity[],
  query: string,
  wrong: string[],
  limit = 12,
): LadderSuggestion[] {
  const q = normalizeName(query);
  if (q.length < 2) return [];
  const poolByFold = new Map<string, string>();
  for (const n of poolNames) {
    const f = normalizeName(n);
    if (f && !poolByFold.has(f)) poolByFold.set(f, n);
  }
  const guessed = new Set(wrong);
  const seen = new Set<string>();
  const out: LadderSuggestion[] = [];
  const push = (s: LadderSuggestion) => {
    if (seen.has(s.key) || guessed.has(s.name)) return;
    seen.add(s.key);
    out.push(s);
  };
  for (const [f, n] of poolByFold) if (f.includes(q)) push({ name: n, key: 'pool:' + f });
  for (const e of found) {
    const f = normalizeName(e.name);
    const poolName = poolByFold.get(f);
    const isPoolMan = poolName !== undefined && (!e.disambiguator || storedSpelling(e.rawName) === storedSpelling(poolName));
    if (isPoolMan) push({ name: poolName, key: 'pool:' + f });
    else push({ name: e.name, key: 'db:' + (e.personKey ?? e.key), hint: e.disambiguator });
  }
  return out.slice(0, limit);
}

/**
 * Whether a pick is the answer (Round 668 fix). Every answer is a pool man
 * and picking a pool man submits his pool spelling, so a name the pool does
 * not hold (a namesake the search offered) never wins, even when it folds to
 * the answer's letters.
 */
export function ladderGuessWins(name: string, answer: string, poolNames: string[]): boolean {
  return normalizeName(name) === normalizeName(answer) && poolNames.includes(name);
}

/**
 * Score = 1000 base, minus a reveal penalty that SCALES TO CAREER LENGTH (revealing every
 * stint costs ~90% of base no matter how many stints there are), minus 100 per wrong guess,
 * never below 100. The length-scaling fixes short careers keeping a high score after all
 * hints: e.g. Xavi Simons used to leave ~550 with everything revealed; now that lands at the
 * floor, same as a long career fully revealed.
 */
export function careerScore(stintsShown: number, wrongGuesses: number, totalStints = 7): number {
  const revealsAvailable = Math.max(1, totalStints - 1);
  const revealsUsed = Math.max(0, stintsShown - 1);
  const revealPenalty = 0.9 * BASE_SCORE * Math.min(1, revealsUsed / revealsAvailable);
  const raw = BASE_SCORE - revealPenalty - WRONG_GUESS_PENALTY * Math.max(0, wrongGuesses);
  return Math.max(SCORE_FLOOR, Math.round(raw));
}

// The nationality column occasionally holds a birth city alongside (or instead
// of) the country, so we only map to a flag when the string contains a known
// country name as a whole word. Most specific entries sit first so compound
// names like "Equatorial Guinea" never fall through to "Guinea".
/* Round 444: exported so scripts/simMissingXiLayout.mjs can check every flag in
   these tables against the real flagcdn resolver, rather than trusting that a
   glyph typed into a 200 row table is a flag emoji. */
export const COUNTRY_FLAGS: Array<[string, string]> = [
  ['equatorial guinea', '🇬🇶'],
  ['guinea-bissau', '🇬🇼'],
  ['northern ireland', '🇬🇧'],
  ['republic of ireland', '🇮🇪'],
  ['ivory coast', '🇨🇮'],
  ["cote d'ivoire", '🇨🇮'],
  ['south korea', '🇰🇷'],
  ['korea republic', '🇰🇷'],
  ['united states', '🇺🇸'],
  ['usa', '🇺🇸'],
  ['north macedonia', '🇲🇰'],
  ['czech', '🇨🇿'],
  ['bosnia', '🇧🇦'],
  ['england', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['wales', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  ['ireland', '🇮🇪'],
  ['argentina', '🇦🇷'],
  ['brazil', '🇧🇷'],
  ['france', '🇫🇷'],
  ['spain', '🇪🇸'],
  ['germany', '🇩🇪'],
  ['portugal', '🇵🇹'],
  ['italy', '🇮🇹'],
  ['belgium', '🇧🇪'],
  ['netherlands', '🇳🇱'],
  ['croatia', '🇭🇷'],
  ['uruguay', '🇺🇾'],
  ['morocco', '🇲🇦'],
  ['sweden', '🇸🇪'],
  ['cameroon', '🇨🇲'],
  ['canada', '🇨🇦'],
  ['chile', '🇨🇱'],
  ['colombia', '🇨🇴'],
  ['denmark', '🇩🇰'],
  ['norway', '🇳🇴'],
  ['senegal', '🇸🇳'],
  ['algeria', '🇩🇿'],
  ['austria', '🇦🇹'],
  ['costa rica', '🇨🇷'],
  ['ecuador', '🇪🇨'],
  ['egypt', '🇪🇬'],
  ['gabon', '🇬🇦'],
  ['georgia', '🇬🇪'],
  ['nigeria', '🇳🇬'],
  ['poland', '🇵🇱'],
  ['serbia', '🇷🇸'],
  ['slovenia', '🇸🇮'],
  ['slovakia', '🇸🇰'],
  ['turkey', '🇹🇷'],
  ['switzerland', '🇨🇭'],
  ['ukraine', '🇺🇦'],
  ['russia', '🇷🇺'],
  ['greece', '🇬🇷'],
  ['hungary', '🇭🇺'],
  ['romania', '🇷🇴'],
  ['finland', '🇫🇮'],
  ['iceland', '🇮🇸'],
  ['ghana', '🇬🇭'],
  ['mali', '🇲🇱'],
  ['guinea', '🇬🇳'],
  ['tunisia', '🇹🇳'],
  ['mexico', '🇲🇽'],
  ['peru', '🇵🇪'],
  ['paraguay', '🇵🇾'],
  ['venezuela', '🇻🇪'],
  ['jamaica', '🇯🇲'],
  ['japan', '🇯🇵'],
  ['australia', '🇦🇺'],
  ['albania', '🇦🇱'],
  ['montenegro', '🇲🇪'],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Flag emoji for a nationality string, or a globe when we cannot map it. */
export function flagForNationality(nationality: string | null | undefined): string {
  if (!nationality) return '🌍';
  const norm = normalizeName(nationality);
  for (const [country, flag] of COUNTRY_FLAGS) {
    if (new RegExp(`\\b${escapeRegExp(country)}\\b`).test(norm)) return flag;
  }
  return '🌍';
}

/**
 * Owner 2026-08-05: "a little flag next to the team they played for which
 * corresponds to which nation that team plays in." Club -> country flag,
 * evaluated in order so collision-prone entries (Inter Miami vs Inter,
 * Barcelona SC vs Barcelona, Atletico Nacional vs Nacional) resolve to the
 * right league's country. National-team stints (e.g. "Spain U21") fall back
 * to the country-name scan. Returns '' when unknown so rows can skip the flag
 * instead of showing a wrong one.
 */
export const CLUB_COUNTRY: Array<[string, string]> = [
  // Order-sensitive entries FIRST (substring collisions)
  /* Round 460: three more collisions, found when Transfer Path's Europe only
     rule read this table for every club in the career pool. "Argentinos
     Juniors" matched 'gent' and flew a Belgian flag, "Rangers" matched
     'angers' and flew a French one, and "Sporting Gijón" matched 'sporting'
     (Lisbon). Queens Park Rangers sits ahead of Rangers so the shorter name
     cannot take it. */
  ['argentinos juniors', '🇦🇷'], ['queens park rangers', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['rangers', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  ['sporting gijon', '🇪🇸'],
  ['inter miami', '🇺🇸'], ['internacional', '🇧🇷'], ['barcelona sc', '🇪🇨'],
  ['atletico nacional', '🇨🇴'], ['sporting cristal', '🇵🇪'], ['sporting kansas', '🇺🇸'],
  ['america de cali', '🇨🇴'], ['america mineiro', '🇧🇷'], ['club america', '🇲🇽'],
  ['al nassr', '🇸🇦'], ['austria wien', '🇦🇹'], ['austria vienna', '🇦🇹'],
  ['atletico mineiro', '🇧🇷'], ['athletico paranaense', '🇧🇷'], ['atletico madrid', '🇪🇸'],
  /* Round 444: matching is substring, so the club's own long form
     ("Atlético de Madrid", which normalises to "atletico de madrid") never
     matched the entry above it and one of the biggest clubs in Europe was
     flagless everywhere flagForClub is used. */
  ['atletico de madrid', '🇪🇸'],
  ['red bull bragantino', '🇧🇷'], ['red bull salzburg', '🇦🇹'], ['rb leipzig', '🇩🇪'],
  ['york city', '🇺🇸'], ['toronto', '🇨🇦'], ['montreal', '🇨🇦'], ['vancouver', '🇨🇦'],
  ['wellington phoenix', '🇳🇿'],
  // England
  ['manchester city', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['man city', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['manchester united', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['man utd', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['liverpool', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['arsenal', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['chelsea', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['tottenham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['newcastle', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['everton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['aston villa', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['west ham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['leicester', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['southampton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['wolverhampton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['wolves', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['brighton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['crystal palace', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['fulham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['brentford', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['nottingham forest', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['leeds', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['burnley', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['sunderland', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['middlesbrough', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['blackburn', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['bolton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['stoke', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['watford', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['norwich', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['west brom', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['sheffield', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['portsmouth', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['ipswich', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['derby', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['queens park rangers', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['qpr', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['hull', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['luton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['bournemouth', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['charlton', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['wigan', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['birmingham', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['coventry', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['millwall', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['preston', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['reading', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['swansea', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'], ['cardiff', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'],
  // Spain
  ['real madrid', '🇪🇸'], ['barcelona', '🇪🇸'], ['sevilla', '🇪🇸'], ['valencia', '🇪🇸'],
  ['villarreal', '🇪🇸'], ['athletic bilbao', '🇪🇸'], ['athletic club', '🇪🇸'], ['real sociedad', '🇪🇸'],
  ['real betis', '🇪🇸'], ['betis', '🇪🇸'], ['celta', '🇪🇸'], ['espanyol', '🇪🇸'], ['getafe', '🇪🇸'],
  ['osasuna', '🇪🇸'], ['mallorca', '🇪🇸'], ['granada', '🇪🇸'], ['levante', '🇪🇸'], ['deportivo', '🇪🇸'],
  ['zaragoza', '🇪🇸'], ['malaga', '🇪🇸'], ['rayo vallecano', '🇪🇸'], ['alaves', '🇪🇸'], ['elche', '🇪🇸'],
  ['cadiz', '🇪🇸'], ['girona', '🇪🇸'], ['las palmas', '🇪🇸'], ['valladolid', '🇪🇸'], ['almeria', '🇪🇸'],
  // Italy
  ['juventus', '🇮🇹'], ['ac milan', '🇮🇹'], ['inter', '🇮🇹'], ['napoli', '🇮🇹'], ['as roma', '🇮🇹'], ['roma', '🇮🇹'],
  ['lazio', '🇮🇹'], ['atalanta', '🇮🇹'], ['fiorentina', '🇮🇹'], ['torino', '🇮🇹'], ['bologna', '🇮🇹'],
  ['sampdoria', '🇮🇹'], ['genoa', '🇮🇹'], ['udinese', '🇮🇹'], ['sassuolo', '🇮🇹'], ['cagliari', '🇮🇹'],
  ['parma', '🇮🇹'], ['palermo', '🇮🇹'], ['hellas verona', '🇮🇹'], ['verona', '🇮🇹'], ['empoli', '🇮🇹'],
  ['lecce', '🇮🇹'], ['monza', '🇮🇹'], ['salernitana', '🇮🇹'], ['spezia', '🇮🇹'], ['cremonese', '🇮🇹'], ['brescia', '🇮🇹'],
  // Germany
  ['bayern', '🇩🇪'], ['borussia dortmund', '🇩🇪'], ['dortmund', '🇩🇪'], ['leverkusen', '🇩🇪'], ['schalke', '🇩🇪'],
  ['wolfsburg', '🇩🇪'], ['eintracht frankfurt', '🇩🇪'], ['frankfurt', '🇩🇪'], ['monchengladbach', '🇩🇪'], ['gladbach', '🇩🇪'],
  ['hoffenheim', '🇩🇪'], ['stuttgart', '🇩🇪'], ['werder bremen', '🇩🇪'], ['bremen', '🇩🇪'], ['hertha', '🇩🇪'],
  ['mainz', '🇩🇪'], ['koln', '🇩🇪'], ['cologne', '🇩🇪'], ['freiburg', '🇩🇪'], ['augsburg', '🇩🇪'],
  ['union berlin', '🇩🇪'], ['hamburg', '🇩🇪'], ['hannover', '🇩🇪'], ['nurnberg', '🇩🇪'], ['bochum', '🇩🇪'],
  ['heidenheim', '🇩🇪'], ['kaiserslautern', '🇩🇪'], ['darmstadt', '🇩🇪'], ['st pauli', '🇩🇪'],
  // France
  ['paris saint-germain', '🇫🇷'], ['paris saint germain', '🇫🇷'], ['psg', '🇫🇷'], ['marseille', '🇫🇷'],
  ['lyon', '🇫🇷'], ['monaco', '🇲🇨'], ['lille', '🇫🇷'], ['rennes', '🇫🇷'], ['nice', '🇫🇷'], ['lens', '🇫🇷'],
  ['nantes', '🇫🇷'], ['montpellier', '🇫🇷'], ['strasbourg', '🇫🇷'], ['bordeaux', '🇫🇷'], ['saint-etienne', '🇫🇷'],
  ['saint etienne', '🇫🇷'], ['reims', '🇫🇷'], ['toulouse', '🇫🇷'], ['brest', '🇫🇷'], ['lorient', '🇫🇷'],
  ['metz', '🇫🇷'], ['angers', '🇫🇷'], ['auxerre', '🇫🇷'], ['ajaccio', '🇫🇷'], ['le havre', '🇫🇷'],
  ['troyes', '🇫🇷'], ['clermont', '🇫🇷'], ['paris fc', '🇫🇷'],
  // Portugal / Netherlands / Scotland
  ['benfica', '🇵🇹'], ['porto', '🇵🇹'], ['sporting cp', '🇵🇹'], ['sporting lisbon', '🇵🇹'], ['sporting', '🇵🇹'],
  ['braga', '🇵🇹'], ['vitoria guimaraes', '🇵🇹'], ['boavista', '🇵🇹'],
  ['ajax', '🇳🇱'], ['psv', '🇳🇱'], ['feyenoord', '🇳🇱'], ['az alkmaar', '🇳🇱'], ['twente', '🇳🇱'],
  ['utrecht', '🇳🇱'], ['vitesse', '🇳🇱'], ['heerenveen', '🇳🇱'], ['groningen', '🇳🇱'],
  ['celtic', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['rangers', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['aberdeen', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['hearts', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'], ['hibernian', '🏴󠁧󠁢󠁳󠁣󠁴󠁿'],
  // Turkey / Greece / Belgium / Eastern Europe
  ['galatasaray', '🇹🇷'], ['fenerbahce', '🇹🇷'], ['besiktas', '🇹🇷'], ['trabzonspor', '🇹🇷'], ['basaksehir', '🇹🇷'],
  ['olympiacos', '🇬🇷'], ['panathinaikos', '🇬🇷'], ['aek athens', '🇬🇷'], ['paok', '🇬🇷'],
  ['anderlecht', '🇧🇪'], ['club brugge', '🇧🇪'], ['brugge', '🇧🇪'], ['standard liege', '🇧🇪'], ['genk', '🇧🇪'],
  ['gent', '🇧🇪'], ['antwerp', '🇧🇪'],
  ['zenit', '🇷🇺'], ['cska moscow', '🇷🇺'], ['spartak moscow', '🇷🇺'], ['lokomotiv moscow', '🇷🇺'],
  ['krasnodar', '🇷🇺'], ['dynamo moscow', '🇷🇺'], ['rubin', '🇷🇺'],
  ['shakhtar', '🇺🇦'], ['dynamo kyiv', '🇺🇦'], ['dynamo kiev', '🇺🇦'],
  ['legia', '🇵🇱'], ['lech poznan', '🇵🇱'], ['sparta prague', '🇨🇿'], ['sparta praha', '🇨🇿'],
  ['slavia prague', '🇨🇿'], ['slavia praha', '🇨🇿'], ['viktoria plzen', '🇨🇿'],
  ['dinamo zagreb', '🇭🇷'], ['hajduk split', '🇭🇷'], ['rijeka', '🇭🇷'],
  ['red star', '🇷🇸'], ['crvena zvezda', '🇷🇸'], ['partizan', '🇷🇸'],
  // Saudi / Gulf / Asia. Al Ahli Dubai before Al Ahli: Cannavaro's UAE club
  // vs Mahrez and Firmino's Saudi one, most specific first as everywhere.
  ['al ahli dubai', '🇦🇪'],
  ['al hilal', '🇸🇦'], ['al ittihad', '🇸🇦'], ['al ahli', '🇸🇦'], ['al shabab', '🇸🇦'], ['al ettifaq', '🇸🇦'],
  ['al qadsiah', '🇸🇦'],
  ['al sadd', '🇶🇦'], ['al duhail', '🇶🇦'], ['al rayyan', '🇶🇦'], ['al gharafa', '🇶🇦'], ['al arabi', '🇶🇦'],
  ['al ain', '🇦🇪'], ['al wahda', '🇦🇪'], ['al jazira', '🇦🇪'], ['shabab al ahli', '🇦🇪'], ['al wasl', '🇦🇪'],
  ['shanghai', '🇨🇳'], ['guangzhou', '🇨🇳'], ['beijing guoan', '🇨🇳'], ['shandong', '🇨🇳'], ['jiangsu', '🇨🇳'],
  ['hebei', '🇨🇳'], ['tianjin', '🇨🇳'], ['dalian', '🇨🇳'], ['wuhan', '🇨🇳'], ['shenzhen', '🇨🇳'],
  ['kashima', '🇯🇵'], ['urawa', '🇯🇵'], ['kawasaki', '🇯🇵'], ['yokohama', '🇯🇵'], ['gamba osaka', '🇯🇵'],
  ['cerezo osaka', '🇯🇵'], ['vissel kobe', '🇯🇵'], ['fc tokyo', '🇯🇵'], ['nagoya', '🇯🇵'],
  ['jeonbuk', '🇰🇷'], ['ulsan', '🇰🇷'], ['fc seoul', '🇰🇷'], ['suwon', '🇰🇷'], ['pohang', '🇰🇷'],
  ['mumbai city', '🇮🇳'], ['mohun bagan', '🇮🇳'], ['kerala blasters', '🇮🇳'], ['atk', '🇮🇳'],
  // 2026-08-05 ladder expansion: clubs from the 8 new verified careers.
  ['vicenza', '🇮🇹'], ['nancy', '🇫🇷'], ['hvidovre', '🇩🇰'],
  ['aztecs', '🇺🇸'], ['diplomats', '🇺🇸'],
  // Alpine / Nordics
  ['salzburg', '🇦🇹'], ['rapid wien', '🇦🇹'], ['rapid vienna', '🇦🇹'], ['sturm graz', '🇦🇹'], ['lask', '🇦🇹'],
  ['basel', '🇨🇭'], ['young boys', '🇨🇭'], ['zurich', '🇨🇭'], ['grasshopper', '🇨🇭'], ['servette', '🇨🇭'],
  ['lugano', '🇨🇭'], ['sion', '🇨🇭'],
  ['copenhagen', '🇩🇰'], ['kobenhavn', '🇩🇰'], ['midtjylland', '🇩🇰'], ['brondby', '🇩🇰'],
  ['malmo', '🇸🇪'], ['aik', '🇸🇪'], ['hammarby', '🇸🇪'], ['djurgarden', '🇸🇪'], ['goteborg', '🇸🇪'], ['hacken', '🇸🇪'],
  ['rosenborg', '🇳🇴'], ['molde', '🇳🇴'], ['bodo/glimt', '🇳🇴'], ['bodo glimt', '🇳🇴'],
  // Americas
  ['la galaxy', '🇺🇸'], ['lafc', '🇺🇸'], ['los angeles fc', '🇺🇸'], ['red bulls', '🇺🇸'],
  ['seattle sounders', '🇺🇸'], ['atlanta united', '🇺🇸'], ['austin fc', '🇺🇸'], ['portland timbers', '🇺🇸'],
  ['orlando city', '🇺🇸'], ['chicago fire', '🇺🇸'], ['columbus crew', '🇺🇸'], ['philadelphia union', '🇺🇸'],
  ['dc united', '🇺🇸'], ['fc dallas', '🇺🇸'], ['houston dynamo', '🇺🇸'], ['minnesota united', '🇺🇸'],
  ['st. louis city', '🇺🇸'], ['san jose earthquakes', '🇺🇸'], ['fc cincinnati', '🇺🇸'], ['nashville', '🇺🇸'],
  ['colorado rapids', '🇺🇸'], ['real salt lake', '🇺🇸'], ['charlotte fc', '🇺🇸'], ['new england revolution', '🇺🇸'],
  ['club america', '🇲🇽'], ['guadalajara', '🇲🇽'], ['chivas', '🇲🇽'], ['cruz azul', '🇲🇽'], ['pumas', '🇲🇽'],
  ['unam', '🇲🇽'], ['tigres', '🇲🇽'], ['uanl', '🇲🇽'], ['monterrey', '🇲🇽'], ['santos laguna', '🇲🇽'],
  ['toluca', '🇲🇽'], ['pachuca', '🇲🇽'], ['club leon', '🇲🇽'], ['atlas', '🇲🇽'], ['puebla', '🇲🇽'],
  ['necaxa', '🇲🇽'], ['queretaro', '🇲🇽'], ['tijuana', '🇲🇽'], ['juarez', '🇲🇽'], ['mazatlan', '🇲🇽'],
  ['boca juniors', '🇦🇷'], ['river plate', '🇦🇷'], ['racing club', '🇦🇷'], ['independiente', '🇦🇷'],
  ['san lorenzo', '🇦🇷'], ['estudiantes', '🇦🇷'], ['velez', '🇦🇷'], ['newell', '🇦🇷'], ['rosario central', '🇦🇷'],
  ['lanus', '🇦🇷'], ['banfield', '🇦🇷'], ['talleres', '🇦🇷'], ['gimnasia', '🇦🇷'], ['huracan', '🇦🇷'],
  ['argentinos juniors', '🇦🇷'], ['godoy cruz', '🇦🇷'],
  ['flamengo', '🇧🇷'], ['palmeiras', '🇧🇷'], ['corinthians', '🇧🇷'], ['sao paulo', '🇧🇷'], ['santos', '🇧🇷'],
  ['gremio', '🇧🇷'], ['fluminense', '🇧🇷'], ['botafogo', '🇧🇷'], ['vasco', '🇧🇷'], ['cruzeiro', '🇧🇷'],
  ['bahia', '🇧🇷'], ['fortaleza', '🇧🇷'], ['ceara', '🇧🇷'], ['sport recife', '🇧🇷'], ['coritiba', '🇧🇷'],
  ['goias', '🇧🇷'], ['bragantino', '🇧🇷'], ['cuiaba', '🇧🇷'], ['juventude', '🇧🇷'], ['chapecoense', '🇧🇷'],
  ['ponte preta', '🇧🇷'], ['avai', '🇧🇷'], ['vitoria', '🇧🇷'],
  ['penarol', '🇺🇾'], ['nacional', '🇺🇾'],
  ['colo-colo', '🇨🇱'], ['colo colo', '🇨🇱'], ['universidad de chile', '🇨🇱'], ['universidad catolica', '🇨🇱'],
  ['alianza lima', '🇵🇪'], ['universitario', '🇵🇪'],
  ['millonarios', '🇨🇴'], ['junior', '🇨🇴'], ['ldu quito', '🇪🇨'], ['olimpia', '🇵🇾'], ['cerro porteno', '🇵🇾'],
  // Africa / Oceania
  ['al ahly', '🇪🇬'], ['zamalek', '🇪🇬'], ['wydad', '🇲🇦'], ['raja', '🇲🇦'], ['esperance', '🇹🇳'],
  ['kaizer chiefs', '🇿🇦'], ['orlando pirates', '🇿🇦'], ['mamelodi sundowns', '🇿🇦'],
  ['sydney fc', '🇦🇺'], ['melbourne victory', '🇦🇺'], ['melbourne city', '🇦🇺'], ['western sydney', '🇦🇺'],
  ['adelaide united', '🇦🇺'], ['brisbane roar', '🇦🇺'],
  /* Round 319, owner review ("flags for each club's country"): measured
     against the career tables pull, 79 of 274 clubs had no flag (the Gulf
     clubs were a hyphen bug, fixed in flagForClub; the rest are below).
     Every ambiguous entry was resolved through the player who actually
     made the stint (Cerro is Godin's Montevideo club, Audax is Bruno
     Guimaraes' Sao Paulo one, Platense is Trezeguet's Argentine one,
     Barranquilla is Luis Diaz's Colombian one). Ambiguous names keep their
     more specific sibling FIRST, matching is in array order. */
  ['baniyas', '🇦🇪'], ['bunyodkor', '🇺🇿'], ['kitchee', '🇭🇰'], ['kabuscorp', '🇦🇴'],
  ['sivasspor', '🇹🇷'], ['pafos', '🇨🇾'], ['spartak subotica', '🇷🇸'],
  ['anzhi', '🇷🇺'], ['dinamo batumi', '🇬🇪'],
  ['chennaiyin', '🇮🇳'], ['delhi dynamos', '🇮🇳'], ['pune city', '🇮🇳'],
  ['caen', '🇫🇷'], ['cannes', '🇫🇷'], ['grenoble', '🇫🇷'], ['istres', '🇫🇷'],
  ['martigues', '🇫🇷'], ['nimes', '🇫🇷'], ['tours', '🇫🇷'],
  ['exeter city', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['halifax town', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['fleetwood town', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['notts county', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['oxford united', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['rotherham united', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['swindon town', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['stocksbridge park steels', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'], ['weston super mare', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
  ['como', '🇮🇹'], ['padova', '🇮🇹'], ['perugia', '🇮🇹'], ['pescara', '🇮🇹'],
  ['piacenza', '🇮🇹'], ['pisa', '🇮🇹'], ['ravenna', '🇮🇹'], ['venezia', '🇮🇹'],
  ['marsala', '🇮🇹'], ['leffe', '🇮🇹'],
  /* Round 444: the only two sides on a Missing XI score line with no flag,
     both Inter's Serie A opponents on a title-clinching day. FC Crotone is
     Crotone, Calabria (Wikipedia, plus its own season pages); Siena FC is
     Siena, Tuscany (Wikipedia, Wikidata Q2756). */
  ['crotone', '🇮🇹'], ['siena', '🇮🇹'],
  ['eibar', '🇪🇸'], ['hercules', '🇪🇸'],
  ['alverca', '🇵🇹'], ['salgueiros', '🇵🇹'],
  ['den bosch', '🇳🇱'], ['haarlem', '🇳🇱'], ['willem ii', '🇳🇱'],
  ['chemnitzer', '🇩🇪'], ['homburg', '🇩🇪'], ['karlsruher', '🇩🇪'], ['rot weiss ahlen', '🇩🇪'],
  ['liefering', '🇦🇹'],
  ['chmel blsany', '🇨🇿'], ['dukla prague', '🇨🇿'], ['cobh ramblers', '🇮🇪'],
  ['nk zagreb', '🇭🇷'], ['marsonia', '🇭🇷'],
  ['america rj', '🇧🇷'], ['atletico paranaense', '🇧🇷'], ['audax italiano', '🇨🇱'], ['audax', '🇧🇷'],
  ['csa', '🇧🇷'], ['mogi mirim', '🇧🇷'], ['santa cruz', '🇧🇷'], ['sao caetano', '🇧🇷'],
  ['uniao sao joao', '🇧🇷'],
  ['cerro porteno', '🇵🇾'], ['cerro', '🇺🇾'], ['platense', '🇦🇷'], ['barranquilla', '🇨🇴'],
  /* Round 463: the one Missing XI club string with no flag (a Chilean
     starter's club at the time). Club Deportivo Huachipato, Talcahuano. */
  ['huachipato', '🇨🇱'],
  ['miami united', '🇺🇸'], ['miami fc', '🇺🇸'], ['new york cosmos', '🇺🇸'],
];

/** Flag for the country a CLUB plays in (not the player's nationality).
 *  National-team stints resolve through the country-name scan first. */
export function flagForClub(club: string | null | undefined): string {
  if (!club) return '';
  /* Round 319: hyphens fold to spaces before matching. "Al-Nassr" never
     matched the 'al nassr' entry, and every Al- club was flagless for it. */
  const norm = normalizeName(club).replace(/-/g, ' ');
  for (const [country, flag] of COUNTRY_FLAGS) {
    if (new RegExp(`\\b${escapeRegExp(country)}\\b`).test(norm)) return flag;
  }
  for (const [pattern, flag] of CLUB_COUNTRY) {
    if (norm.includes(pattern)) return flag;
  }
  return '';
}

/** market_value is stored as whole millions of euros. */
export function fmtMarketValue(value: number | null): string {
  if (value == null || value <= 0) return '';
  return `€${value}M`;
}

const SEASON_COLS = 'player_id, season, club, goals, assists, appearances, market_value, sort_order';
const PAGE_SIZE = 1000;

/**
 * Loads the whole pool: one query for players, plus paged queries for the
 * ~1726 season rows (PostgREST caps a single response at 1000 rows, so a lone
 * query would silently drop stints). Seasons are grouped per player on the
 * client and sorted by sort_order, which is chronological (0 = earliest).
 * Returns null when anything fails so the page can show an error state.
 */
export async function fetchCareerPool(): Promise<CareerPlayer[] | null> {
  try {
    const { data: playerRows, error: playersError } = await supabase
      .from('career_players' as any)
      .select('id, player_name, nationality, position');
    if (playersError) throw playersError;

    const seasonRows: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('career_seasons' as any)
        .select(SEASON_COLS)
        .order('player_id', { ascending: true })
        .order('sort_order', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const chunk = (data ?? []) as any[];
      seasonRows.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
    }

    const stintsByPlayer = new Map<string, CareerStint[]>();
    for (const row of seasonRows) {
      const stint: CareerStint = {
        season: String(row.season ?? ''),
        club: String(row.club ?? ''),
        goals: row.goals ?? null,
        assists: row.assists ?? null,
        appearances: row.appearances ?? null,
        marketValue: row.market_value ?? null,
        sortOrder: Number(row.sort_order ?? 0),
      };
      const key = String(row.player_id);
      const list = stintsByPlayer.get(key);
      if (list) list.push(stint);
      else stintsByPlayer.set(key, [stint]);
    }

    const players: CareerPlayer[] = ((playerRows ?? []) as any[])
      .map(p => ({
        id: String(p.id),
        name: String(p.player_name ?? ''),
        nationality: String(p.nationality ?? ''),
        position: String(p.position ?? ''),
        seasons: (stintsByPlayer.get(String(p.id)) ?? []).sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      }))
      .filter(p => p.name.length > 0);

    return players;
  } catch {
    return null;
  }
}
