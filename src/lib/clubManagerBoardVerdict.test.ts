/* Round 1335: the board's verdict module, the grid's corners and the hunt's five cases as literals.
   scripts/simCmBoardVerdict.mjs holds the same rules over full grids and over played fleets. */
import { describe, expect, it } from 'vitest';
import {
  BOARD_FRESH, BOARD_SAFE_LINE, KITTY_TOP_SHARE, LEGACY_BOARD_START, LEGACY_NEW_JOB_BOARD, VERDICT_LINES,
  fillLeague, kittyAllocation, objectiveWeight, offerStepOk, openingConfidence, seasonGrade,
} from './clubManagerBoardVerdict';

const dash = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

describe('Round 1335: the board reads the season you had', () => {
  it('keeps the old openings named and opens a new job inside Safe', () => {
    expect(LEGACY_BOARD_START).toBe(60);
    expect(LEGACY_NEW_JOB_BOARD).toBe(62);
    expect(BOARD_SAFE_LINE).toBe(60);
    expect(BOARD_FRESH).toBeGreaterThan(BOARD_SAFE_LINE);
    expect(BOARD_FRESH).toBeLessThanOrEqual(72);
  });

  it('weighs the main demand three times a side ask and a board ask half of one', () => {
    expect(objectiveWeight('league')).toBe(3);
    for (const id of ['natQuota', 'veterans', 'posGap', 'youngStar', 'marquee']) expect(objectiveWeight(id)).toBe(0.5);
    expect(objectiveWeight('cup')).toBe(1);
    expect(objectiveWeight(undefined)).toBe(1);
  });

  it('M6: Liverpool win the league with three side asks missed and open next season Safe', () => {
    const objectives = [{ id: 'league', hit: true }, { id: 'cup', hit: false }, { id: 'ucl', hit: false }, { id: 'youth', hit: false }];
    const { grade, kind } = seasonGrade({ position: 1, expectation: 1, trophies: 1, europeWon: false, fate: null });
    expect(grade).toBe('A');
    expect(kind).toBe('title');
    expect(openingConfidence({ grade, playedExpectation: 1, finish: 1, objectives, promiseNet: 0 })).toBe(BOARD_FRESH);
    /* The same season on the old sum: 55 + 2 x (1 - 3) = 51, Under pressure. */
    expect(55 + 2 * (1 - 3)).toBeLessThan(BOARD_SAFE_LINE);
  });

  it('the help example: 59 raw, an A season, so it opens at BOARD_FRESH', () => {
    const objectives = [{ id: 'league', hit: true }, { id: 'cup', hit: true }, { id: 'goals', hit: false }, { id: 'natQuota', hit: false }, { id: 'veterans', hit: false }];
    expect(openingConfidence({ grade: 'C', playedExpectation: 1, finish: 1, objectives, promiseNet: 0 })).toBe(59);
    expect(openingConfidence({ grade: 'A', playedExpectation: 1, finish: 1, objectives, promiseNet: 0 })).toBe(BOARD_FRESH);
  });

  it('M7: Brighton lose their opener and the board is still Safe after a help sized defeat', () => {
    /* A defeat takes about 4.5, times 1.15 at a tier 2 club (the help's own figures). */
    expect(BOARD_FRESH - 4.5 * 1.15).toBeGreaterThanOrEqual(BOARD_SAFE_LINE);
  });

  it('M8: West Ham go up in 2nd in the Championship and the grade knows it', () => {
    expect(seasonGrade({ position: 2, expectation: 1, trophies: 0, europeWon: false, fate: null }).grade).toBe('C');
    const up = seasonGrade({ position: 2, expectation: 1, trophies: 0, europeWon: false, fate: 'up' });
    expect(up).toEqual({ grade: 'B', kind: 'up' });
    expect(fillLeague(VERDICT_LINES.up[0], 'the Premier League')).toContain('the Premier League');
  });

  it('M13: OB, tier 4, are never offered a tier 1 club, and a title lets a club reach two tiers', () => {
    expect(offerStepOk(4, 1, false)).toBe(false);
    expect(offerStepOk(4, 2, false)).toBe(false);
    expect(offerStepOk(4, 3, false)).toBe(true);
    expect(offerStepOk(4, 4, false)).toBe(true);
    expect(offerStepOk(4, 2, true)).toBe(true);
    expect(offerStepOk(4, 1, true)).toBe(false);
    expect(offerStepOk(1, 1, false)).toBe(true);
  });

  it('M14: OB beat their expectation by eight and their cheque stays inside the band', () => {
    const flat = Math.max(10, Math.round(8 + (12 - 4) * 2));
    const got = kittyAllocation({ budget: 8, expectation: 12, finish: 4, trophies: 0 });
    expect(got).toBe(Math.min(flat, Math.max(10, Math.floor(KITTY_TOP_SHARE * 8))));
    expect(got).toBeLessThan(flat);
    /* A big club's ordinary season is untouched. */
    expect(kittyAllocation({ budget: 200, expectation: 2, finish: 3, trophies: 0 })).toBe(198);
  });

  it('p8: a sixth place season above expectation is an A without the statues', () => {
    const r = seasonGrade({ position: 6, expectation: 12, trophies: 0, europeWon: false, fate: null });
    expect(r).toEqual({ grade: 'A', kind: 'over' });
    expect(VERDICT_LINES.over.join(' ')).not.toMatch(/statue|mural/i);
  });

  it('caps a relegation at C, at B with a trophy, and keeps an escape grade', () => {
    expect(seasonGrade({ position: 18, expectation: 20, trophies: 0, europeWon: false, fate: 'down' })).toEqual({ grade: 'C', kind: 'down' });
    expect(seasonGrade({ position: 18, expectation: 20, trophies: 1, europeWon: false, fate: 'down' })).toEqual({ grade: 'B', kind: 'down' });
    expect(seasonGrade({ position: 20, expectation: 12, trophies: 0, europeWon: false, fate: 'down' })).toEqual({ grade: 'F', kind: 'down' });
    expect(seasonGrade({ position: 15, expectation: 19, trophies: 0, europeWon: false, fate: 'escape' })).toEqual({ grade: 'A', kind: 'escape' });
  });

  it('bands the opening by grade and clamps it to 35 and 82', () => {
    const base = { playedExpectation: 10, finish: 10, promiseNet: 0 };
    expect(openingConfidence({ ...base, grade: 'B', objectives: [] })).toBe(BOARD_FRESH);
    expect(openingConfidence({ ...base, grade: 'D', objectives: [{ id: 'league', hit: true }] })).toBe(BOARD_SAFE_LINE - 1);
    expect(openingConfidence({ ...base, finish: 1, grade: 'A', objectives: [] })).toBe(Math.max(BOARD_FRESH, 68.5));
    expect(openingConfidence({ ...base, finish: 24, grade: 'F', objectives: [{ id: 'league', hit: false }] })).toBe(35);
    expect(openingConfidence({ ...base, playedExpectation: 24, finish: 1, grade: 'A', objectives: [{ id: 'league', hit: true }, { id: 'cup', hit: true }] })).toBe(82);
  });

  it('writes every line with no dash and in the board or the fans voice', () => {
    for (const pair of Object.values(VERDICT_LINES)) for (const line of pair) {
      expect(line).not.toMatch(dash);
      expect(line).not.toMatch(/["“”]/);
    }
  });
});
