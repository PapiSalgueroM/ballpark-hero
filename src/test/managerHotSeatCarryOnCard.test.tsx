/**
 * Round 956 review fix: the Carry on in Club Manager card, wired as a player
 * meets it. The lib's rule (src/test/managerHotSeatCarryOn.test.ts and
 * scripts/simManagerHotSeat.mjs section 5) was held, but nothing committed
 * checked which button replaces a Club Manager career and which one never
 * does, that a sacked manager sees no card, or that the offer survives a trip
 * back to the menu. This file does, through the real component and Club
 * Manager's own save.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ManagerHotSeatBoard, { CarryOnCard } from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import { clearCareer, loadCareer, saveCareer, startCareer } from '@/lib/clubManager';
import {
  answerHotSeatPress,
  hotSeatPool,
  pendingPress,
  playHotSeatMatch,
  startHotSeat,
  type HotSeatRun,
} from '@/lib/managerHotSeat';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));

const KEY = 'dukb-club-manager-save';
let kept: HotSeatRun;
let sacked: HotSeatRun | null = null;

/** The silent manager's run to its verdict, the way the harness plays it. */
function playOut(run: HotSeatRun): HotSeatRun {
  let r = run;
  for (let i = 0; i < 40 && !r.verdict; i++) r = pendingPress(r) ? answerHotSeatPress(r, 0) : playHotSeatMatch(r, 'balanced', null);
  return r;
}

beforeAll(() => {
  const club = hotSeatPool()[0].club;
  for (let seed = 1; seed < 40 && (!kept || !sacked); seed++) {
    const r = playOut(startHotSeat({ club, seed }));
    if (r.verdict?.kind === 'survived' && !kept) kept = r;
    if ((r.verdict?.kind === 'sacked' || r.verdict?.kind === 'boardSacked') && !sacked) sacked = r;
  }
  if (!kept) throw new Error('no seed under 40 kept the job');
}, 240000);

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); clearCareer(); localStorage.clear(); });

describe('Manager Hot Seat: the Carry on in Club Manager card', () => {
  it('on an empty device the main button saves the run and opens Club Manager', () => {
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    expect(openPath).toHaveBeenCalledWith('/club-manager');
    expect(loadCareer()?.clubName).toBe(kept.state.clubName);
  });

  it('never replaces a saved career from the main button or from Keep, only from Replace', () => {
    const other = hotSeatPool()[hotSeatPool().length - 1].club;
    expect(saveCareer(startCareer(other))).toBe(true);
    const before = localStorage.getItem(KEY);
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);

    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    expect(view.getByTestId('hot-seat-carry-on-confirm').textContent).toContain(other);
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(openPath).not.toHaveBeenCalled();

    fireEvent.click(view.getByRole('button', { name: 'Keep my career' }));
    expect(view.queryByTestId('hot-seat-carry-on-confirm')).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(openPath).not.toHaveBeenCalled();

    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    fireEvent.click(view.getByRole('button', { name: 'Replace it and carry on' }));
    expect(openPath).toHaveBeenCalledTimes(1);
    expect(openPath).toHaveBeenCalledWith('/club-manager');
    expect(loadCareer()?.clubName).toBe(kept.state.clubName);
  }, 60000);

  it('says so and goes nowhere when the browser refuses the write', () => {
    const openPath = vi.fn();
    const view = render(<CarryOnCard run={kept} openPath={openPath} />);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    fireEvent.click(view.getByRole('button', { name: 'Carry on in Club Manager' }));
    expect(view.getByRole('status').textContent).toContain('would not save');
    expect(openPath).not.toHaveBeenCalled();
  });

  it('a sacked manager gets no card at all', () => {
    expect(sacked).not.toBeNull();
    const view = render(<CarryOnCard run={sacked!} openPath={vi.fn()} />);
    expect(view.queryByTestId('hot-seat-carry-on')).toBeNull();
  });
});

describe('Manager Hot Seat: the offer waits on the menu', () => {
  const FREE_KEY = 'manager-hot-seat-free';
  const freeRecord = (run: HotSeatRun, extra: Record<string, unknown>) =>
    JSON.stringify({ v: 1, club: run.setup.club, seed: run.setup.seed, actions: run.actions, done: true, ...extra });
  const board = () => render(<MemoryRouter><ManagerHotSeatBoard /></MemoryRouter>);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('a finished free run that kept the job reopens on its verdict with the offer', () => {
    localStorage.setItem(FREE_KEY, freeRecord(kept, { kind: 'survived' }));
    const view = board();
    fireEvent.click(view.getByRole('button', { name: `See the Club Manager offer for ${kept.setup.club}` }));
    act(() => { vi.advanceTimersByTime(50); });
    expect(view.getByTestId('hot-seat-verdict')).toBeTruthy();
    expect(view.getByTestId('hot-seat-carry-on')).toBeTruthy();
  }, 120000);

  it('a sacked run, and a finished record from before the offer, show no way back to it', () => {
    localStorage.setItem(FREE_KEY, freeRecord(sacked!, { kind: sacked!.verdict!.kind }));
    let view = board();
    expect(view.queryByRole('button', { name: /See the Club Manager offer/ })).toBeNull();
    cleanup();
    localStorage.setItem(FREE_KEY, freeRecord(kept, {}));
    view = board();
    expect(view.queryByRole('button', { name: /See the Club Manager offer/ })).toBeNull();
  });
});
