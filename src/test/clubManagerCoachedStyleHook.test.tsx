import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { useClubManager } from '@/hooks/useClubManager';
import { TrainingScreen } from '@/components/club-manager/TrainingScreen';
import { CM_PARTIAL, CM_ROSTERS } from '@/data/clubManagerRosters';
import { SAVE_KEY, loadCareer } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { readCoachedStyleCourse, startCoachedStyle, cancelCoachedStyle } from '@/lib/clubManagerTraits';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
}));

type Api = ReturnType<typeof useClubManager>;
type Commit = { career: CareerState | null; state: Api['coachedStyleSaveState']; raw: string | null };
let current: Api | null = null;
let commits: Commit[] = [];

function Harness() {
  const g = useClubManager();
  current = g;
  useLayoutEffect(() => {
    commits.push({ career: g.career, state: g.coachedStyleSaveState, raw: localStorage.getItem(SAVE_KEY) });
  }, [g.career, g.coachedStyleSaveState]);
  return g.career
    ? <TrainingScreen career={g.career} onSetPlan={g.setTraining} onRetrain={g.retrain} onStopRetrain={g.stopRetrain}
        onEditCoachedStyle={g.editCoachedStyle}
        coachedStyleSaveState={g.coachedStyleSaveState} />
    : <p>{g.phase}</p>;
}
function read(): Api {
  if (!current) throw new Error('Coached-style hook fixture has not rendered.');
  return current;
}
function career(): CareerState {
  const c = read().career;
  if (!c) throw new Error('Coached-style hook fixture has no career.');
  return c;
}
async function boot() {
  const view = render(<Harness />);
  await waitFor(() => expect(read().phase, 'COACHED_HOOK_BOOT_REAL').toBe('clubSelect'));
  const club = Object.keys(CM_ROSTERS).find(name => !CM_PARTIAL.includes(name)) ?? Object.keys(CM_ROSTERS)[0];
  expect(typeof club, 'COACHED_HOOK_REAL_ROSTER_CLUB').toBe('string');
  act(() => read().chooseClub(club));
  act(() => read().confirmClub());
  await waitFor(() => expect(read().phase).toBe('hub'));
  await waitFor(() => expect(read().coachedStyleSaveState, 'COACHED_HOOK_INITIAL_ACK').toBe('saved'));
  const player = career().squad.find(p => p.position !== 'GK' && !p.onLoan && !p.retraining);
  expect(player !== undefined, 'COACHED_HOOK_OWNED_OUTFIELDER').toBe(true);
  if (!player) throw new Error('No actual owned outfielder in this roster.');
  fireEvent.click(view.getByRole('button', { name: /Coached style/ }));
  fireEvent.change(view.getByLabelText('Player for coached style'), { target: { value: player.id } });
  return { view, id: player.id };
}
function rejectNativeWrites() {
  const actual = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage) throw new DOMException('Controlled local storage quota', 'QuotaExceededError');
    return actual.call(this, key, value);
  });
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); current = null; commits = [];
});
afterEach(() => {
  vi.restoreAllMocks(); cleanup(); current = null; commits = [];
  localStorage.clear(); sessionStorage.clear();
});

describe('Coached-style actions through the real career hook and writer', { timeout: 120000 }, () => {
  it('saves start and cancel before publishing their exact current-career acknowledgement', async () => {
    const { view, id } = await boot();
    const before = career();
    let ok = false;
    act(() => { ok = read().editCoachedStyle(id, (player, context) => startCoachedStyle(player, 'press', context)); });
    expect(ok, 'COACHED_HOOK_START_ACTUAL_SAVE').toBe(true);
    expect(career() === before, 'COACHED_HOOK_START_NEW_CAREER').toBe(false);
    expect(readCoachedStyleCourse(career().squad.find(p => p.id === id)!)).toEqual({ v: 1, to: 'press', weeksLeft: 6, weeksTotal: 6 });
    expect(read().coachedStyleSaveState, 'COACHED_HOOK_START_ACK_AFTER_SAVE').toBe('saved');
    const raw = localStorage.getItem(SAVE_KEY);
    expect(typeof raw, 'COACHED_HOOK_START_RAW_PRESENT').toBe('string');
    const disk = JSON.parse(raw!);
    expect(readCoachedStyleCourse(disk.squad.find((p: { id: string }) => p.id === id))).toEqual({ v: 1, to: 'press', weeksLeft: 6, weeksTotal: 6 });
    expect(view.container.querySelector('[data-cm-coached-course]')?.getAttribute('data-cm-coached-course'), 'COACHED_HOOK_CARD_REAL_COURSE').toBe('press');
    expect(view.container.querySelector('[data-cm-coached-save]')?.textContent, 'COACHED_HOOK_CARD_ACK_REAL').toBe('Saved');

    act(() => { ok = read().editCoachedStyle(id, (player, context) => cancelCoachedStyle(player, context)); });
    expect(ok, 'COACHED_HOOK_CANCEL_ACTUAL_SAVE').toBe(true);
    expect(readCoachedStyleCourse(career().squad.find(p => p.id === id)!)).toBeNull();
    expect(read().coachedStyleSaveState).toBe('saved');
    view.unmount();
    const loaded = loadCareer();
    expect(loaded !== null, 'COACHED_HOOK_REAL_LOAD').toBe(true);
    expect(loaded?.squad.find(p => p.id === id) !== undefined).toBe(true);
    expect(readCoachedStyleCourse(loaded!.squad.find(p => p.id === id)!)).toBeNull();
  });

  it('does not publish a start candidate when the actual storage primitive throws', async () => {
    const { view, id } = await boot();
    const before = career(), raw = localStorage.getItem(SAVE_KEY);
    expect(typeof raw, 'COACHED_HOOK_FAILED_START_OLD_RAW_PRESENT').toBe('string');
    const fault = rejectNativeWrites();
    let ok = true;
    act(() => { ok = read().editCoachedStyle(id, (player, context) => startCoachedStyle(player, 'press', context)); });
    expect(fault.mock.calls.length > 0, 'COACHED_HOOK_NATIVE_START_FAULT_FIRED').toBe(true);
    expect(ok, 'COACHED_HOOK_FAILED_START_REFUSED').toBe(false);
    expect(career(), 'COACHED_HOOK_FAILED_START_NOT_PUBLISHED').toBe(before);
    expect(localStorage.getItem(SAVE_KEY), 'COACHED_HOOK_FAILED_START_OLD_RAW_HELD').toBe(raw);
    expect(readCoachedStyleCourse(career().squad.find(p => p.id === id)!)).toBeNull();
    expect(read().saveFailed, 'COACHED_HOOK_EXISTING_SAVE_ERROR').toBe(true);
    expect(read().coachedStyleSaveState, 'COACHED_HOOK_FAILED_START_BLOCKED').toBe('blocked');
    expect(view.container.querySelector('[data-cm-coached-save]')?.textContent, 'COACHED_HOOK_FAILED_START_NO_SAVED_COPY').toBe('Not saved');
    fault.mockRestore();
  });

  it('keeps an actual saved course and old raw body when cancel cannot be saved', async () => {
    const { id } = await boot();
    let ok = false;
    act(() => { ok = read().editCoachedStyle(id, (player, context) => startCoachedStyle(player, 'press', context)); });
    expect(ok, 'COACHED_HOOK_CANCEL_HEALTHY_START').toBe(true);
    const before = career(), raw = localStorage.getItem(SAVE_KEY);
    expect(readCoachedStyleCourse(before.squad.find(p => p.id === id)!), 'COACHED_HOOK_CANCEL_COURSE_POSITIVE').not.toBeNull();
    expect(typeof raw, 'COACHED_HOOK_CANCEL_OLD_RAW_PRESENT').toBe('string');
    const fault = rejectNativeWrites();
    act(() => { ok = read().editCoachedStyle(id, (player, context) => cancelCoachedStyle(player, context)); });
    expect(fault.mock.calls.length > 0, 'COACHED_HOOK_NATIVE_CANCEL_FAULT_FIRED').toBe(true);
    expect(ok, 'COACHED_HOOK_FAILED_CANCEL_REFUSED').toBe(false);
    expect(career(), 'COACHED_HOOK_FAILED_CANCEL_NOT_PUBLISHED').toBe(before);
    expect(localStorage.getItem(SAVE_KEY), 'COACHED_HOOK_FAILED_CANCEL_OLD_RAW_HELD').toBe(raw);
    expect(readCoachedStyleCourse(career().squad.find(p => p.id === id)!)).toEqual({ v: 1, to: 'press', weeksLeft: 6, weeksTotal: 6 });
    expect(read().coachedStyleSaveState).toBe('blocked');
    fault.mockRestore();
    act(() => { ok = read().editCoachedStyle(id, (player, context) => cancelCoachedStyle(player, context)); });
    expect(ok, 'COACHED_HOOK_CANCEL_REAL_RETRY').toBe(true);
    expect(read().coachedStyleSaveState).toBe('saved');
  });

  it('marks a real charged-week candidate waiting before the existing passive writer acknowledges it', async () => {
    const { id } = await boot();
    let ok = false;
    act(() => { ok = read().editCoachedStyle(id, (player, context) => startCoachedStyle(player, 'press', context)); });
    expect(ok).toBe(true);
    const startWeek = career().week;
    commits = [];
    for (let guard = 0; guard < 16 && readCoachedStyleCourse(career().squad.find(p => p.id === id)!)?.weeksLeft === 6; guard += 1) {
      const week = career().week;
      await act(async () => { read().simToWeek(week + 1); });
      await waitFor(() => expect(read().coachedStyleSaveState).toBe('saved'));
      expect(career().week > week, 'COACHED_HOOK_REAL_CALENDAR_ADVANCES').toBe(true);
    }
    const advanced = career();
    expect(advanced.week > startWeek, 'COACHED_HOOK_WEEK_POSITIVE').toBe(true);
    expect(readCoachedStyleCourse(advanced.squad.find(p => p.id === id)!)?.weeksLeft, 'COACHED_HOOK_CHARGED_WEEK_WITNESS').toBe(5);
    const waiting = commits.findIndex(row => row.career === advanced && row.state === 'waiting');
    const saved = commits.findIndex(row => row.career === advanced && row.state === 'saved');
    expect(waiting >= 0, 'COACHED_HOOK_WEEK_WAITING_BEFORE_ACK').toBe(true);
    expect(saved > waiting, 'COACHED_HOOK_WEEK_SAVED_AFTER_ACK').toBe(true);
    expect(commits[waiting].raw === localStorage.getItem(SAVE_KEY), 'COACHED_HOOK_WAITING_RAW_NOT_PREACKED').toBe(false);
    expect(commits[saved].raw, 'COACHED_HOOK_ACK_RAW_IS_ACTUAL_FINAL').toBe(localStorage.getItem(SAVE_KEY));
    const disk = JSON.parse(localStorage.getItem(SAVE_KEY)!);
    expect(readCoachedStyleCourse(disk.squad.find((p: { id: string }) => p.id === id))?.weeksLeft).toBe(5);
  });
});

