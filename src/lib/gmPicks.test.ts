import { describe, expect, it } from 'vitest';
import {
  GM_PICK_RULES, MLB_PICK_RULES, NBA_PICK_RULES, NFL_PICK_RULES, NHL_PICK_RULES,
  awardPick, compensatoryAwards, draftOrder, ledgerCensus, ledgerProblems, migrateLegacyPicks,
  movePicks, newLedger, pickKey, pickRefusal, pickSwapRefusal, picksHeldBy, reverseStandings,
  rollLedger, roundSlots, runLottery, validateLedger,
} from './gmPicks';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `T${String(i + 1).padStart(2, '0')}`);
const seeded = (s: number) => () => {
  s = (s * 1664525 + 1013904223) >>> 0;
  return s / 4294967296;
};

describe('the rule sets are whole', () => {
  it('every lottery table sums to 100 and has a number per club', () => {
    for (const rules of Object.values(GM_PICK_RULES)) {
      if (!rules.lottery) continue;
      expect(rules.lottery.odds.length).toBe(rules.lottery.clubs);
      expect(rules.lottery.odds.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 6);
      for (let i = 1; i < rules.lottery.odds.length; i++) {
        expect(rules.lottery.odds[i]).toBeLessThanOrEqual(rules.lottery.odds[i - 1]);
      }
    }
  });
  it('an ordinary MLB pick cannot be traded and the reason comes from the rules', () => {
    const lg = newLedger(ids(4), 2026, MLB_PICK_RULES);
    expect(pickRefusal(lg, MLB_PICK_RULES, 2026, 'T01', '2026:1:T01')).toMatch(/Only competitive balance picks/);
    expect(pickRefusal(lg, NFL_PICK_RULES, 2026, 'T01', '2026:1:T01')).toBeNull();
  });
});

describe('a fresh ledger', () => {
  it('holds clubs x rounds in every year carried, and nothing is wrong with it', () => {
    for (const rules of Object.values(GM_PICK_RULES)) {
      const t = ids(30);
      const lg = newLedger(t, 2026, rules);
      expect(ledgerProblems(lg, t, 2026, rules)).toEqual([]);
      const census = ledgerCensus(lg);
      expect(Object.keys(census).length).toBe(rules.ledgerYears);
      for (const n of Object.values(census)) expect(n).toBe(30 * rules.rounds);
    }
  });
  it('rolls: the draft held leaves, a new far year arrives, traded picks stay traded', () => {
    const t = ids(6);
    let lg = newLedger(t, 2026, NFL_PICK_RULES);
    lg = movePicks(lg, ['2027:1:T01'], 'T02');
    const rolled = rollLedger(lg, t, 2026, NFL_PICK_RULES);
    expect(ledgerProblems(rolled, t, 2027, NFL_PICK_RULES)).toEqual([]);
    expect(picksHeldBy(rolled, 'T02', 2027).filter(p => p.round === 1).length).toBe(2);
    expect(rolled.picks.some(p => p.year === 2026)).toBe(false);
  });
});

describe('migration from the old number[]', () => {
  it('keeps every marker, per holder and per round', () => {
    const teams = {
      A: { picks: [1, 2, 3, 3] }, B: { picks: [1, 2] }, C: { picks: [1, 2, 3] }, D: { picks: [2, 3] }, E: { picks: [1, 1, 2, 3] },
    };
    const m = migrateLegacyPicks(teams, 2026, NFL_PICK_RULES);
    expect(m.markers).toBe(15);
    expect(m.ignored).toBe(0);
    for (const [id, t] of Object.entries(teams)) {
      for (const round of [1, 2, 3]) {
        const had = t.picks.filter(r => r === round).length;
        const has = picksHeldBy(m.ledger, id, 2026).filter(p => p.round === round).length;
        expect(has).toBe(had);
      }
    }
    expect(m.ledger.picks.find(p => p.holder === 'A' && p.orig === 'B' && p.round === 3)).toBeTruthy();
    expect(m.ledger.picks.find(p => p.holder === 'E' && p.orig === 'D' && p.round === 1)).toBeTruthy();
    expect(validateLedger(JSON.parse(JSON.stringify(m.ledger)), Object.keys(teams))).not.toBeNull();
  });
  it('does not invent a pick nobody held, and counts what it could not read', () => {
    const m = migrateLegacyPicks({ A: { picks: [1, 'x', 9] }, B: { picks: [2] }, C: {} }, 2026, NBA_PICK_RULES);
    expect(m.markers).toBe(2);
    expect(m.ignored).toBe(2);
    expect(m.ledger.picks.filter(p => p.year === 2026 && p.round === 1).length).toBe(1);
  });
  it('a save written mid draft, every dealt marker spent, does not get its picks back', () => {
    const spent = { A: { picks: [] as number[] }, B: { picks: [3] } };
    const told = migrateLegacyPicks(spent, 2026, NFL_PICK_RULES, 3);
    expect(told.ledger.picks.filter(p => p.year === 2026 && p.round <= 3).length).toBe(1);
    expect(told.ledger.picks.filter(p => p.year === 2026 && p.round === 4).length).toBe(2);
    const guessed = migrateLegacyPicks({ A: { picks: [] }, B: { picks: [] } }, 2026, NFL_PICK_RULES);
    expect(guessed.ledger.picks.filter(p => p.year === 2026).length).toBe(14);
    const toldEmpty = migrateLegacyPicks({ A: { picks: [] }, B: { picks: [] } }, 2026, NFL_PICK_RULES, 3);
    expect(toldEmpty.ledger.picks.filter(p => p.year === 2026).length).toBe(8);
  });
  it('an extra nobody is missing is kept and flagged', () => {
    const m = migrateLegacyPicks({ A: { picks: [1, 1, 2] }, B: { picks: [1, 2] } }, 2026, NBA_PICK_RULES);
    expect(m.markers).toBe(5);
    expect(m.unknownOrig).toBe(1);
    expect(picksHeldBy(m.ledger, 'A', 2026).filter(p => p.round === 1).length).toBe(2);
    expect(new Set(m.ledger.picks.map(pickKey)).size).toBe(m.ledger.picks.length);
  });
});

describe('a corrupt block', () => {
  it('reads as null and nothing else', () => {
    const t = ids(4);
    const good = newLedger(t, 2026, NHL_PICK_RULES);
    expect(validateLedger(good, t)).not.toBeNull();
    expect(validateLedger(null, t)).toBeNull();
    expect(validateLedger({ v: 2, picks: [] }, t)).toBeNull();
    expect(validateLedger({ v: 1, picks: [{ year: 2026, round: 1, orig: 'T01', holder: 'ZZ' }] }, t)).toBeNull();
    expect(validateLedger({ v: 1, picks: [...good.picks, good.picks[0]] }, t)).toBeNull();
  });
});

describe('the consecutive firsts rule', () => {
  const t = ids(4);
  it('refuses the deal that leaves a club without a first two drafts running', () => {
    const lg = newLedger(t, 2026, NBA_PICK_RULES);
    expect(pickSwapRefusal(lg, NBA_PICK_RULES, 2026, 'T01', ['2027:1:T01'], 'T02', [])).toBeNull();
    const one = movePicks(lg, ['2027:1:T01'], 'T02');
    expect(pickSwapRefusal(one, NBA_PICK_RULES, 2026, 'T01', ['2028:1:T01'], 'T02', [])).toMatch(/two drafts running/);
    expect(pickSwapRefusal(one, NBA_PICK_RULES, 2026, 'T01', ['2029:1:T01'], 'T02', [])).toBeNull();
  });
  it('lets an acquired first stand in', () => {
    let lg = newLedger(t, 2026, NBA_PICK_RULES);
    lg = movePicks(lg, ['2027:1:T01'], 'T02');
    lg = movePicks(lg, ['2028:1:T03'], 'T01');
    expect(pickSwapRefusal(lg, NBA_PICK_RULES, 2026, 'T01', ['2028:1:T01'], 'T02', [])).toBeNull();
  });
  it('does not exist where the league has no such rule', () => {
    const lg = movePicks(newLedger(t, 2026, NFL_PICK_RULES), ['2027:1:T01'], 'T02');
    expect(pickSwapRefusal(lg, NFL_PICK_RULES, 2026, 'T01', ['2028:1:T01'], 'T02', [])).toBeNull();
  });
});

describe('the order', () => {
  it('reverse standings puts the worst club first and is stable', () => {
    const rows = [
      { id: 'A', wins: 10, losses: 7 }, { id: 'B', wins: 3, losses: 14 },
      { id: 'C', wins: 3, losses: 14, diff: -90 }, { id: 'D', wins: 12, losses: 5 },
    ];
    expect(reverseStandings(rows)).toEqual(['C', 'B', 'A', 'D']);
  });
  it('no lottery: the order is the standings', () => {
    const o = draftOrder(['A', 'B', 'C'], ['D', 'E'], NFL_PICK_RULES, seeded(1));
    expect(o.firstRound).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(o.lottery).toBeNull();
  });
  it('a capped climb stops ten places up and the worst club keeps the first pick', () => {
    const pool = ids(16);
    for (let s = 1; s <= 400; s++) {
      const r = runLottery(pool, NHL_PICK_RULES.lottery!, seeded(s));
      expect([...r.order].sort()).toEqual([...pool].sort());
      for (const w of r.wins) expect(w.seed - w.slot).toBeLessThanOrEqual(10);
      expect(pool.indexOf(r.order[0])).toBeLessThanOrEqual(10);
    }
  });
  it('four draws: nobody outside the winners climbs, and the worst club picks fifth at worst', () => {
    const pool = ids(14);
    for (let s = 1; s <= 400; s++) {
      const r = runLottery(pool, NBA_PICK_RULES.lottery!, seeded(s));
      expect(r.wins.length).toBe(4);
      expect(r.order.indexOf('T01')).toBeLessThanOrEqual(4);
      const rest = r.order.slice(4);
      expect(rest).toEqual(pool.filter(c => rest.includes(c)));
    }
  });
  it('a round is picked by whoever holds each pick, awarded picks last', () => {
    const t = ids(3);
    let lg = movePicks(newLedger(t, 2026, NFL_PICK_RULES), ['2026:3:T01'], 'T03');
    lg = awardPick(lg, 2026, 3, 'T02', 'comp');
    const slots = roundSlots(lg, 2026, 3, ['T01', 'T02', 'T03']);
    expect(slots.map(s => s.pick.holder)).toEqual(['T03', 'T02', 'T03', 'T02']);
    expect(slots[3].pick.kind).toBe('comp');
  });
});

describe('compensatory picks', () => {
  const roundFor = (v: number) => 8 - v / 10;
  it('follow the net loss, four a club and 32 in all', () => {
    const moves = ids(12).map(club => ({ club, lost: [60, 50, 40, 30, 20, 20], gained: [45] }));
    const awards = compensatoryAwards(moves, NFL_PICK_RULES, roundFor);
    expect(awards.length).toBe(32);
    for (const club of ids(12)) expect(awards.filter(a => a.club === club).length).toBeLessThanOrEqual(4);
    for (const a of awards) { expect(a.round).toBeGreaterThanOrEqual(3); expect(a.round).toBeLessThanOrEqual(7); }
  });
  it('a signing cancels a loss, and a club that gained as many as it lost gets nothing', () => {
    expect(compensatoryAwards([{ club: 'A', lost: [50, 30], gained: [55, 10] }], NFL_PICK_RULES, roundFor)).toEqual([]);
    const one = compensatoryAwards([{ club: 'A', lost: [50, 30], gained: [40] }], NFL_PICK_RULES, roundFor);
    expect(one).toEqual([{ club: 'A', round: 3, value: 50 }]);
  });
  it('a league without them awards none', () => {
    expect(compensatoryAwards([{ club: 'A', lost: [50], gained: [] }], NBA_PICK_RULES, roundFor)).toEqual([]);
  });
});
