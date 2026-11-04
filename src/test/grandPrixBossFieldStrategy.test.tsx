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
  type Compound, type GrandPrixAction, type GrandPrixCareer, type GrandPrixOrder,
  type GrandPrixRaceEntry, type GrandPrixSetup,
} from '@/lib/grandPrixBoss';

// Actual Page, fictional engine world, actions and reader. Only the established
// public hook boundary and unrelated chrome are mocked. Store holds below check
// Page behavior, not the real hook's save/fence implementation or browser layout.
const pageFile = path.resolve(process.env.GP_BOSS_PAGE_FILE || 'src/pages/GrandPrixBoss.tsx');
const saveKey = 'grand-prix-boss-save-v1';
const start = vi.fn((_seed: number) => true);
const dispatch = vi.fn((_action: GrandPrixAction) => true);
const reload = vi.fn();
let current: ReturnType<typeof useGrandPrixBoss>;
let Page: ComponentType | null = null;

beforeAll(async () => {
  expect(fs.existsSync(pageFile), 'GP_FIELD_ACTUAL_PAGE_FOUNDATION').toBe(true);
  vi.doMock('@/hooks/useGrandPrixBoss', () => ({ useGrandPrixBoss: () => current }));
  vi.doMock('@/components/game/GameShell', () => ({
    GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  }));
  vi.doMock('@/components/seo/PageSeo', () => ({ default: () => null }));
  vi.doMock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
  Page = (await import(/* @vite-ignore */ pathToFileURL(pageFile).href)).default;
  expect(Page, 'GP_FIELD_PAGE_MODULE_FOUNDATION').toBeTypeOf('function');
});
beforeEach(() => {
  cleanup(); localStorage.clear(); sessionStorage.clear();
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
  expect(JSON.stringify(raw), 'GP_FIELD_READER_INPUT_HELD').toBe(before);
  expect(result.ok, 'GP_FIELD_READER_FOUNDATION').toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused field fixture');
  return result.state;
}
function move(state: GrandPrixCareer, action: GrandPrixAction): GrandPrixCareer {
  const before = JSON.stringify(state), result = applyAction(state, action);
  expect(JSON.stringify(state), 'GP_FIELD_ENGINE_INPUT_HELD').toBe(before);
  expect(result.ok, 'GP_FIELD_ENGINE_ACTION_FOUNDATION:' + action.type).toBe(true);
  if (result.ok === false) throw new Error('Unreachable refused field action');
  expect(result.state.revision).toBe(state.revision + 1);
  expect(read(result.state), 'GP_FIELD_CANONICAL_ACTION_FOUNDATION').toEqual(result.state);
  return result.state;
}
function grid() {
  const state = read(createCareer(42));
  return move(state, { type: 'qualify', expectedRevision: state.revision });
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
function checkpoint() {
  const state = interval(begin(grid()));
  expect(state.phase, 'GP_FIELD_CHECKPOINT_PHASE_FOUNDATION').toBe('race');
  expect(state.race!.lap).toBe(12);
  expect(state.race!.entries.filter(entry => entry.status !== 'retired').length).toBeGreaterThan(2);
  return state;
}
function stores() {
  const rows = (store: Storage) => Array.from({ length: store.length }, (_, index) => store.key(index)!)
    .sort().map(key => [key, store.getItem(key)]);
  return { local: rows(localStorage), session: rows(sessionStorage) };
}
function saved(state: GrandPrixCareer) {
  return JSON.stringify({ schemaVersion: 1, career: state, completedSeasons: [] });
}
function frame() {
  const Drawing = Page;
  if (!Drawing) throw new Error('Actual Page was not imported');
  return <MemoryRouter initialEntries={['/grand-prix-boss']}><Drawing /></MemoryRouter>;
}
function show(state: GrandPrixCareer): View {
  current.career = state;
  localStorage.setItem(saveKey, saved(state));
  const before = stores(), view = render(frame());
  fireEvent.click(screen.getByRole('button', { name: 'Next race' }));
  expect(stores(), 'GP_FIELD_MOUNT_STORES_HELD').toEqual(before);
  return view;
}
function publish(view: View, state: GrandPrixCareer) {
  // Explicit public-hook publication lab: the supplied canonical result and
  // matching envelope arrive together. This does not execute the save hook.
  current.career = state;
  localStorage.setItem(saveKey, saved(state));
  const before = stores();
  view.rerender(frame());
  expect(stores(), 'GP_FIELD_PUBLISH_STORES_HELD').toEqual(before);
}
function fieldDetails() {
  const summary = screen.getByText('Whole field', { exact: true });
  expect(summary.tagName, 'GP_FIELD_DETAILS_FOUNDATION').toBe('SUMMARY');
  const details = summary.closest('details');
  expect(details, 'GP_FIELD_DETAILS_PARENT_FOUNDATION').not.toBeNull();
  return { summary, details: details! };
}
function field() {
  const { summary, details } = fieldDetails();
  if (!details.open) fireEvent.click(summary);
  expect(details.open, 'GP_FIELD_DETAILS_OPEN_FOUNDATION').toBe(true);
  const rows = within(details).getAllByRole('listitem');
  expect(rows, 'GP_FIELD_COMPLETE_ENTRY_COUNT').toHaveLength(20);
  return rows;
}
function fieldRow(state: GrandPrixCareer, entry: GrandPrixRaceEntry, rows = field()) {
  const driver = state.drivers.find(row => row.id === entry.driverId);
  expect(driver, 'GP_FIELD_DRIVER_FOUNDATION:' + entry.driverId).toBeDefined();
  const name = driver!.name.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  const row = rows.find(node => within(node).queryByText(new RegExp('^\\d+\\. ' + name + '$')));
  expect(row, 'GP_FIELD_ROW_IDENTITY_FOUNDATION:' + entry.driverId).toBeDefined();
  return within(row!);
}
function tyreLine(entry: GrandPrixRaceEntry) {
  const names: Record<Compound, string> = { soft: 'Soft', medium: 'Medium', hard: 'Hard', wet: 'Wet' };
  return names[entry.compound] + ' tyres, ' + Math.round(entry.tyreWear) + '% wear, ' + entry.stops + ' stops';
}
function fieldText() {
  return field().map(row => row.textContent);
}
function expectFieldIdentityAndTiming(state: GrandPrixCareer) {
  const ordered = state.race!.entries.slice().sort((a, b) => Number(a.status === 'retired') - Number(b.status === 'retired')
    || b.completedLaps - a.completedLaps || a.elapsedMs - b.elapsedMs || a.driverId.localeCompare(b.driverId));
  const leader = ordered.find(entry => entry.status !== 'retired'), rows = field();
  ordered.forEach((entry, index) => {
    const driver = state.drivers.find(row => row.id === entry.driverId)!;
    const row = within(rows[index]);
    expect(row.getByText((index + 1) + '. ' + driver.name)).toBeVisible();
    const detail = state.race!.lap === 0 ? '0 laps' : entry.status === 'retired'
      ? 'Retired after ' + entry.completedLaps + (entry.completedLaps === 1 ? ' lap' : ' laps')
      : 'Gap to leader: ' + (entry === leader ? 'Leader' : '+' + ((entry.elapsedMs - leader!.elapsedMs) / 1000).toFixed(3) + 's');
    expect(row.getByText(detail, { exact: true })).toBeVisible();
  });
}
function expectActiveTyres(state: GrandPrixCareer) {
  const rows = field();
  for (const entry of state.race!.entries) {
    const row = fieldRow(state, entry, rows);
    if (entry.status === 'retired') {
      expect(row.queryByText(/ tyres, \d+% wear, \d+ stops$/)).toBeNull();
    } else {
      const line = row.getByText(tyreLine(entry), { exact: true });
      expect(line).toBeVisible();
      expect(line.tagName).toBe('P');
    }
  }
}

describe('Grand Prix Boss saved whole-field strategy', () => {
  it('GP_FIELD_CURRENT: shows every active saved entry compound, rounded wear and pit count', () => {
    const actual = checkpoint(), lab = clone(actual);
    const foreign = lab.race!.entries.filter(entry => entry.teamId !== lab.teamId && entry.status === 'running');
    expect(foreign.length, 'GP_FIELD_ROUNDING_LAB_FOUNDATION').toBeGreaterThanOrEqual(3);
    // Declared component lab on the actual fictional checkpoint. Only these
    // three opponents' compound/wear/stops change, not pace, time, laps or status.
    Object.assign(foreign[0], { compound: 'soft', tyreWear: 24.49, stops: 1 });
    Object.assign(foreign[1], { compound: 'hard', tyreWear: 24.5, stops: 2 });
    Object.assign(foreign[2], { compound: 'wet', tyreWear: 0.4, stops: 0 });
    const state = read(lab), before = JSON.stringify(state), view = show(state), storeBefore = stores();
    expectFieldIdentityAndTiming(state);
    const active = state.race!.entries.filter(entry => entry.status !== 'retired'), rows = field();
    expect(active.every(entry => fieldRow(state, entry, rows).queryByText(tyreLine(entry), { exact: true }) !== null),
      'GP_FIELD_STRATEGY_REQUIRED').toBe(true);
    expectActiveTyres(state);
    expect(fieldRow(state, foreign[0]).getByText('Soft tyres, 24% wear, 1 stops')).toBeVisible();
    expect(fieldRow(state, foreign[1]).getByText('Hard tyres, 25% wear, 2 stops')).toBeVisible();
    expect(fieldRow(state, foreign[2]).getByText('Wet tyres, 0% wear, 0 stops')).toBeVisible();
    expect(JSON.stringify(state), 'GP_FIELD_RENDER_STATE_HELD').toBe(before);
    expect(stores(), 'GP_FIELD_RENDER_STORES_HELD').toEqual(storeBefore);

    // Actual seed42 public actions, not the altered component lab, supply the
    // final classification and finished entries. Their saved telemetry remains.
    let finished = actual;
    while (finished.phase === 'race') finished = interval(finished);
    expect(finished.phase, 'GP_FIELD_FINISH_FOUNDATION').toBe('raceResult');
    const finishBefore = JSON.stringify(finished);
    publish(view, finished);
    expectActiveTyres(finished);
    expectFieldIdentityAndTiming(finished);
    const classification = finished.results[finished.round].classification;
    const finishedRows = field();
    classification.forEach((entry, index) => {
      const driver = finished.drivers.find(row => row.id === entry.driverId)!;
      expect(within(finishedRows[index]).getByText((index + 1) + '. ' + driver.name)).toBeVisible();
    });
    expect(JSON.stringify(finished), 'GP_FIELD_FINISH_STATE_HELD').toBe(finishBefore);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('GP_FIELD_PIT_UPDATE: changes telemetry only when the actual pitted checkpoint is published', () => {
    const state = checkpoint(), seats = own(state), driver = seats[0];
    const entry = state.race!.entries.find(row => row.driverId === driver.id)!;
    expect(entry.status, 'GP_FIELD_PIT_ACTIVE_FOUNDATION').toBe('running');
    const pitTo: Compound = entry.compound === 'hard' ? 'soft' : 'hard';
    const before = JSON.stringify(state), view = show(state), beforeText = fieldText(), storeBefore = stores();
    expectFieldIdentityAndTiming(state);
    fireEvent.change(screen.getByLabelText('Pit choice for ' + driver.name), { target: { value: pitTo } });
    expect(fieldText(), 'GP_FIELD_PENDING_CHOICE_NOT_SAVED_TELEMETRY').toEqual(beforeText);
    const expected: GrandPrixAction = { type: 'raceInterval', expectedRevision: state.revision, orders: seats.map(row => ({
      driverId: row.id, pace: 'balanced', ...(row.id === driver.id ? { pitTo } : {}),
    })) };
    let next: GrandPrixCareer | null = null;
    dispatch.mockImplementation(action => { next = move(state, action); return true; });
    fireEvent.click(screen.getByRole('button', { name: 'Run to lap 26' }));
    expect(dispatch.mock.calls).toEqual([[expected]]);
    expect(next, 'GP_FIELD_PIT_TRANSITION_FOUNDATION').not.toBeNull();
    expect(current.career, 'GP_FIELD_NOT_PUBLISHED_CAREER_HELD').toBe(state);
    expect(fieldText(), 'GP_FIELD_NOT_PUBLISHED_TELEMETRY_HELD').toEqual(beforeText);
    expect(JSON.stringify(state), 'GP_FIELD_NOT_PUBLISHED_INPUT_HELD').toBe(before);
    expect(stores(), 'GP_FIELD_NOT_PUBLISHED_STORES_HELD').toEqual(storeBefore);
    const advanced = read(next), afterEntry = advanced.race!.entries.find(row => row.driverId === driver.id)!;
    expect(advanced.race!.lap).toBe(26);
    expect(afterEntry.status, 'GP_FIELD_PIT_AFTER_ACTIVE_FOUNDATION').toBe('running');
    expect(afterEntry.compound).toBe(pitTo);
    expect(afterEntry.stops).toBe(entry.stops + 1);
    expect(tyreLine(afterEntry)).not.toBe(tyreLine(entry));
    const advancedBefore = JSON.stringify(advanced);
    publish(view, advanced);
    expect(fieldRow(advanced, afterEntry).queryByText(tyreLine(afterEntry), { exact: true }) !== null,
      'GP_FIELD_UPDATE_REQUIRED').toBe(true);
    expectActiveTyres(advanced);
    expectFieldIdentityAndTiming(advanced);
    expect(fieldRow(advanced, afterEntry).queryByText(tyreLine(entry), { exact: true })).toBeNull();
    expect(JSON.stringify(advanced), 'GP_FIELD_PUBLISHED_STATE_HELD').toBe(advancedBefore);
    expect(localStorage.getItem(saveKey)).toBe(saved(advanced));
  });

  it('GP_FIELD_GUARDS: keeps grid, lap zero and retired field rows free of strategy claims', () => {
    const qualified = grid(), before = JSON.stringify(qualified), view = show(qualified), storeBefore = stores();
    expect(screen.getByText('Lap 0 of 40')).toBeVisible();
    expectFieldIdentityAndTiming(qualified);
    for (const row of field()) expect(within(row).queryByText(/ tyres, \d+% wear, \d+ stops$/)).toBeNull();
    expect(JSON.stringify(qualified)).toBe(before);
    expect(stores()).toEqual(storeBefore);
    const started = begin(qualified), startedBefore = JSON.stringify(started);
    publish(view, started);
    expect(screen.getByRole('button', { name: 'Run to lap 12' })).toBeVisible();
    expectFieldIdentityAndTiming(started);
    for (const row of field()) expect(within(row).queryByText(/ tyres, \d+% wear, \d+ stops$/)).toBeNull();
    expect(JSON.stringify(started)).toBe(startedBefore);

    const lab = clone(interval(started)), entry = lab.race!.entries.find(row => row.driverId === own(lab)[0].id)!;
    // Explicit reader-admitted retirement component lab, not a natural result.
    entry.status = 'retired'; entry.completedLaps = 7;
    const retired = read(lab), retiredBefore = JSON.stringify(retired);
    publish(view, retired);
    const retiredRow = fieldRow(retired, entry);
    expect(retiredRow.getByText('Retired after 7 laps')).toBeVisible();
    expect(retiredRow.queryByText(/^Gap to leader:/)).toBeNull();
    expect(retiredRow.queryByText(/ tyres, \d+% wear, \d+ stops$/)).toBeNull();
    expectFieldIdentityAndTiming(retired);
    expect(JSON.stringify(retired)).toBe(retiredBefore);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('GP_FIELD_PENDING: preserves saved field information for pending, refused and read-only orders', () => {
    const state = checkpoint(), seats = own(state), before = JSON.stringify(state), view = show(state);
    const textBefore = fieldText(), storeBefore = stores();
    expectFieldIdentityAndTiming(state);
    fireEvent.change(screen.getByLabelText('Pace for ' + seats[0].name), { target: { value: 'push' } });
    fireEvent.change(screen.getByLabelText('Pit choice for ' + seats[0].name), { target: { value: 'hard' } });
    fireEvent.change(screen.getByLabelText('Pace for ' + seats[1].name), { target: { value: 'conserve' } });
    fireEvent.change(screen.getByLabelText('Pit choice for ' + seats[1].name), { target: { value: 'soft' } });
    const expected: GrandPrixAction = { type: 'raceInterval', expectedRevision: state.revision, orders: [
      { driverId: seats[0].id, pace: 'push', pitTo: 'hard' },
      { driverId: seats[1].id, pace: 'conserve', pitTo: 'soft' },
    ] };
    expect(fieldText(), 'GP_FIELD_PENDING_TELEMETRY_HELD').toEqual(textBefore);
    dispatch.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Run to lap 26' }));
    expect(dispatch.mock.calls).toEqual([[expected]]);
    expect((screen.getByLabelText('Pit choice for ' + seats[0].name) as HTMLSelectElement).value).toBe('hard');
    expect((screen.getByLabelText('Pit choice for ' + seats[1].name) as HTMLSelectElement).value).toBe('soft');
    expect(fieldText(), 'GP_FIELD_REFUSED_TELEMETRY_HELD').toEqual(textBefore);
    const { summary, details } = fieldDetails();
    fireEvent.click(summary);
    expect(details.open).toBe(false);
    fireEvent.click(summary);
    expect(details.open).toBe(true);
    expect(fieldText(), 'GP_FIELD_DETAILS_READ_ONLY').toEqual(textBefore);
    expect(JSON.stringify(state), 'GP_FIELD_REFUSED_CAREER_HELD').toBe(before);
    expect(stores(), 'GP_FIELD_REFUSED_STORES_HELD').toEqual(storeBefore);

    dispatch.mockClear(); current.status = 'unreadable'; view.rerender(frame());
    expect(screen.getByRole('button', { name: 'Run to lap 26' })).toBeDisabled();
    for (const driver of seats) {
      expect(screen.getByLabelText('Pace for ' + driver.name)).toBeDisabled();
      expect(screen.getByLabelText('Pit choice for ' + driver.name)).toBeDisabled();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Run to lap 26' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(fieldText(), 'GP_FIELD_BLOCKED_TELEMETRY_HELD').toEqual(textBefore);
    expect(JSON.stringify(state), 'GP_FIELD_BLOCKED_CAREER_HELD').toBe(before);
    expect(stores(), 'GP_FIELD_BLOCKED_STORES_HELD').toEqual(storeBefore);
  });
});
