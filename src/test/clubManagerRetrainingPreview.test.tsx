import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareerState, CMPlayer } from '@/lib/clubManager';
import type { Position } from '@/types/game';

type Engine = typeof import('@/lib/clubManager');
let draws: number[];
let seed: number;
beforeEach(() => {
  draws = []; seed = 1073001;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = seed / 4294967296; draws.push(value); return value;
  });
  vi.spyOn(Date, 'now').mockReturnValue(1793764800000);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

async function fixture(position: Position, secondaryPositions: Position[] = [], formationIndex = 0, custom = false) {
  const E = await import('@/lib/clubManager');
  const { TrainingScreen } = await import('@/components/club-manager/TrainingScreen');
  const spec = {
    name: 'Preview Borough', stadium: 'Preview Park', budgetTier: 'mid' as const,
    leagueId: E.leagueOf('Everton').id, replacedClub: 'Everton',
    crest: { shape: 0, pattern: 0, color1: '#123456', color2: '#ffffff', initials: 'PB' },
  };
  const made = E.startCareer(spec.name, E.DEFAULT_ERA_ID, spec);
  const source = made.squad.find(p => p.position !== 'GK');
  expect(source, 'CM_RETRAIN_REAL_CUSTOM_PLAYER').toBeTruthy();
  const player: CMPlayer = { ...source!, position, secondaryPositions, retraining: undefined, rating: 80 };
  const career: CareerState = { ...made, formationIndex,
    squad: made.squad.map(p => p.id === player.id ? player : p) };
  const formation = E.FORMATIONS[formationIndex];
  expect(formation.slots, 'CM_RETRAIN_REAL_ELEVEN_SLOTS').toHaveLength(11);
  if (custom) {
    career.customShape = { v: 1, formationIndex,
      points: formation.slots.map((slot, i) => ({ x: i % 2 ? 17 : 83, y: Math.max(6, Math.min(94, slot.y - 9)) })) };
    const { readCustomShape } = await import('@/lib/clubManagerPositions');
    expect(readCustomShape(career.customShape, formationIndex, formation.slots),
      'CM_RETRAIN_REAL_CUSTOM_SHAPE').toBe(career.customShape);
  }
  let next: CareerState | null = null;
  const onRetrain = vi.fn((id: string, to: Position) => { next = E.startRetraining(career, id, to); });
  const onSetPlan = vi.fn(), onStopRetrain = vi.fn();
  const before = JSON.stringify(career), drawCount = draws.length;
  const view = render(<TrainingScreen career={career} onSetPlan={onSetPlan}
    onRetrain={onRetrain} onStopRetrain={onStopRetrain} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Player to retrain' }), { target: { value: player.id } });
  return { E, career, player, formation, before, drawCount, view, onRetrain, onSetPlan, onStopRetrain, next: () => next };
}
function target(f: Awaited<ReturnType<typeof fixture>>, to: Position) {
  const button = f.view.container.querySelector<HTMLButtonElement>('[data-cm-retrain-to="' + to + '"]');
  expect(button, 'CM_RETRAIN_EXISTING_TARGET_BUTTON').not.toBeNull();
  return button!;
}
function observed(button: HTMLElement) {
  return [...button.querySelectorAll<HTMLElement>('[data-cm-fit-slot]')].map(row => ({
    index: Number(row.dataset.cmFitSlot), before: Number(row.dataset.cmFitBefore),
    after: Number(row.dataset.cmFitAfter), text: row.textContent,
  }));
}
function expected(E: Engine, f: Awaited<ReturnType<typeof fixture>>, secondaryPositions: Position[]) {
  const learned = { ...f.player, secondaryPositions };
  return f.formation.slots.flatMap((slot, index) => {
    const before = E.fitPenalty(f.player, slot), after = E.fitPenalty(learned, slot);
    return before === after ? [] : [{ index, before, after }];
  });
}
function held(f: Awaited<ReturnType<typeof fixture>>) {
  expect(JSON.stringify(f.career), 'CM_RETRAIN_INPUT_AND_XI_HELD').toBe(f.before);
  expect(draws.length, 'CM_RETRAIN_PREVIEW_ZERO_EXTRA_DRAWS').toBe(f.drawCount);
  expect(f.onSetPlan).not.toHaveBeenCalled(); expect(f.onStopRetrain).not.toHaveBeenCalled();
}
async function raw(name: string, value: unknown) {
  if (!process.env.CM_RETRAIN_PREVIEW_RAW) return;
  const fs = await import('node:fs'), path = await import('node:path');
  fs.mkdirSync(process.env.CM_RETRAIN_PREVIEW_RAW, { recursive: true });
  fs.writeFileSync(path.join(process.env.CM_RETRAIN_PREVIEW_RAW, name + '.json'), JSON.stringify(value));
}

describe('Club Manager retraining fit preview', () => {
  it('shows the two points restored by learning the other wing before starting', async () => {
    const f = await fixture('LW'), button = target(f, 'RW'), want = [{ index: 8, before: 2, after: 0 }];
    expect(expected(f.E, f, ['RW']), 'CM_RETRAIN_FAMILY_FIXTURE').toEqual(want);
    const rows = observed(button); held(f); expect(f.onRetrain).not.toHaveBeenCalled();
    await raw('family', { want, rows, text: button.textContent });
    expect(rows.map(({ index, before, after }) => ({ index, before, after })),
      'CM_RETRAIN_PREVIEW_FAMILY').toEqual(want);
    expect(button.textContent).toContain('+2 fit');
    expect(button.textContent).toContain('about ' + f.E.retrainWeeks(f.career, f.player, 'RW') + ' weeks');
  });
  it('uses the extended current formation roles when custom coordinates are active', async () => {
    const f = await fixture('CB', [], 11, true), button = target(f, 'CAM');
    const want = [5, 6, 8, 9].map(index => ({ index, before: 6, after: 0 }));
    expect(f.formation.name).toBe('3-4-2-1');
    expect(expected(f.E, f, ['CAM']), 'CM_RETRAIN_CROSS_LINE_FIXTURE').toEqual(want);
    const rows = observed(button); held(f);
    await raw('extended-custom', { formation: f.formation.name, want, rows, text: button.textContent });
    expect(rows.map(({ index, before, after }) => ({ index, before, after })),
      'CM_RETRAIN_PREVIEW_CURRENT_SHAPE').toEqual(want);
    expect(button.textContent).toContain('+6 fit');
    expect(f.onRetrain).not.toHaveBeenCalled();
  });
  it('says when a course adds no fit change because held positions already cover the shape', async () => {
    const f = await fixture('ST', ['CM']), button = target(f, 'CAM');
    expect(expected(f.E, f, ['CM', 'CAM'])).toEqual([]);
    held(f); await raw('no-change', { rows: observed(button), text: button.textContent });
    expect(button.textContent, 'CM_RETRAIN_PREVIEW_NO_CHANGE').toContain('No fit change in this formation');
    expect(button.textContent).not.toContain('+'); expect(f.onRetrain).not.toHaveBeenCalled();
  });
  it('shows the fit lost when the oldest of two learned positions is replaced', async () => {
    const f = await fixture('ST', ['CB', 'CM']), button = target(f, 'LW');
    const want = [...[1, 2, 3, 4].map(index => ({ index, before: 0, after: 6 })),
      { index: 8, before: 6, after: 2 }, { index: 10, before: 6, after: 0 }], rows = observed(button);
    expect(expected(f.E, f, ['CM', 'LW']), 'CM_RETRAIN_REPLACEMENT_FIXTURE').toEqual(want);
    held(f); await raw('replacement', { want, rows, text: button.textContent });
    expect(rows.map(({ index, before, after }) => ({ index, before, after })),
      'CM_RETRAIN_PREVIEW_REPLACEMENT').toEqual(want);
    expect(button.textContent).toContain('Replaces CB');
    expect(button.textContent).toContain('-6 fit');
    expect(f.onRetrain).not.toHaveBeenCalled();
  });
  it('keeps the existing direct callback and real course duration without changing input or draws', async () => {
    const f = await fixture('CB'), button = target(f, 'ST');
    const weeks = f.E.retrainWeeks(f.career, f.player, 'ST');
    fireEvent.click(button); held(f);
    expect(f.onRetrain).toHaveBeenCalledTimes(1); expect(f.onRetrain).toHaveBeenCalledWith(f.player.id, 'ST');
    const next = f.next(); expect(next).not.toBeNull();
    expect(next!.squad.find(p => p.id === f.player.id)?.retraining).toEqual({ to: 'ST', weeksLeft: weeks, weeksTotal: weeks });
    expect(next!.xiIds).toEqual(f.career.xiIds);
    expect(screen.getByRole('combobox', { name: 'Player to retrain' })).toHaveValue('');
    await raw('callback', { calls: f.onRetrain.mock.calls, weeks, nextPlayer: next!.squad.find(p => p.id === f.player.id) });
  });
});
