import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
import { useArcadeFlight } from '@/hooks/useArcadeFlight';
import { takeShot as kickShot, type ShotResult } from '@/lib/freeKick';
import { takeShot as hoopShot, type HoopResult } from '@/lib/buzzerBeater';
import { writeArcadeRun } from '@/lib/arcadeRecord';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/freeKick', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/freeKick')>(), takeShot: vi.fn() }));
vi.mock('@/lib/buzzerBeater', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/buzzerBeater')>(), takeShot: vi.fn() }));
vi.mock('@/lib/arcadeRecord', () => ({ readArcadeRun: () => null, writeArcadeRun: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const kickResult: ShotResult = {
  x: 0.8, y: 0.8, onTarget: true, saved: false, scored: true, hitPost: false, hitWall: false,
  points: 173, keeperX: 0, keeperY: 0.2, path: [{ x: 0, y: 0 }, { x: 0.4, y: 0.6 }, { x: 0.8, y: 0.8 }], verdict: 'Top corner',
};
const hoopResult: HoopResult = {
  made: true, blocked: false, swish: true, lateral: 0, depth: 0, entryDeg: 44.4, launchDeg: 60,
  speed: 8, lateralWindow: 0.1, depthWindow: 0.16, points: 241,
  path: [{ x: 0, y: 2 }, { x: 2, y: 3.6 }, { x: 4, y: 3 }], verdict: 'Swish',
};
const games = [
  { name: 'Free Kick', Board: FreeKickBoard, hold: 'Hold to strike', next: 'Next kick', phase: 'kickEnd', points: 173, slug: 'free-kick', countField: 'goals', flight: 700 },
  { name: 'Buzzer Beater', Board: BuzzerBeaterBoard, hold: 'Hold to shoot', next: 'Next shot', phase: 'shotEnd', points: 241, slug: 'buzzer-beater', countField: 'made', flight: 780 },
];
let now = 0;
let frameId = 0;
let frames = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.clearAllMocks();
  localStorage.clear();
  now = 0;
  frameId = 0;
  frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.mocked(kickShot).mockReturnValue(kickResult);
  vi.mocked(hoopShot).mockReturnValue(hoopResult);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

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
function reducedMotion() {
  const originalMatchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...originalMatchMedia(query), matches: query.includes('prefers-reduced-motion') }));
}

describe('arcade flight active time', () => {
  it('preserves an unpaused caller and settles once through RAF before its backup', () => {
    const settled = vi.fn();
    const hook = renderHook(() => useArcadeFlight(700));
    act(() => hook.result.current.launch(settled));
    advance(350);
    expect(hook.result.current.progress).toBe(0.5);
    advance(350);
    expect(hook.result.current.progress).toBe(1);
    expect(settled).toHaveBeenCalledTimes(1);
    advance(1000);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
  });

  it('freezes active time and rejects the old segment when resumed', () => {
    const settled = vi.fn();
    const hook = renderHook(() => useArcadeFlight(700));
    act(() => hook.result.current.launch(settled));
    advance(250);
    const oldFrame = [...frames.values()][0];
    act(() => { hook.result.current.pause(); hook.result.current.pause(); });
    expect(hook.result.current.paused).toBe(true);
    expect(hook.result.current.progress).toBeCloseTo(250 / 700);
    expect(frames.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    advance(3000);
    expect(settled).not.toHaveBeenCalled();
    expect(hook.result.current.progress).toBeCloseTo(250 / 700);
    act(() => { hook.result.current.resume(); hook.result.current.resume(); oldFrame(now); });
    expect(hook.result.current.paused).toBe(false);
    expect(hook.result.current.progress).toBeCloseTo(250 / 700);
    expect(frames.size).toBe(1);
    advance(449);
    expect(settled).not.toHaveBeenCalled();
    advance(1);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(hook.result.current.progress).toBe(1);
  });

  it('reschedules only remaining active time plus the existing backup margin without RAF', () => {
    const settled = vi.fn();
    const hook = renderHook(() => useArcadeFlight(700));
    act(() => hook.result.current.launch(settled));
    advance(230, false);
    act(() => hook.result.current.pause());
    advance(2000, false);
    expect(settled).not.toHaveBeenCalled();
    act(() => hook.result.current.resume());
    advance(529, false);
    expect(settled).not.toHaveBeenCalled();
    advance(1, false);
    expect(settled).toHaveBeenCalledTimes(1);
    advance(2000, false);
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it('reset invalidates the previous flight and restores an unpaused start', () => {
    const previous = vi.fn(), next = vi.fn();
    const timeout = vi.spyOn(window, 'setTimeout');
    const hook = renderHook(() => useArcadeFlight(700));
    act(() => hook.result.current.launch(previous));
    const oldFrame = [...frames.values()][0];
    const oldBackup = timeout.mock.calls.find(call => call[1] === 760)?.[0] as () => void;
    advance(100);
    act(() => { hook.result.current.pause(); hook.result.current.reset(); hook.result.current.launch(next); oldFrame(now); oldBackup(); });
    expect(hook.result.current.paused).toBe(false);
    expect(hook.result.current.progress).toBe(0);
    expect(previous).not.toHaveBeenCalled();
    advance(700);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('unmount cancels all scheduled work and invalidates stale callbacks', () => {
    const settled = vi.fn();
    const timeout = vi.spyOn(window, 'setTimeout');
    const hook = renderHook(() => useArcadeFlight(700));
    act(() => hook.result.current.launch(settled));
    const oldFrame = [...frames.values()][0];
    const oldBackup = timeout.mock.calls.find(call => call[1] === 760)?.[0] as () => void;
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
    act(() => { oldFrame(now + 900); oldBackup(); });
    advance(2000);
    expect(frames.size).toBe(0);
    expect(settled).not.toHaveBeenCalled();
  });

  it('keeps reduced motion immediate once and blocks launching while paused', () => {
    reducedMotion();
    const settled = vi.fn();
    const hook = renderHook(() => useArcadeFlight(700));
    act(() => hook.result.current.pause());
    act(() => hook.result.current.launch(settled));
    expect(settled).not.toHaveBeenCalled();
    act(() => { hook.result.current.resume(); hook.result.current.launch(settled); });
    expect(hook.result.current.progress).toBe(1);
    expect(settled).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    advance(2000);
    expect(settled).toHaveBeenCalledTimes(1);
  });
});

describe.each(games)('$name pause and input safety', game => {
  function mount() {
    const view = render(<game.Board />);
    fireEvent.click(screen.getByRole('button', { name: "Today's ten" }));
    const board = view.container.querySelector('[data-arcade-phase]')!;
    const hold = () => screen.getByRole('button', { name: game.hold });
    return { ...view, board, hold };
  }
  const shoot = (hold: HTMLElement) => { fireEvent.mouseDown(hold); fireEvent.mouseUp(hold); };

  it('cancels a held charge and requires a fresh press after resume', () => {
    const view = mount();
    const hold = view.hold();
    fireEvent.mouseDown(hold);
    advance(32);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    const pausedText = view.board.textContent;
    advance(2000);
    expect(view.board.textContent).toBe(pausedText);
    expect(hold).toBeDisabled();
    for (const input of view.container.querySelectorAll('input')) expect(input).toBeDisabled();
    fireEvent.mouseUp(hold);
    fireEvent.keyUp(window, { key: ' ' });
    expect(view.board).toHaveAttribute('data-arcade-phase', 'aiming');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.mouseUp(hold);
    fireEvent.pointerUp(view.getByRole('img'));
    fireEvent.keyUp(window, { key: ' ' });
    expect(view.board).toHaveAttribute('data-arcade-phase', 'aiming');
    shoot(hold);
    expect(view.board).toHaveAttribute('data-arcade-phase', 'flying');
    advance(game.flight);
    expect(view.board).toHaveAttribute('data-arcade-phase', game.phase);
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
  });

  it('freezes the flight and score until the remaining flight resumes once', () => {
    const view = mount();
    shoot(view.hold());
    advance(200);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    const pitch = view.getByRole('img');
    const pausedDrawing = pitch.innerHTML;
    advance(2000);
    expect(pitch.innerHTML).toBe(pausedDrawing);
    expect(screen.getByText(/^Points/)).toHaveTextContent('Points 0');
    expect(view.board).toHaveAttribute('data-arcade-phase', 'flying');
    expect(screen.queryByRole('button', { name: game.next })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    advance(game.flight - 201);
    expect(view.board).toHaveAttribute('data-arcade-phase', 'flying');
    advance(1);
    expect(view.board).toHaveAttribute('data-arcade-phase', game.phase);
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
    advance(3000);
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(writeArcadeRun).not.toHaveBeenCalled();
  });

  it('keeps Space and Enter shooting on the focused shot button', () => {
    reducedMotion();
    const view = mount();
    for (const key of [' ', 'Enter']) {
      const hold = view.hold();
      act(() => hold.focus());
      fireEvent.keyDown(hold, { key });
      fireEvent.keyDown(hold, { key, repeat: true });
      fireEvent.keyUp(hold, { key });
      expect(view.board).toHaveAttribute('data-arcade-phase', game.phase);
      const score = key === ' ' ? game.points : game.points * 2;
      expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${score}`);
      fireEvent.keyUp(hold, { key });
      expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${score}`);
      fireEvent.click(screen.getByRole('button', { name: game.next }));
    }
  });

  it('keeps help, pause, ranges and dialogs out of global gameplay keys', async () => {
    const view = mount();
    const controls = render(<><a href="#fixture">Fixture navigation</a><div role="button" tabIndex={0}>Fixture action</div></>);
    for (const control of [controls.getByRole('link', { name: 'Fixture navigation' }), controls.getByRole('button', { name: 'Fixture action' })]) {
      act(() => control.focus());
      const beforeControl = view.board.textContent;
      const beforeDrawing = view.getByRole('img').innerHTML;
      fireEvent.keyDown(control, { key: 'ArrowRight' });
      fireEvent.keyDown(control, { key: ' ' });
      advance(32);
      expect(view.board.textContent).toBe(beforeControl);
      expect(view.getByRole('img').innerHTML).toBe(beforeDrawing);
      fireEvent.keyUp(control, { key: ' ' });
      expect(view.board).toHaveAttribute('data-arcade-phase', 'aiming');
      expect(screen.getByText(/^Points/)).toHaveTextContent('Points 0');
    }
    const help = render(<HowToPlayPopover title="Fixture arcade rules" floatingTrigger={false}><p>Fixture instructions.</p></HowToPlayPopover>);
    const trigger = help.getByRole('button', { name: 'How to play' });
    const beforeHelp = view.board.textContent;
    fireEvent.keyDown(trigger, { key: ' ' });
    advance(32);
    expect(view.board.textContent).toBe(beforeHelp);
    fireEvent.keyUp(trigger, { key: ' ' });
    expect(view.board).toHaveAttribute('data-arcade-phase', 'aiming');
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: ' ' });
    fireEvent.keyUp(dialog, { key: ' ' });
    expect(view.board).toHaveAttribute('data-arcade-phase', 'aiming');
    fireEvent.click(screen.getByRole('button', { name: "Let's Play!" }));
    await act(async () => { vi.advanceTimersByTime(100); });
    expect(screen.queryByRole('dialog')).toBeNull();
    const before = view.getByRole('img').innerHTML;
    const range = view.container.querySelector('input')!;
    fireEvent.keyDown(range, { key: 'ArrowRight' });
    fireEvent.keyUp(range, { key: ' ' });
    expect(view.getByRole('img').innerHTML).toBe(before);
    const pause = screen.getByRole('button', { name: 'Pause' });
    fireEvent.keyDown(pause, { key: ' ' });
    fireEvent.keyUp(pause, { key: ' ' });
    fireEvent.click(pause);
    expect(view.board).toHaveAttribute('data-arcade-paused', 'true');
    const resume = screen.getByRole('button', { name: 'Resume' });
    fireEvent.keyDown(resume, { key: ' ' });
    fireEvent.keyUp(resume, { key: ' ' });
    fireEvent.click(resume);
    expect(view.board).toHaveAttribute('data-arcade-phase', 'aiming');
    expect(screen.getByText(/^Points/)).toHaveTextContent('Points 0');
    fireEvent.keyDown(window, { key: ' ' });
    advance(32);
    fireEvent.keyUp(window, { key: ' ' });
    expect(view.board).toHaveAttribute('data-arcade-phase', 'flying');
    advance(game.flight);
    expect(view.board).toHaveAttribute('data-arcade-phase', game.phase);
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
  });

  it('keeps a paused daily at ten settlements, one save and one completion', () => {
    const view = mount();
    for (let index = 0; index < 10; index++) {
      shoot(view.hold());
      advance(100);
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
      advance(1000);
      fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
      advance(game.flight - 100);
      expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points * (index + 1)}`);
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(writeArcadeRun).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: index === 9 ? 'See the run' : game.next }));
    }
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith(`/${game.slug}`, game.points * 10, null, 10);
    expect(writeArcadeRun).toHaveBeenCalledExactlyOnceWith(game.slug, expect.any(String), game.countField, { score: game.points * 10, count: 10 });
    advance(3000);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(writeArcadeRun).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
  });
});
