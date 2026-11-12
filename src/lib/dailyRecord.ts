/**
 * One record per game per day, in localStorage, read fail closed.
 *
 * Round 428. Eleven daily games kept nothing across a refresh: a finished
 * daily came back as a fresh puzzle with the answer already known, and every
 * replay recorded a second completion and paid the score again. The games
 * that got it right each carried their own copy of the same twenty lines
 * (Perfect Season, Conquest, HoF or Bust, the grids). This is that copy,
 * written once.
 *
 * The key is `${slug}-daily-${YYYY-MM-DD}`, the shape every daily key on
 * the site already uses, so scripts/sweepSaves.mjs discovers it and tampers
 * with it. The payload is `{v: 1, date, ...fields}`. A read returns null
 * unless the JSON parses to an object, carries v 1 and today's date, and
 * the caller's validate accepts its fields; a caller therefore never sees a
 * record from another day, another version, or a tampered store, and the
 * route mounts as a fresh daily instead of throwing.
 *
 * Restore in a useState initializer where the page can (no completion
 * mark needed, useGameCompletion sees no transition); where the restore
 * happens after mount, call markRestoredFinish(slug) from
 * src/lib/restoredFinish.ts immediately before setting the finished state,
 * or the Round 399 double record returns.
 */

export function dailyRecordKey(slug: string, date: string): string {
  return `${slug}-daily-${date}`;
}

export function readDailyRecord<T>(
  slug: string,
  today: string,
  validate: (fields: Record<string, unknown>) => T | null,
): T | null {
  try {
    const raw = localStorage.getItem(dailyRecordKey(slug, today));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const fields = parsed as Record<string, unknown>;
    if (fields.v !== 1 || fields.date !== today) return null;
    return validate(fields);
  } catch {
    return null;
  }
}

export function writeDailyRecord(slug: string, today: string, fields: Record<string, unknown>): void {
  try {
    localStorage.setItem(dailyRecordKey(slug, today), JSON.stringify({ ...fields, v: 1, date: today }));
    /* Keep storage bounded by pruning older dates for this game. A tab can
       finish a Daily it started before midnight after a new tab has saved the
       next day, so compare the dates before removing anything. */
    const mine = `${slug}-daily-`;
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith(mine)) continue;
      const date = k.slice(mine.length);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < today) stale.push(k);
    }
    for (const k of stale) localStorage.removeItem(k);
  } catch {
    /* storage full or blocked: the game still plays, it just will not survive a refresh */
  }
}
