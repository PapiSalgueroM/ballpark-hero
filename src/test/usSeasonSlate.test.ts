/* Round 1226: a season already played is a record of what the game played.
 *
 * The MLB and NHL career engines read their season's length from the sourced
 * ledgers now (src/lib/usSeasonShape.ts). A line saved before that carries no
 * `slate`: it was played on the engine's own season (82 and 162), and every
 * reader of a saved line (the paper's missed games, the full season mark, the
 * comeback gate) goes on reading it that way. There is no half played season
 * in these two careers: a season is one call, and that call writes the length
 * it played on its own line, so a season started on one length cannot be
 * finished on another. These tests hold both halves.
 */

import { describe, it, expect } from 'vitest';
import { NHL_ARCHETYPES, startNhlCareer, simNhlSeason, type NhlSeasonLine } from '@/lib/nhlMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, simMlbSeason, type MlbSeasonLine } from '@/lib/mlbMyCareer';
import { nhlBadgeFacts, nhlFullSlateOf, nhlHeadlinesFor } from '@/lib/nhlCareerLoop';
import { mlbBadgeFacts, mlbHeadlinesFor, mlbSlateMark } from '@/lib/mlbCareerLoop';
import { US_ENGINE_SEASON, seasonLength, slateOf } from '@/lib/usSeasonShape';

const seeded = (seed: number) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A skater's line exactly as the engine saved it before this round: no slate. */
const oldNhl = (year: number, games: number, team: string): NhlSeasonLine => ({
  year, team, age: 20 + (year - 2026), ovr: 80, games, goals: 28, assists: 37, points: 65,
  awards: [], teamResult: 'Missed the playoffs', salary: 2.5,
});
const oldMlb = (year: number, games: number, team: string): MlbSeasonLine => ({
  year, team, age: 22 + (year - 2026), ovr: 80, games, avg: 0.271, hr: 22, rbi: 80, sb: 6,
  awards: [], teamResult: 'Missed October', salary: 3,
});

describe('Round 1226: a saved NHL season keeps the length it was played on', () => {
  const save = () => {
    const c = startNhlCareer('Old Save', 'C', NHL_ARCHETYPES.C[0], seeded(11));
    /* 2026-27 and 2027-28 played before the release: 82 game seasons, in years the ledger now reads as 84. */
    c.seasons = [oldNhl(2026, 82, c.team), oldNhl(2027, 79, c.team), oldNhl(2028, 60, c.team)];
    c.year = 2029;
    return c;
  };

  it('reads an old line as an 82 game season everywhere a saved line is read', () => {
    const c = save();
    expect(seasonLength('nhl', 2026, c.team)).toBe(84);
    for (const line of c.seasons) {
      expect(slateOf('nhl', line)).toBe(US_ENGINE_SEASON.nhl);
      expect(nhlFullSlateOf('C', line)).toBe(78);
    }
    /* 79 of 82 is a full season; on an 84 game mark (80) it would not be. */
    expect(nhlBadgeFacts(c).fullSeasons).toBe(2);
    expect(nhlFullSlateOf('C', { slate: 84 })).toBe(80);
    /* The paper counts his missed games from the 82 he was dealt, not from 84. */
    expect(nhlHeadlinesFor(c, c.seasons[2]).join(' | ')).toContain('Injury cost Old Save 22 games this season');
    expect(nhlHeadlinesFor(c, { ...c.seasons[2], slate: 84 }).join(' | ')).toContain('Injury cost Old Save 24 games this season');
  });

  it('never rewrites a saved line, and plays the next season on the true length', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = save();
      const before = JSON.stringify(c.seasons);
      const { line } = simNhlSeason(c, 80, seeded(seed));
      expect(JSON.stringify(c.seasons.slice(0, 3))).toBe(before);
      expect(line.slate).toBe(84);
      expect(line.games).toBeLessThanOrEqual(84);
    }
  });

  it('writes no slate where the season is the engine own, so those lines are what they always were', () => {
    const c = startNhlCareer('Throwback', 'LW', NHL_ARCHETYPES.LW[0], seeded(5), null, 'y2006');
    expect(c.year).toBe(2006);
    const { line } = simNhlSeason(c, 80, seeded(6));
    expect('slate' in line).toBe(false);
    expect(line.games).toBeLessThanOrEqual(82);
    c.year = 2012;
    const short = simNhlSeason(c, 80, seeded(7)).line;
    expect(short.slate).toBe(48);
    expect(short.games).toBeLessThanOrEqual(48);
  });
});

describe('Round 1226: a saved MLB season keeps the length it was played on', () => {
  it('reads an old Yankees 2026 line as the 162 it was played on', () => {
    const c = startMlbCareer('Old Save', 'CF', MLB_ARCHETYPES.CF[0], seeded(21));
    c.team = 'NYY';
    c.seasons = [oldMlb(2026, 162, 'NYY'), oldMlb(2027, 120, 'NYY')];
    c.year = 2028;
    expect(seasonLength('mlb', 2026, 'NYY')).toBe(161);
    expect(slateOf('mlb', c.seasons[0])).toBe(US_ENGINE_SEASON.mlb);
    expect(mlbSlateMark('CF', 150, c.seasons[0])).toBe(150);
    expect(mlbBadgeFacts(c).fullSeasons).toBe(1);
    /* 155 less 120 is the 35 the paper printed for that season before the round. */
    expect(mlbHeadlinesFor(c, c.seasons[1]).join(' | ')).toContain('Injury cost Old Save 35 games this season');
    const before = JSON.stringify(c.seasons);
    const { line } = simMlbSeason(c, 80, seeded(22));
    expect(JSON.stringify(c.seasons.slice(0, 2))).toBe(before);
    expect('slate' in line).toBe(false);
  });

  it('plays 2020 as 60 games and does not print a lost hundred', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const c = startMlbCareer('Short Year', 'SS', MLB_ARCHETYPES.SS[0], seeded(100 + seed), null, 'y2004');
      c.year = 2020; c.team = 'BOS'; c.health = 100;
      const { line } = simMlbSeason(c, 80, seeded(200 + seed));
      expect(line.slate).toBe(60);
      expect(line.games).toBeLessThanOrEqual(60);
      const paper = mlbHeadlinesFor(c, line).join(' | ');
      const m = paper.match(/Injury cost Short Year (\d+) games/);
      if (m) expect(Number(m[1])).toBeLessThanOrEqual(60);
    }
  });
});
