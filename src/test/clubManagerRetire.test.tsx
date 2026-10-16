/**
 * Round 1343: the highest scoring game on the manager record, and retiring.
 * The record line is rendered from ManagerRecordLines, the one list the Manager
 * panel and the farewell share. The engine side is scripts/simCmRetire.mjs.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ManagerRecordLines } from '@/components/club-manager/ClubManagerCareerPanel';
import type { CareerState, H2HEntry } from '@/lib/clubManager';
import type { ScoringGame } from '@/lib/clubManagerRecords';

const row = (opp: string, score: string, res: H2HEntry['res'], season = 1): H2HEntry => ({ opp, score, res, season, comp: 'league', home: true });
const career = (played: number, h2h: H2HEntry[], highestScoring?: ScoringGame | null): CareerState =>
  ({ h2h, careerStats: { played, wins: 0, draws: 0, losses: 0, ...(highestScoring !== undefined ? { highestScoring } : {}) } }) as unknown as CareerState;
const lines = (c: CareerState) => {
  const { container } = render(<ManagerRecordLines c={c} />);
  return {
    high: container.querySelector('[data-cm-highest-scoring]')?.textContent ?? null,
    missed: container.querySelector('[data-cm-highest-scoring-missed]')?.textContent ?? null,
  };
};
const DASHES = [0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212].map(n => String.fromCharCode(n));

describe('the record line', () => {
  it('prints a stored record with its word and season', () => {
    const l = lines(career(40, [], { opp: 'Leeds United', score: '5-4', res: 'W', season: 3, club: 'Everton', comp: 'Premier League' }));
    expect(l.high).toBe('⚽ Highest scoring game: 5-4 win vs Leeds United, Season 3');
    expect(l.missed).toBeNull();
  });
  it('reads a level score won or lost on penalties, and a plain draw', () => {
    expect(lines(career(9, [], { opp: 'Leeds United', score: '3-3', res: 'W', season: 2 })).high).toBe('⚽ Highest scoring game: 3-3 vs Leeds United, won on penalties, Season 2');
    expect(lines(career(9, [], { opp: 'Leeds United', score: '3-3', res: 'L', season: 2 })).high).toBe('⚽ Highest scoring game: 3-3 vs Leeds United, lost on penalties, Season 2');
    expect(lines(career(9, [], { opp: 'Leeds United', score: '4-4', res: 'D', season: 2 })).high).toBe('⚽ Highest scoring game: 4-4 draw vs Leeds United, Season 2');
    expect(lines(career(9, [], { opp: 'Leeds United', score: '2-5', res: 'L', season: 2 })).high).toBe('⚽ Highest scoring game: 2-5 loss vs Leeds United, Season 2');
  });
  it('gives no word when an old row contradicts its score (never "0-3 win")', () => {
    expect(lines(career(2, [row('Porto', '0-3', 'W', 4)])).high).toBe('⚽ Highest scoring game: 0-3 vs Porto, Season 4');
  });
  it('works an old save out from a whole book with no second line', () => {
    const l = lines(career(3, [row('A', '1-0', 'W'), row('B', '2-2', 'D', 2), row('C', '3-1', 'W', 2)]));
    expect(l.high).toBe('⚽ Highest scoring game: 2-2 draw vs B, Season 2');
    expect(l.missed).toBeNull();
  });
  it('says how many matches a trimmed book could not see, through formatNumber', () => {
    expect(lines(career(5, [row('A', '1-0', 'W'), row('B', '2-1', 'W')])).missed)
      .toBe('Counted from 2 of your 5 matches. Your save no longer keeps the scores of the other 3.');
    expect(lines(career(1380, [], { opp: 'B', score: '6-2', res: 'W', season: 9, missed: 1166 })).missed)
      .toBe('Counted from 214 of your 1,380 matches. Your save no longer keeps the scores of the other 1,166.');
  });
  it('prints nothing with no game: a new career, an empty book, a stored null', () => {
    expect(lines(career(0, [])).high).toBeNull();
    expect(lines(career(12, [])).high).toBeNull();
    expect(lines(career(2, [row('A', '9-0', 'W')], null)).high).toBeNull();
  });
  it('uses no dash of any kind', () => {
    const l = lines(career(5, [row('A', '1-0', 'W'), row('B', '3-3', 'W')]));
    for (const d of DASHES) expect(`${l.high}${l.missed}`).not.toContain(d);
  });
});
