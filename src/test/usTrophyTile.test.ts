/**
 * Round 1149: the hub's Trophy Case tile counts every award in the NFL, MLB
 * and NHL careers too.
 *
 * Round 1112 gave the NBA one more honours row, for every award its named
 * rows do not count, because a career whose only awards were the lesser ones
 * read "Empty" on the tile over a case that listed them. The other three
 * careers had the same hole: a Rookie of the Year in the NFL, a Gold Glove or
 * a batting title in MLB, a Calder or a Selke in the NHL. The row is one
 * shared function now (otherAwardsRow in careerHub.ts) and each sport hands
 * it the awards its own rows already count.
 *
 * Two halves. Built seasons, so each award word is checked by name and the
 * old row is shown to read Empty (the check can fail). And the real engines,
 * a small seeded fleet a sport: the tile is the rings plus every award on the
 * seasons, career by career, which is what proves each named list is the
 * engine's own words (an award named here that the engine counts nowhere, or
 * one it counts that is not named, breaks the sum). The full size proof is
 * scripts/simNbaAwardsSense.mjs section K.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { careerHubTiles, honoursTotal, trophyLines, type CareerHubFacts } from '@/lib/careerHub';
import { ARCHETYPES, startCareer, rollTeamQuality, simSeason, progress, shouldRetire } from '@/lib/nflMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, mlbRollTeamQuality, simMlbSeason, mlbProgress, mlbShouldRetire } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer, nhlRollTeamQuality, simNhlSeason, nhlProgress, nhlShouldRetire } from '@/lib/nhlMyCareer';

type Row = { label: string; n: number };
type AnySport = { ringWord: string; honours: (c: never) => Row[]; ringsOf: (c: never) => number };

const mulberry32 = (a: number) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const tileOf = (rings: number, ringWord: string, honours: Row[]) => {
  const facts: CareerHubFacts = {
    ovr: 80, age: 26, pos: 'X', morale: 60, health: 60, fanbase: 50, netWorth: 10, salary: 5, yearlyCosts: 0,
    contractYears: 3, teamLabel: 'Club', seasonsPlayed: 3, lastLine: null, rings, ringWord, honours, headlines: [],
  };
  return careerHubTiles(facts).find(t => t.key === 'trophies')!;
};

/* Each sport: the counters its named rows read, the lesser awards its engine writes, and one season that holds
   an award from every named row. */
const SPORTS = [
  {
    name: 'NFL', sport: NFL_CAREER_SPORT as unknown as AnySport,
    zero: { pos: 'QB', rings: 0, mvps: 0, allPros: 0 },
    lesser: ['Offensive Rookie of the Year', 'Defensive Rookie of the Year'],
    named: { awards: ['MVP', 'All-Pro'], counters: { mvps: 1, allPros: 1 } },
  },
  {
    name: 'MLB', sport: MLB_CAREER_SPORT as unknown as AnySport,
    zero: { pos: 'SS', rings: 0, mvpCys: 0, allStars: 0 },
    lesser: ['Rookie of the Year', 'Gold Glove', 'Silver Slugger', 'Batting Title', 'Home Run Champion', 'ERA Title', 'Saves Leader', 'Comeback Player of the Year'],
    named: { awards: ['MVP', 'All-Star'], counters: { mvpCys: 1, allStars: 1 } },
  },
  {
    name: 'NHL', sport: NHL_CAREER_SPORT as unknown as AnySport,
    zero: { pos: 'C', cups: 0, harts: 0, allStars: 0, connSmythes: 0 },
    lesser: ['Calder Trophy', 'Rocket Richard', 'Art Ross', 'Selke Trophy', 'William Jennings', 'Masterton Nominee', 'Comeback Player of the Year'],
    named: { awards: ['Hart', 'All-Star', 'Conn Smythe'], counters: { harts: 1, allStars: 1, connSmythes: 1 } },
  },
] as const;

const careerWith = (zero: object, awardsBySeason: string[][], counters: object = {}) =>
  ({ ...zero, ...counters, seasons: awardsBySeason.map((awards, i) => ({ year: 2026 + i, awards })) }) as never;

describe('Round 1149: the lesser awards are not an empty case, in the NFL, MLB and NHL', () => {
  for (const S of SPORTS) {
    it(`${S.name}: one lesser award alone is one honour on the tile, whichever it is`, () => {
      for (const award of S.lesser) {
        const c = careerWith(S.zero, [[], [award]]);
        const rows = S.sport.honours(c);
        expect(trophyLines((c as { seasons: { year: number; awards: string[] }[] }).seasons).map(l => l.label), award).toEqual([award]);
        const tile = tileOf(0, S.sport.ringWord, rows);
        expect(tile.value, award).toBe('1 honour');
        expect(tile.sub, award).toBe(`1 in other awards, no ${S.sport.ringWord} yet`);
      }
    });

    it(`${S.name}: the rows before this round are what read Empty for that same player (the check can fail)`, () => {
      const c = careerWith(S.zero, [[], [S.lesser[0]], [S.lesser[S.lesser.length - 1]]]);
      const rows = S.sport.honours(c);
      expect(tileOf(0, S.sport.ringWord, rows.filter(r => r.label !== 'in other awards')).value).toBe('Empty');
      expect(tileOf(0, S.sport.ringWord, rows).value).toBe('2 honours');
    });

    it(`${S.name}: an award with a row of its own is counted once`, () => {
      const c = careerWith(S.zero, [[S.lesser[0]], [...S.named.awards, S.lesser[1]]], S.named.counters);
      const rows = S.sport.honours(c);
      expect(rows.find(r => r.label === 'in other awards')?.n).toBe(2);
      expect(honoursTotal({ rings: 0, honours: rows })).toBe(S.named.awards.length + 2);
    });
  }
});

describe('Round 1149: on the real engines the tile is the rings plus every award on the seasons', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  const FLEETS = [
    { S: SPORTS[0], pos: Object.keys(ARCHETYPES), arch: (p: string) => (ARCHETYPES as Record<string, unknown[]>)[p], start: startCareer, tq: rollTeamQuality, sim: simSeason, prog: progress, stop: shouldRetire },
    { S: SPORTS[1], pos: Object.keys(MLB_ARCHETYPES), arch: (p: string) => (MLB_ARCHETYPES as Record<string, unknown[]>)[p], start: startMlbCareer, tq: mlbRollTeamQuality, sim: simMlbSeason, prog: mlbProgress, stop: mlbShouldRetire },
    { S: SPORTS[2], pos: Object.keys(NHL_ARCHETYPES), arch: (p: string) => (NHL_ARCHETYPES as Record<string, unknown[]>)[p], start: startNhlCareer, tq: nhlRollTeamQuality, sim: simNhlSeason, prog: nhlProgress, stop: nhlShouldRetire },
  ];
  /* Careers a sport. The run is seeded, so the counts are fixed until an engine changes. Measured 2026-10-10:
     NFL 1915 seasons, 20 careers with an award, 3 of them with the lesser ones only; MLB 2272, 53 and 3; NHL
     2532, 66 and 5. The floors (10 and 1) only say the fleet is not empty of the careers the row is for. */
  const CAREERS = 120;

  for (const F of FLEETS) {
    it(`${F.S.name}: ${CAREERS} seeded careers, each tile equal to its rings plus its awards`, () => {
      const rnd = mulberry32(1149 + F.S.name.charCodeAt(1));
      vi.spyOn(Math, 'random').mockImplementation(rnd);
      let withAwards = 0; let lesserOnly = 0; let seasons = 0;
      for (let i = 0; i < CAREERS; i++) {
        const pos = F.pos[i % F.pos.length];
        const archs = F.arch(pos);
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const c: any = (F.start as any)('Sim', pos, archs[i % archs.length], rnd, null);
        let tq: any = null; let guard = 0;
        while (guard++ < 30) {
          tq = (F.tq as any)(tq, rnd);
          (F.sim as any)(c, tq, rnd);
          (F.prog as any)(c, rnd);
          if ((F.stop as any)(c)) break;
        }
        /* eslint-enable @typescript-eslint/no-explicit-any */
        const rings = F.S.sport.ringsOf(c as never);
        const rows = F.S.sport.honours(c as never);
        const held = (c.seasons as { awards?: string[] }[]).reduce((n, s) => n + (s.awards ?? []).length, 0);
        seasons += c.seasons.length;
        expect(honoursTotal({ rings, honours: rows }), `${F.S.name} career ${i} (${pos})`).toBe(rings + held);
        if (held > 0) withAwards += 1;
        if (held > 0 && rings + rows.filter(r => r.label !== 'in other awards').reduce((n, r) => n + r.n, 0) === 0) lesserOnly += 1;
      }
      expect(seasons, `${F.S.name} seasons played`).toBeGreaterThan(CAREERS * 3);
      expect(withAwards, `${F.S.name} careers with an award`).toBeGreaterThanOrEqual(10);
      expect(lesserOnly, `${F.S.name} careers whose only awards are the lesser ones`).toBeGreaterThanOrEqual(1);
    });
  }
});
