/**
 * Round 1104, the fix pass: rule checks for lines the review found held only
 * by the recorded digest (a digest says "a key moved", never which way is
 * right), and for the two season length readers that had no test at all.
 *
 *   1. The season's own length in the loop: a full 2005 season of 16 games is
 *      a full season for the iron man badge, and the paper counts missed
 *      games from 16 in the throwback and from 17 since 2021.
 *   2. The awards games gate is the season's length minus two (the lead's
 *      ruling): a 14 game season of 16 can win, a 13 game one cannot; today
 *      it is 15 of 17 as it always was.
 *   3. An injury is counted off the season's own length.
 *   4. The award pace line, held against nflSeasonScore itself: a 16 game
 *      season scored at pace equals the same production over 17 games, for
 *      every position, so no stat the score reads can be left off the line
 *      (sacks were the review's example). A distance (the long field goal)
 *      is not a volume and is left alone, and the saved line is not touched.
 *
 * Each of these was a mutation the review ran with every rule check green.
 */
import { describe, it, expect } from 'vitest';
import { nflSeasonScore } from '@/lib/careerAwards';
import { nflBadgeFacts, nflHeadlinesFor } from '@/lib/nflCareerLoop';
import { nflAwardPaceLine, nflSeasonLength, simSeason, type CareerState, type SeasonLine } from '@/lib/nflMyCareer';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { keyedStream } from './helpers/usCareerDrive';

const NAME = 'Rule Probe';
const BIG_AWARDS = ['All-Pro', 'Defensive Player of the Year', 'MVP'];

function career(pos: string, eraId: string, over: Partial<CareerState> = {}): CareerState {
  const r = keyedStream(`rules:${pos}:${eraId}`);
  const sport = NFL_CAREER_SPORT;
  const c = sport.startCareer(NAME, pos, sport.create.archetypes[pos][0], r, null as never, eraId) as CareerState;
  return { ...c, role: 'starter', ...over };
}
const plain = (c: CareerState, year: number, games: number, over: Partial<SeasonLine> = {}): SeasonLine => ({
  year, team: c.team, age: 25, ovr: 80, games, awards: [], teamResult: 'Missed the playoffs', salary: 1, ...over,
});

describe('Round 1104: the loop reads the length of the season it is looking at', () => {
  it('a full 16 game season before 2021 is a full season, and 16 of 17 is not', () => {
    const c = career('QB', 'y2005');
    c.seasons = [plain(c, 2005, 16), plain(c, 2006, 15), plain(c, 2020, 16), plain(c, 2021, 16), plain(c, 2022, 17)];
    expect(nflSeasonLength(2020)).toBe(16);
    expect(nflSeasonLength(2021)).toBe(17);
    expect(nflBadgeFacts(c).fullSeasons).toBe(3);
  });

  it('the paper counts missed games from the season that was played', () => {
    const c = career('QB', 'y2005');
    const cost = (year: number, games: number) => nflHeadlinesFor(c, plain(c, year, games)).filter(h => h.startsWith('Injury cost'));
    /* The NFL paper writes an injury up from four games missed. */
    expect(cost(2005, 16)).toEqual([]);
    expect(cost(2005, 13)).toEqual([]);
    expect(cost(2005, 12)).toEqual([`Injury cost ${NAME} 4 games this season`]);
    expect(cost(2021, 14)).toEqual([]);
    expect(cost(2021, 13)).toEqual([`Injury cost ${NAME} 4 games this season`]);
    /* A bench year is short by design and is never written up as an injury. */
    const bench = { ...c, role: 'backup' as const };
    expect(nflHeadlinesFor(bench, plain(c, 2005, 8)).filter(h => h.startsWith('Injury cost'))).toEqual([]);
  });
});

describe('Round 1104: awards and injuries read the season length', () => {
  /* A 99 rated edge rusher with a bad body: he is hurt often (so there are plenty of short seasons to read)
     and good enough to win when the gate lets him. One season a draw, each on a fresh copy. */
  for (const [eraId, year] of [['y2005', 2005], ['now', 2026]] as const) {
    it(`${year}: the gate is the schedule less two, and an injury is counted off the schedule`, () => {
      const base = career('EDGE', eraId, { ovr: 99, pot: 99, morale: 80, health: 40, year });
      base.seasons = [plain(base, year - 1, nflSeasonLength(year - 1))];
      const snap = JSON.stringify(base);
      const len = nflSeasonLength(year);
      const r = keyedStream(`gate:${eraId}`);
      let atGate = 0; let wonAtGate = 0; let under = 0; let wonUnder = 0; let hurt = 0; let whole = 0;
      for (let i = 0; i < 6000; i += 1) {
        const c = JSON.parse(snap) as CareerState;
        const { line, notes } = simSeason(c, 80, r);
        const big = line.awards.some(a => BIG_AWARDS.includes(a));
        const m = notes.map(n => n.match(/Missed (\d+) games hurt/)).find(Boolean);
        if (m) {
          hurt += 1;
          expect(line.games, 'an injured season is the schedule less the games missed').toBe(Math.max(4, len - Number(m[1])));
        } else {
          whole += 1;
          expect(line.games, 'a healthy starter plays the whole schedule').toBe(len);
        }
        if (line.games === len - 2) { atGate += 1; if (big) wonAtGate += 1; }
        if (line.games < len - 2) { under += 1; if (big) wonUnder += 1; }
      }
      expect(hurt, 'the probe read injured seasons').toBeGreaterThan(300);
      expect(whole, 'and healthy ones').toBeGreaterThan(300);
      expect(atGate, 'seasons exactly two games short').toBeGreaterThan(40);
      expect(under, 'seasons more than two games short').toBeGreaterThan(200);
      expect(wonAtGate, `two games short of ${len} can still win`).toBeGreaterThan(0);
      expect(wonUnder, `more than two games short of ${len} never wins`).toBe(0);
    }, 120_000);
  }
});

describe('Round 1104: the award pace line', () => {
  const full: SeasonLine = {
    year: 2026, team: 'DAL', age: 27, ovr: 90, games: 17, awards: [], teamResult: 'Missed the playoffs', salary: 10,
    passYds: 4420, passTd: 34, ints: 11, rushYds: 1190, rushTd: 9, rec: 88, recYds: 1105, recTd: 8,
    tackles: 119, sacks: 12.5, picks: 5, passDef: 13, forcedFum: 3, fgAtt: 34, fgMade: 30, longFg: 57,
  };
  const VOLUMES = ['passYds', 'passTd', 'ints', 'rushYds', 'rushTd', 'rec', 'recYds', 'recTd', 'tackles', 'sacks', 'picks', 'passDef', 'forcedFum', 'fgAtt', 'fgMade'] as const;
  /** The same production over a 16 game schedule: every volume at 16 seventeenths, the distance as it is. */
  const short: SeasonLine = { ...full, year: 2010, games: 16 };
  for (const k of VOLUMES) short[k] = (full[k] as number) * 16 / 17;

  it('scores a 16 game season at pace exactly like the same production over 17 games, in all eight positions', () => {
    for (const pos of NFL_CAREER_SPORT.create.positions) {
      const paced = nflSeasonScore(pos, nflAwardPaceLine(short, 16));
      expect(paced, pos).toBeCloseTo(nflSeasonScore(pos, full), 8);
      /* And the pace matters for this position: the raw 16 game line scores under it (a kicker's score is
         partly a distance, so only the volume part moves, but it still moves). */
      expect(nflSeasonScore(pos, short), `${pos} raw`).toBeLessThan(paced);
    }
  });

  it('leaves a distance alone, never writes into the saved line, and is the line itself at 17 games', () => {
    const before = JSON.stringify(short);
    const pace = nflAwardPaceLine(short, 16);
    expect(pace.longFg).toBe(short.longFg);
    expect(pace.games).toBe(16);
    expect(JSON.stringify(short)).toBe(before);
    expect(pace).not.toBe(short);
    expect(nflAwardPaceLine(full, 17)).toBe(full);
  });
});
