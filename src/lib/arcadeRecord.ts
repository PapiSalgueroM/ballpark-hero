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
 * Round 645 part three added the run IN PROGRESS. Both games saved only at the
 * end, so a run walked away from on shot four was dealt again from shot one
 * on the next visit, with every spray and every keeper dive already seen. Each
 * shot now writes the same key the moment it is taken (not when its flight
 * lands, or a refresh during the flight would hand the shot back), with two
 * more fields: `rounds`, how many of the ten are taken, and `draws`, how many
 * numbers the spray generator has handed out, so a resume carries on from the
 * same point of the same stream and the remaining shots are exactly the ones
 * a player who never left would have faced. The finished run, written when
 * the final card is on screen and the run has been recorded, carries no
 * `rounds`, and a record from before the field existed is a finished run,
 * which is the only thing the old code could write (the same reading the
 * career drills made of their own `rounds` in Round 468). The two readers
 * below therefore never accept the same record: readArcadeRun refuses
 * anything carrying `rounds`, readArcadeProgress requires it. A progress
 * record with all ten taken is a run whose final card was never shown: the
 * board finishes it on the way back, and that finish is the one recorded.
 *
 * Fails closed on shape, like every loader on this site: a record that is not
 * an object, is not version 1, is not today's, or whose numbers are missing,
 * infinite or out of range reads as no record at all and the route opens as a
 * fresh daily. scripts/sweepSaves.mjs tampers with every key a route writes.
 */
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { lehmer } from '@/lib/arcade';

export interface ArcadeRun {
  score: number;
  /** How many of the run's rounds came off: goals, makes, whatever the sport calls it. */
  count: number;
}

/** A run part played today. */
export interface ArcadeProgress extends ArcadeRun {
  /** How many of the run's rounds are taken, 1 to the run's length. */
  rounds: number;
  /** How many numbers the run's spray generator has handed out so far. */
  draws: number;
}

/* A shot takes a handful of numbers from the stream (the spray, the keeper's
   guess), so anything past this many a round is a tampered record, and a
   resume would otherwise spin through it before the page could draw. */
const MAX_DRAWS_PER_ROUND = 32;

function parseRun(fields: Record<string, unknown>, countField: string, maxCount: number): ArcadeRun | null {
  const score = fields.score;
  const count = fields[countField];
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  if (typeof count !== 'number' || !Number.isFinite(count)) return null;
  if (count < 0 || count > maxCount) return null;
  return { score, count };
}

export function readArcadeRun(slug: string, today: string, countField: string, maxCount: number): ArcadeRun | null {
  return readDailyRecord<ArcadeRun>(slug, today, fields => {
    if (fields.rounds !== undefined) return null;
    return parseRun(fields, countField, maxCount);
  });
}

export function readArcadeProgress(slug: string, today: string, countField: string, maxRounds: number): ArcadeProgress | null {
  return readDailyRecord<ArcadeProgress>(slug, today, fields => {
    const run = parseRun(fields, countField, maxRounds);
    if (!run) return null;
    const { rounds, draws } = fields;
    if (typeof rounds !== 'number' || !Number.isInteger(rounds) || rounds < 1 || rounds > maxRounds) return null;
    if (typeof draws !== 'number' || !Number.isInteger(draws) || draws < 0 || draws > rounds * MAX_DRAWS_PER_ROUND) return null;
    if (run.count > rounds) return null;
    return { ...run, rounds, draws };
  });
}

export function writeArcadeRun(slug: string, today: string, countField: string, run: ArcadeRun): void {
  writeDailyRecord(slug, today, { score: run.score, [countField]: run.count });
}

export function writeArcadeProgress(slug: string, today: string, countField: string, progress: ArcadeProgress): void {
  writeDailyRecord(slug, today, { score: progress.score, [countField]: progress.count, rounds: progress.rounds, draws: progress.draws });
}

/** The site's Lehmer stream with a count of what it has handed out, so the
 *  count can be filed with a part played run and the stream picked up at
 *  the same point on the way back. */
export type CountedRng = (() => number) & { draws: number };

export function countedLehmer(seed: number, skip = 0): CountedRng {
  const base = lehmer(seed);
  for (let i = 0; i < skip; i += 1) base();
  const rng: CountedRng = Object.assign(() => { rng.draws += 1; return base(); }, { draws: skip });
  return rng;
}
