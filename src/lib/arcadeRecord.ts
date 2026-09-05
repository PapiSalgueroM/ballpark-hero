/**
 * The daily record shape the arcade games share.
 *
 * Round 445. Both Free Kick and Buzzer Beater file exactly the same thing at
 * the end of a daily run: a points total and a count of how many of the ten
 * came off. Round 428 wrote readDailyRecord and writeDailyRecord once so that
 * eleven games stopped carrying eleven copies of the same twenty lines; this
 * is the same argument one level up, for the validator those two games would
 * otherwise each write out by hand.
 *
 * The count's FIELD NAME is a parameter rather than a fixed key, because Free
 * Kick has been storing `goals` since Round 433 and renaming it would throw
 * away the record of anybody who had already played today. The shape is
 * shared, the word is the sport's.
 *
 * Fails closed on shape, like every loader on this site: a record that is not
 * an object, is not version 1, is not today's, or whose numbers are missing,
 * infinite or out of range reads as no record at all and the route opens as a
 * fresh daily. scripts/sweepSaves.mjs tampers with every key a route writes.
 */
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';

export interface ArcadeRun {
  score: number;
  /** How many of the run's rounds came off: goals, makes, whatever the sport calls it. */
  count: number;
}

export function readArcadeRun(slug: string, today: string, countField: string, maxCount: number): ArcadeRun | null {
  return readDailyRecord<ArcadeRun>(slug, today, fields => {
    const score = fields.score;
    const count = fields[countField];
    if (typeof score !== 'number' || !Number.isFinite(score)) return null;
    if (typeof count !== 'number' || !Number.isFinite(count)) return null;
    if (count < 0 || count > maxCount) return null;
    return { score, count };
  });
}

export function writeArcadeRun(slug: string, today: string, countField: string, run: ArcadeRun): void {
  writeDailyRecord(slug, today, { score: run.score, [countField]: run.count });
}
