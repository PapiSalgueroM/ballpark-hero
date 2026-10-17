import { useEffect, useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { FALLBACK_CLUBS, initCareer, type CareerState } from '@/lib/soccerCareerEngine';

const SAVE_KEY = 'press-room-failure-fixture';
const CHUNK_ERROR = 'Failed to fetch dynamically imported module: https://fixture.invalid/PressRoom-fixture.js';
const TITLES = [
  'a rejected press-room import keeps the career and its pending save mounted',
  'closing and reopening the failed press room preserves the career save and focus',
  'cancelling a pending import leaves the career ready for the actual room',
  'the actual healthy press room applies one calm answer and keeps its recorded history',
  'an ineligible career keeps the tile absent without importing or changing anything',
];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
type Snapshot = { label: string; parentMounted: boolean; pending: boolean; parentUnmounts: number; html: string;
  focus: string | null; state: CareerState; persisted: CareerState; draws: number[] };
type Evidence = { title: string; initial: CareerState; latest: CareerState; persistedBefore: CareerState; snapshots: Snapshot[];
  importCalls: number; gate: 'pending' | 'resolved' | 'rejected'; mounts: number; unmounts: number; cleanupStarted: boolean; cleanupUnmounts: number; allowPersist: boolean;
  retries: { state: CareerState; allowed: boolean; wrote: boolean }[]; settlements: { label: string; before: boolean; result: boolean; after: boolean }[];
  releases: { before: boolean; result: boolean; after: boolean }[]; patches: { before: CareerState; after: CareerState }[];
  draws: number[]; console: string[][]; failureBackFound?: boolean; failureCloseFocus?: boolean; failureReopened?: boolean };
const rows: Evidence[] = [];
beforeAll(async () => { await act(async () => undefined); });
let active: Evidence;
let seam: typeof import('@/lib/safeStorage');
let Boundary: typeof import('@/components/RouteErrorBoundary').RouteErrorBoundary;
let Tile: typeof import('@/components/soccer-career/PressRoomTile').default;
let press: typeof import('@/lib/soccerCareerPress');
let pendingSave = true;
let releaseSave: (() => void) | undefined;
let gate: { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void };

function fictionalCareer(ineligible = false): CareerState {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-17T12:00:00Z'));
  try {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const start = initCareer('Press Failure Fixture', 'England', 'ST', '2020s', stats, 80, 2020, FALLBACK_CLUBS, null, 90);
    const state: CareerState = { ...start, phase: ineligible ? 'youth' : 'playing', age: 25, retired: false,
      currentClub: 'Press Fixture Town', currentClubCountry: 'England', currentClubTier: 3, currentLeague: 'Fixture League',
      seasons: ineligible ? [] : [{ ...start.seasons[0], year: 2025, age: 25, club: 'Press Fixture Town', clubCountry: 'England',
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
    if (pendingSave) releaseSave = seam.holdPendingSave(() => {
      const row = { state: clone(active.latest), allowed: active.allowPersist, wrote: false };
      active.retries.push(row);
      if (!active.allowPersist) return false;
      localStorage.setItem(SAVE_KEY, JSON.stringify(active.latest)); row.wrote = true; releaseSave?.(); return true;
    });
    return () => { if (active.cleanupStarted) active.cleanupUnmounts++; else active.unmounts++; releaseSave?.(); };
  }, []);
  return <main data-press-parent>
    <h1>Fictional career still open</h1>
    <p data-press-parent-player>{career.playerName}</p>
    <Tile career={career} onCareer={update => setCareer(before => {
      const after = update(before); active.patches.push({ before: clone(before), after: clone(after) }); return after;
    })} />
  </main>;
}
const snap = (label: string) => {
  const row: Snapshot = { label, parentMounted: !!document.querySelector('[data-press-parent]'), pending: seam.hasPendingSaves(),
    parentUnmounts: active.unmounts, html: document.body.innerHTML, focus: document.activeElement?.outerHTML ?? null,
    state: clone(active.latest), persisted: JSON.parse(localStorage.getItem(SAVE_KEY)!), draws: [...active.draws] };
  active.snapshots.push(row); return row;
};
const settle = (label: string) => {
  const before = seam.hasPendingSaves(), result = seam.settlePendingSaves(), after = seam.hasPendingSaves();
  active.settlements.push({ label, before, result, after }); return result;
};
async function load(title: string, ineligible = false, hold = true) {
  vi.resetModules();
  const initial = fictionalCareer(ineligible), persistedBefore = clone(initial);
  persistedBefore.events = ['Earlier fictional career save'];
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem(SAVE_KEY, JSON.stringify(persistedBefore));
  active = { title, initial: clone(initial), latest: initial, persistedBefore, snapshots: [], importCalls: 0, gate: 'pending',
    mounts: 0, unmounts: 0, cleanupStarted: false, cleanupUnmounts: 0, allowPersist: false, retries: [], settlements: [], releases: [], patches: [], draws: [], console: [] };
  rows.push(active); pendingSave = hold; releaseSave = undefined;
  let resolve!: () => void, reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  // The real module remains behind this one deferred import IO boundary.
  gate = { promise, resolve, reject }; const held = active, heldGate = gate;
  vi.doMock('@/components/soccer-career/PressRoom', async importOriginal => {
    held.importCalls++; await heldGate.promise;
    return importOriginal<typeof import('@/components/soccer-career/PressRoom')>();
  });
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  seam = await import('@/lib/safeStorage');
  const realRelease = seam.releasePendingSaves;
  vi.spyOn(seam, 'releasePendingSaves').mockImplementation(() => {
    const before = seam.hasPendingSaves(), result = realRelease(), after = seam.hasPendingSaves();
    held.releases.push({ before, result, after }); return result;
  });
  ({ RouteErrorBoundary: Boundary } = await import('@/components/RouteErrorBoundary'));
  ({ default: Tile } = await import('@/components/soccer-career/PressRoomTile'));
  press = await import('@/lib/soccerCareerPress');
  const error = console.error.bind(console);
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    held.console.push(args.map(value => value instanceof Error ? `${value.name}: ${value.message}` : String(value))); error(...args);
  });
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-17T12:00:00Z'));
  vi.spyOn(Math, 'random').mockImplementation(() => { held.draws.push(0.75); return 0.75; });
  render(<Boundary resetKey="/soccer-career"><Parent /></Boundary>);
  snap('mounted'); return initial;
}
async function open() {
  fireEvent.click(screen.getByRole('button', { name: /Press room/ }));
  await waitFor(() => expect(active.importCalls).toBe(1)); snap('import-pending');
}
async function releaseImport(fail = false) {
  await act(async () => {
    active.gate = fail ? 'rejected' : 'resolved';
    if (fail) gate.reject(new Error(CHUNK_ERROR)); else gate.resolve();
    await gate.promise.catch(() => undefined);
  });
  if (fail) await waitFor(() => expect(screen.queryByText('Press room unavailable') || screen.queryByText('This page broke')).not.toBeNull());
  else await waitFor(() => expect(screen.queryByText('Say it, then back it up')).not.toBeNull());
  return snap(fail ? 'import-rejected' : 'import-loaded');
}
afterEach(async () => {
  if (active && gate && active.gate === 'pending') {
    await act(async () => { active.gate = 'resolved'; gate.resolve(); await gate.promise; });
  }
  if (active && seam) snap('final-before-cleanup');
  if (active) active.cleanupStarted = true;
  cleanup(); releaseSave?.();
  vi.restoreAllMocks(); vi.doUnmock('@/components/soccer-career/PressRoom');
  delete (navigator as unknown as Record<string, unknown>).onLine;
});
afterAll(() => {
  const target = process.env.PRESS_ROOM_FAILURE_RAW;
  if (!target) return;
  if (!isAbsolute(target)) throw new Error('PRESS_ROOM_FAILURE_RAW must be absolute');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify({ version: 1, titles: TITLES, cases: rows }, null, 2) + '\n', { flag: 'wx' });
});

describe('Soccer Career optional press-room import isolation', () => {
  it(TITLES[0], async () => {
    const initial = await load(TITLES[0]); expect(settle('before-rejection')).toBe(false); await open();
    const rejected = await releaseImport(true), blocked = settle('after-rejection');
    active.allowPersist = true; const recovered = settle('after-storage-recovery'); snap('storage-recovered');
    expect(rejected.parentMounted && rejected.pending && rejected.parentUnmounts === 0 && blocked === false,
      'PRESS_ROOM_GUARD_parent_and_pending_save').toBe(true);
    expect(rejected.state).toEqual(initial); expect(rejected.persisted).toEqual(active.persistedBefore);
    expect(active.releases).toEqual([]); expect(recovered).toBe(true); expect(seam.hasPendingSaves()).toBe(false);
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!)).toEqual(initial); expect(active.patches).toEqual([]); expect(active.draws).toEqual([]);
  });
  it(TITLES[1], async () => {
    const initial = await load(TITLES[1]); await open(); await releaseImport(true);
    const back = screen.queryByRole('button', { name: /Back to your career/ }); active.failureBackFound = !!back;
    if (back) {
      fireEvent.click(back); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      const tile = screen.getByRole('button', { name: /Press room/ }); active.failureCloseFocus = document.activeElement === tile; snap('failure-closed');
      fireEvent.click(tile); await waitFor(() => expect(screen.queryByText('Press room unavailable')).not.toBeNull());
      active.failureReopened = true; snap('failure-reopened');
    } else snap('failure-back-unavailable');
    const final = snap('reopen-outcome');
    expect(active.failureBackFound && active.failureCloseFocus && active.failureReopened && final.parentMounted && final.pending && active.unmounts === 0,
      'PRESS_ROOM_GUARD_failure_back_focus_reopen').toBe(true);
    expect(final.state).toEqual(initial); expect(final.persisted).toEqual(active.persistedBefore);
    expect(active.releases).toEqual([]); expect(active.importCalls).toBe(1); expect(active.patches).toEqual([]); expect(active.draws).toEqual([]);
  });
  it(TITLES[2], async () => {
    const initial = await load(TITLES[2]); await open();
    fireEvent.click(screen.getByRole('button', { name: /Back to your career/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Press room/ })); snap('pending-cancelled');
    await act(async () => { active.gate = 'resolved'; gate.resolve(); await gate.promise; });
    await act(async () => undefined);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Press room/ }));
    await waitFor(() => expect(screen.getByText('Say it, then back it up')).toBeTruthy());
    const done = snap('cancel-then-real-room'); expect(done.parentMounted && done.pending).toBe(true);
    expect(done.state).toEqual(initial); expect(done.persisted).toEqual(active.persistedBefore); expect(active.importCalls).toBe(1);
    expect(active.unmounts).toBe(0); expect(active.patches).toEqual([]); expect(active.releases).toEqual([]); expect(active.draws).toEqual([]);
  });
  it(TITLES[3], async () => {
    const initial = await load(TITLES[3]); await open(); await releaseImport();
    fireEvent.click(screen.getByRole('button', { name: 'Answer for your season' }));
    const calm = document.querySelector<HTMLButtonElement>('[data-press-answer="calm"]'); expect(calm).not.toBeNull(); fireEvent.click(calm!);
    await waitFor(() => expect(document.querySelector('[data-press-receipt]')).not.toBeNull());
    const expected = press.answerSoccerPress(clone(initial), 'calm'), answered = snap('real-calm-answer');
    expect(answered.state).toEqual(expected); expect(answered.state.morale).toBe(53); expect(answered.state.popularity).toBe(48);
    expect(press.pressRoomView(answered.state)).toMatchObject({ eligible: false, reason: 'You already answered for this saved season.' });
    expect(active.patches).toEqual([{ before: initial, after: expected }]); expect(answered.persisted).toEqual(active.persistedBefore);
    fireEvent.click(screen.getByRole('button', { name: /Back to your career/ }));
    fireEvent.click(screen.getByRole('button', { name: /Press room/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Read your answers' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Read your answers' }));
    expect(document.querySelectorAll('[data-press-history]')).toHaveLength(1);
    const done = snap('recorded-history-reopened'); expect(done.state).toEqual(expected); expect(active.patches).toHaveLength(1);
    expect(done.parentMounted && done.pending).toBe(true); expect(active.unmounts).toBe(0); expect(active.releases).toEqual([]); expect(active.draws).toEqual([]);
  });
  it(TITLES[4], async () => {
    const initial = await load(TITLES[4], true, false); const done = snap('ineligible');
    expect(press.pressRoomView(initial).eligible).toBe(false); expect(screen.queryByRole('button', { name: /Press room/ })).toBeNull();
    expect(done.parentMounted).toBe(true); expect(done.pending).toBe(false); expect(done.state).toEqual(initial);
    expect(active.importCalls).toBe(0); expect(active.patches).toEqual([]); expect(active.retries).toEqual([]); expect(active.releases).toEqual([]); expect(active.draws).toEqual([]);
  });
});
