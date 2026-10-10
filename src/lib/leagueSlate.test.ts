import { describe, expect, it, vi } from 'vitest';
import { mulberry32 } from './leagueCore';
import { PATTERN_4X9, slateCost, slateFloor, swissSlate, type SlateSpec } from './leagueSlate';

/* Round 1228: crafted fields for the league phase slate. The fleet (thousands of fields, the rates) is
   scripts/simCmLeaguePhase.mjs section 1; these are the cases a reader can check by hand. */

const POTS = [0, 1, 2, 3].map(p => Array.from({ length: 9 }, (_, i) => p * 9 + i));
const DISTINCT = Array.from({ length: 36 }, (_, i) => i);

/** Every structural rule of a four pot slate, as a list of what is wrong. */
function faults(spec: SlateSpec, matches: readonly (readonly [number, number, number])[]): string[] {
  const out: string[] = [];
  const potOf = new Map<number, number>();
  spec.pots.forEach((pot, p) => pot.forEach(c => potOf.set(c, p)));
  const n = spec.assoc.length;
  const home = Array.from({ length: n }, () => [0, 0, 0, 0]);
  const away = Array.from({ length: n }, () => [0, 0, 0, 0]);
  const opponents = Array.from({ length: n }, () => new Set<number>());
  const days = Array.from({ length: n }, () => new Set<number>());
  if (matches.length !== n * 4) out.push(`${matches.length} matches`);
  for (const [h, a, d] of matches) {
    home[h][potOf.get(a) as number] += 1;
    away[a][potOf.get(h) as number] += 1;
    opponents[h].add(a); opponents[a].add(h);
    if (d < 0 || d > 7 || days[h].has(d) || days[a].has(d)) out.push(`matchday ${d} is wrong for ${h} or ${a}`);
    days[h].add(d); days[a].add(d);
  }
  for (let c = 0; c < n; c += 1) {
    if (opponents[c].size !== 8 || opponents[c].has(c)) out.push(`club ${c} does not meet eight different clubs`);
    if (home[c].some(x => x !== 1) || away[c].some(x => x !== 1)) out.push(`club ${c} is not one home and one away against each pot`);
  }
  return out;
}

/** An association per club: `rows` gives, pot by pot, the association of each seat ('.' is a club alone). */
function field(rows: string[]): SlateSpec {
  let lone = 100;
  const assoc = rows.flatMap(row => [...row].map(ch => (ch === '.' ? (lone += 1) : ch.charCodeAt(0))));
  return { pots: POTS, assoc };
}

describe('swissSlate', () => {
  it('draws a legal slate when nothing constrains it, the same one from the same stream', () => {
    const spec = { pots: POTS, assoc: DISTINCT };
    const a = swissSlate(spec, mulberry32(7));
    const b = swissSlate(spec, mulberry32(7));
    const c = swissSlate(spec, mulberry32(8));
    expect(a && faults(spec, a.matches)).toEqual([]);
    expect(a).toEqual(b);
    expect(a?.matches).not.toEqual(c?.matches);
    expect(a).toMatchObject({ breaks: 0, overCap: 0, fallback: false, floor: { breaks: 0, overCap: 0 } });
  });

  it('never reads Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    swissSlate({ pots: POTS, assoc: DISTINCT }, mulberry32(3));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('keeps a five club association with four in one pot inside both rules', () => {
    const spec = field(['EEEE.....', 'E........', '.........', '.........']);
    expect(slateFloor(spec)).toEqual({ breaks: 0, overCap: 0 });
    for (let seed = 1; seed <= 20; seed += 1) {
      const slate = swissSlate(spec, mulberry32(seed));
      expect(slate && faults(spec, slate.matches)).toEqual([]);
      expect(slate).toMatchObject({ breaks: 0, overCap: 0, fallback: false });
    }
  });

  it('breaks the ban once, and only inside the pot, when five of one association share a pot', () => {
    const spec = field(['EEEEE....', '.........', '.........', '.........']);
    expect(slateFloor(spec)).toEqual({ breaks: 1, overCap: 0 });
    for (let seed = 1; seed <= 20; seed += 1) {
      const slate = swissSlate(spec, mulberry32(seed));
      expect(slate && faults(spec, slate.matches)).toEqual([]);
      expect(slate).toMatchObject({ breaks: 1, overCap: 0, fallback: false });
      const same = (slate?.matches ?? []).filter(([h, a]) => spec.assoc[h] === spec.assoc[a]);
      expect(same).toHaveLength(1);
      expect(same[0][0]).toBeLessThan(5);
      expect(same[0][1]).toBeLessThan(5);
    }
  });

  it('goes two over the cap, and no further, when a six club association has four in one pot', () => {
    const spec = field(['EEEE.....', 'EE.......', '.........', '.........']);
    expect(slateFloor(spec)).toEqual({ breaks: 0, overCap: 2 });
    for (let seed = 1; seed <= 20; seed += 1) {
      const slate = swissSlate(spec, mulberry32(seed));
      expect(slate && faults(spec, slate.matches)).toEqual([]);
      expect(slate).toMatchObject({ breaks: 0, overCap: 2, fallback: false });
    }
  });

  it('reports what its matches really cost', () => {
    const spec = field(['EEEEE....', 'SSSS.....', 'SS.......', '.........']);
    const slate = swissSlate(spec, mulberry32(11));
    expect(slate).not.toBeNull();
    expect(slateCost(spec, slate?.matches ?? [])).toEqual({ breaks: slate?.breaks, overCap: slate?.overCap });
  });

  it('seats the recorded pattern, and says so, when it is given no tries', () => {
    const spec = { ...field(['EEEEE....', 'SSSS.....', 'SS.......', '.........']), tries: 0 };
    const slate = swissSlate(spec, mulberry32(5));
    expect(slate && faults(spec, slate.matches)).toEqual([]);
    expect(slate).toMatchObject({ fallback: true, tries: 0 });
    expect(slateCost(spec, slate?.matches ?? [])).toEqual({ breaks: slate?.breaks, overCap: slate?.overCap });
  });

  it('holds a recorded pattern that is itself a legal slate', () => {
    const matches = PATTERN_4X9.map((code): [number, number, number] => [Math.floor(code / 36) % 36, code % 36, Math.floor(code / 1296)]);
    expect(faults({ pots: POTS, assoc: DISTINCT }, matches)).toEqual([]);
  });

  it('answers null for pots it cannot draw, and has no pattern for another shape', () => {
    expect(swissSlate({ pots: [[0, 1, 2], [3, 4]], assoc: [0, 1, 2, 3, 4] }, mulberry32(1))).toBeNull();
    expect(swissSlate({ pots: [[0, 1, 2], [3, 4, 4]], assoc: [0, 1, 2, 3, 4, 5] }, mulberry32(1))).toBeNull();
    expect(swissSlate({ pots: POTS, assoc: [1, 2, 3] }, mulberry32(1))).toBeNull();
    const small = { pots: [[0, 1, 2], [3, 4, 5]], assoc: [0, 1, 2, 3, 4, 5], tries: 0 };
    expect(swissSlate(small, mulberry32(1))).toBeNull();
  });
});
