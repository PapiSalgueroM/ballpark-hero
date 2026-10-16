/* Round 1347: the world competition engine, on crafted fields and on the base engine's own knockout ties.
 *
 * settleTie is held to a GOLDEN table recorded from the commit this round started from (d4f2c6f6) by
 * scripts/recordWorldTieGolden1347.mjs: the clubs and scales of every match the old advanceUclBracket played,
 * the coins it tossed, and the tie it wrote, as JSON and as its keys in order. The function under test is never
 * its own oracle (the critic's correction 7). Then the group draw, the nights, and the evaluation of a slice:
 * complete, legal, deterministic, a prefix at every night, one winner every finished season, and the same tables
 * whatever order the device puts names in (the critic's correction 1).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  G8_SHAPE, LEAGUE_PHASE_NIGHT_MARKS, drawG8, evaluateWorldComp, g8DrawRules, groupFixtures, leaguePhaseNightRounds,
  nightsOf, settleTie, worldCompWinner,
  type G8Entrant, type SettleableTie, type TieRules, type WorldCompBind, type WorldCompResult, type WorldCompSlice,
} from './worldCompetition';
import { drawUclLeaguePhase } from './uclLeaguePhase';
import { sortedUclGroupTable } from './clubManagerUclGroups';
import { keyedRng } from './keyedRng';
import type { TableRow } from './clubManager';

interface GoldenCase {
  name: string; rules: TieRules; tieIn: string; calls: [string, string, number, number, number][];
  coins: number[]; tieOut: string; keys: string[]; kind: string;
}
const golden = JSON.parse(readFileSync(path.join(process.cwd(), 'scripts/data/worldTieGolden1347.json'), 'utf8')) as { ref: string; cases: GoldenCase[] };

/** Replay a golden case through settleTie: every call must be the one the base engine made, in its order. */
function replay(c: GoldenCase): { tie: SettleableTie; callsUsed: number; coinsUsed: number } {
  const tie = JSON.parse(c.tieIn) as SettleableTie;
  let i = 0;
  let j = 0;
  settleTie(tie, c.rules, (home, away, scale) => {
    const call = c.calls[i];
    i += 1;
    expect(call, `${c.name}: a match the base engine never played`).toBeDefined();
    expect([home, away, scale]).toEqual(call.slice(0, 3));
    return [call[3], call[4]];
  }, () => { const v = c.coins[j]; j += 1; return v; });
  return { tie, callsUsed: i, coinsUsed: j };
}

describe('settleTie, held to the base engine (golden)', () => {
  it('the golden table comes from the base commit and holds every kind of ending', () => {
    expect(golden.ref).toBe('d4f2c6f6');
    const kinds = new Set(golden.cases.map(c => c.kind));
    for (const k of ['plain', 'away', 'et', 'etAway', 'pens']) expect(kinds.has(k), k).toBe(true);
    expect(golden.cases.length).toBeGreaterThanOrEqual(30);
  });
  for (const c of golden.cases) {
    it(c.name, () => {
      const { tie, callsUsed, coinsUsed } = replay(c);
      expect(callsUsed).toBe(c.calls.length);
      expect(coinsUsed).toBe(c.coins.length);
      expect(JSON.stringify(tie)).toBe(c.tieOut);
      expect(Object.keys(tie)).toEqual(c.keys);
    });
  }
  it('control: the same tie with its fields in another order is not the golden bytes', () => {
    const c = golden.cases.find(x => x.kind === 'pens' && x.rules.legs === 2) as GoldenCase;
    const { tie } = replay(c);
    const sortedKeys = Object.fromEntries(Object.keys(tie).sort().map(k => [k, (tie as unknown as Record<string, unknown>)[k]]));
    expect(JSON.stringify(sortedKeys)).not.toBe(c.tieOut);
    expect(Object.keys(sortedKeys)).not.toEqual(c.keys);
  });
});

/* A crafted era field: 32 clubs, eight of them in pairs or fours of one association, Russia and Ukraine twice each. */
const ASSOCS = ['Spain', 'Spain', 'Spain', 'Spain', 'England', 'England', 'England', 'England', 'Italy', 'Italy', 'Italy',
  'Germany', 'Germany', 'Germany', 'France', 'France', 'Portugal', 'Portugal', 'Russia', 'Russia', 'Ukraine', 'Ukraine',
  'Netherlands', 'Netherlands', 'Turkey', 'Greece', 'Scotland', 'Belgium', 'Austria', 'Switzerland', 'Denmark', 'Czechia'];
function field(seed: number, assocs: string[] = ASSOCS): G8Entrant[] {
  const r = keyedRng(`field|${seed}`);
  return assocs.map((assoc, i) => ({ club: `Club ${String.fromCharCode(65 + (i % 26))}${i}`, str: Math.round((60 + r() * 30) * 10) / 10, assoc }));
}
const potOf = (entrants: G8Entrant[], holder?: string): Map<string, number> => {
  const order = [...entrants].sort((a, b) => Number(b.club === holder) - Number(a.club === holder) || b.str - a.str || (a.club < b.club ? -1 : a.club > b.club ? 1 : 0));
  return new Map(order.map((e, i) => [e.club, Math.floor(i / 8)]));
};
const groupsOf = (clubs: string[]): string[][] => Array.from({ length: 8 }, (_, g) => clubs.slice(g * 4, g * 4 + 4));

describe('drawG8, the eras group draw', () => {
  it('draws 32 clubs into eight groups, one from each pot, inside both rules, the same every time', () => {
    for (let seed = 1; seed <= 60; seed += 1) {
      const entrants = field(seed);
      const holder = entrants[5].club;
      const draw = drawG8(entrants, seed, holder, g8DrawRules(2015));
      expect(draw).not.toBeNull();
      if (!draw) return;
      expect([...draw.clubs].sort()).toEqual(entrants.map(e => e.club).sort());
      const pot = potOf(entrants, holder);
      expect(pot.get(holder)).toBe(0);
      const assoc = new Map(entrants.map(e => [e.club, e.assoc]));
      for (const g of groupsOf(draw.clubs)) {
        expect(g.map(c => pot.get(c))).toEqual([0, 1, 2, 3]);
        const a = g.map(c => assoc.get(c));
        expect(new Set(a).size).toBe(4);
        expect(a.includes('Russia') && a.includes('Ukraine')).toBe(false);
      }
      expect(draw.clashes).toBe(0);
      expect(drawG8(entrants, seed, holder, g8DrawRules(2015))).toEqual(draw);
    }
  });
  it('a season before the 2014 ruling may put Russia and Ukraine together, and a plain draw keeps neither rule', () => {
    expect(g8DrawRules(2010)).toEqual({ assocApart: true, bans: [] });
    expect(g8DrawRules(2015).bans).toEqual([['Russia', 'Ukraine']]);
    expect(g8DrawRules(1999)).toEqual({ assocApart: false, bans: [] });
    const draw = drawG8(field(3), 3, undefined, g8DrawRules(1999));
    expect(draw?.clashes).toBe(0);
  });
  it('a field with nine clubs of one association is drawn with exactly one clash, and quickly', () => {
    const nine = [...Array(9).fill('Spain'), ...ASSOCS.slice(9)].slice(0, 32);
    expect(nine.filter(a => a === 'Spain').length).toBe(9);
    const t0 = Date.now();
    for (let seed = 1; seed <= 20; seed += 1) expect(drawG8(field(seed, nine), seed, undefined, g8DrawRules(2010))?.clashes).toBe(1);
    expect(Date.now() - t0).toBeLessThan(20000);
  });
  it('sixteen of one association: eight clashes, the fewest any draw can make, and it never hangs', () => {
    const sixteen = [...Array(16).fill('Spain'), ...ASSOCS.slice(16)];
    const counts: number[] = [];
    for (let seed = 1; seed <= 10; seed += 1) counts.push(drawG8(field(seed, sixteen), seed, undefined, g8DrawRules(2020))?.clashes ?? -1);
    expect(counts.every(n => n === 8)).toBe(true);
  });
  it('refuses a field that is not 32 different clubs', () => {
    const f = field(1);
    expect(drawG8(f.slice(1), 1)).toBeNull();
    const twice = [...f.slice(0, 31), f[0]];
    expect(twice.length).toBe(32);
    expect(drawG8(twice, 1)).toBeNull();
  });
});

describe('the nights', () => {
  it('13 nights in the eras and 17 in the league phase, in order', () => {
    expect(nightsOf('g8').map(n => n.id)).toEqual(['MD1', 'MD2', 'MD3', 'MD4', 'MD5', 'MD6', 'R16_1', 'R16_2', 'QF1', 'QF2', 'SF1', 'SF2', 'F']);
    expect(nightsOf('l36').map(n => n.id)).toEqual(['MD1', 'MD2', 'MD3', 'MD4', 'MD5', 'MD6', 'MD7', 'MD8', 'PO1', 'PO2', 'R16_1', 'R16_2', 'QF1', 'QF2', 'SF1', 'SF2', 'F']);
    expect(nightsOf('g8', () => 1).length).toBe(10);
  });
  /* buildCalendar's own rule for where a fraction of the season falls, and its sixth European midweek (0.39). */
  const at = (rounds: number, f: number): number => Math.max(0, Math.min(rounds - 1, Math.round(rounds * f)));
  const rising = (list: number[]): boolean => list.every((r, i) => i === 0 || r > list[i - 1]);
  it('every league phase night after matchday 6 is its own league round, at every league size', () => {
    const sizes: number[] = [];
    for (let clubs = 4; clubs <= 30; clubs += 1) {
      const rounds = 2 * ((clubs % 2 === 0 ? clubs : clubs + 1) - 1);
      const md6 = at(rounds, 0.39);
      const placed = leaguePhaseNightRounds(rounds, md6);
      expect(placed.length).toBe(LEAGUE_PHASE_NIGHT_MARKS.length);
      expect(placed[0]).toBeGreaterThan(md6);
      expect(rising(placed), `${clubs} clubs: ${placed.join(',')}`).toBe(true);
      sizes.push(clubs);
    }
    expect(sizes.length).toBe(27);
  });
  it('control: a mark table with two equal entries, placed by the fraction alone, puts two nights on one round', () => {
    const marks = [0.5, 0.6, 0.6, 0.7];
    const naive = marks.map(f => at(38, f));
    expect(rising(naive)).toBe(false);
    expect(rising(leaguePhaseNightRounds(38, at(38, 0.39), marks))).toBe(true);
  });
});

/* A match from two strengths and a stream: Poisson goals, nothing else drawn. */
function poissonGoals(lambda: number, rand: () => number): number {
  let k = 0;
  let p = Math.exp(-lambda);
  let s = p;
  const u = rand();
  while (u > s && k < 9) { k += 1; p *= lambda / k; s += p; }
  return k;
}
const sim = (strH: number, strA: number, scale: number, rand: () => number): [number, number] => [
  poissonGoals(Math.max(0.1, 1.35 + (strH - strA) * 0.05) * scale, rand),
  poissonGoals(Math.max(0.1, 1.15 + (strA - strH) * 0.05) * scale, rand),
];
const eraBind: WorldCompBind = {
  sim, groupRule: 'h2hAway',
  tie: r => ({ legs: r === 'F' ? 1 : 2, awayGoals: true, deciderScale: 0.965, etScale: 0.965 * 30 / 90 }),
};
const phaseBind: WorldCompBind = { sim, tie: r => ({ legs: r === 'F' ? 1 : 2, awayGoals: false, deciderScale: 0.965, etScale: 0.965 * 30 / 90 }) };

function eraSlice(seed: number): WorldCompSlice {
  const entrants = field(seed);
  const draw = drawG8(entrants, seed, undefined, g8DrawRules(2010)) as { clubs: string[]; clashes: number };
  const str = new Map(entrants.map(e => [e.club, e.str]));
  return { v: 1, s: 1, f: 'g8', seed, clubs: draw.clubs, str: draw.clubs.map(c => str.get(c) as number), clashes: draw.clashes };
}
const PHASE_ASSOCS = ['ESP', 'ESP', 'ESP', 'ESP', 'ENG', 'ENG', 'ENG', 'ENG', 'ENG', 'ITA', 'ITA', 'ITA', 'ITA', 'GER', 'GER', 'GER', 'GER',
  'FRA', 'FRA', 'FRA', 'POR', 'POR', 'NED', 'NED', 'BEL', 'BEL', 'TUR', 'SCO', 'AUT', 'SUI', 'CZE', 'GRE', 'DEN', 'CRO', 'SRB', 'UKR'];
function phaseSlice(seed: number): WorldCompSlice | null {
  const r = keyedRng(`phase|${seed}`);
  const clubs = PHASE_ASSOCS.map((_, i) => `Side ${i < 10 ? '0' : ''}${i}`);
  const str = new Map(clubs.map(c => [c, Math.round((60 + r() * 30) * 10) / 10]));
  const assoc = new Map(clubs.map((c, i) => [c, PHASE_ASSOCS[i]]));
  const slate = drawUclLeaguePhase({ field: clubs, holder: null, seed, strengthOf: c => str.get(c) as number, assocOf: c => assoc.get(c) });
  if (!slate) return null;
  return { v: 1, s: 1, f: 'l36', seed, clubs: slate.clubs, str: slate.clubs.map(c => str.get(c) as number), fx: slate.fx, breaks: slate.breaks, overCap: slate.overCap };
}

/** A finished season, complete and legal from its own results. */
function checkSeason(res: WorldCompResult, slice: WorldCompSlice, awayGoals: boolean): void {
  expect(res.done).toBe(true);
  const first = slice.f === 'g8' ? G8_SHAPE.games : 8;
  const perNight = slice.f === 'g8' ? 16 : 18;
  const met = new Map<string, number>();
  for (let i = 0; i < first; i += 1) {
    const fx = res.nights[i].fixtures;
    expect(fx.length).toBe(perNight);
    expect(fx.every(x => x.hg !== undefined && x.ag !== undefined)).toBe(true);
    const sides = fx.flatMap(x => [x.home, x.away]);
    expect(new Set(sides).size).toBe(sides.length);
    for (const x of fx) met.set(`${x.home}|${x.away}`, (met.get(`${x.home}|${x.away}`) ?? 0) + 1);
  }
  expect([...met.values()].every(n => n === 1)).toBe(true);
  const rows: TableRow[] = slice.f === 'g8' ? (res.groups ?? []).flatMap(g => g.rows) : res.table ?? [];
  expect(rows.length).toBe(slice.clubs.length);
  expect(rows.every(r => r.w + r.d + r.l === first && r.pts === 3 * r.w + r.d)).toBe(true);
  expect(rows.reduce((s, r) => s + r.gf, 0)).toBe(rows.reduce((s, r) => s + r.ga, 0));
  if (slice.f === 'g8') {
    for (const g of res.groups ?? []) for (const a of g.rows) for (const b of g.rows) {
      if (a.club !== b.club) expect(met.get(`${a.club}|${b.club}`), `${a.club} at home to ${b.club}`).toBe(1);
    }
  }
  const counts: Record<string, number> = slice.f === 'g8' ? { R16: 8, QF: 4, SF: 2, F: 1 } : { PO: 8, R16: 8, QF: 4, SF: 2, F: 1 };
  for (const [round, n] of Object.entries(counts)) expect(res.ties.filter(t => t.round === round).length, round).toBe(n);
  for (const t of res.ties) {
    expect([t.home, t.away]).toContain(t.winner);
    if (t.leg1 && t.leg2) expect(t.agg).toEqual([t.leg1[0] + t.leg2[0], t.leg1[1] + t.leg2[1]]);
    const [h, a] = t.agg as [number, number];
    if (t.pens) expect(h).toBe(a);
    if (t.byAwayGoals) { expect(awayGoals).toBe(true); expect(h).toBe(a); }
    if (!t.pens && !t.byAwayGoals) expect(t.winner).toBe(h > a ? t.home : t.away);
  }
  if (slice.f === 'l36') {
    const pos = new Map((res.table ?? []).map((r, i) => [r.club, i + 1]));
    for (const t of res.ties.filter(x => x.round === 'PO')) for (const c of [t.home, t.away]) expect(pos.get(c)).toBeGreaterThanOrEqual(9);
    for (const t of res.ties.filter(x => x.round === 'PO')) for (const c of [t.home, t.away]) expect(pos.get(c)).toBeLessThanOrEqual(24);
    for (const t of res.ties.filter(x => x.round === 'R16')) expect(pos.get(t.away)).toBeLessThanOrEqual(8);
  }
  const final = res.ties.find(t => t.round === 'F');
  expect(worldCompWinner(res)).toEqual({ winner: final?.winner, runnerUp: final?.winner === final?.home ? final?.away : final?.home });
}

describe('evaluateWorldComp', () => {
  it('an era season played to the end is complete and legal', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const slice = eraSlice(seed);
      checkSeason(evaluateWorldComp(slice, 13, eraBind), slice, true);
    }
  });
  it('a league phase season played to the end is complete and legal', () => {
    let drawn = 0;
    for (let seed = 1; seed <= 12; seed += 1) {
      const slice = phaseSlice(seed);
      if (!slice) continue;
      drawn += 1;
      checkSeason(evaluateWorldComp(slice, 17, phaseBind), slice, false);
    }
    expect(drawn).toBe(12);
  });
  it('is deterministic and a prefix at every night, and shows no score before its night', () => {
    for (const [slice, bind] of [[eraSlice(7), eraBind], [phaseSlice(3) as WorldCompSlice, phaseBind]] as const) {
      const n = nightsOf(slice.f).length;
      for (let k = 0; k < n; k += 1) {
        const a = evaluateWorldComp(slice, k, bind);
        const b = evaluateWorldComp(slice, k + 1, bind);
        expect(JSON.stringify(evaluateWorldComp(slice, k, bind))).toBe(JSON.stringify(a));
        expect(JSON.stringify(b.nights.slice(0, k))).toBe(JSON.stringify(a.nights.slice(0, k)));
        expect(a.nights.slice(k).every(night => night.fixtures.every(x => x.hg === undefined))).toBe(true);
        expect(worldCompWinner(a)).toBeNull();
      }
    }
  });
  it('crowns exactly one winner every finished season, over a few hundred seeds', () => {
    let crowned = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const slice = eraSlice(seed);
      const w = worldCompWinner(evaluateWorldComp(slice, 13, eraBind));
      expect(w && slice.clubs.includes(w.winner) && slice.clubs.includes(w.runnerUp) && w.winner !== w.runnerUp).toBe(true);
      crowned += 1;
    }
    for (let seed = 101; seed <= 140; seed += 1) {
      const slice = phaseSlice(seed);
      if (!slice) continue;
      const w = worldCompWinner(evaluateWorldComp(slice, 17, phaseBind));
      expect(w && w.winner !== w.runnerUp).toBe(true);
      crowned += 1;
    }
    expect(crowned).toBeGreaterThanOrEqual(330);
  });
  it('the moved groupFixtures is the double round robin it always was', () => {
    const seen = new Map<string, number>();
    for (let md = 0; md < 6; md += 1) for (const [h, a] of groupFixtures(['a', 'b', 'c', 'd'], md)) seen.set(`${h}|${a}`, (seen.get(`${h}|${a}`) ?? 0) + 1);
    expect(seen.size).toBe(12);
    expect([...seen.values()].every(n => n === 1)).toBe(true);
  });
});

describe('the same tables on every device (correction 1)', () => {
  /* Every match 0-0, so every group is four clubs level on everything and only the names order them. */
  const level: WorldCompBind = { ...eraBind, sim: () => [0, 0] };
  const names = Array.from({ length: 32 }, (_, i) => `${['ajax', 'Beta', String.fromCharCode(0xc9) + 'lan', 'zeta'][i % 4]} ${i}`);
  const slice: WorldCompSlice = { v: 1, s: 1, f: 'g8', seed: 5, clubs: names, str: names.map(() => 70) };
  const flipped = <T,>(run: () => T): T => {
    const original = String.prototype.localeCompare;
    String.prototype.localeCompare = function (this: string, other: string) { return -original.call(this, other); } as typeof original;
    try { return run(); } finally { String.prototype.localeCompare = original; }
  };
  it('a reversed device order does not move the watched groups', () => {
    const plain = JSON.stringify(evaluateWorldComp(slice, 13, level));
    expect(JSON.stringify(flipped(() => evaluateWorldComp(slice, 13, level)))).toBe(plain);
  });
  it('control: the participant default order does move under it, so the reversal bites', () => {
    const res = evaluateWorldComp(slice, 6, level);
    const rows = (res.groups ?? [])[0].rows.map(r => ({ ...r }));
    const before = sortedUclGroupTable(rows, 'h2hAway', {}).map(r => r.club).join(',');
    const after = flipped(() => sortedUclGroupTable(rows, 'h2hAway', {}).map(r => r.club).join(','));
    expect(after).not.toBe(before);
  });
});

