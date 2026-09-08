import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImperialismBoardShared from './ImperialismBoardShared';
import { NFL_CONQUEST_GAME, NFL_IMPERIALISM } from '@/data/conquestSports';
import { NFL_CONQUEST_MAP } from '@/data/conquestData';
import { dailyConquestRng, loadDailyRun, saveDailyRun } from '@/lib/conquestDaily';
import { continueRun, dailyRunRecord, featuredPairing, playRound, startRun } from '@/lib/conquestRun';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/components/conquest/ConquestRegionMap', () => ({ default: () => null, useOwnerTakeover: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const DATE = '2026-09-07';
const sport = NFL_IMPERIALISM;
type Tab = ReturnType<typeof within>;

beforeEach(() => {
  localStorage.clear();
  vi.mocked(recordCompletion).mockClear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${DATE}T16:00:00Z`));
  // Two rendered boards share storage and the browser's per-key lock queue.
  let tail: Promise<unknown> = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: (_key: string, callback: () => unknown) => {
      const task = tail.then(callback);
      tail = task.catch(() => undefined);
      return task;
    } },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, 'locks');
});

function openTab(): Tab {
  return within(render(<ImperialismBoardShared sport={sport} map={NFL_CONQUEST_MAP} game={NFL_CONQUEST_GAME} />).container);
}

async function tap(button: HTMLElement) {
  await act(async () => { fireEvent.click(button); });
}

async function pickTeam(tab: Tab, index = 3) {
  const team = sport.teams[index];
  await tap(tab.getByRole('button', { name: new RegExp(`^${team.city} ${team.name} `) }));
}

async function play(tab: Tab, away = false) {
  const calls = tab.getAllByRole('button', { name: /% to win$/ });
  await tap(calls[away ? 1 : 0]);
  await tap(tab.getByRole('button', { name: /^Play / }));
}

async function finish(tab: Tab) {
  for (let round = 0; round <= sport.regularRounds + 3; round += 1) {
    const final = tab.queryByRole('button', { name: 'See the final map' });
    if (final) { await tap(final); return; }
    const next = tab.queryByRole('button', { name: 'Continue' });
    if (next) await tap(next);
    await play(tab);
  }
  throw new Error('The real Conquest season did not reach its final map');
}

function seedFinalRecap() {
  const rng = dailyConquestRng(sport.key, DATE);
  let run = startRun(sport, sport.teams[3].id, rng);
  while (!run.champion) {
    if (run.phase === 'recap') run = continueRun(sport, run, rng);
    run = playRound(sport, run, featuredPairing(sport, run)![0], rng);
  }
  saveDailyRun(sport.key, dailyRunRecord(run), DATE);
}

describe('Conquest daily boards share one attempt across tabs', () => {
  it('a stale team picker cannot replace another tab\'s club and settled call', async () => {
    const first = openTab();
    const stale = openTab();
    await pickTeam(first);
    await play(first);
    const saved = loadDailyRun(sport.key, DATE);
    expect(saved?.picks).toHaveLength(1);

    await pickTeam(stale, 4);

    expect(loadDailyRun(sport.key, DATE)).toEqual(saved);
    expect(stale.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('a stale preview cannot reopen a finished daily or record another score', async () => {
    const first = openTab();
    await pickTeam(first);
    const stale = openTab();
    await finish(first);
    const saved = loadDailyRun(sport.key, DATE);
    expect(saved?.done).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);

    await play(stale, true);

    expect(loadDailyRun(sport.key, DATE)).toEqual(saved);
    expect(stale.getByText("Today's Conquest is in the books")).toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('two tabs leaving the same final recap record only one completion', async () => {
    seedFinalRecap();
    const first = openTab();
    const second = openTab();
    expect(recordCompletion).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(first.getByRole('button', { name: 'See the final map' }));
      fireEvent.click(second.getByRole('button', { name: 'See the final map' }));
    });

    const saved = loadDailyRun(sport.key, DATE);
    expect(saved?.done).toBe(true);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/conquest-imperialism', saved?.result?.score, 'Tester', saved?.result?.empire);
    expect(second.getByText("Today's Conquest is in the books")).toBeInTheDocument();
  });

  it('blocks an unsaved daily while free play still finishes and records once', async () => {
    Reflect.deleteProperty(navigator, 'locks');
    const tab = openTab();
    await pickTeam(tab);
    expect(loadDailyRun(sport.key, DATE)).toBeNull();
    expect(tab.queryByRole('button', { name: /^Play / })).not.toBeInTheDocument();
    expect(tab.getByRole('status')).toHaveTextContent(/could not be saved/i);
    expect(recordCompletion).not.toHaveBeenCalled();

    await tap(tab.getByRole('button', { name: 'Free Play' }));
    await pickTeam(tab);
    await finish(tab);

    expect(loadDailyRun(sport.key, DATE)).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('keeps an interrupted daily while its recovery action starts free play', async () => {
    const tab = openTab();
    await pickTeam(tab);
    const saved = loadDailyRun(sport.key, DATE);
    expect(saved?.picks).toHaveLength(0);
    Reflect.deleteProperty(navigator, 'locks');

    await play(tab);

    expect(tab.getByRole('status')).toHaveTextContent(/could not be saved/i);
    expect(loadDailyRun(sport.key, DATE)).toEqual(saved);
    expect(tab.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    await tap(tab.getByRole('button', { name: 'Free Play instead' }));
    await pickTeam(tab, 4);
    await play(tab);

    expect(tab.queryByRole('status')).not.toBeInTheDocument();
    expect(tab.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    expect(loadDailyRun(sport.key, DATE)).toEqual(saved);
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
