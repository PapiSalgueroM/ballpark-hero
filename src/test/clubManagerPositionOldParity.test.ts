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
  const output = process.env.CM_POSITION_PARITY_SNAPSHOT;
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
    expect(frames.length, 'CM_POSITION_PARITY_REAL_FRAMES').toBeGreaterThan(1);
    expect(draws.length, 'CM_POSITION_PARITY_REAL_DRAW_STREAM').toBeGreaterThan(0);
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
    expect(JSON.stringify(current), 'CM_POSITION_PARITY_INPUT_IMMUTABLE').toBe(before);
    current = next.state;
    if (next.kind === 'halftime') {
      expect(current.live, 'CM_POSITION_PARITY_ACTUAL_HALF_FOUNDATION').not.toBeNull();
      expect(Object.prototype.hasOwnProperty.call(current.live, 'positionRules')).toBe(false);
      return current;
    }
  }
  throw new Error('CM_POSITION_PARITY_FIXTURE_NO_ACTUAL_MATCH');
}

describe('Actual old whole-engine custom-position compatibility probe', { timeout: 120000 }, () => {
  it('records six actual no-custom charged weeks with complete states and all draw values', async () => {
    await capture('no-custom charged weeks', ({ E, state }, frame) => {
      const calendar: CalendarEntry[] = Array.from({ length: 6 }, () => ({ type: 'window', round: 0 }));
      let current: CareerState = { ...state, week: 0, live: null, calendar };
      frame('six charged windows input', current);
      for (let i = 0; i < 6; i++) {
        const before = JSON.stringify(current), result = E.playNextEntry(current, { noCoach: true });
        expect(result.kind, 'CM_POSITION_PARITY_CHARGED_WINDOW').toBe('window');
        expect(result.state.week).toBe(i + 1);
        expect(JSON.stringify(current), 'CM_POSITION_PARITY_WEEK_INPUT_HELD').toBe(before);
        current = result.state; frame('charged week ' + (i + 1), current);
      }
    });
  });

  it('records an actual no-custom kickoff, second half and settled match without field stripping', async () => {
    await capture('no-custom actual match', ({ E, state }, frame) => {
      const live = halftime(E, state); frame('actual halftime', live);
      const before = JSON.stringify(live), second = E.startSecondHalf(live);
      expect(second, 'CM_POSITION_PARITY_SECOND_HALF_FOUNDATION').not.toBeNull();
      expect(JSON.stringify(live)).toBe(before); frame('second half', second);
      const resumed = E.resumeMatch(second!);
      expect(resumed.kind, 'CM_POSITION_PARITY_REAL_SETTLEMENT').toBe('match');
      expect(resumed.state.live).toBeNull();
      frame('settled whole result', resumed);
    });
  });

  it('records an old unmarked live save, raw reload and settlement even with a later custom career shape', async () => {
    await capture('old unmarked live', ({ E, saveFence, state }, frame) => {
      let live = halftime(E, state);
      const formation = E.FORMATIONS[live.formationIndex];
      expect(formation.slots.length, 'CM_POSITION_PARITY_CUSTOM_ELEVEN_FOUNDATION').toBe(11);
      const points = formation.slots.map(slot => ({ x: slot.x, y: slot.y }));
      expect(points.every(point => [point.x, point.y].every(value => Number.isFinite(value) && value >= 6 && value <= 94)),
        'CM_POSITION_PARITY_CUSTOM_BOUNDARY_FOUNDATION').toBe(true);
      live = { ...live, customShape: { v: 1, formationIndex: live.formationIndex, points } };
      expect(Object.prototype.hasOwnProperty.call(live.live, 'positionRules'), 'CM_POSITION_PARITY_OLD_LIVE_UNMARKED').toBe(false);
      frame('old unmarked career shape input', live);
      saveFence.release(E.SAVE_KEY);
      const before = JSON.stringify(live);
      expect(E.saveCareer(live), 'CM_POSITION_PARITY_REAL_WRITER').toBe(true);
      const raw = localStorage.getItem(E.SAVE_KEY);
      expect(raw, 'CM_POSITION_PARITY_STORED_RAW_FOUNDATION').not.toBeNull();
      expect(JSON.parse(raw!).customShape, 'CM_POSITION_PARITY_RAW_CUSTOM_SHAPE_RETAINED').toEqual(live.customShape);
      frame('stored raw', raw);
      const loaded = E.loadCareer();
      expect(loaded, 'CM_POSITION_PARITY_REAL_RELOAD').not.toBeNull();
      expect(localStorage.getItem(E.SAVE_KEY), 'CM_POSITION_PARITY_RELOAD_RAW_HELD').toBe(raw);
      expect(JSON.stringify(live)).toBe(before);
      expect(Object.prototype.hasOwnProperty.call(loaded!.live, 'positionRules'), 'CM_POSITION_PARITY_RELOAD_STAYS_UNMARKED').toBe(false);
      frame('reloaded whole live', loaded);
      const second = E.startSecondHalf(loaded!);
      expect(second, 'CM_POSITION_PARITY_OLD_SECOND_HALF_FOUNDATION').not.toBeNull();
      frame('old second half', second);
      const result = E.resumeMatch(second!);
      expect(result.kind, 'CM_POSITION_PARITY_OLD_REAL_SETTLEMENT').toBe('match');
      frame('old settled whole result', result);
      saveFence.release(E.SAVE_KEY);
    });
  });

  it('records unmarked first and second half recuts with actual shape, formation and duty changes', async () => {
    await capture('old unmarked recuts', ({ E, state }, frame) => {
      let current = halftime(E, state);
      frame('actual unmarked kickoff', current);
      const change = (minute: number, edit: Parameters<typeof E.changeLive>[2], stage: string) => {
        const before = JSON.stringify(current);
        const next = E.changeLive(current, minute, edit);
        expect(next, 'CM_POSITION_PARITY_REAL_RECUT_' + stage).not.toBeNull();
        expect(JSON.stringify(current), 'CM_POSITION_PARITY_RECUT_INPUT_HELD_' + stage).toBe(before);
        expect(next!.live!.minute, 'CM_POSITION_PARITY_RECUT_MINUTE_' + stage).toBe(minute);
        expect(Object.prototype.hasOwnProperty.call(next!.live, 'positionRules'), 'CM_POSITION_PARITY_RECUT_UNMARKED_' + stage).toBe(false);
        current = next!;
        frame(stage, current);
      };
      const mentality = current.live!.mentality === 'attacking' ? 'defensive' : 'attacking';
      change(20, { kind: 'shape', mentality }, 'first half mentality recut');
      const duty = () => {
        const formation = E.FORMATIONS[current.live!.formationIndex ?? current.formationIndex];
        const slot = formation.slots.findIndex((position, index) => current.live!.onPitch[index]
          && E.dutyOptions(position).some(value => value !== E.liveDutyAt(current, current.live!, index)));
        expect(slot >= 0, 'CM_POSITION_PARITY_REAL_DUTY_SLOT_FOUNDATION').toBe(true);
        const value = E.dutyOptions(formation.slots[slot]).find(value => value !== E.liveDutyAt(current, current.live!, slot));
        expect(value, 'CM_POSITION_PARITY_REAL_DUTY_CHOICE_FOUNDATION').toBeDefined();
        return { kind: 'duty' as const, slot, duty: value! };
      };
      change(25, duty(), 'first half duty recut');
      const beforeSecond = JSON.stringify(current), second = E.startSecondHalf(current);
      expect(second, 'CM_POSITION_PARITY_RECUT_SECOND_HALF_FOUNDATION').not.toBeNull();
      expect(JSON.stringify(current)).toBe(beforeSecond);
      expect(second!.live!.h2Drawn, 'CM_POSITION_PARITY_RECUT_ACTUAL_SECOND_HALF_DRAWN').toBe(true);
      current = second!;
      frame('second half before changes', current);
      const formationIndex = E.FORMATIONS.findIndex((formation, index) =>
        index !== (current.live!.formationIndex ?? current.formationIndex) && formation.slots.length === 11);
      expect(formationIndex >= 0, 'CM_POSITION_PARITY_OTHER_REAL_FORMATION_FOUNDATION').toBe(true);
      change(60, { kind: 'formation', formationIndex }, 'second half formation recut');
      change(70, { kind: 'shape', mentality: mentality === 'attacking' ? 'defensive' : 'attacking' }, 'second half mentality recut');
      change(75, duty(), 'second half duty recut');
      const before = JSON.stringify(current), settled = E.resumeMatch(current);
      expect(settled.kind, 'CM_POSITION_PARITY_RECUT_REAL_SETTLEMENT').toBe('match');
      expect(settled.state.live).toBeNull();
      expect(JSON.stringify(current), 'CM_POSITION_PARITY_RECUT_SETTLEMENT_INPUT_HELD').toBe(before);
      frame('recut settled whole result', settled);
    });
  });
});
