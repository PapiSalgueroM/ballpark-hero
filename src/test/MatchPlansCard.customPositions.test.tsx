import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as E from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { saveMatchPlan, matchPlansOf } from '@/lib/clubManagerMatchPlans';
import { readCustomShape } from '@/lib/clubManagerPositions';
import { saveFence } from '@/lib/saveFence';
import { useClubManager } from '@/hooks/useClubManager';
import { MatchPlansCard } from '@/components/club-manager/MatchPlansCard';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(), recordActivity: vi.fn(), recordStreakDay: vi.fn(),
}));

let current: ReturnType<typeof useClubManager> | null = null;
let saveCalls = 0, applyCalls = 0;
function Harness() {
  const g = useClubManager();
  current = g;
  return g.career && g.phase === 'hub' ? <MatchPlansCard career={g.career} open onToggle={() => {}}
    onSave={(slot, name) => { saveCalls++; return g.saveMatchPlan(slot, name); }}
    onApply={slot => { applyCalls++; return g.applyMatchPlan(slot); }}
    onDelete={g.deleteMatchPlan} /> : <p>{g.phase}</p>;
}
function read() {
  if (!current) throw new Error('The actual hook is not mounted.');
  return current;
}
function career() {
  const value = read().career;
  if (!value) throw new Error('The actual career is not open.');
  return value;
}
function raw() {
  const value = localStorage.getItem(E.SAVE_KEY);
  if (!value) throw new Error('The actual career has not been saved.');
  return value;
}
async function boot(kind: 'ordinary' | 'supported' | 'future') {
  await import('@/lib/clubManagerTactics');
  let state = E.startCareer('Everton');
  if (kind !== 'ordinary') {
    state = saveMatchPlan(state, 0, 'Actual preset');
    expect(matchPlansOf(state).length, 'CM_POSITION_PLAN_REAL_PRESET_FOUNDATION').toBe(1);
    const points = E.FORMATIONS[state.formationIndex].slots.map(slot => ({ x: slot.x, y: slot.y }));
    points[0] = { x: 62, y: 40 };
    state = { ...state, customShape: { v: 1, formationIndex: state.formationIndex, points } };
    if (kind === 'future') (state.customShape as unknown as { v: number }).v = 2;
  }
  saveFence.release(E.SAVE_KEY);
  expect(E.saveCareer(state), 'CM_POSITION_PLAN_ACTUAL_SAVE_FOUNDATION').toBe(true);
  render(<Harness />);
  await waitFor(() => expect(read().phase).toBe('resume'), { timeout: 10000 });
  act(() => read().resume());
  await waitFor(() => expect(read().phase).toBe('hub'), { timeout: 10000 });
  expect(screen.getByRole('region', { name: 'Saved match plans' })).toBeTruthy();
  saveCalls = 0; applyCalls = 0;
}
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); saveFence.release(E.SAVE_KEY);
  current = null; saveCalls = 0; applyCalls = 0;
  let seed = 1458101;
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
});
afterEach(() => {
  vi.restoreAllMocks(); cleanup(); saveFence.release(E.SAVE_KEY);
  localStorage.clear(); sessionStorage.clear(); current = null;
});

describe('Match plan custom-position policy through the actual card, hook and writer', { timeout: 120000 }, () => {
  it('keeps ordinary plan saving available and shows Saved only after the actual hook accepts its write', async () => {
    await boot('ordinary');
    fireEvent.change(screen.getByRole('textbox', { name: 'Plan name' }), { target: { value: 'Actual ordinary' } });
    expect(button('Save setup').disabled, 'CM_POSITION_PLAN_ORDINARY_SAVE_ENABLED').toBe(false);
    fireEvent.click(button('Save setup'));
    expect(saveCalls, 'CM_POSITION_PLAN_ORDINARY_REAL_ACTION').toBe(1);
    expect(matchPlansOf(career()).map(plan => plan.name)).toEqual(['Actual ordinary']);
    expect(JSON.parse(raw()).matchPlans[0].name, 'CM_POSITION_PLAN_ORDINARY_NATIVE_WRITE').toBe('Actual ordinary');
    expect(screen.getByText('Saved Actual ordinary.')).toBeTruthy();
  });

  it('disables a lossy custom-position Save and explains the actual supported plan replacement', async () => {
    await boot('supported');
    const before = career(), oldRaw = raw(), oldPoints = JSON.stringify(before.customShape);
    expect(readCustomShape(before.customShape, before.formationIndex, E.FORMATIONS[before.formationIndex].slots),
      'CM_POSITION_PLAN_SUPPORTED_RAW_FOUNDATION').toBe(before.customShape);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    expect(button('Replace plan').disabled, 'CM_POSITION_PLAN_CUSTOM_SAVE_DISABLED').toBe(true);
    expect(screen.getByText('Match plans use preset positions. Reset your custom positions before saving a plan. Applying a plan clears your custom positions.'),
      'CM_POSITION_PLAN_CUSTOM_SAVE_EXPLAINED').toBeTruthy();
    fireEvent.click(button('Replace plan'));
    expect(saveCalls, 'CM_POSITION_PLAN_DISABLED_SAVE_NO_ACTION').toBe(0);
    expect(writes, 'CM_POSITION_PLAN_DISABLED_SAVE_NO_NATIVE_WRITE').not.toHaveBeenCalled();
    expect(raw()).toBe(oldRaw); expect(JSON.stringify(career().customShape)).toBe(oldPoints);
    expect(button('Apply plan').disabled, 'CM_POSITION_PLAN_SUPPORTED_APPLY_AVAILABLE').toBe(false);
    fireEvent.click(button('Apply plan'));
    expect(applyCalls, 'CM_POSITION_PLAN_SUPPORTED_REAL_APPLY').toBe(1);
    expect(Object.prototype.hasOwnProperty.call(career(), 'customShape'), 'CM_POSITION_PLAN_APPLY_ACTUAL_CLEAR').toBe(false);
    expect(Object.prototype.hasOwnProperty.call(JSON.parse(raw()), 'customShape'), 'CM_POSITION_PLAN_APPLY_NATIVE_CLEAR').toBe(false);
    expect(screen.getByText('Applied Actual preset.')).toBeTruthy();
  });

  it('keeps unsupported saved points untouched and explains why neither Save nor Apply is available', async () => {
    await boot('future');
    const before = career(), oldRaw = raw(), oldBody = JSON.stringify(before);
    expect(readCustomShape(before.customShape, before.formationIndex, E.FORMATIONS[before.formationIndex].slots),
      'CM_POSITION_PLAN_FUTURE_RAW_FOUNDATION').toBeNull();
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    expect(button('Replace plan').disabled, 'CM_POSITION_PLAN_FUTURE_SAVE_DISABLED').toBe(true);
    expect(button('Apply plan').disabled, 'CM_POSITION_PLAN_FUTURE_APPLY_DISABLED').toBe(true);
    expect(screen.getByText('These saved positions are not supported here. Match plans cannot be saved or applied. Your saved data has been kept.'),
      'CM_POSITION_PLAN_FUTURE_RAW_EXPLAINED').toBeTruthy();
    fireEvent.click(button('Replace plan')); fireEvent.click(button('Apply plan'));
    expect(saveCalls).toBe(0); expect(applyCalls).toBe(0);
    expect(writes, 'CM_POSITION_PLAN_FUTURE_ZERO_NATIVE_WRITES').not.toHaveBeenCalled();
    expect(career()).toBe(before); expect(JSON.stringify(career())).toBe(oldBody); expect(raw()).toBe(oldRaw);
    expect(screen.queryByText(/^Saved /), 'CM_POSITION_PLAN_FUTURE_NO_FALSE_SAVED').toBeNull();
  });
});
