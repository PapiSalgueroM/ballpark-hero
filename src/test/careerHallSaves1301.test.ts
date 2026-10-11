/**
 * Round 1301: calibration 3 of the Hall of Fame legacy measured the NHL
 * standout marks again (the 84 game season). A career that already retired
 * keeps the calibration stamped on its save and the ballot it was told; a
 * career still being played is judged on calibration 3 when its ballot comes.
 *
 * src/test/fixtures/careerHallSaves1301.json holds careers as the code BEFORE
 * this round retired them, written by scripts/recordCareerHallSaves1301.mjs
 * run from the root of two old checkouts on a GitHub runner: origin/main as
 * of Release AT (82 game NHL seasons) and the head of Round 1226 (84 game NHL
 * seasons), both on calibration 2. It is never recorded again.
 *
 * WHAT THIS HOLDS, on both recordings and all four sports:
 *   1. A retired save reads today exactly what the old code told it: the
 *      legacy whole, and the Hall record whole apart from the card's
 *      sentence (copy, which a later round may reword; it must still be
 *      there). So a retired Hall of Famer stays one, and a retired career
 *      that missed stays missed.
 *   2. That is not true by accident: read on calibration 3 instead, NHL
 *      careers in the set score lower and at least one Hall of Famer of each
 *      recording falls out. The stamp is what keeps them.
 *   3. A career still being played (recorded as it stood before its last
 *      season) carries no stamp, reads calibration 3, and the save that
 *      retires it is stamped 3 and scored on the calibration 3 table: for
 *      NHL careers near a mark that is a lower score than the old code
 *      would have given them that day, and it is the one they are told.
 *   4. The comparison can fail: forty goals on one old season are caught.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { HALL_CALIBRATION, hallCalibrationOf, hallRecordFor, legacyRead, stampHallCalibration, type HallRecord, type LegacyRead, type UsCareerShape, type UsHallSport } from '@/lib/careerHallOfFame';
import { legacyOf } from '@/lib/nflMyCareer';
import { nbaLegacyOf } from '@/lib/nbaMyCareer';
import { mlbLegacyOf } from '@/lib/mlbMyCareer';
import { nhlLegacyOf, nhlCareerTotals, NHL_LEGACY_WEIGHTS, type NhlCareerState } from '@/lib/nhlMyCareer';
import { NFL_CAREER_HALL } from '@/lib/nflCareerHall';
import { NBA_CAREER_HALL } from '@/lib/nbaCareerHall';
import { MLB_CAREER_HALL } from '@/lib/mlbCareerHall';
import { NHL_CAREER_HALL } from '@/lib/nhlCareerHall';

type SportId = 'nfl' | 'nba' | 'mlb' | 'nhl';
type Kind = 'byPush' | 'hofPlain' | 'nearPush' | 'missed' | 'open';
interface Told { score: number; verdict: string; hof: boolean; bullets: string[]; standout?: LegacyRead['standout'] }
type AnySave = UsCareerShape & { retired: boolean; hallCal?: unknown };
interface Entry { id: string; kind: Kind; save: AnySave; legacy?: Told; hall?: HallRecord; toldIfRetiredThen?: Told }
interface Recording { tag: string; commit: string; careersPlayed: number; sports: Record<SportId, Entry[]>; counts: Record<SportId, { calibration: number; hofLine: number }> }
interface Fixture { note: string; recordings: Recording[] }

const FX = JSON.parse(readFileSync(path.resolve(process.cwd(), 'src/test/fixtures/careerHallSaves1301.json'), 'utf8')) as Fixture;
const SPORTS: Record<SportId, { legacy: (c: AnySave) => Told; hall: UsHallSport<AnySave> }> = {
  nfl: { legacy: legacyOf as unknown as (c: AnySave) => Told, hall: NFL_CAREER_HALL as unknown as UsHallSport<AnySave> },
  nba: { legacy: nbaLegacyOf as unknown as (c: AnySave) => Told, hall: NBA_CAREER_HALL as unknown as UsHallSport<AnySave> },
  mlb: { legacy: mlbLegacyOf as unknown as (c: AnySave) => Told, hall: MLB_CAREER_HALL as unknown as UsHallSport<AnySave> },
  nhl: { legacy: nhlLegacyOf as unknown as (c: AnySave) => Told, hall: NHL_CAREER_HALL as unknown as UsHallSport<AnySave> },
};
const IDS = Object.keys(SPORTS) as SportId[];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const retired = (r: Recording, s: SportId): Entry[] => r.sports[s].filter(e => e.kind !== 'open');
const open = (r: Recording, s: SportId): Entry[] => r.sports[s].filter(e => e.kind === 'open');
/** The Hall record with the card's sentence set apart. */
const apart = (h: HallRecord): { rest: Omit<HallRecord, 'weighs'>; weighs: string | undefined } => { const { weighs, ...rest } = h; return { rest, weighs }; };
/** What calibration 3 would have done to the NHL saves of each recording, had the stamp not held (measured 2026-10-10). */
const WOULD: Record<string, { lower: number; higher: number; fellOut: number; cameIn: number; openLower: number }> = {
  main: { lower: 11, higher: 0, fellOut: 2, cameIn: 0, openLower: 4 },
  r1226: { lower: 10, higher: 1, fellOut: 3, cameIn: 0, openLower: 3 },
};
const readToday = (s: SportId, save: AnySave): { legacy: Told; hall: HallRecord } => ({ legacy: clone(SPORTS[s].legacy(save)), hall: clone(hallRecordFor(SPORTS[s].hall, save)) });

describe('Round 1301: a career the old code retired keeps the calibration and the ballot it was told', () => {
  it('the fixture is two recordings of old code, both on calibration 2, deep enough to mean something', () => {
    expect(HALL_CALIBRATION).toBe(3);
    expect(FX.recordings.map(r => r.tag)).toEqual(['main', 'r1226']);
    for (const r of FX.recordings) {
      expect(r.commit).toMatch(/^[0-9a-f]{40}$/);
      for (const s of IDS) {
        expect(r.counts[s].calibration, `${r.tag} ${s}`).toBe(2);
        expect(retired(r, s).every(e => e.save.retired === true && e.save.hallCal === 2), `${r.tag} ${s}: every retired save is stamped 2`).toBe(true);
        expect(open(r, s).every(e => e.save.retired !== true && !('hallCal' in e.save)), `${r.tag} ${s}: no open save is retired or stamped`).toBe(true);
        expect(retired(r, s).some(e => e.legacy!.hof) && retired(r, s).some(e => !e.legacy!.hof), `${r.tag} ${s}: in and out`).toBe(true);
        expect(open(r, s).length, `${r.tag} ${s}: an open career`).toBeGreaterThanOrEqual(1);
      }
      const nhl = r.sports.nhl;
      expect(nhl.filter(e => e.kind === 'byPush').length, `${r.tag}: Hall of Famers in by the push alone`).toBe(8);
      expect(nhl.filter(e => e.kind === 'nearPush').length, `${r.tag}: near misses with a push`).toBe(3);
      expect(nhl.filter(e => e.kind === 'open').length, `${r.tag}: open careers`).toBe(4);
    }
    // The two trees play different NHL seasons: main's saves hold no 84 game line, Round 1226's do.
    const slates = (r: Recording): number => r.sports.nhl.reduce((n, e) => n + (e.save.seasons as Array<{ slate?: number }>).filter(x => x.slate === 84).length, 0);
    expect(slates(FX.recordings[0])).toBe(0);
    expect(slates(FX.recordings[1])).toBeGreaterThan(100);
  });

  for (const r of FX.recordings) {
    for (const s of IDS) {
      it(`${r.tag} ${s}: every retired save reads what it was told (a Hall of Famer stays one, a miss stays a miss)`, () => {
        for (const e of retired(r, s)) {
          const save = clone(e.save);
          expect(hallCalibrationOf(save), e.id).toBe(2);
          const got = readToday(s, save);
          expect(got.legacy, `${e.id}: legacy`).toEqual(e.legacy);
          expect(got.legacy.hof, `${e.id}: in or out`).toBe(e.legacy!.hof);
          expect(apart(got.hall).rest, `${e.id}: Hall record`).toEqual(apart(e.hall!).rest);
          expect(typeof apart(got.hall).weighs, `${e.id}: the card's sentence is still there`).toBe(typeof apart(e.hall!).weighs);
          expect(save, `${e.id}: reading a save changes nothing in it`).toEqual(e.save);
        }
      });

      it(`${r.tag} ${s}: a career still being played is judged on calibration 3 when it retires`, () => {
        for (const e of open(r, s)) {
          const live = clone(e.save);
          expect(hallCalibrationOf(live), `${e.id}: unstamped and live reads today's`).toBe(3);
          live.retired = true;
          stampHallCalibration(live as unknown as { retired?: boolean; hallCal?: 1 | 2 | 3 });
          expect(live.hallCal, `${e.id}: the save that retires it is stamped 3`).toBe(3);
          const on3 = SPORTS[s].legacy(live);
          expect(on3, `${e.id}: scored on the stamp`).toEqual(SPORTS[s].legacy({ ...clone(e.save), retired: true, hallCal: 3 }));
          if (s === 'nhl') {
            const c = live as unknown as NhlCareerState;
            const read = legacyRead(NHL_LEGACY_WEIGHTS[3], { pos: c.pos, seasons: c.seasons.length, awards: { cups: c.cups, harts: c.harts, connSmythes: c.connSmythes, allStars: c.allStars }, totals: { ...nhlCareerTotals(c) } });
            expect(on3.score, `${e.id}: the calibration 3 table`).toBe(read.score);
          } else {
            // Football, basketball and baseball read 3 on their calibration 2 table: the old code's answer stands.
            expect(on3, `${e.id}: calibration 3 is calibration 2 here`).toEqual(e.toldIfRetiredThen);
          }
        }
      });
    }
  }

  it('the stamp is what keeps them: read on calibration 3 instead, NHL careers of the set score lower and Hall of Famers fall out', () => {
    for (const r of FX.recordings) {
      let lower = 0, higher = 0, fellOut = 0, cameIn = 0;
      for (const e of retired(r, 'nhl')) {
        const on3 = nhlLegacyOf({ ...clone(e.save), hallCal: 3 } as unknown as NhlCareerState);
        if (on3.score < e.legacy!.score) lower += 1;
        if (on3.score > e.legacy!.score) higher += 1;
        if (e.legacy!.hof && !on3.hof) fellOut += 1;
        if (!e.legacy!.hof && on3.hof) cameIn += 1;
      }
      // The open careers: what the old code would have told them the day before their last season, against calibration 3.
      let openLower = 0;
      for (const e of open(r, 'nhl')) if (nhlLegacyOf({ ...clone(e.save), retired: true, hallCal: 3 } as unknown as NhlCareerState).score < e.toldIfRetiredThen!.score) openLower += 1;
      console.log(`careerHallSaves1301 ${r.tag}: of ${retired(r, 'nhl').length} retired NHL saves, on calibration 3 ${lower} would score lower, ${higher} higher, ${fellOut} Hall of Famers would fall out, ${cameIn} would come in; of ${open(r, 'nhl').length} open careers ${openLower} are scored lower on 3 than the old code would have`);
      /* Exact, because both sides are frozen: the fixture is never recorded again and a shipped calibration is
         never edited. The one career that would score higher is a goalie (his marks came out a win or two lower). */
      expect({ lower, higher, fellOut, cameIn, openLower }, r.tag).toEqual(WOULD[r.tag]);
    }
    // And in the other three sports the two calibrations are one table: nothing would change.
    for (const r of FX.recordings) for (const s of ['nfl', 'nba', 'mlb'] as const) for (const e of retired(r, s)) {
      expect(SPORTS[s].legacy({ ...clone(e.save), hallCal: 3 }), `${e.id}: 3 is 2 here`).toEqual(e.legacy);
    }
  });

  it('the comparison can fail: forty goals on one old season are caught', () => {
    const e = FX.recordings[0].sports.nhl.find(x => x.kind === 'byPush' && x.legacy!.standout?.stat === 'goals');
    expect(e).toBeTruthy();
    const moved = clone(e!.save) as AnySave & { seasons: Array<{ goals?: number; points?: number }> };
    moved.seasons[2].goals = (moved.seasons[2].goals ?? 0) + 40;
    moved.seasons[2].points = (moved.seasons[2].points ?? 0) + 40;
    expect(readToday('nhl', moved).legacy).not.toEqual(e!.legacy);
  });
});
