/**
 * Round 1318, correction 12 of the Release BA critic: a saved generated rival
 * (Rounds 1280 to 1282) is reused without looking at the names already taken
 * this year, and the nominee loops then skip a taken name. On main a generated
 * name never meets a taken one (generateContender walks past it), so that skip
 * never fired; with a saved pool it can, when the career's own rival carries
 * the same name, and it then fires every year until the saved man retires,
 * shifting every later draw of the career.
 *
 * The ruling: a reused rival whose name is already taken this year retires at
 * once and his slot gets a new face, which draws nothing extra (the age is
 * already drawn). So the night must equal, draw for draw, the same night where
 * he had already retired, apart from the year written on his retirement.
 * Two constructed cases: the saved rival renamed to the career rival's name,
 * and the career rival renamed, a year after the saved rival was made, to his.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import { copy, nextNight, poolNight, type Saved } from './helpers/ballonPoolDrive';

let night: Saved;
const lastYear = (s: Saved) => s.seasons.at(-1).year as number;

beforeAll(() => {
  // The second night with a pool, so its first night's rivals are a year old.
  night = nextNight(poolNight(1, true), 7).value;
  expect(night.rival).toBeTruthy();
});

const CASES: Array<[string, (s: Saved, entry: Saved) => void]> = [
  ['a saved rival renamed to the career rival\'s name', (s, entry) => { entry.name = s.rival.name; }],
  ['the career rival renamed, a year after the saved rival was made, to his name', (s, entry) => { s.rival.name = entry.name; }],
];

describe('a saved rival whose name is taken this year is replaced at once', () => {
  for (const [label, clash] of CASES) it(label, () => {
    const s = copy(night), pool = s.generatedBallonPool;
    const entry = pool.entries.find((e: Saved) => e.role === 'primary' && e.retiredYear === null && e.firstYear < pool.year);
    expect(entry).toBeDefined();
    clash(s, entry);
    expect(E.isGeneratedBallonPool(s.generatedBallonPool, lastYear(s))).toBe(true);

    const after = nextNight(s, 11), year = lastYear(after.value), next = after.value.generatedBallonPool;
    expect(next.entries[entry.id].retiredYear).toBe(year);
    const face = next.entries.find((e: Saved) => e.role === 'primary' && e.slot === entry.slot && e.retiredYear === null);
    expect(face).toBeDefined();
    expect(face.id).toBeGreaterThanOrEqual(pool.nextId);
    expect(face.seed).toBe(9900 + face.id);
    expect(face.firstYear).toBe(year);
    expect([s.rival.name, s.playerName]).not.toContain(face.name);
    expect(E.isGeneratedBallonPool(next, year)).toBe(true);

    // The same night where he had already retired a year earlier: equal draw for draw.
    const gone = copy(s);
    gone.generatedBallonPool.entries[entry.id].retiredYear = gone.generatedBallonPool.year;
    expect(E.isGeneratedBallonPool(gone.generatedBallonPool, lastYear(gone))).toBe(true);
    const twin = nextNight(gone, 11);
    expect(after.draws).toBe(twin.draws);
    const same = copy(after.value);
    same.generatedBallonPool.entries[entry.id].retiredYear = gone.generatedBallonPool.year;
    expect(same).toEqual(twin.value);
  });
});
