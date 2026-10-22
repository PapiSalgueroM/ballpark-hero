/* Round 1541: the sport free international summer (src/lib/careerIntl.ts),
   driven by two toy binds: one whose games are never level (basketball's
   shape) and one whose group games may be drawn and whose level knockouts are
   decided by a named winner (soccer's penalties), so the module is proven to
   take a sport it was not written for. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  answerCallUp, intlCalendar, intlFieldOf, intlGeneratedField, intlSeedOrder, intlStatsOf, parseIntlId,
  pendingCallUp, repairIntlOnLoad, runIntlTournament,
  type IntlCareer, type IntlEdition, type IntlLedger, type IntlSportBind, type IntlTournament, type Rng,
} from './careerIntl';
import { keyedRng } from './keyedRng';

const NATIONS = 'USA Spain France Serbia Australia Canada Germany Greece Lithuania Argentina Brazil Italy Slovenia Japan Nigeria China Iran Jordan Angola Latvia Poland Mexico Egypt Finland Georgia Lebanon Montenegro Venezuela Philippines Tunisia Senegal Croatia Turkey Russia'.split(' ');
const LEDGER: IntlLedger = {
  shapes: [
    ['a-2x6', 12, 2, 6, 4, 0, 'QF', true, true, null],
    ['a-3x4', 12, 3, 4, 2, 2, 'QF', true, true, null],
    ['b-4x6', 24, 4, 6, 4, 0, 'R16', true, true, null],
    ['b-2r', 32, 8, 4, 2, 0, 'QF', true, false, 'b-8x4'],
    ['b-8x4', 32, 8, 4, 2, 0, 'R16', true, true, null],
    ['c-2x4', 8, 2, 4, 2, 0, 'SF', false, true, null],
  ],
  editions: [
    ['oly-2004', 'oly', 2004, 'Olympics', 'Athens', 'a-2x6', NATIONS.slice(0, 12), ['Spain', 'France', 'USA', 'Serbia', ['Australia', 'Canada', 'Germany', 'Greece']]],
    ['wc-2006', 'wc', 2006, 'World Cup', 'Japan', 'b-4x6', NATIONS.slice(0, 24), ['USA', 'Spain', 'France', 'Serbia', ['Australia', 'Canada', 'Germany', 'Greece']]],
    ['oly-2008', 'oly', 2008, 'Olympics', 'Beijing', 'a-3x4', NATIONS.slice(2, 14), null],
    ['wc-2010', 'wc', 2010, 'World Cup', 'Turkey', 'b-2r', NATIONS.slice(0, 32), null],
    ['wc-2014', 'wc', 2014, 'World Cup', 'Spain', 'b-2r', null, null],
    ['cup-2016', 'cup', 2016, 'Cup', 'Here', 'c-2x4', NATIONS.slice(0, 8), null],
  ],
  cycles: [['oly', 2012, 4], ['wc', 2018, 4]],
  partial: ['wc-2014'],
  lastPlayed: 2016,
};
const CAL = intlCalendar(LEDGER);

interface Toy extends IntlCareer { name: string; ovr: number; health: number; age: number; year: number }
const toy = (over: Partial<Toy> = {}): Toy => ({ name: 'Toy', ovr: 90, health: 80, age: 26, year: 2003, ...over });
const norm = (r: Rng) => { let u = 0; let v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function bindOf(draws: boolean): IntlSportBind<Toy> {
  return {
    slug: draws ? 'toyd' : 'toy',
    calendar: CAL,
    nationOf: () => 'USA',
    callOf: c => (c.ovr >= 86 ? CAL.editionFor(c.year + 1) : null),
    strengthOf: (_e, n) => 70 + (NATIONS.indexOf(n) % 9),
    liftOf: c => Math.max(0, Math.min(4, (c.ovr - 86) * 0.5)),
    play(a, b, rng, knockout) {
      if (draws) {
        const sa = Math.max(0, Math.round(1.3 + (a - b) * 0.05 + norm(rng)));
        const sb = Math.max(0, Math.round(1.3 + (b - a) * 0.05 + norm(rng)));
        if (sa === sb && knockout) return { a: sa, b: sb, winner: rng() < 0.5 ? 'a' : 'b' };
        return { a: sa, b: sb };
      }
      let sa = Math.round(80 + (a - b) + norm(rng) * 9);
      let sb = Math.round(80 + (b - a) + norm(rng) * 9);
      let ot = 0;
      while (sa === sb) { ot += 1; sa += Math.round(10 + norm(rng) * 3); sb += Math.round(10 + norm(rng) * 3); }
      return { a: sa, b: sb, ot };
    },
    groupDraws: draws,
    groupPoints: draws ? [3, 1, 0] : [2, 1, 1],
    tableOrder: (x, y) => (draws ? y.pts - x.pts : y.won - x.won) || (y.pf - y.pa) - (x.pf - x.pa),
    lineOf: (_c, rng) => ({ pts: Math.max(0, Math.round(20 + norm(rng) * 3)) }),
    knockChance: () => 0.08,
    knock: c => { c.health = Math.max(30, c.health - 8); },
    ageOf: c => c.age,
    careerKey: c => c.name,
    rng: keyedRng,
  };
}
const HOOPS = bindOf(false);
const SOCCER = bindOf(true);
const ed = (id: string) => CAL.byId(id) as IntlEdition;
const run = (id: string, seed: number, bind = HOOPS) => runIntlTournament(ed(id), 'USA', bind, toy(), keyedRng(`t:${seed}`)) as IntlTournament;

afterEach(() => { vi.restoreAllMocks(); });

describe('the calendar', () => {
  it('answers a ledger summer, a projected one, and none', () => {
    expect(CAL.editionFor(2004)?.id).toBe('oly-2004');
    expect(CAL.editionFor(2004)?.kind).toBe('played');
    expect(CAL.editionFor(2014)?.kind).toBe('future');
    expect(CAL.editionFor(2014)?.partial).toBe(true);
    expect(CAL.editionFor(2005)).toBeNull();
    const p = CAL.editionFor(2020);
    expect(p).toMatchObject({ id: 'oly-2020', kind: 'projected', host: null, field: null, name: 'Olympics' });
    expect(p?.play.id).toBe('a-3x4');
    expect(CAL.editionFor(2022)?.id).toBe('wc-2022');
    expect(CAL.editionFor(2022)?.play.id).toBe('b-8x4');
    expect(CAL.editionFor(2019)).toBeNull();
  });
  it('plays an unplayable shape as its playedAs and keeps the real one', () => {
    const e = ed('wc-2010');
    expect(e.shape.id).toBe('b-2r');
    expect(e.play.id).toBe('b-8x4');
  });
  it('renders an id the ledger lacks from its parse', () => {
    expect(parseIntlId('oly-2035')).toEqual({ comp: 'oly', year: 2035 });
    expect(parseIntlId('Tokyo 2020')).toBeNull();
    expect(CAL.byId('oly-2035')).toMatchObject({ id: 'oly-2035', comp: 'oly', year: 2035, kind: 'projected' });
  });
  it('seeds a bracket 1 v 8, 4 v 5, 2 v 7, 3 v 6', () => {
    expect(intlSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
    expect(intlSeedOrder(16)).toEqual([1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]);
  });
});

describe('the field', () => {
  it('is the same for two careers and drawn only from the last two played fields', () => {
    const e = ed('wc-2014');
    const a = intlFieldOf(HOOPS, e, 'USA');
    const b = intlFieldOf(HOOPS, e, 'USA');
    expect(a?.generated).toBe(true);
    expect(a?.field).toEqual(b?.field);
    const pool = new Set([...(ed('wc-2006').field ?? []), ...(ed('wc-2010').field ?? [])]);
    expect(a?.field.length).toBe(32);
    expect(new Set(a?.field).size).toBe(32);
    for (const n of a?.field ?? []) expect(pool.has(n)).toBe(true);
  });
  it('fails closed when even the widest pool is short', () => {
    const tiny = intlCalendar({ ...LEDGER, editions: LEDGER.editions.filter(r => r[1] !== 'wc' || r[2] !== 2010) });
    expect(intlGeneratedField(tiny, tiny.byId('wc-2014') as IntlEdition, 'USA', keyedRng('x'))).toBeNull();
  });
  it('gives no tournament when his nation is not in a played field', () => {
    expect(intlFieldOf(HOOPS, ed('oly-2008'), 'USA')).toBeNull();
    expect(runIntlTournament(ed('oly-2008'), 'USA', HOOPS, toy(), keyedRng('x'))).toBeNull();
  });
});

describe('the tournament', () => {
  const IDS = ['oly-2004', 'wc-2006', 'wc-2010', 'wc-2014', 'cup-2016', 'oly-2020', 'wc-2022'];
  for (const [label, bind] of [['never level', HOOPS], ['groups may draw', SOCCER]] as const) {
    it(`plays every shape to one champion, ${label}`, () => {
      for (const id of IDS) {
        for (let s = 0; s < 60; s += 1) {
          const t = run(id, s, bind);
          const e = ed(id);
          expect(t.field.length).toBe(e.play.teams);
          expect(t.games.filter(g => g.round === 'final')).toHaveLength(1);
          const fin = t.games.find(g => g.round === 'final');
          expect(t.champion).toBe(fin?.winner);
          expect(t.places[t.champion]).toBe('gold');
          expect(Object.keys(t.places).sort()).toEqual([...t.field].sort());
          const golds = Object.values(t.places).filter(p => p === 'gold').length;
          const silvers = Object.values(t.places).filter(p => p === 'silver').length;
          expect([golds, silvers]).toEqual([1, 1]);
          for (const g of t.games) {
            expect(g.a).not.toBe(g.b);
            if (g.round !== 'group') expect(g.winner === g.a || g.winner === g.b).toBe(true);
            if (!bind.groupDraws) expect(g.sa).not.toBe(g.sb);
            if (g.ot > 0) expect(bind.groupDraws).toBe(false);
          }
          let w = 0; let l = 0; let d = 0;
          for (const gr of t.groups) for (const r of gr.table) { w += r.won; l += r.lost; d += r.drawn; }
          expect(w).toBe(l);
          expect(d % 2).toBe(0);
          if (!bind.groupDraws) expect(d).toBe(0);
        }
      }
    });
  }
  it('plays the bronze game between the two semi-final losers, three distinct medallists', () => {
    for (let s = 0; s < 80; s += 1) {
      const t = run('oly-2004', s);
      const semis = t.games.filter(g => g.round === 'SF');
      const losers = semis.map(g => (g.winner === g.a ? g.b : g.a)).sort();
      const bronze = t.games.find(g => g.round === 'bronze');
      expect([bronze?.a, bronze?.b].sort()).toEqual(losers);
      const medal = (p: string) => Object.entries(t.places).filter(([, x]) => x === p).map(([n]) => n);
      expect(new Set([...medal('gold'), ...medal('silver'), ...medal('bronze')]).size).toBe(3);
      expect(medal('fourth')).toHaveLength(1);
    }
  });
  it('gives both semi-final losers a semi place when the shape has no bronze game', () => {
    const t = run('cup-2016', 3);
    expect(t.games.some(g => g.round === 'bronze')).toBe(false);
    expect(Object.values(t.places).filter(p => p === 'semi')).toHaveLength(2);
  });
  it('agrees his place with his games', () => {
    for (let s = 0; s < 120; s += 1) {
      const t = run('wc-2006', s);
      const ko = t.games.filter(g => g.round !== 'group' && (g.a === 'USA' || g.b === 'USA'));
      const last = ko[ko.length - 1];
      const place = t.places.USA;
      if (place === 'group') expect(ko).toHaveLength(0);
      if (place === 'gold') expect([last.round, last.winner]).toEqual(['final', 'USA']);
      if (place === 'silver') expect(last.round === 'final' && last.winner !== 'USA').toBe(true);
      if (place === 'bronze') expect([last.round, last.winner]).toEqual(['bronze', 'USA']);
      if (place === 'fourth') expect(last.round === 'bronze' && last.winner !== 'USA').toBe(true);
      if (place === 'quarter') expect(last.round === 'QF' && last.winner !== 'USA').toBe(true);
      if (place === 'r16') expect(last.round === 'R16' && last.winner !== 'USA').toBe(true);
      expect(t.his.map(h => h.game)).toEqual(t.games.flatMap((g, i) => (g.a === 'USA' || g.b === 'USA' ? [i] : [])));
    }
  });
  it('gives the same tournament for the same key, and never calls Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    expect(JSON.stringify(run('wc-2014', 7))).toBe(JSON.stringify(run('wc-2014', 7)));
    expect(JSON.stringify(run('wc-2014', 7))).not.toBe(JSON.stringify(run('wc-2014', 8)));
    const c = toy();
    pendingCallUp(c, HOOPS);
    answerCallUp(c, HOOPS, 'go');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('the save', () => {
  it('asks until he answers; rest writes the year, the edition and went false, and nothing else', () => {
    const c = toy();
    expect(pendingCallUp(c, HOOPS)?.edition.id).toBe('oly-2004');
    expect(pendingCallUp(c, HOOPS)?.edition.id).toBe('oly-2004');
    const before = JSON.stringify({ ...c, intl: undefined });
    const a = answerCallUp(c, HOOPS, 'rest');
    expect(a?.tournament).toBeNull();
    expect(c.intl).toEqual({ v: 1, summers: [{ year: 2004, edition: 'oly-2004', went: false }] });
    expect(Object.keys(c.intl?.summers[0] ?? {}).sort()).toEqual(['edition', 'went', 'year']);
    expect(JSON.stringify({ ...c, intl: undefined })).toBe(before);
    expect(pendingCallUp(c, HOOPS)).toBeNull();
    expect(answerCallUp(c, HOOPS, 'go')).toBeNull();
  });
  it('go writes the row and the snapshot, and a knock goes through the sport', () => {
    let hurtSeen = 0;
    for (let i = 0; i < 60; i += 1) {
      const c = toy({ name: `Toy ${i}` });
      const a = answerCallUp(c, HOOPS, 'go');
      const row = c.intl?.summers[0];
      expect(row?.went).toBe(true);
      if (!row || !row.went || !a?.tournament) throw new Error('no row');
      expect(c.intl?.last).toBe(a.tournament);
      expect(row.place).toBe(a.tournament.places.USA);
      expect(row.games).toBe(a.tournament.his.length);
      expect(row.hurt).toBe(a.tournament.hurt);
      expect(c.health).toBe(row.hurt ? 72 : 80);
      if (row.hurt) hurtSeen += 1;
    }
    expect(hurtSeen).toBeGreaterThan(0);
  });
  it('never calls a player below the bar or in a summer with no edition', () => {
    expect(pendingCallUp(toy({ ovr: 85 }), HOOPS)).toBeNull();
    expect(pendingCallUp(toy({ year: 2004 }), HOOPS)).toBeNull();
    expect(pendingCallUp(toy({ year: 2007 }), HOOPS)).toBeNull();
  });
  it('derives the totals from the summers', () => {
    const c = toy();
    answerCallUp(c, HOOPS, 'go');
    c.year = 2005;
    answerCallUp(c, HOOPS, 'rest');
    const s = intlStatsOf(c.intl);
    const row = c.intl?.summers[0];
    expect(s.tournaments).toBe(1);
    expect(s.rested).toBe(1);
    expect(s.caps).toBe(row && row.went ? row.games : -1);
    expect(s.debutYear).toBe(2004);
    expect(s.debutAge).toBe(26);
    expect(s.byComp.oly?.played).toBe(1);
    expect(s.medals).toBe(s.gold + s.silver + s.bronze);
    expect(intlStatsOf(undefined)).toMatchObject({ caps: 0, tournaments: 0, medals: 0, debutYear: null });
  });
});

describe('repair on load', () => {
  const played = () => { const c = toy(); answerCallUp(c, HOOPS, 'go'); c.year = 2005; answerCallUp(c, HOOPS, 'rest'); return c; };
  it('leaves an old save and a sound block untouched', () => {
    const old = toy();
    expect(repairIntlOnLoad(old)).toBe(false);
    expect('intl' in old).toBe(false);
    const c = played();
    const was = JSON.stringify(c);
    expect(repairIntlOnLoad(c)).toBe(false);
    expect(JSON.stringify(c)).toBe(was);
  });
  it('drops a broken block alone', () => {
    const c = toy();
    (c as { intl?: unknown }).intl = { v: 2, summers: 'no' };
    expect(repairIntlOnLoad(c)).toBe(true);
    expect('intl' in c).toBe(false);
    expect(c.health).toBe(80);
  });
  it('drops a broken row alone and keeps the rest', () => {
    const c = played();
    (c.intl?.summers as unknown[]).push({ year: 2009, edition: 'oly-2008', went: false }, { year: 'x' }, { year: 2012, edition: 'oly-2012', went: true, place: 'gold' });
    expect(repairIntlOnLoad(c)).toBe(true);
    expect(c.intl?.summers.map(r => r.year)).toEqual([2004, 2006]);
    expect(c.intl?.last?.edition).toBe('oly-2004');
  });
  it('drops a broken last alone', () => {
    const c = played();
    (c.intl as { last: unknown }).last = { v: 1, edition: 'oly-2004' };
    expect(repairIntlOnLoad(c)).toBe(true);
    expect(c.intl?.summers).toHaveLength(2);
    expect(c.intl?.last).toBeUndefined();
  });
  it('keeps a row whose edition the ledger stopped listing, medal and all', () => {
    const c = toy({ year: 2034 });
    c.intl = { v: 1, summers: [{ year: 2035, edition: 'wc-2035', went: true, age: 30, place: 'gold', games: 8, wins: 8, avg: { pts: 20 }, hurt: false }] };
    expect(repairIntlOnLoad(c)).toBe(false);
    expect(intlStatsOf(c.intl).gold).toBe(1);
    const later = intlCalendar({ ...LEDGER, editions: [...LEDGER.editions, ['wc-2035', 'wc', 2035, 'World Cup', 'Somewhere', 'b-8x4', null, null]] });
    expect(later.byId('wc-2035')?.kind).toBe('future');
    expect(CAL.byId('wc-2035')?.kind).toBe('projected');
    expect(repairIntlOnLoad(c)).toBe(false);
    expect(c.intl?.summers).toHaveLength(1);
  });
});
