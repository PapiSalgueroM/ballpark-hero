/**
 * Round 1051: a career that retired before the legacy recalibration keeps the
 * legacy and the Hall of Fame ballot it was told.
 *
 * src/test/fixtures/careerHallV1.json was written once by
 * scripts/recordCareerHallV1.mjs on the base commit of Round 1051 (its
 * baseCommit field), before any line of src changed: whole retired saves off
 * the engine loop and off the board's own loop (one per answer policy, one
 * with the speech given), each with the sport's legacyOf and hallRecordFor as
 * that code returned them. None of them carries a calibration stamp, which is
 * exactly what a save retired before the round looks like.
 *
 * WHAT THIS HOLDS:
 *   1. For every recorded save, legacyOf and hallRecordFor today equal the
 *      recording, whole objects. It was green on the base by construction and
 *      must stay green, untouched, on every later tree.
 *   2. The comparison can fail: a recorded score moved by one is caught, so
 *      the file cannot pass on an empty or unread fixture.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { hallRecordFor, type HallRecord, type UsHallSport, type UsCareerShape } from '@/lib/careerHallOfFame';
import { legacyOf } from '@/lib/nflMyCareer';
import { nbaLegacyOf } from '@/lib/nbaMyCareer';
import { mlbLegacyOf } from '@/lib/mlbMyCareer';
import { nhlLegacyOf } from '@/lib/nhlMyCareer';
import { NFL_CAREER_HALL } from '@/lib/nflCareerHall';
import { NBA_CAREER_HALL } from '@/lib/nbaCareerHall';
import { MLB_CAREER_HALL } from '@/lib/mlbCareerHall';
import { NHL_CAREER_HALL } from '@/lib/nhlCareerHall';

type V1SportId = 'nfl' | 'nba' | 'mlb' | 'nhl';
interface V1Entry {
  id: string;
  from: string;
  why: string;
  save: UsCareerShape & { retired: boolean; hallCal?: unknown };
  legacy: { score: number; verdict: string; hof: boolean; bullets: string[] };
  hall: HallRecord;
}
interface V1Fixture { baseCommit: string; careersPlayed: number; sports: Record<V1SportId, V1Entry[]> }

const V1_FIXTURE_PATH = path.resolve(process.cwd(), 'src/test/fixtures/careerHallV1.json');
const loadV1Fixture = (): V1Fixture => JSON.parse(readFileSync(V1_FIXTURE_PATH, 'utf8')) as V1Fixture;

/* The engines type their own career states; the fixture holds them as JSON. */
type AnySave = V1Entry['save'];
const SPORTS: Record<V1SportId, { legacy: (c: AnySave) => unknown; hall: UsHallSport<AnySave> }> = {
  nfl: { legacy: legacyOf as unknown as (c: AnySave) => unknown, hall: NFL_CAREER_HALL as unknown as UsHallSport<AnySave> },
  nba: { legacy: nbaLegacyOf as unknown as (c: AnySave) => unknown, hall: NBA_CAREER_HALL as unknown as UsHallSport<AnySave> },
  mlb: { legacy: mlbLegacyOf as unknown as (c: AnySave) => unknown, hall: MLB_CAREER_HALL as unknown as UsHallSport<AnySave> },
  nhl: { legacy: nhlLegacyOf as unknown as (c: AnySave) => unknown, hall: NHL_CAREER_HALL as unknown as UsHallSport<AnySave> },
};
const IDS = Object.keys(SPORTS) as V1SportId[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Every way a save's reading today differs from its recording. */
function mismatches(sport: V1SportId, e: V1Entry): string[] {
  const out: string[] = [];
  const save = clone(e.save);
  if (JSON.stringify(SPORTS[sport].legacy(save)) !== JSON.stringify(e.legacy)) out.push(`${e.id}: legacy`);
  if (JSON.stringify(hallRecordFor(SPORTS[sport].hall, save)) !== JSON.stringify(e.hall)) out.push(`${e.id}: hall record`);
  return out;
}

describe('Round 1051: careers retired before the recalibration keep what they were told', () => {
  const fixture = loadV1Fixture();

  it('the fixture is the recording: a base commit, retired unstamped saves, every outcome', () => {
    expect(fixture.baseCommit).toMatch(/^[0-9a-f]{40}$/);
    for (const sport of IDS) {
      const list = fixture.sports[sport];
      expect(list.length, sport).toBeGreaterThanOrEqual(20);
      expect(list.every(e => e.save.retired === true && e.save.hallCal === undefined), sport).toBe(true);
      expect(list.filter(e => e.from.startsWith('board:')).length, sport).toBe(4);
      expect(list.some(e => e.legacy.hof) && list.some(e => !e.legacy.hof), sport).toBe(true);
      expect(list.some(e => e.hall.outcome === 'inducted' && e.hall.firstBallot), sport).toBe(true);
      expect(list.some(e => e.hall.outcome === 'inducted' && !e.hall.firstBallot), sport).toBe(true);
    }
  });

  it.each(IDS)('%s: legacyOf and hallRecordFor equal the recording, whole objects', sport => {
    const list = fixture.sports[sport];
    for (const e of list) {
      const save = clone(e.save);
      expect(SPORTS[sport].legacy(save), `${e.id} legacy`).toEqual(e.legacy);
      expect(hallRecordFor(SPORTS[sport].hall, save), `${e.id} hall`).toEqual(e.hall);
      // Reading it changed nothing on the save (no stamp is written by a read).
      expect(save, `${e.id} save untouched`).toEqual(e.save);
    }
    expect(list.flatMap(e => mismatches(sport, e))).toEqual([]);
  });

  it.each(IDS)('%s: the comparison can fail (a recorded score moved by one is caught)', sport => {
    const list = fixture.sports[sport];
    const bent = clone(list[0]);
    bent.legacy.score += 1;
    bent.hall.score += 1;
    expect(mismatches(sport, bent)).toEqual([`${bent.id}: legacy`, `${bent.id}: hall record`]);
  });
});
