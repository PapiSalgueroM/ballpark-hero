import { describe, expect, it } from 'vitest';
import { keyedRng } from '@/lib/keyedRng';
import { compareUfcGuess } from '@/lib/ufcGameLogic';
import { divisionProgress, pickDivisionFighter, readDivisionRun, startDivisionRun } from '@/lib/ufcDivisionRun';
import { uniqueUfcFighters } from '@/data/ufcFighters';
import { WEIGHT_CLASS_ORDER } from '@/types/ufc';

function draw() { return startDivisionRun('Welterweight', '2026-11-26', keyedRng('division-check'))!; }
describe('UFC Division run', () => {
  it('draws three different answers from each division with enough searchable fighters', () => {
    for (const weight of WEIGHT_CLASS_ORDER) {
      const members = uniqueUfcFighters.filter(f => f.weightClass === weight);
      const run = startDivisionRun(weight, '2026-11-26', keyedRng(weight));
      if (members.length < 3) { expect(run).toBeNull(); continue; }
      expect(run?.pool).toEqual(members);
      expect(new Set(run!.targets).size).toBe(3);
      expect(run!.targets.every(n => members.some(f => f.name === n))).toBe(true);
    }
  });

  it('shares eight guesses across three answers, accepting a third solve on the last guess', () => {
    let run = draw();
    const other = run.pool.filter(f => !run.targets.includes(f.name)).map(f => f.name);
    const [first, second, third] = run.targets;
    for (const name of [other[0], first, other[0], second, other[0], other[1], other[2]]) run = pickDivisionFighter(run, name);
    expect(divisionProgress(run)).toEqual({ solved: 2, rounds: [[other[0], first], [other[0], second], other.slice(0, 3)], finished: false });
    const win = pickDivisionFighter(run, third), loss = pickDivisionFighter(run, other[3]);
    expect(divisionProgress(win)).toMatchObject({ solved: 3, finished: true });
    expect(divisionProgress(loss)).toMatchObject({ solved: 2, finished: true });
    expect(pickDivisionFighter(loss, third)).toBe(loss);
    expect(pickDivisionFighter(win, other[0])).toBe(win);
    expect(readDivisionRun(JSON.stringify(win))).toEqual(win);
  });

  it('keeps a used wrong guess open for the following round and preserves old clue values', () => {
    let run = draw();
    const [first, second, third] = run.targets;
    run = pickDivisionFighter(run, second);
    expect(pickDivisionFighter(run, second)).toBe(run);
    expect(pickDivisionFighter(run, 'Unknown fighter')).toBe(run);
    const ageDate = run.date, source = run.pool.find(f => f.name === second)!;
    const initialClues = compareUfcGuess(source, run.pool.find(f => f.name === first)!, ageDate);
    const loaded = readDivisionRun(JSON.stringify(run))!;
    expect(compareUfcGuess(loaded.pool.find(f => f.name === second)!, loaded.pool.find(f => f.name === first)!, loaded.date)).toEqual(initialClues);
    run = pickDivisionFighter(loaded, first);
    expect(pickDivisionFighter(run, first)).toBe(run);
    run = pickDivisionFighter(run, second);
    expect(divisionProgress(run).solved).toBe(2);
    expect(pickDivisionFighter({ ...run, gaveUp: true }, third).picks).toEqual(run.picks);
  });

  it('rejects impossible saved turns and malformed frozen stats', () => {
    const r = draw(), [one, two, three] = r.targets;
    for (const change of [{ picks: [one, two, three, one] }, { picks: [two, two] }, { targets: [one, one, two] },
      { pool: r.pool.map((f, i) => i ? f : { ...f, wins: 'eight' }) }, { picks: [one, two, one] },
      { targets: [one, two, 'Unknown fighter'] }, { date: 'unknown date' }]) {
      expect(readDivisionRun(JSON.stringify({ ...r, ...change }))).toBeNull();
    }
  });
});
