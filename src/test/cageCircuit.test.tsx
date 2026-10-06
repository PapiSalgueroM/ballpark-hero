import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { createHash } from 'node:crypto';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { useCageClash } from '@/hooks/useCageClash';
import { createCageFight, stepCageFight, continueCageRound, type CageFight, type CageInput } from '@/lib/cageClash';
import { CAGE_CIRCUIT_STYLES, createCageCircuit, stepCageCircuit, advanceCageCircuit, isCageCircuitComplete, cageCircuitScore, type CageCircuit } from '@/lib/cageCircuit';
import { createCagePractice, stepCagePractice } from '@/lib/cagePractice';
import { newMmaPromotion, loadMmaPromotion } from '@/lib/mmaPromotion';
import { recordActivity, recordCompletion } from '@/lib/completions';

const blank: CageInput = { move: 0, guard: false, action: null };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let frames: Map<number, FrameRequestCallback>, frameId: number, now: number, mountSeed: number;
let hiddenDescriptor: PropertyDescriptor | undefined;
const frame = (elapsed = 16) => {
  now += elapsed;
  const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
};
const advance = (ms: number) => act(() => { for (let t = 0; t < ms; t += 16) frame(); });
const hide = (value: boolean) => { Object.defineProperty(document, 'hidden', { configurable: true, value }); fireEvent(document, new Event('visibilitychange')); };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); frames = new Map(); frameId = 0; now = 1000; mountSeed = 1900;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = mountSeed; return array; } });
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

function combatInput(state: CageFight): CageInput {
  if (state.player.stamina < 22) return blank;
  if (state.position === 'standing') return { ...blank, move: Math.abs(state.cpu.x - state.player.x) > 9 ? 1 : 0, action: Math.abs(state.cpu.x - state.player.x) <= 10 ? 'jab' : null };
  if (state.position === 'clinch') return { ...blank, action: 'grapple' };
  return { ...blank, action: state.top === 'player' ? state.player.posture ? 'power' : 'kick' : state.groundLevel > 0 ? 'kick' : 'grapple' };
}
function standalone(seed: number, opponent: 'balanced' | 'striker' | 'grappler') {
  let fight = createCageFight('balanced', opponent, seed);
  for (let tick = 0; tick < 2800 && fight.phase !== 'finished'; tick++) fight = fight.phase === 'break' ? continueCageRound(fight) : stepCageFight(fight, combatInput(fight));
  expect(fight.phase).toBe('finished');
  return fight;
}
function winningSeed() {
  for (let seed = 1900; seed < 1924; seed++) if (['balanced', 'striker', 'grappler'].every((style, stage) => standalone(seed + stage, style as 'balanced' | 'striker' | 'grappler').result?.winner === 'player')) return seed;
  throw new Error('The accepted real combat policy must reach a three-win circuit');
}
// Near-finish fixtures isolate orchestration; a legal engine strike still earns each result.
function finishFixture(state: CageCircuit, winner: 'player' | 'cpu' = 'player') {
  const next = copy(state), fight = next.fight;
  fight.tick = 1; fight.player.x = 40; fight.cpu.x = 48; fight.cpuInput = blank; fight.cpu.cooldown = 999;
  if (winner === 'player') {
    fight.cpu.health = .01; fight.player.damageDealt = 99.99; fight.player.blocked = 10; fight.player.controlTicks = 720;
    return stepCageCircuit(next, { ...blank, action: 'jab' });
  }
  fight.player.health = .01; fight.cpu.health = 50; fight.player.damageDealt = 50; fight.cpu.damageDealt = 99.99;
  fight.cpu.cooldown = 0; fight.cpuInput = { ...blank, action: 'jab' };
  return stepCageCircuit(next, blank);
}
function drawFixture() {
  const next = createCageCircuit('balanced', 1065);
  next.fight.tick = 1; next.fight.round = 3; next.fight.remainingTicks = 1;
  next.fight.roundCards = [{ player: 10, cpu: 10 }, { player: 10, cpu: 10 }];
  next.fight.cpu.cooldown = 999;
  return stepCageCircuit(next, blank);
}
function mounted(seed = 1900) {
  mountSeed = seed;
  const hook = renderHook(({ help }) => useCageClash(help), { initialProps: { help: false } });
  act(() => hook.result.current.startCircuit('balanced'));
  return hook;
}
type Mounted = ReturnType<typeof mounted>;
const fightOf = (hook: Mounted) => hook.result.current.fightRef.current!;
const keys = { jab: 'j', power: 'k', kick: 'l', grapple: 'u', submit: 'i', escape: 'o' };
function finishMounted(hook: Mounted, policy: (fight: CageFight) => CageInput = combatInput) {
  let held = new Set<string>();
  act(() => frame());
  for (let tick = 0; tick < 2900 && fightOf(hook).phase !== 'finished'; tick++) {
    if (fightOf(hook).phase === 'break') {
      for (const key of held) fireEvent.keyUp(document.body, { key });
      held = new Set();
      act(() => hook.result.current.nextRound());
      expect(hook.result.current.circuit?.fight).toEqual(fightOf(hook));
      act(() => frame());
    }
    const input = policy(fightOf(hook)), wanted = new Set<string>();
    if (input.move === 1) wanted.add('ArrowRight');
    if (input.move === -1) wanted.add('ArrowLeft');
    if (input.guard) wanted.add(' ');
    if (input.action) wanted.add(keys[input.action]);
    for (const key of held) if (!wanted.has(key)) fireEvent.keyUp(document.body, { key });
    for (const key of wanted) if (!held.has(key)) fireEvent.keyDown(document.body, { key });
    held = wanted; act(() => frame(50));
  }
  for (const key of held) fireEvent.keyUp(document.body, { key });
  expect(fightOf(hook).phase, 'Actual keyboard inputs finish the bounded three-round fight').toBe('finished');
}

describe('Cage Circuit actual engine outcomes', () => {
  it('uses the fixed opponent order and refreshes combat with wrapped stage seeds', () => {
    expect(CAGE_CIRCUIT_STYLES).toEqual(['balanced', 'striker', 'grappler']);
    for (const style of ['balanced', 'striker', 'grappler'] as const) {
      let state = createCageCircuit(style, 4294967294);
      expect(state.stage).toBe(0); expect(state.seed).toBe(4294967294); expect(state.results).toEqual([]);
      expect(state.fight).toEqual(createCageFight(style, 'balanced', 4294967294));
      for (let stage = 0; stage < 2; stage++) {
        const ended = finishFixture(state), prior = copy(ended);
        state = advanceCageCircuit(ended);
        expect(ended).toEqual(prior); expect(state.stage).toBe(stage + 1); expect(state.results).toEqual(ended.results);
        expect(state.fight).toEqual(createCageFight(style, stage === 0 ? 'striker' : 'grappler', (4294967294 + stage + 1) >>> 0));
        expect(state.fight.player.health).toBe(100); expect(state.fight.player.stamina).toBe(100);
      }
      expect(state.fight.seed).toBe(0);
    }
  });

  it('matches every standalone combat step and reaches all three real opponents across paired seeds', () => {
    const rows = [];
    for (let seed = 1900; seed < 1924; seed++) {
      let state = createCageCircuit('balanced', seed), played = 0;
      for (let stage = 0; stage < 3; stage++) {
        let expected = createCageFight('balanced', (['balanced', 'striker', 'grappler'] as const)[stage], seed + stage);
        const before = createHash('sha256'), after = createHash('sha256');
        for (let tick = 0; tick < 2800 && expected.phase !== 'finished'; tick++) {
          if (expected.phase === 'break') { expected = continueCageRound(expected); state = { ...state, fight: continueCageRound(state.fight) }; }
          else {
            const input = combatInput(expected), prior = copy(state);
            const next = stepCageCircuit(state, input); expect(state).toEqual(prior); state = next;
            expected = stepCageFight(expected, input);
          }
          before.update(JSON.stringify(expected)); after.update(JSON.stringify(state.fight));
        }
        expect(expected.phase).toBe('finished'); expect(state.fight).toEqual(expected); expect(after.digest('hex')).toBe(before.digest('hex'));
        expect(state.results).toHaveLength(stage + 1); expect(state.results[stage]).toEqual(expected.result); played++;
        const terminal = expected.result?.winner !== 'player' || stage === 2;
        expect(isCageCircuitComplete(state)).toBe(terminal);
        expect(cageCircuitScore(state)).toBe(terminal ? Math.round(state.results.reduce((sum, result) => sum + result.score, 0) / 3) : 0);
        if (terminal) break;
        state = advanceCageCircuit(state);
      }
      rows.push({ seed, played, wins: state.results.filter(result => result.winner === 'player').length, score: cageCircuitScore(state) });
    }
    console.log(`Cage Circuit paired runs ${JSON.stringify(rows)}`);
    expect(rows).toHaveLength(24); expect(rows.some(row => row.played === 3 && row.wins === 3)).toBe(true);
    expect(rows.every(row => row.score >= 0 && row.score <= 100)).toBe(true);
  }, 30000);

  it('records actual finishes once and freezes finished combat without changing prior results', () => {
    const initial = createCageCircuit('balanced', 1065), prior = copy(initial);
    const first = finishFixture(initial);
    expect(initial).toEqual(prior); expect(first.fight.result).toEqual({ winner: 'player', method: 'KO', score: 100 });
    expect(first.results).toEqual([first.fight.result]); expect(isCageCircuitComplete(first)).toBe(false); expect(cageCircuitScore(first)).toBe(0);
    const held = copy(first);
    for (let i = 0; i < 30; i++) expect(stepCageCircuit(first, { ...blank, action: 'jab' })).toBe(first);
    expect(first).toEqual(held);
    const second = finishFixture(advanceCageCircuit(first));
    expect(second.results).toHaveLength(2); expect(second.results[0]).toEqual(first.results[0]); expect(first.results).toHaveLength(1);
  });

  it('rejects advancing live rounds breaks losses draws and the final win', () => {
    const live = createCageCircuit('balanced', 1065); expect(advanceCageCircuit(live)).toBe(live);
    const nearBreak = copy(live); nearBreak.fight.tick = 1; nearBreak.fight.remainingTicks = 1; nearBreak.fight.cpu.cooldown = 999;
    const paused = stepCageCircuit(nearBreak, blank); expect(paused.fight.phase).toBe('break'); expect(paused.results).toEqual([]); expect(advanceCageCircuit(paused)).toBe(paused);
    const loss = finishFixture(live, 'cpu'); expect(loss.fight.result?.winner).toBe('cpu'); expect(isCageCircuitComplete(loss)).toBe(true); expect(advanceCageCircuit(loss)).toBe(loss);
    const draw = drawFixture(); expect(draw.fight.result).toEqual({ winner: 'draw', method: 'Decision', score: 25 }); expect(isCageCircuitComplete(draw)).toBe(true); expect(advanceCageCircuit(draw)).toBe(draw);
    let final = live;
    for (let stage = 0; stage < 3; stage++) { final = finishFixture(final); if (stage < 2) final = advanceCageCircuit(final); }
    expect(final.stage).toBe(2); expect(isCageCircuitComplete(final)).toBe(true); expect(advanceCageCircuit(final)).toBe(final);
  });

  it('scores only terminal runs with three fixed slots including unplayed opponents', () => {
    const start = createCageCircuit('balanced', 1065), win = finishFixture(start);
    expect(cageCircuitScore(start)).toBe(0); expect(cageCircuitScore(win)).toBe(0);
    const loss = finishFixture(start, 'cpu'); expect(loss.results[0].score).toBe(10); expect(cageCircuitScore(loss)).toBe(3);
    const secondLoss = finishFixture(advanceCageCircuit(win), 'cpu'); expect(secondLoss.results.map(result => result.score)).toEqual([100, 10]); expect(cageCircuitScore(secondLoss)).toBe(37);
    expect(cageCircuitScore(drawFixture())).toBe(8);
    let final = start;
    for (let stage = 0; stage < 3; stage++) { final = finishFixture(final); if (stage < 2) final = advanceCageCircuit(final); }
    expect(final.results.map(result => result.score)).toEqual([100, 100, 100]); expect(cageCircuitScore(final)).toBe(100);
  });
});

describe('Cage Circuit mounted controls and completion', () => {
  it('earns three keyboard wins with fresh next fights and records only the final circuit score', () => {
    localStorage.setItem('circuit-unrelated', 'keep'); sessionStorage.setItem('circuit-unrelated', 'keep');
    const bytes = JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }), writes = vi.spyOn(Storage.prototype, 'setItem');
    const seed = winningSeed(), hook = mounted(seed);
    act(() => hook.result.current.nextCircuitFight()); expect(hook.result.current.circuit?.stage).toBe(0);
    for (let stage = 0; stage < 3; stage++) {
      finishMounted(hook); expect(fightOf(hook).result?.winner).toBe('player');
      const run = hook.result.current.circuit!; expect(run.results).toHaveLength(stage + 1); expect(run.results[stage]).toEqual(fightOf(hook).result);
      const ended = copy(run); advance(500); expect(hook.result.current.circuit).toEqual(ended);
      if (stage < 2) {
        expect(hook.result.current.finalScore).toBe(0); expect(recordCompletion).not.toHaveBeenCalled();
        act(() => { hook.result.current.nextCircuitFight(); hook.result.current.nextCircuitFight(); });
        expect(hook.result.current.circuit?.stage).toBe(stage + 1);
        expect(fightOf(hook)).toEqual(createCageFight('balanced', stage === 0 ? 'striker' : 'grappler', seed + stage + 1));
      }
    }
    const terminal = copy(hook.result.current.circuit!), score = Math.round(terminal.results.reduce((sum, result) => sum + result.score, 0) / 3);
    expect(hook.result.current.finalScore).toBe(score); expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordCompletion).mock.calls[0].slice(0, 2)).toEqual(['/cage-clash', score]);
    act(() => { hook.result.current.nextCircuitFight(); hook.result.current.tap('submit'); hook.result.current.nextRound(); hook.result.current.resume(); }); advance(1000);
    expect(hook.result.current.circuit).toEqual(terminal); expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(writes).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } })).toBe(bytes);
  }, 30000);

  it('ends a real first-fight loss once without offering or starting another opponent', () => {
    const hook = mounted(); finishMounted(hook, () => blank);
    const run = copy(hook.result.current.circuit!);
    expect(run.stage).toBe(0); expect(run.results).toHaveLength(1); expect(run.fight.result?.winner).toBe('cpu');
    expect(hook.result.current.finalScore).toBe(Math.round(run.results[0].score / 3)); expect(recordCompletion).toHaveBeenCalledTimes(1);
    act(() => { hook.result.current.nextCircuitFight(); hook.result.current.nextCircuitFight(); }); advance(500);
    expect(hook.result.current.circuit).toEqual(run); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('abandons an intermediate earned win without points or restored progress', () => {
    const hook = mounted(winningSeed()); finishMounted(hook);
    expect(fightOf(hook).result?.winner).toBe('player'); expect(hook.result.current.circuit?.results).toHaveLength(1); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => hook.result.current.reset()); advance(500);
    expect(hook.result.current.circuit).toBeNull(); expect(hook.result.current.fight).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    hook.unmount(); const again = renderHook(() => useCageClash());
    expect(again.result.current.circuit).toBeNull(); expect(again.result.current.fight).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('switches between circuit accepted quick combat and unscored practice without stale mode state', () => {
    const hook = mounted(); advance(160);
    act(() => hook.result.current.start('balanced', 'grappler'));
    expect(hook.result.current.circuit).toBeNull(); expect(hook.result.current.practice).toBeNull();
    let expected = createCageFight('balanced', 'grappler', mountSeed);
    act(() => frame()); fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    for (let tick = 0; tick < 20; tick++) { expected = stepCageFight(expected, { ...blank, move: -1 }); act(() => frame(50)); }
    fireEvent.keyUp(document.body, { key: 'ArrowLeft' }); expect(fightOf(hook)).toEqual(expected);
    act(() => hook.result.current.startCircuit('balanced')); advance(160);
    act(() => hook.result.current.startPractice('submission', 'grappler'));
    expect(hook.result.current.circuit).toBeNull();
    let practice = createCagePractice('submission', 'grappler', mountSeed); act(() => frame()); fireEvent.keyDown(document.body, { key: 'i' });
    for (let tick = 0; tick < 60 && !practice.complete; tick++) { practice = stepCagePractice(practice, { ...blank, action: 'submit' }); act(() => frame(50)); }
    fireEvent.keyUp(document.body, { key: 'i' }); expect(practice.complete).toBe(true); expect(hook.result.current.practice).toEqual(practice);
    expect(hook.result.current.finalScore).toBe(0); expect(recordCompletion).not.toHaveBeenCalled();
    act(() => hook.result.current.startCircuit('balanced'));
    expect(hook.result.current.practice).toBeNull(); expect(hook.result.current.circuit?.results).toEqual([]);
    advance(160); expect(fightOf(hook).tick).toBeGreaterThan(0); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps the circuit clock synchronized through released inputs help pause and cleanup', () => {
    const hook = mounted(), start = fightOf(hook).player.x;
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' }); advance(320); expect(fightOf(hook).player.x).toBeLessThan(start);
    fireEvent.keyUp(document.body, { key: 'ArrowLeft' }); const released = fightOf(hook).player.x; advance(160); expect(fightOf(hook).player.x).toBe(released);
    act(() => hook.result.current.press('pointer:7', 'right')); advance(160);
    const cancel = new Event('pointercancel'); Object.defineProperty(cancel, 'pointerId', { value: 7 }); fireEvent(window, cancel);
    const cancelled = fightOf(hook).player.x; advance(160); expect(fightOf(hook).player.x).toBe(cancelled);
    hook.rerender({ help: true }); const frozen = copy(fightOf(hook)); advance(500);
    expect(hook.result.current.paused).toBe(true); expect(fightOf(hook)).toEqual(frozen);
    hook.rerender({ help: false }); advance(160); expect(fightOf(hook)).toEqual(frozen);
    act(() => hook.result.current.resume()); advance(160); expect(fightOf(hook).tick).toBeGreaterThan(frozen.tick);
    hide(true); const hidden = copy(fightOf(hook)); advance(500); expect(fightOf(hook)).toEqual(hidden);
    hide(false); act(() => hook.result.current.resume()); advance(160);
    expect(hook.result.current.circuit?.fight).toEqual(hook.result.current.fight); expect(hook.result.current.circuit?.results).toEqual([]);
    expect(recordCompletion).not.toHaveBeenCalled(); expect(frames.size).toBe(1); hook.unmount(); expect(frames.size).toBe(0);
  });

  it('preserves the accepted promotion world independently of circuit mutations', () => {
    const state = newMmaPromotion('Circuit independent baseline', 'circuit-baseline');
    expect(state.cash).toBe(120000); expect(state.event).toBe(1); expect(state.history).toEqual([]); expect(loadMmaPromotion(state)).toEqual(state);
  });
});
