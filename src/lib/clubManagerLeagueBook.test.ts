import { describe, expect, it } from 'vitest';
import { goalWeight } from '@/lib/clubManagerGoalWeight';
import {
  BOOK_ROWS_PER_CLUB, bookClubGoals, bookRows, bookSalt, creditAssist, creditCleanSheet, creditDeal, creditGoal,
  creditMine, creditOwnGoal, dealAssist, dealGoals, dealShares, liveBook, mineSheets, openBook, openLateBook, partialEleven, readBook, rowKey, takerOf,
  type BookLineOf, type BookMan, type BookRules, type LeagueBook,
} from '@/lib/clubManagerLeagueBook';

/* WHAT THIS FILE DOES NOT HOLD: who of a club's outfield the ENGINE hands to creditCleanSheet, and when the
   engine gives a save with no book a whole book or a late one. Both live in src/lib/clubManager.ts and
   are held by scripts/simCmLeagueBook.mjs on its default fleet (the note at the top of
   clubManagerLeagueBoards.test.ts names the sections and controls). Do not cite this file for either. */

/* Round 1229. A made up eleven in the shape the engine names a rival in: a keeper, four at the back,
   four in midfield, two up front. Roles and ratings only, nobody real. */
const XI: BookMan[] = [
  { n: 'Keeper', p: 'GK', r: 80 },
  { n: 'Left Back', p: 'LB', r: 76 }, { n: 'Centre Back A', p: 'CB', r: 79 }, { n: 'Centre Back B', p: 'CB', r: 78 }, { n: 'Right Back', p: 'RB', r: 77 },
  { n: 'Holder', p: 'CDM', r: 80 }, { n: 'Centre Mid', p: 'CM', r: 81 }, { n: 'Number Ten', p: 'CAM', r: 83 }, { n: 'Wide Mid', p: 'LM', r: 78 },
  { n: 'Winger', p: 'RW', r: 82 }, { n: 'Striker', p: 'ST', r: 84, g: true },
];
const RULES: BookRules = { pen: 0.08, fk: 0.04, ownGoalOneIn: 32, assist: 0.7, taker: true };
const BY_WEIGHT: BookRules = { ...RULES, taker: false };
const STAMP = `premier|${bookSalt(['A', 'B', 'C'])}`;
const fresh = (): LeagueBook => openBook(STAMP);
const sd = (n: number, p: number): number => Math.sqrt(n * p * (1 - p));
const roundTrip = (book: LeagueBook): unknown => JSON.parse(JSON.stringify(book));

describe('dealGoals', () => {
  it('deals the same goals for the same key, every time, and another key deals others', () => {
    const a = dealGoals('k|1', 7, XI, RULES);
    expect(dealGoals('k|1', 7, XI, RULES)).toEqual(a);
    const many = (key: string): string => Array.from({ length: 40 }, (_, i) => dealGoals(`${key}|${i}`, 3, XI, RULES).map(g => g.scorer?.n ?? g.kind).join(',')).join(';');
    expect(many('one')).not.toEqual(many('two'));
  });

  it('rolls every goal of one match on its own: two or three goals are one man\'s only as often as the weights say', () => {
    /* Open play only and no own goal, so who scored is one weighted pick a goal and nothing else. With the
       goal's index out of the key every goal of a side would be the same roll: the same man every time. */
    const plain: BookRules = { pen: 0, fk: 0, ownGoalOneIn: 1e9, assist: 0.7, taker: false };
    const outfield = XI.filter(m => m.p !== 'GK');
    const total = outfield.reduce((s, m) => s + goalWeight(m.p, m.r), 0);
    const share = outfield.map(m => goalWeight(m.p, m.r) / total);
    const pTwo = share.reduce((s, p) => s + p * p, 0);
    const pThree = share.reduce((s, p) => s + p * p * p, 0);
    const N = 6000;
    let firstTwo = 0;
    let allThree = 0;
    let sameAssister = 0;
    let bothAssisted = 0;
    const firstScorers = new Set<string>();
    for (let k = 0; k < N; k += 1) {
      const [a, b, c] = dealGoals(`brace|${k}`, 3, XI, plain);
      expect(a.kind).toBe('open');
      firstScorers.add(a.scorer!.n);
      if (a.scorer === b.scorer) firstTwo += 1;
      if (a.scorer === b.scorer && b.scorer === c.scorer) allThree += 1;
      if (a.assist && b.assist) { bothAssisted += 1; if (a.assist === b.assist) sameAssister += 1; }
    }
    expect(firstScorers.size).toBe(outfield.length);
    expect(pTwo).toBeLessThan(0.3);
    expect(Math.abs(firstTwo - N * pTwo)).toBeLessThan(4 * sd(N, pTwo));
    expect(Math.abs(allThree - N * pThree)).toBeLessThan(4 * sd(N, pThree));
    /* The assist of each goal is its own roll too: about half of the matches have one on both of the
       first two goals (0.7 x 0.7), and it is one man's on well under half of those. */
    expect(Math.abs(bothAssisted - N * 0.49)).toBeLessThan(4 * sd(N, 0.49));
    expect(sameAssister).toBeLessThan(bothAssisted * 0.5);
  });

  it('shares the open play goals by the weight, each man inside four binomial standard deviations', () => {
    const outfield = XI.filter(m => m.p !== 'GK');
    const total = outfield.reduce((s, m) => s + goalWeight(m.p, m.r), 0);
    const got = new Map<string, number>();
    let open = 0;
    for (let k = 0; k < 20000; k += 1) {
      for (const g of dealGoals(`share|${k}`, 1, XI, BY_WEIGHT)) {
        if (g.kind === 'og' || !g.scorer) continue;
        open += 1;
        got.set(g.scorer.n, (got.get(g.scorer.n) ?? 0) + 1);
      }
    }
    expect(open).toBeGreaterThan(19000);
    expect(got.has('Keeper')).toBe(false);
    for (const m of outfield) {
      const p = goalWeight(m.p, m.r) / total;
      expect(Math.abs((got.get(m.n) ?? 0) - open * p)).toBeLessThan(4 * sd(open, p));
    }
    expect(got.get('Striker')!).toBeGreaterThan(got.get('Winger')!);
    expect(got.get('Winger')!).toBeGreaterThan(got.get('Centre Mid')!);
    expect(got.get('Centre Mid')!).toBeGreaterThan(got.get('Centre Back A')!);
  });

  it('pays set pieces and own goals at the shares of the rules, and no assist on any of them', () => {
    const N = 30000;
    const count = { pen: 0, fk: 0, og: 0, open: 0, assisted: 0 };
    for (let k = 0; k < N; k += 1) {
      const [g] = dealGoals(`kinds|${k}`, 1, XI, RULES);
      count[g.kind] += 1;
      if (g.kind !== 'open') expect(g.assist).toBeNull();
      if (g.kind === 'og') expect(g.scorer).toBeNull();
      if (g.assist) {
        count.assisted += 1;
        expect(g.assist).not.toBe(g.scorer);
        expect(g.assist.p).not.toBe('GK');
      }
    }
    expect(Math.abs(count.pen - N * 0.08)).toBeLessThan(4 * sd(N, 0.08));
    expect(Math.abs(count.fk - N * 0.04)).toBeLessThan(4 * sd(N, 0.04));
    const eligible = count.og + count.open;
    expect(Math.abs(count.og - eligible / 32)).toBeLessThan(4 * sd(eligible, 1 / 32));
    expect(Math.abs(count.assisted - count.open * 0.7)).toBeLessThan(4 * sd(count.open, 0.7));
  });

  it('gives a penalty and a direct free kick to the taker when the rule says so, and by the weight when not', () => {
    const taker = takerOf(XI)!;
    expect(taker.n).toBe('Striker');
    let pieces = 0;
    let offTaker = 0;
    for (let k = 0; k < 6000; k += 1) {
      const [on] = dealGoals(`taker|${k}`, 1, XI, RULES);
      const [off] = dealGoals(`taker|${k}`, 1, XI, BY_WEIGHT);
      expect(off.kind).toBe(on.kind);
      if (on.kind !== 'pen' && on.kind !== 'fk') { expect(off.scorer).toBe(on.scorer); continue; }
      pieces += 1;
      expect(on.scorer).toBe(taker);
      if (off.scorer !== taker) offTaker += 1;
    }
    expect(pieces).toBeGreaterThan(500);
    expect(offTaker).toBeGreaterThan(pieces / 2);
  });

  it('breaks a level taker by the name as plain text, and never names a keeper', () => {
    const level: BookMan[] = [{ n: 'Zed', p: 'ST', r: 80 }, { n: 'Abel', p: 'CF', r: 80 }, { n: 'Big Keeper', p: 'GK', r: 99 }];
    expect(takerOf(level)!.n).toBe('Abel');
    expect(takerOf([{ n: 'Only Keeper', p: 'GK', r: 90 }])).toBeNull();
    expect(dealGoals('nobody', 2, [{ n: 'Only Keeper', p: 'GK', r: 90 }], RULES).every(g => g.scorer === null)).toBe(true);
  });

  it('gives the assist by the ASSIST weight over the other men: by line inside four standard deviations, and far from the goal weight\'s share', () => {
    /* Round 1306. The test's own copy of the two tables: the scorer of an open play goal is s by the goal
       weight, the assist goes to one of the others by the assist weight (0.6 of the goal weight plus 0.5).
       A reviewer once dealt the assist by the goal weight and nothing went red; this can tell the two apart. */
    const line = (m: BookMan): 'ATT' | 'MID' | 'DEF' => (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(m.p) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(m.p) ? 'MID' : 'ATT');
    const outfield = XI.filter(m => m.p !== 'GK');
    const gw = (m: BookMan): number => goalWeight(m.p, m.r);
    const shares = (aw: (m: BookMan) => number): Record<'ATT' | 'MID' | 'DEF', number> => {
      const G = outfield.reduce((s, m) => s + gw(m), 0);
      const A = outfield.reduce((s, m) => s + aw(m), 0);
      const out = { ATT: 0, MID: 0, DEF: 0 };
      for (const s of outfield) for (const a of outfield) if (a !== s) out[line(a)] += (gw(s) / G) * (aw(a) / (A - aw(s)));
      return out;
    };
    const byRule = shares(m => gw(m) * 0.6 + 0.5);
    const byGoalWeight = shares(gw);
    const got = { ATT: 0, MID: 0, DEF: 0 };
    let n = 0;
    for (let i = 0; i < 6000; i += 1) {
      for (const goal of dealGoals(`assist line|${i}`, 1, XI, RULES)) {
        if (!goal.assist) continue;
        expect(goal.kind).toBe('open');
        got[line(goal.assist)] += 1;
        n += 1;
      }
    }
    expect(n).toBeGreaterThan(3000);
    for (const l of ['ATT', 'MID', 'DEF'] as const) expect(Math.abs(got[l] - n * byRule[l])).toBeLessThan(4 * sd(n, byRule[l]));
    /* The defenders are where the two tables part: the flat half point lifts them. */
    expect(Math.abs(got.DEF - n * byGoalWeight.DEF)).toBeGreaterThan(4 * sd(n, byGoalWeight.DEF));
    expect(Math.abs(got.ATT - n * byGoalWeight.ATT)).toBeGreaterThan(4 * sd(n, byGoalWeight.ATT));
  });

  it('deals the assist of a goal a report already named on its own key, never to the scorer or a keeper', () => {
    const scorer = XI[10];
    let given = 0;
    for (let k = 0; k < 4000; k += 1) {
      const a = dealAssist(`mine|${k}`, scorer, XI, RULES);
      expect(dealAssist(`mine|${k}`, scorer, XI, RULES)).toBe(a);
      if (!a) continue;
      given += 1;
      expect(a).not.toBe(scorer);
      expect(a.p).not.toBe('GK');
    }
    expect(Math.abs(given - 4000 * 0.7)).toBeLessThan(4 * sd(4000, 0.7));
  });
});

describe('the book', () => {
  it('keeps the first law after every credit: rows + own goals + unnamed = goals dealt', () => {
    const book = fresh();
    let dealt = 0;
    for (let k = 0; k < 300; k += 1) {
      const n = k % 5;
      creditDeal(book, 'Rivals', dealGoals(`law|${k}`, n, XI, RULES));
      dealt += n;
      const g = bookClubGoals(book, 'Rivals');
      expect(g.rows + g.og + g.u).toBe(dealt);
    }
    const rows = bookRows(book);
    expect(rows.reduce((s, r) => s + r.assists, 0)).toBeLessThanOrEqual(rows.reduce((s, r) => s + r.goals, 0));
    expect(rows.find(r => r.name === 'Striker')).toMatchObject({ club: 'Rivals', pos: 'ST', gen: true });
    expect(rows.find(r => r.name === 'Winger')!.gen).toBe(false);
    expect(bookClubGoals(book, 'Nobody FC')).toEqual({ rows: 0, og: 0, u: 0 });
  });

  it('is the same book after a JSON round trip, after every kind of credit, and readBook accepts it', () => {
    const book = fresh();
    const steps: (() => void)[] = [
      () => { creditGoal(book, 'Rivals', XI[10]); },
      () => { creditAssist(book, 'Rivals', XI[7]); },
      () => { creditOwnGoal(book, 'Rivals'); },
      () => { creditGoal(book, 'Thin FC', null); },
      () => { creditCleanSheet(book, 'Rivals', XI[0], XI.slice(1, 5)); },
      () => { creditMine(book, ['p-keeper', 'p-back']); },
      () => { creditDeal(book, 'Others', dealGoals('rt', 6, XI, RULES)); },
    ];
    for (const step of steps) {
      step();
      expect(roundTrip(book)).toEqual(book);
      expect(JSON.stringify(roundTrip(book))).toBe(JSON.stringify(book));
      expect(readBook(roundTrip(book), STAMP)).not.toBeNull();
      expect(JSON.stringify(book)).not.toContain('null');
    }
    expect(book.c.Rivals.m[rowKey(XI[10])]).toEqual([1, 0, 0, 1]);
    expect(book.c.Rivals.m[rowKey(XI[0])]).toEqual([0, 0, 1, 0]);
    expect(book.c['Thin FC']).toEqual({ m: {}, og: 0, u: 1 });
    creditMine(book, ['p-keeper']);
    expect(book.my).toEqual([['p-keeper', 2], ['p-back', 1]]);
    expect(mineSheets(book, 'p-keeper')).toBe(2);
    expect(mineSheets(book, 'p-nobody')).toBe(0);
  });

  it('sends a new scorer past the row cap to the unnamed count, and still gives a keeper his row', () => {
    const book = fresh();
    const crowd: BookMan[] = Array.from({ length: BOOK_ROWS_PER_CLUB + 3 }, (_, i) => ({ n: `Man ${i}`, p: 'CM' as const, r: 70 }));
    const took = crowd.map(m => creditGoal(book, 'Rivals', m));
    expect(took.filter(Boolean).length).toBe(BOOK_ROWS_PER_CLUB);
    expect(book.c.Rivals.u).toBe(3);
    creditAssist(book, 'Rivals', { n: 'Late Man', p: 'CAM', r: 70 });
    expect(Object.keys(book.c.Rivals.m).length).toBe(BOOK_ROWS_PER_CLUB);
    creditCleanSheet(book, 'Rivals', { n: 'New Keeper', p: 'GK', r: 70 }, [{ n: 'New Back', p: 'CB', r: 70 }]);
    expect(book.c.Rivals.m['New Keeper|GK']).toEqual([0, 0, 1, 0]);
    expect(book.c.Rivals.m['New Back|CB']).toBeUndefined();
    expect(creditGoal(book, 'Rivals', crowd[0])).toBe(true);
    const g = bookClubGoals(book, 'Rivals');
    expect(g.rows + g.og + g.u).toBe(crowd.length + 1);
  });

  it('gives two men with one name two rows when their positions differ', () => {
    const book = fresh();
    creditGoal(book, 'Rivals', { n: 'Nando Hedlund', p: 'ST', r: 73, g: true });
    creditCleanSheet(book, 'Rivals', { n: 'Nando Hedlund', p: 'GK', r: 63, g: true }, []);
    expect(bookRows(book).map(r => [r.name, r.pos, r.goals, r.cleanSheets, r.gen])).toEqual([
      ['Nando Hedlund', 'ST', 1, 0, true], ['Nando Hedlund', 'GK', 0, 1, true],
    ]);
  });

  it('reads a damaged book, or the book of another season, as no book', () => {
    const good = fresh();
    creditDeal(good, 'Rivals', dealGoals('damage', 5, XI, RULES));
    const broken = (edit: (b: any) => void): unknown => { const b = JSON.parse(JSON.stringify(good)); edit(b); return b; };
    expect(readBook(good, STAMP)).toBe(good);
    expect(liveBook(good, STAMP)).toBe(good);
    expect(readBook(good, `premier|${bookSalt(['B', 'A', 'C'])}`)).toBeNull();
    expect(readBook(good, `laliga|${bookSalt(['A', 'B', 'C'])}`)).toBeNull();
    for (const raw of [undefined, null, 'a book', 7, [], [good], {}]) {
      expect(readBook(raw, STAMP)).toBeNull();
      expect(liveBook(raw, STAMP)).toBeNull();
    }
    const firstKey = Object.keys(good.c.Rivals.m)[0];
    expect(readBook(broken(b => { b.c.Rivals.m[firstKey] = [3, 1, null, 1]; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.c.Rivals.m[firstKey] = [3, 1]; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.c.Rivals.m[firstKey] = [3, -1, 0, 0]; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.c.Rivals.m[firstKey] = [3, 1.5, 0, 0]; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { delete b.c.Rivals.u; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.c.Rivals = 'gone'; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.my = [['p-1', 'two']]; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.my = [['p-1', 2, 3]]; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.my = { 'p-1': 2 }; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.c = []; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { delete b.my; }), STAMP)).toBeNull();
  });

  it('never throws in a match week on a club entry or a row that is not one, and leaves it as it found it', () => {
    /* Only a save edited by hand can hold these: the stamp is right, so the week (liveBook) reads the book. */
    const hurt = JSON.parse(JSON.stringify(fresh()));
    creditGoal(hurt, 'Rivals', XI[10]);
    hurt.c['No Rows'] = { m: null, og: 0, u: 0 };
    hurt.c['A String'] = 'gone';
    hurt.c['A List'] = [];
    hurt.c.Rivals.m[rowKey(XI[9])] = 'three';
    hurt.c.Rivals.m[rowKey(XI[7])] = 5;
    expect(liveBook(hurt, STAMP)).toBe(hurt);
    expect(readBook(hurt, STAMP)).toBeNull();
    for (const club of ['No Rows', 'A String', 'A List']) {
      const asFound = JSON.stringify(hurt.c[club]);
      expect(creditGoal(hurt, club, XI[10])).toBe(false);
      expect(creditGoal(hurt, club, null)).toBe(false);
      creditOwnGoal(hurt, club);
      creditAssist(hurt, club, XI[7]);
      creditCleanSheet(hurt, club, XI[0], XI.slice(1, 5));
      creditDeal(hurt, club, dealGoals(`hurt|${club}`, 5, XI, RULES));
      expect(JSON.stringify(hurt.c[club])).toBe(asFound);
    }
    /* A row that is not a row takes nothing (the goal is counted unnamed), and the sound rows beside it still do. */
    expect(creditGoal(hurt, 'Rivals', XI[9])).toBe(false);
    creditAssist(hurt, 'Rivals', XI[7]);
    expect(hurt.c.Rivals.m[rowKey(XI[9])]).toBe('three');
    expect(hurt.c.Rivals.m[rowKey(XI[7])]).toBe(5);
    expect(hurt.c.Rivals.u).toBe(1);
    expect(creditGoal(hurt, 'Rivals', XI[10])).toBe(true);
    expect(hurt.c.Rivals.m[rowKey(XI[10])]).toEqual([2, 0, 0, 1]);
    /* A row left as null is made again, as it always was. */
    hurt.c.Rivals.m[rowKey(XI[6])] = null;
    expect(creditGoal(hurt, 'Rivals', XI[6])).toBe(true);
    expect(hurt.c.Rivals.m[rowKey(XI[6])]).toEqual([1, 0, 0, 0]);
  });

  it('salts by the order of the league, so two orders of the same clubs deal apart', () => {
    expect(bookSalt(['A', 'B', 'C'])).toBe(bookSalt(['A', 'B', 'C']));
    expect(bookSalt(['A', 'B', 'C'])).not.toBe(bookSalt(['B', 'A', 'C']));
    expect(openBook('laliga|abc')).toEqual({ s: 'laliga|abc', c: {}, my: [] });
  });
});

describe('a late book', () => {
  const clubs = [{ club: 'Alpha', gf: 31 }, { club: 'Beta', gf: 0 }, { club: 'Gamma', gf: 18 }];
  const late = (): LeagueBook => openLateBook(STAMP, 20, clubs, [['p-1', 9, 4], ['p-2', 0, 0], ['p-3', 0, 2]]);

  it('opens holding the first law: every goal from before it is counted unnamed for its club', () => {
    const book = late();
    for (const c of clubs) expect(bookClubGoals(book, c.club)).toEqual({ rows: 0, og: 0, u: c.gf });
    expect(book.r0).toBe(20);
    expect(book.u0).toBe(49);
    expect(book.my).toEqual([]);
    /* Only the men who had a goal or an assist are written down. */
    expect(book.b).toEqual([['p-1', 9, 4], ['p-3', 0, 2]]);
    /* It is written to like any book, and the law goes on holding. */
    creditDeal(book, 'Alpha', dealGoals('late|1', 3, XI, RULES));
    const g = bookClubGoals(book, 'Alpha');
    expect(g.rows + g.og + g.u).toBe(34);
  });

  it('is the same book after a JSON round trip, and both readers accept it', () => {
    const book = late();
    creditCleanSheet(book, 'Beta', XI[0], [XI[2]]);
    creditMine(book, ['p-1']);
    const text = JSON.stringify(book);
    expect(text).not.toContain('null');
    expect(JSON.stringify(roundTrip(book))).toBe(text);
    expect(readBook(roundTrip(book), STAMP)).not.toBeNull();
    expect(liveBook(roundTrip(book), STAMP)).not.toBeNull();
    /* A book opened where a season starts carries none of the three fields. */
    expect(Object.keys(fresh()).sort()).toEqual(['c', 'my', 's']);
  });

  it('is refused whole by the careful reader when one of its three fields is not its shape', () => {
    const bad: Array<[string, (b: Record<string, unknown>) => void]> = [
      ['a round under nought', b => { b.r0 = -1; }],
      ['a round that is not whole', b => { b.r0 = 1.5; }],
      ['a round as text', b => { b.r0 = '20'; }],
      ['a baseline that is no list', b => { b.b = { 'p-1': [9, 4] }; }],
      ['a baseline pair', b => { b.b = [['p-1', 9]]; }],
      ['a baseline with a hole', b => { b.b = [['p-1', null, 4]]; }],
      ['a baseline keyed by a number', b => { b.b = [[7, 9, 4]]; }],
      ['an opening sum under nought', b => { b.u0 = -3; }],
    ];
    for (const [what, hurt] of bad) {
      const raw = roundTrip(late()) as Record<string, unknown>;
      hurt(raw);
      expect(readBook(raw, STAMP), what).toBeNull();
      /* The match week's reader is a stamp and a type check and does not look at them. */
      expect(liveBook(raw, STAMP), what).not.toBeNull();
    }
  });
});

/* Round 1306. A club that cannot field a named eleven: the men its roster has, and empty shirts. The line
   of a position is handed in by the engine; this is the test's own reading of it. Roles only, nobody real. */
const LINE: BookLineOf = pos => (pos === 'GK' ? 'GK' : ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos) ? 'DEF' : ['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos) ? 'MID' : 'ATT');
const shirtsOf = (men: readonly BookMan[]): string[] => men.filter(m => m.e).map(m => `${m.n} ${m.p} ${m.r}`);
const namesOf = (men: readonly BookMan[]): string[] => men.filter(m => !m.e).map(m => m.n);

describe('partialEleven', () => {
  it('is nothing for a roster that holds nobody, and never gives a full roster a shirt', () => {
    expect(partialEleven([], 75, LINE)).toBeNull();
    const bench: BookMan[] = [{ n: 'Spare Back', p: 'CB', r: 70 }, { n: 'Spare Mid', p: 'CM', r: 71 }, { n: 'Spare Striker', p: 'ST', r: 72 }, { n: 'Second Keeper', p: 'GK', r: 60 }];
    const full = partialEleven([...bench, ...XI], 80, LINE);
    expect(full?.keeper?.n).toBe('Keeper');
    expect(shirtsOf(full?.outfield ?? [])).toEqual([]);
    /* The ten a full eleven is picked as: by rating, four of the back line, four of midfield, two forwards. */
    expect(namesOf(full?.outfield ?? [])).toEqual(['Centre Back A', 'Centre Back B', 'Right Back', 'Left Back', 'Number Ten', 'Centre Mid', 'Holder', 'Wide Mid', 'Striker', 'Winger']);
  });

  it('puts an empty shirt in every place the roster cannot fill, the heaviest lines first, at the club\'s strength', () => {
    /* A keeper, three at the back and two in midfield: one back, two midfielders and both forwards are missing. */
    const short: BookMan[] = [XI[0], XI[1], XI[2], XI[3], XI[5], XI[6]];
    const got = partialEleven(short, 74.6, LINE);
    expect(got?.keeper?.n).toBe('Keeper');
    expect(namesOf(got?.outfield ?? [])).toEqual(['Centre Back A', 'Centre Back B', 'Left Back', 'Centre Mid', 'Holder']);
    expect(shirtsOf(got?.outfield ?? [])).toEqual(['?1 ST 75', '?2 ST 75', '?3 CM 75', '?4 CM 75', '?5 CB 75']);
    expect(got?.outfield.length).toBe(10);
    /* One man on file: he holds one place and nine are shirts. He is never handed the others' goals. */
    const one = partialEleven([XI[10]], 61, LINE);
    expect(one?.keeper).toBeNull();
    expect(namesOf(one?.outfield ?? [])).toEqual(['Striker']);
    expect(shirtsOf(one?.outfield ?? [])).toEqual(['?1 ST 61', '?2 CM 61', '?3 CM 61', '?4 CM 61', '?5 CM 61', '?6 CB 61', '?7 CB 61', '?8 CB 61', '?9 CB 61']);
    /* A keeper and nobody else: he is the keeper and all ten outfield places are shirts. */
    const alone = partialEleven([XI[0]], 70, LINE);
    expect(alone?.keeper?.n).toBe('Keeper');
    expect(namesOf(alone?.outfield ?? [])).toEqual([]);
    expect(alone?.outfield.length).toBe(10);
  });

  it('lets the spare men cover the open places from the back, so the shirts stand up front', () => {
    /* Six defenders and no keeper: four hold the back line, two cover two midfield places. */
    const backs = ['A', 'B', 'C', 'D', 'E', 'F'].map<BookMan>((x, i) => ({ n: `Back ${x}`, p: 'CB', r: 80 - i }));
    const got = partialEleven(backs, 72, LINE);
    expect(got?.keeper).toBeNull();
    expect(namesOf(got?.outfield ?? [])).toEqual(['Back A', 'Back B', 'Back C', 'Back D', 'Back E', 'Back F']);
    expect(shirtsOf(got?.outfield ?? [])).toEqual(['?1 ST 72', '?2 ST 72', '?3 CM 72', '?4 CM 72']);
    /* Sixteen outfield men and no keeper: ten named, no shirt at all. */
    const many = Array.from<unknown, BookMan>({ length: 16 }, (_, i) => ({ n: `Man ${i}`, p: i % 3 === 0 ? 'CB' : i % 3 === 1 ? 'CM' : 'ST', r: 60 + i }));
    const sixteen = partialEleven(many, 70, LINE);
    expect(sixteen?.outfield.length).toBe(10);
    expect(shirtsOf(sixteen?.outfield ?? [])).toEqual([]);
  });

  it('takes a name once, as a full eleven does, and leaves the roster as it found it', () => {
    const roster: BookMan[] = [{ n: 'Twin', p: 'GK', r: 70 }, { n: 'Twin', p: 'ST', r: 90 }, { n: 'Other', p: 'ST', r: 60 }];
    const before = JSON.stringify(roster);
    const got = partialEleven(roster, 70, LINE);
    expect(got?.keeper?.p).toBe('GK');
    expect(namesOf(got?.outfield ?? [])).toEqual(['Other']);
    expect(JSON.stringify(roster)).toBe(before);
  });

  it('never gives an empty shirt a row: its goal is unnamed, and it gets no assist and no clean sheet', () => {
    const shirt: BookMan = { n: '?1', p: 'ST', r: 75, e: true };
    const backShirt: BookMan = { n: '?2', p: 'CB', r: 75, e: true };
    const book = fresh();
    expect(creditGoal(book, 'Thin', shirt)).toBe(false);
    creditAssist(book, 'Thin', shirt);
    creditCleanSheet(book, 'Thin', { n: '?3', p: 'GK', r: 75, e: true }, [backShirt, XI[2]]);
    expect(book.c.Thin).toEqual({ m: { [rowKey(XI[2])]: [0, 0, 1, 0] }, og: 0, u: 1 });
    /* A whole deal over a partial eleven: the law holds, no key carries the mark, and a goal that went to a
       shirt paid no assist (assists never outnumber the goals on rows). */
    const part = partialEleven([XI[0], XI[2], XI[6], XI[10]], 78, LINE);
    const deal = Array.from({ length: 400 }, (_, i) => dealGoals(`thin|${i}`, 3, part?.outfield ?? [], RULES)).flat();
    const dealt = fresh();
    creditDeal(dealt, 'Thin', deal);
    const g = bookClubGoals(dealt, 'Thin');
    expect(g.rows + g.og + g.u).toBe(1200);
    expect(g.u).toBeGreaterThan(0);
    expect(Object.keys(dealt.c.Thin.m).every(key => !key.startsWith('?'))).toBe(true);
    expect(Object.keys(dealt.c.Thin.m).sort()).toEqual([rowKey(XI[2]), rowKey(XI[6]), rowKey(XI[10])].sort());
    const rows = bookRows(dealt);
    expect(rows.reduce((n, r) => n + r.assists, 0)).toBeLessThanOrEqual(g.rows);
    expect(readBook(roundTrip(dealt), STAMP)).not.toBeNull();
    /* Every assist paid is for a goal a named man scored: a shirt's goal is in `u` and pays nothing. */
    const paid = deal.filter(x => x.kind === 'open' && x.scorer && !x.scorer.e && x.assist && !x.assist.e).length;
    expect(rows.reduce((n, r) => n + r.assists, 0)).toBe(paid);
  });

  it('deals a named man the share his own place earns, inside four standard deviations, and no more', () => {
    /* One striker on file at a club of strength 75: nine shirts stand beside him. He is the heaviest man,
       so the set pieces are his; of open play he gets his weight over the whole ten's. */
    const part = partialEleven([{ n: 'Lone Striker', p: 'ST', r: 80 }], 75, LINE);
    const ten = part?.outfield ?? [];
    const total = ten.reduce((s, m) => s + goalWeight(m.p, m.r), 0);
    const open = 1 - RULES.pen - RULES.fk;
    const og = open / RULES.ownGoalOneIn;
    const p = (open - og) * goalWeight('ST', 80) / total + RULES.pen + RULES.fk;
    const n = 6000;
    const book = fresh();
    for (let i = 0; i < n; i += 1) creditDeal(book, 'Thin', dealGoals(`lone|${i}`, 1, ten, RULES));
    const g = bookClubGoals(book, 'Thin');
    expect(g.rows + g.og + g.u).toBe(n);
    expect(Math.abs(g.rows - n * p)).toBeLessThan(4 * sd(n, p));
    /* And nowhere near every goal: the literal reading (all of them his) is what this rule is not. */
    expect(g.rows).toBeLessThan(n * 0.6);
  });
});

/* Round 1311: the league leaders card prints a worked example from dealShares, never from typed numbers.
   This holds dealShares to what dealGoals really deals for the same eleven, and shows the check can tell
   the taker rule on from off. */
describe('dealShares', () => {
  it('is what dealGoals deals on average, own goals and the taker included', () => {
    const { men, ownGoals } = dealShares(XI, RULES);
    expect(men.reduce((s, m) => s + m.share, 0) + ownGoals).toBeCloseTo(1, 9);
    const N = 20000;
    const got = new Map<string, number>();
    let og = 0;
    let pieces = 0;
    for (let k = 0; k < N; k += 1) {
      const [g] = dealGoals(`shares|${k}`, 1, XI, RULES);
      if (g.kind === 'og') { og += 1; continue; }
      if (g.kind !== 'open') pieces += 1;
      if (g.scorer) got.set(g.scorer.n, (got.get(g.scorer.n) ?? 0) + 1);
    }
    for (const m of men) expect(Math.abs((got.get(m.man.n) ?? 0) - N * m.share)).toBeLessThan(4 * sd(N, m.share));
    expect(Math.abs(og - N * ownGoals)).toBeLessThan(4 * sd(N, ownGoals));
    const taker = men.find(m => m.setPieces > 0);
    expect(taker?.man).toBe(takerOf(XI));
    expect(Math.abs(pieces - N * taker!.setPieces)).toBeLessThan(4 * sd(N, taker!.setPieces));
    /* The same sample against the taker rule switched off: his share is told apart. */
    const off = dealShares(XI, BY_WEIGHT).men.find(m => m.man === taker!.man)!;
    expect(Math.abs((got.get(taker!.man.n) ?? 0) - N * off.share)).toBeGreaterThan(4 * sd(N, off.share));
  });
});
