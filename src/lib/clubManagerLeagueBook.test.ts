import { describe, expect, it } from 'vitest';
import { goalWeight } from '@/lib/clubManagerGoalWeight';
import {
  BOOK_ROWS_PER_CLUB, bookClubGoals, bookRows, bookSalt, creditAssist, creditCleanSheet, creditDeal, creditGoal,
  creditMine, creditOwnGoal, dealAssist, dealGoals, liveBook, openBook, readBook, rowKey, takerOf,
  type BookMan, type BookRules, type LeagueBook,
} from '@/lib/clubManagerLeagueBook';

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
const STAMP = '1|premier';
const fresh = (): LeagueBook => openBook(STAMP, bookSalt(['A', 'B', 'C']));
const sd = (n: number, p: number): number => Math.sqrt(n * p * (1 - p));
const roundTrip = (book: LeagueBook): unknown => JSON.parse(JSON.stringify(book));

describe('dealGoals', () => {
  it('deals the same goals for the same key, every time, and another key deals others', () => {
    const a = dealGoals('k|1', 7, XI, RULES);
    expect(dealGoals('k|1', 7, XI, RULES)).toEqual(a);
    const many = (key: string): string => Array.from({ length: 40 }, (_, i) => dealGoals(`${key}|${i}`, 3, XI, RULES).map(g => g.scorer?.n ?? g.kind).join(',')).join(';');
    expect(many('one')).not.toEqual(many('two'));
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
    expect(book.my).toEqual({ 'p-keeper': 1, 'p-back': 1 });
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
    expect(readBook(good, '2|premier')).toBeNull();
    expect(readBook(good, '1|laliga')).toBeNull();
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
    expect(readBook(broken(b => { b.my = { 'p-1': 'two' }; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { b.c = []; }), STAMP)).toBeNull();
    expect(readBook(broken(b => { delete b.k; }), STAMP)).toBeNull();
  });

  it('salts by the order of the league, so two orders of the same clubs deal apart', () => {
    expect(bookSalt(['A', 'B', 'C'])).toBe(bookSalt(['A', 'B', 'C']));
    expect(bookSalt(['A', 'B', 'C'])).not.toBe(bookSalt(['B', 'A', 'C']));
    expect(openBook('3|laliga', 'abc')).toEqual({ s: '3|laliga', k: 'abc', c: {}, my: {} });
  });
});
