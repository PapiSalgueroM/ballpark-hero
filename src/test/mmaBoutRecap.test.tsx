import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MmaBoutRecap from '@/components/fight-promoter/MmaBoutRecap';
import MmaPromotionBoard from '@/components/fight-promoter/MmaPromotionBoard';
import FightPromoterModes from '@/components/fight-promoter/FightPromoterModes';
import { loadMmaPromotion, mmaRankings, newMmaPromotion, runMmaEvent, type MmaBoutResult, type MmaPlan, type MmaPromotion } from '@/lib/mmaPromotion';
import { newPromoter } from '@/lib/fightPromoter';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

const KEY = 'dukb-mma-promoter-v1';
const BOXING_KEY = 'fight-promoter-save-v1';
const emptyPlan: MmaPlan = { venueId: 'club', ticketPrice: 25, bookings: [] };
const literalBout = (): MmaBoutResult => ({
  aId: 'blue-fixture', bId: 'red-fixture', winnerId: 'red-fixture', loserId: 'blue-fixture', division: 'middle',
  title: true, scheduledRounds: 5, method: 'Submission', round: 2, quality: 73,
  rounds: [
    { round: 1, strikesA: 7, strikesB: 19, takedownsA: 1, takedownsB: 3, controlA: 12, controlB: 30, submissionAttemptsA: 2, submissionAttemptsB: 1, pointsA: 10, pointsB: 9 },
    { round: 2, strikesA: 23, strikesB: 5, takedownsA: 4, takedownsB: 0, controlA: 41, controlB: 8, submissionAttemptsA: 0, submissionAttemptsB: 4, pointsA: 8, pointsB: 10 },
  ],
});
const TOTAL = { strikes: [30, 24], takedowns: [5, 3], control: [53, 38], submissionAttempts: [2, 5], points: [18, 19] };
const ROUND1 = { strikes: [7, 19], takedowns: [1, 3], control: [12, 30], submissionAttempts: [2, 1], points: [10, 9] };
const ROUND2 = { strikes: [23, 5], takedowns: [4, 0], control: [41, 8], submissionAttempts: [0, 4], points: [8, 10] };
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); frameId = 0; frames = new Map();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
type View = ReturnType<typeof render>;
function flushFrames() { act(() => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(100)); }); }
function click(name: string) {
  const button = screen.queryByRole('button', { name }); expect(button, `${name} actual action exists`).not.toBeNull(); fireEvent.click(button!);
}
function draw(bout = literalBout(), event = 7) { return render(<MmaBoutRecap bout={bout} aName="Blue fixture" bName="Red fixture" event={event} />); }
function root(view: View) { return view.container.querySelector('[data-mma-recap-bout]'); }
function expectCells(view: View, values: Record<string, number[]>) {
  for (const [stat, sides] of Object.entries(values)) for (const [index, side] of ['a', 'b'].entries()) {
    const cell = view.container.querySelector(`[data-mma-stat="${stat}"][data-mma-side="${side}"]`);
    expect(cell, `${stat} ${side} actual table cell exists`).not.toBeNull();
    expect(cell!.getAttribute('data-value')).toBe(String(sides[index])); expect(cell!.textContent).toBe(`${sides[index]}${stat === 'control' ? ' units' : ''}`);
  }
}
function expectActual(view: View, bout: MmaBoutResult, event: number) {
  expect(root(view)?.getAttribute('data-mma-recap-bout')).toBe(`${event}:${bout.aId}:${bout.bId}`);
  expectCells(view, {
    strikes: [bout.rounds.reduce((n, r) => n + r.strikesA, 0), bout.rounds.reduce((n, r) => n + r.strikesB, 0)],
    takedowns: [bout.rounds.reduce((n, r) => n + r.takedownsA, 0), bout.rounds.reduce((n, r) => n + r.takedownsB, 0)],
    control: [bout.rounds.reduce((n, r) => n + r.controlA, 0), bout.rounds.reduce((n, r) => n + r.controlB, 0)],
    submissionAttempts: [bout.rounds.reduce((n, r) => n + r.submissionAttemptsA, 0), bout.rounds.reduce((n, r) => n + r.submissionAttemptsB, 0)],
    points: [bout.rounds.reduce((n, r) => n + r.pointsA, 0), bout.rounds.reduce((n, r) => n + r.pointsB, 0)],
  });
}
function planFor(state: MmaPromotion, title = true): MmaPlan {
  return { venueId: 'club', ticketPrice: 50, bookings: (['light', 'middle', 'heavy'] as const).map(division => {
    const [a, b] = mmaRankings(state, division).filter(f => f.contract > 0 && f.recoveryUntil <= state.month);
    expect(a && b, 'Earned fixture has two available signed fighters per division').toBeTruthy(); return { aId: a.id, bId: b.id, title };
  }) };
}
function campaign() {
  const initial = newMmaPromotion('Recap promotion', 'recap-parent'); const plan = planFor(initial);
  const first = runMmaEvent(initial, plan)!; expect(first).not.toBeNull();
  const second = runMmaEvent(first.state, planFor(first.state, false))!; expect(second).not.toBeNull();
  expect(loadMmaPromotion(second.state)).toEqual(second.state); return { initial, plan, first, second };
}
function save(state: MmaPromotion, view = 'result', resultIndex: number | null = state.history.length - 1, plan = emptyPlan) {
  localStorage.setItem(KEY, JSON.stringify({ version: 1, state, plan, view, resultIndex }));
}
function mount() { return render(<MemoryRouter><MmaPromotionBoard /></MemoryRouter>); }

describe('MMA bout recap actual outcomes', () => {
  it('shows literal asymmetric totals for each saved side without invented counts or seconds', () => {
    const bout = literalBout(); const before = JSON.stringify(bout); const view = draw(bout);
    expectCells(view, TOTAL); expect(root(view)?.getAttribute('data-mma-recap-round')).toBe('total');
    expect(root(view)!.textContent).toContain('Ground control uses recorded units');
    expect(root(view)!.textContent).not.toMatch(/seconds|\bsecs?\b|strikes thrown|attempted strikes/i);
    expect(JSON.stringify(bout)).toBe(before);
  });
  it('selects only actual played rounds and returns to the independent literal totals', () => {
    const view = draw(); click('Round 1'); expectCells(view, ROUND1); expect(root(view)?.getAttribute('data-mma-recap-round')).toBe('1');
    click('Round 2'); expectCells(view, ROUND2); expect(root(view)?.getAttribute('data-mma-recap-round')).toBe('2');
    expect(screen.queryByRole('button', { name: 'Round 3' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Round 5' })).toBeNull();
    click('All rounds'); expectCells(view, TOTAL);
  });
  it('reports the saved title finish winner and exact event bout identity', () => {
    const view = draw(); expect(root(view)?.getAttribute('data-mma-recap-bout')).toBe('7:blue-fixture:red-fixture');
    const text = root(view)!.textContent!; expect(text).toContain('Red fixture wins'); expect(text).toContain('Submission');
    expect(text).toContain('2/5'); expect(text.toLowerCase()).toContain('title fight');
    expect(screen.queryByRole('columnheader', { name: 'Blue fixture' })).not.toBeNull(); expect(screen.queryByRole('columnheader', { name: 'Red fixture' })).not.toBeNull();
  });
  it('keeps real zeros and the early finishing round without filling scheduled rounds', () => {
    const bout = literalBout(); bout.rounds = [{ round: 1, strikesA: 0, strikesB: 4, takedownsA: 0, takedownsB: 0, controlA: 0, controlB: 6, submissionAttemptsA: 0, submissionAttemptsB: 0, pointsA: 8, pointsB: 10 }];
    bout.round = 1; bout.method = 'KO/TKO'; const before = JSON.stringify(bout); const view = draw(bout, 3);
    expectCells(view, { strikes: [0, 4], takedowns: [0, 0], control: [0, 6], submissionAttempts: [0, 0], points: [8, 10] });
    expect(screen.queryByRole('button', { name: 'Round 2' })).toBeNull(); click('Round 1');
    expect(JSON.stringify(bout)).toBe(before); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('opens each actual freshly run card bout and returns focus without another action or award', () => {
    const { initial, plan, first } = campaign(); save(initial, 'dashboard', null, plan); const view = mount(); click('Book card'); click('Run event');
    expect(JSON.parse(localStorage.getItem(KEY)!).state).toEqual(first.state);
    for (let index = 0; index < 3; index++) {
      const saved = localStorage.getItem(KEY); const writes = vi.spyOn(Storage.prototype, 'setItem');
      const opener = screen.queryByRole('button', { name: `View bout ${index + 1} recap` }); expect(opener).not.toBeNull(); fireEvent.click(opener!);
      expect(view.container.querySelector('[data-mma-screen]')?.getAttribute('data-mma-screen')).toBe('recap'); expectActual(view, first.result.bouts[index], 1);
      click('Round 1'); click('Back to event'); flushFrames(); expect(document.activeElement).toBe(screen.queryByRole('button', { name: `View bout ${index + 1} recap` }));
      expect(view.container.querySelector('[data-mma-receipt]')?.getAttribute('data-mma-receipt')).toBe('1');
      expect(localStorage.getItem(KEY)).toBe(saved); expect(writes).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled(); writes.mockRestore();
    }
  });
  it('keeps the selected historical event context while inspecting its actual saved bouts', () => {
    const { first, second } = campaign(); save(second.state, 'dashboard', null); const view = mount(); click('Event history'); click('View event 1');
    const saved = localStorage.getItem(KEY); const writes = vi.spyOn(Storage.prototype, 'setItem'); click('View bout 2 recap');
    expectActual(view, first.result.bouts[1], 1); click('Back to event'); flushFrames();
    expect(view.container.querySelector('[data-mma-receipt]')?.getAttribute('data-mma-receipt')).toBe('1');
    expect(localStorage.getItem(KEY)).toBe(saved); expect(writes).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
    expect(JSON.parse(saved!).state.actions).toEqual(second.state.actions);
  });
  it('reloads the exact receipt rather than persisting local recap or paying another score', () => {
    const { second } = campaign(); save(second.state); let view = mount(); const saved = localStorage.getItem(KEY);
    const writes = vi.spyOn(Storage.prototype, 'setItem'); click('View bout 3 recap'); click('Round 1'); view.unmount(); view = mount();
    expect(root(view)).toBeNull(); expect(view.container.querySelector('[data-mma-screen]')?.getAttribute('data-mma-screen')).toBe('result');
    expect(view.container.querySelector('[data-mma-receipt]')?.getAttribute('data-mma-receipt')).toBe('2');
    expect(localStorage.getItem(KEY)).toBe(saved); expect(writes).not.toHaveBeenCalled(); expect(recordCompletion).not.toHaveBeenCalled();
  });
  it('retains actual engine replay economics and original boxing save independently', () => {
    const { initial, first, second } = campaign(); expect(loadMmaPromotion(second.state)).toEqual(second.state);
    expect(first.result.cashBefore).toBe(initial.cash); expect(first.result.cashAfter).toBe(initial.cash + first.result.gate - first.result.purses - first.result.rent);
    expect(second.state.actions.filter(action => action.kind === 'event')).toHaveLength(2);
    const old = JSON.stringify({ st: newPromoter('Original boxing', 'recap-baseline') }); localStorage.setItem(BOXING_KEY, old);
    render(<MemoryRouter><FightPromoterModes /></MemoryRouter>); expect(screen.queryByText('Original boxing')).not.toBeNull();
    click('Change sport'); click('MMA'); expect(screen.queryByRole('button', { name: 'Start promotion' })).not.toBeNull();
    expect(localStorage.getItem(BOXING_KEY)).toBe(old); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
