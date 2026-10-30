import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { takeShot } from '@/lib/buzzerBeater';

vi.mock('@/lib/buzzerBeater', async original => {
  const actual = await original<typeof import('@/lib/buzzerBeater')>();
  return { ...actual, takeShot: vi.fn(actual.takeShot) };
});
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const modes = ['daily', 'unlimited', 'contest'] as const;
const inputs = ['global-space', 'button-space', 'button-enter'] as const;
const signals = ['window-blur', 'document-hidden'] as const;
const cases = modes.flatMap(mode => inputs.flatMap(input => signals.map(signal => ({
  id: mode + '-' + input + '-' + signal, mode, input, signal,
}))));
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();
let visibility: DocumentVisibilityState = 'visible';
let visibilityDescriptor: PropertyDescriptor | undefined;
let hiddenDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-10-01T17:00:00Z'));
  vi.clearAllMocks();
  localStorage.clear();
  now = 0;
  frameId = 0;
  frames = new Map();
  visibility = 'visible';
  visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => visibility === 'hidden' });
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
});

afterEach(() => {
  cleanup();
  for (const [name, descriptor] of [
    ['visibilityState', visibilityDescriptor], ['hidden', hiddenDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(document, name, descriptor);
    else delete (document as unknown as Record<string, unknown>)[name];
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function advance(milliseconds: number, drawFrame = true) {
  act(() => {
    now += milliseconds;
    vi.advanceTimersByTime(milliseconds);
    if (drawFrame) {
      const pending = [...frames.values()];
      frames.clear();
      for (const frame of pending) frame(now);
    }
  });
}

function interrupt(signal: typeof signals[number]) {
  if (signal === 'window-blur') fireEvent.blur(window);
  else {
    visibility = 'hidden';
    fireEvent(document, new Event('visibilitychange'));
  }
}

function returnToPage(signal: typeof signals[number]) {
  if (signal === 'window-blur') fireEvent.focus(window);
  else {
    visibility = 'visible';
    fireEvent(document, new Event('visibilitychange'));
  }
}

function power(board: Element) {
  const value = board.textContent?.match(/Strength\s*(\d+)/)?.[1];
  expect(value, 'visible strength readout').toBeDefined();
  return Number(value);
}

function counters() {
  return {
    shot: screen.getByText(/^Shot\s/).textContent,
    made: screen.getByText(/^Made/).textContent,
    points: screen.getByText(/^Points/).textContent,
    records: Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
      .sort().map(key => [key, localStorage.getItem(key)]),
  };
}

describe('Buzzer Beater keyboard charge interruptions', () => {
  it.each(cases)('$id cancels charge before stale key release', ({ id, mode, input, signal }) => {
    const view = render(<BuzzerBeaterBoard />);
    const label = mode === 'daily' ? "Today's ten" : mode === 'unlimited' ? 'Unlimited' : 'Three-point contest';
    fireEvent.click(screen.getByRole('button', { name: label }));
    const board = view.container.querySelector('[data-arcade-phase]')!;
    const hold = screen.getByRole('button', { name: 'Hold to shoot' });
    const key = input === 'button-enter' ? 'Enter' : ' ';
    if (input === 'global-space') {
      act(() => { (document.activeElement as HTMLElement | null)?.blur(); });
      expect(document.activeElement).toBe(document.body);
    } else {
      act(() => hold.focus());
      expect(document.activeElement).toBe(hold);
    }
    const target = input === 'global-space' ? document.body : hold;
    expect(board).toHaveAttribute('data-arcade-mode', mode);
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(board).toHaveAttribute('data-arcade-paused', 'false');
    expect(screen.getByText(/^Shot\s/)).toHaveTextContent(mode === 'contest' ? /^Shot\s*1\s*\/25$/ : /^Shot\s*1\s*\/10$/);
    expect(screen.getByText(/^Made/)).toHaveTextContent(/^Made\s*0$/);
    expect(screen.getByText(/^Points/)).toHaveTextContent(/^Points\s*0$/);
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
    const before = counters();
    const initialPower = power(board);
    fireEvent.keyDown(target, { key });
    advance(96);
    expect(hold).toHaveTextContent(/^Release to shoot$/);
    expect(power(board)).not.toBe(initialPower);
    interrupt(signal);
    advance(80);

    expect(hold.textContent, 'BUZZER_INTERRUPTION_CANCELLED:' + id).toBe('Hold to shoot');
    const stoppedPower = power(board);
    vi.mocked(takeShot).mockClear();
    advance(160);
    expect(power(board)).toBe(stoppedPower);
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(board).toHaveAttribute('data-arcade-paused', 'false');
    expect(counters()).toEqual(before);
    expect(takeShot).not.toHaveBeenCalled();
    returnToPage(signal);
    fireEvent.keyDown(target, { key, repeat: true });
    fireEvent.keyUp(target, { key });
    advance(100);
    expect(hold).toHaveTextContent(/^Hold to shoot$/);
    expect(power(board)).toBe(stoppedPower);
    expect(counters()).toEqual(before);
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(takeShot).not.toHaveBeenCalled();

    fireEvent.keyDown(target, { key });
    advance(96);
    expect(hold).toHaveTextContent(/^Release to shoot$/);
    expect(power(board)).not.toBe(stoppedPower);
    // Aiming renders call the real engine for a neutral-RNG preview.
    vi.mocked(takeShot).mockClear();
    fireEvent.keyUp(target, { key });
    expect(board).toHaveAttribute('data-arcade-phase', 'flying');
    expect(takeShot).toHaveBeenCalledTimes(1);
    const shot = vi.mocked(takeShot).mock.results[0].value;
    const backup = signal === 'document-hidden';
    advance(200, !backup);
    interrupt(signal);
    returnToPage(signal);
    advance(backup ? 639 : 579, !backup);
    expect(board).toHaveAttribute('data-arcade-phase', 'flying');
    expect(board).toHaveAttribute('data-arcade-paused', 'false');
    expect(counters()).toEqual(before);
    const staleFrames = [...frames.values()];
    advance(1, !backup);
    expect(board).toHaveAttribute('data-arcade-phase', 'shotEnd');
    expect(view.container.querySelectorAll('[data-arcade-feedback]')).toHaveLength(1);
    expect(screen.getByText(/^Made/)).toHaveTextContent(new RegExp('^Made\\s*' + Number(shot.made) + '$'));
    // The first Contest ball is worth one; other modes display the actual engine result.
    const points = mode === 'contest' ? Number(shot.made) : shot.points;
    expect(screen.getByText(/^Points/)).toHaveTextContent(new RegExp('^Points\\s*' + points + '$'));
    expect(counters().shot).toBe(before.shot);
    expect(counters().records).toEqual(before.records);
    const settled = counters();
    act(() => { for (const frame of staleFrames) frame(now + 1000); });
    fireEvent.keyUp(window, { key });
    advance(1000);
    expect(board).toHaveAttribute('data-arcade-phase', 'shotEnd');
    expect(counters()).toEqual(settled);
    expect(takeShot).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });
});
