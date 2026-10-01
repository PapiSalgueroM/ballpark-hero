import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { buildRun, daySeed, lehmer, takeShot, type HoopResult } from '@/lib/buzzerBeater';
import { writeArcadeRun } from '@/lib/arcadeRecord';
import { recordCompletion } from '@/lib/completions';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

vi.mock('@/lib/buzzerBeater', async original => {
  const actual = await original<typeof import('@/lib/buzzerBeater')>();
  return { ...actual, takeShot: vi.fn(actual.takeShot) };
});
vi.mock('@/lib/arcadeRecord', async original => {
  const actual = await original<typeof import('@/lib/arcadeRecord')>();
  return { ...actual, writeArcadeRun: vi.fn(actual.writeArcadeRun) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => <div data-testid="recorded-share">Share recorded run</div> }));

const random = 0.125;
const practiceSeed = Math.floor(random * 2147483645) + 1;
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-09-30T17:00:00Z'));
  vi.clearAllMocks();
  consumeRestoredFinish('buzzer-beater');
  localStorage.clear();
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(Math, 'random').mockReturnValue(random);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.stubGlobal('PointerEvent', MouseEvent);
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  for (const name of ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture']) delete (Element.prototype as unknown as Record<string, unknown>)[name];
});

function advance(milliseconds: number) {
  act(() => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
    const pending = [...frames.values()]; frames.clear();
    for (const frame of pending) frame(now);
  });
}
function reduceMotion() {
  const original = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...original(query), matches: query.includes('prefers-reduced-motion') }));
}
function startPractice() {
  const view = render(<BuzzerBeaterBoard />);
  expect(screen.getByText(/Try Power 40, Arc 60 and Fade square/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Steady practice' }));
  return view;
}
const powerInput = () => {
  const input = document.querySelector<HTMLInputElement>('input[type="range"][aria-label="Power"]');
  expect(input, 'the labeled native power control is present').not.toBeNull();
  return input!;
};
function button(label: string) {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent?.trim() === label);
  expect(found, `actual ${label} button is present`).toBeDefined();
  return found!;
}
const board = (view: ReturnType<typeof render>) => view.container.querySelector('[data-arcade-phase]')!;
function actualShot() {
  const spy = vi.mocked(takeShot);
  return spy.mock.results.at(-1)!.value as HoopResult;
}
function shoot() { fireEvent.click(button('Shoot')); return actualShot(); }
function next(index: number) { fireEvent.click(button(index === 9 ? 'See the run' : 'Next shot')); }
function finishPractice(view: ReturnType<typeof render>) {
  const setups = buildRun(practiceSeed), rng = lehmer(practiceSeed ^ 0x5eed1234);
  let points = 0, made = 0;
  for (let index = 0; index < 10; index++) {
    const power = (12 + index * 4) / 100;
    fireEvent.change(powerInput(), { target: { value: power } });
    const expected = takeShot({ x: 0, arc: 0.6, power }, setups[index], rng);
    const actual = shoot();
    expect(actual, `actual path, spray and points on shot ${index + 1}`).toEqual(expected);
    points += expected.points; made += Number(expected.made);
    if (board(view).getAttribute('data-arcade-phase') === 'flying') advance(780);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
    expect(button(index === 9 ? 'See the run' : 'Next shot')).toHaveFocus();
    next(index);
  }
  return { points, made };
}

describe('Buzzer Beater steady practice', () => {
  it('keeps selected power through delayed and field Space inputs without charging or shooting', () => {
    const view = startPractice();
    fireEvent.change(powerInput(), { target: { value: 0.27 } });
    for (const slider of view.container.querySelectorAll('input[type="range"]')) {
      expect(fireEvent.keyDown(slider, { key: ' ' })).toBe(false);
    }
    fireEvent.keyDown(board(view), { key: ' ' });
    advance(5000);
    fireEvent.keyUp(board(view), { key: ' ' });
    expect(powerInput()).toHaveValue('0.27');
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('preserves continued child-capture drag and aim-only pointer release', () => {
    const view = startPractice();
    const court = view.container.querySelector('svg[role="img"]')!;
    vi.spyOn(court, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 360, height: 210 } as DOMRect);
    fireEvent.pointerDown(court.querySelector('circle')!, { clientX: 180, clientY: 100 });
    fireEvent(court.querySelector('circle')!, new Event('lostpointercapture', { bubbles: true }));
    fireEvent.pointerMove(court, { clientX: 200, clientY: 80 });
    fireEvent.pointerMove(court, { clientX: 220, clientY: 40 });
    expect(screen.getByRole('slider', { name: 'How high to put the arc on the shot' })).toHaveValue(String(1 - 40 / 210 * 1.35));
    expect(screen.getByRole('slider', { name: 'How far to fade off the closeout' })).toHaveValue(String((220 / 360 - 0.5) * 2.4));
    fireEvent.pointerUp(court, { clientX: 220, clientY: 40 });
    advance(1200);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(powerInput()).toHaveValue('0.4');
  });

  it('uses the exact seeded engine path and retains field arrow aim', () => {
    const view = startPractice();
    fireEvent.change(powerInput(), { target: { value: 0.31 } });
    fireEvent.keyDown(board(view), { key: 'ArrowRight' });
    fireEvent.keyDown(board(view), { key: 'ArrowUp' });
    const expected = takeShot({ x: 0.06, arc: 0.64, power: 0.31 }, buildRun(practiceSeed)[0], lehmer(practiceSeed ^ 0x5eed1234));
    expect(shoot()).toEqual(expected);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    advance(780);
    expect(screen.getByText(/Points/)).toHaveTextContent(`Points ${expected.points}`);
  });

  it('pauses rules and flight without consuming power or settling early', () => {
    const view = startPractice();
    fireEvent.change(powerInput(), { target: { value: 0.23 } });
    fireEvent.click(screen.getByRole('button', { name: 'Steady practice rules' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByText(/Try Power 40, Arc 60 and Fade square/)).toBeVisible();
    advance(3000);
    fireEvent.click(screen.getByRole('button', { name: "Let's Play!" }));
    advance(1);
    expect(screen.getByRole('button', { name: 'Steady practice rules' })).toHaveFocus();
    expect(powerInput()).toBeDisabled();
    expect(powerInput()).toHaveValue('0.23');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    shoot(); advance(200);
    fireEvent.click(screen.getByRole('button', { name: 'Steady practice rules' }));
    advance(5000);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    fireEvent.click(screen.getByRole('button', { name: "Let's Play!" }));
    advance(1);
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    advance(579);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'flying');
    advance(1);
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'shotEnd');
  }, 20000);

  it('finishes and replays ten actual shots without record, completion or recorded sharing', () => {
    const view = startPractice();
    const outcome = finishPractice(view);
    expect(screen.getByText(`${outcome.made} of 10 made`)).toBeVisible();
    expect(screen.getByText(new RegExp(`^${outcome.points} points`))).toBeVisible();
    expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(screen.queryByTestId('recorded-share')).toBeNull();
    expect(screen.getByRole('button', { name: 'Another practice run' })).toHaveFocus();
    expect(fireEvent.keyDown(button('Another practice run'), { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Another practice run' }));
    expect(powerInput()).toHaveFocus();
    expect(board(view)).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(screen.getByText(/Points/)).toHaveTextContent('Points 0');
  }, 20000);

  it('preserves a restored daily byte for byte across practice and returning to today', () => {
    reduceMotion();
    const date = getTodayET(), key = `buzzer-beater-daily-${date}`;
    const saved = JSON.stringify({ v: 1, date, score: 874, made: 4 });
    localStorage.setItem(key, saved);
    const view = startPractice();
    finishPractice(view);
    expect(localStorage.getItem(key)).toBe(saved);
    expect(recordCompletion).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: "Today's ten" }));
    expect(screen.getByText('4 of 10 made')).toBeVisible();
    expect(screen.getByText(/^874 points/)).toBeVisible();
    expect(localStorage.getItem(key)).toBe(saved);
    expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(screen.getByTestId('recorded-share')).toBeVisible();
  }, 20000);

  it.each(['daily', 'unlimited'] as const)('preserves %s charge, exact outcomes and existing bookkeeping', mode => {
    render(<BuzzerBeaterBoard />);
    const date = getTodayET(), seed = mode === 'daily' ? daySeed(date) : practiceSeed;
    const setups = buildRun(seed), rng = lehmer(seed ^ 0x5eed1234);
    fireEvent.click(screen.getByRole('button', { name: mode === 'daily' ? "Today's ten" : 'Unlimited' }));
    let points = 0, made = 0;
    for (let index = 0; index < 10; index++) {
      const expected = takeShot({ x: 0, arc: 0.6, power: 0.4 }, setups[index], rng);
      const hold = button('Hold to shoot');
      fireEvent.mouseDown(hold); fireEvent.mouseUp(hold);
      expect(actualShot()).toEqual(expected);
      points += expected.points; made += Number(expected.made);
      advance(780); next(index);
    }
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/buzzer-beater', points, null, made);
    expect(screen.getByTestId('recorded-share')).toBeVisible();
    if (mode === 'daily') {
      expect(writeArcadeRun).toHaveBeenCalledExactlyOnceWith('buzzer-beater', date, 'made', { score: points, count: made });
      expect(JSON.parse(localStorage.getItem(`buzzer-beater-daily-${date}`)!)).toEqual({ score: points, made, v: 1, date });
    } else {
      expect(writeArcadeRun).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
    }
  }, 20000);

  it('records an unlimited finish after returning to a restored daily without stale restore suppression', () => {
    reduceMotion();
    const date = getTodayET(), key = `buzzer-beater-daily-${date}`;
    const saved = JSON.stringify({ v: 1, date, score: 874, made: 4 });
    localStorage.setItem(key, saved);
    const view = startPractice();
    finishPractice(view);
    fireEvent.click(screen.getByRole('button', { name: "Today's ten" }));
    fireEvent.click(screen.getByRole('button', { name: 'Steady practice' }));
    finishPractice(view);
    fireEvent.click(screen.getByRole('button', { name: 'Unlimited' }));
    let points = 0, made = 0;
    for (let index = 0; index < 10; index++) {
      const hold = button('Hold to shoot');
      fireEvent.mouseDown(hold); fireEvent.mouseUp(hold);
      const result = actualShot(); points += result.points; made += Number(result.made);
      if (board(view).getAttribute('data-arcade-phase') === 'flying') advance(780);
      next(index);
    }
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/buzzer-beater', points, null, made);
    expect(writeArcadeRun).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBe(saved);
  }, 30000);
});
