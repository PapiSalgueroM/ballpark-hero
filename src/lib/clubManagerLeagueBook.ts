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

/** A man of an eleven, the shape the engine's opposition line already has: name, position, rating, made up. */
export interface BookMan { n: string; p: Position; r: number; g?: boolean }

/** One man's league season: goals, assists, clean sheets, and 1 when the game made him up. Always four numbers. */
export type BookRow = [goals: number, assists: number, cleanSheets: number, gen: number];

export interface BookClub {
  /** The rows, keyed `${name}|${position}` (rowKey says why not the bare name). */
  m: Record<string, BookRow>;
  /** Goals FOR this club that were own goals: nobody's goal. */
  og: number;
  /** Goals FOR this club with nobody to name: no named eleven, a scorer nobody can place, or the row cap. */
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
  /** MY men's league clean sheets, by player id (the squad keeps one count for every competition). */
  my: Record<string, number>;
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
  return { s: stamp, c: {}, my: {} };
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
  if (!isRecord(raw) || raw.s !== stamp || !isRecord(raw.c) || !isRecord(raw.my)) return null;
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
  for (const n of Object.values(book.my)) if (!isCount(n)) return null;
  return book;
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
    const pick = rng();
    const kind: BookGoalKind = piece < rules.pen ? 'pen'
      : piece < rules.pen + rules.fk ? 'fk'
      : ownGoalTagged(`${key}|${i}|og`, rules.ownGoalOneIn) ? 'og' : 'open';
    const scorer = kind === 'og' ? null
      : kind !== 'open' && taker ? taker
      : pickWeighted(outfield, m => goalWeight(m.p, m.r), pick);
    const assist = assistFrom(rng, kind === 'open' ? scorer : null, outfield, rules);
    out.push({ kind, scorer, assist });
  }
  return out;
}

/** The assist of ONE goal whose scorer a match report already named, on a key of its own. */
export function dealAssist(key: string, scorer: BookMan, onPitch: readonly BookMan[], rules: BookRules): BookMan | null {
  return assistFrom(keyedRng(key), scorer, onPitch, rules);
}

function clubOf(book: LeagueBook, club: string): BookClub {
  return book.c[club] ?? (book.c[club] = { m: {}, og: 0, u: 0 });
}

/** The row of a man, made on his first credit. Null at the row cap, unless he is exempt (a keeper always gets his). */
function rowOf(entry: BookClub, man: BookMan, exempt = false): BookRow | null {
  const key = rowKey(man);
  const have = entry.m[key];
  if (have) return have;
  if (!exempt && Object.keys(entry.m).length >= BOOK_ROWS_PER_CLUB) return null;
  const row: BookRow = [0, 0, 0, man.g ? 1 : 0];
  entry.m[key] = row;
  return row;
}

/** One goal for `club` by `man`. With nobody to name, or no room for a new row, it is counted in `u`. True when a row took it. */
export function creditGoal(book: LeagueBook, club: string, man: BookMan | null): boolean {
  const entry = clubOf(book, club);
  const row = man ? rowOf(entry, man) : null;
  if (!row) { entry.u += 1; return false; }
  row[0] += 1;
  return true;
}

/** One goal for `club` that was an own goal: nobody is credited. */
export function creditOwnGoal(book: LeagueBook, club: string): void {
  clubOf(book, club).og += 1;
}

/** One assist. Dropped, never counted elsewhere, when the row cap leaves him no row. */
export function creditAssist(book: LeagueBook, club: string, man: BookMan): void {
  const row = rowOf(clubOf(book, club), man);
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
  const keeperRow = keeper ? rowOf(entry, keeper, true) : null;
  if (keeperRow) keeperRow[2] += 1;
  for (const d of defenders) {
    const row = rowOf(entry, d);
    if (row) row[2] += 1;
  }
}

/** A league clean sheet for each of MY men named, by player id. */
export function creditMine(book: LeagueBook, ids: readonly string[]): void {
  for (const id of ids) book.my[id] = (book.my[id] ?? 0) + 1;
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

/** The goals of a club as the book holds them: on rows, own goals, unnamed. Their sum is its goals for. */
export function bookClubGoals(book: LeagueBook, club: string): { rows: number; og: number; u: number } {
  const entry = book.c[club];
  if (!entry) return { rows: 0, og: 0, u: 0 };
  let rows = 0;
  for (const row of Object.values(entry.m)) rows += row[0];
  return { rows, og: entry.og, u: entry.u };
}
