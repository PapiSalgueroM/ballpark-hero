import { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { FALLBACK_CLUBS, initCareer, type CareerState } from '@/lib/soccerCareerEngine';

const SAVE_KEY = 'press-loading-keyboard-career';
const NOW = Date.parse('2026-10-17T12:00:00Z');
const TITLES = {
  pendingFocus: 'opening a pending press room focuses its loading dialog',
  pendingEscape: 'Escape from the pending press room closes and stays closed after import',
  pendingBack: 'Back closes a pending press room without changing the career or pending save',
  loadedRoom: 'the actual loaded press room keeps Escape and Back exits healthy',
} as const;
type CaseKey = keyof typeof TITLES;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const store = (storage: Storage): Record<string, string> => Object.fromEntries(
  Array.from({ length: storage.length }, (_, index) => storage.key(index)!).sort().map(key => [key, storage.getItem(key)!]),
);
type Snapshot = {
  label: string; state: CareerState; local: Record<string, string>; session: Record<string, string>;
  html: string; focus: string | null; parentMounted: boolean; pendingSave: boolean;
  parentMounts: number; parentUnmounts: number; importCalls: number; gate: 'pending' | 'resolved';
  patches: { before: CareerState; after: CareerState }[]; draws: number[];
};
type Evidence = {
  title: string; initial: CareerState; latest: CareerState; persistedBefore: CareerState;
  storesBefore: { local: Record<string, string>; session: Record<string, string> };
  snapshots: Snapshot[]; importCalls: number; gate: 'pending' | 'resolved'; realModuleLoaded: boolean;
  mounts: number; unmounts: number; cleanupStarted: boolean; cleanupUnmounts: number;
  saveAttempts: CareerState[]; saveChecks: { label: string; before: boolean; result: boolean; after: boolean }[];
  patches: { before: CareerState; after: CareerState }[]; draws: number[]; console: string[][];
  keyEvents: { label: string; key: string; target: string; prevented: boolean; dispatchResult: boolean }[];
  outcome: Record<string, unknown>;
};
const rows: Partial<Record<CaseKey, Evidence>> = {};
let active: Evidence;
let seam: typeof import('@/lib/safeStorage');
let Boundary: typeof import('@/components/RouteErrorBoundary').RouteErrorBoundary;
let Tile: typeof import('@/components/soccer-career/PressRoomTile').default;
let releaseSave: (() => void) | undefined;
let gate: { promise: Promise<void>; resolve: () => void; imported: Promise<void>; finishImport: () => void };

beforeAll(async () => { await act(async () => undefined); });

function fixture(): CareerState {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  try {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const start = initCareer('Press Keyboard Fixture', 'England', 'ST', '2020s', stats, 80, 2020, FALLBACK_CLUBS, null, 90);
    const state: CareerState = { ...start, phase: 'playing', age: 25, retired: false,
      currentClub: 'Press Fixture Town', currentClubCountry: 'England', currentClubTier: 3, currentLeague: 'Fixture League',
      seasons: [{ ...start.seasons[0], year: 2025, age: 25, club: 'Press Fixture Town', clubCountry: 'England',
        clubTier: 3, type: 'playing', apps: 28, leagueApps: 24, goals: 14, assists: 8, rating: 7.1 }],
      popularity: 50, morale: 50, events: ['Unsaved fictional career change'], pendingEvents: [], pendingOffers: [],
      pendingSummary: null, pendingBallonDor: null };
    delete state.pressRoom;
    return clone(state);
  } finally { random.mockRestore(); clock.mockRestore(); }
}

function Parent() {
  const [career, setCareer] = useState(active.initial);
  active.latest = career;
  useEffect(() => {
    active.mounts++;
    releaseSave = seam.holdPendingSave(() => { active.saveAttempts.push(clone(active.latest)); return false; });
    return () => {
      if (active.cleanupStarted) active.cleanupUnmounts++; else active.unmounts++;
      releaseSave?.();
    };
  }, []);
  return <main data-press-keyboard-parent>
    <h1>Your fictional career remains open</h1>
    <Tile career={career} onCareer={update => setCareer(before => {
      const after = update(before); active.patches.push({ before: clone(before), after: clone(after) }); return after;
    })} />
  </main>;
}

function snap(label: string): Snapshot {
  const value: Snapshot = { label, state: clone(active.latest), local: store(localStorage), session: store(sessionStorage),
    html: document.body.innerHTML, focus: document.activeElement?.outerHTML ?? null,
    parentMounted: !!document.querySelector('[data-press-keyboard-parent]'), pendingSave: seam.hasPendingSaves(),
    parentMounts: active.mounts, parentUnmounts: active.unmounts, importCalls: active.importCalls, gate: active.gate,
    patches: clone(active.patches), draws: [...active.draws] };
  active.snapshots.push(value); return value;
}
function checkSave(label: string) {
  const before = seam.hasPendingSaves(), result = seam.settlePendingSaves(), after = seam.hasPendingSaves();
  active.saveChecks.push({ label, before, result, after });
}
const opener = () => screen.getByRole('button', { name: /Press room/ });
const pendingDialog = () => screen.queryByRole('dialog', { name: 'Opening the press room' });
const room = () => document.querySelector<HTMLElement>('[data-press-room] [role="dialog"]');

async function load(key: CaseKey) {
  vi.resetModules();
  const initial = fixture(), persistedBefore = clone(initial);
  persistedBefore.events = ['Earlier fictional career save'];
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem(SAVE_KEY, JSON.stringify(persistedBefore)); localStorage.setItem('press-keyboard-sentinel', 'local held');
  sessionStorage.setItem('press-keyboard-sentinel', 'session held');
  active = { title: TITLES[key], initial: clone(initial), latest: initial, persistedBefore,
    storesBefore: { local: store(localStorage), session: store(sessionStorage) }, snapshots: [], importCalls: 0,
    gate: 'pending', realModuleLoaded: false, mounts: 0, unmounts: 0, cleanupStarted: false, cleanupUnmounts: 0,
    saveAttempts: [], saveChecks: [], patches: [], draws: [], console: [], keyEvents: [], outcome: {} };
  rows[key] = active; releaseSave = undefined;
  let resolve!: () => void, finishImport!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  const imported = new Promise<void>(done => { finishImport = done; });
  gate = { promise, resolve, imported, finishImport };
  const held = active, heldGate = gate;
  // Only the actual room's module IO waits; its component and career logic stay real.
  vi.doMock('@/components/soccer-career/PressRoom', async importOriginal => {
    held.importCalls++; await heldGate.promise;
    const actual = await importOriginal<typeof import('@/components/soccer-career/PressRoom')>();
    held.realModuleLoaded = true; heldGate.finishImport(); return actual;
  });
  seam = await import('@/lib/safeStorage');
  expect(seam.hasPendingSaves(), 'The previous mounted fixture released its pending save').toBe(false);
  ({ RouteErrorBoundary: Boundary } = await import('@/components/RouteErrorBoundary'));
  ({ default: Tile } = await import('@/components/soccer-career/PressRoomTile'));
  const error = console.error.bind(console);
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    held.console.push(args.map(value => value instanceof Error ? `${value.name}: ${value.message}` : String(value))); error(...args);
  });
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  vi.spyOn(Math, 'random').mockImplementation(() => { held.draws.push(0.75); return 0.75; });
  render(<Boundary resetKey="/soccer-career"><Parent /></Boundary>); checkSave('mounted'); snap('mounted');
}

async function openPending() {
  const trigger = opener(); trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() => expect(active.importCalls).toBe(1));
  expect(pendingDialog(), 'The real loading fallback is mounted while module IO waits').not.toBeNull();
  return snap('import-pending');
}
async function releaseImport(label: string) {
  await act(async () => { active.gate = 'resolved'; gate.resolve(); await gate.promise; await gate.imported; });
  await act(async () => undefined);
  return snap(label);
}
async function awaitRoom(label: string) {
  await waitFor(() => expect(room()).not.toBeNull());
  expect(screen.getByText('Say it, then back it up')).toBeTruthy();
  return snap(label);
}
function escape(label: string) {
  const target = document.activeElement as HTMLElement;
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  const targetHtml = target.outerHTML;
  const dispatchResult = fireEvent(target, event);
  active.keyEvents.push({ label, key: event.key, target: targetHtml, prevented: event.defaultPrevented, dispatchResult });
  return snap(label);
}
async function closeBack(label: string) {
  fireEvent.click(screen.getByRole('button', { name: /Back to your career/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  return snap(label);
}
function unchanged() {
  expect(active.latest).toEqual(active.initial);
  expect(store(localStorage)).toEqual(active.storesBefore.local); expect(store(sessionStorage)).toEqual(active.storesBefore.session);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(active.persistedBefore);
  expect(active.mounts).toBe(1); expect(active.unmounts).toBe(0); expect(active.patches).toEqual([]); expect(active.draws).toEqual([]);
  expect(active.importCalls).toBe(1); expect(active.gate).toBe('resolved'); expect(active.realModuleLoaded).toBe(true);
  expect(active.console).toEqual([]); expect(active.saveChecks).toEqual([
    { label: 'mounted', before: true, result: false, after: true },
    { label: 'finished', before: true, result: false, after: true },
  ]);
  expect(active.saveAttempts).toEqual([active.initial, active.initial]);
  for (const value of active.snapshots) {
    expect(value.state, value.label).toEqual(active.initial); expect(value.local, value.label).toEqual(active.storesBefore.local);
    expect(value.session, value.label).toEqual(active.storesBefore.session);
    expect(value.parentMounted && value.pendingSave && value.parentMounts === 1 && value.parentUnmounts === 0, value.label).toBe(true);
    expect(value.patches, value.label).toEqual([]); expect(value.draws, value.label).toEqual([]);
  }
}
function finish() { checkSave('finished'); return snap('finished'); }

afterEach(async () => {
  if (active && gate && active.gate === 'pending') {
    if (active.importCalls > 0) await releaseImport('cleanup-import-drained');
    else { active.gate = 'resolved'; gate.resolve(); }
  }
  if (active && seam) snap('final-before-cleanup');
  if (active) active.cleanupStarted = true;
  cleanup(); releaseSave?.();
  vi.restoreAllMocks(); vi.doUnmock('@/components/soccer-career/PressRoom');
});
afterAll(() => {
  const target = process.env.PRESS_LOADING_KEYBOARD_RAW;
  if (!target) return;
  if (!isAbsolute(target)) throw new Error('PRESS_LOADING_KEYBOARD_RAW must be absolute');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ version: 1, caseTitles: Object.values(TITLES), cases: rows }, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Career press-room loading keyboard exits', () => {
  it(TITLES.pendingFocus, async () => {
    await load('pendingFocus'); await openPending();
    const pending = pendingDialog()!;
    active.outcome = { focusedInside: pending.contains(document.activeElement), modal: pending.getAttribute('aria-modal'),
      tabIndex: pending.getAttribute('tabindex'), gatePending: active.gate === 'pending' };
    await releaseImport('import-loaded'); await awaitRoom('actual-room'); await closeBack('loaded-back'); finish();
    expect(active.outcome.focusedInside && active.outcome.modal === 'true' && active.outcome.tabIndex === '-1' && active.outcome.gatePending,
      'PRESS_PENDING_FOCUS_AND_MODAL').toBe(true);
    expect(document.activeElement).toBe(opener()); unchanged();
  });
  it(TITLES.pendingEscape, async () => {
    await load('pendingEscape'); await openPending(); escape('pending-escape');
    const closedWhilePending = screen.queryByRole('dialog') === null;
    const focusReturned = document.activeElement === opener(), gatePending = active.gate === 'pending';
    await releaseImport('late-import-resolved');
    const stayedClosed = screen.queryByRole('dialog') === null;
    // Preserve the failed original observation, then drain and inspect the actual room too.
    const recoveryBackUsed = !stayedClosed;
    if (recoveryBackUsed) { await awaitRoom('original-room-after-unhandled-escape'); await closeBack('original-back-recovery'); }
    fireEvent.click(opener()); await awaitRoom('reopened-real-room');
    const reopenedRealRoom = !!room(); await closeBack('reopened-back');
    active.outcome = { closedWhilePending, focusReturned, gatePending, stayedClosed, recoveryBackUsed, reopenedRealRoom };
    finish();
    expect(closedWhilePending && focusReturned && gatePending && stayedClosed && reopenedRealRoom,
      'PRESS_PENDING_ESCAPE_CLOSE').toBe(true);
    expect(document.activeElement).toBe(opener()); unchanged();
  });
  it(TITLES.pendingBack, async () => {
    await load('pendingBack'); await openPending(); await closeBack('pending-back');
    const closedWhilePending = screen.queryByRole('dialog') === null;
    const focusReturned = document.activeElement === opener(), gatePending = active.gate === 'pending';
    await releaseImport('late-import-resolved');
    active.outcome = { closedWhilePending, focusReturned, gatePending, stayedClosed: screen.queryByRole('dialog') === null };
    finish();
    expect(active.outcome).toEqual({ closedWhilePending: true, focusReturned: true, gatePending: true, stayedClosed: true });
    expect(document.activeElement).toBe(opener()); unchanged();
  });
  it(TITLES.loadedRoom, async () => {
    await load('loadedRoom'); await openPending(); await releaseImport('import-loaded'); await awaitRoom('actual-room');
    const focusedInRoom = room()!.contains(document.activeElement);
    escape('loaded-escape'); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const escapeFocusReturned = document.activeElement === opener();
    fireEvent.click(opener()); await awaitRoom('loaded-reopened'); await closeBack('loaded-back');
    active.outcome = { focusedInRoom, escapeFocusReturned, backFocusReturned: document.activeElement === opener() };
    finish();
    expect(active.outcome).toEqual({ focusedInRoom: true, escapeFocusReturned: true, backFocusReturned: true });
    expect(active.keyEvents).toHaveLength(1); expect(active.keyEvents[0].prevented).toBe(true); unchanged();
  });
});
