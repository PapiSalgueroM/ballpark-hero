import { describe, expect, it, vi } from 'vitest';
import {
  buildDraftOrder, draftRulesFor, draftSeasonKey, draftSlots, isSavedDraftOrder, lotteryField, lotteryRefusal, nextSlot,
  ownSlots, rivalChoice, slotsLeftFor, slotsUntil, standingOrder,
  type DraftClubRow, type DraftSeason, type SavedDraftOrder,
} from './gmDraftOrder';
import { NBA_PICK_RULES, awardPick, movePicks, newLedger, pickKey, runLottery, type GmPickRules } from './gmPicks';
import { keyedRng } from './keyedRng';
import { GM_DRAFT_ORDER_RULES, NBA_DRAFT_ORDER_2019, type GmDraftOrderRules } from '@/data/gmDraftOrder/rules';

/* The 2025-26 standings as the league's tiebreak release of 20 April 2026
   printed them, lottery clubs first. The addresses are in the ledger
   (scripts/data/gmDraftOrderSources.json, facts levelOdds and levelAcross). */
const LOTTERY_2026: [string, number, number][] = [
  ['WAS', 17, 65], ['IND', 19, 63], ['BKN', 20, 62], ['UTA', 22, 60], ['SAC', 22, 60], ['MEM', 25, 57], ['NOP', 26, 56],
  ['DAL', 26, 56], ['CHI', 31, 51], ['MIL', 32, 50], ['GSW', 37, 45], ['LAC', 42, 40], ['MIA', 43, 39], ['CHA', 44, 38],
];
const PLAYOFF_2026: [string, number, number][] = [
  ['POR', 42, 40], ['PHX', 45, 37], ['PHI', 45, 37], ['ORL', 45, 37], ['TOR', 46, 36], ['ATL', 46, 36], ['MIN', 49, 33],
  ['HOU', 52, 30], ['CLE', 52, 30], ['NYK', 53, 29], ['LAL', 53, 29], ['DEN', 54, 28], ['BOS', 56, 26], ['DET', 60, 22],
  ['SAS', 62, 20], ['OKC', 64, 18],
];
const rows2026: DraftClubRow[] = [
  ...LOTTERY_2026.map(([id, wins, losses]) => ({ id, wins, losses, made: false })),
  ...PLAYOFF_2026.map(([id, wins, losses]) => ({ id, wins, losses, made: true })),
];
const season2026: DraftSeason = { sport: 'nba', draftYear: 2027, rows: rows2026 };
const ids2026 = rows2026.map(r => r.id);
const NBA = NBA_DRAFT_ORDER_2019;

/* n clubs, the first `missed` out of the playoffs, all with different records. */
function plainSeason(n: number, missed: number, sport = 'toy'): DraftSeason {
  return {
    sport, draftYear: 2030,
    rows: Array.from({ length: n }, (_, i) => ({ id: `T${String(i + 1).padStart(2, '0')}`, wins: 10 + i, losses: 72 - i, made: i >= missed })),
  };
}

describe('the rule sets are whole', () => {
  it('gives every fact one key, names only facts it has as a lottery need, and ships no address', () => {
    for (const sets of Object.values(GM_DRAFT_ORDER_RULES)) {
      for (const r of sets) {
        const keys = r.facts.map(f => f.key);
        expect(new Set(keys).size, r.id).toBe(keys.length);
        for (const need of r.lottery?.needs ?? []) expect(keys, `${r.id} needs ${need}`).toContain(need);
        for (const f of r.facts) expect(f.on, `${r.id} ${f.key}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(JSON.stringify(r)).not.toMatch(/https?:|www\./);
      }
    }
  });

  it('covers every draft the game plays from its first, with no gap, and keeps the two spans apart', () => {
    for (let year = 2027; year <= 2060; year += 1) expect(draftRulesFor('nba', year)?.id, String(year)).toBe('nba-2019');
    expect(draftRulesFor('nba', 2027)).toBeDefined();
    expect(draftRulesFor('nba', 2026)).toBeNull();
    expect(draftRulesFor('cricket', 2030)).toBeNull();
    /* The league stopped using this table before the game's first draft: two different statements. */
    expect(NBA.real).toEqual({ from: 2019, to: 2026 });
    expect(NBA.plays.from).toBeGreaterThan(NBA.real.to!);
  });

  it('is read against the table the pick rules carry, in whole combinations', () => {
    const table = NBA_PICK_RULES.lottery!;
    expect(NBA.lottery!.table).toBe(table.table);
    expect(lotteryRefusal(NBA, table, table.clubs)).toBeNull();
    for (const pct of table.odds) expect(Number.isInteger(Math.round(pct * 10 * 1e6) / 1e6)).toBe(true);
  });
});

describe('the 2026 night, as the league printed it', () => {
  const key = draftSeasonKey(season2026, NBA.id);
  const missed = standingOrder(rows2026.filter(r => !r.made), key);
  const field = lotteryField(missed.order, missed.level, NBA, NBA_PICK_RULES.lottery!);
  const pct = (club: string) => Math.round(field.find(f => f.club === club)!.pct * 100) / 100;

  it('splits level lottery clubs as the league did: 11.5 each, and 6.8 with 6.7', () => {
    expect([pct('UTA'), pct('SAC')]).toEqual([11.5, 11.5]);
    const pair = missed.level.find(g => g.includes('NOP'))!;
    expect(pair.slice().sort()).toEqual(['DAL', 'NOP']);
    /* The winner of the drawing is the higher seed and holds the odd combination. */
    expect(pct(pair[0])).toBe(6.8);
    expect(pct(pair[1])).toBe(6.7);
    expect(field.findIndex(f => f.club === pair[0])).toBe(6);
    expect(Math.round(field.reduce((sum, f) => sum + f.pct, 0) * 1e6) / 1e6).toBe(100);
    expect(field.slice(0, 3).map(f => [f.club, f.pct])).toEqual([['WAS', 14], ['IND', 14], ['BKN', 14]]);
  });

  it('orders round one and round two as the league does', () => {
    const order = buildDraftOrder(season2026, NBA, NBA_PICK_RULES);
    expect(order.plain).toBeNull();
    expect(order.lottery!.wins.length).toBe(4);
    /* Round one: the 14 lottery clubs, then the playoff clubs by record, the worst playoff record 15th. */
    expect(order.first.slice(0, 14).slice().sort()).toEqual(LOTTERY_2026.map(r => r[0]).sort());
    expect(order.first[14]).toBe('POR');
    expect(order.first[29]).toBe('OKC');
    /* Round two is record over all thirty, whatever the lottery did. */
    expect(order.later.slice(0, 3)).toEqual(['WAS', 'IND', 'BKN']);
    expect(order.later[5]).toBe('MEM');
    expect(order.later.slice(8, 11)).toEqual(['CHI', 'MIL', 'GSW']);
    /* Level across the line: the lottery club is ahead in round one, so the playoff club is ahead in round two (42nd and 43rd). */
    expect(order.later.slice(11, 15)).toEqual(['POR', 'LAC', 'MIA', 'CHA']);
    /* Level inside the field: round two is the reverse of round one AFTER the lottery. */
    for (const [a, b, at] of [['UTA', 'SAC', 3], ['NOP', 'DAL', 6]] as const) {
      const firstOfTwo = order.first.indexOf(a) < order.first.indexOf(b) ? a : b;
      const other = firstOfTwo === a ? b : a;
      expect(order.later.slice(at, at + 2)).toEqual([other, firstOfTwo]);
    }
    /* Level outside the field, a group of three: fully inverted (16 to 18, then 46 to 48). */
    const three = order.first.slice(15, 18);
    expect(three.slice().sort()).toEqual(['ORL', 'PHI', 'PHX']);
    expect(order.later.slice(15, 18)).toEqual([...three].reverse());
    expect(order.later[29]).toBe('OKC');
    expect(isSavedDraftOrder(order, ids2026)).toBe(true);
  });

  it('draws the lottery once on its own keyed stream, and nothing else moves it', () => {
    const order = buildDraftOrder(season2026, NBA, NBA_PICK_RULES);
    const byHand = runLottery(missed.order, { ...NBA_PICK_RULES.lottery!, odds: field.map(f => f.pct) }, keyedRng(`${key}|lottery`));
    expect(order.lottery!.wins).toEqual(byHand.wins);
    expect(order.first.slice(0, 14)).toEqual(byHand.order);
    const spy = vi.spyOn(Math, 'random');
    const again = buildDraftOrder(season2026, NBA, NBA_PICK_RULES);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(again).toEqual(order);
    expect(JSON.parse(JSON.stringify(order))).toEqual(order);
    /* Another year is another night; the same year is the same night. */
    expect(draftSeasonKey({ ...season2026, draftYear: 2028 }, NBA.id)).not.toBe(key);
    expect(draftSeasonKey({ ...season2026, rows: [...rows2026].reverse() }, NBA.id)).toBe(key);
  });
});

describe('fail closed: no lottery is drawn on a rule that cannot carry one', () => {
  const season = plainSeason(30, 14, 'nba');
  const plainFirst = season.rows.map(r => r.id);
  const cases: [string, GmDraftOrderRules, GmPickRules, DraftSeason, SavedDraftOrder['plain']][] = [
    ['a thin fact', { ...NBA, facts: NBA.facts.map(f => (f.key === 'draws' ? { ...f, thin: true as const } : f)) }, NBA_PICK_RULES, season, 'thin-rule'],
    ['a missing fact', { ...NBA, facts: NBA.facts.filter(f => f.key !== 'table') }, NBA_PICK_RULES, season, 'thin-rule'],
    ['another table', NBA, { ...NBA_PICK_RULES, lottery: { ...NBA_PICK_RULES.lottery!, table: 'the 2030 draft' } }, season, 'table'],
    ['no table', NBA, { ...NBA_PICK_RULES, lottery: null }, season, 'table'],
    ['a field of another size', NBA, NBA_PICK_RULES, plainSeason(30, 12, 'nba'), 'field-size'],
    ['a league with none', { ...NBA, lottery: null }, NBA_PICK_RULES, season, 'no-lottery'],
  ];
  for (const [name, rules, pickRules, s, why] of cases) {
    it(`${name}: plain reverse standings, and the order says why`, () => {
      const order = buildDraftOrder(s, rules, pickRules);
      expect(order.plain).toBe(why);
      expect(order.lottery).toBeNull();
      expect(order.first).toEqual(plainFirst);
      expect(order.later).toEqual(plainFirst);
      expect(isSavedDraftOrder(order, plainFirst)).toBe(true);
    });
  }
});

describe('a league that orders by class and keeps its later rounds off the lottery', () => {
  const CLASS: GmDraftOrderRules = {
    ...NBA, id: 'toy-class', sport: 'toy', plays: { from: 2000, to: null },
    lottery: { table: 'toy table', combinations: null, needs: [] },
    restOfFirst: 'class', laterRounds: 'first-before-lottery', level: { odds: 'keep', later: 'as-first' }, facts: [],
  };
  const PICKS: GmPickRules = { ...NBA_PICK_RULES, sport: 'nhl', lottery: { clubs: 4, odds: [40, 30, 20, 10], draws: 2, maxClimb: 2, table: 'toy table' } };
  const season: DraftSeason = {
    sport: 'toy', draftYear: 2030,
    rows: [
      { id: 'A', wins: 1, losses: 9, made: false }, { id: 'B', wins: 2, losses: 8, made: false },
      { id: 'C', wins: 3, losses: 7, made: false }, { id: 'D', wins: 4, losses: 6, made: false },
      /* The champion has the WORST record of the four that made it and still picks last. */
      { id: 'W', wins: 5, losses: 5, made: true, cls: 3 }, { id: 'X', wins: 9, losses: 1, made: true, cls: 1 },
      { id: 'Y', wins: 8, losses: 2, made: true, cls: 1 }, { id: 'Z', wins: 7, losses: 3, made: true, cls: 2 },
    ],
  };

  it('puts the champion last, the earliest exits first, and leaves later rounds as round one stood before the lottery', () => {
    const order = buildDraftOrder(season, CLASS, PICKS);
    expect(order.plain).toBeNull();
    expect(order.first.slice(4)).toEqual(['Y', 'X', 'Z', 'W']);
    expect(order.later).toEqual(['A', 'B', 'C', 'D', 'Y', 'X', 'Z', 'W']);
    /* A capped climb: nobody sits more than two places above its seed. */
    for (const w of order.lottery!.wins) expect(w.seed - w.slot).toBeLessThanOrEqual(2);
    expect(order.lottery!.field.map(f => f.pct)).toEqual([40, 30, 20, 10]);
  });

  it("uses the league's tiebreak values before any drawing", () => {
    const level: DraftClubRow[] = [
      { id: 'A', wins: 5, losses: 5, made: false, tie: [0.6] }, { id: 'B', wins: 5, losses: 5, made: false, tie: [0.4] },
      { id: 'C', wins: 5, losses: 5, made: false, tie: [0.5] },
    ];
    const got = standingOrder(level, 'k');
    expect(got.order).toEqual(['B', 'C', 'A']);
    expect(got.level).toEqual([]);
  });
});

describe('level records outside the lottery', () => {
  it('never moves a club outside its group, and one group never moves another', () => {
    const rows: DraftClubRow[] = [
      { id: 'A', wins: 1, losses: 9, made: true }, { id: 'B', wins: 3, losses: 7, made: true }, { id: 'C', wins: 3, losses: 7, made: true },
      { id: 'D', wins: 5, losses: 5, made: true }, { id: 'E', wins: 7, losses: 3, made: true }, { id: 'F', wins: 7, losses: 3, made: true },
    ];
    const seen = new Set<string>();
    for (let k = 0; k < 200; k += 1) {
      const got = standingOrder(rows, `key-${k}`);
      expect([got.order[0], got.order[3]]).toEqual(['A', 'D']);
      expect(got.order.slice(1, 3).slice().sort()).toEqual(['B', 'C']);
      expect(got.order.slice(4, 6).slice().sort()).toEqual(['E', 'F']);
      expect(got.level.map(g => g.slice().sort())).toEqual([['B', 'C'], ['E', 'F']]);
      /* One group's drawing is keyed to that group: taking the other tie away leaves it as it was. */
      const alone = standingOrder(rows.map(r => (r.id === 'F' ? { ...r, wins: 8, losses: 2 } : r)), `key-${k}`);
      expect(alone.order.slice(1, 3)).toEqual(got.order.slice(1, 3));
      seen.add(got.order.slice(1, 3).join(''));
    }
    expect([...seen].sort()).toEqual(['BC', 'CB']);
  });
});

describe('a saved order is trusted only whole', () => {
  const good = buildDraftOrder(season2026, NBA, NBA_PICK_RULES);
  const bad = (edit: (o: SavedDraftOrder) => void) => {
    const copy = JSON.parse(JSON.stringify(good)) as SavedDraftOrder;
    edit(copy);
    return isSavedDraftOrder(copy, ids2026);
  };

  it('accepts what it built, after JSON, and an order drawn under a rule id this build no longer knows', () => {
    expect(isSavedDraftOrder(JSON.parse(JSON.stringify(good)), ids2026)).toBe(true);
    expect(bad(o => { o.rulesId = 'nba-1990'; })).toBe(true);
  });

  it('refuses every corruption', () => {
    expect(isSavedDraftOrder(null, ids2026)).toBe(false);
    expect(isSavedDraftOrder(good, ids2026.slice(1))).toBe(false);
    expect(bad(o => { (o as { v: number }).v = 2; })).toBe(false);
    expect(bad(o => { o.first[3] = o.first[2]; })).toBe(false);
    expect(bad(o => { o.later.pop(); })).toBe(false);
    expect(bad(o => { o.rulesId = ''; })).toBe(false);
    expect(bad(o => { o.plain = 'thin-rule'; })).toBe(false);
    expect(bad(o => { o.lottery!.wins[0].club = 'OKC'; })).toBe(false);
    expect(bad(o => { o.lottery!.wins[1].draw = 1; })).toBe(false);
    expect(bad(o => { o.lottery!.field[2].seed = 9; })).toBe(false);
    expect(bad(o => { o.lottery!.field[2].pct = Number.NaN; })).toBe(false);
    expect(bad(o => { o.lottery!.wins[1].club = o.lottery!.wins[0].club; })).toBe(false);
    /* A playoff club inside the lottery's slots. */
    expect(bad(o => { const a = o.first.indexOf('OKC'); [o.first[0], o.first[a]] = [o.first[a], o.first[0]]; })).toBe(false);
    expect(bad(o => { o.level.push(['WAS']); })).toBe(false);
    expect(bad(o => { o.lottery = null; })).toBe(false);
    expect(bad(o => { o.lottery = null; (o as { plain: unknown }).plain = 'because'; })).toBe(false);
  });
});

describe('slots over a pick ledger', () => {
  const order = buildDraftOrder(season2026, NBA, NBA_PICK_RULES);
  const fresh = newLedger(ids2026, 2026, NBA_PICK_RULES);

  it('uses every pick once, by its holder, at the place of its first owner', () => {
    const untouched = draftSlots(order, fresh, 2026, 2);
    expect(untouched.length).toBe(60);
    expect(untouched.map(s => s.overall)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(untouched.slice(0, 30).map(s => s.orig)).toEqual(order.first);
    expect(untouched.slice(30).map(s => s.orig)).toEqual(order.later);
    expect(untouched.every(s => s.holder === s.orig && s.kind === 'std')).toBe(true);

    /* OKC buys the worst record's first; BOS sells both of its picks to WAS. */
    let ledger = movePicks(fresh, [pickKey({ year: 2026, round: 1, orig: 'WAS' })], 'OKC');
    ledger = movePicks(ledger, [pickKey({ year: 2026, round: 1, orig: 'BOS' }), pickKey({ year: 2026, round: 2, orig: 'BOS' })], 'WAS');
    const slots = draftSlots(order, ledger, 2026, 2);
    expect(slots.map(s => s.orig)).toEqual(untouched.map(s => s.orig));
    const wasFirst = slots.find(s => s.round === 1 && s.orig === 'WAS')!;
    expect(wasFirst.holder).toBe('OKC');
    expect(wasFirst.overall).toBe(order.first.indexOf('WAS') + 1);
    expect(slotsLeftFor(slots, 0, 'BOS')).toEqual([]);
    expect(slotsLeftFor(slots, 0, 'WAS').map(s => s.orig)).toEqual(['BOS', 'WAS', 'BOS']);
    expect(slotsLeftFor(slots, 0, 'OKC').length).toBe(3);
    /* Another year's picks are not this draft's. */
    expect(draftSlots(order, ledger, 2027, 2).every(s => s.holder === s.orig)).toBe(true);
  });

  it('walks the clock: every slot once, and a run never holds the club it stops for', () => {
    const slots = draftSlots(order, fresh, 2026, 2);
    const me = order.first[11];
    const run = slotsUntil(slots, 0, me);
    expect(run.length).toBe(11);
    expect(run.some(s => s.holder === me)).toBe(false);
    expect(nextSlot(slots, run.length)!.holder).toBe(me);
    const after = slotsUntil(slots, 12, me);
    expect(after[0].overall).toBe(13);
    expect(nextSlot(slots, 12 + after.length)!.holder).toBe(me);
    expect(slotsUntil(slots, 12 + after.length + 1, me).length).toBe(60 - (12 + after.length + 1));
    expect(nextSlot(slots, 60)).toBeNull();
    expect(nextSlot(slots, -1)).toBeNull();
  });

  it('closes a round with an awarded pick, marks a guessed first owner, and plays the rounds the game has', () => {
    const awarded = awardPick(fresh, 2026, 1, 'DEN', 'comp');
    const slots = draftSlots(order, awarded, 2026, 2);
    expect(slots.length).toBe(61);
    expect(slots[30]).toMatchObject({ overall: 31, round: 1, slot: 31, orig: 'DEN', holder: 'DEN', kind: 'comp' });
    expect(slots[31]).toMatchObject({ overall: 32, round: 2, slot: 1 });
    const guessed = { v: 1 as const, picks: fresh.picks.map(p => (p.year === 2026 && p.round === 2 && p.orig === 'MIA' ? { ...p, origUnknown: true as const } : p)) };
    expect(draftSlots(order, guessed, 2026, 2).filter(s => s.origUnknown).map(s => `${s.round}:${s.orig}`)).toEqual(['2:MIA']);
    expect(draftSlots(order, fresh, 2026, 1).length).toBe(30);
  });

  it('lays a plain list of clubs out as slots where holder and first owner are one club', () => {
    const slots = ownSlots(['A', 'B', 'C'], 2);
    expect(slots.map(s => `${s.overall}:${s.round}:${s.slot}:${s.holder}`)).toEqual(['1:1:1:A', '2:1:2:B', '3:1:3:C', '4:2:1:A', '5:2:2:B', '6:2:3:C']);
    expect(slots.every(s => s.orig === s.holder)).toBe(true);
  });
});

describe('the choice of a rival club', () => {
  interface Man { id: string; read: number; pos: string }
  const h = { read: (p: Man) => p.read, pos: (p: Man) => p.pos, id: (p: Man) => p.id };
  const board: Man[] = [
    { id: 'p3', read: 80, pos: 'G' }, { id: 'p1', read: 78, pos: 'C' }, { id: 'p2', read: 80, pos: 'F' }, { id: 'p4', read: 70, pos: 'C' },
  ];

  it('takes the best read, gives a level call to the lower id, and draws nothing', () => {
    const spy = vi.spyOn(Math, 'random');
    expect(rivalChoice(board, h, {}, 3)?.id).toBe('p2');
    expect(rivalChoice([], h, {}, 3)).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('lets need split men whose reads are close, and never pass a clearly better man', () => {
    expect(rivalChoice(board, h, { C: 1 }, 3)?.id).toBe('p1');
    expect(rivalChoice(board, h, { C: 0.5 }, 3)?.id).toBe('p2');
    expect(rivalChoice([board[0], board[3]], h, { C: 1 }, 3)?.id).toBe('p3');
  });
});
