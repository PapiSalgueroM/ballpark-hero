/**
 * Round 1603 review fix: the free run's tie stamp in Manager Hot Seat, held where the board writes it and where it
 * passes it through. A new free run is opened with { rules: 1331, tie: 1603 }, so it judges a deciding second leg by
 * the tie, and its save keeps the stamp. A saved run, carried on or finished, hands the stamp back to the engine,
 * and a run saved without it stays without it, so it replays the night's reading (tieRulesOf answers 'night').
 * Before this file nothing held the stamp: dropping it left tsc and every Hot Seat vitest green (review
 * r1603-run-m2, mutation F).
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ManagerHotSeatBoard from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import {
  answerHotSeatPress,
  hotSeatPool,
  pendingPress,
  playHotSeatMatch,
  replayHotSeat,
  startHotSeat,
  tieRulesOf,
  type HotSeatRun,
} from '@/lib/managerHotSeat';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
/* The real engine, watched: every setup the board hands it is recorded. */
vi.mock('@/lib/managerHotSeat', async importOriginal => {
  const real = await importOriginal<typeof import('@/lib/managerHotSeat')>();
  return { ...real, startHotSeat: vi.fn(real.startHotSeat), replayHotSeat: vi.fn(real.replayHotSeat) };
});

const FREE_KEY = 'manager-hot-seat-free';
const STAMPED = { rules: 1331, tie: 1603 } as const;
const step = (r: HotSeatRun) => (pendingPress(r) ? answerHotSeatPress(r, 0) : playHotSeatMatch(r, 'balanced', null));
let club = '';
/** A stamped free run one action in. */
let played: HotSeatRun;
/** A stamped free run that kept the job. */
let kept: HotSeatRun | null = null;

beforeAll(() => {
  club = hotSeatPool()[0].club;
  played = step(startHotSeat({ club, seed: 1, ...STAMPED }));
  for (let seed = 1; seed < 40 && !kept; seed++) {
    let r = startHotSeat({ club, seed, ...STAMPED });
    for (let i = 0; i < 40 && !r.verdict; i++) r = step(r);
    if (r.verdict?.kind === 'survived' || r.verdict?.kind === 'reprieve') kept = r;
  }
  if (!kept) throw new Error('no seed under 40 kept the job');
}, 240000);

const board = () => render(<MemoryRouter><ManagerHotSeatBoard /></MemoryRouter>);
const record = (run: HotSeatRun, extra: Record<string, unknown>) =>
  JSON.stringify({ v: 1, club: run.setup.club, seed: run.setup.seed, rules: 1331, actions: run.actions, ...extra });
const lastStart = () => vi.mocked(startHotSeat).mock.calls.at(-1)![0];
const lastReplay = () => vi.mocked(replayHotSeat).mock.calls.at(-1)!;
const loaded = () => { act(() => { vi.advanceTimersByTime(50); }); };

beforeEach(() => {
  localStorage.clear();
  vi.mocked(startHotSeat).mockClear();
  vi.mocked(replayHotSeat).mockClear();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-10-01T16:00:00Z'));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear(); });

describe('Manager Hot Seat: a free run carries the 1603 tie stamp', () => {
  it('a new free run is opened with the stamp, so it reads the tie, and its save says so', () => {
    const view = board();
    fireEvent.click(view.getByRole('button', { name: /Random/ }));
    loaded();
    const setup = lastStart();
    expect(setup).toMatchObject(STAMPED);
    expect(tieRulesOf(setup)).toBeUndefined();
    fireEvent.click(view.getByRole('button', { name: 'Take the job' }));
    expect(JSON.parse(localStorage.getItem(FREE_KEY) ?? 'null')).toMatchObject({ v: 1, club: setup.club, ...STAMPED });
  }, 120000);

  it('a saved free run hands its stamp back to the engine, and one saved without it stays on the night', () => {
    localStorage.setItem(FREE_KEY, record(played, { tie: 1603, done: false }));
    let view = board();
    fireEvent.click(view.getByRole('button', { name: `Carry on at ${club}` }));
    loaded();
    expect(lastReplay()[0]).toMatchObject({ club, ...STAMPED });
    expect(lastReplay()[1]).toEqual(played.actions);
    cleanup();
    localStorage.setItem(FREE_KEY, record(played, { done: false }));
    view = board();
    fireEvent.click(view.getByRole('button', { name: `Carry on at ${club}` }));
    loaded();
    const old = lastReplay()[0];
    expect('tie' in old).toBe(false);
    expect(tieRulesOf(old)).toBe('night');
  }, 120000);

  it('a finished free run that kept the job reopens with its stamp', () => {
    const run = kept!;
    localStorage.setItem(FREE_KEY, record(run, { tie: 1603, done: true, kind: run.verdict!.kind }));
    const view = board();
    fireEvent.click(view.getByRole('button', { name: `See the Club Manager offer for ${club}` }));
    loaded();
    expect(lastReplay()[0]).toMatchObject({ club, ...STAMPED });
  }, 120000);
});

it('keeps Free Play progress when backing out of another club before taking the job', () => {
  const view = board();
  const button = (name: string) => view.getByRole('button', { name });
  const choose = (clubName: string) => {
    fireEvent.click(button('Pick a club'));
    const random = vi.spyOn(Math, 'random').mockReturnValue(1 / 4294967296);
    fireEvent.click(button(clubName));
    random.mockRestore();
    loaded();
  };

  choose('Arsenal');
  fireEvent.click(button('Take the job'));
  const press = view.getByTestId('hot-seat-press');
  fireEvent.click(press.querySelector('button')!);
  fireEvent.click(button('Kick off'));
  expect(view.getByTestId('hot-seat-result')).toHaveTextContent('Arsenal 3 to 2 PSV');
  const played = localStorage.getItem(FREE_KEY)!;
  expect(JSON.parse(played)).toMatchObject({ club: 'Arsenal', done: false, actions: [
    { t: 'press', i: 0 }, { t: 'match', m: 'balanced', talk: null },
  ] });

  fireEvent.click(button('Menu'));
  expect(button('Carry on at Arsenal')).toBeInTheDocument();
  choose('Aston Villa');
  expect(localStorage.getItem(FREE_KEY)).toBe(played);
  fireEvent.click(button('Back'));
  fireEvent.click(button('Carry on at Arsenal'));
  loaded();
  expect(view.getByTestId('hot-seat-match')).toHaveTextContent('Home to Aston Villa');
  expect(localStorage.getItem(FREE_KEY)).toBe(played);

  fireEvent.click(button('Menu'));
  choose('Aston Villa');
  fireEvent.click(button('Take the job'));
  fireEvent.click(button('Menu'));
  expect(button('Carry on at Aston Villa')).toBeInTheDocument();
  expect(view.queryByRole('button', { name: 'Carry on at Arsenal' })).toBeNull();
  expect(JSON.parse(localStorage.getItem(FREE_KEY)!)).toMatchObject({ club: 'Aston Villa', done: false, actions: [] });
}, 120000);
