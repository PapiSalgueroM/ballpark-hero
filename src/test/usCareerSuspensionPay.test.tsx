import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import type { UsCareerCore } from '@/lib/usCareerSport';
import fixtures from '../../scripts/data/usBoardFixture.json';

vi.mock('@/lib/completions', () => ({
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

const boards = [
  ['nfl', NflMyCareerBoard],
  ['nba', NbaMyCareerBoard],
  ['mlb', MlbMyCareerBoard],
  ['nhl', NhlMyCareerBoard],
] as const;
type Sport = typeof boards[number][0];
type FixtureSave = { c: UsCareerCore & { netWorth: number; money: { vault: number } } };
const saveKey = (sport: Sport) => sport + '-my-career-save-v1';
const suspensionSave = (sport: Sport): FixtureSave => JSON.parse(fixtures.sports[sport].saves.suspended);
const readSave = (sport: Sport): FixtureSave => JSON.parse(localStorage.getItem(saveKey(sport))!);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.314);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it.each(boards)('%s records a suspended season without paying the contract salary', async (sport, Board) => {
  const saved = suspensionSave(sport);
  const before = saved.c;
  expect(before.suspendedSeasons).toBe(1);
  expect(before.salary).toBeGreaterThan(0);
  localStorage.setItem(saveKey(sport), JSON.stringify(saved));
  render(<Board />);
  fireEvent.click(await screen.findByRole('button', { name: 'Play the ' + before.year + ' season' }));

  const after = readSave(sport).c;
  expect(after.seasons).toHaveLength(before.seasons.length + 1);
  expect(after.seasons.at(-1)).toMatchObject({ year: before.year, games: 0, salary: 0, teamResult: 'SUSPENDED' });
  expect(after).toMatchObject({
    age: before.age + 1, year: before.year + 1, suspendedSeasons: 0,
    salary: before.salary, earnings: before.earnings, contractYears: before.contractYears - 1,
  });
  expect(after.netWorth).toBe(before.netWorth);
  if (sport === 'nba') expect(after.money.vault).toBe(1.78);
});

it.each(boards)('%s still banks take-home pay for the same career playing an active season', async (sport, Board) => {
  const saved = suspensionSave(sport);
  const before = saved.c;
  before.suspendedSeasons = 0;
  localStorage.setItem(saveKey(sport), JSON.stringify(saved));
  render(<Board />);
  fireEvent.click(await screen.findByRole('button', { name: 'Play the ' + before.year + ' season' }));

  const after = readSave(sport).c;
  const played = after.seasons.at(-1)!;
  expect(played).toMatchObject({ year: before.year, salary: before.salary });
  expect(played.games).toBeGreaterThan(0);
  expect(after.earnings).toBeCloseTo(before.earnings + played.salary);
  expect(after.netWorth).toBe(Math.round((before.netWorth + played.salary * 0.45) * 10) / 10);
});

it('still collects annual bills from savings when a suspended year runs short', async () => {
  const saved = suspensionSave('nba');
  saved.c.netWorth = 0.1;
  saved.c.yearlyCosts = 0.4;
  localStorage.setItem(saveKey('nba'), JSON.stringify(saved));
  render(<NbaMyCareerBoard />);
  fireEvent.click(await screen.findByRole('button', { name: 'Play the ' + saved.c.year + ' season' }));

  const after = readSave('nba').c;
  expect(after.netWorth).toBe(0.1);
  expect(after.money.vault).toBe(1.38);
});
