import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { CagePracticeFeedback } from '@/components/cage-clash/CagePracticeFeedback';
import { CageClashBoard } from '@/components/cage-clash/CageClashBoard';
import { createCagePractice, stepCagePractice, type CageDrill, type CagePractice } from '@/lib/cagePractice';
import { cageClashScore, createCageFight, stepCageFight, type CageInput } from '@/lib/cageClash';
import { createCageCircuit, stepCageCircuit } from '@/lib/cageCircuit';
import { loadMmaPromotion, newMmaPromotion } from '@/lib/mmaPromotion';
import { recordActivity, recordCompletion } from '@/lib/completions';

const blank: CageInput = { move: 0, guard: false, action: null };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let frames: Map<number, FrameRequestCallback>, frameId: number, now: number;
let hiddenDescriptor: PropertyDescriptor | undefined;
const advance = (ticks: number) => act(() => {
  for (let tick = 0; tick < ticks; tick++) {
    now += 50; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now));
  }
});
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); frames = new Map(); frameId = 0; now = 1000;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = 1073; return array; } });
  vi.stubGlobal('fetch', vi.fn()); vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden'); Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor); else delete (document as unknown as Record<string, unknown>).hidden;
});

function inputFor(state: CagePractice): CageInput {
  const fight = state.fight, player = fight.player;
  if (state.drill === 'striking') {
    if (player.hits >= 3) return blank;
    if (fight.cpu.x - player.x > 8) return { ...blank, move: 1 };
    return player.cooldown === 0 && player.stamina >= 20 ? { ...blank, action: 'power' } : blank;
  }
  if (player.cooldown > 0 || player.stamina < 30) return blank;
  if (state.drill === 'takedown') return { ...blank, action: 'grapple' };
  if (state.drill === 'submission') return { ...blank, action: fight.groundLevel < 2 ? 'grapple' : 'submit' };
  return { ...blank, action: state.recoveredGuard ? 'escape' : 'kick' };
}
function reach(state: CagePractice, predicate: (state: CagePractice) => boolean) {
  let next = state;
  for (let tick = 0; tick < 1200 && !predicate(next) && !next.complete; tick++) next = stepCagePractice(next, inputFor(next));
  expect(predicate(next), `Actual ${state.drill} mechanics reach the requested milestone`).toBe(true);
  return next;
}
function messageState(drill: CageDrill, message: string) {
  for (let seed = 1073; seed < 1105; seed++) {
    let state = createCagePractice(drill, 'balanced', seed);
    for (let tick = 0; tick < 1200 && !state.complete; tick++) {
      state = stepCagePractice(state, inputFor(state));
      if (state.fight.message === message) return state;
    }
  }
  expect.fail(`Actual legal ${drill} inputs never produced ${message}`);
}
function feedback() {
  const root = document.querySelector('[data-cage-practice-feedback]'); expect(root).not.toBeNull();
  const text = (attribute: string) => { const node = root!.querySelector(`[${attribute}]`); expect(node).not.toBeNull(); return node!.textContent; };
  return { root: root!, progress: text('data-cage-practice-progress'), status: text('data-cage-practice-status'), message: text('data-cage-practice-message') };
}
function show(state: CagePractice) { cleanup(); render(<CagePracticeFeedback practice={state} />); return feedback(); }
function complete(value: ReturnType<typeof feedback>, earned: boolean) { expect(value.root.getAttribute('data-cage-feedback-complete')).toBe(String(earned)); }
function click(name: string) { const node = document.querySelector('section[aria-label="Cage Clash game"]'); expect(node).not.toBeNull(); const button = [...node!.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === name || item.textContent === name); expect(button).toBeDefined(); fireEvent.click(button!); }

describe('Cage Practice feedback outcomes', () => {
  it('shows actual three shot progress and requires 90 gas after releasing controls', () => {
    let state = createCagePractice('striking', 'balanced', 1073);
    let view = show(state); expect(view.progress).toBe('Shots 0/3 · Gas 100/100'); expect(view.status).toBe('Get close and land 3 shots.'); complete(view, false);
    state = reach(state, item => item.fight.cpu.x - item.fight.player.x <= 8);
    for (let tick = 0; tick < 20; tick++) state = stepCagePractice(state, blank);
    state = stepCagePractice(state, { ...blank, action: 'power' });
    expect(state.fight.player.hits).toBe(1); expect(state.fight.player.stamina).toBe(86);
    expect(show(state).progress).toBe('Shots 1/3 · Gas 86/100');
    state = reach(state, item => item.fight.player.hits === 3);
    expect(state.complete).toBe(false); expect(state.fight.player.stamina).toBeLessThan(90);
    view = show(state); expect(view.status).toBe('Shots done. Release to reach 90 gas.'); complete(view, false);
    const edge = copy(state); edge.complete = true; edge.fight.player.stamina = 89.9; edge.fight.cpu.stamina = 41;
    view = show(edge); expect(view.progress).toBe('Shots 3/3 · Gas 89/100'); complete(view, false);
    state = reach(state, item => item.complete); expect(state.fight.player.stamina).toBeGreaterThanOrEqual(90);
    view = show(state); expect(view.progress).toBe(`Shots 3/3 · Gas ${Math.floor(state.fight.player.stamina)}/100`); expect(view.status).toBe('Drill complete. Retry or move on.'); complete(view, true);
  });

  it('distinguishes a real clinch and defended attempt from an earned top takedown', () => {
    const start = createCagePractice('takedown', 'balanced', 1073);
    expect(show(start).progress).toBe('Takedowns 0/1 · No top position');
    const clinch = stepCagePractice(start, { ...blank, action: 'grapple' });
    expect(clinch.fight.position).toBe('clinch'); expect(clinch.fight.player.takedowns).toBe(0);
    let view = show(clinch); expect(view.progress).toBe('Takedowns 0/1 · In clinch'); expect(view.status).toBe('Clinch set. Use Takedown.'); complete(view, false);
    complete(show({ ...clinch, complete: true }), false);
    const defended = messageState('takedown', 'Takedown defended.');
    view = show(defended); expect(view.message).toBe('Last: Takedown defended.'); complete(view, false);
    const won = reach(clinch, item => item.complete);
    expect(won.fight.player.takedowns).toBe(1); expect(won.fight.top).toBe('player');
    view = show(won); expect(view.progress).toBe('Takedowns 1/1 · You on top'); complete(view, true);
    const underneath = copy(won); underneath.fight.top = 'cpu'; complete(show(underneath), false);
  });

  it('shows the players actual pressure and only accepts their finished submission', () => {
    const start = createCagePractice('submission', 'grappler', 1073);
    let view = show(start); expect(view.progress).toBe('Your pressure 0% · Guard'); complete(view, false);
    const building = stepCagePractice(start, { ...blank, action: 'submit' });
    expect(building.fight.player.submission).toBe(2.5); expect(show(building).progress).toBe('Your pressure 2% · Guard');
    const asymmetric = copy(building); asymmetric.fight.player.submission = 26.9; asymmetric.fight.cpu.submission = 78.8; asymmetric.fight.groundLevel = 1;
    expect(show(asymmetric).progress).toBe('Your pressure 26% · Half guard');
    asymmetric.fight.player.posture = true; expect(show(asymmetric).status).toBe('Use Lower posture, then hold Submit.');
    const won = reach(start, item => item.complete); expect(won.fight.result?.method).toBe('Submission');
    view = show(won); expect(view.progress).toBe('Your pressure 100% · Mount'); expect(view.status).toBe('Drill complete. Retry or move on.'); complete(view, true);
    for (const [winner, method] of [['player', 'KO'], ['cpu', 'Submission']] as const) {
      const other = copy(won); other.fight.result = { winner, method, score: 50 };
      view = show(other); complete(view, false); expect(view.status).toBe('Attempt ended. Retry this drill.');
    }
    const active = copy(won); active.fight.phase = 'fight'; complete(show(active), false);
  });

  it('requires full earned guard and actual standing rather than half guard or a flag alone', () => {
    let state = createCagePractice('escape', 'balanced', 1073);
    let view = show(state); expect(view.progress).toBe('Guard 0/1 · Back on feet 0/1'); complete(view, false);
    state = reach(state, item => item.fight.groundLevel === 1);
    expect(state.recoveredGuard).toBe(false); view = show(state); expect(view.progress).toBe('Guard 0/1 · Back on feet 0/1'); expect(view.status).toBe('Use Regain guard until full Guard.');
    state = reach(state, item => item.recoveredGuard);
    expect(state.fight.groundLevel).toBe(0); expect(state.fight.position).toBe('ground');
    view = show(state); expect(view.progress).toBe('Guard 1/1 · Back on feet 0/1'); expect(view.status).toBe('Guard earned. Use Stand up.'); complete(view, false);
    const flagOnly = copy(state); flagOnly.complete = true; complete(show(flagOnly), false);
    state = reach(state, item => item.complete); expect(state.fight.position).toBe('standing');
    view = show(state); expect(view.progress).toBe('Guard 1/1 · Back on feet 1/1'); complete(view, true);
    const unearned = copy(state); unearned.recoveredGuard = false;
    view = show(unearned); expect(view.progress).toBe('Guard 0/1 · Back on feet 0/1'); complete(view, false);
  });

  it('renders actual defended and resisted messages without changing input RNG scores or storage', () => {
    const states = [messageState('takedown', 'Takedown defended.'), messageState('submission', 'Guard pass defended.'), messageState('escape', 'Escape resisted. Guard and make space.'), reach(createCagePractice('submission', 'grappler', 1073), state => state.complete)];
    let idle = createCagePractice('takedown', 'balanced', 1073);
    for (let tick = 0; tick < 30; tick++) idle = stepCagePractice(idle, blank);
    expect(show(idle).message).toBe('No attempt yet.');
    localStorage.setItem('dukb-mma-promoter-v1', 'protected promotion'); sessionStorage.setItem('feedback-unrelated', 'keep');
    const storage = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } });
    const writes = vi.spyOn(Storage.prototype, 'setItem'), random = vi.spyOn(Math, 'random');
    for (const state of states) {
      const before = copy(state), score = cageClashScore(state.fight);
      const view = show(state); expect(view.message).toBe(`Last: ${before.fight.message}`); complete(view, before.complete);
      if (before.complete) expect(score).toBeGreaterThan(0);
      const live = view.root.querySelector('[data-cage-practice-status]'); expect(live!.getAttribute('role')).toBe('status'); expect(live!.getAttribute('aria-live')).toBe('polite');
      expect(live!.contains(view.root.querySelector('[data-cage-practice-message]'))).toBe(false);
      expect(state).toEqual(before); expect(cageClashScore(state.fight)).toBe(score);
    }
    expect(random).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled();
    expect(JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })).toBe(storage);
  });

  it('updates feedback through actual mounted practice inputs while Quick and Circuit remain isolated', () => {
    localStorage.setItem('dukb-mma-promoter-v1', JSON.stringify(newMmaPromotion('Protected save', 'protected')));
    const saved = localStorage.getItem('dukb-mma-promoter-v1'), writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<CageClashBoard onHelp={() => undefined} helpOpen={false} />);
    const mode = (value: string) => { const select = document.querySelector('select[aria-label="Mode"]'); expect(select).not.toBeNull(); fireEvent.change(select!, { target: { value } }); };
    expect(document.querySelector('[data-cage-practice-feedback]')).toBeNull(); click('Fight'); advance(3);
    expect(document.querySelector('[data-cage-practice-feedback]')).toBeNull(); click('Pause'); click('Leave fight');
    mode('practice'); click('Start drill'); advance(1);
    expect(feedback().progress).toBe('Shots 0/3 · Gas 100/100'); expect(feedback().message).toBe('No attempt yet.');
    const hud = () => document.querySelector('[data-cage-fighter="player"]')!;
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    for (let tick = 0; tick < 100 && Number(document.querySelector('[data-cage-fighter="cpu"]')!.getAttribute('data-x')) - Number(hud().getAttribute('data-x')) > 8; tick++) advance(1);
    fireEvent.keyUp(document.body, { key: 'ArrowRight' }); advance(20);
    fireEvent.keyDown(document.body, { key: 'k' });
    for (let tick = 0; tick < 100 && Number(hud().getAttribute('data-hits')) < 3; tick++) advance(1);
    fireEvent.keyUp(document.body, { key: 'k' }); advance(1);
    expect(Number(hud().getAttribute('data-hits'))).toBe(3); expect(feedback().status).toBe('Shots done. Release to reach 90 gas.');
    for (let tick = 0; tick < 180 && document.querySelector('[data-cage-practice-feedback]')!.getAttribute('data-cage-feedback-complete') !== 'true'; tick++) advance(1);
    complete(feedback(), true); expect(feedback().status).toBe('Drill complete. Retry or move on.');
    expect(document.querySelector('[aria-label="Cage Clash game"]')!.getAttribute('data-cage-fight-score')).toBe('0');
    click('Retry drill'); expect(feedback().progress).toBe('Shots 0/3 · Gas 100/100'); complete(feedback(), false);
    click('Pause'); click('Leave drill'); mode('circuit'); click('Start circuit'); advance(3);
    expect(document.querySelector('[data-cage-practice-feedback]')).toBeNull(); click('Pause'); click('Leave circuit');
    expect(document.querySelector('[data-cage-practice-feedback]')).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem('dukb-mma-promoter-v1')).toBe(saved);
  });

  it('holds actual practice combat and a strict saved promotion independently of feedback', () => {
    const practice = createCagePractice('submission', 'grappler', 1073), before = copy(practice);
    const next = stepCagePractice(practice, { ...blank, action: 'submit' });
    expect(next.fight.player.submission).toBe(2.5); expect(next.fight.player.stamina).toBe(87.2); expect(next.complete).toBe(false); expect(practice).toEqual(before);
    const quick = createCageFight('balanced', 'striker', 1073), circuit = createCageCircuit('balanced', 1073);
    const circuitNext = stepCageCircuit(circuit, blank);
    expect(circuitNext.stage).toBe(0); expect(circuitNext.results).toEqual([]); expect(circuitNext.fight).toEqual(stepCageFight(circuit.fight, blank));
    expect(stepCageFight(quick, blank).tick).toBe(1); expect(quick.tick).toBe(0);
    const save = newMmaPromotion('Feedback baseline', 'feedback-baseline');
    expect(save.cash).toBe(120000); expect(save.history).toEqual([]); expect(loadMmaPromotion(save)).toEqual(save);
  });
});
