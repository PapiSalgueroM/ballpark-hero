/**
 * A finished daily survives a refresh and cannot be played again.
 *
 * Round 428. An audit found daily games where a finished daily was
 * destroyed by a page refresh, the same daily was then replayable with the
 * answer known, and every replay recorded a second completion and paid the
 * score again. Eleven of twelve routes were confirmed, with four sibling
 * hooks carrying the same defect; /nba-stat-line was already right and is
 * the positive control here.
 *
 * One driver per route lives in src/test/dailyReload/<slug>.driver.tsx
 * (contract in src/test/dailyReload/driver.ts). This file discovers them
 * and runs five assertions against each, in order:
 *   (1) after a finish exactly one key with the driver's prefix exists,
 *       dated today in Eastern time (and, for the src/lib/dailyRecord.ts
 *       shape, carrying v 1 and today's date in its JSON)
 *   (2) unmount, mount, enter the daily: the outcome is byte identical to
 *       the one before the reload and the route is finished
 *   (3) every replay path leaves the outcome and the stored record
 *       unchanged and no replay control is offered on the daily
 *   (4) recordCompletion was called exactly once across the finish, the
 *       remount, the re-entry and the replay (this is what catches a
 *       missing markRestoredFinish on a handler restore)
 *   (5) with the key preset to each of the six wreckage forms
 *       scripts/sweepSaves.mjs writes, the route mounts as a fresh daily,
 *       throws nothing and records nothing
 *
 * The real page or hook renders with the real useGameCompletion, the real
 * restoredFinish handshake and jsdom's real localStorage; the auth
 * context, the recorder and the Supabase client are mocked in
 * src/test/dailyReload/mocks.ts.
 *
 * Round 645 part three added a sixth, for the run based dailies that used to
 * save only at the end (a driver that exports playSome and progress):
 *   (6) settle part of the run, unmount, mount, enter the daily: the board is
 *       on the same step with the same score and count, nothing was
 *       recorded, finishing the rest records exactly once, and the finished
 *       card is byte identical to step (1)'s, since the driver plays the
 *       same moves split by the reload
 * and a seventh, for a board where a step is decided before it lands (a
 * driver that also exports oneStep and interruptStep):
 *   (7) take one step and unmount before it lands, as a refresh during the
 *       flight would; the reloaded board reads exactly what one landed step
 *       reads, so the step can never be taken again with its outcome seen
 *
 * scripts/simDailyReload.mjs runs this file and carries the negative
 * controls: DAILY_RELOAD_CONTROL=clear drops every prefixed key between the
 * unmount and the remount, so (2) must fail on every row;
 * DAILY_RELOAD_CONTROL=silent turns markRestoredFinish into a no-op, so
 * (4) must fail on every row whose restore depends on the mark and stay
 * green on every other; DAILY_RELOAD_CONTROL=midrun drops every prefixed
 * key between the part played unmount and the remount, so (6) must fail on
 * every row that has it. Three more take a piece out of the code rather than
 * the storage (see ./dailyReload/mocks): nolock (one game's record never
 * read), nosave (the arcade engine's per shot save gone) and restream (the
 * arcade spray stream restarted on a resume); each must turn red exactly the
 * rows it hit. ONLY=<slug> runs one row.
 */
import './dailyReload/mocks';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish, markRestoredFinish } from '@/lib/restoredFinish';
import { controlHits, recordCompletion, resetMocks, resetStreamLog, silencedMarks, streamRepeats } from './dailyReload/mocks';
import { DRIVER_FIELDS, type AnyDriver } from './dailyReload/driver';

const CONTROL = process.env.DAILY_RELOAD_CONTROL || '';
const ONLY = process.env.ONLY || '';
/* The controls that take a piece of the lock out of the real code path
   (./dailyReload/mocks), as against the storage controls above them. */
const CODE_CONTROLS = ['nolock', 'nosave', 'restream'];

/* The same six forms scripts/sweepSaves.mjs writes, in its order. */
const WRECKAGE: [string, string][] = [
  ['garbage', 'not json at all {'],
  ['truncated', '{"v":1,"cash":12'],
  ['hostileVersion', '{"v":999,"version":999}'],
  ['emptyObject', '{}'],
  ['bareNull', 'null'],
  ['emptyArray', '[]'],
];

const modules = import.meta.glob('./dailyReload/*.driver.tsx', { eager: true }) as Record<string, { default?: unknown }>;

const malformed: string[] = [];
const discovered: AnyDriver[] = [];
/* Round 674: each driver's file name, printed with its row so the harness can
   tie a row to the files it renders without running it. */
const fileOf = new Map<AnyDriver, string>();
for (const [file, mod] of Object.entries(modules).sort(([a], [b]) => (a < b ? -1 : 1))) {
  const d = mod.default as Partial<AnyDriver> | undefined;
  const missing = d && typeof d === 'object' ? DRIVER_FIELDS.filter(f => d[f] === undefined) : [...DRIVER_FIELDS];
  if (missing.length > 0) { malformed.push(`${file} is missing ${missing.join(', ')}`); continue; }
  if (d!.restoreStyle !== 'initializer' && d!.restoreStyle !== 'handler') { malformed.push(`${file} has restoreStyle ${String(d!.restoreStyle)}`); continue; }
  discovered.push(d as AnyDriver);
  fileOf.set(d as AnyDriver, file.split('/').pop()!);
}
/* Round 674: a swap control runs only the rows its swapped module can reach
   (DAILY_RELOAD_ROWS, which the harness works out from the import graph), so
   its verdict does not hang on how busy the machine is. */
const ROWS = (process.env.DAILY_RELOAD_ROWS || '').split(',').filter(Boolean);
const drivers = discovered.filter(d => (!ONLY || d.slug === ONLY) && (!ROWS.length || ROWS.includes(d.slug)));

const usesMark = (d: AnyDriver) => d.restoreStyle === 'handler' && d.usesRestoreMark !== false;
const resumes = (d: AnyDriver) => typeof d.playSome === 'function' && typeof d.progress === 'function';
const records = (d: AnyDriver) => d.records !== false;
const interrupts = (d: AnyDriver) => resumes(d) && typeof d.oneStep === 'function' && typeof d.interruptStep === 'function';

describe('daily reload', () => {
  it('discovers drivers', () => {
    for (const d of drivers) {
      console.log('DAILY_RELOAD_ROW ' + JSON.stringify({
        slug: d.slug,
        file: fileOf.get(d),
        keyPrefix: d.keyPrefix,
        restoreStyle: d.restoreStyle,
        usesRestoreMark: usesMark(d),
        payloadShape: d.payloadShape ?? 'v1',
        restoreFile: d.restoreFile ?? null,
        finishedSetter: d.finishedSetter ?? null,
        slugBoundIn: d.slugBoundIn ?? null,
        resumes: resumes(d),
        interrupts: interrupts(d),
        records: records(d),
      }));
    }
    console.log(`DAILY_RELOAD_DRIVERS ${drivers.length} of ${discovered.length}${ONLY ? ` (ONLY=${ONLY})` : ''}`);
    expect(malformed, 'every driver file exports a complete driver').toEqual([]);
    if (ONLY) expect(drivers.length, `ONLY=${ONLY} names no driver; have ${discovered.map(d => d.slug).join(', ') || 'none'}`).toBe(1);
    if (ROWS.length && !ONLY) expect(drivers.map(d => d.slug).sort(), `DAILY_RELOAD_ROWS names rows no driver plays; have ${discovered.map(d => d.slug).join(', ')}`).toEqual([...ROWS].sort());
    for (const d of drivers) {
      if (usesMark(d)) {
        expect(d.restoreFile, `${d.slug}: a handler restore that uses the mark must name its restoreFile`).toBeTruthy();
        expect(d.finishedSetter, `${d.slug}: a handler restore that uses the mark must name its finishedSetter`).toBeTruthy();
      }
    }
  });

  it(CONTROL === 'silent' ? 'silent control: markRestoredFinish is a no-op' : 'markRestoredFinish is live', () => {
    markRestoredFinish('daily-reload-probe');
    const consumed = consumeRestoredFinish('daily-reload-probe');
    if (CONTROL === 'silent') {
      expect(consumed, 'the silent control must swallow the mark').toBe(false);
      expect(silencedMarks()).toBeGreaterThan(0);
    } else {
      expect(consumed, 'the real handshake must see the mark').toBe(true);
    }
  });

  for (const driver of drivers) {
    describe(driver.slug, () => {
      const today = getTodayET();
      const todayKey = `${driver.keyPrefix}${today}`;
      const keysOf = () => Object.keys(localStorage).filter(k => k.startsWith(driver.keyPrefix));
      let fingerprint: string | null = null;
      let record: string | null = null;

      beforeAll(() => {
        resetMocks(driver.slug);
        localStorage.clear();
      });

      /* Round 645 part three: under a code control, how many times it took
         its piece of the lock out while this row ran. The wrapper requires a
         hit on every row it expects to go red, so red means the control, and
         a row with no hit must stay green. */
      afterAll(() => {
        if (CODE_CONTROLS.includes(CONTROL)) console.log(`DAILY_RELOAD_HITS ${driver.slug} ${controlHits(driver.slug)}`);
      });

      it('(1) writes exactly one record for today when the daily is finished', async () => {
        const api = await driver.mount();
        try {
          await driver.enterDaily(api);
          expect(driver.status(api), 'a fresh daily should be playing').toBe('playing');
          await driver.finish(api);
          expect(driver.status(api), 'the finish should show the finished card').toBe('finished');
          fingerprint = driver.fingerprint(api);
          expect(fingerprint.length, 'the fingerprint carries the outcome').toBeGreaterThan(0);
          const keys = keysOf();
          expect(keys, `exactly one ${driver.keyPrefix}* key, dated today`).toEqual([todayKey]);
          record = localStorage.getItem(todayKey);
          const parsed: unknown = JSON.parse(record ?? 'null');
          expect(parsed !== null && typeof parsed === 'object', 'the record is a JSON object').toBe(true);
          if ((driver.payloadShape ?? 'v1') === 'v1') {
            expect((parsed as { v?: unknown }).v, 'the record carries v 1').toBe(1);
            expect((parsed as { date?: unknown }).date, 'the record carries the ET date of today').toBe(today);
          }
        } finally {
          driver.unmount(api);
        }
      });

      it('(2) restores the same finished daily after an unmount and a remount', async () => {
        if (fingerprint === null) throw new Error('step (1) did not finish, there is nothing to compare');
        if (CONTROL === 'clear') {
          const dropped = keysOf();
          for (const k of dropped) localStorage.removeItem(k);
          console.log(`DAILY_RELOAD_CLEAR ${driver.slug} dropped ${dropped.length} key(s)`);
        }
        const api = await driver.mount();
        try {
          await driver.enterDaily(api);
          expect(driver.status(api), 'the reloaded daily should come back finished').toBe('finished');
          expect(driver.fingerprint(api), 'the reloaded outcome should be byte identical').toBe(fingerprint);
        } finally {
          driver.unmount(api);
        }
      });

      it('(3) refuses every replay of the same daily', async () => {
        if (fingerprint === null) throw new Error('step (1) did not finish, there is nothing to compare');
        const api = await driver.mount();
        try {
          await driver.enterDaily(api);
          await driver.replay(api);
          expect(driver.status(api), 'the daily should still be finished after the replay attempt').toBe('finished');
          expect(driver.fingerprint(api), 'the outcome should be unchanged by the replay attempt').toBe(fingerprint);
          expect(localStorage.getItem(todayKey), 'the stored record should be unchanged by the replay attempt').toBe(record);
          expect(keysOf(), 'no second key should appear').toEqual([todayKey]);
          expect(driver.hasDailyReplayControl(api), 'no replay control on a finished daily').toBe(false);
        } finally {
          driver.unmount(api);
        }
      });

      it('(4) records the completion exactly once across the finish, the remount, the re-entry and the replay', () => {
        const paths = recordCompletion.mock.calls.map(c => String(c[0]));
        expect(paths, `recordCompletion calls so far: ${paths.join(', ') || 'none'}`).toEqual(records(driver) ? [`/${driver.slug}`] : []);
      });

      it('(5) mounts as a fresh daily on each of the six wreckage forms without throwing', async () => {
        const before = recordCompletion.mock.calls.length;
        for (const [name, form] of WRECKAGE) {
          for (const k of keysOf()) localStorage.removeItem(k);
          localStorage.setItem(todayKey, form);
          let api: unknown;
          try {
            api = await driver.mount();
            await driver.enterDaily(api);
            expect(driver.status(api), `wreckage "${name}" should deal a fresh daily`).toBe('playing');
          } catch (e) {
            throw new Error(`wreckage "${name}": ${(e as Error).message}`);
          } finally {
            if (api !== undefined) driver.unmount(api);
          }
        }
        expect(recordCompletion.mock.calls.length - before, 'a fresh daily records nothing on mount').toBe(0);
      });

      if (resumes(driver)) {
        it('(6) resumes a part played daily at the same step after an unmount and a remount, and records the run once', async () => {
          const playSome = driver.playSome!;
          const progress = driver.progress!;
          for (const k of keysOf()) localStorage.removeItem(k);
          const before = recordCompletion.mock.calls.length;
          resetStreamLog();
          let api: unknown = await driver.mount();
          let mid = '';
          try {
            await driver.enterDaily(api);
            expect(driver.status(api), 'a fresh daily should be playing').toBe('playing');
            await playSome(api);
            expect(driver.status(api), 'a part played daily should still be playing').toBe('playing');
            mid = progress(api);
            expect(mid.length, 'the progress text carries the step and the score').toBeGreaterThan(0);
            expect(keysOf(), `a part played daily writes exactly one ${driver.keyPrefix}* key, dated today`).toEqual([todayKey]);
          } finally {
            driver.unmount(api);
          }
          if (CONTROL === 'midrun') {
            const dropped = keysOf();
            for (const k of dropped) localStorage.removeItem(k);
            console.log(`DAILY_RELOAD_MIDRUN ${driver.slug} dropped ${dropped.length} key(s)`);
          }
          api = await driver.mount();
          try {
            await driver.enterDaily(api);
            expect(driver.status(api), 'the reloaded daily should come back mid run, not finished and not on a fresh board').toBe('playing');
            expect(progress(api), 'the reloaded board should be on the same step with the same score and count').toBe(mid);
            expect(recordCompletion.mock.calls.length - before, 'resuming records nothing').toBe(0);
            await driver.finish(api);
            expect(driver.status(api), 'the resumed run should finish').toBe('finished');
            expect(keysOf(), 'the finished run leaves exactly one key').toEqual([todayKey]);
            expect(recordCompletion.mock.calls.length - before, records(driver) ? 'the whole run records exactly once' : 'a board that banks records nothing').toBe(records(driver) ? 1 : 0);
            /* The same moves as step (1), split by a reload, must end exactly
               where the unbroken run ended: same score, same card, same
               stream. A resume that re-deals a step, drops one, or restarts
               the arcade spray generator from the top ends somewhere else. */
            expect(fingerprint, 'step (1) did not finish, there is nothing to compare').not.toBeNull();
            expect(driver.fingerprint(api), 'the resumed run should finish exactly as the unbroken run did').toBe(fingerprint);
            /* Round 674: and the stream itself. Whether a restarted stream
               changes the card depends on the day's deal (on 2026-09-29 two
               arcade rows finished the same either way), so the card alone
               was a coin toss; a draw dealt twice across the reload is not. */
            expect(streamRepeats(), 'the resumed run picks the stream up where it stopped: no draw is dealt twice').toBe(0);
          } finally {
            driver.unmount(api);
          }
        });
      }

      if (interrupts(driver)) {
        it('(7) keeps a step that was decided but not yet landed when the page was refreshed', async () => {
          const progress = driver.progress!;
          const before = recordCompletion.mock.calls.length;
          for (const k of keysOf()) localStorage.removeItem(k);
          let api: unknown = await driver.mount();
          let landed = '';
          try {
            await driver.enterDaily(api);
            await driver.oneStep!(api);
            landed = progress(api);
          } finally {
            driver.unmount(api);
          }
          for (const k of keysOf()) localStorage.removeItem(k);
          api = await driver.mount();
          try {
            await driver.enterDaily(api);
            await driver.interruptStep!(api);
          } finally {
            /* the refresh, with the step decided and still in the air */
            driver.unmount(api);
          }
          api = await driver.mount();
          try {
            await driver.enterDaily(api);
            expect(driver.status(api), 'the reloaded daily should come back mid run').toBe('playing');
            expect(progress(api), 'the step taken before the refresh should be on the board, outcome counted, never dealt again').toBe(landed);
            expect(recordCompletion.mock.calls.length - before, 'a part played daily records nothing').toBe(0);
          } finally {
            driver.unmount(api);
          }
        });
      }
    });
  }
});
