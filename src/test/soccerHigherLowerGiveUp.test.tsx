import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HigherLower from '@/pages/HigherLower';
import { higherLowerPlayers, hlNoteFor } from '@/data/higherLowerPlayers';
import type { HigherLowerStatKey } from '@/types/higherLower';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));

const stats: HigherLowerStatKey[] = ['appearances', 'goals', 'internationalCaps'];
const labels = ['Appearances', 'Goals', "Int'l Caps"];

function dealPair() {
  const first = higherLowerPlayers.find(player => stats.some(stat => hlNoteFor(player.name, stat)) &&
    higherLowerPlayers.some(other => other !== player &&
      stats.some(stat => player.stats[stat] >= other.stats[stat]) &&
      stats.some(stat => player.stats[stat] < other.stats[stat])))!;
  const eligible = higherLowerPlayers.filter(other => other !== first && stats.some(stat => first.stats[stat] >= other.stats[stat]));
  const next = eligible.find(other => stats.some(stat => first.stats[stat] < other.stats[stat]))!;
  vi.spyOn(Math, 'random')
    .mockReturnValueOnce((higherLowerPlayers.indexOf(first) + 0.5) / higherLowerPlayers.length)
    .mockReturnValueOnce((eligible.indexOf(next) + 0.5) / eligible.length)
    .mockReturnValue(0.5);
  return [first, next] as const;
}

function giveUp() {
  fireEvent.click(screen.getByRole('button', { name: 'Give up' }));
  expect(screen.getByText('Give up and see the answer?')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Yes, reveal it' }));
  return screen.getByRole('status');
}

function choose(pair: ReturnType<typeof dealPair>, correct: boolean) {
  const [first, next] = pair;
  const index = stats.findIndex(stat => (first.stats[stat] >= next.stats[stat]) === correct);
  expect(index).toBeGreaterThanOrEqual(0);
  const buttons = screen.getAllByRole('button', { name: label => label.includes(labels[index]) });
  fireEvent.click(buttons.find(button => !(button as HTMLButtonElement).disabled)!);
}

function expectComparison(result: HTMLElement, pair: ReturnType<typeof dealPair>) {
  const table = within(result).getByRole('table', { name: 'Revealed comparison' });
  const [header, ...rows] = within(table).getAllByRole('row');
  expect(within(header).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Stat', ...pair.map(player => player.name)]);
  expect(rows).toHaveLength(3);
  for (const [index, stat] of stats.entries()) {
    expect(within(rows[index]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(pair.map(player => player.stats[stat].toLocaleString()));
  }
  const note = stats.map(stat => hlNoteFor(pair[0].name, stat)).find(Boolean)!;
  expect(result).toHaveTextContent(note);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('reveals both players and all three comparisons when the player gives up before picking', () => {
  const pair = dealPair();
  render(<HigherLower />);
  expect(screen.getAllByText('???', { exact: true })).toHaveLength(3);
  expectComparison(giveUp(), pair);
});

it('uses the reveal instead of a miss explanation when giving up during a correct comparison', () => {
  const pair = dealPair();
  render(<HigherLower />);
  choose(pair, true);

  const result = giveUp();
  expectComparison(result, pair);
  expect(result).toHaveTextContent(/Final Streak: 0/);
  expect(result).not.toHaveTextContent(/, but /);
});

it('keeps the ordinary wrong-pick explanation after the reveal timer', () => {
  const pair = dealPair();
  render(<HigherLower />);
  choose(pair, false);
  act(() => vi.advanceTimersByTime(3000));

  const result = screen.getByRole('status');
  expect(result).toHaveTextContent(pair[0].name);
  expect(result).toHaveTextContent(pair[1].name);
  expect(result).toHaveTextContent(/, but /);
  expect(within(result).queryByRole('table')).not.toBeInTheDocument();
});
