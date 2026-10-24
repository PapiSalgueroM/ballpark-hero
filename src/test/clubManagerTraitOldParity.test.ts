import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { CalendarEntry, CareerState } from '@/lib/clubManager';

type ProbeRow = { title: string; frames: { stage: string; serialized: string }[]; draws: number[] };
const rows: ProbeRow[] = [];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

beforeEach(() => {
  vi.resetModules(); localStorage.clear(); sessionStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-23T16:00:00Z'));
});
afterEach(() => {
  vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear();
});
afterAll(() => {
  const output = process.env.CM_STYLE_PARITY_SNAPSHOT;
  if (!output) return;
  writeFileSync(output, JSON.stringify(rows) + '\n', { flag: 'wx' });
});

async function capture(title: string, action: (context: Awaited<ReturnType<typeof actual>>, frame: (stage: string, state: unknown) => void) => void) {
  let seed = 1456001;
  const draws: number[] = [], frames: ProbeRow['frames'] = [];
  const rng = vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    const value = (seed - 1) / 2147483646; draws.push(value); return value;
  });
  try {
    const context = await actual();
    const frame = (stage: string, state: unknown) => frames.push({ stage, serialized: JSON.stringify(state) });
    frame('initialized', context.state); action(context, frame);
    expect(frames.length, 'CM_STYLE_PARITY_REAL_FRAMES').toBeGreaterThan(1);
    expect(draws.length, 'CM_STYLE_PARITY_REAL_DRAW_STREAM').toBeGreaterThan(0);
    rows.push({ title, frames, draws });
  } finally { rng.mockRestore(); }
}
async function actual() {
  const E = await import('@/lib/clubManager');
  await import('@/lib/clubManagerTactics');
  const { saveFence } = await import('@/lib/saveFence');
  saveFence.release(E.SAVE_KEY);
  return { E, saveFence, state: E.startCareer('Everton') };
}
function halftime(E: Awaited<ReturnType<typeof actual>>['E'], state: CareerState) {
  let current = copy(state);
  for (let i = 0; i < 24; i++) {
    const before = JSON.stringify(current);
    const next = E.playNextEntry(current, { noCoach: true });
    expect(JSON.stringify(current), 'CM_STYLE_PARITY_INPUT_IMMUTABLE').toBe(before);
    current = next.state;
    if (next.kind === 'halftime') {
      expect(current.live, 'CM_STYLE_PARITY_ACTUAL_HALF_FOUNDATION').not.toBeNull();
      expect(Object.prototype.hasOwnProperty.call(current.live, 'coachedStyleRules')).toBe(false);
      return current;
    }
  }
  throw new Error('CM_STYLE_PARITY_FIXTURE_NO_ACTUAL_MATCH');
}

describe('Actual old whole-engine coached-style compatibility probe', { timeout: 120000 }, () => {
  it('records six actual no-style charged weeks with complete states and all draw values', async () => {
    await capture('no-style charged weeks', ({ E, state }, frame) => {
      const calendar: CalendarEntry[] = Array.from({ length: 6 }, () => ({ type: 'window', round: 0 }));
      let current: CareerState = { ...state, week: 0, live: null, calendar };
      frame('six charged windows input', current);
      for (let i = 0; i < 6; i++) {
        const before = JSON.stringify(current), result = E.playNextEntry(current, { noCoach: true });
        expect(result.kind, 'CM_STYLE_PARITY_CHARGED_WINDOW').toBe('window');
        expect(result.state.week).toBe(i + 1);
        expect(JSON.stringify(current), 'CM_STYLE_PARITY_WEEK_INPUT_HELD').toBe(before);
        current = result.state; frame('charged week ' + (i + 1), current);
      }
    });
  });

  it('records an actual no-style kickoff, second half and settled match without field stripping', async () => {
    await capture('no-style actual match', ({ E, state }, frame) => {
      const live = halftime(E, state); frame('actual halftime', live);
      const before = JSON.stringify(live), second = E.startSecondHalf(live);
      expect(second, 'CM_STYLE_PARITY_SECOND_HALF_FOUNDATION').not.toBeNull();
      expect(JSON.stringify(live)).toBe(before); frame('second half', second);
      const resumed = E.resumeMatch(second!);
      expect(resumed.kind, 'CM_STYLE_PARITY_REAL_SETTLEMENT').toBe('match');
      expect(resumed.state.live).toBeNull();
      frame('settled whole result', resumed);
    });
  });

  it('records an old unmarked live save, raw reload and settlement even with a later learned style', async () => {
    await capture('old unmarked live', ({ E, saveFence, state }, frame) => {
      const instructed = E.setInstructions(state, { press: 1, tempo: 0, width: 0, line: 0 });
      expect(instructed, 'CM_STYLE_PARITY_UNMARKED_INSTRUCTIONS_FOUNDATION').not.toBeNull();
      let live = halftime(E, instructed!);
      live = { ...live, squad: live.squad.map(p => p.position === 'GK' ? p : {
        ...p, coachedStyle: { v: 1 as const, id: 'press' as const },
      }) };
      expect(Object.prototype.hasOwnProperty.call(live.live, 'coachedStyleRules')).toBe(false);
      frame('old unmarked style input', live);
      saveFence.release(E.SAVE_KEY);
      const before = JSON.stringify(live);
      expect(E.saveCareer(live), 'CM_STYLE_PARITY_REAL_WRITER').toBe(true);
      const raw = localStorage.getItem(E.SAVE_KEY);
      expect(raw, 'CM_STYLE_PARITY_STORED_RAW_FOUNDATION').not.toBeNull(); frame('stored raw', raw);
      const loaded = E.loadCareer();
      expect(loaded, 'CM_STYLE_PARITY_REAL_RELOAD').not.toBeNull();
      expect(localStorage.getItem(E.SAVE_KEY), 'CM_STYLE_PARITY_RELOAD_RAW_HELD').toBe(raw);
      expect(JSON.stringify(live)).toBe(before);
      frame('reloaded whole live', loaded);
      const second = E.startSecondHalf(loaded!);
      expect(second, 'CM_STYLE_PARITY_OLD_SECOND_HALF_FOUNDATION').not.toBeNull();
      frame('old second half', second);
      const result = E.resumeMatch(second!);
      expect(result.kind, 'CM_STYLE_PARITY_OLD_REAL_SETTLEMENT').toBe('match');
      frame('old settled whole result', result);
      saveFence.release(E.SAVE_KEY);
    });
  });
});
