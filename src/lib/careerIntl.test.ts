/* Round 1541: the sport free international summer (src/lib/careerIntl.ts),
   driven by two toy binds: one whose games are never level (basketball's
   shape) and one whose group games may be drawn and whose level knockouts are
   decided by a named winner (soccer's penalties), so the module is proven to
   take a sport it was not written for. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  answerCallUp, intlCalendar, intlFieldOf, intlGeneratedField, intlSeedOrder, intlStatsOf, intlStreamKey, intlTournamentOf, parseIntlId,
  pendingCallUp, repairIntlOnLoad, runIntlTournament,
  type IntlCareer, type IntlEdition, type IntlLedger, type IntlSportBind, type IntlSummerEntry, type IntlTableRow, type IntlTournament, type Rng,
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
    /* the toy holds no seasons: as it stood is the summer before, at the row's age */
    careerAt: (c, summer, age) => ({ ...c, year: summer - 1, age }),
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
  it('names an id the ledger lacks after the edition of its competition at or before it', () => {
    const renamed = intlCalendar({ ...LEDGER, editions: [
      ['wc-2006', 'wc', 2006, 'World Championship', 'Japan', 'b-4x6', NATIONS.slice(0, 24), null],
      ['wc-2014', 'wc', 2014, 'World Cup', 'Spain', 'b-2r', null, null],
    ] });
    expect(renamed.byId('wc-2010')?.name).toBe('World Championship');
    expect(renamed.byId('wc-2002')?.name).toBe('World Championship');
    expect(renamed.byId('wc-2022')?.name).toBe('World Cup');
    expect(renamed.editionFor(2022)?.name).toBe('World Cup');
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
  for (const [label, bind] of [['never level', HOOPS], ['groups may draw', SOCCER]] as const) {
    it(`sends the best two of three thirds through by the sport's table order, ${label}`, () => {
      /* oly-2020 plays a-3x4: three groups of four, two through and the two best thirds */
      const order = (x: IntlTableRow, y: IntlTableRow) => bind.tableOrder(x, y) || y.coin - x.coin;
      let notGroupOrder = 0;
      for (let s = 0; s < 200; s += 1) {
        const t = run('oly-2020', s, bind);
        expect(t.groups).toHaveLength(3);
        for (const gr of t.groups) {
          expect(t.places[gr.table[0].nation]).not.toBe('group');
          expect(t.places[gr.table[1].nation]).not.toBe('group');
          expect(t.places[gr.table[3].nation]).toBe('group');
        }
        const thirds = t.groups.map(gr => gr.table[2]);
        const best = [...thirds].sort(order);
        expect(t.places[best[0].nation]).not.toBe('group');
        expect(t.places[best[1].nation]).not.toBe('group');
        expect(t.places[best[2].nation]).toBe('group');
        if (best[2] !== thirds[2]) notGroupOrder += 1;
      }
      /* the worst third is often not the last group's, so taking thirds in group order would be seen */
      expect(notGroupOrder).toBeGreaterThan(80);
    });
  }
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
  it('go writes the row and never the tournament, which the save plays again, and a knock goes through the sport', () => {
    let hurtSeen = 0;
    for (let i = 0; i < 60; i += 1) {
      const c = toy({ name: `Toy ${i}` });
      const a = answerCallUp(c, HOOPS, 'go');
      const row = c.intl?.summers[0];
      expect(row?.went).toBe(true);
      if (!row || !row.went || !a?.tournament) throw new Error('no row');
      expect(c.intl && 'last' in c.intl).toBe(false);
      expect(JSON.stringify(intlTournamentOf(c, HOOPS, 2004))).toBe(JSON.stringify(a.tournament));
      expect(row.place).toBe(a.tournament.places.USA);
      expect(row.games).toBe(a.tournament.his.length);
      expect(row.hurt).toBe(a.tournament.hurt);
      expect(c.health).toBe(row.hurt ? 72 : 80);
      /* the averages a row keeps are his lines' means, to one decimal */
      const pts = a.tournament.his.map(h => h.line.pts);
      expect(row.avg.pts).toBe(Math.round((pts.reduce((s, x) => s + x, 0) / pts.length) * 10) / 10);
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
  /* A save from Round 1541's dark code: the latest tournament kept whole in `last`. */
  const withLast = () => {
    const c = played();
    const t = intlTournamentOf(c, HOOPS, 2004);
    if (!t || !c.intl) throw new Error('no tournament');
    c.intl.last = JSON.parse(JSON.stringify(t)) as IntlTournament;
    return c;
  };
  it('leaves an old save and a sound block untouched', () => {
    const old = toy();
    expect(repairIntlOnLoad(old)).toBe(false);
    expect(repairIntlOnLoad(old, HOOPS)).toBe(false);
    expect('intl' in old).toBe(false);
    const c = played();
    const was = JSON.stringify(c);
    expect(repairIntlOnLoad(c)).toBe(false);
    expect(repairIntlOnLoad(c, HOOPS)).toBe(false);
    expect(JSON.stringify(c)).toBe(was);
  });
  it('drops a stored last the replay equals, and keeps one it does not as a snapshot', () => {
    const c = withLast();
    const summers = JSON.stringify(c.intl?.summers);
    expect(repairIntlOnLoad(c)).toBe(false);
    expect(c.intl?.last?.edition).toBe('oly-2004');
    expect(repairIntlOnLoad(c, HOOPS)).toBe(true);
    expect(c.intl && 'last' in c.intl).toBe(false);
    expect(JSON.stringify(c.intl?.summers)).toBe(summers);
    const d = withLast();
    const kept = d.intl?.last;
    if (!kept) throw new Error('no last');
    kept.games[0].sa += 1;
    const was = JSON.stringify(d);
    expect(repairIntlOnLoad(d, HOOPS)).toBe(false);
    expect(JSON.stringify(d)).toBe(was);
    expect(intlTournamentOf(d, HOOPS, 2004)).toBe(kept);
  });
  it('shows a replay only while it agrees with the row, and nothing for a rested summer', () => {
    const c = played();
    expect(intlTournamentOf(c, HOOPS, 2004)?.edition).toBe('oly-2004');
    expect(intlTournamentOf(c, HOOPS, 2006)).toBeNull();
    expect(intlTournamentOf(c, HOOPS, 2008)).toBeNull();
    const row = c.intl?.summers[0];
    if (!row || !row.went) throw new Error('no row');
    row.wins = row.wins === 0 ? 1 : row.wins - 1;
    expect(intlTournamentOf(c, HOOPS, 2004)).toBeNull();
  });
  it('shows no replay when the row disagrees on any one thing it records (review of Round 1544, N5)', () => {
    type Went = Extract<IntlSummerEntry, { went: true }>;
    const flips: [string, (r: Went) => void][] = [
      ['place', r => { r.place = r.place === 'gold' ? 'silver' : 'gold'; }],
      ['games', r => { r.games += 1; }],
      ['wins', r => { r.wins = r.wins === 0 ? 1 : r.wins - 1; }],
      ['hurt', r => { r.hurt = !r.hurt; }],
      ['avg', r => { const k = Object.keys(r.avg)[0]; r.avg[k] += 0.1; }],
    ];
    for (const [what, flip] of flips) {
      const c = played();
      const row = c.intl?.summers[0];
      if (!row || !row.went) throw new Error('no row');
      expect(intlTournamentOf(c, HOOPS, 2004)?.edition, `${what}, before the flip`).toBe('oly-2004');
      flip(row);
      expect(intlTournamentOf(c, HOOPS, 2004), what).toBeNull();
    }
  });
  /* Round 1544's review (N2): `last` is derived on read (L4), so a live save's past summers are only as stable as
     the key and the draw. These are the replays as Round 1544 plays them, from literal toy careers: a change to the
     stream key, the draw order or the generated field turns a live save's Your games and The bracket into the row
     alone, so a round that moves these numbers must mean to, and say what it does for saves already written. */
  it('plays a summer again exactly as Round 1544 played it: the key, the draw order and the generated field (review of Round 1544, N2)', () => {
    expect(intlStreamKey('toy', 'Toy', 'oly-2004')).toBe('intl:toy:Toy:oly-2004');
    const mine = (t: IntlTournament) => t.games.filter(g => g.a === t.nation || g.b === t.nation).map(g => `${g.round} ${g.a} ${g.sa}-${g.sb} ${g.b}`);
    const golden: [string, IntlSportBind<Toy>, number, Record<string, unknown>, string[], string, string[] | null][] = [
      ['HOOPS 2004', HOOPS, 2003, { place: 'group', games: 5, wins: 2, avg: { pts: 18.2 }, hurt: false },
        ['group Germany 97-80 USA', 'group USA 75-92 Lithuania', 'group USA 102-84 Australia', 'group Argentina 84-88 USA', 'group Italy 83-76 USA'], 'Greece', null],
      ['SOCCER 2004', SOCCER, 2003, { place: 'bronze', games: 8, wins: 4, avg: { pts: 18.4 }, hurt: false },
        ['group Canada 3-0 USA', 'group USA 0-1 Lithuania', 'group USA 1-1 Australia', 'group Argentina 2-3 USA', 'group France 2-3 USA', 'QF Lithuania 0-1 USA', 'SF USA 1-3 Germany', 'bronze Greece 0-1 USA'], 'Germany', null],
      ['HOOPS 2020 projected', HOOPS, 2019, { place: 'quarter', games: 4, wins: 2, avg: { pts: 19.5 }, hurt: true },
        ['group Canada 82-100 USA', 'group Serbia 79-75 USA', 'group Italy 81-82 USA', 'QF USA 75-97 Slovenia'], 'France',
        ['USA', 'Australia', 'Italy', 'Spain', 'Germany', 'Serbia', 'France', 'Greece', 'Argentina', 'Japan', 'Canada', 'Slovenia']],
    ];
    for (const [name, bind, year, row, games, champion, field] of golden) {
      const c = toy({ year });
      answerCallUp(c, bind, 'go');
      expect(c.intl?.summers[0], name).toMatchObject({ year: year + 1, went: true, age: 26, ...row });
      const t = intlTournamentOf(c, bind, year + 1);
      if (!t) throw new Error(`${name}: no replay`);
      expect(mine(t), name).toEqual(games);
      expect(t.champion, name).toBe(champion);
      if (field) expect(t.field, name).toEqual(field);
    }
  });
  it('drops a broken block alone', () => {
    const c = toy();
    (c as { intl?: unknown }).intl = { v: 2, summers: 'no' };
    expect(repairIntlOnLoad(c)).toBe(true);
    expect('intl' in c).toBe(false);
    expect(c.health).toBe(80);
  });
  it('drops a broken row alone and keeps the rest', () => {
    const c = withLast();
    (c.intl?.summers as unknown[]).push({ year: 2009, edition: 'oly-2008', went: false }, { year: 'x' }, { year: 2012, edition: 'oly-2012', went: true, place: 'gold' });
    expect(repairIntlOnLoad(c)).toBe(true);
    expect(c.intl?.summers.map(r => r.year)).toEqual([2004, 2006]);
    expect(c.intl?.last?.edition).toBe('oly-2004');
  });
  it('drops a broken last alone', () => {
    const c = withLast();
    (c.intl as { last: unknown }).last = { v: 1, edition: 'oly-2004' };
    expect(repairIntlOnLoad(c)).toBe(true);
    expect(c.intl?.summers).toHaveLength(2);
    expect(c.intl?.last).toBeUndefined();
  });
  it('drops a last whose games, groups, lines or places are malformed, and only the last', () => {
    const breaks: ((l: Record<string, unknown>) => void)[] = [
      l => { (l.games as unknown[])[0] = { round: 'group', a: 'USA' }; },
      l => { (l.games as unknown[]).push(null); },
      l => { ((l.games as Record<string, unknown>[])[0]).round = 'semi'; },
      l => { (l.groups as unknown[])[0] = { teams: ['USA'], table: [{ nation: 'USA', won: 'two' }] }; },
      l => { (l.his as unknown[]).push({ game: 999, line: { pts: 20 } }); },
      l => { (l.his as Record<string, unknown>[])[0].line = { pts: 'lots' }; },
      l => { (l.places as Record<string, unknown>).USA = 'champions'; },
      l => { (l.field as unknown[]).push(7); },
      l => { delete l.generated; },
    ];
    for (const [i, brk] of breaks.entries()) {
      const c = withLast();
      const summers = JSON.stringify(c.intl?.summers);
      brk(c.intl?.last as unknown as Record<string, unknown>);
      expect(repairIntlOnLoad(c), `break ${i}`).toBe(true);
      expect(c.intl?.last, `break ${i}`).toBeUndefined();
      expect(JSON.stringify(c.intl?.summers), `break ${i}`).toBe(summers);
    }
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
