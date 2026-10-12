/**
 * Round 1318: ruling C3 of Release AW, held for the saved Ballon d'Or pool of
 * Rounds 1280 to 1282 (the other lane's PR234). A save part that cannot be
 * verified is read as ABSENT: it never refuses the save, never closes the
 * feature for the rest of a career and never throws.
 *
 * For each of the 27 malformed pools the other lane declared: the save still
 * passes isSoccerCareerSave, it loads the way the page loads it (repairCareer,
 * SoccerCareer.tsx restoredSave), the reader refuses the pool, and the next
 * night writes a fresh pool the reader accepts, reaching exactly the state and
 * taking exactly the draws of the same save with the pool removed.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as E from '@/lib/soccerCareerEngine';
import { isSoccerCareerSave } from '@/lib/soccerCareerSave';
import { CORRUPTIONS, copy, corrupt, nextNight, poolNight, type Saved } from './helpers/ballonPoolDrive';

const reader = E.isGeneratedBallonPool;
let night: Saved;
const lastYear = (s: Saved) => s.seasons.at(-1).year as number;

beforeAll(() => {
  night = poolNight(1);
  expect(night.generatedBallonPool.entries.length).toBeGreaterThanOrEqual(3);
});

describe('a saved Ballon d\'Or pool that cannot be verified is read as absent', () => {
  it('declares the other lane\'s 27 cases', () => {
    expect(new Set(CORRUPTIONS).size).toBe(27);
  });

  it('accepts the pool a natural career wrote, and the night after it keeps that pool\'s rivals', () => {
    expect(isSoccerCareerSave(night)).toBe(true);
    expect(reader(night.generatedBallonPool, lastYear(night))).toBe(true);
    const kept = nextNight(night, 7).value;
    expect(reader(kept.generatedBallonPool, lastYear(kept))).toBe(true);
    const before = night.generatedBallonPool.entries.map((e: Saved) => e.name);
    expect(kept.generatedBallonPool.entries.slice(0, before.length).map((e: Saved) => e.name)).toEqual(before);
  });

  for (const id of CORRUPTIONS) it(`reads a ${id} pool as absent`, () => {
    const value = corrupt(night, id);
    expect(isSoccerCareerSave(value)).toBe(true);
    const loaded = E.repairCareer(copy(value) as E.CareerState) as Saved;
    expect(reader(loaded.generatedBallonPool, lastYear(loaded))).toBe(false);
    const absent = copy(loaded); delete absent.generatedBallonPool;
    const broken = nextNight(loaded, 7), none = nextNight(absent, 7);
    expect(broken.draws).toBe(none.draws);
    expect(broken.value).toEqual(none.value);
    expect(reader(broken.value.generatedBallonPool, lastYear(broken.value))).toBe(true);
  });
});
