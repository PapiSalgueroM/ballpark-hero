import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadDailyRun, saveDailyRun, type ConquestDailyRun, type ConquestSport } from './conquestDaily';
import * as daily from './conquestDaily';

const DATE = '2026-09-07';
const sports: ConquestSport[] = ['nfl', 'nba', 'mlb', 'nhl', 'soccer'];
const pending = (picks: string[] = []): ConquestDailyRun => ({ team: 'a', picks, done: false, result: null });
const finished: ConquestDailyRun = {
  team: 'a', picks: ['a', 'b'], done: true,
  result: { date: DATE, team: 'a', score: 100, empire: 2, calls: 1, callsTotal: 2, champion: 'b', championWasYou: false },
};

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(sports)('%s daily progress', sport => {
  it('keeps a finished result when an old tab writes its first call', () => {
    saveDailyRun(sport, finished, DATE);
    saveDailyRun(sport, pending(['a']), DATE);
    expect(loadDailyRun(sport, DATE)).toEqual(finished);
  });

  it('rejects shorter, changed-team and divergent call logs', () => {
    const current = pending(['a', 'b']);
    saveDailyRun(sport, current, DATE);
    for (const stale of [pending(), pending(['b', 'b', 'a']), { ...current, team: 'b' }]) {
      saveDailyRun(sport, stale, DATE);
      expect(loadDailyRun(sport, DATE)).toEqual(current);
    }
  });

  it('still accepts the next call and final result', () => {
    saveDailyRun(sport, pending(), DATE);
    saveDailyRun(sport, pending(['a']), DATE);
    saveDailyRun(sport, pending(['a', 'b']), DATE);
    saveDailyRun(sport, finished, DATE);
    expect(loadDailyRun(sport, DATE)).toEqual(finished);
  });
});

describe('daily transition claims', () => {
  const locks = () => {
    let queue = Promise.resolve();
    vi.stubGlobal('navigator', { locks: { request: (_key: string, work: () => unknown) => {
      const result = queue.then(work);
      queue = result.then(() => undefined);
      return result;
    } } });
  };

  it('accepts only one of two calls from the same previous round', async () => {
    locks();
    saveDailyRun('nfl', pending(), DATE);
    expect(typeof daily.commitDailyRun).toBe('function');
    const results = await Promise.all([
      daily.commitDailyRun('nfl', pending(), pending(['a']), DATE),
      daily.commitDailyRun('nfl', pending(), pending(['b']), DATE),
    ]);
    expect(results).toEqual(['saved', 'conflict']);
    expect(loadDailyRun('nfl', DATE)).toEqual(pending(['a']));
  });

  it('accepts a final result once and refuses a second completion claim', async () => {
    locks();
    saveDailyRun('nfl', pending(['a', 'b']), DATE);
    expect(typeof daily.commitDailyRun).toBe('function');
    expect(await daily.commitDailyRun('nfl', pending(['a', 'b']), finished, DATE)).toBe('saved');
    expect(await daily.commitDailyRun('nfl', pending(['a', 'b']), finished, DATE)).toBe('conflict');
  });

  it('does not claim a daily if locking or storage is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    expect(typeof daily.commitDailyRun).toBe('function');
    expect(await daily.commitDailyRun('nfl', null, pending(), DATE)).toBe('unavailable');
    locks();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    expect(await daily.commitDailyRun('nfl', null, pending(), DATE)).toBe('unavailable');
    expect(loadDailyRun('nfl', DATE)).toBeNull();
  });
});
