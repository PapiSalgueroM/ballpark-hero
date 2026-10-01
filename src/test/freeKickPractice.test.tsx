import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard';
import { buildRun, daySeed, lehmer, takeShot } from '@/lib/freeKick';
import { readArcadeRun, writeArcadeRun } from '@/lib/arcadeRecord';
import { dailyRecordKey } from '@/lib/dailyRecord';
import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

vi.mock('@/lib/freeKick', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/freeKick')>();
  return { ...original, takeShot: vi.fn(original.takeShot) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: ({ score }: { score: string }) => <button data-share-score={score}>Fixture result share</button> }));

const DATE = '2026-09-30';
const random = .314159;
const seed = () => Math.floor(random * 2147483645) + 1;
const draw = () => render(<FreeKickBoard />);
const nativeButton = (view: ReturnType<typeof render>, name: string) => {
  const button = [...view.baseElement.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent?.trim()) === name);
  if (!button) throw new Error(`Missing native button ${name}`);
  return button;
};
const click = (view: ReturnType<typeof render>, name: string) => fireEvent.click(nativeButton(view, name));
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();
const advance = (milliseconds: number) => act(() => {
  now += milliseconds;
  vi.advanceTimersByTime(milliseconds);
  const pending = [...frames.values()]; frames.clear(); pending.forEach(frame => frame(now));
});
const start = (view: ReturnType<typeof render>) => {
  click(view, 'Steady practice');
  click(view, 'Start steady practice'); advance(20);
};
const power = (view: ReturnType<typeof render>, value: string) => fireEvent.change(view.container.querySelector('input[type="range"][aria-label="Power"]')!, { target: { value } });
const pitch = (view: ReturnType<typeof render>) => view.container.querySelector('svg[role="img"]')!;
const next = (view: ReturnType<typeof render>, index: number) => { advance(760); click(view, index === 9 ? 'See the run' : 'Next kick'); };
const ball = (view: ReturnType<typeof render>) => pitch(view).querySelector('circle[fill="white"]')!;

function finishRecorded(view: ReturnType<typeof render>) {
  let points = 0, goals = 0;
  for (let index = 0; index < 10; index++) {
    const hold = nativeButton(view, 'Hold to strike'); fireEvent.mouseDown(hold); fireEvent.mouseUp(hold);
    const outcome = vi.mocked(takeShot).mock.results.at(-1)!.value;
    points += outcome.points; goals += Number(outcome.scored); next(view, index);
  }
  return { points, goals };
}
function finishPractice(view: ReturnType<typeof render>) {
  for (let index = 0; index < 10; index++) { click(view, 'Kick'); next(view, index); }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-09-30T12:00:00Z'));
  now = 0; frameId = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.spyOn(Math, 'random').mockReturnValue(random);
  localStorage.clear();
  vi.mocked(takeShot).mockClear(); vi.mocked(recordCompletion).mockClear();
});
afterEach(() => { cleanup(); consumeRestoredFinish('free-kick'); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('actual Free Kick steady practice', { timeout: 30000 }, () => {
  it('shows rules and a worked example before play, closes to the entry and starts on the native Kick', () => {
    const view = draw();
    const entry = view.getByRole('button', { name: 'Steady practice' }); entry.focus(); click(view, 'Steady practice');
    const dialog = view.getByRole('dialog', { name: 'Steady practice' });
    expect(dialog).toHaveAccessibleDescription('Ten free kicks at your pace. This practice is unrecorded and leaves your daily score alone.');
    expect(within(dialog).getByText(/^Example:/)).toBeVisible();
    expect(view.queryByRole('slider', { name: 'Power' })).toBeNull();
    fireEvent.keyDown(dialog, { key: 'Escape' }); advance(20);
    expect(entry).toHaveFocus();
    start(view);
    expect(view.container.querySelector('[data-arcade-mode]')).toHaveAttribute('data-arcade-mode', 'practice');
    expect(view.getByText('Steady practice, unrecorded')).toBeVisible();
    expect(view.getByRole('button', { name: 'Kick' })).toHaveFocus();
    expect(view.getByRole('slider', { name: 'Power' })).toHaveValue('0.6');
    expect(view.queryByRole('button', { name: 'Hold to strike' })).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('holds chosen power through delayed aim taps and drags, firing only an explicit unchanged engine input', async () => {
    const view = draw(); start(view); power(view, '0.62');
    const svg = pitch(view);
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, width: 360, height: 210, right: 360, bottom: 210, toJSON: () => ({}) });
    fireEvent.pointerDown(svg, { clientX: 120, clientY: 80 }); advance(5000);
    expect(view.getByRole('slider', { name: 'Power' })).toHaveValue('0.62');
    fireEvent.pointerMove(svg, { clientX: 264, clientY: 57.2 }); fireEvent.pointerUp(svg);
    expect(takeShot).not.toHaveBeenCalled();
    fireEvent.change(view.getByRole('slider', { name: 'How much bend to put on the ball' }), { target: { value: '0.16' } });
    advance(7000);
    click(view, 'Kick');
    const aim = { x: .7, y: (150 - 57) / 116, power: .62, curve: .16 };
    expect(takeShot).toHaveBeenCalledTimes(1);
    const actualInput = vi.mocked(takeShot).mock.calls[0][0];
    Object.entries(aim).forEach(([key, value]) => expect(actualInput[key as keyof typeof aim]).toBeCloseTo(value, 8));
    const original = await vi.importActual<typeof import('@/lib/freeKick')>('@/lib/freeKick');
    const expected = original.takeShot(actualInput, buildRun(seed())[0], lehmer(seed() ^ 0x5eed1234));
    expect(vi.mocked(takeShot).mock.results[0].value).toEqual(expected);
    advance(760);
    expect(ball(view)).toHaveAttribute('cx', String(60 + ((expected.x + 1) / 2) * 240));
    expect(ball(view)).toHaveAttribute('cy', String(150 - expected.y * 116));
    expect(view.getByText(/^Points/)).toHaveTextContent(`Points ${expected.points}`);
  });

  it('routes range, button and dialog keys independently while one pitch Space kicks once', () => {
    const view = draw(); start(view); power(view, '0.55');
    const range = view.getByRole('slider', { name: 'Power' });
    fireEvent.keyDown(range, { key: 'ArrowRight' });
    expect(fireEvent.keyDown(range, { key: ' ' })).toBe(false);
    expect(fireEvent.keyDown(view.getByRole('slider', { name: 'How much bend to put on the ball' }), { key: ' ' })).toBe(false);
    fireEvent.keyUp(range, { key: ' ' }); advance(2000);
    expect(takeShot).not.toHaveBeenCalled(); expect(range).toHaveValue('0.55');
    expect(fireEvent.keyDown(view.getByRole('button', { name: 'Kick' }), { key: 'Enter', repeat: true })).toBe(false);
    fireEvent.keyUp(view.getByRole('button', { name: 'Kick' }), { key: ' ' });
    expect(takeShot).not.toHaveBeenCalled();
    const help = view.getByRole('button', { name: 'Steady practice rules' }); help.focus(); click(view, 'Steady practice rules');
    fireEvent.keyDown(view.getByRole('dialog'), { key: ' ' }); fireEvent.keyUp(view.getByRole('dialog'), { key: ' ' });
    expect(takeShot).not.toHaveBeenCalled();
    fireEvent.keyDown(view.getByRole('dialog'), { key: 'Escape' }); advance(20); expect(help).toHaveFocus();
    click(view, 'Resume');
    fireEvent.keyDown(pitch(view), { key: 'ArrowRight' }); fireEvent.keyDown(pitch(view), { key: 'ArrowUp' }); fireEvent.keyDown(pitch(view), { key: 'e' });
    fireEvent.keyDown(pitch(view), { key: ' ', repeat: true }); expect(takeShot).not.toHaveBeenCalled();
    fireEvent.keyDown(pitch(view), { key: ' ' }); fireEvent.keyUp(pitch(view), { key: ' ' });
    expect(takeShot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(takeShot).mock.calls[0][0]).toEqual({ x: .06, y: .55, power: .55, curve: .12 });
    advance(760); expect(view.container.querySelector('[data-arcade-phase]')).toHaveAttribute('data-arcade-phase', 'kickEnd');
  });

  it('pauses selected inputs and the real flight, reopens help and resumes one unchanged outcome', () => {
    const view = draw(); start(view); power(view, '0.7');
    click(view, 'Pause');
    expect(view.getByRole('slider', { name: 'Power' })).toBeDisabled(); expect(view.getByRole('button', { name: 'Kick' })).toBeDisabled();
    advance(5000); expect(view.getByRole('slider', { name: 'Power' })).toHaveValue('0.7');
    click(view, 'Resume'); click(view, 'Kick'); advance(200);
    click(view, 'Steady practice rules');
    const endpoint = ball(view).outerHTML;
    advance(5000); expect(ball(view).outerHTML).toBe(endpoint); expect(view.getByText(/^Points/)).toHaveTextContent('Points 0');
    fireEvent.keyDown(view.getByRole('dialog'), { key: 'Escape' }); advance(20);
    expect(view.container.querySelector('[data-arcade-paused]')).toHaveAttribute('data-arcade-paused', 'true');
    click(view, 'Resume'); advance(499);
    expect(view.container.querySelector('[data-arcade-phase]')).toHaveAttribute('data-arcade-phase', 'flying');
    advance(1);
    expect(view.container.querySelector('[data-arcade-phase]')).toHaveAttribute('data-arcade-phase', 'kickEnd');
    expect(takeShot).toHaveBeenCalledTimes(1);
  });

  it('finishes and replays ten real shots without replacing a saved daily or recording or sharing practice', () => {
    const daily = { score: 876, count: 4 }; writeArcadeRun('free-kick', DATE, 'goals', daily);
    const key = dailyRecordKey('free-kick', DATE); const original = localStorage.getItem(key);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const view = draw(); start(view);
    let total = 0, goals = 0;
    for (let index = 0; index < 10; index++) {
      power(view, String(.45 + index * .03)); click(view, 'Kick');
      const outcome = vi.mocked(takeShot).mock.results[index].value;
      total += outcome.points; goals += outcome.scored ? 1 : 0; next(view, index);
    }
    expect(view.getByText(`${goals} of 10 scored`)).toBeVisible();
    expect(view.getByText(new RegExp(`^${total} points`))).toBeVisible();
    expect(view.queryByRole('button', { name: 'Fixture result share' })).toBeNull();
    expect(recordCompletion).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBe(original); expect(readArcadeRun('free-kick', DATE, 'goals', 10)).toEqual(daily);
    click(view, 'Another steady ten');
    expect(view.getByText(/^Kick /)).toHaveTextContent('Kick 1/10'); expect(view.getByText(/^Points/)).toHaveTextContent('Points 0');
    expect(view.getByRole('slider', { name: 'Power' })).toHaveValue('0.6');
    expect(localStorage.getItem(key)).toBe(original); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it.each(['daily', 'unlimited'] as const)('preserves the %s charge mode and its original completion and daily-write boundary', mode => {
    const view = draw(); click(view, mode === 'daily' ? "Today's ten" : 'Unlimited');
    expect(view.queryByRole('slider', { name: 'Power' })).toBeNull();
    const writes = vi.spyOn(Storage.prototype, 'setItem'); let total = 0, goals = 0;
    for (let index = 0; index < 10; index++) {
      const hold = nativeButton(view, 'Hold to strike');
      fireEvent.mouseDown(hold); advance(32); fireEvent.mouseUp(hold);
      const input = vi.mocked(takeShot).mock.calls[index][0]; expect(input.power).toBeCloseTo(.67, 8);
      const outcome = vi.mocked(takeShot).mock.results[index].value; total += outcome.points; goals += outcome.scored ? 1 : 0; next(view, index);
    }
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/free-kick', total, null, goals);
    expect(view.getByRole('button', { name: 'Fixture result share' })).toHaveAttribute('data-share-score', `${goals}/10 free kicks for ${total} points`);
    expect(writes.mock.calls.filter(([key]) => key === dailyRecordKey('free-kick', DATE))).toHaveLength(mode === 'daily' ? 1 : 0);
    expect(readArcadeRun('free-kick', DATE, 'goals', 10)).toEqual(mode === 'daily' ? { score: total, count: goals } : null);
    expect(vi.mocked(takeShot).mock.calls[0][1]).toEqual(buildRun(mode === 'daily' ? daySeed(DATE) : seed())[0]);
  });

  it('returns to the original saved daily and later unlimited mode without suppressing its next completion', () => {
    writeArcadeRun('free-kick', DATE, 'goals', { score: 876, count: 4 });
    const key = dailyRecordKey('free-kick', DATE); const saved = localStorage.getItem(key);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const matchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...matchMedia(query), matches: query.includes('prefers-reduced-motion') }));
    const view = draw(); start(view);
    for (let index = 0; index < 10; index++) { click(view, 'Kick'); click(view, index === 9 ? 'See the run' : 'Next kick'); }
    click(view, "Today's ten");
    expect(view.container.querySelector('[data-arcade-mode]')).toHaveAttribute('data-arcade-mode', 'daily');
    expect(view.getByText('4 of 10 scored')).toBeVisible();
    expect(view.getByRole('button', { name: 'Fixture result share' })).toHaveAttribute('data-share-score', '4/10 free kicks for 876 points');
    expect(localStorage.getItem(key)).toBe(saved); expect(recordCompletion).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    start(view);
    for (let index = 0; index < 10; index++) { click(view, 'Kick'); click(view, index === 9 ? 'See the run' : 'Next kick'); }
    click(view, 'Unlimited');
    expect(view.container.querySelector('[data-arcade-mode]')).toHaveAttribute('data-arcade-mode', 'unlimited');
    expect(view.queryByRole('slider', { name: 'Power' })).toBeNull();
    for (let index = 0; index < 10; index++) {
      const hold = view.getByRole('button', { name: 'Hold to strike' }); fireEvent.mouseDown(hold); fireEvent.mouseUp(hold); click(view, index === 9 ? 'See the run' : 'Next kick');
    }
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(key)).toBe(saved);
  });

  it('keeps reduced motion immediate and discards normal practice work on unmount', () => {
    const matchMedia = window.matchMedia;
    const reduced = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...matchMedia(query), matches: query.includes('prefers-reduced-motion') }));
    const view = draw(); start(view); click(view, 'Kick');
    expect(view.container.querySelector('[data-arcade-phase]')).toHaveAttribute('data-arcade-phase', 'kickEnd'); expect(frames.size).toBe(0);
    view.unmount(); reduced.mockRestore();
    const other = draw(); start(other); click(other, 'Kick');
    expect(frames.size).toBe(1); other.unmount(); advance(5000);
    expect(frames.size).toBe(0); expect(vi.getTimerCount()).toBe(0); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps a newly finished daily booked across practice and unlimited without rewriting or recording it', () => {
    const view = draw(); click(view, "Today's ten");
    const key = dailyRecordKey('free-kick', DATE), writes = vi.spyOn(Storage.prototype, 'setItem');
    const daily = finishRecorded(view), saved = localStorage.getItem(key);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/free-kick', daily.points, null, daily.goals);
    start(view); finishPractice(view); click(view, "Today's ten");
    expect(view.container.querySelector('[data-arcade-phase]'), 'the freshly earned daily must return finished').toHaveAttribute('data-arcade-phase', 'done');
    expect(view.getByText(`${daily.goals} of 10 scored`)).toBeVisible();
    expect(view.getByText(new RegExp(`^${daily.points} points`))).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls.filter(([storedKey]) => storedKey === key)).toHaveLength(1);
    expect(localStorage.getItem(key)).toBe(saved);
    click(view, 'Another ten');
    const unlimited = finishRecorded(view);
    expect(recordCompletion).toHaveBeenNthCalledWith(2, '/free-kick', unlimited.points, null, unlimited.goals);
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    start(view); finishPractice(view); click(view, "Today's ten");
    expect(view.getByText(`${daily.goals} of 10 scored`)).toBeVisible();
    expect(view.getByText(new RegExp(`^${daily.points} points`))).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    expect(writes.mock.calls.filter(([storedKey]) => storedKey === key)).toHaveLength(1);
    expect(localStorage.getItem(key)).toBe(saved);
  });

  it('keeps a newly finished daily in memory when private storage refuses its write', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage refused'); });
    const view = draw(); click(view, "Today's ten"); const daily = finishRecorded(view);
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(write).toHaveBeenCalledTimes(1);
    start(view); finishPractice(view); click(view, "Today's ten");
    expect(view.container.querySelector('[data-arcade-phase]'), 'blocked storage must not discard the earned daily in this mount').toHaveAttribute('data-arcade-phase', 'done');
    expect(view.getByText(`${daily.goals} of 10 scored`)).toBeVisible();
    expect(view.getByText(new RegExp(`^${daily.points} points`))).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(write).toHaveBeenCalledTimes(1); expect(localStorage.length).toBe(0);
  });
});
