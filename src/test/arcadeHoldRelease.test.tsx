import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { takeShot as kickShot } from '@/lib/freeKick';
import { takeShot as hoopShot } from '@/lib/buzzerBeater';

vi.mock('@/lib/freeKick', async original => {
  const actual = await original<typeof import('@/lib/freeKick')>();
  return { ...actual, takeShot: vi.fn(actual.takeShot) };
});
vi.mock('@/lib/buzzerBeater', async original => {
  const actual = await original<typeof import('@/lib/buzzerBeater')>();
  return { ...actual, takeShot: vi.fn(actual.takeShot) };
});
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, options: PointerEventInit = {}) {
    super(type, options);
    this.pointerId = options.pointerId ?? 7;
    this.isPrimary = options.isPrimary ?? true;
  }
}

let captured: Map<number, Element>;
const originalCapture = new Map<string, PropertyDescriptor | undefined>();
const games = [
  { name: 'Free Kick', Component: FreeKickBoard, hold: 'Hold to strike', release: 'Release to strike', next: 'Next kick', end: 'kickEnd', shot: kickShot },
  { name: 'Buzzer Beater', Component: BuzzerBeaterBoard, hold: 'Hold to shoot', release: 'Release to shoot', next: 'Next shot', end: 'shotEnd', shot: hoopShot },
] as const;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-01T17:00:00Z'));
  vi.clearAllMocks();
  localStorage.clear();
  captured = new Map();
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  vi.spyOn(Math, 'random').mockReturnValue(.125);
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  }));
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: 360, bottom: 210, width: 360, height: 210, toJSON() {},
  });
  for (const name of ['setPointerCapture', 'hasPointerCapture', 'releasePointerCapture']) {
    originalCapture.set(name, Object.getOwnPropertyDescriptor(Element.prototype, name));
  }
  Object.defineProperties(Element.prototype, {
    setPointerCapture: { configurable: true, value: function (this: Element, id: number) { captured.set(id, this); } },
    hasPointerCapture: { configurable: true, value: function (this: Element, id: number) { return captured.get(id) === this; } },
    releasePointerCapture: { configurable: true, value: function (this: Element, id: number) { if (captured.get(id) === this) captured.delete(id); } },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const [name, descriptor] of originalCapture) {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
    else delete (Element.prototype as unknown as Record<string, unknown>)[name];
  }
  originalCapture.clear();
});

function start(game: typeof games[number], surface: string) {
  const view = render(<game.Component />);
  fireEvent.click(screen.getByRole('button', { name: 'Unlimited' }));
  const target = surface === 'surface' ? view.container.querySelector('svg[role="img"]')! : screen.getByRole('button', { name: game.hold });
  const board = view.container.querySelector('[data-arcade-phase]')!;
  return { view, target, board };
}

function down(target: Element, options: PointerEventInit = {}) {
  const event = { pointerId: 7, isPrimary: true, button: 0, clientX: 180, clientY: 80, ...options };
  fireEvent.pointerDown(target, event);
  // A primary mouse pointer also generates the existing compatible mouse event.
  if (event.isPrimary) fireEvent.mouseDown(target, { button: event.button });
}

function releaseOutside(id = 7) {
  const target = captured.get(id) ?? document.body;
  fireEvent.pointerUp(target, { pointerId: id, isPrimary: true, button: 0 });
  fireEvent.mouseUp(target, { button: 0 });
}

const advance = (ms = 96) => act(() => { vi.advanceTimersByTime(ms); });
const power = (board: Element) => board.textContent?.match(/(?:Power|Strength)(\d+)/)?.[1];

describe.each(games)('$name pointer charge ownership', game => {
  it.each(['button', 'surface'])('settles one real shot after leaving the %s and releasing', surface => {
    const { target, board } = start(game, surface);
    down(target); advance();
    vi.mocked(game.shot).mockClear();
    releaseOutside();
    expect(board).toHaveAttribute('data-arcade-phase', game.end);
    expect(game.shot).toHaveBeenCalledTimes(1);
    const result = vi.mocked(game.shot).mock.results[0].value;
    expect(board.textContent).toMatch(new RegExp(`Points\\s*${result.points}(?:\\D|$)`));
    expect(captured.size).toBe(0);
    releaseOutside(); advance(1000);
    expect(game.shot).toHaveBeenCalledTimes(1);
    expect(board).toHaveAttribute('data-arcade-phase', game.end);
  });

  it.each(['button', 'surface'])('cancels a %s hold without a shot and allows a fresh hold', surface => {
    const { target, board } = start(game, surface);
    down(target); advance();
    fireEvent.pointerCancel(target, { pointerId: 7, isPrimary: true });
    const stopped = power(board);
    vi.mocked(game.shot).mockClear();
    advance(300);
    expect(power(board)).toBe(stopped);
    expect(game.shot).not.toHaveBeenCalled();
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(captured.size).toBe(0);
    down(target); advance(); vi.mocked(game.shot).mockClear(); releaseOutside();
    expect(board).toHaveAttribute('data-arcade-phase', game.end);
    expect(game.shot).toHaveBeenCalledTimes(1);
  });

  it.each(['button', 'surface'])('cancels lost capture from the %s without a shot', surface => {
    const { target, board } = start(game, surface);
    down(target); advance(); captured.delete(7);
    fireEvent.lostPointerCapture(target, { pointerId: 7, isPrimary: true });
    const stopped = power(board);
    vi.mocked(game.shot).mockClear(); advance(300);
    expect(power(board)).toBe(stopped);
    expect(game.shot).not.toHaveBeenCalled();
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
  });

  for (const surface of ['button', 'surface']) for (const [kind, event] of [
    ['secondary pointer', { pointerId: 8, isPrimary: false, button: 0 }],
    ['right mouse button', { pointerId: 7, isPrimary: true, button: 2 }],
  ] as const) it(`ignores ${kind} on the ${surface}`, () => {
    const { target, board } = start(game, surface);
    const initial = power(board);
    down(target, event); advance(300);
    expect(power(board)).toBe(initial);
    expect(captured.size).toBe(0);
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
  });

  it.each(['button', 'surface'])('keeps the %s hold until its own pointer releases', surface => {
    const { target, board } = start(game, surface);
    down(target); advance(); vi.mocked(game.shot).mockClear();
    fireEvent.pointerUp(target, { pointerId: 8, isPrimary: false, button: 0 });
    expect(board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(game.shot).not.toHaveBeenCalled();
    expect(captured.get(7)).toBe(target);
    releaseOutside();
    expect(board).toHaveAttribute('data-arcade-phase', game.end);
    expect(game.shot).toHaveBeenCalledTimes(1);
  });

  it('releases its owned pointer on unmount without settling an abandoned shot', () => {
    const { view, target } = start(game, 'button');
    down(target); advance();
    expect(captured.get(7)).toBe(target);
    vi.mocked(game.shot).mockClear(); view.unmount(); advance(1000);
    expect(captured.size).toBe(0);
    expect(game.shot).not.toHaveBeenCalled();
    const fresh = start(game, 'button');
    expect(fresh.board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(power(fresh.board)).toBe(game.name === 'Free Kick' ? '60' : '40');
  });

  it('keeps keyboard and primary mouse pointer charging independent', () => {
    const { target, board } = start(game, 'button');
    fireEvent.keyDown(target, { key: ' ' }); advance(); vi.mocked(game.shot).mockClear();
    fireEvent.keyUp(target, { key: ' ' });
    expect(board).toHaveAttribute('data-arcade-phase', game.end);
    expect(game.shot).toHaveBeenCalledTimes(1);
    expect(captured.size).toBe(0);
    cleanup();
    const next = start(game, 'button');
    down(next.target); advance(); vi.mocked(game.shot).mockClear();
    fireEvent.pointerUp(next.target, { pointerId: 7, isPrimary: true, button: 0 });
    expect(next.board).toHaveAttribute('data-arcade-phase', game.end);
    expect(game.shot).toHaveBeenCalledTimes(1);
  });

  it('shows release feedback only during a held pointer or key and restores it on cancellation', () => {
    const { target, board } = start(game, 'button');
    expect(target).toHaveTextContent(game.hold);
    down(target);
    expect(target).toHaveTextContent(game.release);
    expect(target).toHaveClass('ring-2');
    fireEvent.pointerCancel(target, { pointerId: 7, isPrimary: true });
    expect(target).toHaveTextContent(game.hold);
    expect(target).not.toHaveClass('ring-2');
    fireEvent.keyDown(target, { key: ' ' });
    expect(target).toHaveTextContent(game.release);
    fireEvent.keyUp(target, { key: ' ' });
    expect(board).toHaveAttribute('data-arcade-phase', game.end);
    fireEvent.click(screen.getByRole('button', { name: game.next }));
    const fresh = screen.getByRole('button', { name: game.hold });
    expect(fresh).not.toHaveClass('ring-2');
    fireEvent.pointerDown(fresh, { pointerId: 8, isPrimary: false });
    expect(fresh).toHaveTextContent(game.hold);
  });
});
