import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { useCageClash } from '@/hooks/useCageClash';
import { CAGE_TICK_MS, CAGE_ROUND_TICKS, createCageFight, stepCageFight, continueCageRound, cageClashScore, canCageAction, type CageFight, type CageInput } from '@/lib/cageClash';
import { newMmaPromotion, loadMmaPromotion } from '@/lib/mmaPromotion';
import { recordCompletion } from '@/lib/completions';

const blank: CageInput = { move: 0, guard: false, action: null };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let frameId = 0, now = 1000;
let frames: Map<number, FrameRequestCallback>;
let hiddenDescriptor: PropertyDescriptor | undefined;
const frame = (elapsed = 16) => {
  now += elapsed;
  const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
};
const advance = (ms: number) => act(() => { for (let t = 0; t < ms; t += 16) frame(); });
const hidden = (value: boolean) => { Object.defineProperty(document, 'hidden', { configurable: true, value }); fireEvent(document, new Event('visibilitychange')); };
function mounted(helpOpen = false) {
  const hook = renderHook(({ help }) => useCageClash(help), { initialProps: { help: helpOpen } });
  act(() => hook.result.current.start('grappler', 'balanced'));
  return hook;
}
const currentFight = (hook: ReturnType<typeof mounted>) => hook.result.current.fightRef.current!;
function finishMounted(hook: ReturnType<typeof mounted>) {
  for (let window = 0; window < 290 && currentFight(hook).phase !== 'finished'; window += 1) {
    if (currentFight(hook).phase === 'break') act(() => hook.result.current.nextRound());
    advance(500);
  }
  expect(currentFight(hook).phase, 'Actual CPU combat finishes in the bounded three rounds').toBe('finished');
}

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); frameId = 0; now = 1000; frames = new Map();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = 1063; return array; } });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
  else delete (document as unknown as Record<string, unknown>).hidden;
});

function arena(seed = 1063, position: CageFight['position'] = 'standing'): CageFight {
  const state = createCageFight('grappler', 'balanced', seed);
  state.tick = 1; state.player.x = 40; state.cpu.x = 48; state.position = position;
  if (position === 'ground') state.top = 'player';
  return state;
}
// One isolated engine tick keeps the opponent's legal blank or defensive intent.
function isolated(state: CageFight, input: CageInput, defense = blank): CageFight {
  return stepCageFight({ ...state, tick: 1, cpuInput: defense, cpu: { ...state.cpu, cooldown: 999 } }, input);
}
function campaign(seed: number, active: boolean, style: 'balanced' | 'striker' | 'grappler') {
  let state = createCageFight('balanced', style, seed);
  for (let tick = 0; tick < 2800 && state.phase !== 'finished'; tick++) {
    if (state.phase === 'break') { state = continueCageRound(state); continue; }
    let input = blank;
    if (active && state.player.stamina >= 22) {
      if (state.position === 'standing') input = { ...blank, move: Math.abs(state.cpu.x - state.player.x) > 9 ? 1 : 0, action: Math.abs(state.cpu.x - state.player.x) <= 10 ? 'jab' : null };
      else if (state.position === 'clinch') input = { ...blank, action: 'grapple' };
      else input = { ...blank, action: state.top === 'player' ? state.player.posture ? 'power' : 'kick' : state.groundLevel > 0 ? 'kick' : 'grapple' };
    }
    state = stepCageFight(state, input);
  }
  return state;
}

describe('Cage Clash actual combat', () => {
  it('replays the same seeded input sequence without mutating its starting fight', () => {
    expect(CAGE_TICK_MS).toBe(50); expect(CAGE_ROUND_TICKS).toBe(900);
    const start = createCageFight('balanced', 'grappler', 1063), prior = copy(start);
    const play = (seed: number) => {
      let state = createCageFight('balanced', 'grappler', seed);
      for (let i = 0; i < 250; i++) state = stepCageFight(state, { move: i < 20 ? 1 : 0, guard: i % 40 > 25, action: i % 40 <= 25 ? 'jab' : null });
      return state;
    };
    expect(play(1063)).toEqual(play(1063));
    expect([play(1063).player, play(1063).cpu]).not.toEqual([play(2063).player, play(2063).cpu]);
    expect(stepCageFight(start, { ...blank, move: 1 })).not.toBe(start); expect(start).toEqual(prior);
  });

  it('requires actual strike range and keeps movement inside the cage without overlapping fighters', () => {
    const far = arena(); far.player.x = 10; far.cpu.x = 90;
    const missed = isolated(far, { ...blank, action: 'jab' }); expect(missed.cpu.health).toBe(100); expect(missed.player.hits).toBe(0); expect(missed.player.stamina).toBe(93);
    const near = isolated(arena(), { ...blank, action: 'jab' }); expect(near.cpu.health).toBeLessThan(100); expect(near.player.hits).toBe(1);
    let moved = far;
    for (let i = 0; i < 120; i++) moved = isolated(moved, { ...blank, move: 1 });
    expect(moved.player.x).toBe(84); expect(moved.cpu.x).toBe(90);
    for (let i = 0; i < 120; i++) moved = isolated(moved, { ...blank, move: -1 });
    expect(moved.player.x).toBe(10); expect(moved.cpu.x - moved.player.x).toBeGreaterThanOrEqual(6);
  });

  it('guard reduces the same landed strike and charges the defending fighter stamina', () => {
    const open = isolated(arena(), { ...blank, action: 'jab' });
    const guarded = isolated(arena(), { ...blank, action: 'jab' }, { ...blank, guard: true });
    expect(guarded.player.damageDealt).toBeCloseTo(open.player.damageDealt * .3, 8);
    expect(guarded.cpu.blocked).toBe(1); expect(guarded.cpu.stamina).toBe(96.75);
  });

  it('held strikes respect the actual cooldown and charge once per accepted attack', () => {
    let state = isolated(arena(), { ...blank, action: 'jab' });
    expect(state.player.cooldown).toBe(10); expect(state.player.stamina).toBe(93); expect(state.player.hits).toBe(1);
    const firstDamage = state.player.damageDealt;
    for (let i = 0; i < 9; i++) state = isolated(state, { ...blank, action: 'jab' });
    expect(state.player.hits).toBe(1); expect(state.player.damageDealt).toBe(firstDamage);
    state = isolated(state, { ...blank, action: 'jab' }); expect(state.player.hits).toBe(2);
    expect(state.player.stamina).toBeCloseTo(88.5, 8);
  });

  it('insufficient stamina rejects attacks and low stamina weakens a same seed landed hit', () => {
    const empty = arena(); empty.player.stamina = 0;
    const refused = isolated(empty, { ...blank, action: 'power' }); expect(refused.player.hits).toBe(0); expect(refused.player.cooldown).toBe(0); expect(refused.player.stamina).toBe(.25);
    const recovered = isolated(refused, blank); expect(recovered.player.stamina).toBeCloseTo(.9, 8);
    const tired = arena(); tired.player.stamina = 15;
    const strong = isolated(arena(), { ...blank, action: 'jab' }), weak = isolated(tired, { ...blank, action: 'jab' });
    expect(weak.player.hits).toBe(1); expect(strong.player.damageDealt).toBeGreaterThan(weak.player.damageDealt);
    expect(weak.player.damageDealt / strong.player.damageDealt).toBeCloseTo((.45 + .55 * 8.25 / 100) / (.45 + .55 * 93 / 100), 8);
  });

  it('requires close range to clinch before attempting a takedown', () => {
    const far = arena(); far.cpu.x = 60;
    expect(isolated(far, { ...blank, action: 'grapple' }).position).toBe('standing');
    const close = isolated(arena(), { ...blank, action: 'grapple' });
    expect(close.position).toBe('clinch'); expect(close.top).toBeNull(); expect(close.player.takedowns).toBe(0);
    expect(close.player.stamina).toBe(88); expect(close.player.cooldown).toBe(20);
  });

  it('earned takedowns establish a real top position and positional control', () => {
    const rows = Array.from({ length: 64 }, (_, seed) => isolated(arena(seed + 1, 'clinch'), { ...blank, action: 'grapple' }));
    const landed = rows.filter(s => s.position === 'ground'); expect(landed.length).toBeGreaterThan(0);
    for (const state of landed) { expect(state.top).toBe('player'); expect(state.player.takedowns).toBe(1); expect(state.player.controlTicks).toBe(1); expect(state.groundLevel).toBe(0); }
  });

  it('top position posture passing and bottom restrictions change actual ground combat', () => {
    const top = arena(1063, 'ground'), bottom = copy(top); bottom.top = 'cpu';
    const topHit = isolated(top, { ...blank, action: 'jab' }), bottomHit = isolated(bottom, { ...blank, action: 'jab' });
    expect(topHit.player.damageDealt).toBeGreaterThan(bottomHit.player.damageDealt);
    expect(canCageAction(top, 'power')).toBe(false); expect(canCageAction(bottom, 'power')).toBe(false);
    const postured = isolated(top, { ...blank, action: 'kick' }); expect(postured.player.posture).toBe(true); expect(canCageAction(postured, 'power')).toBe(true); expect(canCageAction(postured, 'submit')).toBe(false);
    const passed = Array.from({ length: 64 }, (_, seed) => isolated(arena(seed + 1, 'ground'), { ...blank, action: 'grapple' })).filter(s => s.groundLevel === 1);
    expect(passed.length).toBeGreaterThan(0);
    const swept = Array.from({ length: 64 }, (_, seed) => { const s = arena(seed + 1, 'ground'); s.top = 'cpu'; return isolated(s, { ...blank, action: 'grapple' }); }).filter(s => s.top === 'player');
    expect(swept.length).toBeGreaterThan(0);
  });

  it('a held submission spends stamina builds visible progress and wins only at full pressure', () => {
    let state = arena(1063, 'ground'); state.groundLevel = 2;
    for (let i = 0; i < 20; i++) state = isolated(state, { ...blank, action: 'submit' });
    expect(state.phase).toBe('fight'); expect(state.player.submission).toBeCloseTo(66, 8); expect(state.player.stamina).toBeCloseTo(72, 8);
    const released = isolated(state, blank); expect(released.player.submission).toBeCloseTo(65, 8);
    for (let i = 0; i < 20 && state.phase === 'fight'; i++) state = isolated(state, { ...blank, action: 'submit' });
    expect(state.phase).toBe('finished'); expect(state.result?.winner).toBe('player'); expect(state.result?.method).toBe('Submission'); expect(state.player.submission).toBe(100);
  });

  it('guard and escape resistance reduce real opposing submission pressure', () => {
    const state = arena(1063, 'ground'); state.groundLevel = 2;
    const open = isolated(state, { ...blank, action: 'submit' }), resisted = isolated(state, { ...blank, action: 'submit' }, { ...blank, guard: true });
    expect(resisted.player.submission).toBeCloseTo(open.player.submission * (1 - .65 * .9975), 8);
    const danger = arena(1063, 'ground'); danger.top = 'cpu'; danger.cpu.submission = 50;
    const escaped = isolated(danger, { ...blank, action: 'escape' });
    expect(escaped.cpu.submission).toBeLessThanOrEqual(21.5); expect(escaped.player.stamina).toBe(90);
  });

  it('a legal escape can return to standing and clears ground pressure and posture', () => {
    const rows = Array.from({ length: 64 }, (_, seed) => { const s = arena(seed + 1, 'ground'); s.player.submission = 25; s.cpu.submission = 50; return isolated(s, { ...blank, action: 'escape' }); });
    const escaped = rows.filter(s => s.position === 'standing'); expect(escaped.length).toBeGreaterThan(0);
    for (const state of escaped) { expect(state.top).toBeNull(); expect(state.groundLevel).toBe(0); expect(state.player.submission).toBe(0); expect(state.cpu.submission).toBe(0); expect(state.player.posture).toBe(false); }
  });

  it('round breaks wait for input and decisions count all three earned round cards', () => {
    let state = arena(); state.remainingTicks = 1; state.player.damageDealt = 20;
    state = isolated(state, blank); expect(state.phase).toBe('break'); expect(state.roundCards).toEqual([{ player: 10, cpu: 9 }]);
    expect(stepCageFight(state, { ...blank, action: 'power' })).toBe(state);
    state = continueCageRound(state); expect(state.round).toBe(2); expect(state.remainingTicks).toBe(900); expect(state.position).toBe('standing');
    state.remainingTicks = 1; state.cpu.damageDealt += 30; state = isolated(state, blank);
    expect(state.roundCards[1]).toEqual({ player: 9, cpu: 10 }); state = continueCageRound(state);
    state.remainingTicks = 1; state.player.damageDealt += 10; state = isolated(state, blank);
    expect(state.phase).toBe('finished'); expect(state.roundCards).toHaveLength(3); expect(state.result?.winner).toBe('player'); expect(state.result?.method).toBe('Decision');
  });

  it('a knockout is terminal and repeated steps or round continuation cannot pay or mutate again', () => {
    const state = arena(); state.cpu.health = .01; const ended = isolated(state, { ...blank, action: 'jab' });
    expect(ended.phase).toBe('finished'); expect(ended.result?.method).toBe('KO'); expect(ended.result?.winner).toBe('player'); expect(ended.cpu.health).toBe(0);
    expect(stepCageFight(ended, { ...blank, action: 'jab' })).toBe(ended); expect(continueCageRound(ended)).toBe(ended);
    expect(ended.result?.score).toBe(cageClashScore(ended));
  });

  it('legacy points use literal earned outcome damage defense and control weights', () => {
    const state = arena(); expect(cageClashScore(state)).toBe(0);
    state.phase = 'finished'; state.player.damageDealt = 100; state.player.blocked = 10; state.player.controlTicks = 720;
    state.result = { winner: 'player', method: 'Submission', score: 0 }; expect(cageClashScore(state)).toBe(100);
    state.result = { winner: 'player', method: 'Decision', score: 0 }; expect(cageClashScore(state)).toBe(85);
    state.result = { winner: 'draw', method: 'Decision', score: 0 }; expect(cageClashScore(state)).toBe(60);
    state.result = { winner: 'cpu', method: 'KO', score: 0 }; expect(cageClashScore(state)).toBe(35);
  });

  it('active range and stamina management outperforms blank input across paired seeded opponents', () => {
    const rows = [];
    for (const active of [false, true]) {
      const fights = (['balanced', 'striker', 'grappler'] as const).flatMap(style => Array.from({ length: 24 }, (_, seed) => campaign(seed + 1900, active, style)));
      expect(fights).toHaveLength(72); expect(fights.every(s => s.phase === 'finished')).toBe(true);
      expect(fights.every(s => Number.isFinite(s.player.health) && s.player.health >= 0 && s.player.stamina >= 0 && s.player.stamina <= 100)).toBe(true);
      rows.push({ policy: active ? 'range-stamina' : 'blank', fights: fights.length, wins: fights.filter(s => s.result?.winner === 'player').length,
        damage: fights.reduce((n, s) => n + s.player.damageDealt, 0) / fights.length, score: fights.reduce((n, s) => n + cageClashScore(s), 0) / fights.length });
    }
    console.log(`Cage strategy ${JSON.stringify(rows)}`);
    expect(rows[1].damage - rows[0].damage).toBeGreaterThan(60);
    expect(rows[1].score - rows[0].score).toBeGreaterThan(40);
    expect(rows[1].wins - rows[0].wins).toBeGreaterThanOrEqual(36);
  });
});

describe('Cage Clash mounted lifecycle', () => {
  it('steps real combat at 20Hz discards long frame gaps and cleans up its only clock', () => {
    const hook = mounted();
    act(() => frame()); act(() => frame(100));
    expect(currentFight(hook).tick).toBe(2);
    const prior = copy(currentFight(hook)); act(() => frame(1000));
    expect(currentFight(hook)).toEqual(prior);
    advance(160); expect(currentFight(hook).tick).toBeGreaterThan(prior.tick);
    expect(frames.size).toBe(1); hook.unmount(); expect(frames.size).toBe(0);
  });

  it('releases keyboard and pointer movement and cancels held actions without stale input', () => {
    const hook = mounted(); const startX = currentFight(hook).player.x;
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' }); advance(320);
    expect(currentFight(hook).player.x).toBeLessThan(startX);
    fireEvent.keyUp(document.body, { key: 'ArrowLeft' }); const released = currentFight(hook).player.x; advance(160);
    expect(currentFight(hook).player.x).toBe(released);
    act(() => hook.result.current.press('pointer:7', 'right')); advance(160);
    expect(currentFight(hook).player.x).toBeGreaterThan(released);
    const cancel = new Event('pointercancel'); Object.defineProperty(cancel, 'pointerId', { value: 7 }); fireEvent(window, cancel);
    const cancelled = currentFight(hook).player.x; advance(160); expect(currentFight(hook).player.x).toBe(cancelled);
    act(() => hook.result.current.press('pointer:8', 'left')); advance(100);
    const release = new Event('pointerup'); Object.defineProperty(release, 'pointerId', { value: 8 }); fireEvent(window, release);
    const outside = currentFight(hook).player.x; advance(160); expect(currentFight(hook).player.x).toBe(outside);
  });

  it('pauses on blur and hidden pages then resumes CPU combat with no held movement', () => {
    const hook = mounted(); fireEvent.keyDown(document.body, { key: 'ArrowLeft' }); advance(160);
    fireEvent(window, new Event('blur')); const paused = copy(currentFight(hook)); advance(1000);
    expect(hook.result.current.paused).toBe(true); expect(currentFight(hook)).toEqual(paused);
    act(() => hook.result.current.resume()); advance(320);
    expect(currentFight(hook).player.x).toBe(paused.player.x); expect(currentFight(hook).tick).toBeGreaterThan(paused.tick);
    expect(currentFight(hook).cpu).not.toEqual(paused.cpu);
    hidden(true); const frozen = copy(currentFight(hook)); advance(600);
    expect(hook.result.current.paused).toBe(true); expect(currentFight(hook)).toEqual(frozen);
    act(() => hook.result.current.resume()); advance(160); expect(currentFight(hook)).toEqual(frozen);
    hidden(false); act(() => hook.result.current.resume()); advance(160);
    expect(currentFight(hook).tick).toBeGreaterThan(frozen.tick);
  });

  it('keeps help paused until explicit resume and ignores combat keys on form controls', () => {
    const hook = mounted(); advance(160); hook.rerender({ help: true });
    const held = copy(currentFight(hook)); fireEvent.keyDown(document.body, { key: 'j' }); advance(500);
    expect(hook.result.current.paused).toBe(true); expect(currentFight(hook)).toEqual(held);
    act(() => hook.result.current.resume()); expect(hook.result.current.paused).toBe(true);
    hook.rerender({ help: false }); advance(160); expect(currentFight(hook)).toEqual(held);
    act(() => hook.result.current.resume());
    const input = document.createElement('input'); document.body.append(input); input.focus();
    fireEvent.keyDown(input, { key: 'ArrowLeft' }); advance(160);
    expect(currentFight(hook).player.x).toBe(held.player.x); input.remove();
  });

  it('records exactly one actual finish and keeps its score after repeated frames and actions', () => {
    const hook = mounted(); finishMounted(hook);
    const terminal = copy(currentFight(hook));
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordCompletion).mock.calls[0].slice(0, 2)).toEqual(['/cage-clash', cageClashScore(terminal)]);
    act(() => { hook.result.current.tap('submit'); hook.result.current.nextRound(); hook.result.current.resume(); }); advance(1000);
    expect(currentFight(hook)).toEqual(terminal); expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('never awards an abandoned fight or restores combat after a remount', () => {
    const hook = mounted(); advance(500); act(() => hook.result.current.reset()); advance(500);
    expect(hook.result.current.fight).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
    hook.unmount(); const next = renderHook(() => useCageClash());
    expect(next.result.current.fight).toBeNull(); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves the accepted promotion world and unrelated save bytes', () => {
    const promotion = newMmaPromotion('Independent baseline', 'cage-baseline');
    expect(loadMmaPromotion(promotion)).toEqual(promotion); expect(promotion.cash).toBe(120000);
    localStorage.setItem('dukb-mma-promoter-v1', JSON.stringify(promotion)); localStorage.setItem('cage-unrelated', 'keep exact');
    const prior = JSON.stringify({ ...localStorage }); const hook = mounted(); advance(160); act(() => hook.result.current.reset());
    expect(JSON.stringify({ ...localStorage })).toBe(prior);
  });
});
