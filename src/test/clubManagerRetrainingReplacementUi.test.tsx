import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import type { Position } from '@/types/game';

type Engine = typeof import('@/lib/clubManager');
type Course = { to: Position; weeksLeft: number; weeksTotal: number; paused?: boolean; replace?: unknown };
type Start = (career: CareerState, id: string, to: Position, paused?: boolean, replace?: Position) => CareerState | null;
let E: Engine, draws: number;
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
beforeEach(async () => {
  draws = 0;
  let seed = 6410001;
  vi.spyOn(Math, 'random').mockImplementation(() => { draws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  vi.spyOn(Date, 'now').mockReturnValue(1793800800000);
  Element.prototype.scrollIntoView = vi.fn();
  E = await import('@/lib/clubManager');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
function raw(name: string, observations: unknown) {
  if (!process.env.CM_REPLACEMENT_UI_RAW) return;
  mkdirSync(process.env.CM_REPLACEMENT_UI_RAW, { recursive: true });
  writeFileSync(join(process.env.CM_REPLACEMENT_UI_RAW, name + '.json'), JSON.stringify({
    case: name, fixture: 'Fictional constructor squad with declared earned RW/CM cover, not real-athlete position data or a natural-career claim.', observations,
  }, null, 2) + '\n');
}
function player(career: CareerState, id: string): CMPlayer {
  const found = career.squad.find(p => p.id === id);
  expect(found, 'SETUP fixture player remains in squad').toBeTruthy(); return found!;
}
function fixture() {
  const c = E.startCareer('Position Choice Borough', E.DEFAULT_ERA_ID, {
    name: 'Position Choice Borough', stadium: 'Position Park', quality: 70, budgetTier: 'mid',
    leagueId: E.leagueOf('Auckland FC').id, replacedClub: 'Auckland FC',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'PC' },
  });
  c.formationIndex = 0;
  c.training = { intensity: 'normal', focus: 'balanced' };
  expect(c.squad.length, 'SETUP constructor has two editable outfielders').toBeGreaterThanOrEqual(11);
  c.squad = c.squad.map((p, i) => ({ ...p, age: 24, position: i < 11 ? E.FORMATIONS[0].slots[i].allowed[0] : p.position,
    secondaryPositions: [], rating: 70, fitness: 100, morale: 68, injuryWeeks: 0, suspendedMatches: 0 }));
  const id = c.squad[8].id, other = c.squad[7].id;
  Object.assign(player(c, id), { position: 'LW', secondaryPositions: ['RW', 'CM'] });
  Object.assign(player(c, other), { position: 'CM', secondaryPositions: ['CDM'] });
  return { c, id, other };
}
async function open(c: CareerState, id: string, handler: (...args: unknown[]) => void) {
  const { TrainingScreen } = await import('@/components/club-manager/TrainingScreen');
  const view = render(<TrainingScreen career={c} onSetPlan={() => { throw new Error('Unexpected plan edit'); }}
    onRetrain={handler} onStopRetrain={() => { throw new Error('Unexpected Stop'); }} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Player to retrain' }), { target: { value: id } });
  const target = view.container.querySelector<HTMLButtonElement>('[data-cm-retrain-to="ST"]');
  expect(target, 'SETUP existing ST action is available').toBeTruthy();
  return { view, target: target! };
}

describe('Club Manager retraining replacement choice UI', () => {
  it('lets the manager keep RW cover and forwards the chosen replacement without editing current positions', async () => {
    const { c, id } = fixture(), before = copy(c), at = draws, calls: unknown[][] = [];
    const { target } = await open(c, id, (...args) => calls.push(args));
    const picker = screen.queryByRole('combobox', { name: 'Position to replace when training finishes' });
    const defaultLoss = target.querySelector('[data-cm-fit-slot="8"]')?.getAttribute('data-cm-fit-after');
    if (picker) fireEvent.change(picker, { target: { value: 'CM' } });
    const selectedLoss = target.querySelector('[data-cm-fit-slot="8"]')?.getAttribute('data-cm-fit-after') ?? null;
    const selectedText = target.textContent;
    fireEvent.click(target);
    raw('choose', { id, picker: !!picker, defaultLoss, selectedLoss, selectedText, calls, before, after: c, extraDraws: draws - at });
    expect(!!picker, 'CM_REPLACE_UI_CHOICE').toBe(true);
    expect(defaultLoss, 'CM_REPLACE_UI_CHOICE').toBe('2');
    expect(selectedLoss, 'CM_REPLACE_UI_CHOICE').toBeNull();
    expect(selectedText, 'CM_REPLACE_UI_CHOICE').toContain('Replaces CM');
    expect(calls, 'CM_REPLACE_UI_CHOICE').toStrictEqual([[id, 'ST', undefined, 'CM']]);
    expect(c, 'CM_REPLACE_UI_CHOICE').toStrictEqual(before);
    expect(draws - at, 'CM_REPLACE_UI_CHOICE').toBe(0);
  });

  it('clears a previous choice when switching players and retains the default two-argument callback', async () => {
    const { c, id, other } = fixture(), before = copy(c), at = draws, calls: unknown[][] = [];
    const { target } = await open(c, id, (...args) => calls.push(args));
    const picker = screen.queryByRole('combobox', { name: 'Position to replace when training finishes' });
    if (picker) fireEvent.change(picker, { target: { value: 'CM' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Player to retrain' }), { target: { value: other } });
    const hiddenForSpareSlot = !screen.queryByRole('combobox', { name: 'Position to replace when training finishes' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Player to retrain' }), { target: { value: id } });
    const reset = screen.queryByRole('combobox', { name: 'Position to replace when training finishes' }) as HTMLSelectElement | null;
    const current = document.querySelector<HTMLButtonElement>('[data-cm-retrain-to="ST"]')!;
    fireEvent.click(current);
    raw('reset', { id, other, picker: !!picker, hiddenForSpareSlot, resetValue: reset?.value, calls, before, after: c, extraDraws: draws - at, oldTargetHeld: target.isConnected });
    expect(!!picker && !!reset, 'CM_REPLACE_UI_RESET').toBe(true);
    expect(hiddenForSpareSlot, 'CM_REPLACE_UI_RESET').toBe(true);
    expect(reset?.value, 'CM_REPLACE_UI_RESET').toBe('');
    expect(calls, 'CM_REPLACE_UI_RESET').toStrictEqual([[id, 'ST']]);
    expect(c, 'CM_REPLACE_UI_RESET').toStrictEqual(before);
    expect(draws - at, 'CM_REPLACE_UI_RESET').toBe(0);
  });

  it('shows the saved completion choice through Pause and Resume, and Stop removes only the course', async () => {
    const { c, id } = fixture(), before = copy(c), at = draws, frames: CareerState[] = [];
    const start: Start = E.startRetraining;
    const pending = start(c, id, 'ST', undefined, 'CM') ?? c;
    const { TrainingScreen } = await import('@/components/club-manager/TrainingScreen');
    function Harness() {
      const [career, setCareer] = useState(pending);
      return <TrainingScreen career={career} onSetPlan={() => { throw new Error('Unexpected plan edit'); }}
        onRetrain={(playerId, to, paused) => {
          const next = start(career, playerId, to, paused);
          if (next) { frames.push(copy(next)); setCareer(next); }
        }} onStopRetrain={playerId => { const next = E.stopRetraining(career, playerId); frames.push(copy(next)); setCareer(next); }} />;
    }
    const { container } = render(<Harness />);
    const label = container.querySelector('[data-cm-retraining]')?.textContent;
    const pause = screen.queryByRole('button', { name: 'Pause retraining for ' + player(c, id).name });
    if (pause) {
      fireEvent.click(pause);
      const resume = screen.queryByRole('button', { name: 'Resume retraining for ' + player(c, id).name });
      if (resume) fireEvent.click(resume);
    }
    const stop = screen.queryByRole('button', { name: 'Stop' });
    if (stop) fireEvent.click(stop);
    raw('pending', { id, label, pending, frames, before, after: c, extraDraws: draws - at });
    expect(label, 'CM_REPLACE_UI_PENDING').toContain('Replaces CM when training finishes');
    expect(frames.length, 'CM_REPLACE_UI_PENDING').toBe(3);
    for (const frame of frames.slice(0, 2)) {
      expect((player(frame, id).retraining as Course).replace, 'CM_REPLACE_UI_PENDING').toBe('CM');
      expect(player(frame, id).secondaryPositions, 'CM_REPLACE_UI_PENDING').toStrictEqual(['RW', 'CM']);
    }
    const stopped = copy(pending); delete player(stopped, id).retraining;
    expect(frames[2], 'CM_REPLACE_UI_PENDING').toStrictEqual(stopped);
    expect(c, 'CM_REPLACE_UI_PENDING').toStrictEqual(before);
    expect(draws - at, 'CM_REPLACE_UI_PENDING').toBe(0);
  });

  it('holds an unavailable saved replacement safely while leaving Stop available', async () => {
    const { c, id } = fixture(), at = draws;
    const { TrainingScreen } = await import('@/components/club-manager/TrainingScreen');
    const rows = [null, 'future-role', { v: 99 }, 'LW', 'ST'].map(value => {
      const input = copy(c);
      (player(input, id) as unknown as { retraining: Course }).retraining = { to: 'ST', weeksLeft: 1, weeksTotal: 9, replace: value };
      const calls: string[] = [];
      const view = render(<TrainingScreen career={input} onSetPlan={() => { throw new Error('Unexpected plan edit'); }}
        onRetrain={() => calls.push('pause')} onStopRetrain={playerId => calls.push(playerId)} />);
      const warning = !!screen.queryByText(/unavailable replacement position/i);
      const toggle = screen.queryByRole('button', { name: /^(Pause|Resume) retraining/ });
      const stop = screen.queryByRole('button', { name: 'Stop' });
      if (stop) fireEvent.click(stop);
      const row = { value, warning, toggle: !!toggle, calls, positions: player(input, id).secondaryPositions };
      view.unmount(); return row;
    });
    raw('unknown', { rows, extraDraws: draws - at });
    for (const row of rows) {
      expect(row.warning, 'CM_REPLACE_UI_UNKNOWN').toBe(true);
      expect(row.toggle, 'CM_REPLACE_UI_UNKNOWN').toBe(false);
      expect(row.calls, 'CM_REPLACE_UI_UNKNOWN').toStrictEqual([id]);
      expect(row.positions, 'CM_REPLACE_UI_UNKNOWN').toStrictEqual(['RW', 'CM']);
    }
    expect(draws - at, 'CM_REPLACE_UI_UNKNOWN').toBe(0);
  });

  it('keeps ordinary target fit and callbacks unchanged without a replacement selection', async () => {
    const { c, id } = fixture(), before = copy(c), at = draws, calls: unknown[][] = [];
    const { target } = await open(c, id, (...args) => calls.push(args));
    const loss = target.querySelector('[data-cm-fit-slot="8"]')?.getAttribute('data-cm-fit-after');
    const text = target.textContent;
    fireEvent.click(target);
    raw('ordinary', { id, loss, text, calls, before, after: c, extraDraws: draws - at });
    expect(loss, 'CM_REPLACE_UI_ORDINARY').toBe('2');
    expect(text, 'CM_REPLACE_UI_ORDINARY').toContain('Replaces RW');
    expect(calls, 'CM_REPLACE_UI_ORDINARY').toStrictEqual([[id, 'ST']]);
    expect(c, 'CM_REPLACE_UI_ORDINARY').toStrictEqual(before);
    expect(draws - at, 'CM_REPLACE_UI_ORDINARY').toBe(0);
  });
});
