import { describe, expect, it } from 'vitest';
import {
  acceptFinal, askFor, autoDecide, contractClass, decisionFor, deskCase, expiringMen, isValidLedger, keepAtAsk,
  letGo, loadLedger, matchSheet, noteArrival, offerSheetFor, openLedger, pushFor, pushOnce, qualify, readOffer,
  runDeskOffseason, takePicks, tenderHim, topSalary, undecided, useOption,
  type GmContractHost, type GmContractLeague, type GmMan,
} from '@/lib/gmContracts';
import { CONTRACT_RULES, nbaMaxShare, offerSheetPicks, type GmSportKey } from '@/lib/gmContractRules';
import { nflContractHost } from '@/lib/gmContractsHostNfl';

/* A stand in engine with the one property that matters: every man whose deal
   runs out inside its offseason WALKS. So anybody still on the roster
   afterwards is there because the desk held him, not because a draw was kind. */
function host(sport: GmSportKey): GmContractHost<GmContractLeague, string[]> {
  return {
    sport,
    marketSalary: (_l, m) => Math.max(1, (m.ovr - 60) * 0.5),
    nextCap: l => l.cap,
    minSalary: () => 0.8,
    runOffseason: (league) => {
      for (const t of Object.values(league.teams)) {
        const keep: GmMan[] = [];
        for (const p of t.players) {
          p.age += 1;
          p.years -= 1;
          if (p.years <= 0) { league.freeAgents.push({ ...p, years: 1 }); continue; }
          keep.push(p);
        }
        t.players = keep;
        t.picks = [1, 2];
      }
      league.season += 1;
      return [];
    },
  };
}

const man = (id: string, ovr: number, age: number, years: number, salary: number): GmMan =>
  ({ id, name: `Player ${id}`, pos: 'X', age, ovr, years, salary });

function league(players: GmMan[], cap = 200): GmContractLeague {
  return {
    season: 2030, cap, freeAgents: [],
    teams: {
      ME: { players, picks: [1, 2] },
      CPU: { players: Array.from({ length: 130 }, (_, i) => man(`c${i}`, 70 + (i % 20), 27, 3, 2 + (i % 20))), picks: [1, 2] },
    },
  };
}

describe('the offer read (gmDealTable under the desk)', () => {
  it('closeness never falls as the salary rises, at every step and every length', () => {
    const ask = { years: 3, salary: 20 };
    for (let years = 1; years <= 5; years++) {
      let last = -1;
      for (let cents = 0; cents <= 2600; cents += 10) {
        const { closeness } = readOffer(ask, { years, salary: cents / 100 });
        expect(closeness).toBeGreaterThanOrEqual(last);
        last = closeness;
      }
      expect(last).toBe(100);
    }
  });

  it('a push has four answers, and he never ends above his ask or below your offer', () => {
    const ask = { years: 3, salary: 20 };
    expect(pushOnce(ask, { years: 3, salary: 19.5 }).verdict).toBe('agreed');
    const counter = pushOnce(ask, { years: 3, salary: 17 });
    expect(counter.verdict).toBe('counter');
    expect(counter.final!.salary).toBeLessThan(20);
    expect(counter.final!.salary).toBeGreaterThan(17);
    const insult = pushOnce(ask, { years: 3, salary: 13 });
    expect(insult.verdict).toBe('insulted');
    expect(insult.final).toEqual({ years: 3, salary: 20 });
    const gone = pushOnce(ask, { years: 3, salary: 8 });
    expect(gone.verdict).toBe('walkout');
    expect(gone.final).toBeNull();
    for (let s = 0; s <= 30; s += 0.5) {
      const r = pushOnce(ask, { years: 3, salary: s });
      if (r.final && r.verdict !== 'agreed') {
        expect(r.final.salary).toBeLessThanOrEqual(ask.salary);
        expect(r.final.salary).toBeGreaterThanOrEqual(Math.min(s, ask.salary));
      }
    }
  });
});

describe('the offseason with the desk in front of it', () => {
  it('fails closed: with anybody undecided nothing runs', () => {
    const lg = league([man('a', 80, 27, 1, 9), man('b', 70, 30, 3, 4)]);
    const ledger = openLedger(lg, 'ME');
    const run = runDeskOffseason(host('nhl'), lg, ledger, () => 0.5);
    expect(run.ok).toBe(false);
    if (run.ok === false) expect(run.undecided.map(u => u.id)).toEqual(['a']);
    expect(lg.season).toBe(2030);
    expect(lg.teams.ME.players).toHaveLength(2);
  });

  it('a kept man stays on exactly the agreed terms, and a man let go is in the pool', () => {
    const h = host('nhl');
    const lg = league([man('a', 80, 27, 1, 9), man('b', 72, 30, 1, 4), man('c', 70, 30, 3, 4)]);
    const ledger = openLedger(lg, 'ME');
    const ca = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(keepAtAsk(ledger, lg, ca).ok).toBe(true);
    expect(letGo(ledger, lg, deskCase(h, lg, ledger, lg.teams.ME.players[1])).ok).toBe(true);
    expect(undecided(h, lg, ledger)).toHaveLength(0);
    const run = runDeskOffseason(h, lg, ledger, () => 0.5);
    expect(run.ok).toBe(true);
    const a = lg.teams.ME.players.find(p => p.id === 'a')!;
    expect(a.years).toBe(ca.ask.years);
    expect(a.salary).toBe(ca.ask.salary);
    expect(lg.teams.ME.players.some(p => p.id === 'b')).toBe(false);
    expect(lg.freeAgents.some(p => p.id === 'b')).toBe(true);
    expect(lg.teams.ME.players.find(p => p.id === 'c')!.years).toBe(2);
  });

  it('one push per man per winter: reopening the desk hands back the same answer', () => {
    const h = host('nhl');
    const lg = league([man('a', 80, 27, 1, 9)]);
    const ledger = openLedger(lg, 'ME');
    const c = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    const first = pushFor(ledger, lg, c, { years: c.ask.years, salary: c.ask.salary * 0.85 })!;
    expect(first.verdict).toBe('counter');
    const second = pushFor(ledger, lg, c, { years: c.ask.years, salary: c.ask.salary * 0.96 })!;
    expect(second).toEqual(first);
    expect(decisionFor(ledger, lg.season, 'a')).toBeUndefined();
    expect(acceptFinal(ledger, lg, c).ok).toBe(true);
    expect(decisionFor(ledger, lg.season, 'a')!.salary).toBe(first.final!.salary);
  });
});

describe("each league's own rule", () => {
  it('NFL: the fifth year option is for a first round pick this GM drafted, once, one guaranteed year', () => {
    const h = host('nfl');
    const lg = league([man('r1', 84, 24, 1, 3), man('r2', 84, 24, 1, 3), man('vet', 84, 29, 1, 12)]);
    const ledger = openLedger(lg, 'ME');
    noteArrival(ledger, 'r1', 2026, 'draft', 1);
    noteArrival(ledger, 'r2', 2026, 'draft', 2);
    const [c1, c2, cv] = lg.teams.ME.players.map(p => deskCase(h, lg, ledger, p));
    expect(c1.cls).toBe('fifth-year-option');
    expect(c1.option!.years).toBe(1);
    expect(c2.option).toBeUndefined();
    expect(cv.option).toBeUndefined();
    expect(useOption(ledger, lg, c2).ok).toBe(false);
    expect(useOption(ledger, lg, c1).ok).toBe(true);
    letGo(ledger, lg, c2); letGo(ledger, lg, cv);
    expect(runDeskOffseason(h, lg, ledger, () => 0.5).ok).toBe(true);
    const r1 = lg.teams.ME.players.find(p => p.id === 'r1')!;
    expect(r1.years).toBe(1);
    expect(r1.guaranteed).toBe(true);
    expect(r1.salary).toBe(c1.option!.salary);
    /* The option is spent: next winter he is an ordinary veteran. */
    expect(contractClass('nfl', ledger, lg, r1)).toBe('veteran');
  });

  it('NBA: no ask over the maximum, and without room the Bird tier caps what the club may pay', () => {
    const h = host('nba');
    /* A full payroll, so there is no room for anybody's ask. */
    const filler = Array.from({ length: 12 }, (_, i) => man(`f${i}`, 75, 28, 3, 18));
    const lg = league([man('star', 99, 27, 1, 10), man('new', 86, 27, 1, 5), ...filler]);
    const ledger = openLedger(lg, 'ME');
    noteArrival(ledger, 'new', 2030, 'signing');
    const star = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(star.cls).toBe('bird-full');
    expect(star.ask.salary).toBeLessThanOrEqual(nbaMaxShare(Number.POSITIVE_INFINITY) * lg.cap + 0.05);
    expect(star.ceiling).toBeGreaterThanOrEqual(star.ask.salary);
    expect(keepAtAsk(ledger, lg, star).ok).toBe(true);
    const fresh = deskCase(h, lg, ledger, lg.teams.ME.players[1]);
    expect(fresh.cls).toBe('bird-non');
    expect(fresh.ceiling).toBeCloseTo(5 * 1.2, 5);
    expect(fresh.ask.salary).toBeGreaterThan(fresh.ceiling!);
    expect(keepAtAsk(ledger, lg, fresh).ok).toBe(false);
  });

  it('MLB: a drafted man is under control for six seasons, then a free agent who can be qualified once', () => {
    const h = host('mlb');
    const lg = league([man('pre', 78, 23, 1, 0.9), man('arb', 80, 26, 1, 2), man('fa', 82, 29, 1, 8), man('vet', 90, 30, 1, 20)]);
    const ledger = openLedger(lg, 'ME');
    noteArrival(ledger, 'pre', 2028, 'draft', 1);
    noteArrival(ledger, 'arb', 2026, 'draft', 1);
    noteArrival(ledger, 'fa', 2024, 'draft', 1);
    const [pre, arb, fa, vet] = lg.teams.ME.players.map(p => deskCase(h, lg, ledger, p));
    expect(pre.cls).toBe('pre-arbitration');
    expect(pre.tender).toEqual({ years: 1, salary: 0.9 });
    expect(pre.canNegotiate).toBe(false);
    expect(arb.cls).toBe('arbitration');
    expect(arb.tender!.salary).toBeLessThan(arb.ask.market);
    expect(fa.cls).toBe('free-agent');
    expect(fa.tender).toBeUndefined();
    expect(vet.cls).toBe('free-agent');
    expect(vet.qualifying!.years).toBe(1);
    expect(tenderHim(ledger, lg, pre).ok).toBe(true);
    expect(tenderHim(ledger, lg, fa).ok).toBe(false);
    const q = qualify(ledger, lg, vet);
    expect(q.ok && q.decision.kind).toBe(vet.qualifying!.accepts ? 'qualify-accepted' : 'qualify-rejected');
    /* Never twice. */
    expect(deskCase(h, lg, ledger, lg.teams.ME.players[3]).qualifying).toBeUndefined();
  });

  it('NHL: a drafted man under 27 is restricted, a sheet is fixed by the player and the season, and picks arrive after the offseason', () => {
    const h = host('nhl');
    const men = Array.from({ length: 40 }, (_, i) => man(`d${i}`, 86, 22, 1, 1));
    const lg = league(men);
    const ledger = openLedger(lg, 'ME');
    for (const m of men) noteArrival(ledger, m.id, 2028, 'draft', 1);
    const cases = men.map(m => deskCase(h, lg, ledger, m));
    expect(cases.every(c => c.cls === 'restricted')).toBe(true);
    const sheets = cases.filter(c => c.restricted!.sheet);
    expect(sheets.length).toBeGreaterThan(5);
    expect(sheets.length).toBeLessThan(35);
    for (const c of cases) expect(offerSheetFor(lg, c.man, c.ask, h.nextCap(lg))).toEqual(c.restricted!.sheet);
    const withSheet = sheets[0];
    expect(withSheet.canNegotiate).toBe(false);
    expect(tenderHim(ledger, lg, withSheet).ok).toBe(false);
    expect(takePicks(ledger, lg, withSheet).ok).toBe(true);
    expect(matchSheet(ledger, lg, sheets[1]).ok).toBe(true);
    autoDecide(h, lg, ledger);
    const run = runDeskOffseason(h, lg, ledger, () => 0.5);
    expect(run.ok).toBe(true);
    if (run.ok) expect(lg.teams.ME.picks.length).toBe(2 + run.picksAdded.length);
    expect(lg.teams.ME.players.some(p => p.id === withSheet.man.id)).toBe(false);
    expect(lg.teams.ME.players.find(p => p.id === sheets[1].man.id)!.salary).toBe(sheets[1].restricted!.sheet!.salary);
  });

  it('the ladder pays more picks for a richer sheet at every rung, and never fewer', () => {
    let last = 0;
    for (let aav = 0.5; aav <= 16; aav += 0.25) {
      const firsts = offerSheetPicks(aav, 95.5).filter(r => r === 1).length;
      expect(firsts).toBeGreaterThanOrEqual(last);
      last = firsts;
    }
    expect(last).toBe(4);
    expect(offerSheetPicks(1, 95.5)).toEqual([]);
  });

  it('every rule that names a real mechanism has two sources or says it has one', () => {
    for (const r of CONTRACT_RULES) {
      expect(r.sources.length).toBeGreaterThanOrEqual(r.singleSource ? 1 : 2);
      for (const s of r.sources) expect(s.url.startsWith('https://')).toBe(true);
    }
  });
});

describe('the ledger', () => {
  it('an old save has none and gets a fresh one, and a corrupt one is replaced alone', () => {
    const lg = league([man('a', 80, 27, 1, 9)]);
    const fresh = loadLedger(undefined, lg, 'ME');
    expect(isValidLedger(fresh)).toBe(true);
    expect(fresh.men.a.how).toBe('founder');
    for (const bad of [null, 7, 'x', {}, { v: 2 }, { ...fresh, men: [] }, { ...fresh, decisions: [{ kind: 'nope' }] },
      { ...fresh, decisions: [{ season: 2030, id: 'a', name: 'A', kind: 'keep', via: 'gm' }] }]) {
      expect(isValidLedger(bad)).toBe(false);
      expect(loadLedger(bad, lg, 'ME').v).toBe(1);
    }
    expect(loadLedger({ ...fresh, team: 'OTHER' }, lg, 'ME').team).toBe('ME');
    expect(expiringMen(host('nhl'), lg, 'ME')).toHaveLength(1);
    expect(askFor(host('nhl'), lg, fresh, lg.teams.ME.players[0]).salary).toBeGreaterThan(0);
  });
});

describe('the review of 2026-10-02', () => {
  it('NFL: the option goes with the rookie deal, even when he was kept on a new one instead', () => {
    const h = host('nfl');
    const lg = league([man('r1', 84, 24, 1, 3)]);
    const ledger = openLedger(lg, 'ME');
    noteArrival(ledger, 'r1', 2026, 'draft', 1);
    const c = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(c.option).toBeDefined();
    expect(keepAtAsk(ledger, lg, c).ok).toBe(true);
    expect(runDeskOffseason(h, lg, ledger, () => 0.5).ok).toBe(true);
    const r1 = lg.teams.ME.players.find(p => p.id === 'r1')!;
    r1.years = 1;
    const again = deskCase(h, lg, ledger, r1);
    expect(again.option).toBeUndefined();
    expect(again.cls).toBe('veteran');
  });

  it('NFL: a man kept after his tag year leaves the tag and the guarantee behind, and a man tagged now never reaches the desk', () => {
    const h: GmContractHost<GmContractLeague, string[]> = { ...host('nfl'), held: nflContractHost.held as never, endDeal: nflContractHost.endDeal };
    const tagYear = { ...man('t', 85, 28, 1, 20), guaranteed: true, tagSeason: 2030, tagCount: 1 };
    const taggedNow = { ...man('n', 85, 28, 1, 20), guaranteed: true, tagSeason: 2031, tagCount: 1 };
    const lg = league([tagYear, taggedNow]);
    const ledger = openLedger(lg, 'ME');
    expect(expiringMen(h, lg, 'ME').map(p => p.id)).toEqual(['t']);
    expect(keepAtAsk(ledger, lg, deskCase(h, lg, ledger, lg.teams.ME.players[0])).ok).toBe(true);
    expect(runDeskOffseason(h, lg, ledger, () => 0.5).ok).toBe(true);
    const t = lg.teams.ME.players.find(p => p.id === 't') as GmMan & { tagSeason?: number; tagCount?: number };
    expect(t.years).toBeGreaterThan(1);
    expect(t.guaranteed).toBeUndefined();
    expect(t.tagSeason).toBeUndefined();
    expect(t.tagCount).toBeUndefined();
  });

  it('MLB: one qualifying offer per man, ever, even after he leaves and is signed back', () => {
    const h = host('mlb');
    const lg = league([man('vet', 90, 30, 1, 20)]);
    const ledger = openLedger(lg, 'ME');
    const c = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(c.qualifying!.accepts).toBe(false);
    expect(qualify(ledger, lg, c).ok).toBe(true);
    expect(runDeskOffseason(h, lg, ledger, () => 0.5).ok).toBe(true);
    const back = lg.freeAgents.find(p => p.id === 'vet')!;
    lg.freeAgents = lg.freeAgents.filter(p => p.id !== 'vet');
    lg.teams.ME.players.push({ ...back, years: 1 });
    noteArrival(ledger, 'vet', lg.season, 'signing');
    expect(ledger.men.vet.qualified).toBeUndefined();
    expect(deskCase(h, lg, ledger, lg.teams.ME.players[0]).qualifying).toBeUndefined();
  });

  it('MLB: no qualifying offer for a mid season arrival, and one the winter after he plays a full season', () => {
    const h = host('mlb');
    const lg = league([man('mid', 90, 30, 1, 20)]);
    const ledger = openLedger(lg, 'ME');
    noteArrival(ledger, 'mid', 2030, 'signing', undefined, true);
    const c = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(c.qualifying).toBeUndefined();
    expect(keepAtAsk(ledger, lg, c).ok).toBe(true);
    expect(runDeskOffseason(h, lg, ledger, () => 0.5).ok).toBe(true);
    const mid = lg.teams.ME.players[0];
    mid.years = 1;
    expect(deskCase(h, lg, ledger, mid).qualifying).toBeDefined();
  });

  it('NBA: the maximum ladder at every boundary, and a push can never sign over it', () => {
    expect([0, 6, 7, 9, 10, 15].map(nbaMaxShare)).toEqual([0.25, 0.25, 0.3, 0.3, 0.35, 0.35]);
    const h = host('nba');
    const lg = league([man('star', 99, 27, 1, 10)], 400);
    const ledger = openLedger(lg, 'ME');
    const c = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(c.ceiling).toBeUndefined();
    expect(c.maxSalary).toBeDefined();
    pushFor(ledger, lg, c, { years: c.ask.years, salary: c.maxSalary! * 3 });
    expect(decisionFor(ledger, lg.season, 'star')!.salary!).toBeLessThanOrEqual(topSalary(c));
  });

  it('NBA: an Early Bird exception deal runs two seasons at the least', () => {
    const h = host('nba');
    const filler = Array.from({ length: 12 }, (_, i) => man(`f${i}`, 75, 28, 3, 18));
    const lg = league([man('eb', 92, 33, 1, 10), ...filler]);
    const ledger = openLedger(lg, 'ME');
    noteArrival(ledger, 'eb', 2029, 'signing');
    const c = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(c.cls).toBe('bird-early');
    expect(c.minYears).toBe(2);
    pushFor(ledger, lg, c, { years: 1, salary: c.ceiling! });
    expect(ledger.men.eb.push!.offer.years).toBe(2);
  });

  it('a walkout is final, letting go with a sheet on the table takes the picks, and the pool reprices', () => {
    const h = host('nhl');
    const men = Array.from({ length: 40 }, (_, i) => man(`d${i}`, 86, 22, 1, 1));
    const lg = league([man('w', 80, 27, 1, 9), man('old', 90, 30, 1, 3), ...men]);
    const ledger = openLedger(lg, 'ME');
    for (const m of men) noteArrival(ledger, m.id, 2028, 'draft', 1);
    const w = deskCase(h, lg, ledger, lg.teams.ME.players[0]);
    expect(pushFor(ledger, lg, w, { years: w.ask.years, salary: w.ask.salary * 0.3 })!.verdict).toBe('walkout');
    expect(keepAtAsk(ledger, lg, w).ok).toBe(false);
    expect(decisionFor(ledger, lg.season, 'w')!.kind).toBe('walkout');
    const old = deskCase(h, lg, ledger, lg.teams.ME.players[1]);
    expect(letGo(ledger, lg, old).ok).toBe(true);
    const sheet = men.map(m => deskCase(h, lg, ledger, m)).find(c => c.restricted!.sheet)!;
    expect(letGo(ledger, lg, sheet).ok && decisionFor(ledger, lg.season, sheet.man.id)!.kind).toBe('take-picks');
    autoDecide(h, lg, ledger);
    expect(runDeskOffseason(h, lg, ledger, () => 0.5).ok).toBe(true);
    expect(lg.freeAgents.find(p => p.id === 'old')!.salary).toBe(h.marketSalary(lg, man('x', 90, 30, 1, 3)));
    const atRival = lg.teams.CPU.players.find(p => p.id === sheet.man.id)!;
    expect(atRival.salary).toBe(sheet.restricted!.sheet!.salary);
    expect(lg.freeAgents.some(p => p.id === sheet.man.id)).toBe(false);
  });
});
