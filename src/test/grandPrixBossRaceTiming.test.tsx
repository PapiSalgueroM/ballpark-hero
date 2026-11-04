import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ComponentType, ReactNode } from 'react';
import type { useGrandPrixBoss } from '@/hooks/useGrandPrixBoss';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  applyAction, createCareer, validateSavedCareer,
  type GrandPrixAction, type GrandPrixCareer, type GrandPrixOrder, type GrandPrixSetup,
} from '@/lib/grandPrixBoss';

// Actual world/actions/reader and actual Page. Only the established public hook
// and unrelated chrome are mocked. No storage, provider, route or browser claim.
const pageFile = path.resolve(process.env.GP_BOSS_PAGE_FILE || 'src/pages/GrandPrixBoss.tsx');
const start = vi.fn((_seed: number) => true);
const dispatch = vi.fn((_action: GrandPrixAction) => true);
const reload = vi.fn();
let current: ReturnType<typeof useGrandPrixBoss>;
let Page: ComponentType | null = null;
beforeAll(async () => {
  expect(fs.existsSync(pageFile), 'GP_TIMING_ACTUAL_PAGE_FOUNDATION').toBe(true);
  vi.doMock('@/hooks/useGrandPrixBoss', () => ({ useGrandPrixBoss: () => current }));
  vi.doMock('@/components/game/GameShell', () => ({
    GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  }));
  vi.doMock('@/components/seo/PageSeo', () => ({ default: () => null }));
  vi.doMock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
  Page = (await import(/* @vite-ignore */ pathToFileURL(pageFile).href)).default;
  expect(Page, 'GP_TIMING_PAGE_MODULE_FOUNDATION').toBeTypeOf('function');
});
beforeEach(() => {
  cleanup(); localStorage.clear();
  localStorage.setItem('rules-gate-seen:/grand-prix-boss', '1');
  start.mockClear(); dispatch.mockReset().mockReturnValue(true); reload.mockClear();
  current = { career: null, status: 'ready', message: '', moved: false, start, dispatch, reload };
});
afterEach(() => cleanup());

type View = ReturnType<typeof render>;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const own = (state: GrandPrixCareer) => state.drivers.filter(driver => driver.contract?.teamId === state.teamId);
function read(raw: unknown): GrandPrixCareer {
  const before = JSON.stringify(raw), result = validateSavedCareer(raw);
  expect(JSON.stringify(raw), 'GP_TIMING_READER_INPUT_HELD').toBe(before);
  expect(result.ok, 'GP_TIMING_READER_FOUNDATION').toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused timing fixture');
  return result.state;
}
function move(state: GrandPrixCareer, action: GrandPrixAction): GrandPrixCareer {
  const before = JSON.stringify(state), result = applyAction(state, action);
  expect(JSON.stringify(state), 'GP_TIMING_ENGINE_INPUT_HELD').toBe(before);
  expect(result.ok, 'GP_TIMING_ENGINE_ACTION_FOUNDATION:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused actual action');
  expect(result.state.revision).toBe(state.revision + 1);
  expect(read(result.state), 'GP_TIMING_CANONICAL_ACTION_FOUNDATION').toEqual(result.state);
  return result.state;
}
function grid() {
  const career = read(createCareer(42));
  return move(career, { type: 'qualify', expectedRevision: career.revision });
}
function begin(state: GrandPrixCareer) {
  const setups = own(state).map<GrandPrixSetup>(driver => ({
    driverId: driver.id, pace: 'balanced', compound: state.race!.weather === 'wet' ? 'wet' : 'medium',
  }));
  return move(state, { type: 'startRace', expectedRevision: state.revision, setups });
}
function interval(state: GrandPrixCareer) {
  const orders = own(state).map<GrandPrixOrder>(driver => ({ driverId: driver.id, pace: 'balanced' }));
  return move(state, { type: 'raceInterval', expectedRevision: state.revision, orders });
}
function checkpointLab() {
  const actual = interval(begin(grid()));
  expect(actual.phase, 'GP_TIMING_CHECKPOINT_PHASE_FOUNDATION').toBe('race');
  expect(actual.race!.lap).toBe(12);
  const state = clone(actual), seats = own(state);
  expect(seats).toHaveLength(2);
  // Explicit component lab: only status/completedLaps/elapsedMs and entry array
  // order change after the actual checkpoint. This is not a natural race result.
  // All active entries remain on the actual checkpoint, never a fabricated lap deficit.
  state.race!.entries.forEach((entry, index) => {
    entry.status = 'running'; entry.completedLaps = 12;
    entry.elapsedMs = entry.driverId === seats[0].id ? 1_000_000
      : entry.driverId === seats[1].id ? 1_012_345 : 1_020_000 + index * 1_000;
  });
  const firstForeign = state.race!.entries.findIndex(entry => entry.teamId !== state.teamId);
  const [foreign] = state.race!.entries.splice(firstForeign, 1);
  state.race!.entries.unshift(foreign);
  const checked = read(state);
  expect(checked.race!.entries[0].teamId).not.toBe(checked.teamId);
  expect(checked.race!.entries.every(entry => entry.status === 'running' && entry.completedLaps === 12)).toBe(true);
  return checked;
}
function frame() {
  const Drawing = Page;
  if (!Drawing) throw new Error('Actual Page was not imported');
  return <MemoryRouter initialEntries={['/grand-prix-boss']}><Drawing /></MemoryRouter>;
}
function show(state: GrandPrixCareer): View {
  current.career = state;
  const view = render(frame());
  fireEvent.click(screen.getByRole('button', { name: 'Next race' }));
  return view;
}
function publish(view: View, state: GrandPrixCareer) {
  current.career = state;
  view.rerender(frame());
}
function card(name: string) {
  const heading = screen.getByRole('heading', { name, level: 4 });
  const section = heading.closest('section');
  expect(section, 'GP_TIMING_OWN_CARD_FOUNDATION').not.toBeNull();
  return within(section!);
}
function field() {
  const summary = screen.getByText('Whole field', { exact: true });
  expect(summary.tagName, 'GP_TIMING_EXISTING_DETAILS_FOUNDATION').toBe('SUMMARY');
  const details = summary.closest('details')!;
  expect(details).not.toBeNull();
  if (!details.open) fireEvent.click(summary);
  expect(details.open, 'GP_TIMING_DETAILS_OPEN_FOUNDATION').toBe(true);
  return within(details).getAllByRole('listitem');
}
function fieldRow(name: string) {
  const rows = field();
  const row = rows.find(node => within(node).queryByText(new RegExp('^\\d+\\. ' + name.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') + '$')));
  expect(row, 'GP_TIMING_FIELD_DRIVER_FOUNDATION:' + name).toBeDefined();
  return within(row!);
}

describe('Grand Prix Boss saved race timing decisions', () => {
  it('GP_RACE_TIMING_CHECKPOINTS: displays exact saved leader gaps and honest retired states', () => {
    const state = checkpointLab(), seats = own(state), before = JSON.stringify(state);
    const view = show(state);
    expect(card(seats[0].name).getByText('P1')).toBeVisible();
    expect(card(seats[1].name).getByText('P2')).toBeVisible();
    expect(card(seats[0].name).queryByText('Gap to leader: Leader') !== null,
      'GP_RACE_TIMING_MISSING').toBe(true);
    expect(card(seats[0].name).getByText('Gap to leader: Leader')).toBeVisible();
    expect(card(seats[1].name).getByText('Gap to leader: +12.345s')).toBeVisible();
    expect(fieldRow(seats[0].name).getByText('Gap to leader: Leader')).toBeVisible();
    expect(fieldRow(seats[1].name).getByText('Gap to leader: +12.345s')).toBeVisible();
    expect(JSON.stringify(state), 'GP_TIMING_RENDER_INPUT_HELD').toBe(before);

    // Reader-admitted tie lab: the actual current sort chooses the first ID,
    // while the other driver has a zero time gap, not a second Leader label.
    const tie = clone(state);
    const sortedSeats = [...own(tie)].sort((a, b) => a.id.localeCompare(b.id));
    tie.race!.entries.find(entry => entry.driverId === sortedSeats[1].id)!.elapsedMs = 1_000_000;
    const tied = read(tie), tiedBefore = JSON.stringify(tied);
    publish(view, tied);
    expect(card(sortedSeats[0].name).getByText('Gap to leader: Leader')).toBeVisible();
    expect(card(sortedSeats[1].name).getByText('Gap to leader: +0.000s')).toBeVisible();
    expect(fieldRow(sortedSeats[1].name).getByText('Gap to leader: +0.000s')).toBeVisible();
    expect(JSON.stringify(tied)).toBe(tiedBefore);

    // Reader-admitted retirement lab. A faster stored elapsed time must not
    // make a retired entry the active leader or give it a time-gap label.
    const retired = clone(state), retiredEntry = retired.race!.entries.find(entry => entry.driverId === seats[0].id)!;
    retiredEntry.status = 'retired'; retiredEntry.completedLaps = 7;
    const retiredState = read(retired), retiredBefore = JSON.stringify(retiredState);
    publish(view, retiredState);
    expect(card(seats[0].name).getByText('Retired after 7 laps')).toBeVisible();
    expect(card(seats[0].name).queryByText(/^Gap to leader:/)).toBeNull();
    expect(fieldRow(seats[0].name).getByText('Retired after 7 laps')).toBeVisible();
    expect(fieldRow(seats[0].name).queryByText(/^Gap to leader:/)).toBeNull();
    expect(card(seats[1].name).getByText('Gap to leader: Leader')).toBeVisible();
    expect(JSON.stringify(retiredState)).toBe(retiredBefore);

    // All-retired component lab is admitted by the actual checkpoint reader.
    // It has no active leader. Singular one-lap and zero-lap text are explicit.
    const all = clone(state);
    all.race!.entries.forEach((entry, index) => {
      entry.status = 'retired';
      entry.completedLaps = entry.driverId === seats[0].id ? 1 : entry.driverId === seats[1].id ? 0 : index % 12;
    });
    const allRetired = read(all), allBefore = JSON.stringify(allRetired);
    publish(view, allRetired);
    expect(card(seats[0].name).getByText('Retired after 1 lap')).toBeVisible();
    expect(card(seats[1].name).getByText('Retired after 0 laps')).toBeVisible();
    expect(screen.queryAllByText(/^Gap to leader:/)).toHaveLength(0);
    const retiredRows = field();
    expect(retiredRows).toHaveLength(20);
    for (const row of retiredRows) {
      const detail = within(row);
      const name = detail.getByText(/^\d+\. /).textContent!.replace(/^\d+\. /, '');
      const driver = allRetired.drivers.find(value => value.name === name);
      expect(driver, 'GP_TIMING_RETIRED_FIELD_IDENTITY_FOUNDATION').toBeDefined();
      const entry = allRetired.race!.entries.find(value => value.driverId === driver!.id)!;
      expect(detail.getByText('Retired after ' + entry.completedLaps
        + (entry.completedLaps === 1 ? ' lap' : ' laps'))).toBeVisible();
    }
    expect(JSON.stringify(allRetired)).toBe(allBefore);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('GP_RACE_TIMING_GRID_GUARD: keeps grid and lap zero free of invented race-time gaps', () => {
    const qualified = grid(), before = JSON.stringify(qualified), view = show(qualified);
    expect(screen.getByText('Lap 0 of 40')).toBeVisible();
    expect(screen.queryAllByText(/^Gap to leader:/)).toHaveLength(0);
    expect(screen.queryAllByText(/^Retired after /)).toHaveLength(0);
    for (const driver of own(qualified)) {
      expect(screen.getByLabelText('Tyres for ' + driver.name)).toBeVisible();
      expect(screen.getByLabelText('Pace for ' + driver.name)).toBeVisible();
    }
    expect(field()).toHaveLength(20);
    expect(JSON.stringify(qualified)).toBe(before);
    const started = begin(qualified), startedBefore = JSON.stringify(started);
    publish(view, started);
    expect(screen.getByText('Lap 0 of 40')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Run to lap 12' })).toBeVisible();
    expect(screen.queryAllByText(/^Gap to leader:/)).toHaveLength(0);
    expect(screen.queryAllByText(/^Retired after /)).toHaveLength(0);
    expect(JSON.stringify(started)).toBe(startedBefore);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('GP_RACE_TIMING_ORDERS: preserves IDs, pace, pit choice, revision and refused state', () => {
    const state = checkpointLab(), seats = own(state), before = JSON.stringify(state), view = show(state);
    fireEvent.change(screen.getByLabelText('Pace for ' + seats[0].name), { target: { value: 'push' } });
    fireEvent.change(screen.getByLabelText('Pit choice for ' + seats[0].name), { target: { value: 'hard' } });
    fireEvent.change(screen.getByLabelText('Pace for ' + seats[1].name), { target: { value: 'conserve' } });
    fireEvent.change(screen.getByLabelText('Pit choice for ' + seats[1].name), { target: { value: 'soft' } });
    const expected: GrandPrixAction = { type: 'raceInterval', expectedRevision: state.revision, orders: [
      { driverId: seats[0].id, pace: 'push', pitTo: 'hard' },
      { driverId: seats[1].id, pace: 'conserve', pitTo: 'soft' },
    ] };
    dispatch.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Run to lap 26' }));
    expect(dispatch.mock.calls).toEqual([[expected]]);
    expect((screen.getByLabelText('Pit choice for ' + seats[0].name) as HTMLSelectElement).value).toBe('hard');
    expect((screen.getByLabelText('Pit choice for ' + seats[1].name) as HTMLSelectElement).value).toBe('soft');
    expect(JSON.stringify(state)).toBe(before);
    dispatch.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Run to lap 26' }));
    expect(dispatch.mock.calls).toEqual([[expected], [expected]]);
    for (const driver of seats) expect((screen.getByLabelText('Pit choice for ' + driver.name) as HTMLSelectElement).value).toBe('');
    expect(JSON.stringify(state)).toBe(before);

    dispatch.mockClear(); current.status = 'unreadable'; view.rerender(frame());
    expect(screen.getByRole('button', { name: 'Run to lap 26' })).toBeDisabled();
    for (const driver of seats) {
      expect(screen.getByLabelText('Pace for ' + driver.name)).toBeDisabled();
      expect(screen.getByLabelText('Pit choice for ' + driver.name)).toBeDisabled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Run to lap 26' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('GP_RACE_TIMING_FINISH: preserves the actual classification, field order and source state', () => {
    let state = begin(grid());
    while (state.phase === 'race') state = interval(state);
    expect(state.phase, 'GP_TIMING_ACTUAL_FINISH_FOUNDATION').toBe('raceResult');
    const result = state.results[state.round], before = JSON.stringify(state);
    expect(result.classification).toHaveLength(20);
    show(state);
    for (const driver of own(state)) {
      const classified = result.classification.find(row => row.driverId === driver.id)!;
      expect(classified).toBeDefined();
      expect(card(driver.name).getByText(classified.status === 'retired' ? 'Retired' : 'P' + classified.position)).toBeVisible();
    }
    const rows = field();
    expect(rows).toHaveLength(result.classification.length);
    result.classification.forEach((classified, index) => {
      const driver = state.drivers.find(row => row.id === classified.driverId)!;
      expect(within(rows[index]).getByText((index + 1) + '. ' + driver.name)).toBeVisible();
    });
    expect(screen.getByRole('button', { name: 'Next round' })).toBeVisible();
    expect(screen.queryByRole('combobox', { name: /Pit choice/ })).toBeNull();
    expect(screen.queryByRole('combobox', { name: /Pace for/ })).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    expect(JSON.stringify(state)).toBe(before);
  });
});
