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
 * scripts/simDailyReload.mjs runs this file and carries the negative
 * controls: DAILY_RELOAD_CONTROL=clear drops every prefixed key between the
 * unmount and the remount, so (2) must fail on every row;
 * DAILY_RELOAD_CONTROL=silent turns markRestoredFinish into a no-op, so
 * (4) must fail on every row whose restore depends on the mark and stay
 * green on every other. ONLY=<slug> runs one row.
 */
import './dailyReload/mocks';
import { describe, it, expect, beforeAll } from 'vitest';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish, markRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks, silencedMarks } from './dailyReload/mocks';
import { DRIVER_FIELDS, type AnyDriver } from './dailyReload/driver';

const CONTROL = process.env.DAILY_RELOAD_CONTROL || '';
const ONLY = process.env.ONLY || '';

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
for (const [file, mod] of Object.entries(modules).sort(([a], [b]) => (a < b ? -1 : 1))) {
  const d = mod.default as Partial<AnyDriver> | undefined;
  const missing = d && typeof d === 'object' ? DRIVER_FIELDS.filter(f => d[f] === undefined) : [...DRIVER_FIELDS];
  if (missing.length > 0) { malformed.push(`${file} is missing ${missing.join(', ')}`); continue; }
  if (d!.restoreStyle !== 'initializer' && d!.restoreStyle !== 'handler') { malformed.push(`${file} has restoreStyle ${String(d!.restoreStyle)}`); continue; }
  discovered.push(d as AnyDriver);
}
const drivers = discovered.filter(d => !ONLY || d.slug === ONLY);

const usesMark = (d: AnyDriver) => d.restoreStyle === 'handler' && d.usesRestoreMark !== false;

describe('daily reload', () => {
  it('discovers drivers', () => {
    for (const d of drivers) {
      console.log('DAILY_RELOAD_ROW ' + JSON.stringify({
        slug: d.slug,
        keyPrefix: d.keyPrefix,
        restoreStyle: d.restoreStyle,
        usesRestoreMark: usesMark(d),
        payloadShape: d.payloadShape ?? 'v1',
        restoreFile: d.restoreFile ?? null,
        finishedSetter: d.finishedSetter ?? null,
      }));
    }
    console.log(`DAILY_RELOAD_DRIVERS ${drivers.length} of ${discovered.length}${ONLY ? ` (ONLY=${ONLY})` : ''}`);
    expect(malformed, 'every driver file exports a complete driver').toEqual([]);
    if (ONLY) expect(drivers.length, `ONLY=${ONLY} names no driver; have ${discovered.map(d => d.slug).join(', ') || 'none'}`).toBe(1);
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
        resetMocks();
        localStorage.clear();
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
        expect(paths, `recordCompletion calls so far: ${paths.join(', ') || 'none'}`).toEqual([`/${driver.slug}`]);
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
    });
  }
});
