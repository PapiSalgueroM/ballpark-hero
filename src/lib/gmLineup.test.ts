import { describe, expect, it } from 'vitest';
import {
  type GmLineupMan, type GmLineupSport, type GmSlotGroup,
  gmFillByRating, gmGroupPool, gmLineupHeld, gmLineupReading, gmLineupReset, gmLineupSetOpen, gmLineupSetScheme,
  gmLineupStrength, gmLineupSwap, gmResolveLineup, gmSanitizeLineupChoice, gmSkippedSlots, gmStartValue, gmWalkRotation,
} from './gmLineup';
import { mlbLineupSport, nflLineupSport, nhlLineupSport } from './gmLineupSports';
import { type MlbGmTeam, mlbStrength } from './mlbFrontOffice';
import { type NhlGmTeam, nhlSetContributors, nhlStrength } from './nhlFrontOffice';
import { initLeague, swapDepth, teamStrength } from './frontOffice';

/* Fictional men only: generated labels, no real names. */
const man = (id: string, pos: string, ovr: number, out = 0): GmLineupMan => ({ id, name: `Player ${id}`, pos, ovr, out });

interface Toy { players: GmLineupMan[] }
const toyGroups: GmSlotGroup[] = [
  { key: 'top', label: 'Top', share: 0.6, counted: 2, fallback: 50, positions: ['A'], slots: [{ label: 'One', weight: 3 }, { label: 'Two', weight: 2 }, { label: 'Three', weight: 1 }] },
  { key: 'arms', label: 'Arms', share: 0.4, counted: 2, fallback: 50, positions: ['P'], slots: [{ label: 'P1', weight: 1 }, { label: 'P2', weight: 1 }, { label: 'P3', weight: 1 }], rotation: { fullRest: 2, shortRestCost: 5, optional: 1 } },
];
const toy: GmLineupSport<Toy> = {
  id: 'toy',
  groups: toyGroups,
  men: t => t.players,
  base: t => Object.fromEntries(toyGroups.map(g => [g.key, gmGroupPool(g, t.players).sort((a, b) => b.ovr - a.ovr).slice(0, g.counted)])),
  auto: (t, g, s) => gmFillByRating(g, s, gmGroupPool(g, t.players)),
};
const toyTeam = (): Toy => ({
  players: [man('a1', 'A', 80), man('a2', 'A', 70), man('a3', 'A', 60), man('a4', 'A', 50), man('a5', 'A', 90, 2),
    man('p1', 'P', 75), man('p2', 'P', 65), man('p3', 'P', 55), man('p4', 'P', 45)],
});

describe('gmLineup core', () => {
  it('reads today\'s formula with no choice, and an untouched choice adds exactly nothing', () => {
    const t = toyTeam();
    const today = ((80 + 70) / 2) * 0.6 + ((75 + 65) / 2) * 0.4;
    expect(gmLineupStrength(toy, t)).toBe(today);
    expect(gmLineupStrength(toy, t, {})).toBe(today);
    expect(gmLineupStrength(toy, t, { slots: { top: ['a1', 'a2', 'a3'], arms: ['p1', 'p2', 'p3'] } })).toBe(today);
  });

  it('skips the hurt man and fills by rating, heavier slots first', () => {
    const lineup = gmResolveLineup(toy, toyTeam());
    expect(lineup.top.map(p => p?.id)).toEqual(['a1', 'a2', 'a3']);
    expect(lineup.arms.map(p => p?.id)).toEqual(['p1', 'p2', 'p3']);
  });

  it('benching a better man and batting him lower both cost', () => {
    const t = toyTeam();
    const before = gmLineupStrength(toy, t);
    const bench = gmLineupSwap(toy, t, {}, 'top', { id: 'a2' }, { id: 'a4' });
    expect(bench?.slots?.top).toEqual(['a1', 'a4', 'a3']);
    expect(gmLineupStrength(toy, t, bench!)).toBeLessThan(before);
    const lower = gmLineupSwap(toy, t, {}, 'top', { id: 'a1' }, { id: 'a3' });
    expect(gmLineupStrength(toy, t, lower!)).toBeLessThan(before);
    /* exactly the slot weights: (3 - 1) x (80 - 60) / 6 on a 0.6 share */
    expect(before - gmLineupStrength(toy, t, lower!)).toBeCloseTo(0.6 * (2 * 20) / 6, 10);
  });

  it('a swap back hands the group back to the sim', () => {
    const t = toyTeam();
    const once = gmLineupSwap(toy, t, {}, 'top', { id: 'a1' }, { id: 'a2' })!;
    expect(once.slots?.top).toEqual(['a2', 'a1', 'a3']);
    expect(gmLineupSwap(toy, t, once, 'top', { id: 'a1' }, { id: 'a2' })).toEqual({});
  });

  it('refuses a man the group cannot take, an unknown group and a tap on itself', () => {
    const t = toyTeam();
    expect(gmLineupSwap(toy, t, {}, 'top', { id: 'a1' }, { id: 'p4' })).toBeNull();
    expect(gmLineupSwap(toy, t, {}, 'nope', { id: 'a1' }, { id: 'a2' })).toBeNull();
    expect(gmLineupSwap(toy, t, {}, 'top', { id: 'a1' }, { id: 'a1' })).toBeNull();
    expect(gmLineupSwap(toy, t, {}, 'top', { id: 'a5' }, { id: 'a1' })).toBeNull();
  });

  it('a saved man who gets hurt leaves a hole the best spare fills, and gets it back', () => {
    const t = toyTeam();
    const choice = gmLineupSwap(toy, t, {}, 'top', { id: 'a3' }, { id: 'a4' })!;
    t.players.find(p => p.id === 'a1')!.out = 1;
    expect(gmResolveLineup(toy, t, choice).top.map(p => p?.id)).toEqual(['a3', 'a2', 'a4']);
    t.players.find(p => p.id === 'a1')!.out = 0;
    expect(gmResolveLineup(toy, t, choice).top.map(p => p?.id)).toEqual(['a1', 'a2', 'a4']);
  });

  it('a tap made while a saved man is hurt keeps his slot for him', () => {
    const t = toyTeam();
    const choice = gmLineupSwap(toy, t, {}, 'top', { id: 'a3' }, { id: 'a4' })!;
    t.players.find(p => p.id === 'a1')!.out = 1;
    expect(gmLineupHeld(toy, t, choice, 'top').map(p => p?.id ?? null)).toEqual(['a1', null, null]);
    /* an unrelated tap: the 2nd and 3rd trade places */
    const tapped = gmLineupSwap(toy, t, choice, 'top', { id: 'a2' }, { id: 'a4' })!;
    expect(tapped.slots?.top).toEqual(['a1', 'a4', 'a2']);
    expect(gmResolveLineup(toy, t, tapped).top.map(p => p?.id)).toEqual(['a3', 'a4', 'a2']);
    t.players.find(p => p.id === 'a1')!.out = 0;
    expect(gmResolveLineup(toy, t, tapped).top.map(p => p?.id)).toEqual(['a1', 'a4', 'a2']);
    /* moving a man into the slot he holds hands it over, and says so */
    t.players.find(p => p.id === 'a1')!.out = 1;
    const over = gmLineupSwap(toy, t, choice, 'top', { id: 'a3' }, { id: 'a4' })!;
    expect(over.slots?.top).toEqual(['a4', 'a2', 'a3']);
    expect(gmLineupHeld(toy, t, over, 'top').every(p => p === null)).toBe(true);
  });

  it('a first tap on a group nobody saved keeps a slot for the sim\'s hurt man, his stand-in\'s', () => {
    const healing: GmLineupSport<Toy> = { ...toy, healed: t => ({ players: t.players.map(p => ({ ...p, out: 0 })) }) };
    const t = toyTeam();
    /* a5 (90) is hurt: the sim bats a1 a2 a3, and a3 is in only for him */
    const once = gmLineupSwap(healing, t, {}, 'top', { id: 'a1' }, { id: 'a2' })!;
    expect(once.slots?.top).toEqual(['a2', 'a1', 'a5']);
    expect(gmResolveLineup(healing, t, once).top.map(p => p?.id)).toEqual(['a2', 'a1', 'a3']);
    expect(gmLineupHeld(healing, t, once, 'top').map(p => p?.id ?? null)).toEqual([null, null, 'a5']);
    /* a swap back is the sim's own pick again */
    expect(gmLineupSwap(healing, t, once, 'top', { id: 'a1' }, { id: 'a2' })).toEqual({});
    /* fit again, he is back in the stand-in's slot, not on the bench */
    t.players.find(p => p.id === 'a5')!.out = 0;
    expect(gmResolveLineup(healing, t, once).top.map(p => p?.id)).toEqual(['a2', 'a1', 'a5']);
    /* the GM benches a better man the hole would bring back: no hold, the field is his */
    t.players.find(p => p.id === 'a5')!.out = 2;
    expect(gmLineupSwap(healing, t, {}, 'top', { id: 'a2' }, { id: 'a4' })!.slots?.top).toEqual(['a1', 'a4', 'a3']);
    /* and a saved hold the same bench tap would undo goes, so the tap does what it says */
    const benched = gmLineupSwap(healing, t, once, 'top', { id: 'a2' }, { id: 'a4' })!;
    expect(benched.slots?.top).toEqual(['a4', 'a1', 'a3']);
    expect(gmLineupHeld(healing, t, benched, 'top').every(p => p === null)).toBe(true);
    /* a sport with no full strength pick saves the field as before */
    expect(gmLineupSwap(toy, t, {}, 'top', { id: 'a1' }, { id: 'a2' })!.slots?.top).toEqual(['a2', 'a1', 'a3']);
  });

  it('a saved man only fills a slot that takes his position', () => {
    const picky: GmLineupSport<Toy> = {
      ...toy,
      groups: [{ key: 'pp', label: 'Unit', share: 0.1, counted: 0, fallback: 50, positions: ['A', 'P'], slots: [{ label: 'F', weight: 1, accepts: ['A'] }, { label: 'D', weight: 1, accepts: ['P'] }] }],
    };
    const t = toyTeam();
    expect(gmResolveLineup(picky, t, { slots: { pp: ['p1', 'a1'] } }).pp.map(p => p?.id)).toEqual(['a1', 'p1']);
    expect(gmLineupSwap(picky, t, {}, 'pp', { id: 'a1' }, { id: 'p1' })).toBeNull();
  });
});

describe('gmLineup rotation', () => {
  const rule = { fullRest: 2, shortRestCost: 5, optional: 1 };
  it('a full turn starts everyone on full rest, a short one costs every start', () => {
    const t = toyTeam();
    const three = gmResolveLineup(toy, t).arms;
    expect(gmWalkRotation(three, 6, rule, 50).starts.map(s => [s.id, s.rest, s.value])).toEqual([
      ['p1', 2, 75], ['p2', 2, 65], ['p3', 2, 55], ['p1', 2, 75], ['p2', 2, 65], ['p3', 2, 55],
    ]);
    const open = gmLineupSetOpen(toy, t, {}, 'arms', 2, true)!;
    expect(open.slots?.arms).toEqual(['p1', 'p2', null]);
    expect(open.open).toEqual({ arms: [2] });
    const two = gmResolveLineup(toy, t, open).arms;
    expect(gmWalkRotation(two, 4, rule, 50).starts.map(s => s.value)).toEqual([70, 60, 70, 60]);
    expect(gmLineupReading(toy, t, open).groups.find(g => g.key === 'arms')!.mine).toBe(65);
    expect(gmLineupSetOpen(toy, t, open, 'arms', 2, false)).toEqual({});
    expect(gmLineupSetOpen(toy, t, {}, 'arms', 0, true)).toBeNull();
  });

  it('a starter hurt mid walk sends the turn out short, carrying on from the last starter', () => {
    const t = toyTeam();
    const three = gmResolveLineup(toy, t).arms;
    const first = gmWalkRotation(three, 4, rule, 50);
    expect(first.starts.map(s => s.id)).toEqual(['p1', 'p2', 'p3', 'p1']);
    const hurt = three.map(p => (p?.id === 'p3' ? { ...p, out: 1 } : p));
    const next = gmWalkRotation(hurt, 3, rule, 50, first.last, 4).starts;
    expect(next.map(s => [s.id, s.rest])).toEqual([['p2', 2], ['p1', 1], ['p2', 1]]);
    expect(gmStartValue(man('x', 'P', 70), 1, rule)).toBe(65);
    expect(gmStartValue(man('x', 'P', 70), 9, rule)).toBe(70);
  });

  it('a last spot empty for want of a healthy man is not a skip, and a swap never makes it one', () => {
    const t = toyTeam();
    for (const id of ['p3', 'p4']) t.players.find(p => p.id === id)!.out = 1;
    expect(gmResolveLineup(toy, t).arms.map(p => p?.id ?? null)).toEqual(['p1', 'p2', null]);
    expect(gmLineupSetOpen(toy, t, {}, 'arms', 2, true)).toBeNull();
    expect(gmLineupSetOpen(toy, t, {}, 'arms', 2, false)).toBeNull();
    const swapped = gmLineupSwap(toy, t, {}, 'arms', { id: 'p1' }, { id: 'p2' })!;
    expect(swapped.open).toBeUndefined();
    expect(gmSkippedSlots(toy, toyGroups[1], swapped).size).toBe(0);
    t.players.find(p => p.id === 'p3')!.out = 0;
    expect(gmResolveLineup(toy, t, swapped).arms.map(p => p?.id ?? null)).toEqual(['p2', 'p1', 'p3']);
  });

  it('a skip on purpose stays skipped when the men are fit, and its own button takes it back', () => {
    const t = toyTeam();
    const open = gmLineupSetOpen(toy, t, {}, 'arms', 2, true)!;
    const swapped = gmLineupSwap(toy, t, open, 'arms', { id: 'p1' }, { id: 'p2' })!;
    expect(swapped.open).toEqual({ arms: [2] });
    expect(gmResolveLineup(toy, t, swapped).arms.map(p => p?.id ?? null)).toEqual(['p2', 'p1', null]);
    expect(gmLineupSwap(toy, t, swapped, 'arms', { slot: 2 }, { id: 'p3' })).toBeNull();
    const back = gmLineupSetOpen(toy, t, swapped, 'arms', 2, false)!;
    expect(back.open).toBeUndefined();
    expect(gmResolveLineup(toy, t, back).arms.map(p => p?.id ?? null)).toEqual(['p2', 'p1', 'p3']);
  });
});

describe('gmLineup saves', () => {
  it('reads a save from before as nothing and drops a corrupt group alone', () => {
    expect(gmSanitizeLineupChoice(toy, undefined)).toEqual({});
    expect(gmSanitizeLineupChoice(toy, 'junk')).toEqual({});
    expect(gmSanitizeLineupChoice(toy, { slots: { top: ['a1', 'a1', 'a2'], arms: ['p2', 'p1', null] } })).toEqual({ slots: { arms: ['p2', 'p1', null] } });
    expect(gmSanitizeLineupChoice(toy, { slots: { top: ['a1', 7, 'a2'], arms: ['p1'] } })).toEqual({});
    const nfl = nflLineupSport();
    expect(gmSanitizeLineupChoice(nfl, { schemes: { skill: '12', def: '99' }, slots: { qb: ['x'] } })).toEqual({ schemes: { skill: '12' } });
    /* a skip is kept only on a rotation's optional slot, beside its slots */
    expect(gmSanitizeLineupChoice(toy, { slots: { arms: ['p1', 'p2', null] }, open: { arms: [2] } })).toEqual({ slots: { arms: ['p1', 'p2', null] }, open: { arms: [2] } });
    expect(gmSanitizeLineupChoice(toy, { slots: { arms: ['p1', 'p2', null] }, open: { arms: [0] } })).toEqual({ slots: { arms: ['p1', 'p2', null] } });
    expect(gmSanitizeLineupChoice(toy, { open: { arms: [2], top: [2] } })).toEqual({});
  });

  it('a sport with schemes and men picked by hand keeps the men saved under the scheme', () => {
    const shaped: GmLineupSport<Toy> = {
      ...toy,
      schemes: { top: [{ key: 'three', label: 'Three', slots: toyGroups[0].slots }, { key: 'two', label: 'Two', slots: toyGroups[0].slots.slice(0, 2) }] },
    };
    const raw = { schemes: { top: 'two' }, slots: { top: ['a2', 'a1'] } };
    expect(gmSanitizeLineupChoice(shaped, raw)).toEqual(raw);
    expect(gmSanitizeLineupChoice(shaped, { slots: { top: ['a2', 'a1'] } })).toEqual({});
    expect(gmResolveLineup(shaped, toyTeam(), raw).top.map(p => p?.id)).toEqual(['a2', 'a1']);
    /* switching the shape drops the men saved for the old one */
    expect(gmLineupSetScheme(shaped, raw, 'top', 'three')).toEqual({});
  });

  it('a scheme switch saves only off the default, and a reset forgets the group', () => {
    const nfl = nflLineupSport();
    const twelve = gmLineupSetScheme(nfl, {}, 'skill', '12')!;
    expect(twelve).toEqual({ schemes: { skill: '12' } });
    expect(gmLineupSetScheme(nfl, twelve, 'skill', '12')).toBeNull();
    expect(gmLineupSetScheme(nfl, twelve, 'skill', '11')).toEqual({});
    expect(gmLineupSetScheme(nfl, {}, 'skill', '33')).toBeNull();
    expect(gmLineupReset({ schemes: { skill: '21', def: '34' } }, 'def')).toEqual({ schemes: { skill: '21' } });
  });
});

const lcg = (start: number) => { let s = start >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const player = (id: string, pos: string, ovr: number, out = 0) => ({ id, name: `Player ${id}`, pos, age: 27, ovr, salary: 1, years: 2, out, pot: ovr });

describe('the three sports read today\'s strength with no choices', () => {
  it('MLB: a batting nine, five starters, a closer and a setup man', () => {
    const bats = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'C'].map((pos, i) => player(`b${i}`, pos, 60 + i * 3));
    const arms = [...[70, 82, 64, 77, 59, 68].map((o, i) => player(`s${i}`, 'SP', o)), player('r0', 'RP', 72), player('r1', 'CL', 80), player('r2', 'RP', 61)];
    const t: MlbGmTeam = { abbr: 'TST', players: [...bats, ...arms], wins: 0, losses: 0, picks: [] };
    const sport = mlbLineupSport();
    expect(gmLineupStrength(sport, t)).toBe(mlbStrength(t));
    const lineup = gmResolveLineup(sport, t);
    expect(lineup.bats.map(p => p?.id)).toEqual(['b9', 'b8', 'b7', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1']);
    expect(lineup.rotation.map(p => p?.ovr)).toEqual([82, 77, 70, 68, 64]);
    expect(lineup.pen.map(p => p?.id)).toEqual(['r1', 'r0']);
    t.players.find(p => p.id === 's1')!.out = 3;
    expect(gmLineupStrength(sport, t)).toBe(mlbStrength(t));
    const benched = gmLineupSwap(sport, t, {}, 'bats', { id: 'b9' }, { id: 'b0' })!;
    expect(gmLineupStrength(sport, t, benched)).toBeLessThan(mlbStrength(t));
  });

  it('NHL: lines and pairs open on the GM\'s contributors', () => {
    const fwd = [80, 78, 75, 72, 70, 68, 66, 64].map((o, i) => player(`f${i}`, i % 3 ? 'W' : 'C', o));
    const d = [79, 74, 71, 69, 65].map((o, i) => player(`d${i}`, 'D', o));
    const g = [player('g0', 'G', 81), player('g1', 'G', 73)];
    const t = { abbr: 'TST', players: [...fwd, ...d, ...g], wins: 0, losses: 0, otLosses: 0, picks: [] } as unknown as NhlGmTeam;
    const sport = nhlLineupSport();
    expect(gmLineupStrength(sport, t)).toBe(nhlStrength(t));
    expect(nhlSetContributors(t, { forwards: ['f7', 'f1', 'f2', 'f3', 'f4', 'f5'], defense: ['d4', 'd1', 'd2', 'd3'], goalie: 'g1' })).toBe(true);
    expect(gmLineupStrength(sport, t)).toBe(nhlStrength(t));
    const lines = gmResolveLineup(sport, t);
    expect(lines.forwards.slice(0, 6).map(p => p?.id).sort()).toEqual(['f1', 'f2', 'f3', 'f4', 'f5', 'f7']);
    expect(lines.goalie.map(p => p?.id)).toEqual(['g1', 'g0']);
    expect(lines.pp.slice(0, 5).map(p => p?.pos)).toEqual(['C', 'W', 'W', 'C', 'D']);
  });

  it('NFL: the chart\'s starters, and a scheme only moves the number by what it reads differently', () => {
    const lg = initLeague(lcg(5));
    const sport = nflLineupSport();
    for (const t of Object.values(lg.teams)) expect(gmLineupStrength(sport, t)).toBe(teamStrength(t));
    const t = Object.values(lg.teams)[3];
    const wr = t.players.filter(p => p.pos === 'WR');
    swapDepth(t, 'WR', wr[0].id, wr[wr.length - 1].id);
    expect(gmLineupStrength(sport, t)).toBe(teamStrength(t));
    const reading = gmLineupReading(sport, t, { schemes: { skill: '12', def: '34' } });
    expect(reading.groups.find(g => g.key === 'qb')!.delta).toBe(0);
    expect(reading.groups.find(g => g.key === 'ol')!.delta).toBe(0);
    expect(reading.strength).toBeCloseTo(teamStrength(t) + reading.groups.reduce((s, g) => s + g.delta, 0), 10);
  });
});
