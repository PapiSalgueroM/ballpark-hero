import { describe, expect, it } from 'vitest';
import { daySeed, drillSeed, drillForPosition, applyDrillResult } from '@/lib/careerDrills';
import { buildFirstTouchRun, firstTouchDeadline, incomingBallAt, outgoingBallAt, takeFirstTouch, TOUCH_CONTACT, TOUCH_DIRECTIONS, TOUCH_GATES, validateFirstTouchRecord } from '@/lib/firstTouchDrill';
import type { CareerState } from '@/lib/soccerCareerEngine';

describe('seeded First Touch rules', () => {
  it('keeps the old position mappings and seeds while dealing a distinct daily ten', () => {
    const date = '2026-09-30';
    for (const [kind, salt] of [['wallshot', 1719], ['tackle', 4583], ['gloves', 8317]] as const) {
      expect(drillSeed(kind, date)).toBe(((daySeed(date) * 7919 + salt) % 2147483646) + 1);
    }
    expect(['CM', 'CAM', 'LW', 'RW', 'ST'].map(drillForPosition)).toEqual(Array(5).fill('wallshot'));
    expect(['CB', 'LB', 'RB', 'CDM'].map(drillForPosition)).toEqual(Array(4).fill('tackle'));
    expect(drillForPosition('GK')).toBe('gloves');
    const seed = drillSeed('firsttouch', date);
    const run = buildFirstTouchRun(seed);
    expect(run).toHaveLength(10);
    expect(buildFirstTouchRun(seed)).toEqual(run);
    expect(buildFirstTouchRun(drillSeed('firsttouch', '2026-10-01'))).not.toEqual(run);
    expect(seed).not.toBe(drillSeed('wallshot', date));
  });

  it('gives every sampled round a legal win and timing and direction losses with exact geometry', () => {
    for (let seed = 11; seed < 331; seed += 7) {
      const run = buildFirstTouchRun(seed * 7919);
      for (const [index, setup] of run.entries()) {
        if (index > 0) expect(setup.window).toBeLessThan(run[index - 1].window);
        expect(incomingBallAt(setup, setup.arrival)).toEqual(TOUCH_CONTACT);
        const clean = takeFirstTouch({ direction: setup.target, press: setup.arrival }, setup);
        expect(clean).toMatchObject({ won: true, points: 10, contact: TOUCH_CONTACT, end: TOUCH_GATES[setup.target] });
        expect(outgoingBallAt(clean, 0)).toEqual(clean.contact);
        expect(outgoingBallAt(clean, 1)).toEqual(clean.end);
        const wrong = TOUCH_DIRECTIONS.find(direction => direction !== setup.target)!;
        expect(takeFirstTouch({ direction: wrong, press: setup.arrival }, setup)).toMatchObject({ won: false, points: 0, end: TOUCH_GATES[wrong] });
        for (const press of [0, setup.arrival - setup.window - 0.001, firstTouchDeadline(setup) + 0.001, Infinity, NaN]) {
          const missed = takeFirstTouch({ direction: setup.target, press }, setup);
          expect(missed.won).toBe(false);
          expect(missed.points).toBe(0);
          expect(missed.end).toEqual(incomingBallAt(setup, setup.arrival * 1.5));
        }
        for (const press of [setup.arrival - setup.window, firstTouchDeadline(setup)]) expect(takeFirstTouch({ direction: setup.target, press }, setup).won).toBe(true);
      }
    }
  });

  it('measures skilled contact against every swept fixed-time and fixed-direction policy on paired seeds', () => {
    const runs = Array.from({ length: 240 }, (_, i) => buildFirstTouchRun(314159 + i * 7919));
    const skilled = runs.reduce((sum, run) => sum + run.reduce((n, setup) => n + takeFirstTouch({ direction: setup.target, press: setup.arrival }, setup).points, 0), 0) / runs.length;
    const means: number[] = [];
    for (const direction of TOUCH_DIRECTIONS) for (let step = 20; step <= 58; step++) {
      const press = step / 20;
      const mean = runs.reduce((sum, run) => sum + run.reduce((n, setup) => n + takeFirstTouch({ direction, press }, setup).points, 0), 0) / runs.length;
      means.push(mean);
      expect(skilled - mean).toBeGreaterThan(70);
    }
    expect(skilled).toBe(100);
    console.log(`First Touch paired seeds: skilled mean ${skilled.toFixed(2)}/100; ${means.length} fixed policies mean range ${Math.min(...means).toFixed(2)} to ${Math.max(...means).toFixed(2)}/100 over ${runs.length} runs each.`);
  });

  it('rejects malformed checkpoints rather than granting saved wins or bank status', () => {
    expect(validateFirstTouchRecord({ rounds: 5, count: 3, score: 30, banked: false })).toEqual({ rounds: 5, count: 3, score: 30, banked: false });
    expect(validateFirstTouchRecord({ rounds: 10, count: 8, score: 80, banked: true })).not.toBeNull();
    for (const fields of [
      { rounds: 11, count: 8, score: 80, banked: false }, { rounds: -1, count: 0, score: 0, banked: false },
      { rounds: 5, count: 6, score: 60, banked: false }, { rounds: 5, count: 3, score: 99, banked: false },
      { rounds: 5.5, count: 3, score: 30, banked: false }, { rounds: 5, count: 3, score: 30, banked: true },
      { rounds: 5, count: -3, score: -30, banked: false }, { rounds: 5, count: 3, score: 30, banked: 'false' },
    ]) expect(validateFirstTouchRecord(fields)).toBeNull();
  });

  it('banks through the existing shared season and capped Dribbling pipeline only', () => {
    const career = { overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: { shooting: 1 }, morale: 60, events: [] } as unknown as CareerState;
    const saved = applyDrillResult(career, 'firsttouch', 8);
    expect(saved.statBoostNextSeason).toEqual({ shooting: 1, dribbling: 2 });
    expect(saved.trainingSeasonYear).toBe(2026);
    expect(saved.morale).toBe(62);
    expect(applyDrillResult(saved, 'wallshot', 10)).toBe(saved);
    expect(applyDrillResult(career, 'firsttouch', 5).statBoostNextSeason?.dribbling).toBe(1);
    expect(applyDrillResult(career, 'firsttouch', 4).statBoostNextSeason?.dribbling).toBeUndefined();
    expect(applyDrillResult({ ...career, potential: 71 }, 'firsttouch', 10).statBoostNextSeason?.dribbling).toBe(1);
    expect(applyDrillResult({ ...career, potential: 70 }, 'firsttouch', 10).statBoostNextSeason?.dribbling).toBeUndefined();
    expect(career.statBoostNextSeason).toEqual({ shooting: 1 });
  });
});
