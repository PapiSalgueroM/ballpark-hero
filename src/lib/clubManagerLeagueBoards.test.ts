import { describe, expect, it } from 'vitest';
import { creditMine, openBook, openLateBook, readBook, type BookLineOf, type LeagueBook } from '@/lib/clubManagerLeagueBook';
import {
  AWARD_FLOOR, BOARD_ROWS, BOOK_FULL_SHARE, TEAM_LINES, TEAMS_KEPT, bestOfMine, seasonAwards, teamOfSeason, bookDecides, bookFits, bookIsWhole, bookShare, keepersOnRecord, leaders,
  type BoardClub, type BoardInput, type BoardMine,
} from '@/lib/clubManagerLeagueBoards';

/* Round 1306. A made up league of three rival clubs and mine. Roles and made up names only, nobody real.
 *
 * WHAT THIS FILE DOES NOT HOLD (said so nobody cites it for them). It tests the pure reader with typed
 * books. Two rules of the round live in the engine's binding (src/lib/clubManager.ts), where no unit file
 * of the round reaches, and are held by scripts/simCmLeagueBook.mjs on its default fleet instead:
 *  - who of a club's outfield is given its clean sheet (section thin (vi) and section law; controls
 *    thinbacks, nobacks and allbacks). Two mutations a reviewer made of that rule (a thin club's sheet
 *    handed to its midfield, and to every outfield man) left both unit files green.
 *  - when a save with no book is given a whole book and when a late one (section oldsave (i), the
 *    goalless save; control goallesswhole). The reviewer's third mutation (a whole book whenever no goal
 *    has been scored) left both green as well.
 * Round 1311: the two numbers the lead ruled (the honest line at 95, the floor for awards at 73) are
 * pinned at the bottom of this file. */
const STAMP = 'league|test';
const LINE: BookLineOf = pos => (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos) ? 'MID' : 'ATT');

function book(): LeagueBook {
  const b = openBook(STAMP);
  b.c.Alpha = { m: { 'Striker A|ST': [12, 3, 0, 0], 'Winger A|RW': [12, 5, 0, 0], 'Keeper A|GK': [0, 0, 9, 0], 'Back A|CB': [1, 0, 9, 0] }, og: 1, u: 0 };
  b.c.Beta = { m: { 'Striker B|ST': [12, 5, 0, 1], 'Mid B|CM': [4, 9, 0, 0], 'Keeper B|GK': [0, 1, 9, 0], 'aaron|LM': [2, 9, 0, 0], 'Zed|LM': [2, 9, 0, 0] }, og: 0, u: 3 };
  b.c.Gamma = { m: { 'Mine Now|ST': [20, 4, 0, 0], 'Keeper C|GK': [0, 0, 4, 0], 'Blank|CM': [0, 0, 0, 0] }, og: 2, u: 10 };
  creditMine(b, ['m-keeper']);
  creditMine(b, ['m-keeper', 'm-back']);
  return b;
}
const CLUBS: BoardClub[] = [
  { club: 'Alpha', gf: 26, place: 2, keeperOnRecord: true },
  { club: 'Beta', gf: 23, place: 1, keeperOnRecord: true },
  { club: 'Gamma', gf: 32, place: 4, keeperOnRecord: false },
];
const MINE: BoardMine[] = [
  { id: 'm-striker', name: 'My Striker', pos: 'ST', rating: 80, apps: 20, goals: 12, assists: 5 },
  { id: 'm-signed', name: 'Mine Now', pos: 'ST', rating: 84, apps: 6, goals: 3, assists: 0 },
  { id: 'm-keeper', name: 'My Keeper', pos: 'GK', rating: 78, apps: 20, goals: 0, assists: 0, gen: true },
  { id: 'm-back', name: 'My Back', pos: 'CB', rating: 75, apps: 18, goals: 0, assists: 0 },
];
const input = (b: LeagueBook = book()): BoardInput => ({ book: b, clubs: CLUBS, mine: MINE, myClub: 'Mine FC', myPlace: 3, ratingOf: () => 0, lineOf: LINE });
const names = (xs: { name: string }[]): string[] => xs.map(x => x.name);

describe('the boards', () => {
  it('orders Top scorers by goals, then assists, then the name as plain text, then the club', () => {
    const top = leaders(input(), 'goals');
    /* Four men on twelve: five assists before three, and on five each the name decides, as plain text. */
    expect(names(top)).toEqual(['My Striker', 'Striker B', 'Winger A', 'Striker A', 'Mid B', 'Mine Now', 'Zed', 'aaron', 'Back A']);
    expect(top[0]).toEqual({ name: 'My Striker', club: 'Mine FC', pos: 'ST', n: 12, mine: true });
    expect(top[1]).toEqual({ name: 'Striker B', club: 'Beta', pos: 'ST', n: 12, gen: true });
    expect(top[2]).toEqual({ name: 'Winger A', club: 'Alpha', pos: 'RW', n: 12 });
    /* Nobody is on a board on nought, and nobody twice. */
    expect(top.every(m => m.n > 0)).toBe(true);
    expect(new Set(top.map(m => `${m.name}|${m.club}|${m.pos}`)).size).toBe(top.length);
  });

  it('drops a rival row under the name of a man now in my squad: he counts for me, off my own line', () => {
    const top = leaders(input(), 'goals');
    const signed = top.filter(m => m.name === 'Mine Now');
    expect(signed).toEqual([{ name: 'Mine Now', club: 'Mine FC', pos: 'ST', n: 3, mine: true }]);
    /* Without him in my squad his old row is on the board, at the top. */
    const without = leaders({ ...input(), mine: MINE.filter(p => p.id !== 'm-signed') }, 'goals');
    expect(without[0]).toEqual({ name: 'Mine Now', club: 'Gamma', pos: 'ST', n: 20 });
  });

  it('orders Assists by assists, then goals, then name, then club', () => {
    const top = leaders(input(), 'assists');
    expect(names(top)).toEqual(['Mid B', 'Zed', 'aaron', 'My Striker', 'Striker B', 'Winger A', 'Striker A', 'Keeper B']);
    expect(top[0].n).toBe(9);
  });

  it('keeps the Clean sheets board for keepers, mine among them, the club higher in the table first when level', () => {
    const top = leaders(input(), 'sheets');
    expect(top).toEqual([
      { name: 'Keeper B', club: 'Beta', pos: 'GK', n: 9 },
      { name: 'Keeper A', club: 'Alpha', pos: 'GK', n: 9 },
      { name: 'Keeper C', club: 'Gamma', pos: 'GK', n: 4 },
      { name: 'My Keeper', club: 'Mine FC', pos: 'GK', n: 2, mine: true, gen: true },
    ]);
    /* A defender holds clean sheets in the book and is on no board for them. */
    expect(names(top)).not.toContain('Back A');
    expect(names(top)).not.toContain('My Back');
  });

  it('cuts a board at its limit and says where my best man stands on the whole order', () => {
    expect(BOARD_ROWS).toBe(10);
    expect(leaders(input(), 'goals', 3).length).toBe(3);
    expect(leaders(input(), 'goals', 0)).toEqual([]);
    expect(bestOfMine(input(), 'goals')).toEqual({ place: 1, man: { name: 'My Striker', club: 'Mine FC', pos: 'ST', n: 12, mine: true } });
    expect(bestOfMine(input(), 'assists')).toEqual({ place: 4, man: { name: 'My Striker', club: 'Mine FC', pos: 'ST', n: 5, mine: true } });
    expect(bestOfMine(input(), 'sheets')?.place).toBe(4);
    /* None of mine has an assist: nobody to place. */
    expect(bestOfMine({ ...input(), mine: MINE.map(p => ({ ...p, assists: 0 })) }, 'assists')).toBeNull();
  });

  it('counts everybody from the round a late book opened at: my man off his line minus what he held then, never under nought', () => {
    const late = openLateBook(STAMP, 20, [{ club: 'Alpha', gf: 30 }, { club: 'Beta', gf: 25 }, { club: 'Gamma', gf: 20 }], [['m-striker', 10, 5], ['m-signed', 5, 0], ['m-back', 0, 0]]);
    expect(bookIsWhole(late)).toBe(false);
    expect(bookIsWhole(book())).toBe(true);
    expect(late.b).toEqual([['m-striker', 10, 5], ['m-signed', 5, 0]]);
    late.c.Alpha.m['Striker A|ST'] = [1, 0, 0, 0];
    const top = leaders(input(late), 'goals');
    /* My Striker holds 12 and held 10: two since. Mine Now holds 3 and the book says 5 (a line that went
       down cannot count against him): nought, so he is on no board. */
    expect(top).toEqual([{ name: 'My Striker', club: 'Mine FC', pos: 'ST', n: 2, mine: true }, { name: 'Striker A', club: 'Alpha', pos: 'ST', n: 1 }]);
    expect(leaders(input(late), 'assists')).toEqual([]);
    expect(readBook(JSON.parse(JSON.stringify(late)), STAMP)).not.toBeNull();
  });

  it('says whether the book adds up to the table, club by club', () => {
    expect(bookFits(book(), CLUBS)).toBe(true);
    expect(bookFits(book(), CLUBS.map(c => (c.club === 'Beta' ? { ...c, gf: c.gf + 1 } : c)))).toBe(false);
    /* A club the book has no entry for fits only on no goals. */
    expect(bookFits(book(), [...CLUBS, { club: 'Delta', gf: 0, place: 5, keeperOnRecord: false }])).toBe(true);
    expect(bookFits(book(), [...CLUBS, { club: 'Delta', gf: 2, place: 5, keeperOnRecord: false }])).toBe(false);
    const late = openLateBook(STAMP, 3, CLUBS, []);
    expect(bookFits(late, CLUBS)).toBe(true);
  });

  it('says how much of the rivals\' goals is on record, an own goal counted as on record', () => {
    /* Rows 25 + 20 + 20 = 65, own goals 3, unnamed 13: 68 of 81. */
    expect(bookShare(book(), CLUBS)).toEqual({ named: 65, own: 3, unnamed: 13, share: 83 });
    expect(bookShare(openBook(STAMP), CLUBS).share).toBe(100);
    /* A late book in a league whose data is whole: the goals from before it are not a gap in the data. */
    const late = openLateBook(STAMP, 20, CLUBS, []);
    expect(late.u0).toBe(81);
    expect(bookShare(late, CLUBS)).toEqual({ named: 0, own: 0, unnamed: 0, share: 100 });
    late.c.Alpha.m['Striker A|ST'] = [3, 0, 0, 0];
    late.c.Beta.u += 1;
    expect(bookShare(late, CLUBS)).toEqual({ named: 3, own: 0, unnamed: 1, share: 75 });
    expect(keepersOnRecord(CLUBS)).toEqual({ have: 2, of: 3 });
  });

  it('never changes what it is handed', () => {
    const b = book();
    const inp = input(b);
    const before = JSON.stringify({ b, CLUBS, MINE });
    for (const kind of ['goals', 'assists', 'sheets'] as const) { leaders(inp, kind); bestOfMine(inp, kind); }
    bookFits(b, CLUBS);
    bookShare(b, CLUBS);
    keepersOnRecord(CLUBS);
    expect(JSON.stringify({ b, CLUBS, MINE })).toBe(before);
  });
});

/* Round 1311: the lead's two rulings, held here so a change to either is a change somebody meant. */
describe('the ruled numbers', () => {
  it('draws the honest line under 95 in 100 on record and reads awards from a book at 73 or more', () => {
    expect(BOOK_FULL_SHARE).toBe(95);
    expect(AWARD_FLOOR).toBe(73);
    expect(AWARD_FLOOR).toBeLessThan(BOOK_FULL_SHARE);
  });

  /* The floor's edge, held exactly: no season of any fleet has closed on 73, so without this line a `>`
   * for the `>=` passed every gate (review r1311-run-m, mutation floorgt). One rival club, a whole book. */
  it('a whole book on exactly 73 in 100 decides the awards, on 72 it does not, and a late book never does', () => {
    const at = (named: number, late = false): BoardInput => {
      const b = late ? { ...openBook(STAMP), r0: 3, b: [], u0: 0 } : openBook(STAMP);
      b.c.Alpha = { m: { 'Striker A|ST': [named, 0, 0, 0] }, og: 0, u: 100 - named };
      return { book: b, clubs: [{ club: 'Alpha', gf: 100, place: 1, keeperOnRecord: false }], mine: [], myClub: 'Mine FC', myPlace: 2, ratingOf: () => 0, lineOf: LINE };
    };
    expect(bookShare(at(AWARD_FLOOR).book, at(AWARD_FLOOR).clubs).share).toBe(AWARD_FLOOR);
    expect(bookDecides(at(AWARD_FLOOR))).toBe(true);
    expect(bookShare(at(AWARD_FLOOR - 1).book, at(AWARD_FLOOR - 1).clubs).share).toBe(AWARD_FLOOR - 1);
    expect(bookDecides(at(AWARD_FLOOR - 1))).toBe(false);
    expect(bookDecides(at(100, true))).toBe(false);
  });
});

/* Round 1311 step 5: the team of the season, line by line. Another made up league: roles and made up names only. */
describe('the team of the season', () => {
  const RATING: Record<string, number> = { 'N Back One': 75, 'N Back Two': 77, 'N Mid One': 70, 'S Mid One': 82, 'N Mid Two': 71, 'S Mid Two': 71, 'S Mid Three': 72 };
  const TEAM_CLUBS: BoardClub[] = [
    { club: 'North', gf: 49, place: 1, keeperOnRecord: true },
    { club: 'South', gf: 44, place: 2, keeperOnRecord: true },
  ];
  const TEAM_MINE: BoardMine[] = [
    { id: 'm-mid', name: 'My Mid', pos: 'CM', rating: 80, apps: 30, goals: 3, assists: 0 },
    { id: 'm-bench', name: 'My Bench', pos: 'ST', rating: 90, apps: 0, goals: 0, assists: 0 },
  ];
  function teamBook(): LeagueBook {
    const b = openBook('league|team');
    b.c.North = { m: {
      'N Keeper|GK': [0, 0, 14, 0], 'N Back One|CB': [3, 1, 14, 0], 'N Back Two|LB': [1, 3, 14, 0], 'N Back Three|RB': [0, 1, 14, 0],
      'N Mid One|CM': [6, 8, 0, 0], 'N Mid Two|CDM': [1, 2, 0, 0], 'N Striker|ST': [20, 4, 0, 0],
    }, og: 0, u: 0 };
    b.c.South = { m: {
      'S Keeper|GK': [0, 0, 14, 0], 'S Keeper Two|GK': [0, 0, 3, 0], 'S Back One|CB': [2, 2, 9, 0], 'S Back Two|RWB': [0, 1, 9, 0],
      'S Mid One|CAM': [5, 9, 0, 0], 'S Mid Two|CM': [2, 1, 0, 0], 'S Mid Three|LM': [2, 1, 0, 0], 'S Winger|LW': [11, 6, 0, 1], 'S Striker|CF': [9, 2, 0, 0],
    }, og: 0, u: 0 };
    return b;
  }
  const teamInput = (b: LeagueBook = teamBook()): BoardInput => ({ book: b, clubs: TEAM_CLUBS, mine: TEAM_MINE, myClub: 'Mine FC', myPlace: 3, ratingOf: (_club, name) => RATING[name] ?? 60, lineOf: LINE });

  it('picks a keeper, four defenders, four midfielders and two forwards by the rule, ties and all', () => {
    const xi = teamOfSeason(teamInput())!;
    expect(xi.map(m => m[0])).toEqual([
      /* the keeper: 14 apiece, North is higher in the table */
      'N Keeper',
      /* four on four goals plus assists: South's keepers kept 17, North's 14; level clubs go on rating; then one on one, South's sheets again */
      'S Back One', 'N Back Two', 'N Back One', 'S Back Two',
      /* fourteen apiece go on rating; then three apiece on rating (a fifth on three, level on 71, is left out) */
      'S Mid One', 'N Mid One', 'My Mid', 'S Mid Three',
      'N Striker', 'S Winger',
    ]);
    expect(xi.find(m => m[0] === 'My Mid')![3]).toBe(2);
    expect(xi.find(m => m[0] === 'S Winger')![3]).toBe(1);
    expect(xi.map(m => LINE(m[2]))).toEqual(['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT']);
  });

  it('names no team when a line cannot be filled, and never pads one', () => {
    const b = teamBook();
    delete b.c.North.m['N Back Three|RB'];
    delete b.c.South.m['S Back Two|RWB'];
    expect(teamOfSeason(teamInput(b))).toBeNull();
    const c = teamBook();
    /* No keeper kept a clean sheet: no team either. */
    for (const club of Object.values(c.c)) for (const [k, row] of Object.entries(club.m)) if (k.endsWith('|GK')) row[2] = 0;
    expect(teamOfSeason(teamInput(c))).toBeNull();
  });

  it('carries the team in the season\'s awards, and the awards survive a JSON round trip', () => {
    const aw = seasonAwards(teamInput())!;
    expect(aw.xi).toEqual(teamOfSeason(teamInput()));
    expect(aw.cov).toBe(100);
    expect(JSON.parse(JSON.stringify(aw))).toEqual(aw);
    expect(TEAM_LINES).toEqual({ DEF: 4, MID: 4, ATT: 2 });
    expect(TEAMS_KEPT).toBe(5);
  });
});
