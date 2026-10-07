import { installArcadePointers } from './arcadePointerFixture';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard';
import { buildRun, lehmer, takeShot, wallSpan, type Aim, type ShotResult } from '@/lib/freeKick';
import { writeArcadeRun } from '@/lib/arcadeRecord';
import { dailyRecordKey } from '@/lib/dailyRecord';
import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

vi.mock('@/lib/freeKick', async original => {
  const actual = await original<typeof import('@/lib/freeKick')>();
  return { ...actual, takeShot: vi.fn(actual.takeShot) };
});
vi.mock('@/lib/arcadeRecord', async original => {
  const actual = await original<typeof import('@/lib/arcadeRecord')>();
  return { ...actual, writeArcadeRun: vi.fn(actual.writeArcadeRun) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <div data-testid="recorded-share">{score}</div> }));

const RANDOM = .314159;
const SEED = Math.floor(RANDOM * 2147483645) + 1;
const DAY = '2026-09-30';
const DEFAULT: Aim = { x: 0, y: .5, power: .6, curve: 0 };
let realShot: typeof takeShot;
let pointers: ReturnType<typeof installArcadePointers>;
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

beforeEach(async () => {
  realShot = (await vi.importActual<typeof import('@/lib/freeKick')>('@/lib/freeKick')).takeShot;
  const records = await vi.importActual<typeof import('@/lib/arcadeRecord')>('@/lib/arcadeRecord');
  vi.mocked(takeShot).mockImplementation(realShot);
  vi.mocked(writeArcadeRun).mockImplementation(records.writeArcadeRun);
  vi.clearAllMocks(); consumeRestoredFinish('free-kick'); localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(RANDOM);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  pointers = installArcadePointers();
});
afterEach(() => { cleanup(); pointers.restore(); consumeRestoredFinish('free-kick'); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

type View = ReturnType<typeof render>;
const button = (name: string) => screen.getByRole('button', { name });
const board = (view: View) => view.container.querySelector('[data-arcade-phase]')!;
const pitch = (view: View) => view.container.querySelector('svg[role="img"]')!;
const power = () => screen.getByRole('slider', { name: 'Power' });
const bend = () => screen.getByRole('slider', { name: 'How much bend to put on the ball' });
function advance(milliseconds: number) {
  act(() => {
    now += milliseconds; vi.advanceTimersByTime(milliseconds);
    const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
  });
}
function reducedMotion(reduced = true) {
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: reduced && query.includes('prefers-reduced-motion'), media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
}
function enterLab(view = render(<FreeKickBoard />)) {
  fireEvent.click(button('Shot lab')); fireEvent.click(button('Start Shot lab')); advance(20);
  expect(board(view)).toHaveAttribute('data-arcade-mode', 'lab');
  return view;
}
function setAim(view: View, aim: Aim) {
  const surface = pitch(view);
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 360, bottom: 210, width: 360, height: 210, toJSON: () => ({}) });
  fireEvent.pointerDown(surface, { clientX: 180 + aim.x * 120, clientY: 150 - aim.y * 116, pointerId: 7, button: 0 });
  fireEvent.pointerUp(surface, { pointerId: 7 });
  fireEvent.change(power(), { target: { value: aim.power } });
  fireEvent.change(bend(), { target: { value: aim.curve } });
}
function expected(aim: Aim, index = 0) { return realShot(aim, buildRun(SEED)[index], lehmer((SEED ^ 0x5eed1234) + index * 7919)); }
function shoot() { fireEvent.click(button('Kick')); return vi.mocked(takeShot).mock.results.at(-1)!.value as ShotResult; }
function settle(view: View) {
  if (board(view).getAttribute('data-arcade-phase') === 'flying') advance(760);
  expect(board(view)).toHaveAttribute('data-arcade-phase', 'kickEnd');
}
const retry = () => fireEvent.click(button('Retry this kick'));
const drawnPoints = (path: ShotResult['path']) => path.map(p => `${60 + ((p.x + 1) / 2) * 240},${150 - p.y * 116}`).join(' ');
function expectDrawn(view: View, which: 'previous' | 'current', aim: Aim, result: ShotResult, attempt: number) {
  const card = view.container.querySelector(`[data-lab-shot="${which}"]`);
  expect(card, `${which} actual comparison exists`).not.toBeNull();
  expect(card!.getAttribute('data-lab-attempt')).toBe(String(attempt));
  const metric = (label: string) => within(card as HTMLElement).getByText(label, { selector: 'dt' }).nextElementSibling;
  expect(metric('Power')!.textContent).toBe(String(Math.round(aim.power * 100)));
  expect(metric('Bend')!.textContent).toBe(`${Math.round(Math.abs(aim.curve) * 100)} ${aim.curve < 0 ? 'left' : aim.curve > 0 ? 'right' : 'none'}`);
  expect(card!.textContent).toContain(result.scored ? 'Goal' : result.verdict);
  const path = result.hitWall ? result.path.slice(0, 12) : result.path;
  expect(view.container.querySelector(`[data-lab-path="${which}"]`)?.getAttribute('points')).toBe(drawnPoints(path));
  if (!result.hitWall && result.verdict !== 'Never had the legs.') {
    expect(metric('At goal line')).toHaveTextContent(`${Math.round(Math.abs(result.x) * 366)} cm ${result.x < 0 ? 'left' : 'right'} of centre`);
    expect(card).toHaveTextContent(`Height ${Math.round(result.y * 244)} cm`);
  }
}

describe('Free Kick Shot lab actual mounted outcomes', () => {
  it('shows instructions and a worked example before play and restores rule focus', () => {
    const view = render(<FreeKickBoard />);
    const opener = button('Shot lab'); opener.focus(); fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Shot lab rules'); expect(dialog).toHaveTextContent('Example:');
    expect(dialog).toHaveTextContent('Power 60'); expect(dialog).toHaveTextContent('Identical settings repeat exactly.');
    expect(board(view)).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' })); advance(20);
    expect(document.activeElement).toBe(opener);
    enterLab(view); expect(button('Kick')).toHaveFocus();
    expect(screen.getByText('Shot lab, no points')).toBeVisible();
    const rules = button('Shot lab rules'); fireEvent.click(rules);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' })); advance(20);
    expect(document.activeElement).toBe(rules); expect(board(view)).toHaveAttribute('data-arcade-paused', 'true');
  });

  it('retries identical real shots with every chosen setting retained', () => {
    const view = enterLab(); const aim: Aim = { x: .5, y: .75, power: .67, curve: -.24 };
    setAim(view, aim); const first = shoot(); expect(first).toEqual(expected(aim)); settle(view);
    expectDrawn(view, 'current', aim, first, 1); expect(button('Retry this kick')).toHaveFocus();
    for (let attempt = 2; attempt <= 3; attempt++) {
      retry(); expect((power() as HTMLInputElement).value).toBe('0.67'); expect((bend() as HTMLInputElement).value).toBe('-0.24');
      const next = shoot(); expect(next).toEqual(first); settle(view); expectDrawn(view, 'current', aim, next, attempt);
    }
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('compares only the latest two settled actual paths when bend changes', () => {
    const view = enterLab(); const aims = [DEFAULT, { ...DEFAULT, curve: .4 }, { ...DEFAULT, curve: -.4 }];
    const results: ShotResult[] = [];
    for (let index = 0; index < 3; index++) {
      if (index) retry(); setAim(view, aims[index]); results.push(shoot());
      expect(view.container.querySelectorAll('[data-lab-path]')).toHaveLength(Math.min(index, 2));
      settle(view); expect(results[index]).toEqual(expected(aims[index]));
    }
    expect(results[1].path).not.toEqual(results[0].path); expect(results[2].path).not.toEqual(results[1].path);
    expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(2);
    expectDrawn(view, 'previous', aims[1], results[1], 2); expectDrawn(view, 'current', aims[2], results[2], 3);
  });

  it('changes and wraps the actual setup ladder with fresh comparison and attempt counts', () => {
    reducedMotion(); const view = enterLab();
    for (let index = 0; index <= 10; index++) {
      expect(board(view).getAttribute('data-lab-setup')).toBe(String(index % 10 + 1));
      expect(board(view).getAttribute('data-lab-attempt')).toBe('0');
      expect(view.container.querySelectorAll('[data-lab-shot], [data-lab-path]')).toHaveLength(0);
      const result = shoot(); expect(result).toEqual(expected(DEFAULT, index % 10)); settle(view);
      expectDrawn(view, 'current', DEFAULT, result, 1);
      fireEvent.click(button('Change setup'));
    }
  });

  it('stops wall traces at real contact and omits imaginary goal crossing readings', () => {
    reducedMotion(); const view = enterLab(); shoot(); fireEvent.click(button('Change setup'));
    const setup = buildRun(SEED)[1]; const wall = wallSpan(setup)!;
    const blockedAim: Aim = { x: wall.hi > 0 ? .25 : -.25, y: 0, power: .7, curve: 0 };
    const blocked = expected(blockedAim, 1); expect(blocked.hitWall).toBe(true); expect(blocked.path).toHaveLength(25);
    setAim(view, blockedAim); expect(shoot()).toEqual(blocked); settle(view);
    expectDrawn(view, 'current', blockedAim, blocked, 1);
    const card = view.container.querySelector('[data-lab-shot="current"]')!;
    expect(card.textContent).toContain('Stopped at wall. No goal crossing.');
    expect(card.querySelector('[data-lab-arrival-reading]')).toBeNull();
    const endpoint = blocked.path[11];
    expect(pitch(view).querySelector('circle[fill="white"]')).toHaveAttribute('cx', String(60 + (endpoint.x + 1) * 120));
    retry(); const weakAim = { ...DEFAULT, power: .25 }; setAim(view, weakAim);
    const weak = shoot(); expect(weak.verdict).toBe('Never had the legs.'); settle(view);
    expect(view.container.querySelector('[data-lab-shot="current"]')).toHaveTextContent('Too weak to reach goal. No goal crossing.');
    expect(view.container.querySelector('[data-lab-shot="current"] [data-lab-arrival-reading]')).toBeNull();
  });

  it('routes delayed aim drags sliders and keyboard without charging or accidental kicks', () => {
    const view = enterLab(); const aim = { ...DEFAULT, x: .5, y: .75, power: .71, curve: .24 };
    setAim(view, aim); advance(1800); expect(power()).toHaveValue('0.71'); expect(takeShot).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(power(), { key: ' ' })).toBe(false);
    fireEvent.keyUp(power(), { key: ' ' }); fireEvent.keyDown(bend(), { key: 'ArrowLeft' });
    expect(takeShot).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(button('Kick'), { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.keyDown(pitch(view), { key: ' ' }); fireEvent.keyDown(pitch(view), { key: ' ', repeat: true }); fireEvent.keyUp(pitch(view), { key: ' ' });
    expect(takeShot).toHaveBeenCalledTimes(1); expect(vi.mocked(takeShot).mock.calls[0][0]).toEqual(aim); settle(view);
  });

  it('holds the actual remaining flight through rules pause blur and unmount', () => {
    const view = enterLab(); shoot(); advance(200);
    const ball = () => pitch(view).querySelector('circle[fill="white"]')!.outerHTML;
    const stopped = ball(); fireEvent.click(button('Shot lab rules')); advance(5000);
    expect(ball()).toBe(stopped); expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: ' ' }); expect(takeShot).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' })); advance(20);
    fireEvent.click(button('Resume')); advance(100); fireEvent.blur(window); const blurred = ball(); advance(5000);
    expect(ball()).toBe(blurred); expect(board(view)).toHaveAttribute('data-arcade-paused', 'true');
    fireEvent.click(button('Resume')); advance(399); expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    advance(1); expect(board(view)).toHaveAttribute('data-arcade-phase', 'kickEnd');
    retry(); shoot(); expect(frames.size).toBeGreaterThan(0); view.unmount(); expect(frames.size).toBe(0);
    advance(2000); expect(recordCompletion).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled();
  });

  it('locks duplicate releases before a render with both motion preferences', () => {
    for (const reduced of [false, true]) {
      reducedMotion(reduced); const view = enterLab(); const kick = button('Kick'); vi.mocked(takeShot).mockClear();
      act(() => { fireEvent.click(kick); fireEvent.click(kick); fireEvent.keyDown(pitch(view), { key: ' ', repeat: true }); });
      expect(takeShot).toHaveBeenCalledTimes(1); settle(view);
      expect(view.container.querySelectorAll('[data-lab-shot]')).toHaveLength(1);
      expect(board(view)).toHaveAttribute('data-lab-attempt', '1'); view.unmount(); advance(20);
    }
  });

  it('keeps a saved Daily byte identical without lab points records shares or completions', () => {
    reducedMotion(); writeArcadeRun('free-kick', DAY, 'goals', { score: 876, count: 4 });
    const key = dailyRecordKey('free-kick', DAY); const saved = localStorage.getItem(key);
    vi.mocked(writeArcadeRun).mockClear(); const writes = vi.spyOn(Storage.prototype, 'setItem'); const network = vi.fn(); vi.stubGlobal('fetch', network);
    const view = enterLab();
    for (let index = 0; index < 4; index++) { shoot(); settle(view); expect(screen.queryByTestId('recorded-share')).toBeNull(); fireEvent.click(button(index % 2 ? 'Change setup' : 'Retry this kick')); }
    expect(board(view)).not.toHaveTextContent(/Points|Scored/);
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writeArcadeRun).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBe(saved);
    fireEvent.click(button('Back to modes')); advance(20);
    expect(board(view)).toHaveAttribute('data-arcade-mode', 'daily'); expect(board(view)).toHaveAttribute('data-arcade-phase', 'done');
    expect(screen.queryByText('4 of 10 scored')).not.toBeNull(); expect(screen.getByTestId('recorded-share')).toHaveTextContent('4/10 free kicks for 876 points');
    expect(button('Shot lab')).toHaveFocus(); expect(recordCompletion).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled(); expect(localStorage.getItem(key)).toBe(saved);
  });

  it('retains original Unlimited engine results and its single earned completion independently', () => {
    reducedMotion(); const view = render(<FreeKickBoard />); fireEvent.click(button('Unlimited'));
    const rng = lehmer(SEED ^ 0x5eed1234); const shots = buildRun(SEED).map(setup => realShot(DEFAULT, setup, rng));
    for (let index = 0; index < 10; index++) {
      const held = button('Hold to strike'); fireEvent.pointerDown(held, { pointerId: 7, button: 0 }); fireEvent.pointerUp(held, { pointerId: 7 });
      expect(vi.mocked(takeShot).mock.results[index].value).toEqual(shots[index]);
      fireEvent.click(button(index === 9 ? 'See the run' : 'Next kick'));
    }
    const score = shots.reduce((sum, shot) => sum + shot.points, 0); const goals = shots.filter(shot => shot.scored).length;
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'done'); expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/free-kick', score, null, goals); expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(screen.getByTestId('recorded-share')).toHaveTextContent(`${goals}/10 free kicks for ${score} points`);
    expect(view.container.querySelector('[data-lab-comparison]')).toBeNull();
  });
});
