import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import FirstTouchBoard from '@/components/soccer-career/FirstTouchBoard';
import TrainingPanel from '@/components/soccer-career/TrainingPanel';
import { buildFirstTouchRun, firstTouchDeadline, incomingBallAt, takeFirstTouch, TOUCH_DIRECTIONS } from '@/lib/firstTouchDrill';
import { DRILL_META, drillSeed, applyDrillResult } from '@/lib/careerDrills';
import { dailyRecordKey, writeDailyRecord } from '@/lib/dailyRecord';
import { getTodayET } from '@/lib/dateUtils';
import type { CareerState } from '@/lib/soccerCareerEngine';

const DATE = '2026-09-30';
const KEY = dailyRecordKey(DRILL_META.firsttouch.slug, DATE);
const fixture = () => ({ position: 'CM', overall: 70, potential: 80, potentialEarned: 0, seasons: [{ year: 2026 }], trainingSeasonYear: 2025, statBoostNextSeason: {}, morale: 60, events: [] } as unknown as CareerState);
const callbacks = () => ({ onBank: vi.fn(), onBack: vi.fn() });
const draw = (handlers = callbacks(), canBank = true, career = fixture()) => render(<FirstTouchBoard career={career} canBank={canBank} {...handlers} />);
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const saved = () => JSON.parse(localStorage.getItem(KEY)!);
const setups = () => buildFirstTouchRun(drillSeed('firsttouch', getTodayET()));
const click = (view: ReturnType<typeof render>, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));
const start = (view: ReturnType<typeof render>, mode: 'daily' | 'practice' = 'daily') => click(view, mode === 'daily' ? /(?:Play|Resume) today/ : 'Practice, no banking');
const choose = (view: ReturnType<typeof render>, direction: string) => click(view, direction[0].toUpperCase() + direction.slice(1));
const settle = (view: ReturnType<typeof render>, index: number, won = true) => {
  const setup = setups()[index];
  choose(view, won ? setup.target : TOUCH_DIRECTIONS.find(value => value !== setup.target)!);
  click(view, 'Start ball'); advance(setup.arrival * 1000); click(view, 'Touch');
  expect(view.container.querySelector('[data-touch-verdict]')).toHaveAttribute('data-touch-verdict', won ? 'clean' : 'miss');
  if (index < 9) click(view, 'Next ball'); else click(view, 'See session');
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });

describe('actual First Touch board', () => {
  it('shows rules before play and offers optional First Touch outside the seasonal legacy gate', () => {
    const onDrill = vi.fn(); const onComplete = vi.fn();
    const view = render(<TrainingPanel career={fixture()} available={false} onDrill={onDrill} onComplete={onComplete} onClose={vi.fn()} />);
    click(view, /First Touch Read the gate/);
    expect(view.getByText(/Control ten incoming balls/)).toBeVisible();
    expect(view.getByText(/Example:/)).toBeVisible();
    expect(view.queryByRole('button', { name: 'Touch' })).toBeNull();
    start(view);
    expect(view.getByRole('button', { name: 'Start ball' })).toBeEnabled();
    expect(onDrill).not.toHaveBeenCalled(); expect(onComplete).not.toHaveBeenCalled();
  });

  it('uses pointer timing and exact engine geometry, checkpointing once before finite resolve', () => {
    const view = draw(); start(view);
    const setup = setups()[0];
    choose(view, setup.target);
    const action = view.getByRole('button', { name: 'Start ball' }); action.focus();
    const ball = view.container.querySelector('[data-touch-ball]')!;
    click(view, 'Start ball'); advance(setup.arrival * 1000);
    click(view, 'Touch');
    const expected = takeFirstTouch({ direction: setup.target, press: setup.arrival }, setup);
    expect(saved()).toMatchObject({ v: 1, date: DATE, rounds: 1, count: 1, score: 10, banked: false });
    expect(view.container.querySelector('[data-first-touch-board]')).toHaveAttribute('data-phase', 'resolve');
    expect(ball.getAttribute('cx')).toBe(String(expected.contact.x));
    expect(ball.getAttribute('cy')).toBe(String(expected.contact.y));
    expect(view.getByRole('button', { name: 'Next ball' })).toBe(action);
    expect(action).toHaveFocus();
    advance(500);
    expect(Number(ball.getAttribute('cx'))).toBeCloseTo(expected.end.x);
    expect(Number(ball.getAttribute('cy'))).toBeCloseTo(expected.end.y);
    expect(saved().rounds).toBe(1);
    expect(view.container.querySelector('[data-touch-ball]')).toBe(ball);
  });

  it('records early, wrong-gate and deadline misses without a random success or a second checkpoint', () => {
    const view = draw(); start(view);
    choose(view, setups()[0].target); click(view, 'Start ball'); click(view, 'Touch');
    expect(view.getByText('Too early. The ball ran past.')).toBeVisible();
    expect(saved()).toMatchObject({ rounds: 1, count: 0, score: 0 });
    click(view, 'Next ball'); settle(view, 1, false);
    expect(saved()).toMatchObject({ rounds: 2, count: 0 });
    click(view, 'Start ball'); advance(firstTouchDeadline(setups()[2]) * 1000 + 50);
    expect(view.getByText('Too late. The ball ran past.')).toBeVisible();
    expect(saved()).toMatchObject({ rounds: 3, count: 0 });
    advance(4000); expect(saved().rounds).toBe(3);
  });

  it('scopes arrows and Space to the pitch, leaving native button and dialog keys alone', () => {
    const view = draw(); start(view);
    const pitch = view.getByRole('group', { name: /First Touch pitch/ }); pitch.focus();
    const target = setups()[0].target;
    fireEvent.keyDown(pitch, { key: target === 'left' ? 'ArrowLeft' : target === 'right' ? 'ArrowRight' : 'ArrowUp' });
    expect(view.getByRole('button', { name: target[0].toUpperCase() + target.slice(1) })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(pitch, { key: ' ', code: 'Space' }); advance(setups()[0].arrival * 1000);
    fireEvent.keyDown(pitch, { key: ' ', code: 'Space', repeat: true }); expect(localStorage.getItem(KEY)).toBeNull();
    const touch = view.getByRole('button', { name: 'Touch' });
    expect(fireEvent.keyDown(touch, { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.keyDown(touch, { key: ' ', code: 'Space' }); expect(localStorage.getItem(KEY)).toBeNull();
    fireEvent.keyDown(pitch, { key: ' ', code: 'Space' });
    expect(saved()).toMatchObject({ rounds: 1, count: 1 });
    expect(pitch).toHaveFocus();
  });

  it('freezes active time on Pause and hidden tabs, requiring explicit Resume after return', () => {
    const view = draw(); start(view); const setup = setups()[0]; choose(view, setup.target);
    click(view, 'Start ball'); advance(500); click(view, 'Pause');
    const ball = view.container.querySelector('[data-touch-ball]')!; const pausedY = ball.getAttribute('cy');
    advance(9000); click(view, 'Touch'); expect(localStorage.getItem(KEY)).toBeNull(); expect(ball.getAttribute('cy')).toBe(pausedY);
    click(view, 'Resume'); advance(300);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); fireEvent(document, new Event('visibilitychange'));
    advance(9000); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); fireEvent(document, new Event('visibilitychange'));
    expect(view.getByRole('button', { name: 'Resume' })).toBeEnabled();
    click(view, 'Resume'); advance((setup.arrival - 0.8) * 1000); click(view, 'Touch');
    expect(saved()).toMatchObject({ rounds: 1, count: 1, score: 10 });
    advance(500);
    expect(view.container.querySelector('[data-first-touch-board]')).toHaveAttribute('data-phase', 'roundEnd');
    const landed = takeFirstTouch({ direction: setup.target, press: setup.arrival }, setup).end;
    expect(Number(ball.getAttribute('cx'))).toBe(landed.x);
    expect(Number(ball.getAttribute('cy'))).toBe(landed.y);
  });

  it('pauses for reopened help and resumes without accepting dialog or navigation keys as touches', () => {
    const view = draw(); start(view); choose(view, setups()[0].target);
    click(view, 'Start ball'); advance(400); click(view, 'First Touch rules');
    const dialog = view.getByRole('dialog', { name: 'First Touch rules' });
    expect(within(dialog).getByText(/Example:/)).toBeVisible();
    fireEvent.keyDown(dialog, { key: ' ', code: 'Space' }); advance(9000);
    expect(localStorage.getItem(KEY)).toBeNull();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(view.queryByRole('dialog')).toBeNull();
    click(view, 'Resume'); advance((setups()[0].arrival - 0.4) * 1000); click(view, 'Touch');
    expect(saved()).toMatchObject({ rounds: 1, count: 1 });
    advance(500);
    expect(view.container.querySelector('[data-first-touch-board]')).toHaveAttribute('data-phase', 'roundEnd');
  });

  it('closes nested rules on Escape while keeping Training Ground open and restoring its question button', () => {
    const onClose = vi.fn();
    const view = render(<TrainingPanel career={fixture()} available onDrill={vi.fn()} onComplete={vi.fn()} onClose={onClose} />);
    click(view, /First Touch Read the gate/);
    const question = view.getByRole('button', { name: 'First Touch rules' }); question.focus(); fireEvent.click(question);
    const rules = view.getByRole('dialog', { name: 'First Touch rules' });
    fireEvent.keyDown(rules, { key: 'Escape' }); advance(20);
    expect(view.queryByRole('dialog', { name: 'First Touch rules' })).toBeNull();
    expect(view.getByRole('dialog', { name: 'Training ground' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled(); expect(question).toHaveFocus();
  });

  it('resumes settled checkpoints after reload and pins the Eastern day through midnight', () => {
    const view = draw(); start(view); settle(view, 0); view.unmount();
    vi.setSystemTime(new Date('2026-09-30T23:59:00-04:00'));
    const restored = draw(); expect(restored.getByText(/1 clean, 1\/10 settled/)).toBeVisible(); start(restored);
    expect(restored.getByText(/Ball 2\/10/)).toBeVisible();
    vi.setSystemTime(new Date('2026-10-01T00:01:00-04:00'));
    const setup = buildFirstTouchRun(drillSeed('firsttouch', DATE))[1]; choose(restored, setup.target);
    click(restored, 'Start ball'); advance(setup.arrival * 1000); click(restored, 'Touch');
    expect(saved()).toMatchObject({ date: DATE, rounds: 2, count: 2 });
    expect(localStorage.getItem(dailyRecordKey(DRILL_META.firsttouch.slug, '2026-10-01'))).toBeNull();
  });

  it('completes ten exact outcomes, blocks daily replay and persists one bank before the callback', () => {
    const handlers = callbacks(); const career = fixture();
    handlers.onBank.mockImplementation((kind, count) => {
      expect(saved()).toMatchObject({ rounds: 10, count: 8, score: 80, banked: true });
      expect(applyDrillResult(career, kind, count).statBoostNextSeason?.dribbling).toBe(2);
    });
    const view = draw(handlers); start(view);
    for (let index = 0; index < 10; index++) settle(view, index, index < 8);
    expect(saved()).toMatchObject({ rounds: 10, count: 8, score: 80, banked: false });
    expect(view.getByText('+2 Dribbling with next season’s growth.')).toBeVisible();
    const bank = view.getByRole('button', { name: 'Bank the session' }); bank.focus();
    click(view, 'Bank the session');
    expect(handlers.onBank).toHaveBeenCalledExactlyOnceWith('firsttouch', 8);
    expect(view.getByRole('button', { name: 'Back to drills' })).toBe(bank); expect(bank).toHaveFocus();
    view.rerender(<FirstTouchBoard career={applyDrillResult(career, 'firsttouch', 8)} canBank={false} {...handlers} />);
    expect(view.getByRole('button', { name: 'Back to drills' })).toBe(bank); expect(bank).toHaveFocus();
    click(view, 'Daily / practice menu'); click(view, 'View today’s result');
    expect(view.queryByRole('button', { name: 'Start ball' })).toBeNull();
    expect(view.getByText('Session banked.')).toBeVisible();
    click(view, 'Back to drills'); expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(handlers.onBank).toHaveBeenCalledTimes(1);
    view.unmount(); const reloaded = draw(handlers, false); click(reloaded, 'View today’s result');
    expect(reloaded.getByText('Session banked.')).toBeVisible(); expect(handlers.onBank).toHaveBeenCalledTimes(1);
  });

  it('keeps practice scores and repeated practice separate from saved daily progress and banking', () => {
    writeDailyRecord(DRILL_META.firsttouch.slug, DATE, { rounds: 4, count: 3, score: 30, banked: false });
    const before = localStorage.getItem(KEY); const handlers = callbacks(); const view = draw(handlers);
    start(view, 'practice');
    for (let index = 0; index < 10; index++) {
      click(view, 'Start ball'); click(view, 'Touch');
      click(view, index === 9 ? 'See session' : 'Next ball');
    }
    expect(view.getByText('Practice complete. No career reward.')).toBeVisible();
    expect(view.queryByRole('button', { name: 'Bank the session' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(before); expect(handlers.onBank).not.toHaveBeenCalled();
    click(view, 'Another practice'); expect(view.getByText(/Practice · Ball 1\/10/)).toBeVisible();
    click(view, 'Daily / practice menu'); start(view); expect(view.getByText(/Today · Ball 5\/10/)).toBeVisible();
  });

  it.each([
    { rounds: 10, count: 8, score: 80, banked: true },
    { rounds: 5, count: 4, score: 40, banked: false },
  ])('preserves a newer other-tab checkpoint with $rounds settled rounds', newer => {
    const handlers = callbacks(); const view = draw(handlers); start(view); settle(view, 0);
    choose(view, setups()[1].target); click(view, 'Start ball'); advance(setups()[1].arrival * 1000);
    writeDailyRecord(DRILL_META.firsttouch.slug, DATE, newer);
    click(view, 'Touch');
    expect(saved()).toMatchObject(newer); expect(handlers.onBank).not.toHaveBeenCalled();
    expect(view.container.querySelector('[data-first-touch-board]')).toHaveAttribute('data-phase', newer.rounds === 10 ? 'done' : 'ready');
    expect(view.container.querySelector('[data-touch-verdict]')).toBeNull();
    if (newer.banked) expect(view.getByText('Session banked.')).toBeVisible();
    else expect(view.getByText(/Ball 6\/10/)).toBeVisible();
    advance(5000); expect(saved()).toMatchObject(newer);
  });

  it('rejects invalid records, respects unavailable banking and uses the current day seed', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, date: DATE, rounds: 10, count: 11, score: 110, banked: true }));
    const view = draw(callbacks(), false); start(view);
    const setup = setups()[0];
    expect(view.getByRole('img')).toHaveAccessibleName(`Marked gate ${setup.target[0].toUpperCase() + setup.target.slice(1)}, contact at ${setup.arrival.toFixed(2)} seconds`);
    view.unmount(); writeDailyRecord(DRILL_META.firsttouch.slug, DATE, { rounds: 10, count: 10, score: 100, banked: false });
    const handlers = callbacks(); const unavailable = draw(handlers, false); click(unavailable, 'View today’s result');
    expect(unavailable.getByText('Already trained this season. Today’s result is saved.')).toBeVisible();
    expect(unavailable.queryByRole('button', { name: 'Bank the session' })).toBeNull(); expect(handlers.onBank).not.toHaveBeenCalled();
  });

  it('cancels stale active and resolve work when switching modes, returning or unmounting', () => {
    const handlers = callbacks(); const view = draw(handlers); start(view); click(view, 'Start ball'); advance(100);
    click(view, 'Daily / practice menu'); advance(5000); expect(localStorage.getItem(KEY)).toBeNull();
    start(view); choose(view, setups()[0].target); click(view, 'Start ball'); advance(setups()[0].arrival * 1000); click(view, 'Touch');
    click(view, 'Daily / practice menu'); start(view, 'practice'); advance(5000);
    expect(view.container.querySelector('[data-first-touch-board]')).toHaveAttribute('data-phase', 'ready');
    expect(saved()).toMatchObject({ rounds: 1, count: 1 });
    click(view, 'Start ball'); advance(100); click(view, '‹ Drills'); advance(5000);
    expect(handlers.onBack).toHaveBeenCalledTimes(1); expect(saved().rounds).toBe(1);
    start(view); click(view, 'Start ball'); view.unmount(); advance(5000);
    expect(saved().rounds).toBe(1); expect(handlers.onBank).not.toHaveBeenCalled();
  });

  it('keeps a reduced-motion pitch static while the same input clock produces a clean touch', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: true, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }));
    const view = draw(); start(view); choose(view, setups()[0].target); click(view, 'Start ball');
    const ball = view.container.querySelector('[data-touch-ball]')!; const y = ball.getAttribute('cy');
    advance(setups()[0].arrival * 1000);
    expect(ball.getAttribute('cy')).toBe(y); click(view, 'Touch');
    expect(saved()).toMatchObject({ rounds: 1, count: 1 });
    expect(view.container.querySelector('[data-first-touch-board]')).toHaveAttribute('data-phase', 'roundEnd');
    expect(Number(ball.getAttribute('cx'))).toBe( takeFirstTouch({ direction: setups()[0].target, press: setups()[0].arrival }, setups()[0]).end.x );
  });
});
