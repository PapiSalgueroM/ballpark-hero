/* Round 1343: the highest scoring game. Pure functions, no engine run. */
import { describe, expect, it } from 'vitest';
import type { CareerState, H2HEntry } from '@/lib/clubManager';
import { goalsIn, highestFromBook, highestScoringOf, noteHighestScoring, onPenalties, scoringOutcome, type ScoringGame } from '@/lib/clubManagerRecords';

const row = (opp: string, score: string, res: H2HEntry['res'] = 'W', season = 1): H2HEntry =>
  ({ opp, score, res, season, comp: 'league', home: true });

/** Only the two fields the module reads. */
const career = (book: H2HEntry[], played: number, highestScoring?: ScoringGame | null): CareerState =>
  ({ h2h: book, careerStats: { played, wins: 0, draws: 0, losses: 0, ...(highestScoring !== undefined ? { highestScoring } : {}) } }) as unknown as CareerState;

const deepFreeze = <T,>(o: T): T => {
  if (o && typeof o === 'object') { Object.values(o as object).forEach(deepFreeze); Object.freeze(o); }
  return o;
};

describe('goalsIn', () => {
  it('adds both sides', () => {
    expect(goalsIn('0-0')).toBe(0);
    expect(goalsIn('10-1')).toBe(11);
    expect(goalsIn('5-4')).toBe(9);
  });
  it('reads anything else as -1', () => {
    for (const s of ['', 'a-b', '3', '-1-2', '1-', '1.5-2', ' 1-2']) expect(goalsIn(s)).toBe(-1);
    expect(goalsIn(undefined as unknown as string)).toBe(-1);
  });
});

describe('highestFromBook', () => {
  it('answers null for an empty book, played or not', () => {
    expect(highestFromBook([], 0)).toBeNull();
    expect(highestFromBook(undefined, 12)).toBeNull();
  });
  it('answers the one row', () => {
    expect(highestFromBook([row('Leeds United', '2-1', 'W', 3)], 1)).toEqual({ opp: 'Leeds United', score: '2-1', res: 'W', season: 3 });
  });
  it('keeps the first of two equal rows', () => {
    const g = highestFromBook([row('A', '1-0'), row('B', '4-4', 'D', 2), row('C', '5-3', 'W', 4)], 3);
    expect(g?.opp).toBe('B');
    expect(g?.score).toBe('4-4');
  });
  it('says how many matches the book lost, only when above 0', () => {
    expect(highestFromBook([row('A', '3-2')], 5)?.missed).toBe(4);
    expect(highestFromBook([row('A', '3-2')], 1)).not.toHaveProperty('missed');
  });
  it('never lets a damaged row win', () => {
    const g = highestFromBook([row('A', '1-0'), row('B', '99-x'), row('C', '')], 3);
    expect(g?.opp).toBe('A');
    expect(highestFromBook([row('B', 'nope')], 1)).toBeNull();
  });
  it('clamps a book longer than played: no missed, never negative', () => {
    const g = highestFromBook([row('A', '1-0'), row('B', '2-2', 'D')], 1);
    expect(g?.opp).toBe('B');
    expect(g).not.toHaveProperty('missed');
  });
});

describe('noteHighestScoring', () => {
  const game = (opp: string, score: string, res: H2HEntry['res'] = 'W'): ScoringGame => ({ opp, score, res, season: 5, club: 'Everton', comp: 'Premier League' });
  it('seeds from the book without the last row, then compares this match', () => {
    // The book already holds tonight's 1-0 as its last row, and played counts it.
    const c = career([row('A', '3-3', 'D', 2), row('B', '1-0', 'W', 5)], 2);
    noteHighestScoring(c, game('B', '1-0'));
    expect(c.careerStats.highestScoring).toEqual({ opp: 'A', score: '3-3', res: 'D', season: 2 });
  });
  it('takes this match when it has strictly more goals, with its club and competition', () => {
    const c = career([row('A', '3-3', 'D', 2), row('B', '5-2', 'W', 5)], 2);
    noteHighestScoring(c, game('B', '5-2'));
    expect(c.careerStats.highestScoring).toEqual(game('B', '5-2'));
  });
  it('keeps the first on a tie', () => {
    const c = career([row('A', '4-4', 'D', 2), row('B', '5-3', 'W', 5)], 2);
    noteHighestScoring(c, game('B', '5-3'));
    expect(c.careerStats.highestScoring?.opp).toBe('A');
  });
  it('carries missed through a new record', () => {
    // 10 played before tonight, the book kept 2 of them and tonight's row: 8 missed.
    const c = career([row('A', '1-1', 'D'), row('B', '2-0'), row('C', '6-1')], 11);
    noteHighestScoring(c, game('C', '6-1'));
    expect(c.careerStats.highestScoring).toEqual({ ...game('C', '6-1'), missed: 8 });
    // The next match reads the stored record, not the book, and keeps the count.
    c.h2h = [...(c.h2h ?? []), row('D', '8-0')];
    c.careerStats.played = 12;
    noteHighestScoring(c, game('D', '8-0'));
    expect(c.careerStats.highestScoring).toEqual({ ...game('D', '8-0'), missed: 8 });
  });
  it('carries missed when the seed is null (a career older than the book)', () => {
    const c = career([row('A', '0-0', 'D')], 40);
    noteHighestScoring(c, game('A', '0-0', 'D'));
    expect(c.careerStats.highestScoring).toEqual({ ...game('A', '0-0', 'D'), missed: 39 });
  });
  it('reads a stored null as nothing yet, never the book', () => {
    const c = career([row('Old', '9-9', 'D'), row('B', '1-0')], 2, null);
    noteHighestScoring(c, game('B', '1-0'));
    expect(c.careerStats.highestScoring).toEqual(game('B', '1-0'));
  });
  it('never stores a negative missed from a book longer than played', () => {
    const c = career([row('X', '2-2', 'D'), row('Y', '3-1'), row('B', '1-0')], 1);
    noteHighestScoring(c, game('B', '1-0'));
    expect(c.careerStats.highestScoring).not.toHaveProperty('missed');
  });
});

describe('highestScoringOf', () => {
  it('answers the stored record first', () => {
    const stored: ScoringGame = { opp: 'S', score: '2-2', res: 'D', season: 1 };
    expect(highestScoringOf(deepFreeze(career([row('A', '9-0')], 1, stored)))).toEqual(stored);
  });
  it('answers null for a stored null, never the book', () => {
    expect(highestScoringOf(deepFreeze(career([row('A', '9-0')], 1, null)))).toBeNull();
  });
  it('derives from the book otherwise and writes nothing', () => {
    const c = deepFreeze(career([row('A', '2-1'), row('B', '4-3', 'L', 2)], 7));
    const before = JSON.stringify(c);
    expect(highestScoringOf(c)).toEqual({ opp: 'B', score: '4-3', res: 'L', season: 2, missed: 5 });
    expect(JSON.stringify(c)).toBe(before);
  });
});

describe('the score reads from the score', () => {
  it('reads wins, losses, draws and shootouts', () => {
    expect(scoringOutcome({ score: '5-4', res: 'W' })).toBe('win');
    expect(scoringOutcome({ score: '2-5', res: 'L' })).toBe('loss');
    expect(scoringOutcome({ score: '3-3', res: 'D' })).toBe('draw');
    expect(scoringOutcome({ score: '3-3', res: 'W' })).toBe('pensWon');
    expect(scoringOutcome({ score: '3-3', res: 'L' })).toBe('pensLost');
    expect(onPenalties({ score: '3-3', res: 'W' })).toBe(true);
    expect(onPenalties({ score: '3-3', res: 'D' })).toBe(false);
  });
  it('gives no word when res contradicts the score (never "0-3 win")', () => {
    expect(scoringOutcome({ score: '0-3', res: 'W' })).toBe('plain');
    expect(scoringOutcome({ score: '4-1', res: 'L' })).toBe('plain');
    expect(scoringOutcome({ score: '4-1', res: 'D' })).toBe('plain');
    expect(onPenalties({ score: '0-3', res: 'W' })).toBe(false);
  });
});
