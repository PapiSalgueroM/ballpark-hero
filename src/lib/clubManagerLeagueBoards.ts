/* Round 1306: the league book is read (the pure reader). Round 1311: the engine's door (leagueBoardsOf in
 * clubManager.ts) builds its input and the Stats screen's league leaders card asks it.
 *
 * WHAT THIS IS. The league book (src/lib/clubManagerLeagueBook.ts) holds every rival goal of a league
 * season against a named man, with assists and clean sheets. This module turns one save's book into the
 * league's boards: Top scorers, Assists, Clean sheets. A rival is read off his row; one of MY men off
 * his own league line (the squad keeps it) and, for clean sheets, off the book's list of mine. The
 * engine builds the input (BoardInput) from the active save; the screens and the awards of the round
 * that follows ask these functions and nothing else.
 *
 * THE RULES IT HOLDS.
 *  - A rival row under the name of a man now in my squad is dropped (the rule the old scorer race
 *    follows since Round 742): he is on the boards under my club off his own league line, and what he
 *    scored for the club he left stays in that club's total.
 *  - A LATE book (one opened after the season began, `r0` set) counts from that round for EVERYBODY: a
 *    rival off his row, my man off his league line minus what he held when the book opened (`b`),
 *    never under nought. Side by side, my striker's whole season against half of everybody else's
 *    would be a false board.
 *  - The Clean sheets board is the keepers'. A man on nought is on no board.
 *  - How much of the league is on record (bookShare): goals on a named row or an own goal (nobody's by
 *    rule) over all rival goals the book has seen. The goals a late book was opened with are left out,
 *    so a young book in a league whose data is whole does not read as thin.
 *
 * Pure: plain data in, plain data out. It draws nothing, reads no clock, compares names as plain text
 * (never by locale, so every device orders a board the same way) and never changes what it is handed.
 * It imports the book module and one type; the line of a position is handed in by the engine.
 */
import type { Position } from '@/types/game';
import { bookClubGoals, bookRows, mineSheets, type BookLineOf, type LeagueBook } from '@/lib/clubManagerLeagueBook';

/**
 * Round 1311, the lead's ruling: under this share on record (bookShare, in a hundred) the boards carry one
 * honest line that says the save's own number. 95 and not a number in a gap of the league table (Round
 * 1306 measured seven of 47 leagues within two points of it) because the line is not a gate: it prints a
 * true number every season, so a league on 94 one season and 96 the next is told the truth both times.
 */
export const BOOK_FULL_SHARE = 95;
/**
 * Round 1311, the lead's ruling: the awards are read from the book only off a WHOLE book with at least
 * this share on record. Under it (or on a late book, or with no book) the golden boot, the player of the
 * season and the world award stay on the old scorer race for that season, and the new awards are withheld.
 * 73 is the middle of the one gap in the league table (69 to 78 on two careers a league, 68 to 77 on four
 * and six seeds, Round 1306): in the 14 leagues under it one of my men led the Goals board in 7 of 28
 * careers against 2 of 28 on the old race, in the 33 above it 3 of 66 against 2 of 66.
 */
export const AWARD_FLOOR = 73;
/** How many rows a board shows. */
export const BOARD_ROWS = 10;

/** One rival club as the save's table has it. `place` is its place in the table, 1 for the leader. */
export interface BoardClub { club: string; gf: number; place: number; keeperOnRecord: boolean }
/** One man of my squad: his own league line. `rating` and `apps`, and `ratingOf` and `lineOf` of the
 *  input below, are read only by teamOfSeason: what the team of the season picks and splits its lines on. */
export interface BoardMine { id: string; name: string; pos: Position; rating: number; apps: number; goals: number; assists: number; gen?: boolean }

export interface BoardInput {
  book: LeagueBook;
  /** The rival clubs of the league, mine left out. */
  clubs: readonly BoardClub[];
  /** My whole squad. */
  mine: readonly BoardMine[];
  myClub: string;
  myPlace: number;
  /** A rival's rating off the save's own roster, 0 when it does not know him. */
  ratingOf: (club: string, name: string, pos: Position) => number;
  /** The engine's own grouping of positions into lines, handed in (never a second copy here). */
  lineOf: BookLineOf;
}

export type BoardKind = 'goals' | 'assists' | 'sheets';
/** One row of a board: the man, his club, and the board's own number. */
export interface BoardMan { name: string; club: string; pos: Position; n: number; mine?: true; gen?: true }

/** Is this a book of the whole season? A late book carries the round it started at. */
export function bookIsWhole(book: LeagueBook): boolean {
  return book.r0 === undefined;
}

/* The first law, club by club, is the book's own and lives with it; a screen asks it from here. */
export { bookFits } from '@/lib/clubManagerLeagueBook';

/** How much of the rivals' goals is on record. `share` is a whole number in a hundred, rounded down, and
 *  100 while the book has seen no goal. The goals a late book was opened with (`u0`) are not counted. */
export function bookShare(book: LeagueBook, clubs: readonly Pick<BoardClub, 'club'>[]): { named: number; own: number; unnamed: number; share: number } {
  let named = 0;
  let own = 0;
  let unnamed = 0;
  for (const c of clubs) {
    const g = bookClubGoals(book, c.club);
    named += g.rows;
    own += g.og;
    unnamed += g.u;
  }
  unnamed = Math.max(0, unnamed - (book.u0 ?? 0));
  const all = named + own + unnamed;
  return { named, own, unnamed, share: all > 0 ? Math.floor(100 * (named + own) / all) : 100 };
}

/** How many rival clubs have a keeper on file (a club with none has no row for his clean sheets). */
export function keepersOnRecord(clubs: readonly Pick<BoardClub, 'keeperOnRecord'>[]): { have: number; of: number } {
  return { have: clubs.filter(c => c.keeperOnRecord).length, of: clubs.length };
}

/** A man as the boards rank him: both of his counts (each board breaks its ties on the other), his place. */
interface Ranked { name: string; club: string; pos: Position; goals: number; assists: number; sheets: number; place: number; mine: boolean; gen: boolean }

const text = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Every man the boards can hold: the rival rows minus my squad's names, then my men. */
function ranked(input: BoardInput): Ranked[] {
  const { book } = input;
  const myNames = new Set(input.mine.map(p => p.name));
  const placeOf = new Map(input.clubs.map(c => [c.club, c.place]));
  const out: Ranked[] = [];
  for (const row of bookRows(book)) {
    if (myNames.has(row.name) || !placeOf.has(row.club)) continue;
    out.push({ name: row.name, club: row.club, pos: row.pos, goals: row.goals, assists: row.assists, sheets: row.cleanSheets, place: placeOf.get(row.club) ?? 0, mine: false, gen: row.gen });
  }
  const base = new Map((book.b ?? []).map(t => [t[0], t]));
  for (const p of input.mine) {
    const b = base.get(p.id);
    out.push({
      name: p.name, club: input.myClub, pos: p.pos,
      goals: Math.max(0, p.goals - (b ? b[1] : 0)), assists: Math.max(0, p.assists - (b ? b[2] : 0)),
      sheets: mineSheets(book, p.id), place: input.myPlace, mine: true, gen: p.gen === true,
    });
  }
  return out;
}

/** A board's whole order. Goals: goals, then assists, then name, then club. Assists: assists, then goals,
 *  name, club. Clean sheets (keepers only): clean sheets, then the club higher in the table, then name. */
function ordered(input: BoardInput, kind: BoardKind): Ranked[] {
  const men = ranked(input);
  if (kind === 'sheets') {
    return men.filter(m => m.pos === 'GK' && m.sheets > 0)
      .sort((a, b) => b.sheets - a.sheets || a.place - b.place || text(a.name, b.name) || text(a.club, b.club) || text(a.pos, b.pos));
  }
  if (kind === 'assists') {
    return men.filter(m => m.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || text(a.name, b.name) || text(a.club, b.club) || text(a.pos, b.pos));
  }
  return men.filter(m => m.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || text(a.name, b.name) || text(a.club, b.club) || text(a.pos, b.pos));
}

const numberOf = (m: Ranked, kind: BoardKind): number => (kind === 'sheets' ? m.sheets : kind === 'assists' ? m.assists : m.goals);
const boardMan = (m: Ranked, kind: BoardKind): BoardMan => ({
  name: m.name, club: m.club, pos: m.pos, n: numberOf(m, kind), ...(m.mine ? { mine: true as const } : {}), ...(m.gen ? { gen: true as const } : {}),
});

/** The top of one board. */
export function leaders(input: BoardInput, kind: BoardKind, limit: number = BOARD_ROWS): BoardMan[] {
  const order = ordered(input, kind);
  return order.slice(0, Math.max(0, limit)).map(m => boardMan(m, kind));
}

/** Where the best of MY men stands on a board's whole order (1 for the leader), or null when none of
 *  mine is on it. */
export function bestOfMine(input: BoardInput, kind: BoardKind): { place: number; man: BoardMan } | null {
  const order = ordered(input, kind);
  const i = order.findIndex(m => m.mine);
  return i < 0 ? null : { place: i + 1, man: boardMan(order[i], kind) };
}

/* ---------- Round 1311: the season's awards, read from the book ---------- */

/** One winner as the save keeps him: name, club, his number, and flags (1 made up, 2 one of mine). A
 *  tuple of fixed length, no holes, so it survives the JSON clone every entry point makes. */
export type AwardMan = [name: string, club: string, n: number, flags: number];

/** One man of a team of the season: name, club, position, flags (1 made up, 2 one of mine). */
export type TeamMan = [name: string, club: string, pos: Position, flags: number];

/** A season's awards from the book. `cov` is the share on record when the season closed. A board with
 *  nobody on it gives no winner (the field is left out). `xi` is the team of the season, kept on the
 *  newest TEAMS_KEPT records only. */
export interface SeasonAwards { cov: number; boot?: AwardMan; ast?: AwardMan; glove?: AwardMan; xi?: TeamMan[] }

/** The team of the season's lines, a 4-4-2: the shape every full eleven of the league is picked in. */
export const TEAM_LINES = { DEF: 4, MID: 4, ATT: 2 } as const;
/** How many seasons keep their team on the record: the three winners are kept for every season. */
export const TEAMS_KEPT = 5;

/**
 * Round 1311, the team of the season (the lead's ruling, a 4-4-2 by the engine's own lines). The pool is the
 * boards' own: every rival row (minus my squad's names) and every man of mine with a league appearance.
 *  1 the keeper: a keeper with the most clean sheets; level men split by the club higher in the table, the
 *    higher rating, the name. No keeper with a clean sheet: no team.
 *  2 four defenders: most goals plus assists; level men split by their club's clean sheets (the sum on its
 *    keepers' rows, or the largest on a defender's row when it has no keeper's row), then the club higher
 *    in the table, the rating, the name.
 *  3 four midfielders and 4 two forwards: most goals plus assists; level men split by the rating, the club
 *    higher in the table, the name.
 * A man is picked once. A line that cannot be filled means no team that season: never padded.
 */
export function teamOfSeason(input: BoardInput): TeamMan[] | null {
  const men = ranked(input);
  const myIds = new Map(input.mine.map(p => [p.name, p]));
  const pool = men.filter(m => !m.mine || (myIds.get(m.name)?.apps ?? 0) > 0)
    .map(m => ({ ...m, line: input.lineOf(m.pos), rating: m.mine ? (myIds.get(m.name)?.rating ?? 0) : input.ratingOf(m.club, m.name, m.pos) }));
  const clubSheets = new Map<string, number>();
  for (const club of new Set(pool.map(m => m.club))) {
    const of = pool.filter(m => m.club === club);
    const keepers = of.filter(m => m.pos === 'GK');
    clubSheets.set(club, keepers.length ? keepers.reduce((n, m) => n + m.sheets, 0) : Math.max(0, ...of.filter(m => m.line === 'DEF').map(m => m.sheets)));
  }
  const flags = (m: Ranked) => (m.gen ? 1 : 0) + (m.mine ? 2 : 0);
  const deeds = (m: Ranked) => m.goals + m.assists;
  const keeper = pool.filter(m => m.pos === 'GK' && m.sheets > 0)
    .sort((a, b) => b.sheets - a.sheets || a.place - b.place || b.rating - a.rating || text(a.name, b.name) || text(a.club, b.club))[0];
  if (!keeper) return null;
  const pick = (line: 'DEF' | 'MID' | 'ATT', n: number, order: (a: typeof pool[number], b: typeof pool[number]) => number) => {
    const got = pool.filter(m => m.line === line && m.pos !== 'GK').sort(order).slice(0, n);
    return got.length === n ? got : null;
  };
  const defs = pick('DEF', TEAM_LINES.DEF, (a, b) => deeds(b) - deeds(a) || (clubSheets.get(b.club) ?? 0) - (clubSheets.get(a.club) ?? 0) || a.place - b.place || b.rating - a.rating || text(a.name, b.name) || text(a.club, b.club));
  const byDeeds = (a: typeof pool[number], b: typeof pool[number]) => deeds(b) - deeds(a) || b.rating - a.rating || a.place - b.place || text(a.name, b.name) || text(a.club, b.club);
  const mids = pick('MID', TEAM_LINES.MID, byDeeds);
  const atts = pick('ATT', TEAM_LINES.ATT, byDeeds);
  if (!defs || !mids || !atts) return null;
  return [keeper, ...defs, ...mids, ...atts].map((m): TeamMan => [m.name, m.club, m.pos, flags(m)]);
}

/** Do the awards come from the book? Only off a WHOLE book with at least AWARD_FLOOR in 100 on record. */
export function bookDecides(input: BoardInput): boolean {
  return bookIsWhole(input.book) && bookShare(input.book, input.clubs).share >= AWARD_FLOOR;
}

const awardMan = (m: BoardMan): AwardMan => [m.name, m.club, m.n, (m.gen ? 1 : 0) + (m.mine ? 2 : 0)];

/** The season's top scorer, most assists and most clean sheets: the first of each board. Null when the
 *  book does not decide (a late book, or under the floor): those awards are then withheld. */
export function seasonAwards(input: BoardInput): SeasonAwards | null {
  if (!bookDecides(input)) return null;
  const out: SeasonAwards = { cov: bookShare(input.book, input.clubs).share };
  const [boot] = leaders(input, 'goals', 1);
  const [ast] = leaders(input, 'assists', 1);
  const [glove] = leaders(input, 'sheets', 1);
  if (boot) out.boot = awardMan(boot);
  if (ast) out.ast = awardMan(ast);
  if (glove) out.glove = awardMan(glove);
  const xi = teamOfSeason(input);
  if (xi) out.xi = xi;
  return out;
}
