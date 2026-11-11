import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { initMlbLeague, MLB_ROUNDS } from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'mlb-front-office-save-v1';
const OTHER = 'mlb-front-office-save-retry-unrelated';
const rng = (seed: number) => () => {
  seed = seed * 16807 % 2147483647;
  return (seed - 1) / 2147483646;
};

function mount(round = 1) {
  const league = initMlbLeague(rng(73));
  league.round = round;
  const raw = JSON.stringify({ league, myTeam: 'LAD', phase: 'hub', titles: 0,
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
  render(<MlbFrontOfficeBoard />);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`Play Round ${round} of ${MLB_ROUNDS}`) }));
  expect(attempts).toEqual([]);
  return { raw, attempts, allowWrites: () => { blocked = false; } };
}

function play(name: string) {
  const button = screen.getByRole('button', { name });
  expect(button).toBeEnabled();
  fireEvent.click(button);
}

function retryButton() {
  return screen.queryByRole('button', { name: 'Retry save' });
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
  play('Play Round 1');
  expect(screen.getByText(/Round 2\/27/)).toBeVisible();
  expect(save.attempts).toHaveLength(1);
  expect(JSON.parse(save.attempts[0]).league.round).toBe(2);
  expect(localStorage.getItem(KEY)).toBe(save.raw);

  play('Play Round 2');
  expect(screen.getByText(/Round 3\/27/)).toBeVisible();
  expect(save.attempts).toHaveLength(2);
  const [first, latest] = save.attempts;
  expect(JSON.parse(latest).league.round).toBe(3);
  expect(localStorage.getItem(KEY)).toBe(save.raw);
  const retry = retryButton();
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
  expect(retryButton()).not.toBeInTheDocument();

  cleanup();
  render(<MlbFrontOfficeBoard />);
  expect(screen.getByText(/Round 3\/27/)).toBeVisible();
  expect(save.attempts).toHaveLength(4);
  expect(localStorage.getItem(KEY)).toBe(latest);
  expect(localStorage.getItem(OTHER)).toBe('held');
});

it('retries the finished World Series recap without rerunning October', () => {
  const save = mount(MLB_ROUNDS);
  play('Final stretch + October');
  const heading = screen.getByText(/win the 2026 World Series/).textContent;
  expect(save.attempts).toHaveLength(1);
  const [recap] = save.attempts;
  expect(JSON.parse(recap)).toMatchObject({ phase: 'recap', seasonsPlayed: 1 });
  expect(localStorage.getItem(KEY)).toBe(save.raw);
  const retry = retryButton();
  expect(retry).toBeInTheDocument();
  save.allowWrites();
  fireEvent.click(retry!);
  expect(save.attempts).toEqual([recap, recap]);

  cleanup();
  render(<MlbFrontOfficeBoard />);
  expect(screen.getByText(heading!)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Go to the draft' })).toBeInTheDocument();
  expect(save.attempts).toHaveLength(2);
  expect(localStorage.getItem(KEY)).toBe(recap);
});

it('clears the warning when a later round saves normally', () => {
  const save = mount();
  play('Play Round 1');
  expect(retryButton()).toBeInTheDocument();
  save.allowWrites();
  play('Play Round 2');
  expect(save.attempts).toHaveLength(2);
  expect(JSON.parse(save.attempts[1]).league.round).toBe(3);
  expect(localStorage.getItem(KEY)).toBe(save.attempts[1]);
  expect(retryButton()).not.toBeInTheDocument();
});

it('clears a pending save when the franchise is abandoned', () => {
  const save = mount();
  play('Play Round 1');
  expect(save.attempts).toHaveLength(1);
  expect(retryButton()).toBeInTheDocument();
  play('Abandon franchise and restart');
  expect(screen.getByText('Take over a baseball front office')).toBeVisible();
  expect(retryButton()).not.toBeInTheDocument();
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(localStorage.getItem(OTHER)).toBe('held');
});
