/* Round 1229: the league keeps its book.
 *
 * WHY. Until this round the other clubs of a Club Manager league did not score the way football does.
 * The scorer race tracked two men a club (its two best rated forwards OR midfielders), paid them fixed
 * shares of the club's goals (42 and 26 in a hundred) and gave the last 32 to nobody, and a rival's goals
 * against MY club never reached it at all. No rival had an assist or a clean sheet. My own squad, in the
 * same save, was shared out by position and rating (clubManagerGoalWeight.ts).
 *
 * WHAT THIS IS. A book of one league season: for every rival club, a row a man holding his league goals,
 * assists and clean sheets, plus two counts for goals that are nobody's (an own goal) or that nobody can
 * be named for (a club with no named eleven). Every goal a rival club scores is dealt to a man of its
 * eleven by the weight my own squad uses, at the moment the result is known, and written down once. So
 * for every rival club, at every moment: the goals on its rows + og + u = its goals for in the table.
 *
 * THE BOOK NEVER MOVES A MATCH. A result is already decided when the book is asked. Every roll below
 * comes from keyedRng on a key built from the match and the goal, never from Math.random, so the
 * engine's seeded stream gives the same draws with the book in or out (scripts/simCmLeagueBook.mjs,
 * section stream, holds whole careers to that, and against the commit before the round).
 *
 * THE SHAPE SURVIVES JSON. The engine clones a save with JSON.parse(JSON.stringify()) at the top of
 * every entry point, and JSON writes a hole or an undefined in an array as null. So a row is four
 * numbers, always four, zeros and never holes, and a club entry always carries both counts. readBook
 * refuses anything else, and the test file and the harness hold "a round trip is the same book".
 *
 * Pure: plain data in, plain data out. It imports the keyed generator, the own goal rule, the weight
 * table and one type. Nothing here is read at module scope.
 */
import type { Position } from '@/types/game';
import { keyedRng } from '@/lib/keyedRng';
import { ownGoalTagged } from '@/lib/ownGoalRule';
import { assistWeight, goalWeight } from '@/lib/clubManagerGoalWeight';

/** A man of an eleven, the shape the engine's opposition line already has: name, position, rating, made up.
 *  `e` marks an EMPTY SHIRT (Round 1306, partialEleven): a place of an eleven the data has no man for. It
 *  takes its share of a deal like any man and is never given a row: its goals are counted unnamed. */
export interface BookMan { n: string; p: Position; r: number; g?: boolean; e?: true }

/** The line a position plays in. The engine hands its own grouping in (groupOf): never a second copy here. */
export type BookLineOf = (pos: Position) => 'GK' | 'DEF' | 'MID' | 'ATT';

/** One man's league season: goals, assists, clean sheets, and 1 when the game made him up. Always four numbers. */
export type BookRow = [goals: number, assists: number, cleanSheets: number, gen: number];

export interface BookClub {
  /** The rows, keyed `${name}|${position}` (rowKey says why not the bare name). */
  m: Record<string, BookRow>;
  /** Goals FOR this club that were own goals: nobody's goal. */
  og: number;
  /** Goals FOR this club with nobody to name: a place of its eleven the data has no man for (an empty
   *  shirt, or a club with no roster man at all), a scorer nobody can place, or the row cap. */
  u: number;
}

export interface LeagueBook {
  /** The stamp: what this book belongs to, as text the engine can build again from the save. The engine
   *  stamps a book with its league and a hash of the order that league's clubs were drawn in for the
   *  season (bookSalt), so another season's book never reads as this one's, and two careers at one club
   *  do not deal the same scorers for the same scoreline in the same round: the stamp is in every key. */
  s: string;
  /** One entry a rival club, created on its first credit. */
  c: Record<string, BookClub>;
  /** MY men's league clean sheets (the squad keeps one count for every competition): a list of
   *  [player id, clean sheets] in the order each man first kept one. A LIST, not a map by id, on purpose:
   *  no map in a save is keyed by a player's id, an academy boy's id carries the clock and a counter of the
   *  running engine, and a harness that sorts a save's keys before it normalises those ids
   *  (scripts/simCustomClubValues.mjs) read two identical saves as different when this was a map. */
  my: [id: string, cleanSheets: number][];
  /** Round 1306, a LATE book only (openLateBook): the league round this book started recording at, as the
   *  calendar counts rounds (from 0, so a screen prints r0 + 1). Absent on a book opened where a season
   *  starts: that one holds the whole season (bookIsWhole in clubManagerLeagueBoards.ts). */
  r0?: number;
  /** A late book only: MY men's league goals and assists at the moment it opened, a list of
   *  [player id, goals, assists] for the men who had any. A board counts everybody from r0, so one of
   *  mine is read off his league line minus this. A list of triples, never a map by id (see `my`). */
  b?: [id: string, goals: number, assists: number][];
  /** A late book only: the rivals' goals it was opened with, all counted unnamed in their clubs' `u`.
   *  Kept so "how much of the league is on record" can leave them out: they are from before the book,
   *  not a gap in the data. */
  u0?: number;
}

export interface BookRules {
  /** The share of goals that are penalties, and direct free kicks. */
  pen: number;
  fk: number;
  /** One open play goal in this many is an own goal. */
  ownGoalOneIn: number;
  /** An open play goal has an assist this often. */
  assist: number;
  /** A penalty or a direct free kick goes to the eleven's taker (takerOf) rather than by the weight. */
  taker: boolean;
}

export type BookGoalKind = 'open' | 'pen' | 'fk' | 'og';
export interface BookGoal { kind: BookGoalKind; scorer: BookMan | null; assist: BookMan | null }

/** The most rows one club can hold. Only reachable by buying half a rival's team: the eleven is eleven. */
export const BOOK_ROWS_PER_CLUB = 16;

/** A fresh book for one season. */
export function openBook(stamp: string): LeagueBook {
  return { s: stamp, c: {}, my: [] };
}

/**
 * Round 1306. A book opened AFTER the season began, for a save that reached this round without one (a
 * save from before the book, a hot seat run handed over, a book that no longer adds up). Every rival
 * club gets its entry at once with the goals it has already scored counted unnamed, so the first law
 * (rows + own goals + unnamed = goals for) holds from the first moment; `mine` is my men's league goals
 * and assists as they stand. `round` is the league round the book starts recording at.
 */
export function openLateBook(
  stamp: string, round: number, clubs: readonly { club: string; gf: number }[], mine: readonly (readonly [id: string, goals: number, assists: number])[],
): LeagueBook {
  const book: LeagueBook = { s: stamp, c: {}, my: [], r0: round, b: [], u0: 0 };
  let before = 0;
  for (const c of clubs) {
    book.c[c.club] = { m: {}, og: 0, u: c.gf };
    before += c.gf;
  }
  book.u0 = before;
  book.b = mine.filter(t => t[1] > 0 || t[2] > 0).map((t): [string, number, number] => [t[0], t[1], t[2]]);
  return book;
}

/** The salt of a league order: a 32 bit FNV-1a hash of the names, in base 36. */
export function bookSalt(leagueClubs: readonly string[]): string {
  let h = 0x811c9dc5;
  const text = leagueClubs.join('|');
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

/**
 * A row is keyed by name AND position. A projected club can hold two generated men under one name (a
 * striker and a keeper, the case scripts/simClubManagerSaveSize.mjs section 5 was written for), and
 * keyed by the bare name the keeper's clean sheets and the striker's goals would be one man.
 */
export function rowKey(man: BookMan): string {
  return `${man.n}|${man.p}`;
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The hot path's reader: is this the book of the season in play? A stamp and a type check and nothing
 * more, because it is asked on every league result of every round (Round 890 measured a full shape walk
 * on that path at 60 percent of a simulated season). The full walk is readBook.
 */
export function liveBook(raw: unknown, stamp: string): LeagueBook | null {
  if (!isRecord(raw) || raw.s !== stamp || !isRecord(raw.c) || !Array.isArray(raw.my)) return null;
  return raw as unknown as LeagueBook;
}

/** The careful reader: a damaged book, or another season's, reads as no book at all. Never repaired. */
export function readBook(raw: unknown, stamp: string): LeagueBook | null {
  const book = liveBook(raw, stamp);
  if (!book) return null;
  for (const club of Object.values(book.c) as unknown[]) {
    if (!isRecord(club) || !isRecord(club.m) || !isCount(club.og) || !isCount(club.u)) return null;
    for (const row of Object.values(club.m)) {
      if (!Array.isArray(row) || row.length !== 4 || !row.every(isCount)) return null;
    }
  }
  for (const pair of book.my as unknown[]) {
    if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || !isCount(pair[1])) return null;
  }
  /* Round 1306, the three fields of a late book: each absent, or exactly its shape. */
  const late = book as { r0?: unknown; b?: unknown; u0?: unknown };
  if (late.r0 !== undefined && !isCount(late.r0)) return null;
  if (late.u0 !== undefined && !isCount(late.u0)) return null;
  if (late.b !== undefined) {
    if (!Array.isArray(late.b)) return null;
    for (const t of late.b as unknown[]) {
      if (!Array.isArray(t) || t.length !== 3 || typeof t[0] !== 'string' || !isCount(t[1]) || !isCount(t[2])) return null;
    }
  }
  return book;
}

/** The outfield places of an eleven, by line: the shape every full roster is picked in (four, four, two). */
const PLACES = { DEF: 4, MID: 4, ATT: 2 } as const;
const OUTFIELD_PLACES = 10;
/** The position an empty shirt stands in, by the line it fills. */
const SHIRT_POS = { ATT: 'ST', MID: 'CM', DEF: 'CB' } as const;

/**
 * Round 1306. The eleven of a club that cannot field a named one: THE MEN ITS ROSTER HAS, in the places a
 * full eleven would give them, and an EMPTY SHIRT in every outfield place the roster cannot fill. A real
 * man is then dealt the share his place in a full eleven earns and never the goals of the men the data
 * does not have: with every goal dealt over the roster alone, a club with one man on file would give him
 * every goal it scores, a number invented for a real person.
 *
 *  - null when the roster holds nobody: such a club stays wholly unnamed.
 *  - the keeper is the roster's best rated one, or null: a missing keeper is nobody, never a shirt.
 *  - the named outfield men are taken the way a full eleven is (by rating, a name once): four of the back
 *    line, four of midfield, two forwards, then the best outfield men left, up to ten.
 *  - every place still open is an empty shirt. The men of the last take cover the open places from the
 *    back (defence, then midfield, then attack), so the shirts stand in the heaviest lines still short: a
 *    striker's shirt for a forward's place, a central midfielder's, a centre back's. A shirt is rated at
 *    the club's strength (the engine's own number for the men it cannot see) and named `?1`, `?2`, so two
 *    of them are told apart inside a deal; no row key can begin with that mark.
 *  - the list handed back is the named men in the order taken, then the shirts, forwards' first.
 * `lineOf` is the engine's own grouping, handed in. Pure: no roll, and the roster is not changed.
 */
export function partialEleven(roster: readonly BookMan[], strength: number, lineOf: BookLineOf): { keeper: BookMan | null; outfield: BookMan[] } | null {
  if (!roster.length) return null;
  const byRating = [...roster].sort((a, b) => b.r - a.r);
  const taken = new Set<string>();
  const outfield: BookMan[] = [];
  const take = (want: (m: BookMan) => boolean, count: number): number => {
    let got = 0;
    for (const m of byRating) {
      if (got >= count || outfield.length >= OUTFIELD_PLACES) break;
      if (taken.has(m.n) || !want(m)) continue;
      outfield.push(m);
      taken.add(m.n);
      got += 1;
    }
    return got;
  };
  const keeper = byRating.find(m => m.p === 'GK') ?? null;
  if (keeper) taken.add(keeper.n);
  const open = {
    DEF: PLACES.DEF - take(m => lineOf(m.p) === 'DEF', PLACES.DEF),
    MID: PLACES.MID - take(m => lineOf(m.p) === 'MID', PLACES.MID),
    ATT: PLACES.ATT - take(m => lineOf(m.p) === 'ATT', PLACES.ATT),
  };
  let cover = take(m => m.p !== 'GK', OUTFIELD_PLACES);
  for (const line of ['DEF', 'MID', 'ATT'] as const) {
    const filled = Math.min(open[line], cover);
    open[line] -= filled;
    cover -= filled;
  }
  const rating = Math.round(strength);
  let shirts = 0;
  for (const line of ['ATT', 'MID', 'DEF'] as const) {
    for (let i = 0; i < open[line]; i += 1) outfield.push({ n: `?${++shirts}`, p: SHIRT_POS[line], r: rating, e: true });
  }
  return { keeper, outfield };
}

/** One weighted pick on a roll already drawn. A list with no weight at all falls back to an even pick. */
function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, roll: number): T | null {
  if (!items.length) return null;
  const weights = items.map(weight);
  const total = weights.reduce((s, w) => s + w, 0);
  if (!(total > 0)) return items[Math.min(items.length - 1, Math.floor(roll * items.length))];
  let left = roll * total;
  for (let i = 0; i < items.length; i += 1) {
    left -= weights[i];
    if (left <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * The taker of an eleven: the outfield man with the highest goal weight, the name as the tie break. The
 * engine already names this man when a review awards the opposition a penalty in a match I play.
 * The names are compared as plain text, never by locale, so every device picks the same man.
 */
export function takerOf(eleven: readonly BookMan[]): BookMan | null {
  let best: BookMan | null = null;
  let bestW = -1;
  for (const m of eleven) {
    if (m.p === 'GK') continue;
    const w = goalWeight(m.p, m.r);
    if (w > bestW || (w === bestW && best !== null && m.n < best.n)) { best = m; bestW = w; }
  }
  return best;
}

/**
 * Who set a goal up: an open play goal has an assist `rules.assist` of the time, given by the assist
 * weight over the other outfield men. `rng` yields the roll and then the pick, always both, so a later
 * change to one rule cannot shift the other.
 */
function assistFrom(rng: () => number, scorer: BookMan | null, men: readonly BookMan[], rules: BookRules): BookMan | null {
  const roll = rng();
  const pick = rng();
  if (!scorer || roll >= rules.assist) return null;
  /* The scorer is told apart by his row key, not by identity: a caller may hand in a copy of him. */
  const scorerKey = rowKey(scorer);
  return pickWeighted(men.filter(m => m.p !== 'GK' && rowKey(m) !== scorerKey), m => assistWeight(m.p, m.r), pick);
}

/**
 * Deal `count` goals of one club in one match over its eleven. Goal i has its own generator on
 * `${key}|${i}` and reads it in a FIXED order whether or not each roll is used:
 *   1 the set piece roll: under `pen` a penalty, under `pen + fk` a direct free kick;
 *   2 the scorer: by goalWeight over the outfield men (a set piece goes to the taker when the rule says so);
 *   3 the assist roll and 4 the assister (assistFrom): never on a penalty, a free kick or an own goal.
 * An open play goal is an own goal when the shared rule tags it on its own key (`${key}|${i}|og`): it has
 * no scorer and no assist. An eleven with no outfield man deals goals with no scorer.
 */
export function dealGoals(key: string, count: number, eleven: readonly BookMan[], rules: BookRules): BookGoal[] {
  const outfield = eleven.filter(m => m.p !== 'GK');
  const taker = rules.taker ? takerOf(outfield) : null;
  const out: BookGoal[] = [];
  for (let i = 0; i < count; i += 1) {
    const rng = keyedRng(`${key}|${i}`);
    const piece = rng();
    const scorerRoll = rng();
    const kind: BookGoalKind = piece < rules.pen ? 'pen'
      : piece < rules.pen + rules.fk ? 'fk'
      : ownGoalTagged(`${key}|${i}|og`, rules.ownGoalOneIn) ? 'og' : 'open';
    const scorer = kind === 'og' ? null
      : kind !== 'open' && taker ? taker
      : pickWeighted(outfield, m => goalWeight(m.p, m.r), scorerRoll);
    const assist = assistFrom(rng, kind === 'open' ? scorer : null, outfield, rules);
    out.push({ kind, scorer, assist });
  }
  return out;
}

/**
 * Round 1311. What dealGoals gives each man of an eleven ON AVERAGE, worked out from the same rule rather
 * than rolled: a goal is a penalty `pen` of the time and a direct free kick `fk` of the time (each to the
 * taker when the rule says so, else by the weight), and an open play goal is an own goal one time in
 * `ownGoalOneIn` (nobody's) and otherwise goes by goalWeight. `share` is a man's part of his side's goals,
 * `setPieces` the part of it from penalties and free kicks; `ownGoals` is nobody's part. The league
 * leaders card prints its worked example from this, and the unit file holds it against a dealt sample.
 */
export function dealShares(eleven: readonly BookMan[], rules: BookRules): { men: { man: BookMan; share: number; setPieces: number }[]; ownGoals: number } {
  const outfield = eleven.filter(m => m.p !== 'GK');
  const theTaker = rules.taker ? takerOf(outfield) : null;
  const weights = outfield.map(m => goalWeight(m.p, m.r));
  const total = weights.reduce((s, w) => s + w, 0);
  const byWeight = (i: number): number => (total > 0 ? weights[i] / total : 1 / outfield.length);
  const pieces = rules.pen + rules.fk;
  const open = 1 - pieces;
  const own = open / rules.ownGoalOneIn;
  const men = outfield.map((man, i) => {
    const setPieces = pieces * (theTaker ? (man === theTaker ? 1 : 0) : byWeight(i));
    return { man, share: setPieces + (open - own) * byWeight(i), setPieces };
  });
  return { men, ownGoals: own };
}

/** The assist of ONE goal whose scorer a match report already named, on a key of its own. */
export function dealAssist(key: string, scorer: BookMan, onPitch: readonly BookMan[], rules: BookRules): BookMan | null {
  return assistFrom(keyedRng(key), scorer, onPitch, rules);
}

/**
 * The entry of a club, made on its first credit. Null when the save holds something under that name that
 * is not an entry (no rows map): the engine never writes one and JSON parses whole or not at all, so only
 * a save edited by hand can, and the match week (liveBook, a stamp and a type check on purpose) would
 * otherwise throw on it. Such an entry is left exactly as it was found, never repaired: readBook refuses
 * the whole book, which is what a screen will ask.
 */
function clubOf(book: LeagueBook, club: string): BookClub | null {
  const have = book.c[club] as unknown;
  if (have === undefined) return (book.c[club] = { m: {}, og: 0, u: 0 });
  return isRecord(have) && isRecord(have.m) ? (have as unknown as BookClub) : null;
}

/** The row of a man, made on his first credit. Null at the row cap, unless he is exempt (a keeper always
 *  gets his), and null when the save holds something under his key that is not a row (see clubOf). */
function rowOf(entry: BookClub, man: BookMan, exempt = false): BookRow | null {
  /* An empty shirt is nobody, whatever a caller does with it: no goal, no assist and no clean sheet of
     its own ever finds a row (creditGoal then counts the goal unnamed and pays no assist for it). */
  if (man.e) return null;
  const key = rowKey(man);
  const have = entry.m[key] as unknown;
  if (Array.isArray(have)) return have as BookRow;
  if (have !== undefined && have !== null) return null;
  if (!exempt && Object.keys(entry.m).length >= BOOK_ROWS_PER_CLUB) return null;
  const row: BookRow = [0, 0, 0, man.g ? 1 : 0];
  entry.m[key] = row;
  return row;
}

/** One goal for `club` by `man`. With nobody to name, or no room for a new row, it is counted in `u`. True when a row took it. */
export function creditGoal(book: LeagueBook, club: string, man: BookMan | null): boolean {
  const entry = clubOf(book, club);
  if (!entry) return false;
  const row = man ? rowOf(entry, man) : null;
  if (!row) { entry.u += 1; return false; }
  row[0] += 1;
  return true;
}

/** One goal for `club` that was an own goal: nobody is credited. */
export function creditOwnGoal(book: LeagueBook, club: string): void {
  const entry = clubOf(book, club);
  if (entry) entry.og += 1;
}

/** One assist. Dropped, never counted elsewhere, when the row cap leaves him no row. */
export function creditAssist(book: LeagueBook, club: string, man: BookMan): void {
  const entry = clubOf(book, club);
  const row = entry ? rowOf(entry, man) : null;
  if (row) row[1] += 1;
}

/** A whole deal: each goal to the row of its scorer (or `og`, or `u`), and its assist only when the goal found a row. */
export function creditDeal(book: LeagueBook, club: string, deal: readonly BookGoal[]): void {
  for (const goal of deal) {
    if (goal.kind === 'og') { creditOwnGoal(book, club); continue; }
    if (creditGoal(book, club, goal.scorer) && goal.assist) creditAssist(book, club, goal.assist);
  }
}

/** A clean sheet: one to the keeper (always, cap or no cap) and one to each defender handed in. */
export function creditCleanSheet(book: LeagueBook, club: string, keeper: BookMan | null, defenders: readonly BookMan[]): void {
  const entry = clubOf(book, club);
  if (!entry) return;
  const keeperRow = keeper ? rowOf(entry, keeper, true) : null;
  if (keeperRow) keeperRow[2] += 1;
  for (const d of defenders) {
    const row = rowOf(entry, d);
    if (row) row[2] += 1;
  }
}

/** A league clean sheet for each of MY men named, by player id. */
export function creditMine(book: LeagueBook, ids: readonly string[]): void {
  for (const id of ids) {
    const have = book.my.find(pair => pair[0] === id);
    if (have) have[1] += 1;
    else book.my.push([id, 1]);
  }
}

/** How many league clean sheets one of MY men holds in this book. */
export function mineSheets(book: LeagueBook, id: string): number {
  return book.my.find(pair => pair[0] === id)?.[1] ?? 0;
}

export interface BookLine { club: string; name: string; pos: Position; goals: number; assists: number; cleanSheets: number; gen: boolean }

/** Every rival row of the book as plain lines. The position is whatever follows the LAST bar of the key. */
export function bookRows(book: LeagueBook): BookLine[] {
  const out: BookLine[] = [];
  for (const [club, entry] of Object.entries(book.c)) {
    for (const [key, row] of Object.entries(entry.m)) {
      const bar = key.lastIndexOf('|');
      out.push({ club, name: key.slice(0, bar), pos: key.slice(bar + 1) as Position, goals: row[0], assists: row[1], cleanSheets: row[2], gen: row[3] === 1 });
    }
  }
  return out;
}

/**
 * THE FIRST LAW, club by club: goals on rows + own goals + unnamed = the club's goals for in the table.
 * `clubs` are the rival clubs with their goals for as the save's table has them. Only for a book the
 * careful reader (readBook) has accepted: it walks every row.
 */
export function bookFits(book: LeagueBook, clubs: readonly { club: string; gf: number }[]): boolean {
  for (const c of clubs) {
    const g = bookClubGoals(book, c.club);
    if (g.rows + g.og + g.u !== c.gf) return false;
  }
  return true;
}

/** The goals of a club as the book holds them: on rows, own goals, unnamed. Their sum is its goals for. */
export function bookClubGoals(book: LeagueBook, club: string): { rows: number; og: number; u: number } {
  const entry = book.c[club];
  if (!entry) return { rows: 0, og: 0, u: 0 };
  let rows = 0;
  for (const row of Object.values(entry.m)) rows += row[0];
  return { rows, og: entry.og, u: entry.u };
}
