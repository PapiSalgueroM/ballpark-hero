import { useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { DRILL_META, buildGloveRun, buildTackleRun, buildWallShotRun, drillSeed, lehmer,
  makeSave, makeTackle, takeWallShot } from '@/lib/careerDrills';
import { dailyRecordKey } from '@/lib/dailyRecord';

const KINDS = [{ position: 'ST', kind: 'wallshot' }, { position: 'CB', kind: 'tackle' },
  { position: 'GK', kind: 'gloves' }] as const;
type Position = typeof KINDS[number]['position'];
type Kind = typeof KINDS[number]['kind'];
type Scenario = 'ready-control' | 'playing-control' | 'prevented' | 'range' | 'ready-body' | 'playing-body';
type Case = { key: string; title: string; position: Position; kind: Kind; scenario: Scenario;
  control?: 'close' | 'back'; keyName: string; expectedFault: boolean };
const CASES: Case[] = [];
for (const { position, kind } of KINDS) for (const control of ['close', 'back'] as const) for (const keyName of ['Enter', ' '] as const) {
  const word = keyName === ' ' ? 'Space' : keyName;
  CASES.push({ key: `ready_${position}_${control}_${word}`, title: `${position} ready ${control} retains native ${word} routing`,
    position, kind, scenario: 'ready-control', control, keyName, expectedFault: true });
}
for (const { position, kind } of KINDS) for (const control of ['close', 'back'] as const) {
  CASES.push({ key: `playing_${position}_${control}_Space`, title: `${position} playing ${control} retains native Space routing`,
    position, kind, scenario: 'playing-control', control, keyName: ' ', expectedFault: true });
}
for (const { position, kind } of KINDS) for (const keyName of ['Enter', ' '] as const) {
  const word = keyName === ' ' ? 'Space' : keyName;
  CASES.push({ key: `prevented_${position}_${word}`, title: `${position} ready ignores prevented ${word} on the board body`,
    position, kind, scenario: 'prevented', keyName, expectedFault: true });
}
for (const keyName of ['ArrowLeft', 'ArrowRight']) CASES.push({ key: `range_ST_${keyName}`,
  title: `ST playing power range retains native ${keyName} routing`, position: 'ST', kind: 'wallshot',
  scenario: 'range', keyName, expectedFault: true });
for (const { position, kind } of KINDS) for (const keyName of ['Enter', ' '] as const) {
  const word = keyName === ' ' ? 'Space' : keyName;
  CASES.push({ key: `ready_body_${position}_${word}`, title: `${position} board body ${word} starts one round`,
    position, kind, scenario: 'ready-body', keyName, expectedFault: false });
}
for (const { position, kind } of KINDS) CASES.push({ key: `playing_body_${position}_Space`,
  title: `${position} playing board body Space settles one round`, position, kind,
  scenario: 'playing-body', keyName: ' ', expectedFault: false });

const NOW = Date.UTC(2026, 9, 18, 12), TODAY = '2026-10-18';
const CAUSE = 'DRILL_KEYBOARD_ROUTING';
const observations: Record<string, Record<string, unknown>> = {};
let draws: number[] = [];
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
function stores() {
  const read = (storage: Storage) => Object.fromEntries(Array.from({ length: storage.length }, (_, index) => storage.key(index)!)
    .sort().map(key => [key, storage.getItem(key)]));
  return { local: read(localStorage), session: read(sessionStorage) };
}
function fixture(position: Position): CareerState {
  const career = { playerName: 'Fixture Drill Player', currentClub: 'Fixture Club', position, overall: 70, potential: 80,
    potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState;
  Object.freeze(career.seasons[0]); Object.freeze(career.seasons); Object.freeze(career.statBoostNextSeason);
  Object.freeze(career.events); return Object.freeze(career);
}
function expectedRecord(kind: Kind) {
  const seed = drillSeed(kind, TODAY);
  if (kind === 'wallshot') {
    const result = takeWallShot({ x: 0, y: 0.8, power: 0.65, press: 0.1 }, buildWallShotRun(seed)[0], lehmer(seed ^ 0x5eed1234));
    return { score: result.points, count: result.won ? 1 : 0, banked: false, rounds: 1, v: 1, date: TODAY };
  }
  if (kind === 'tackle') {
    const result = makeTackle({ x: 0.5, y: 0.5, press: 0.1 }, buildTackleRun(seed)[0]);
    return { score: result.points, count: result.won ? 1 : 0, banked: false, rounds: 1, v: 1, date: TODAY };
  }
  const result = makeSave({ dx: 0, dy: 0, release: 0.1 }, buildGloveRun(seed)[0]);
  return { score: result.points, count: result.saved ? 1 : 0, banked: false, rounds: 1, v: 1, date: TODAY };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(NOW);
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('fixture-drill-local', 'unchanged'); sessionStorage.setItem('fixture-drill-session', 'unchanged');
  draws = []; vi.spyOn(Math, 'random').mockImplementation(() => { draws.push(0.4); return 0.4; });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
afterAll(() => {
  const output = process.env.DRILL_KEYBOARD_RAW;
  if (!output) return;
  if (!isAbsolute(output)) throw new Error('DRILL_KEYBOARD_RAW must be absolute');
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ version: 1, caseTitles: CASES.map(entry => entry.title), cases: observations }, null, 2) + '\n', { flag: 'wx' });
});

describe('native keyboard routing around the actual career position drill', () => {
  for (const entry of CASES) it(entry.title, () => {
    const career = fixture(entry.position), inputJSON = JSON.stringify(career), storesBefore = stores();
    const callbacks: { type: string; args: unknown[] }[] = [];
    function Parent() {
      const [open, setOpen] = useState(true);
      return <><output data-testid="fixture-drill-career">{JSON.stringify(career)}</output>
        <output data-testid="fixture-training-open">{String(open)}</output>
        {open && <TrainingPanel career={career} available
          onComplete={(...args) => { callbacks.push({ type: 'complete', args }); }}
          onDrill={(...args) => { callbacks.push({ type: 'bank', args }); }}
          onClose={() => { callbacks.push({ type: 'close', args: [] }); setOpen(false); }} />}</>;
    }
    const view = render(<Parent />), meta = DRILL_META[entry.kind];
    let unmounted = false;
    const board = () => view.container.querySelector<SVGSVGElement>(`[data-drill-board="${entry.kind}"]`)!;
    const panel = () => view.getByRole('dialog', { name: 'Training ground' });
    const snapshot = () => ({ html: view.container.innerHTML, bodyHTML: document.body.innerHTML,
      careerJSON: view.getByTestId('fixture-drill-career').textContent,
      parentOpen: view.getByTestId('fixture-training-open').textContent,
      focused: document.activeElement instanceof Element ? document.activeElement.outerHTML : null,
      phase: board()?.getAttribute('data-drill-phase') ?? null, boardHTML: board()?.outerHTML ?? null,
      boardTime: board()?.getAttribute('data-drill-time') ?? null,
      controls: Array.from(panel().querySelectorAll('button, input')).map(control => ({ tag: control.tagName,
        text: control.textContent, label: control.getAttribute('aria-label'), type: control.getAttribute('type'),
        value: control instanceof HTMLInputElement ? control.value : null, disabled: (control as HTMLButtonElement).disabled })),
      stores: stores(), callbacks: clone(callbacks), date: Date.now(), performance: performance.now() });
    const row: Record<string, unknown> = { ...entry, inputJSON, storesBefore, callbacks,
      fixture: { overall: 70, potential: 80, trainingSeasonYear: 2025 }, clockSteps: [] };
    observations[entry.key] = row;
    let expectedStores = storesBefore;
    try {
      const tile = Array.from(panel().querySelectorAll<HTMLButtonElement>('button')).find(button =>
        button.textContent?.includes(meta.name) && button.textContent.includes(`Your ${entry.position} drill.`));
      expect(tile).toBeTruthy(); fireEvent.click(tile!);
      fireEvent.click(view.getByRole('button', { name: "Today's ten" }));
      expect(board()).toHaveAttribute('data-drill-phase', 'ready');
      expect(view.getByText('Round 1/10')).toBeVisible();
      if (entry.scenario === 'playing-control' || entry.scenario === 'playing-body' || entry.scenario === 'range') {
        fireEvent.click(view.getByRole('button', { name: 'Start' })); advance(100);
        (row.clockSteps as unknown[]).push({ label: 'playing-100ms', date: Date.now(), performance: performance.now() });
        expect(board()).toHaveAttribute('data-drill-phase', 'playing');
      }
      let target: HTMLElement = document.body;
      if (entry.control === 'close') target = view.getByRole('button', { name: 'Close' });
      else if (entry.control === 'back') target = view.getByRole('button', { name: `‹ ${meta.name}` });
      else if (entry.scenario === 'range') target = view.getByRole('slider', { name: 'How hard to hit it' });
      if (target !== document.body) target.focus();
      row.before = snapshot();
      const event = new KeyboardEvent('keydown', { key: entry.keyName, code: entry.keyName === ' ' ? 'Space' : entry.keyName,
        bubbles: true, cancelable: true, repeat: false });
      if (entry.scenario === 'prevented') event.preventDefault();
      const beforePrevented = event.defaultPrevented;
      let dispatchReturned = true;
      act(() => { dispatchReturned = target.dispatchEvent(event); });
      row.event = { key: event.key, code: event.code, repeat: event.repeat, cancelable: event.cancelable,
        bubbles: event.bubbles, beforePrevented, afterPrevented: event.defaultPrevented, dispatchReturned,
        targetTag: target.tagName, targetHTML: target.outerHTML, syntheticNativeClick: false };
      const after = snapshot(); row.after = after;
      let routingCorrect: boolean;
      if (entry.scenario === 'ready-body') {
        routingCorrect = event.defaultPrevented && after.phase === 'playing';
      } else if (entry.scenario === 'playing-body') {
        routingCorrect = event.defaultPrevented && after.phase === 'flying';
        advance(900);
        (row.clockSteps as unknown[]).push({ label: 'flight-900ms', date: Date.now(), performance: performance.now() });
        expect(board()).toHaveAttribute('data-drill-phase', 'roundEnd');
        expect(view.getByRole('button', { name: 'Next' })).toBeVisible();
        const record = expectedRecord(entry.kind), key = dailyRecordKey(meta.slug, TODAY);
        const actualRecord = JSON.parse(localStorage.getItem(key)!);
        expect(actualRecord).toEqual(record);
        expect(view.getByText(`${record.score} pts`)).toBeVisible();
        expect(view.getByText(`${record.count} ${meta.verb}`)).toBeVisible();
        row.dailyRecord = { key, raw: localStorage.getItem(key), expected: record };
        expectedStores = { local: { ...storesBefore.local, [key]: JSON.stringify(record) }, session: storesBefore.session };
        row.settled = snapshot();
      } else {
        const before = row.before as ReturnType<typeof snapshot>;
        routingCorrect = event.defaultPrevented === (entry.scenario === 'prevented')
          && after.phase === before.phase && after.boardHTML === before.boardHTML;
      }
      expect(JSON.stringify(career)).toBe(inputJSON); expect(Object.isFrozen(career)).toBe(true);
      expect(view.getByTestId('fixture-drill-career').textContent).toBe(inputJSON);
      expect(view.getByTestId('fixture-training-open')).toHaveTextContent('true');
      expect(callbacks).toEqual([]); expect(draws).toEqual([]); expect(stores()).toEqual(expectedStores);
      row.inputAfterJSON = JSON.stringify(career); row.storesAfter = stores(); row.draws = [...draws];
      row.expectedStores = expectedStores; row.routingCorrect = routingCorrect;
      view.unmount(); unmounted = true; advance(1000);
      (row.clockSteps as unknown[]).push({ label: 'unmounted-1000ms', date: Date.now(), performance: performance.now() });
      row.cleanup = { html: view.container.innerHTML, stores: stores(), callbacks: clone(callbacks),
        inputJSON: JSON.stringify(career), draws: [...draws] };
      expect(view.container.innerHTML).toBe(''); expect(callbacks).toEqual([]);
      expect(stores()).toEqual(expectedStores); expect(JSON.stringify(career)).toBe(inputJSON); expect(draws).toEqual([]);
      expect(routingCorrect, CAUSE).toBe(true);
    } finally {
      row.inputAfterJSON = JSON.stringify(career); row.storesAfter = stores(); row.draws = [...draws];
      if (!unmounted) view.unmount();
    }
  });
});
