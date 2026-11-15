import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import ManagerHotSeatBoard from '@/components/manager-hot-seat/ManagerHotSeatBoard';
import { recordCompletion } from '@/lib/completions';
import { dailyRecordKey, writeDailyRecord } from '@/lib/dailyRecord';
import {
  answerHotSeatPress, dailyHotSeat, hotSeatPool, pendingPress, playHotSeatMatch, startHotSeat,
  type HotSeatRun,
} from '@/lib/managerHotSeat';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const slug = 'manager-hot-seat';
const date = '2026-11-15';
const key = dailyRecordKey(slug, date);
const freeKey = 'manager-hot-seat-free';
const board = () => render(<MemoryRouter><ManagerHotSeatBoard /></MemoryRouter>);
const flushLoad = async () => { await act(async () => { vi.advanceTimersByTime(50); }); };

let beforeFirstMatch: HotSeatRun;
let afterFirstMatch: HotSeatRun;
let afterSecondPress: HotSeatRun;
let completed: HotSeatRun;

beforeAll(() => {
  const setup = dailyHotSeat(date);
  expect(setup).toMatchObject({ club: 'León', seed: 1462515019 });
  beforeFirstMatch = answerHotSeatPress(startHotSeat(setup), 0);
  afterFirstMatch = playHotSeatMatch(beforeFirstMatch, 'balanced', null);
  afterSecondPress = answerHotSeatPress(afterFirstMatch, 0);
  completed = playHotSeatMatch(afterSecondPress, 'balanced', null);
  expect(completed.verdict).toMatchObject({ kind: 'survived', points: 3, target: 3 });
  expect(completed.log.map(m => [m.opponent, m.myGoals, m.oppGoals])).toEqual([
    ['Toluca', 1, 2], ['Necaxa', 2, 1],
  ]);
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date('2026-11-15T16:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
});

function saveFromOtherTab(run: HotSeatRun): string {
  writeDailyRecord(slug, date, {
    club: run.setup.club,
    actions: run.actions,
    done: !!run.verdict,
    ...(run.verdict ? { kind: run.verdict.kind, points: run.points, target: run.target, dots: '🟥🟩' } : {}),
  });
  return localStorage.getItem(key)!;
}

it('adopts the completed León verdict and carry-on when a stale job brief is accepted', async () => {
  const view = board();
  fireEvent.click(view.getByRole('button', { name: "Take today's job" }));
  await flushLoad();
  const latest = saveFromOtherTab(completed);

  fireEvent.click(view.getByRole('button', { name: 'Take the job', exact: true }));
  await flushLoad();
  expect(localStorage.getItem(key)).toBe(latest);
  expect(view.getByTestId('hot-seat-verdict')).toHaveTextContent('You keep the job');
  expect(view.getByText('Loaded your latest daily progress from another tab.')).toBeVisible();
  vi.useRealTimers();
  expect(await view.findByTestId('hot-seat-carry-on')).toHaveTextContent('León');
  expect(recordCompletion).not.toHaveBeenCalled();

  fireEvent.click(view.getByRole('button', { name: 'Menu', exact: true }));
  expect(view.getByTestId('hot-seat-daily-done')).toHaveTextContent('3 of 3 points');
  expect(view.getByRole('button', { name: 'See the Club Manager offer' })).toBeVisible();
});

it('shows the latest match and its pending press when an older tab presses Kick off', async () => {
  saveFromOtherTab(beforeFirstMatch);
  const view = board();
  fireEvent.click(view.getByRole('button', { name: 'Back to the dugout' }));
  await flushLoad();
  fireEvent.click(view.getByRole('button', { name: 'Defensive', exact: true }));
  const latest = saveFromOtherTab(afterFirstMatch);

  fireEvent.click(view.getByRole('button', { name: 'Kick off', exact: true }));
  await flushLoad();
  expect(localStorage.getItem(key)).toBe(latest);
  expect(view.getByTestId('hot-seat-result')).toHaveTextContent('León 1 to 2 Toluca');
  expect(view.getByTestId('hot-seat-press')).toHaveTextContent(pendingPress(afterFirstMatch)!.text);
});

it('shows the latest press receipt without applying the older reply', async () => {
  saveFromOtherTab(afterFirstMatch);
  const view = board();
  fireEvent.click(view.getByRole('button', { name: 'Back to the dugout' }));
  await flushLoad();
  const latest = saveFromOtherTab(afterSecondPress);

  fireEvent.click(view.getByRole('button', { name: pendingPress(afterFirstMatch)!.options[1].label }));
  await flushLoad();
  expect(localStorage.getItem(key)).toBe(latest);
  expect(view.queryByTestId('hot-seat-press')).toBeNull();
  expect(view.getByTestId('hot-seat-result')).toHaveTextContent(afterSecondPress.state.press!.lastLine!);
  expect(view.getByRole('button', { name: 'Next match' })).toBeVisible();
});

it('continues a normal daily across reload and keeps free play on its own replay', async () => {
  const view = board();
  fireEvent.click(view.getByRole('button', { name: "Take today's job" }));
  await flushLoad();
  fireEvent.click(view.getByRole('button', { name: 'Take the job', exact: true }));
  fireEvent.click(view.getByRole('button', { name: 'These players are with me' }));
  fireEvent.click(view.getByRole('button', { name: 'Kick off', exact: true }));
  const dailyBytes = localStorage.getItem(key)!;
  expect(JSON.parse(dailyBytes).actions).toEqual(afterFirstMatch.actions);
  view.unmount();
  const continued = board();
  fireEvent.click(continued.getByRole('button', { name: 'Back to the dugout' }));
  await flushLoad();
  expect(continued.getByTestId('hot-seat-match')).toHaveTextContent('Necaxa');
  expect(continued.getByTestId('hot-seat-press')).toBeVisible();
  continued.unmount();

  const free = startHotSeat({ club: hotSeatPool()[0].club, seed: 1 });
  localStorage.setItem(freeKey, JSON.stringify({ v: 1, club: free.setup.club, seed: 1, done: false, actions: [] }));
  const unlimited = board();
  fireEvent.click(unlimited.getByRole('button', { name: `Carry on at ${free.setup.club}` }));
  await flushLoad();
  fireEvent.click(unlimited.getByRole('button', { name: 'Take the job', exact: true }));
  const press = pendingPress(free);
  fireEvent.click(unlimited.getByRole('button', { name: press ? press.options[0].label : 'Kick off', exact: true }));
  const savedFree = localStorage.getItem(freeKey)!;
  expect(JSON.parse(savedFree).actions).toHaveLength(1);
  expect(localStorage.getItem(key)).toBe(dailyBytes);
  unlimited.unmount();

  const reopened = board();
  fireEvent.click(reopened.getByRole('button', { name: `Carry on at ${free.setup.club}` }));
  await flushLoad();
  expect(reopened.getByTestId('hot-seat-match')).toBeVisible();
  expect(localStorage.getItem(freeKey)).toBe(savedFree);
});

it('continues at the last playable action in an older daily log', async () => {
  saveFromOtherTab({ ...beforeFirstMatch, actions: [...beforeFirstMatch.actions, { t: 'press', i: 1 }] });
  const view = board();
  fireEvent.click(view.getByRole('button', { name: 'Back to the dugout' }));
  await flushLoad();
  fireEvent.click(view.getByRole('button', { name: 'Kick off', exact: true }));
  expect(view.getByTestId('hot-seat-result')).toHaveTextContent('León 1 to 2 Toluca');
  expect(JSON.parse(localStorage.getItem(key)!).actions).toEqual(afterFirstMatch.actions);
});

it('keeps the new Eastern day record when an overnight tab accepts the old brief', async () => {
  const view = board();
  fireEvent.click(view.getByRole('button', { name: "Take today's job" }));
  await flushLoad();
  expect(view.getByRole('button', { name: 'Take the job', exact: true })).toBeVisible();

  const tomorrow = '2026-11-16';
  const next = dailyHotSeat(tomorrow);
  const nextKey = dailyRecordKey(slug, tomorrow);
  vi.setSystemTime(new Date('2026-11-16T05:00:01Z'));
  writeDailyRecord(slug, tomorrow, { club: next.club, actions: [], done: false });
  const current = localStorage.getItem(nextKey);
  expect(current).not.toBeNull();
  fireEvent.click(view.getByRole('button', { name: 'Take the job', exact: true }));

  expect(localStorage.getItem(nextKey)).toBe(current);
  expect(localStorage.getItem(key)).toBeNull();
  expect(view.getByText("A new daily is ready. Today's job is below.")).toBeVisible();
  fireEvent.click(view.getByRole('button', { name: "Take today's job" }));
  await flushLoad();
  expect(view.getByTestId('hot-seat-brief')).toHaveTextContent(next.club);
  expect(localStorage.getItem(nextKey)).toBe(current);
});
