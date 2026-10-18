import { useEffect, useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import CareerRecordsSheet from '@/components/soccer-career/CareerRecordsSheet';
import { FALLBACK_CLUBS, initCareer, type CareerState } from '@/lib/soccerCareerEngine';
import { careerRecordBook } from '@/lib/soccerCareerRecords';
import { hasPendingSaves, holdPendingSave, settlePendingSaves } from '@/lib/safeStorage';

const NOW = Date.parse('2026-10-18T12:00:00Z');
const SAVE = 'career-record-scroll-fixture';
const TITLES = {
  listToDetail: 'opening a long club spell starts the record pane at the top',
  detailToList: 'Back from a scrolled club spell starts club history at the top',
  exits: 'record book Close Escape and unrelated career state stay healthy',
} as const;
type Key = keyof typeof TITLES;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const store = (storage: Storage): Record<string, string> => Object.fromEntries(
  Array.from({ length: storage.length }, (_, index) => storage.key(index)!).sort().map(key => [key, storage.getItem(key)!]),
);

// Fictional saved seasons, not claims about real clubs or a naturally played career.
function fixture(): CareerState {
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(NOW);
  try {
    const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
    const start = initCareer('Records Scroll Fixture', 'England', 'ST', '2020s', stats, 80, 2020, FALLBACK_CLUBS, null, 90);
    return clone({ ...start, phase: 'playing', age: 42, retired: false,
      currentClub: 'Fixture Valley', currentClubCountry: 'England', currentClubTier: 3, currentLeague: 'Fixture League',
      seasons: Array.from({ length: 25 }, (_, index) => ({ ...start.seasons[0], year: 2020 + index, age: 18 + index,
        club: index < 12 ? index % 2 === 0 ? 'Fixture Harbor' : 'Fixture Ridge' : 'Fixture Valley',
        clubCountry: 'England', clubTier: 3, type: 'playing', apps: 30, leagueApps: 26,
        goals: 12, assists: 4, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, ovr: 80 })),
      events: ['Unsaved fictional career change'], pendingEvents: [], pendingOffers: [], pendingSummary: null,
      pendingBallonDor: null } as CareerState);
  } finally { random.mockRestore(); clock.mockRestore(); }
}
type Snapshot = {
  label: string; career: CareerState; local: Record<string, string>; session: Record<string, string>;
  html: string; focus: string; bodyOverflow: string; window: [number, number]; page: [number, number];
  paneId: number | null; paneTop: number | null; paneRows: string[]; panelFocused: boolean;
  parentMounted: boolean; mounts: number; unmounts: number; pendingSave: boolean;
};
type Evidence = {
  title: string; initial: CareerState; latest: CareerState; persistedBefore: CareerState;
  storesBefore: { local: Record<string, string>; session: Record<string, string> };
  book: ReturnType<typeof careerRecordBook>; snapshots: Snapshot[];
  actions: { name: string; before: number | null; after: number | null; samePane: boolean | null }[];
  keyEvents: { key: string; target: string; prevented: boolean; dispatchResult: boolean }[];
  mounts: number; unmounts: number; cleanupUnmounts: number; cleanupStarted: boolean;
  saveAttempts: CareerState[]; saveChecks: { label: string; before: boolean; result: boolean; after: boolean }[];
  draws: number[]; console: string[][]; requests: string[]; pendingAfterCleanup: boolean; outcome: Record<string, unknown>;
};
const rows: Partial<Record<Key, Evidence>> = {};
let active: Evidence, releaseSave: (() => void) | undefined;
let ids: WeakMap<Element, number>, nextId: number, finished = false;
const pane = () => screen.queryByRole('dialog', { name: 'Your career record book' })?.children[1] as HTMLDivElement | undefined;
const panel = () => screen.queryByRole('dialog', { name: 'Your career record book' });
function Parent() {
  const [open, setOpen] = useState(false), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    active.mounts++;
    releaseSave = holdPendingSave(() => { active.saveAttempts.push(clone(active.latest)); return false; });
    return () => { if (active.cleanupStarted) active.cleanupUnmounts++; else active.unmounts++; releaseSave?.(); };
  }, []);
  return <main data-record-scroll-parent><h1>Your fictional career stays open</h1>
    <button ref={trigger} type="button" onClick={() => setOpen(true)}>Open record book</button>
    {open && <CareerRecordsSheet career={active.latest} onClose={() => {
      setOpen(false); trigger.current?.focus({ preventScroll: true });
    }} />}
  </main>;
}
function snap(label: string) {
  const body = pane();
  if (body && !ids.has(body)) ids.set(body, ++nextId);
  const value: Snapshot = { label, career: clone(active.latest), local: store(localStorage), session: store(sessionStorage),
    html: document.body.innerHTML, focus: document.activeElement?.outerHTML ?? '', bodyOverflow: document.body.style.overflow,
    window: [window.scrollX, window.scrollY], page: [document.documentElement.scrollLeft, document.documentElement.scrollTop],
    paneId: body ? ids.get(body)! : null, paneTop: body?.scrollTop ?? null,
    paneRows: body ? Array.from(body.querySelectorAll('[data-record-season]')).map(row => row.getAttribute('data-record-season')!) : [],
    panelFocused: document.activeElement === panel(), parentMounted: !!document.querySelector('[data-record-scroll-parent]'),
    mounts: active.mounts, unmounts: active.unmounts, pendingSave: hasPendingSaves() };
  active.snapshots.push(value); return value;
}
function checkSave(label: string) {
  const before = hasPendingSaves(), result = settlePendingSaves(), after = hasPendingSaves();
  active.saveChecks.push({ label, before, result, after });
}
function click(name: string, element: HTMLElement) {
  const before = pane(), top = before?.scrollTop ?? null;
  fireEvent.click(element); const after = pane();
  active.actions.push({ name, before: top, after: after?.scrollTop ?? null, samePane: before && after ? before === after : null });
  return snap(name);
}
function keyEscape() {
  const target = document.activeElement ?? document.body, event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  let result = true;
  act(() => { result = target.dispatchEvent(event); });
  active.keyEvents.push({ key: 'Escape', target: target.outerHTML, prevented: event.defaultPrevented, dispatchResult: result });
}
function open() { return click('opened', screen.getByRole('button', { name: 'Open record book' })); }
function clubList() { return click('club-list', screen.getByRole('button', { name: 'Club history' })); }
function longDetail() { return click('long-detail', document.querySelector<HTMLElement>('[data-record-stint="12"]')!); }
function finish() {
  if (finished) return;
  if (panel()) click('final-close', screen.getByRole('button', { name: 'Close' }));
  checkSave('finished'); snap('finished'); active.cleanupStarted = true; cleanup();
  active.pendingAfterCleanup = hasPendingSaves(); finished = true;
}
function preserve() {
  expect(active.latest).toEqual(active.initial);
  expect(active.draws).toEqual([]); expect(active.console).toEqual([]); expect(active.requests).toEqual([]);
  expect(active.book.stints.map(stint => stint.rows.length)).toEqual([...Array(12).fill(1), 13]);
  expect(active.book.rows).toHaveLength(25); expect(active.book.totals).toEqual({ apps: 750, goals: 300, assists: 100, cleanSheets: 0 });
  for (const value of active.snapshots) {
    expect(value.career).toEqual(active.initial); expect(value.local).toEqual(active.storesBefore.local); expect(value.session).toEqual(active.storesBefore.session);
    expect([value.parentMounted, value.mounts, value.unmounts, value.pendingSave]).toEqual([true, 1, 0, true]);
    expect(value.window).toEqual([0, 0]); expect(value.page).toEqual([0, 0]);
    expect(value.bodyOverflow).toBe(value.paneId === null ? 'scroll' : 'hidden');
  }
  expect(active.saveAttempts).toEqual([active.initial, active.initial]);
  expect(active.saveChecks).toEqual(['mounted', 'finished'].map(label => ({ label, before: true, result: false, after: true })));
  expect([active.mounts, active.unmounts, active.cleanupUnmounts, active.pendingAfterCleanup]).toEqual([1, 0, 1, false]);
  expect(active.snapshots.at(-1)?.focus).toContain('Open record book');
}
beforeAll(async () => { await act(async () => undefined); });
function load(key: Key) {
  const initial = fixture(), persistedBefore = clone(initial); persistedBefore.events = ['Earlier fictional career save'];
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem(SAVE, JSON.stringify(persistedBefore));
  localStorage.setItem('record-scroll-sentinel', 'local held'); sessionStorage.setItem('record-scroll-sentinel', 'session held');
  document.body.style.overflow = 'scroll'; ids = new WeakMap(); nextId = 0; finished = false;
  active = { title: TITLES[key], initial: clone(initial), latest: initial, persistedBefore,
    storesBefore: { local: store(localStorage), session: store(sessionStorage) }, book: careerRecordBook(initial), snapshots: [], actions: [],
    keyEvents: [], mounts: 0, unmounts: 0, cleanupUnmounts: 0, cleanupStarted: false, saveAttempts: [], saveChecks: [],
    draws: [], console: [], requests: [], pendingAfterCleanup: false, outcome: {} };
  rows[key] = active;
  vi.spyOn(Math, 'random').mockImplementation(() => { active.draws.push(0.99); return 0.99; });
  vi.spyOn(console, 'error').mockImplementation((...args) => { active.console.push(args.map(String)); });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async input => { active.requests.push(String(input)); throw new Error('Unexpected record-book transport'); });
  render(<Parent />); checkSave('mounted'); snap('mounted');
}
afterEach(() => { if (active && !finished) finish(); vi.restoreAllMocks(); document.body.style.overflow = ''; });
afterAll(() => {
  const output = process.env.CAREER_RECORD_SCROLL_RAW;
  if (output) { if (!isAbsolute(output)) throw new Error('CAREER_RECORD_SCROLL_RAW must be absolute'); mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify({ version: 1, caseTitles: Object.values(TITLES), cases: rows }, null, 2) + '\n', { flag: 'wx' }); }
});

describe('Career record book navigation starts at the top', () => {
  it(TITLES.listToDetail, () => {
    load('listToDetail');
    try {
      open(); clubList(); const originalPane = pane()!;
      // jsdom has no layout or clipping. Assign the real pane offset; served browser evidence owns geometry.
      originalPane.scrollTop = 480; snap('assigned-list-offset'); const detail = longDetail();
      active.outcome = { assigned: 480, observed: detail.paneTop, samePane: pane() === originalPane,
        firstYear: detail.paneRows[0], rows: detail.paneRows.length, panelFocused: detail.panelFocused };
    } finally { finish(); }
    preserve();
    expect(active.outcome).toMatchObject({ assigned: 480, samePane: true, firstYear: '2032', rows: 13, panelFocused: true });
    expect(active.outcome.observed === 0, 'RECORDS_SCROLL_LONG_DETAIL_STARTS_AT_TOP').toBe(true);
  });
  it(TITLES.detailToList, () => {
    load('detailToList');
    try {
      open(); clubList(); longDetail(); const originalPane = pane()!;
      originalPane.scrollTop = 640; snap('assigned-detail-offset');
      const list = click('back-to-clubs', screen.getByRole('button', { name: /Back/ }));
      active.outcome = { assigned: 640, observed: list.paneTop, samePane: pane() === originalPane,
        stints: pane()!.querySelectorAll('[data-record-stint]').length, panelFocused: list.panelFocused };
    } finally { finish(); }
    preserve(); expect(active.outcome).toMatchObject({ assigned: 640, samePane: true, stints: 13, panelFocused: true });
    expect(active.outcome.observed === 0, 'RECORDS_SCROLL_BACK_STARTS_AT_TOP').toBe(true);
  });
  it(TITLES.exits, () => {
    load('exits');
    try {
      open(); click('help', screen.getByRole('button', { name: 'Record book help' }));
      expect(screen.getByText(/Example: 12 goals/)).toBeInTheDocument();
      click('personal-bests', screen.getByRole('button', { name: 'Personal bests' }));
      click('best-season', screen.getByRole('button', { name: /Most goals/ }));
      keyEscape(); snap('escape-back'); expect(screen.getByRole('button', { name: 'Club history' })).toBeInTheDocument();
      keyEscape(); const closed = snap('escape-closed'); expect(panel()).toBeNull(); expect(closed.focus).toContain('Open record book');
      open(); clubList(); click('healthy-close', screen.getByRole('button', { name: 'Close' }));
      active.outcome = { closed: panel() === null, openerFocused: document.activeElement === screen.getByRole('button', { name: 'Open record book' }),
        escapePrevented: active.keyEvents.map(event => event.prevented) };
    } finally { finish(); }
    preserve(); expect(active.outcome).toEqual({ closed: true, openerFocused: true, escapePrevented: [true, true] });
  });
});
