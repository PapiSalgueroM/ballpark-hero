import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { useCageClash } from '@/hooks/useCageClash';
import { CAGE_ROUND_TICKS, cageClashScore, continueCageRound, createCageFight, stepCageFight, type CageAction, type CageInput, type CageStyle } from '@/lib/cageClash';
import { CAGE_DRILLS, canCagePracticeAction, createCagePractice, nextCageDrill, stepCagePractice, type CageDrill, type CagePractice } from '@/lib/cagePractice';
import { newMmaPromotion, loadMmaPromotion } from '@/lib/mmaPromotion';
import { recordActivity, recordCompletion } from '@/lib/completions';

const blank: CageInput = { move: 0, guard: false, action: null };
const styles: CageStyle[] = ['balanced', 'striker', 'grappler'];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let frames: Map<number, FrameRequestCallback>, frameId: number, now: number;
let hiddenDescriptor: PropertyDescriptor | undefined;
const frame = (elapsed = 16) => {
  now += elapsed;
  const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
};
const advance = (ms: number) => act(() => { for (let t = 0; t < ms; t += 16) frame(); });
const hide = (value: boolean) => { Object.defineProperty(document, 'hidden', { configurable: true, value }); fireEvent(document, new Event('visibilitychange')); };

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); frames = new Map(); frameId = 0; now = 1000;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = 1064; return array; } });
  vi.stubGlobal('fetch', vi.fn());
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
  else delete (document as unknown as Record<string, unknown>).hidden;
});

function lessonInput(state: CagePractice): CageInput {
  const fight = state.fight, player = fight.player;
  if (state.drill === 'striking') {
    if (player.hits >= 3) return blank;
    if (Math.abs(fight.cpu.x - player.x) > 8) return { ...blank, move: 1 };
    return player.cooldown === 0 && player.stamina >= 20 ? { ...blank, action: 'power' } : blank;
  }
  if (player.cooldown > 0 || player.stamina < 30) return blank;
  if (state.drill === 'takedown') return { ...blank, action: 'grapple' };
  if (state.drill === 'submission') return { ...blank, action: fight.groundLevel < 2 ? 'grapple' : 'submit' };
  return { ...blank, action: state.recoveredGuard ? 'escape' : 'kick' };
}
function earn(state: CagePractice) {
  let next = state;
  for (let tick = 0; tick < 1200 && !next.complete && next.fight.phase === 'fight'; tick++) next = stepCagePractice(next, lessonInput(next));
  expect(next.complete, `${state.drill}/${state.fight.player.style}/${state.fight.seed} is earned with legal inputs`).toBe(true);
  return next;
}
function inRange() {
  let state = createCagePractice('striking', 'balanced', 1064);
  for (let i = 0; i < 60 && state.fight.cpu.x - state.fight.player.x > 8; i++) state = stepCagePractice(state, { ...blank, move: 1 });
  for (let i = 0; i < 20; i++) state = stepCagePractice(state, blank);
  expect(state.fight.cpu.x - state.fight.player.x).toBeLessThanOrEqual(8);
  expect(state.fight.player.stamina).toBe(100);
  return state;
}
function mounted(drill: CageDrill = 'striking') {
  const hook = renderHook(({ help }) => useCageClash(help), { initialProps: { help: false } });
  act(() => hook.result.current.startPractice(drill, 'grappler'));
  return hook;
}
type Mounted = ReturnType<typeof mounted>;
const fightOf = (hook: Mounted) => hook.result.current.fightRef.current!;
const actionKeys: Record<CageAction, string> = { jab: 'j', power: 'k', kick: 'l', grapple: 'u', submit: 'i', escape: 'o' };
function earnMounted(hook: Mounted) {
  let held = new Set<string>();
  for (let window = 0; window < 650 && !hook.result.current.practice?.complete && fightOf(hook).phase === 'fight'; window++) {
    const lesson = { ...hook.result.current.practice!, fight: fightOf(hook) };
    const input = lessonInput(lesson), wanted = new Set<string>();
    if (input.move === 1) wanted.add('ArrowRight');
    if (input.action) wanted.add(actionKeys[input.action]);
    for (const key of held) if (!wanted.has(key)) fireEvent.keyUp(document.body, { key });
    for (const key of wanted) if (!held.has(key)) fireEvent.keyDown(document.body, { key });
    held = wanted; advance(100);
  }
  for (const key of held) fireEvent.keyUp(document.body, { key });
  expect(hook.result.current.practice?.complete, 'Actual mounted keyboard inputs earn the lesson').toBe(true);
}

describe('Cage Practice earned outcomes', () => {
  it('keeps every normal seeded quick fight identical to the accepted release', () => {
    const source = execFileSync('git', ['show', '2b7dda2951fb9b63e76a2af66970cb682f312105:src/lib/cageClash.ts'], { encoding: 'utf8', windowsHide: true });
    const compiled = execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').transformSync(require('node:fs').readFileSync(0, 'utf8'), { loader: 'ts', format: 'cjs', target: 'es2020' }).code)"], { input: source, encoding: 'utf8', windowsHide: true, timeout: 10000 });
    const referenceModule = { exports: {} as typeof import('@/lib/cageClash') };
    new Function('module', 'exports', compiled)(referenceModule, referenceModule.exports);
    const accepted = referenceModule.exports;
    let checked = 0;
    for (const [index, style] of styles.entries()) for (const seed of [1064, 2064]) for (const active of [false, true]) {
      let expected = accepted.createCageFight(style, styles[(index + 1) % 3], seed);
      let actual = createCageFight(style, styles[(index + 1) % 3], seed);
      expect(actual).toEqual(expected);
      const before = createHash('sha256'), after = createHash('sha256');
      for (let tick = 0; tick < 2800 && expected.phase !== 'finished'; tick++) {
        if (expected.phase === 'break') { expected = accepted.continueCageRound(expected); actual = continueCageRound(actual); }
        else {
          const input = active ? lessonInput({ drill: expected.position === 'ground' ? 'submission' : 'takedown', fight: expected, complete: false, recoveredGuard: false }) : blank;
          expected = accepted.stepCageFight(expected, input);
          actual = tick % 2 ? stepCageFight(actual, input) : stepCageFight(actual, input, undefined);
        }
        before.update(JSON.stringify(expected)); after.update(JSON.stringify(actual));
      }
      expect(expected.phase).toBe('finished'); expect(actual).toEqual(expected);
      expect(after.digest('hex')).toBe(before.digest('hex')); checked++;
    }
    expect(checked).toBe(12);
  }, 30000);

  it('uses the fight range stamina and cooldown rules with an explicit passive partner', () => {
    const far = createCagePractice('striking', 'balanced', 1064), prior = copy(far);
    const missed = stepCagePractice(far, { ...blank, action: 'jab' });
    expect(missed.fight.player.hits).toBe(0); expect(missed.fight.cpu.health).toBe(100); expect(missed.fight.player.stamina).toBe(93);
    expect(far).toEqual(prior);
    let state = inRange();
    const input: CageInput = { ...blank, action: 'jab' };
    const normalRules = stepCageFight({ ...state.fight, remainingTicks: CAGE_ROUND_TICKS }, input, blank);
    state = stepCagePractice(state, input); expect(state.fight).toEqual(normalRules);
    expect(state.fight.player.cooldown).toBe(10); expect(state.fight.player.stamina).toBe(93);
    for (let i = 0; i < 9; i++) state = stepCagePractice(state, input);
    expect(state.fight.player.hits).toBe(1);
    state = stepCagePractice(state, input); expect(state.fight.player.hits).toBe(2); expect(state.fight.player.stamina).toBeCloseTo(88.5, 8);
  });

  it('stays untimed and passive without earning any idle lesson', () => {
    expect(CAGE_DRILLS.map(item => item.id)).toEqual(['striking', 'takedown', 'submission', 'escape']);
    for (const { id } of CAGE_DRILLS) {
      const original = createCagePractice(id, 'balanced', 1064), prior = copy(original);
      let state = original;
      for (let tick = 0; tick < 1200; tick++) state = stepCagePractice(state, blank);
      expect(state.complete).toBe(false); expect(state.recoveredGuard).toBe(false);
      expect(state.fight.phase).toBe('fight'); expect(state.fight.round).toBe(1); expect(state.fight.roundCards).toEqual([]); expect(state.fight.remainingTicks).toBe(899);
      expect(state.fight.player.health).toBe(100); expect(state.fight.cpu.health).toBe(100); expect(state.fight.cpu.hits).toBe(0); expect(state.fight.cpu.takedowns).toBe(0);
      expect(original).toEqual(prior);
      let replay = createCagePractice(id, 'balanced', 1064);
      for (let tick = 0; tick < 1200; tick++) replay = stepCagePractice(replay, blank);
      expect(state).toEqual(replay);
    }
  });

  it('filters irrelevant keyboard actions through the lesson engine', () => {
    const wrong: Record<CageDrill, CageAction[]> = { striking: ['grapple', 'submit', 'escape'], takedown: ['jab', 'power', 'kick', 'submit', 'escape'], submission: ['jab', 'power', 'escape'], escape: ['jab', 'power', 'grapple', 'submit', 'escape'] };
    for (const { id } of CAGE_DRILLS) for (const action of wrong[id]) {
      const state = createCagePractice(id, 'balanced', 1064);
      expect(canCagePracticeAction(state, action)).toBe(false);
      expect(stepCagePractice(state, { ...blank, action })).toEqual(stepCagePractice(state, blank));
    }
  });

  it('earns three strikes then gates attacks while release recovers actual gas', () => {
    let state = inRange();
    for (let tick = 0; tick < 100 && state.fight.player.hits < 3; tick++) state = stepCagePractice(state, { ...blank, action: 'power' });
    expect(state.fight.player.hits).toBe(3); expect(state.fight.player.stamina).toBeLessThan(90); expect(state.complete).toBe(false);
    expect(state.fight.cpu.health).toBeGreaterThan(0); expect(canCagePracticeAction(state, 'power')).toBe(false);
    const tired = state.fight.player.stamina;
    for (let tick = 0; tick < 20; tick++) state = stepCagePractice(state, { ...blank, guard: true });
    expect(state.complete).toBe(false); expect(state.fight.player.stamina).toBeLessThan(tired);
    for (let tick = 0; tick < 180 && !state.complete; tick++) state = stepCagePractice(state, { ...blank, action: 'power' });
    expect(state.complete).toBe(true); expect(state.fight.player.stamina).toBeGreaterThanOrEqual(90); expect(state.fight.player.hits).toBe(3);
    expect(state.fight.cpu.health).toBeGreaterThan(0); expect(state.fight.phase).toBe('fight');
  });

  it('earns takedown lessons only through a clinch and an actual top position', () => {
    for (const style of styles) for (let seed = 1064; seed < 1072; seed++) {
      const start = createCagePractice('takedown', style, seed), clinch = stepCagePractice(start, { ...blank, action: 'grapple' });
      expect(clinch.fight.position).toBe('clinch'); expect(clinch.fight.player.takedowns).toBe(0); expect(clinch.complete).toBe(false);
      const won = earn(clinch);
      expect(won.fight.position).toBe('ground'); expect(won.fight.top).toBe('player'); expect(won.fight.player.takedowns).toBe(1);
      expect(won.fight.player.controlTicks).toBeGreaterThan(0); expect(won.fight.cpu.takedowns).toBe(0);
    }
  });

  it('earns submission lessons with real positional work and full finishing pressure', () => {
    for (const style of styles) for (let seed = 1064; seed < 1072; seed++) {
      let state = createCagePractice('submission', style, seed);
      expect(state.fight.position).toBe('ground'); expect(state.fight.top).toBe('player'); expect(state.fight.groundLevel).toBe(0);
      const held = stepCagePractice(state, { ...blank, action: 'submit' });
      expect(held.complete).toBe(false); expect(held.fight.player.submission).toBeGreaterThan(0); expect(held.fight.player.stamina).toBeCloseTo(87.2, 8);
      expect(stepCagePractice(held, blank).fight.player.submission).toBeLessThan(held.fight.player.submission);
      state = earn(state);
      expect(state.fight.groundLevel).toBe(2); expect(state.fight.player.submission).toBe(100);
      expect(state.fight.result?.winner).toBe('player'); expect(state.fight.result?.method).toBe('Submission'); expect(state.fight.phase).toBe('finished');
    }
  });

  it('earns escape lessons by recovering guard before actually returning to the feet', () => {
    for (const style of styles) for (let seed = 1064; seed < 1072; seed++) {
      let state = createCagePractice('escape', style, seed);
      expect(state.fight.position).toBe('ground'); expect(state.fight.top).toBe('cpu'); expect(state.fight.groundLevel).toBe(2);
      for (let tick = 0; tick < 40; tick++) state = stepCagePractice(state, { ...blank, action: tick % 2 ? 'grapple' : 'escape' });
      expect(state.fight.position).toBe('ground'); expect(state.fight.groundLevel).toBe(2); expect(state.recoveredGuard).toBe(false);
      for (let tick = 0; tick < 1200 && !state.complete; tick++) {
        const previous = state; state = stepCagePractice(state, lessonInput(state));
        if (!previous.recoveredGuard && state.recoveredGuard) { expect(state.fight.position).toBe('ground'); expect(state.fight.groundLevel).toBe(0); }
        if (state.fight.groundLevel > 0) expect(state.recoveredGuard).toBe(false);
      }
      expect(state.complete).toBe(true); expect(state.recoveredGuard).toBe(true); expect(state.fight.position).toBe('standing'); expect(state.fight.top).toBeNull();
      expect(state.fight.player.takedowns).toBe(0); expect(state.fight.player.hits).toBe(0); expect(state.fight.cpu.hits).toBe(0);
    }
  });

  it('freezes an earned lesson even when its underlying fight is still active', () => {
    for (const { id } of CAGE_DRILLS) {
      const won = earn(createCagePractice(id, 'balanced', 1064)), prior = copy(won);
      expect(canCagePracticeAction(won, 'jab')).toBe(false);
      for (let tick = 0; tick < 50; tick++) expect(stepCagePractice(won, { move: 1, guard: true, action: 'power' })).toBe(won);
      expect(won).toEqual(prior);
    }
  });
});

describe('Cage Practice mounted lifecycle', () => {
  it('never records saves network activity or points for an actual practice submission', () => {
    localStorage.setItem('dukb-mma-promoter-v1', 'preserve other mode'); sessionStorage.setItem('practice-unrelated', 'keep');
    const before = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } });
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const hook = mounted('submission'); earnMounted(hook);
    expect(fightOf(hook).result?.method).toBe('Submission'); expect(cageClashScore(fightOf(hook))).toBeGreaterThan(0);
    expect(hook.result.current.finalScore).toBe(0); expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })).toBe(before);
    const ended = copy(fightOf(hook));
    act(() => { hook.result.current.tap('submit'); hook.result.current.nextRound(); hook.result.current.resume(); }); advance(1000);
    expect(fightOf(hook)).toEqual(ended); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => hook.result.current.start('grappler', 'balanced'));
    expect(hook.result.current.practice).toBeNull();
    for (let window = 0; window < 290 && fightOf(hook).phase !== 'finished'; window++) {
      if (fightOf(hook).phase === 'break') act(() => hook.result.current.nextRound());
      advance(500);
    }
    expect(fightOf(hook).phase).toBe('finished'); expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordCompletion).mock.calls[0].slice(0, 2)).toEqual(['/cage-clash', cageClashScore(fightOf(hook))]);
    advance(500); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('advances the four drills only after mounted controls earn their objectives', () => {
    const hook = mounted();
    act(() => hook.result.current.nextDrill()); expect(hook.result.current.practice?.drill).toBe('striking');
    for (const { id } of CAGE_DRILLS) {
      expect(hook.result.current.practice?.drill).toBe(id); earnMounted(hook);
      const ended = copy(fightOf(hook)); advance(500); expect(fightOf(hook)).toEqual(ended);
      const next = nextCageDrill(id); act(() => hook.result.current.nextDrill());
      expect(hook.result.current.practice?.drill).toBe(next ?? id);
      if (next) { expect(hook.result.current.practice?.complete).toBe(false); expect(fightOf(hook).tick).toBe(0); expect(fightOf(hook).player.style).toBe('grappler'); }
    }
    expect(nextCageDrill('escape')).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('releases practice controls and pauses help and hidden tabs without replaying input', () => {
    const hook = mounted(), start = fightOf(hook).player.x;
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' }); advance(320); expect(fightOf(hook).player.x).toBeLessThan(start);
    fireEvent.keyUp(document.body, { key: 'ArrowLeft' }); const released = fightOf(hook).player.x; advance(160); expect(fightOf(hook).player.x).toBe(released);
    act(() => hook.result.current.press('pointer:7', 'right')); advance(160);
    const cancel = new Event('pointercancel'); Object.defineProperty(cancel, 'pointerId', { value: 7 }); fireEvent(window, cancel);
    const cancelled = fightOf(hook).player.x; advance(160); expect(fightOf(hook).player.x).toBe(cancelled);
    fireEvent.keyDown(document.body, { key: 'ArrowRight' }); hook.rerender({ help: true });
    const helped = copy(fightOf(hook)); advance(320); expect(hook.result.current.paused).toBe(true); expect(fightOf(hook)).toEqual(helped);
    hook.rerender({ help: false }); advance(160); expect(fightOf(hook)).toEqual(helped);
    act(() => hook.result.current.resume()); advance(160); expect(fightOf(hook).player.x).toBe(helped.player.x); expect(fightOf(hook).tick).toBeGreaterThan(helped.tick);
    hide(true); const hidden = copy(fightOf(hook)); advance(500); expect(fightOf(hook)).toEqual(hidden); expect(hook.result.current.paused).toBe(true);
    hide(false); act(() => hook.result.current.resume()); advance(160); expect(fightOf(hook).tick).toBeGreaterThan(hidden.tick);
    expect(frames.size).toBe(1); hook.unmount(); expect(frames.size).toBe(0);
  });

  it('clears practice and held controls on retry reset and remount', () => {
    const hook = mounted(); fireEvent.keyDown(document.body, { key: 'ArrowLeft' }); advance(160);
    expect(fightOf(hook).player.x).toBeLessThan(28);
    act(() => hook.result.current.startPractice('striking', 'balanced')); advance(160);
    expect(fightOf(hook).player.x).toBe(28); expect(hook.result.current.practice?.complete).toBe(false);
    act(() => hook.result.current.reset()); advance(500);
    expect(hook.result.current.practice).toBeNull(); expect(hook.result.current.fight).toBeNull();
    hook.unmount(); const again = renderHook(() => useCageClash());
    expect(again.result.current.practice).toBeNull(); expect(again.result.current.fight).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves the accepted promotion world independently of practice controls', () => {
    const state = newMmaPromotion('Practice independent baseline', 'practice-baseline');
    expect(state.cash).toBe(120000); expect(loadMmaPromotion(state)).toEqual(state);
    expect(state.event).toBe(1); expect(state.history).toEqual([]);
  });
});
