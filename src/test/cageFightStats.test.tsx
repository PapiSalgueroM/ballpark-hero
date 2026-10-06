import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { CageFightStats } from '@/components/cage-clash/CageFightStats';
import { CageClashBoard } from '@/components/cage-clash/CageClashBoard';
import { createCageFight, stepCageFight, continueCageRound, type CageFight, type CageInput } from '@/lib/cageClash';
import { createCagePractice, stepCagePractice } from '@/lib/cagePractice';
import { newMmaPromotion, loadMmaPromotion } from '@/lib/mmaPromotion';
import { recordActivity, recordCompletion } from '@/lib/completions';

const blank: CageInput = { move: 0, guard: false, action: null };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let frames: Map<number, FrameRequestCallback>, frameId: number, now: number, seed: number;
let hiddenDescriptor: PropertyDescriptor | undefined;
const frame = (elapsed = 16) => {
  now += elapsed;
  const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
};
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); frames = new Map(); frameId = 0; now = 1000; seed = 1900;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = seed; return array; } });
  vi.stubGlobal('fetch', vi.fn());
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
  else delete (document as unknown as Record<string, unknown>).hidden;
});
function matrix() {
  const table = screen.queryByRole('table', { name: 'Fight comparison' }); expect(table).not.toBeNull();
  return within(table!).getAllByRole('row').map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent!.trim()));
}
function fixture() {
  const fight = createCageFight('balanced', 'striker', 1066);
  Object.assign(fight.player, { hits: 13, damageDealt: 34.49, blocked: 5, takedowns: 2, controlTicks: 37 });
  Object.assign(fight.cpu, { hits: 7, damageDealt: 61.51, blocked: 3, takedowns: 1, controlTicks: 84 });
  return fight;
}
function click(name: string) {
  const button = screen.queryByRole('button', { name }); expect(button).not.toBeNull(); fireEvent.click(button!);
}
function combatInput(fight: CageFight): CageInput {
  if (fight.player.stamina < 22) return blank;
  if (fight.position === 'standing') return { ...blank, move: Math.abs(fight.cpu.x - fight.player.x) > 9 ? 1 : 0, action: Math.abs(fight.cpu.x - fight.player.x) <= 10 ? 'jab' : null };
  if (fight.position === 'clinch') return { ...blank, action: 'grapple' };
  return { ...blank, action: fight.top === 'player' ? fight.player.posture ? 'power' : 'kick' : fight.groundLevel > 0 ? 'kick' : 'grapple' };
}
function winningSeed() {
  for (let candidate = 1900; candidate < 1924; candidate++) {
    const won = (['balanced', 'striker', 'grappler'] as const).every((style, stage) => {
      let fight = createCageFight('balanced', style, candidate + stage);
      for (let tick = 0; tick < 2800 && fight.phase !== 'finished'; tick++) fight = fight.phase === 'break' ? continueCageRound(fight) : stepCageFight(fight, combatInput(fight));
      return fight.result?.winner === 'player';
    });
    if (won) return candidate;
  }
  throw new Error('Accepted combat inputs must reach all three circuit wins');
}
function finishUi(start: CageFight, active = false) {
  let expected = start, held = new Set<string>(); act(() => frame());
  const keys = { jab: 'j', power: 'k', kick: 'l', grapple: 'u', submit: 'i', escape: 'o' };
  for (let tick = 0; tick < 2900 && expected.phase !== 'finished'; tick++) {
    if (expected.phase === 'break') {
      expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull();
      for (const key of held) fireEvent.keyUp(document.body, { key }); held = new Set();
      click('Next round'); expected = continueCageRound(expected); act(() => frame());
    }
    const input = active ? combatInput(expected) : blank, wanted = new Set<string>();
    if (input.move === 1) wanted.add('ArrowRight');
    if (input.action) wanted.add(keys[input.action]);
    for (const key of held) if (!wanted.has(key)) fireEvent.keyUp(document.body, { key });
    for (const key of wanted) if (!held.has(key)) fireEvent.keyDown(document.body, { key });
    held = wanted; expected = stepCageFight(expected, input); act(() => frame(50));
  }
  for (const key of held) fireEvent.keyUp(document.body, { key });
  expect(expected.phase).toBe('finished');
  const board = screen.getByRole('region', { name: 'Cage Clash game' });
  expect(board.getAttribute('data-cage-phase')).toBe('finished'); expect(board.getAttribute('data-cage-tick')).toBe(String(expected.tick));
  expect(board.getAttribute('data-cage-winner')).toBe(expected.result?.winner);
  return expected;
}
function inspectResult(fight: CageFight, action: string) {
  expect(screen.queryByRole('table')).toBeNull();
  const priorCalls = vi.mocked(recordCompletion).mock.calls.length;
  const board = screen.getByRole('region', { name: 'Cage Clash game' });
  const prior = ['data-cage-tick', 'data-cage-winner', 'data-cage-fight-score', 'data-cage-circuit-score'].map(key => board.getAttribute(key));
  click('Fight stats'); expect(screen.queryByRole('button', { name: action })).toBeNull();
  expect(matrix()).toEqual([
    ['Stat', 'You', 'CPU'], ['Shots landed', String(fight.player.hits), String(fight.cpu.hits)],
    ['Damage dealt', String(Math.round(fight.player.damageDealt)), String(Math.round(fight.cpu.damageDealt))],
    ['Blocks', String(fight.player.blocked), String(fight.cpu.blocked)], ['Takedowns', String(fight.player.takedowns), String(fight.cpu.takedowns)],
    ['Top control', `${(fight.player.controlTicks / 20).toFixed(1)}s`, `${(fight.cpu.controlTicks / 20).toFixed(1)}s`],
  ]);
  expect(document.activeElement).toBe(screen.queryByRole('button', { name: 'Back' }));
  act(() => { for (let i = 0; i < 8; i++) frame(50); });
  expect(['data-cage-tick', 'data-cage-winner', 'data-cage-fight-score', 'data-cage-circuit-score'].map(key => board.getAttribute(key))).toEqual(prior);
  expect(recordCompletion).toHaveBeenCalledTimes(priorCalls);
  click('Back'); act(() => frame());
  expect(screen.queryByRole('table')).toBeNull(); expect(document.activeElement).toBe(screen.queryByRole('button', { name: 'Fight stats' }));
  expect(screen.queryByRole('button', { name: action })).not.toBeNull(); expect(recordCompletion).toHaveBeenCalledTimes(priorCalls);
}

describe('Cage Fight Stats display', () => {
  it('maps asymmetric literal counters into the correct labelled player and CPU columns', () => {
    const fight = fixture(), prior = copy(fight); render(<CageFightStats fight={fight} onBack={() => {}} />);
    expect(matrix()).toEqual([
      ['Stat', 'You', 'CPU'], ['Shots landed', '13', '7'], ['Damage dealt', '34', '62'],
      ['Blocks', '5', '3'], ['Takedowns', '2', '1'], ['Top control', '1.9s', '4.2s'],
    ]);
    expect(screen.getAllByRole('rowheader').map(cell => cell.textContent)).toEqual(['Shots landed', 'Damage dealt', 'Blocks', 'Takedowns', 'Top control']);
    expect(fight).toEqual(prior);
  });

  it('keeps zero counters visible and rounds damage and top time at literal boundaries', () => {
    const fight = createCageFight('balanced', 'balanced', 1066), view = render(<CageFightStats fight={fight} onBack={() => {}} />);
    expect(matrix().slice(1)).toEqual([
      ['Shots landed', '0', '0'], ['Damage dealt', '0', '0'], ['Blocks', '0', '0'], ['Takedowns', '0', '0'], ['Top control', '0.0s', '0.0s'],
    ]);
    fight.player.damageDealt = .49; fight.cpu.damageDealt = .5; fight.player.controlTicks = 1; fight.cpu.controlTicks = 5;
    view.rerender(<CageFightStats fight={fight} onBack={() => {}} />);
    expect(matrix()[2]).toEqual(['Damage dealt', '0', '1']); expect(matrix()[5]).toEqual(['Top control', '0.1s', '0.3s']);
    fight.player.damageDealt = 10.5; fight.cpu.damageDealt = 10.49;
    view.rerender(<CageFightStats fight={fight} onBack={() => {}} />); expect(matrix()[2]).toEqual(['Damage dealt', '11', '10']);
  });

  it('focuses Back and calls its callback once without editing the supplied fight', () => {
    const fight = fixture(), prior = copy(fight), back = vi.fn(); render(<CageFightStats fight={fight} onBack={back} />);
    expect(document.activeElement).toBe(screen.queryByRole('button', { name: 'Back' })); click('Back');
    expect(back).toHaveBeenCalledTimes(1); expect(fight).toEqual(prior); expect(recordCompletion).not.toHaveBeenCalled();
  });
});

describe('Cage Fight Stats actual board controls', () => {
  it('excludes setup live combat and a completed unscored practice lesson', () => {
    render(<CageClashBoard onHelp={() => {}} helpOpen={false} />);
    expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull(); expect(screen.queryByRole('table')).toBeNull();
    click('Fight'); act(() => { frame(); frame(50); });
    expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull(); expect(screen.queryByRole('table')).toBeNull();
    click('Pause'); click('Leave fight');
    fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), { target: { value: 'practice' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Your style' }), { target: { value: 'grappler' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Practice drill' }), { target: { value: 'submission' } });
    click('Start drill'); let expected = createCagePractice('submission', 'grappler', seed);
    act(() => frame()); fireEvent.keyDown(document.body, { key: 'i' });
    for (let tick = 0; tick < 60 && !expected.complete; tick++) { expected = stepCagePractice(expected, { ...blank, action: 'submit' }); act(() => frame(50)); }
    fireEvent.keyUp(document.body, { key: 'i' }); expect(expected.complete).toBe(true);
    expect(screen.queryByText('Drill complete', { exact: true })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull(); expect(screen.queryByRole('table')).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('opens and closes actual quick results with restored focus and no new writes or awards', () => {
    localStorage.setItem('stats-unrelated', 'keep'); sessionStorage.setItem('stats-unrelated', 'keep');
    const prior = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }), writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<CageClashBoard onHelp={() => {}} helpOpen={false} />); click('Fight');
    const fight = finishUi(createCageFight('balanced', 'balanced', seed));
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(vi.mocked(recordCompletion).mock.calls[0].slice(0, 2)).toEqual(['/cage-clash', fight.result?.score]);
    for (let repeat = 0; repeat < 3; repeat++) inspectResult(fight, 'Rematch');
    expect(writes).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled();
    expect(JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })).toBe(prior);
    click('Rematch'); expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull();
  });

  it('shows each actual circuit fight separately and keeps next opponents and the one final award intact', () => {
    seed = winningSeed(); render(<CageClashBoard onHelp={() => {}} helpOpen={false} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), { target: { value: 'circuit' } }); click('Start circuit');
    const scores: number[] = [];
    for (const [stage, style] of (['balanced', 'striker', 'grappler'] as const).entries()) {
      expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull();
      const fight = finishUi(createCageFight('balanced', style, seed + stage), true); expect(fight.result?.winner).toBe('player'); scores.push(fight.result!.score);
      expect(recordCompletion).toHaveBeenCalledTimes(stage === 2 ? 1 : 0); inspectResult(fight, stage === 2 ? 'New circuit' : 'Next opponent');
      if (stage < 2) click('Next opponent');
    }
    expect(vi.mocked(recordCompletion).mock.calls[0].slice(0, 2)).toEqual(['/cage-clash', Math.round(scores.reduce((sum, value) => sum + value, 0) / 3)]);
    click('New circuit'); expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByRole('button', { name: 'Fight stats' })).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 30000);

  it('preserves the accepted promotion world independently of fight stats controls', () => {
    const state = newMmaPromotion('Stats independent baseline', 'stats-baseline');
    expect(state.cash).toBe(120000); expect(state.event).toBe(1); expect(state.history).toEqual([]); expect(loadMmaPromotion(state)).toEqual(state);
  });
});
