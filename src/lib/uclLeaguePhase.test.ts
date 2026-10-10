import { describe, expect, it } from 'vitest';
import {
  BRACKET_LINES, HALF_SLOTS, LEAGUE_PHASE_SHAPES, PLAYOFF_PAIRS, UCL_LEAGUE, drawUclKnockout, drawUclLeaguePhase,
  leaguePhaseFootnote, leaguePhasePots, leaguePhaseZone, nextRoundTie, slateFixtureOf, slateFixtures, slateOpponents,
  sortedLeaguePhaseTable, type LeaguePhaseRow,
} from './uclLeaguePhase';
import { slateCost, slateFloor } from './leagueSlate';

/* Round 1228: the cases a reader can check by hand. The fleets are scripts/simCmLeaguePhase.mjs. */

/** 36 clubs, nine associations of four, strength falling with the number. */
const FIELD = Array.from({ length: 36 }, (_, i) => `Club ${String(i + 1).padStart(2, '0')}`);
const strengthOf = (club: string) => 100 - Number(club.slice(5));
const assocOf = (club: string) => `Land ${Number(club.slice(5)) % 9}`;
const draw = (seed: number) => drawUclLeaguePhase({ field: FIELD, holder: 'Club 30', seed, strengthOf, assocOf });

describe('the league phase numbers', () => {
  it('are the real ones, and the Europa League shares them', () => {
    expect(UCL_LEAGUE).toMatchObject({ clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 8, playoffTo: 24, capPerAssociation: 2, winPoints: 3, drawPoints: 1 });
    expect(LEAGUE_PHASE_SHAPES.uel).toEqual(LEAGUE_PHASE_SHAPES.ucl);
    expect(LEAGUE_PHASE_SHAPES.uecl).toMatchObject({ clubs: 36, pots: 6, potSize: 6, perPot: 1, games: 6, home: 3, away: 3 });
  });
  it('sort a position into its zone', () => {
    expect([1, 8, 9, 24, 25, 36].map(leaguePhaseZone)).toEqual(['r16', 'r16', 'playoff', 'playoff', 'out', 'out']);
  });
});

describe('the pots and the slate', () => {
  it('puts the holders top of pot one, then goes by strength, then by name', () => {
    const pots = leaguePhasePots(FIELD, 'Club 30', strengthOf);
    expect(pots?.map(p => p.length)).toEqual([9, 9, 9, 9]);
    expect(pots?.[0].slice(0, 3)).toEqual(['Club 30', 'Club 01', 'Club 02']);
    expect(leaguePhasePots(['B', 'A', ...FIELD.slice(2)], null, () => 1)?.[0].slice(0, 2)).toEqual(['A', 'B']);
    expect(leaguePhasePots(FIELD.slice(1), null, strengthOf)).toBeNull();
    expect(leaguePhasePots([...FIELD.slice(1), 'Club 02'], null, strengthOf)).toBeNull();
  });

  it('draws the same slate from the same seed and survives a round trip through JSON', () => {
    const slate = draw(77);
    expect(slate).toEqual(draw(77));
    expect(slate?.fx).not.toEqual(draw(78)?.fx);
    expect(JSON.parse(JSON.stringify(slate))).toEqual(slate);
    expect(slate).toMatchObject({ v: 1, seed: 77, breaks: 0, overCap: 0 });
    expect(slate?.clubs).toEqual(leaguePhasePots(FIELD, 'Club 30', strengthOf)?.flat());
    expect(slate?.fx).toHaveLength(144);
    expect([...(slate?.fx ?? [])].sort((a, b) => a - b)).toEqual(slate?.fx);
  });

  it('gives every club eight different opponents, four at home, none of its own association', () => {
    const slate = draw(5);
    if (!slate) throw new Error('no slate');
    for (let d = 0; d < 8; d += 1) expect(slateFixtures(slate, d)).toHaveLength(18);
    for (const club of FIELD) {
      const opponents = slateOpponents(slate, club);
      expect(new Set(opponents).size).toBe(8);
      expect(opponents.every(o => assocOf(o) !== assocOf(club))).toBe(true);
      const mine = Array.from({ length: 8 }, (_, d) => slateFixtureOf(slate, club, d));
      expect(mine.filter(f => f?.home).length).toBe(4);
      expect(mine.map(f => f?.opponent)).toEqual(opponents);
      const pots = opponents.map(o => Math.floor(slate.clubs.indexOf(o) / 9)).sort();
      expect(pots).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    }
    expect(slateFixtureOf(slate, 'Nobody', 0)).toBeNull();
    expect(slateOpponents(slate, 'Nobody')).toEqual([]);
  });

  it('tells one story about who is at home: the fixture list, a club\'s own fixture and the saved code agree', () => {
    /* The binding round takes my club's venue from slateFixtureOf and everybody else's from slateFixtures.
       Counting four home nights cannot see the two flags swapped (four stay four), so each match is read
       three ways here and all three must name the same host. */
    for (const seed of [3, 5, 77]) {
      const slate = draw(seed);
      if (!slate) throw new Error('no slate');
      const codes = new Set(slate.fx);
      let matches = 0;
      for (let d = 0; d < 8; d += 1) {
        for (const [home, away] of slateFixtures(slate, d)) {
          matches += 1;
          expect(slateFixtureOf(slate, home, d)).toEqual({ opponent: away, home: true });
          expect(slateFixtureOf(slate, away, d)).toEqual({ opponent: home, home: false });
          expect(codes.has(d * 1296 + slate.clubs.indexOf(home) * 36 + slate.clubs.indexOf(away))).toBe(true);
          expect(slateOpponents(slate, home)[d]).toBe(away);
          expect(slateOpponents(slate, away)[d]).toBe(home);
        }
      }
      expect(matches).toBe(144);
    }
  });

  it('says so on the saved slate when the search gave up and the recorded pattern was seated', () => {
    /* A world editor's field: fifteen clubs of one association, five in each of pots two, three and four.
       The search cannot draw it inside its budget, so the recorded pattern is seated. The saved slate is
       what a card will read, so the flag must be on IT, not only on the builder's own answer. */
    const fifteen = new Set([9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 27, 28, 29, 31, 32]);
    const swollen = (club: string) => (fifteen.has(Number(club.slice(5))) ? 'Land A' : `Alone ${club}`);
    for (let seed = 1; seed <= 6; seed += 1) {
      const slate = drawUclLeaguePhase({ field: FIELD, holder: 'Club 30', seed, strengthOf, assocOf: swollen });
      if (!slate) throw new Error('no slate');
      const names = slate.clubs.map(swollen);
      const ids = [...new Set(names)];
      const spec = { pots: [0, 1, 2, 3].map(p => Array.from({ length: 9 }, (_, i) => p * 9 + i)), assoc: names.map(a => ids.indexOf(a)), cap: 2 };
      const matches = slate.fx.map((code): [number, number] => [Math.floor(code / 36) % 36, code % 36]);
      const cost = slateCost(spec, matches);
      const floor = slateFloor(spec);
      /* The counts on the save are the counts its matches hold, and they are past anything the search may
         return (two above the floor on either count): only the pattern can have made this slate. */
      expect({ breaks: slate.breaks, overCap: slate.overCap }).toEqual(cost);
      expect(cost.breaks > floor.breaks + 2 || cost.overCap > floor.overCap + 2).toBe(true);
      expect(slate.fallback).toBe(true);
      expect(JSON.parse(JSON.stringify(slate)).fallback).toBe(true);
    }
    /* And a field the search draws carries no such key at all. */
    expect('fallback' in (draw(5) ?? {})).toBe(false);
  });

  it('hands the builder the cap of two: no club meets three of one other association', () => {
    /* Six clubs of one association, four in pot one and two in pot two, leave no room inside the cap: the
       count says two opponents over it and no fewer. A stale cap of three in the wrapper would draw none
       over a cap of three and report 0, so the saved count itself is the check. */
    const six = new Set([1, 2, 3, 4, 9, 10]);
    const sixOf = (club: string) => (six.has(Number(club.slice(5))) ? 'Land A' : `Alone ${club}`);
    for (let seed = 1; seed <= 6; seed += 1) {
      const slate = drawUclLeaguePhase({ field: FIELD, holder: 'Club 30', seed, strengthOf, assocOf: sixOf });
      if (!slate) throw new Error('no slate');
      const faced = new Map<string, number>();
      for (const code of slate.fx) {
        const [h, a] = [slate.clubs[Math.floor(code / 36) % 36], slate.clubs[code % 36]];
        if (sixOf(h) === sixOf(a)) continue;
        for (const [club, other] of [[h, a], [a, h]]) faced.set(`${club}|${sixOf(other)}`, (faced.get(`${club}|${sixOf(other)}`) ?? 0) + 1);
      }
      const over = [...faced.values()].reduce((sum, n) => sum + Math.max(0, n - UCL_LEAGUE.capPerAssociation), 0);
      expect(over).toBe(2);
      expect(slate).toMatchObject({ breaks: 0, overCap: 2 });
    }
  });

  it('refuses a field with a club that has no association', () => {
    expect(drawUclLeaguePhase({ field: FIELD, holder: null, seed: 1, strengthOf, assocOf: c => (c === 'Club 07' ? null : assocOf(c)) })).toBeNull();
  });
});

describe('the single table', () => {
  const row = (club: string, over: Partial<LeaguePhaseRow> = {}): LeaguePhaseRow => ({ club, w: 3, d: 1, l: 1, gf: 10, ga: 5, pts: 10, ...over });
  /** Zeta must finish above Alpha, whichever is handed in first. Their names alone would say the opposite. */
  const zetaFirst = (zeta: Partial<LeaguePhaseRow>, alpha: Partial<LeaguePhaseRow>, results: Record<string, [number, number]> = {}, others: LeaguePhaseRow[] = []) => {
    const [z, a] = [row('Zeta', zeta), row('Alpha', alpha)];
    for (const rows of [[z, a, ...others], [a, z, ...others], [...others, a, z]]) {
      const sorted = sortedLeaguePhaseTable(rows, results).map(r => r.club);
      expect(sorted.indexOf('Zeta')).toBeLessThan(sorted.indexOf('Alpha'));
    }
  };
  const strong = row('Strong', { pts: 9, gf: 9, ga: 4 });
  const weak = row('Weak', { pts: 3, gf: 9, ga: 4 });

  it('puts points first', () => zetaFirst({ pts: 11 }, { gf: 30 }));
  it('step 1, goal difference', () => zetaFirst({ ga: 4 }, {}));
  it('step 2, goals scored', () => zetaFirst({ gf: 11, ga: 6 }, {}));
  it('step 3, away goals scored', () => zetaFirst({}, {}, { 'Strong|Zeta': [0, 3], 'Strong|Alpha': [0, 1] }, [strong]));
  it('step 4, wins', () => zetaFirst({ w: 3, d: 1 }, { w: 2, d: 4 }));
  it('step 5, away wins', () => zetaFirst({}, {}, { 'Strong|Zeta': [0, 1], 'Strong|Alpha': [1, 1] }, [strong]));
  it('step 6, the points of the clubs each has played', () => zetaFirst({}, {}, { 'Zeta|Strong': [1, 0], 'Alpha|Weak': [1, 0] }, [strong, weak]));
  it('step 7, their goal difference', () => zetaFirst({}, {}, { 'Zeta|Strong': [1, 0], 'Alpha|Weak': [1, 0] }, [strong, row('Weak', { pts: 9, gf: 9, ga: 8 })]));
  it('step 8, their goals', () => zetaFirst({}, {}, { 'Zeta|Strong': [1, 0], 'Alpha|Weak': [1, 0] }, [strong, row('Weak', { pts: 9, gf: 6, ga: 1 })]));
  it('falls to the name only when all eight are level', () => {
    expect(sortedLeaguePhaseTable([row('Zeta'), row('Alpha')]).map(r => r.club)).toEqual(['Alpha', 'Zeta']);
  });
  it('has no head to head step', () => {
    zetaFirst({ ga: 4 }, {}, { 'Alpha|Zeta': [3, 0] });
  });
  it('says its order in words, with no dash', () => {
    const words = leaguePhaseFootnote();
    expect(words).toMatch(/goal difference/);
    expect(words).toMatch(/by name/);
    expect(words.includes(String.fromCharCode(0x2013)) || words.includes(String.fromCharCode(0x2014))).toBe(false);
  });
});

describe('the knockout draw', () => {
  const ORDER = Array.from({ length: 36 }, (_, i) => `P${i + 1}`);
  const posOf = (club: string) => Number(club.slice(1));

  it('seeds the top eight, pairs the play-offs inside the real pairings and leaves 25th down out', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const d = drawUclKnockout(ORDER, seed);
      if (!d) throw new Error('no draw');
      expect(d.seeds.map(posOf).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      const inTies = d.playoffs.flatMap(t => [posOf(t.home), posOf(t.away)]).sort((a, b) => a - b);
      expect(inTies).toEqual(Array.from({ length: 16 }, (_, i) => i + 9));
      d.playoffs.forEach((tie, slot) => {
        const line = BRACKET_LINES[HALF_SLOTS[slot % 4]];
        const [high, low] = PLAYOFF_PAIRS[line.playoff];
        expect(high).toContain(posOf(tie.away));
        expect(low).toContain(posOf(tie.home));
        expect(line.seeds).toContain(posOf(d.seeds[slot]));
      });
      expect(Math.floor(d.seeds.indexOf('P1') / 4)).not.toBe(Math.floor(d.seeds.indexOf('P2') / 4));
    }
  });

  it('works the example: 10th is seeded against 23rd or 24th, and a win brings 7th or 8th', () => {
    const d = drawUclKnockout(ORDER, 9);
    const slot = d?.playoffs.findIndex(t => t.away === 'P10') ?? -1;
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(['P23', 'P24']).toContain(d?.playoffs[slot].home);
    expect(['P7', 'P8']).toContain(d?.seeds[slot]);
  });

  it('is the same draw from the same order and seed, and only moves when one of its own positions does', () => {
    expect(drawUclKnockout(ORDER, 3)).toEqual(drawUclKnockout(ORDER, 3));
    const swapped = [...ORDER]; [swapped[29], swapped[30]] = [swapped[30], swapped[29]];
    expect(drawUclKnockout(swapped, 3)).toEqual(drawUclKnockout(ORDER, 3));
    expect(new Set(Array.from({ length: 30 }, (_, s) => JSON.stringify(drawUclKnockout(ORDER, s)))).size).toBeGreaterThan(10);
    expect(drawUclKnockout(ORDER.slice(0, 23), 3)).toBeNull();
  });

  it('pairs the winners of slots 2i and 2i + 1, the even slot at home in the second leg', () => {
    expect(nextRoundTie(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 0)).toEqual({ home: 'b', away: 'a' });
    expect(nextRoundTie(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 3)).toEqual({ home: 'h', away: 'g' });
    expect(nextRoundTie(['a', 'c'], 0)).toEqual({ home: 'c', away: 'a' });
  });
});
