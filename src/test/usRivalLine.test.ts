/**
 * Round 1227: the head to head with the rival is read off the two printed season lines, through the pickers in
 * src/lib/usCareerStatLine.ts (nflLineAsPrinted, mlbLineAsPrinted, nhlLineAsPrinted). This file holds each
 * picker to the printer beside it: a line is printed, the text is read back by a parser written HERE, and the
 * numbers must be the picker's own, no more and no fewer. A part added to a printer without its picker, or a
 * scored stat picked that the screen does not print, fails here.
 */
import { describe, expect, it } from 'vitest';
import {
  nflStatLine, mlbStatLine, nhlStatLine,
  nflLineAsPrinted, mlbLineAsPrinted, nhlLineAsPrinted, NFL_RB_PRINTED_YARDS_A_CATCH,
} from '@/lib/usCareerStatLine';
import { keyedRng } from '@/lib/keyedRng';
import type { CareerPos, SeasonLine } from '@/lib/nflMyCareer';
import type { MlbCareerPos, MlbSeasonLine } from '@/lib/mlbMyCareer';
import type { NhlCareerPos, NhlSeasonLine } from '@/lib/nhlMyCareer';

const LINES = 400;
const num = (s: string): number => Number(s.replace(/,/g, ''));
const int = (rng: () => number, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
const half = (rng: () => number, hi: number): number => Math.round(rng() * hi * 2) / 2;
const places = (x: number, n: number): number => Math.round(x * 10 ** n) / 10 ** n;

/** What a printed line reads back as: every named part of the position's own shape. Null when it is not that shape. */
function readBack(shape: RegExp, text: string): Record<string, number> | null {
  const m = shape.exec(text);
  if (!m?.groups) return null;
  return Object.fromEntries(Object.entries(m.groups).map(([k, v]) => [k, num(v)]));
}
/** A picker's numbers without the `games` it carries for the type. */
function picked(line: object): Record<string, number> {
  return Object.fromEntries(Object.entries(line).filter(([k, v]) => k !== 'games' && typeof v === 'number')) as Record<string, number>;
}

const NFL_SHAPE: Record<CareerPos, RegExp> = {
  QB: /^(?<passYds>[\d,]+) yds, (?<passTd>\d+) TD, (?<ints>\d+) INT$/,
  RB: /^(?<rushYds>[\d,]+) rush yds, (?<rushTd>\d+) TD, (?<rec>\d+) rec$/,
  WR: /^(?<rec>\d+) rec, (?<recYds>[\d,]+) yds, (?<recTd>\d+) TD$/,
  TE: /^(?<rec>\d+) rec, (?<recYds>[\d,]+) yds, (?<recTd>\d+) TD$/,
  LB: /^(?<tackles>\d+) tackles?, (?<sacks>\d+(?:\.5)?) sacks?, (?<picks>\d+) INT$/,
  CB: /^(?<picks>\d+) INT, (?<passDef>\d+) pass(?:es)? defended, (?<tackles>\d+) tackles?$/,
  EDGE: /^(?<sacks>\d+(?:\.5)?) sacks?, (?<tackles>\d+) tackles?, (?<forcedFum>\d+) forced fumbles?$/,
  K: /^(?<fgMade>\d+) of \d+ FG, long of (?<longFg>\d+)$/,
};
/** A season with every stat the engine records at that position, the unprinted ones included. */
function nflLine(pos: CareerPos, rng: () => number): SeasonLine {
  const base: SeasonLine = { year: 2026, team: 'X', age: 25, ovr: 80, games: 17, awards: [], teamResult: '', salary: 1 };
  switch (pos) {
    case 'QB': return { ...base, passYds: int(rng, 0, 5450), passTd: int(rng, 0, 55), ints: int(rng, 0, 25) };
    case 'RB': return { ...base, rushYds: int(rng, 0, 2080), rushTd: int(rng, 0, 22), rec: int(rng, 0, 90), recYds: int(rng, 0, 800) };
    case 'WR':
    case 'TE': return { ...base, rec: int(rng, 0, 145), recYds: int(rng, 0, 1950), recTd: int(rng, 0, 18) };
    case 'LB': return { ...base, tackles: int(rng, 0, 200), sacks: half(rng, 12), picks: int(rng, 0, 6), forcedFum: int(rng, 0, 4) };
    case 'CB': return { ...base, tackles: int(rng, 0, 90), picks: int(rng, 0, 9), passDef: int(rng, 0, 25), forcedFum: int(rng, 0, 3) };
    case 'EDGE': return { ...base, sacks: half(rng, 23), tackles: int(rng, 0, 80), forcedFum: int(rng, 0, 6), passDef: int(rng, 0, 5) };
    default: { const att = int(rng, 1, 40); return { ...base, fgAtt: att, fgMade: int(rng, 0, att), longFg: int(rng, 30, 66) }; }
  }
}

describe('Round 1227: a picker returns exactly what its printer prints', () => {
  it('NFL: every position, printed parts only, a back\'s catches at the bridge', () => {
    for (const pos of Object.keys(NFL_SHAPE) as CareerPos[]) {
      const rng = keyedRng(`usRivalLine|nfl|${pos}`);
      for (let i = 0; i < LINES; i += 1) {
        const line = nflLine(pos, rng);
        const text = nflStatLine(line, pos);
        const read = readBack(NFL_SHAPE[pos], text);
        expect(read, `${pos} "${text}"`).not.toBeNull();
        const want = pos === 'RB' ? { ...read, recYds: read!.rec * NFL_RB_PRINTED_YARDS_A_CATCH } : read;
        expect(picked(nflLineAsPrinted(line, pos)), `${pos} "${text}"`).toEqual(want);
      }
    }
  });
  it('NFL: the bridge is 8 yards a catch, the middle of the engine\'s 6.5 plus up to 3', () => {
    expect(NFL_RB_PRINTED_YARDS_A_CATCH).toBe(8);
    expect(6.5 + 3 / 2).toBe(NFL_RB_PRINTED_YARDS_A_CATCH);
  });

  it('MLB: a starter, a reliever and a bat', () => {
    const shape = (p: MlbCareerPos): RegExp => (p === 'SP'
      ? /^(?<wins>\d+)-\d+, (?<era>\d+\.\d\d) ERA, (?<so>[\d,]+) K$/
      : p === 'RP' ? /^(?<saves>\d+) saves?, (?<holds>\d+) holds?, (?<era>\d+\.\d\d) ERA, (?<so>[\d,]+) K$/
        : /^(?<avg>\.\d{3}), (?<hr>\d+) HR, (?<rbi>\d+) RBI$/);
    for (const pos of ['SP', 'RP', 'C', 'SS', 'CF', 'DH'] as MlbCareerPos[]) {
      const rng = keyedRng(`usRivalLine|mlb|${pos}`);
      for (let i = 0; i < LINES; i += 1) {
        const base: MlbSeasonLine = { year: 2026, team: 'X', age: 25, ovr: 80, games: 150, awards: [], teamResult: '', salary: 1 };
        const line: MlbSeasonLine = pos === 'SP'
          ? { ...base, wins: int(rng, 0, 24), lossesP: int(rng, 0, 18), era: places(1.5 + rng() * 4, 2), so: int(rng, 20, 320) }
          : pos === 'RP' ? { ...base, wins: int(rng, 0, 9), lossesP: int(rng, 0, 9), saves: int(rng, 0, 55), holds: int(rng, 0, 41), era: places(1 + rng() * 4, 2), so: int(rng, 10, 130) }
            : { ...base, avg: places(0.18 + rng() * 0.18, 3), hr: int(rng, 0, 60), rbi: int(rng, 0, 150), sb: int(rng, 0, 70), doubles: int(rng, 0, 50), obp: places(0.25 + rng() * 0.2, 3) };
        const text = mlbStatLine(line, pos);
        const read = readBack(shape(pos), text);
        expect(read, `${pos} "${text}"`).not.toBeNull();
        expect(picked(mlbLineAsPrinted(line, pos)), `${pos} "${text}"`).toEqual(read);
      }
    }
  });

  it('NHL: a goalie and a skater', () => {
    for (const pos of ['G', 'C', 'D'] as NhlCareerPos[]) {
      const rng = keyedRng(`usRivalLine|nhl|${pos}`);
      const shape = pos === 'G' ? /^(?<wins>\d+) W, (?<svpct>\.\d{3}) SV%$/ : /^(?<goals>\d+) G, (?<assists>\d+) A, (?<points>\d+) P$/;
      for (let i = 0; i < LINES; i += 1) {
        const base: NhlSeasonLine = { year: 2026, team: 'X', age: 25, ovr: 80, games: 82, awards: [], teamResult: '', salary: 1 };
        const goals = int(rng, 0, 70); const assists = int(rng, 0, 100);
        const line: NhlSeasonLine = pos === 'G' ? { ...base, wins: int(rng, 0, 48), svpct: places(0.88 + rng() * 0.05, 3) } : { ...base, goals, assists, points: goals + assists };
        const text = nhlStatLine(line, pos);
        const read = readBack(shape, text);
        expect(read, `${pos} "${text}"`).not.toBeNull();
        expect(picked(nhlLineAsPrinted(line, pos)), `${pos} "${text}"`).toEqual(read);
      }
    }
  });
});
