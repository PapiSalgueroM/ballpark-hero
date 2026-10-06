/* Round 1032: the actual Through Ball board, played through its own inputs.
   scripts/simThroughBallDrill.mjs runs this beside the rules tests. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import ThroughBallBoard from '@/components/soccer-career/ThroughBallBoard';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import { buildThroughBallRun, crossTime, passTarget, perfectThroughBall, runnerAt, takeThroughBall, throughBallDeadline } from '@/lib/throughBallDrill';
import { DRILL_META, drillSeed, applyDrillResult } from '@/lib/careerDrills';
import { dailyRecordKey, writeDailyRecord } from '@/lib/dailyRecord';
import { getTodayET } from '@/lib/dateUtils';
import type { CareerState } from '@/lib/soccerCareerEngine';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  constructor(type: string, options: PointerEventInit = {}) { super(type, options); this.pointerId = options.pointerId ?? 7; }
}

type View = ReturnType<typeof render>;
const DATE = '2026-10-06';
const KEY = dailyRecordKey(DRILL_META.throughball.slug, DATE);
const fixture = (position = 'CM') => ({ position, overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState);
const callbacks = () => ({ onBank: vi.fn(), onBack: vi.fn() });
const draw = (handlers = callbacks(), canBank = true, career = fixture()) => render(<ThroughBallBoard career={career} canBank={canBank} {...handlers} />);
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const saved = () => JSON.parse(localStorage.getItem(KEY)!);
const setups = () => buildThroughBallRun(drillSeed('throughball', getTodayET()));
const click = (view: View, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const start = (view: View, mode: 'daily' | 'practice' = 'daily') => click(view, mode === 'daily' ? /(?:Play|Resume) today/ : 'Practice, no banking');
const board = (view: View) => view.container.querySelector('[data-through-ball-board]')!;
const pitch = (view: View) => {
  const svg = view.container.querySelector('svg[role="img"]')!;
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 360, height: 240, right: 360, bottom: 240, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
  return svg;
};
/** Drag to a spot and let go, in board units (the pitch is mocked to 360 by 240 pixels). */
const dragTo = (view: View, spot: { x: number; y: number }, release = true) => {
  const svg = pitch(view);
  fireEvent.pointerDown(svg, { pointerId: 7, clientX: spot.x, clientY: spot.y });
  fireEvent.pointerMove(svg, { pointerId: 7, clientX: spot.x, clientY: spot.y });
  if (release) fireEvent.pointerUp(svg, { pointerId: 7, clientX: spot.x, clientY: spot.y });
};
const perfectSpot = (index: number) => { const p = perfectThroughBall(setups()[index]); return passTarget(p.angle, p.weight); };
/** Play ball `index` of today's ten: the perfect pass on the cue, or offside. */
const settle = (view: View, index: number, won = true) => {
  const setup = setups()[index];
  click(view, 'Start run');
  if (won) { advance(setup.cue * 1000); dragTo(view, perfectSpot(index)); }
  else { advance((crossTime(setup) + 0.05) * 1000); click(view, 'Play it'); }
  expect(view.container.querySelector('[data-through-verdict]')).toHaveAttribute('data-through-verdict', won ? 'through' : 'offside');
  click(view, index < 9 ? 'Next ball' : 'See session');
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });

describe('actual Through Ball board', () => {
  it('deals Through Ball to CM and CAM in the training ground, with rules before play', () => {
    for (const position of ['CM', 'CAM']) {
      const onDrill = vi.fn(); const onComplete = vi.fn();
      const view = render(<TrainingPanel career={fixture(position)} available={false} onDrill={onDrill} onComplete={onComplete} onClose={vi.fn()} />);
      const tile = view.getByRole('button', { name: /Through Ball/ });
      expect(tile.textContent).toContain(`Your ${position} drill. Trains Passing.`);
      expect(view.queryByRole('button', { name: /Wall Shot/ })).toBeNull();
      fireEvent.click(tile);
      expect(view.getByText(/Ten runs\. Your runner starts onside/)).toBeVisible();
      expect(view.getByText(/Example:/)).toBeVisible();
      expect(view.queryByRole('button', { name: 'Play it' })).toBeNull();
      start(view);
      expect(view.getByRole('button', { name: 'Start run' })).toBeEnabled();
      expect(onDrill).not.toHaveBeenCalled(); expect(onComplete).not.toHaveBeenCalled();
      cleanup();
    }
    const striker = render(<TrainingPanel career={fixture('ST')} available onDrill={vi.fn()} onComplete={vi.fn()} onClose={vi.fn()} />);
    expect(striker.getByRole('button', { name: /Wall Shot/ })).toBeInTheDocument();
    expect(striker.queryByRole('button', { name: /Through Ball/ })).toBeNull();
  });

  it('drags and releases the exact engine pass on the live clock, checkpointing once', () => {
    const view = draw(); start(view);
    const setup = setups()[0];
    dragTo(view, { x: 20, y: 20 });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(board(view)).toHaveAttribute('data-phase', 'ready');
    click(view, 'Start run'); advance(setup.cue * 1000);
    dragTo(view, perfectSpot(0));
    const verdict = view.container.querySelector('[data-through-verdict]');
    expect(verdict).toHaveAttribute('data-through-verdict', 'through');
    expect(saved()).toMatchObject({ v: 1, date: DATE, rounds: 1, count: 1, score: 10, banked: false });
    expect(board(view)).toHaveAttribute('data-phase', 'resolve');
    const target = view.container.querySelector('[data-aim-target]')!;
    expect(Number(target.getAttribute('cx'))).toBeCloseTo(perfectSpot(0).x, 0);
    advance(800);
    expect(board(view)).toHaveAttribute('data-phase', 'roundEnd');
    const ball = view.container.querySelector('[data-through-ball]')!;
    expect(Number(ball.getAttribute('cx'))).toBeCloseTo(Number(target.getAttribute('cx')), 3);
    expect(Number(ball.getAttribute('cy'))).toBeCloseTo(Number(target.getAttribute('cy')), 3);
    expect(saved().rounds).toBe(1);
  });

  it('aims from the keyboard on the pitch only, and Space starts and plays', () => {
    const view = draw(); start(view);
    const field = view.getByRole('group', { name: /Through Ball pitch/ }); field.focus();
    for (let i = 0; i < 3; i++) fireEvent.keyDown(field, { key: 'ArrowRight' });
    fireEvent.keyDown(field, { key: 'ArrowUp' });
    expect(view.container.querySelector('[data-through-clock]')!.textContent).toContain('6° right · weight 57%');
    fireEvent.keyDown(field, { key: 'ArrowRight', repeat: true });
    expect(view.container.querySelector('[data-through-clock]')!.textContent).toContain('6° right');
    const play = view.getByRole('button', { name: 'Start run' });
    expect(fireEvent.keyDown(play, { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.keyDown(field, { key: ' ', code: 'Space' });
    expect(board(view)).toHaveAttribute('data-phase', 'playing');
    advance(300);
    fireEvent.keyDown(field, { key: ' ', code: 'Space' });
    const expected = takeThroughBall({ angle: 6, weight: 0.57, press: 0.3 }, setups()[0]);
    expect(view.container.querySelector('[data-through-verdict]')).toHaveAttribute('data-through-verdict', expected.outcome);
    expect(saved()).toMatchObject({ rounds: 1, count: Number(expected.won) });
    expect(field).toHaveFocus();
  });

  it('calls a pass after the line offside, and settles a run nobody played as offside', () => {
    const view = draw(); start(view);
    settle(view, 0, false);
    expect(saved()).toMatchObject({ rounds: 1, count: 0, score: 0 });
    click(view, 'Start run'); advance(throughBallDeadline(setups()[1]) * 1000 + 50);
    expect(view.getByText('Offside. He was past the line when you played it.')).toBeVisible();
    expect(saved()).toMatchObject({ rounds: 2, count: 0 });
    advance(5000); expect(saved().rounds).toBe(2);
  });

  it('freezes the run on Pause, hidden tabs and reopened rules, and needs Resume', () => {
    const view = draw(); start(view); const setup = setups()[0];
    click(view, 'Start run'); advance((setup.hold + 0.3) * 1000); click(view, 'Pause');
    const runner = view.container.querySelector('[data-runner]')!; const pausedY = runner.getAttribute('cy');
    advance(9000); expect(view.getByRole('button', { name: 'Play it' })).toBeDisabled();
    expect(localStorage.getItem(KEY)).toBeNull(); expect(runner.getAttribute('cy')).toBe(pausedY);
    click(view, 'Resume'); advance(100);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); fireEvent(document, new Event('visibilitychange'));
    advance(9000); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); fireEvent(document, new Event('visibilitychange'));
    expect(view.getByRole('button', { name: 'Resume' })).toBeEnabled();
    click(view, 'Resume'); click(view, 'Through Ball rules');
    const dialog = view.getByRole('dialog', { name: 'Through Ball rules' });
    expect(within(dialog).getByText(/Example:/)).toBeVisible();
    fireEvent.keyDown(dialog, { key: ' ', code: 'Space' }); advance(9000);
    expect(localStorage.getItem(KEY)).toBeNull();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(view.queryByRole('dialog')).toBeNull();
    click(view, 'Resume'); advance((setup.cue - setup.hold - 0.4) * 1000);
    dragTo(view, perfectSpot(0));
    expect(saved()).toMatchObject({ rounds: 1, count: 1 });
  });

  it('completes ten, blocks a daily replay and banks Passing once before the callback', () => {
    const handlers = callbacks(); const career = fixture();
    handlers.onBank.mockImplementation((kind, count) => {
      expect(saved()).toMatchObject({ rounds: 10, count: 8, score: 80, banked: true });
      expect(applyDrillResult(career, kind, count).statBoostNextSeason?.passing).toBe(2);
    });
    const view = draw(handlers); start(view);
    for (let index = 0; index < 10; index++) settle(view, index, index < 8);
    expect(saved()).toMatchObject({ rounds: 10, count: 8, score: 80, banked: false });
    expect(view.getByText('+2 Passing with next season’s growth.')).toBeVisible();
    click(view, 'Bank the session');
    expect(handlers.onBank).toHaveBeenCalledExactlyOnceWith('throughball', 8);
    view.rerender(<ThroughBallBoard career={applyDrillResult(career, 'throughball', 8)} canBank={false} {...handlers} />);
    click(view, 'Daily / practice menu'); click(view, 'View today’s result');
    expect(view.queryByRole('button', { name: 'Start run' })).toBeNull();
    expect(view.getByText('Session banked.')).toBeVisible();
    click(view, 'Back to drills'); expect(handlers.onBack).toHaveBeenCalledTimes(1);
    view.unmount(); const reloaded = draw(handlers, false); click(reloaded, 'View today’s result');
    expect(reloaded.getByText('Session banked.')).toBeVisible(); expect(handlers.onBank).toHaveBeenCalledTimes(1);
  });

  it('keeps practice apart from the saved daily and never banks it', () => {
    writeDailyRecord(DRILL_META.throughball.slug, DATE, { rounds: 4, count: 3, score: 30, banked: false });
    const before = localStorage.getItem(KEY); const handlers = callbacks(); const view = draw(handlers);
    start(view, 'practice');
    for (let index = 0; index < 10; index++) { click(view, 'Start run'); click(view, 'Play it'); click(view, index === 9 ? 'See session' : 'Next ball'); }
    expect(view.getByText('Practice complete. No career reward.')).toBeVisible();
    expect(view.queryByRole('button', { name: 'Bank the session' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(before); expect(handlers.onBank).not.toHaveBeenCalled();
    click(view, 'Daily / practice menu'); start(view); expect(view.getByText(/Today · Ball 5\/10/)).toBeVisible();
  });

  it('keeps a reduced motion pitch static while the same clock plays the same pass', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: true, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    const view = draw(); start(view); const setup = setups()[0];
    expect(view.container.querySelector('[data-through-clock]')!.textContent).toContain('static pitch');
    click(view, 'Start run');
    const runner = view.container.querySelector('[data-runner]')!;
    const at = [runner.getAttribute('cx'), runner.getAttribute('cy')];
    expect(at).toEqual([String(setup.start.x), String(setup.start.y)]);
    advance(setup.cue * 1000);
    expect([runner.getAttribute('cx'), runner.getAttribute('cy')]).toEqual(at);
    dragTo(view, perfectSpot(0));
    expect(saved()).toMatchObject({ rounds: 1, count: 1 });
    expect(board(view)).toHaveAttribute('data-phase', 'roundEnd');
    const ball = view.container.querySelector('[data-through-ball]')!;
    const target = view.container.querySelector('[data-aim-target]')!;
    expect(Number(ball.getAttribute('cx'))).toBeCloseTo(Number(target.getAttribute('cx')), 6);
    const end = runnerAt(setup, setup.cue);
    expect(Number(runner.getAttribute('cy'))).toBeLessThan(end.y);
  });
});
