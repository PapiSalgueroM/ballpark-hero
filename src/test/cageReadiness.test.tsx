import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { CageClashBoard } from '@/components/cage-clash/CageClashBoard';
import { cageActionCost, cageActionRange, cageActionReadiness, createCageFight, stepCageFight, type CageAction, type CageFight, type CageInput } from '@/lib/cageClash';
import { loadMmaPromotion, newMmaPromotion } from '@/lib/mmaPromotion';
import { recordActivity, recordCompletion } from '@/lib/completions';

const blank: CageInput = { move: 0, guard: false, action: null };
const actions: CageAction[] = ['jab', 'power', 'kick', 'grapple', 'submit', 'escape'];
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let frames: Map<number, FrameRequestCallback>, frameId: number, now: number;
let hiddenDescriptor: PropertyDescriptor | undefined;
const frame = (elapsed = 50) => { now += elapsed; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
const advance = (ticks: number) => act(() => { for (let tick = 0; tick < ticks; tick++) frame(); });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); frames = new Map(); frameId = 0; now = 1000;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.stubGlobal('crypto', { getRandomValues: (array: Uint32Array) => { array[0] = 1069; return array; } });
  vi.stubGlobal('fetch', vi.fn()); vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden'); Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor); else delete (document as unknown as Record<string, unknown>).hidden;
});
function closeFight() { const state = createCageFight('balanced', 'balanced', 1069); state.player.x = 40; state.cpu.x = 46; return state; }
function click(name: string) { const button = screen.queryByRole('button', { name }); expect(button).not.toBeNull(); fireEvent.click(button!); }
function board(practice = false) {
  const mounted = render(<CageClashBoard onHelp={() => undefined} helpOpen={false} />);
  if (practice) fireEvent.change(screen.getByLabelText('Mode'), { target: { value: 'practice' } });
  click(practice ? 'Start drill' : 'Fight'); advance(1); return mounted;
}
function hint(action: CageAction) { const span = document.querySelector(`[data-cage-readiness="${action}"]`); expect(span).not.toBeNull(); return span!; }
function hud(field: string, side = 'player') { return Number(document.querySelector(`[data-cage-fighter="${side}"]`)!.getAttribute(`data-${field}`)); }
function approach() {
  fireEvent.keyDown(document.body, { key: 'ArrowRight' });
  for (let tick = 0; tick < 120 && hud('x', 'cpu') - hud('x') > 8; tick++) advance(1);
  fireEvent.keyUp(document.body, { key: 'ArrowRight' }); advance(2);
  expect(hud('x', 'cpu') - hud('x')).toBeLessThanOrEqual(8);
}

describe('Cage action readiness outcomes', () => {
  it('reports literal contextual costs including each sides first and continuing submission', () => {
    const state = closeFight();
    expect(actions.map(action => cageActionCost(state, action))).toEqual([7, 14, 16, 12, 12.8, 10]);
    state.position = 'ground'; state.top = 'player'; state.cpu.submission = 4;
    expect(cageActionCost(state, 'kick')).toBe(8); expect(cageActionCost(state, 'submit', 'cpu')).toBe(.8);
    expect(cageActionCost(state, 'submit')).toBe(12.8); state.player.submission = 4; expect(cageActionCost(state, 'submit')).toBe(.8);
    for (const side of ['player', 'cpu'] as const) {
      const fresh = closeFight(); fresh.position = 'ground'; fresh.top = side; fresh[side].stamina = 12.8;
      const first = stepCageFight(fresh, side === 'player' ? { ...blank, action: 'submit' } : blank, side === 'cpu' ? { ...blank, action: 'submit' } : blank);
      expect(first[side].submission).toBeGreaterThan(0); expect(first[side].stamina).toBe(0);
      first[side].stamina = .8; expect(cageActionReadiness(first, 'submit', side)).toBe('Ready');
      const held = stepCageFight(first, side === 'player' ? { ...blank, action: 'submit' } : blank, side === 'cpu' ? { ...blank, action: 'submit' } : blank);
      expect(held[side].submission).toBeGreaterThan(first[side].submission); expect(held[side].stamina).toBe(0);
    }
  });

  it('prioritizes legal position before gas cooldown and range for either corner', () => {
    const state = closeFight(); state.player.stamina = 0; state.player.cooldown = 9; state.cpu.x = 90;
    expect(cageActionReadiness(state, 'submit')).toBe('Unavailable'); expect(cageActionReadiness(state, 'jab')).toBe('Recover gas');
    state.player.stamina = 100; expect(cageActionReadiness(state, 'jab')).toBe('Recovering');
    state.player.cooldown = 0; expect(cageActionReadiness(state, 'jab')).toBe('Move closer');
    state.position = 'ground'; state.top = 'cpu'; state.groundLevel = 2;
    expect(cageActionReadiness(state, 'submit')).toBe('Unavailable'); expect(cageActionReadiness(state, 'power')).toBe('Unavailable');
    expect(cageActionReadiness(state, 'grapple', 'cpu')).toBe('Unavailable');
    state.cpu.posture = true; expect(cageActionReadiness(state, 'power', 'cpu')).toBe('Ready');
    const rejected = stepCageFight(state, { ...blank, action: 'power' }, blank); expect(rejected.player.hits).toBe(0);
    for (const phase of ['break', 'finished'] as const) { state.phase = phase; for (const action of actions) expect(cageActionReadiness(state, action)).toBe('Unavailable'); }
  });

  it('matches strike and clinch reach at literal standing edges without applying range on the mat', () => {
    expect(actions.map(cageActionRange)).toEqual([10, 12, 20, 9, Infinity, Infinity]);
    for (const [action, range] of [['jab', 10], ['power', 12], ['kick', 20], ['grapple', 9]] as const) for (const outside of [false, true]) {
      const state = closeFight(); state.cpu.x = state.player.x + range + (outside ? .001 : 0);
      expect(cageActionReadiness(state, action)).toBe(outside ? 'Move closer' : 'Ready');
      const next = stepCageFight(state, { ...blank, action }, blank);
      if (action === 'grapple') expect(next.position).toBe(outside ? 'standing' : 'clinch'); else expect(next.player.hits).toBe(outside ? 0 : 1);
    }
    const state = closeFight(); state.position = 'ground'; state.top = 'player'; state.cpu.x = 90;
    expect(cageActionReadiness(state, 'jab')).toBe('Ready'); expect(stepCageFight(state, { ...blank, action: 'jab' }, blank).player.hits).toBe(1);
  });

  it('matches exact gas and cooldown recovery with actual attacks on the following tick', () => {
    const at = closeFight(); at.player.stamina = 7; expect(cageActionReadiness(at, 'jab')).toBe('Ready');
    expect(stepCageFight(at, { ...blank, action: 'jab' }, blank).player.hits).toBe(1);
    const below = closeFight(); below.player.stamina = 6.74; expect(cageActionReadiness(below, 'jab')).toBe('Recover gas');
    expect(stepCageFight(below, { ...blank, action: 'jab' }, blank).player.hits).toBe(0);
    below.player.stamina = 6.75; expect(cageActionReadiness(below, 'jab')).toBe('Recover gas');
    expect(stepCageFight(below, { ...blank, action: 'jab' }, blank).player.hits).toBe(1);
    const cooling = closeFight(); cooling.player.cooldown = 2; expect(cageActionReadiness(cooling, 'jab')).toBe('Recovering');
    const waiting = stepCageFight(cooling, { ...blank, action: 'jab' }, blank); expect(waiting.player.hits).toBe(0);
    expect(waiting.player.cooldown).toBe(1); expect(cageActionReadiness(waiting, 'jab')).toBe('Recovering');
    expect(stepCageFight(waiting, { ...blank, action: 'jab' }, blank).player.hits).toBe(1);
  });

  it('keeps every seeded combat state identical to the accepted engine before helper extraction', () => {
    const acceptedSource = execFileSync('git', ['show', '31a4ec01:src/lib/cageClash.ts'], { encoding: 'utf8', windowsHide: true });
    const currentSource = readFileSync(process.env.CAGE_READINESS_ENGINE_SOURCE || 'src/lib/cageClash.ts', 'utf8');
    const compiled = JSON.parse(execFileSync(process.execPath, ['-e', "const fs=require('node:fs'),es=require('esbuild');process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(source=>es.transformSync(source,{loader:'ts',format:'cjs',target:'es2020'}).code)));"], { input: JSON.stringify([acceptedSource, currentSource]), encoding: 'utf8', timeout: 10000, windowsHide: true })) as string[];
    type Engine = Pick<typeof import('@/lib/cageClash'), 'createCageFight' | 'stepCageFight' | 'continueCageRound'>;
    const [accepted, current] = compiled.map(code => { const module = { exports: {} as Engine }; new Function('module', 'exports', code)(module, module.exports); return module.exports; });
    const before = createHash('sha256'), after = createHash('sha256'); let trajectories = 0;
    for (const style of ['balanced', 'striker', 'grappler'] as const) for (let seed = 1069; seed < 1079; seed++) for (let scenario = 0; scenario < 8; scenario++) {
      let expected = accepted.createCageFight(style, 'grappler', seed); expected.player.x = scenario === 1 ? 10 : 40; expected.cpu.x = scenario === 1 ? 90 : 46;
      if (scenario === 2) expected.position = 'clinch';
      if (scenario >= 3 && scenario <= 6) { expected.position = 'ground'; expected.top = scenario <= 4 ? 'player' : 'cpu'; expected.groundLevel = scenario % 2 === 0 ? 2 : 0; expected[expected.top].submission = scenario === 4 ? 94 : 0; }
      if (scenario === 7) expected.cpu.health = 0;
      let actual = copy(expected);
      for (let tick = 0; tick < 180; tick++) {
        const action = scenario === 4 && tick < 8 ? 'submit' : actions[(tick + seed) % actions.length];
        const input: CageInput = { move: scenario === 1 ? 1 : 0, guard: tick % 13 === 0, action: tick % 7 === 0 ? null : action };
        if (expected.phase === 'break') { expected = accepted.continueCageRound(expected); actual = current.continueCageRound(actual); }
        else { const cpu = tick % 4 === 0 ? blank : undefined; expected = accepted.stepCageFight(expected, input, cpu); actual = current.stepCageFight(actual, input, cpu); }
        before.update(JSON.stringify(expected)); after.update(JSON.stringify(actual));
      }
      expect(actual).toEqual(expected); trajectories++;
    }
    expect(trajectories).toBe(240); expect(after.digest('hex')).toBe(before.digest('hex'));
  }, 30000);

  it('describes all six real action buttons with visible hints and unchanged accessible names', () => {
    board(); const names = ['Jab', 'Heavy', 'Kick', 'Clinch', 'Submit', 'Step back'];
    expect(actions.map(action => hint(action).textContent)).toEqual(['Move closer', 'Move closer', 'Move closer', 'Move closer', 'Unavailable', 'Ready']);
    const ids = new Set<string>();
    for (const [index, action] of actions.entries()) {
      const button = screen.queryByRole('button', { name: names[index] }); expect(button).not.toBeNull();
      const span = hint(action); expect(button!.getAttribute('aria-describedby')).toBe(span.id); expect(document.getElementById(span.id)).toBe(span);
      expect(span.classList.contains('text-[10px]')).toBe(true); ids.add(span.id);
    }
    expect(ids.size).toBe(6);
  });

  it('keeps a held button active through recovering hints and lands the next actual strike', () => {
    board(true); approach(); const jab = screen.getByRole('button', { name: 'Jab' }) as HTMLButtonElement;
    expect(hint('jab').textContent).toBe('Ready'); fireEvent.keyDown(jab, { key: 'Enter' }); advance(2);
    expect(hud('hits')).toBe(1); expect(hint('jab').textContent).toBe('Recovering'); expect(jab.disabled).toBe(false);
    advance(10); expect(hud('hits')).toBe(2); expect(jab.disabled).toBe(false);
    fireEvent.keyUp(jab, { key: 'Enter' }); advance(2); const hits = hud('hits'); advance(12); expect(hud('hits')).toBe(hits);
    expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
  });

  it('shows drill restrictions and paused hints before ordinary readiness without advancing play', () => {
    const mounted = board(true); expect(hint('grapple').textContent).toBe('Not in drill'); expect(hint('submit').textContent).toBe('Not in drill');
    click('Pause'); expect(hint('jab').textContent).toBe('Paused'); expect(hint('grapple').textContent).toBe('Not in drill');
    const tick = screen.getByRole('region', { name: 'Cage Clash game' }).getAttribute('data-cage-tick'); advance(10);
    expect(screen.getByRole('region', { name: 'Cage Clash game' }).getAttribute('data-cage-tick')).toBe(tick);
    click('Resume'); expect(hint('jab').textContent).toBe('Move closer');
    mounted.rerender(<CageClashBoard onHelp={() => undefined} helpOpen />); expect(hint('jab').textContent).toBe('Paused');
    expect(recordCompletion).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });

  it('calculates repeated hints without editing resources scores or either fighter', () => {
    for (const position of ['standing', 'clinch', 'ground'] as const) {
      const state = closeFight(); state.position = position; state.top = position === 'ground' ? 'cpu' : null; state.player.stamina = 6; state.cpu.submission = 45;
      const bytes = JSON.stringify(state);
      for (let repeat = 0; repeat < 3; repeat++) for (const action of actions) for (const side of ['player', 'cpu'] as const) { cageActionCost(state, action, side); cageActionRange(action); cageActionReadiness(state, action, side); }
      expect(JSON.stringify(state)).toBe(bytes);
    }
  });

  it('preserves the accepted promotion world independently of readiness changes', () => {
    const state = newMmaPromotion('Independent baseline', 'readiness-baseline'); const bytes = JSON.stringify(state);
    expect(loadMmaPromotion(state)).toEqual(state); expect(JSON.stringify(state)).toBe(bytes); expect(state.history).toEqual([]);
    expect(state.cash).toBe(120000); expect(state.fighters.filter(fighter => fighter.contract > 0)).toHaveLength(12);
  });
});
