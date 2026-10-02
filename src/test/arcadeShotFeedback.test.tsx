/* Round 748: actual boards and flight/completion hooks, fixed engine verdicts.
   Negative controls can use NO_DOUBLE_SWAP to alias a copied component that
   changes the success points or calls the Next button on animationend.
   Assert each source anchor exists before changing it, and require these
   outcome tests to fail. Never edit the production source for a control. */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installArcadePointers } from './arcadePointerFixture';
import FreeKickBoard from '@/components/free-kick/FreeKickBoard';
import BuzzerBeaterBoard from '@/components/buzzer-beater/BuzzerBeaterBoard';
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
  points: 173, keeperX: 0, keeperY: 0.2, path: [{ x: 0, y: 0 }, { x: 0.8, y: 0.8 }], verdict: 'Top corner',
};
const hoopResult: HoopResult = {
  made: true, blocked: false, swish: true, lateral: 0, depth: 0, entryDeg: 44.4, launchDeg: 60,
  speed: 8, lateralWindow: 0.1, depthWindow: 0.16, points: 241,
  path: [{ x: 0, y: 2 }, { x: 4, y: 3 }], verdict: 'Swish',
};
const games = [
  { name: 'Free Kick', Board: FreeKickBoard, hold: 'Hold to strike', next: 'Next kick', tally: 'Scored', points: 173, verdict: 'Goal', slug: 'free-kick', countField: 'goals' },
  { name: 'Buzzer Beater', Board: BuzzerBeaterBoard, hold: 'Hold to shoot', next: 'Next shot', tally: 'Made', points: 241, verdict: 'Swish', slug: 'buzzer-beater', countField: 'made' },
];

let pointerFixture: ReturnType<typeof installArcadePointers>;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.clearAllMocks();
  pointerFixture = installArcadePointers();
  localStorage.clear();
  const originalMatchMedia = window.matchMedia;
  vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ ...originalMatchMedia(query), matches: true }));
  vi.mocked(kickShot).mockReturnValue(kickResult);
  vi.mocked(hoopShot).mockReturnValue(hoopResult);
});
afterEach(() => { cleanup(); pointerFixture.restore(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function shoot(hold: string) {
  const button = screen.getByRole('button', { name: hold });
  fireEvent.pointerDown(button);
  fireEvent.pointerUp(button);
}

describe.each(games)('$name settled feedback', game => {
  function mount() {
    const rendered = render(<game.Board />);
    fireEvent.click(screen.getByRole('button', { name: "Today's ten" }));
    return rendered;
  }

  it('shows the original success payload and enabled Next immediately, without extra awards', () => {
    const { container } = mount();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    shoot(game.hold);
    const feedback = container.querySelector('[data-arcade-feedback]')!;
    expect(feedback).toHaveAttribute('data-outcome', 'success');
    expect(screen.getByRole('status')).toHaveTextContent(game.verdict);
    expect(screen.getByText(`${game.points} points.`)).toBeVisible();
    expect(screen.getByRole('button', { name: game.next })).toBeEnabled();
    expect(screen.getByText(new RegExp(`^${game.tally}`))).toHaveTextContent(`${game.tally} 1`);
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
    if (game.slug === 'buzzer-beater') expect(screen.getByText(/Came in at/)).toHaveTextContent('Came in at 44°, so you had 16 cm of room short or long.');
    fireEvent.animationEnd(feedback);
    fireEvent.animationEnd(screen.getByText(`${game.points} points.`));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
    expect(screen.getByText(new RegExp(`^${game.tally}`))).toHaveTextContent(`${game.tally} 1`);
    expect(screen.getByRole('button', { name: game.next })).toBeEnabled();
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(writeArcadeRun).not.toHaveBeenCalled();
  });

  it('keeps the original miss verdict and entry explanation, without a points award', () => {
    vi.mocked(kickShot).mockReturnValue({ ...kickResult, scored: false, saved: true, points: 0, verdict: 'Saved' });
    vi.mocked(hoopShot).mockReturnValue({ ...hoopResult, made: false, swish: false, points: 0, entryDeg: 30.3, depthWindow: 0, verdict: 'Too flat' });
    const { container } = mount();
    shoot(game.hold);
    expect(container.querySelector('[data-arcade-feedback]')).toHaveAttribute('data-outcome', 'miss');
    expect(screen.getByRole('status')).toHaveTextContent(game.slug === 'free-kick' ? 'Saved' : 'Too flat');
    expect(screen.queryByText(/\d+ points\./)).not.toBeInTheDocument();
    expect(screen.getByText(/^Points/)).toHaveTextContent('Points 0');
    expect(screen.getByText(new RegExp(`^${game.tally}`))).toHaveTextContent(`${game.tally} 0`);
    expect(screen.getByRole('button', { name: game.next })).toBeEnabled();
    if (game.slug === 'buzzer-beater') expect(screen.getByText(/Came in at/)).toHaveTextContent('Came in at 30°, which is too flat for the ball to fit through at all.');
  });

  it('remounts feedback for identical consecutive results and counts each shot once', () => {
    const { container } = mount();
    shoot(game.hold);
    const first = container.querySelector('[data-arcade-feedback]');
    fireEvent.click(screen.getByRole('button', { name: game.next }));
    expect(container.querySelector('[data-arcade-feedback]')).toBeNull();
    shoot(game.hold);
    const second = container.querySelector('[data-arcade-feedback]');
    expect(second).not.toBe(first);
    expect(first).not.toBeInTheDocument();
    expect(second).toHaveAttribute('data-outcome', 'success');
    expect(screen.getByText(`${game.points} points.`)).toBeVisible();
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points * 2}`);
    expect(screen.getByText(new RegExp(`^${game.tally}`))).toHaveTextContent(`${game.tally} 2`);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('settles through the existing flight fallback before showing feedback', () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.mocked(window.matchMedia).mockReturnValue({ ...media, matches: false });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    mount();
    shoot(game.hold);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: game.next })).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(900); });
    expect(screen.getByRole('status')).toHaveTextContent(game.verdict);
    expect(screen.getByRole('button', { name: game.next })).toBeEnabled();
    expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points}`);
  });

  it('waits for See the run to save and complete once after the tenth result', () => {
    mount();
    for (let shot = 1; shot <= 10; shot++) {
      shoot(game.hold);
      expect(screen.getByText(/^Points/)).toHaveTextContent(`Points ${game.points * shot}`);
      expect(recordCompletion).not.toHaveBeenCalled();
      expect(writeArcadeRun).not.toHaveBeenCalled();
      if (shot < 10) fireEvent.click(screen.getByRole('button', { name: game.next }));
    }
    const finalNext = screen.getByRole('button', { name: 'See the run' });
    expect(finalNext).toBeEnabled();
    fireEvent.click(finalNext);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith(`/${game.slug}`, game.points * 10, null, 10);
    expect(writeArcadeRun).toHaveBeenCalledExactlyOnceWith(game.slug, expect.any(String), game.countField, { score: game.points * 10, count: 10 });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(writeArcadeRun).toHaveBeenCalledTimes(1);
  });
});
