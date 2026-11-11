import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { initNbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'nba-front-office-save-v1';
const OTHER = 'nba-front-office-save-retry-unrelated';
const rng = (seed: number) => () => {
  seed = seed * 16807 % 2147483647;
  return (seed - 1) / 2147483646;
};

function mount() {
  const league = initNbaLeague(rng(73));
  const raw = JSON.stringify({ league, myTeam: 'BOS', phase: 'hub', titles: 0,
    seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw);
  localStorage.setItem(OTHER, 'held');
  const setItem = Storage.prototype.setItem;
  const attempts: string[] = [];
  let blocked = true;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, bytes) {
    if (this === localStorage && key === KEY) {
      attempts.push(bytes);
      if (blocked) throw new DOMException('Fixture quota refusal', 'QuotaExceededError');
    }
    setItem.call(this, key, bytes);
  });
  render(<NbaFrontOfficeBoard />);
  fireEvent.click(screen.getByRole('button', { name: /Play Round 1 of 20/ }));
  expect(attempts).toEqual([]);
  return { raw, attempts, allowWrites: () => { blocked = false; } };
}

function playRound(round: number) {
  const play = screen.getByRole('button', { name: `Play Round ${round}` });
  expect(play).toBeEnabled();
  fireEvent.click(play);
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(rng(103));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it('retries the newest refused round bytes and restores that round without replay', () => {
  const save = mount();
  playRound(1);
  expect(screen.getByText(/Round 2\/20/)).toBeVisible();
  expect(save.attempts).toHaveLength(1);
  const first = save.attempts[0];
  expect(JSON.parse(first).league.round).toBe(2);
  expect(localStorage.getItem(KEY)).toBe(save.raw);

  playRound(2);
  expect(screen.getByText(/Round 3\/20/)).toBeVisible();
  expect(save.attempts).toHaveLength(2);
  const latest = save.attempts[1];
  expect(latest).not.toBe(first);
  expect(JSON.parse(latest).league.round).toBe(3);
  expect(localStorage.getItem(KEY)).toBe(save.raw);
  const retry = screen.queryByRole('button', { name: 'Retry save' });
  expect(retry).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Franchise save failed. Keep this page open and retry.');

  fireEvent.click(retry!);
  expect(save.attempts).toEqual([first, latest, latest]);
  expect(localStorage.getItem(KEY)).toBe(save.raw);
  expect(retry).toBeVisible();
  save.allowWrites();
  fireEvent.click(retry!);
  expect(save.attempts).toEqual([first, latest, latest, latest]);
  expect(localStorage.getItem(KEY)).toBe(latest);
  expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();

  cleanup();
  render(<NbaFrontOfficeBoard />);
  expect(screen.getByText(/Round 3\/20/)).toBeVisible();
  expect(save.attempts).toHaveLength(4);
  expect(localStorage.getItem(KEY)).toBe(latest);
  expect(localStorage.getItem(OTHER)).toBe('held');
});

it('clears a pending save when the franchise is abandoned', () => {
  const save = mount();
  playRound(1);
  expect(save.attempts).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Retry save' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abandon franchise and restart' }));
  expect(screen.getByText('Take over a front office')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(localStorage.getItem(OTHER)).toBe('held');
});

it('clears the warning when a later round saves normally', () => {
  const save = mount();
  playRound(1);
  expect(screen.queryByRole('button', { name: 'Retry save' })).toBeInTheDocument();
  save.allowWrites();
  playRound(2);
  expect(save.attempts).toHaveLength(2);
  expect(JSON.parse(save.attempts[1]).league.round).toBe(3);
  expect(localStorage.getItem(KEY)).toBe(save.attempts[1]);
  expect(screen.queryByRole('button', { name: 'Retry save' })).not.toBeInTheDocument();
});
