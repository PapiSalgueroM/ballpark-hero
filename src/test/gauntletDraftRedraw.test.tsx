import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { players } from '@/data/players';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { buildDraft, dailyDraftSeed, gdFits, loadDailyRun, redrawGauntletPick, runGauntlet } from '@/lib/gauntletDraft';
import { fetchSquadPool } from '@/lib/squadDeal';
import GauntletDraft from '@/pages/GauntletDraft';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: vi.fn() }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children }: { children: ReactNode }) => <main>{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/lib/squadDeal', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/squadDeal')>(),
  fetchSquadPool: vi.fn(),
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); localStorage.clear(); });

it('redraws five distinct available players for the existing slot without changing another offer', () => {
  const seed = 31337;
  const draft = buildDraft(players, seed);
  const original = draft.picks.flatMap(pick => pick.choices);
  const input = [...original, ...players];
  const pick = draft.picks[3];
  const result = redrawGauntletPick(input, draft, 3, seed);
  expect(result).toHaveLength(5);
  const names = result!.map(player => player.name);
  expect(new Set(names).size).toBe(5);
  expect(result!.every(player => gdFits(player, pick.slot))).toBe(true);
  expect(names.some(name => original.some(player => player.name === name))).toBe(false);
  expect(redrawGauntletPick(input, draft, 3, seed)).toEqual(result);
  expect(redrawGauntletPick([...original, ...result!.slice(0, 4)], draft, 3, seed)).toBeNull();
  expect(draft).toEqual(buildDraft(players, seed));
});

it('keeps the selected redraw card, runs the same cup engine, and never gives Daily a redraw', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-11-14T17:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  vi.mocked(fetchSquadPool).mockResolvedValue(players);
  const view = render(<GauntletDraft />);
  await act(async () => {});
  fireEvent.click(view.getByRole('button', { name: /^Unlimited/ }));
  const cardGroup = () => view.getByRole('group', { name: 'Draft cards' });
  const names = () => within(cardGroup()).getAllByRole('button').map(card => card.querySelector('[data-gauntlet-player]')?.textContent);
  const seed = Math.floor(0.25 * 2147483645) + 1;
  const original = buildDraft(players, seed);
  expect(names()).toEqual(original.picks[0].choices.map(player => player.name));
  const redrawButton = view.getByRole('button', { name: 'Redraw cards' });
  await act(async () => { fireEvent.click(redrawButton); fireEvent.click(redrawButton); });
  const replacement = redrawGauntletPick(players, original, 0, seed)!;
  expect(names()).toEqual(replacement.map(player => player.name));
  expect(view.getByRole('button', { name: 'Redraw used' })).toBeDisabled();
  fireEvent.click(within(cardGroup()).getAllByRole('button')[0]);
  for (const pick of original.picks.slice(1)) {
    expect(names()).toEqual(pick.choices.map(player => player.name));
    fireEvent.click(within(cardGroup()).getAllByRole('button')[0]);
  }
  const run = runGauntlet([replacement[0], ...original.picks.slice(1).map(pick => pick.choices[0])]);
  expect(useGameCompletion).toHaveBeenLastCalledWith('gauntlet-draft', true, run.score, run.roundsCleared);
  expect(loadDailyRun('2026-11-14')).toBeNull();
  view.unmount();

  const dailyView = render(<GauntletDraft />);
  await act(async () => {});
  fireEvent.click(dailyView.getByRole('button', { name: /^Daily gauntlet/ }));
  const daily = buildDraft(players, dailyDraftSeed('2026-11-14'));
  for (const pick of daily.picks) {
    expect(dailyView.queryByRole('button', { name: /Redraw/ })).toBeNull();
    const cards = within(dailyView.getByRole('group', { name: 'Draft cards' })).getAllByRole('button');
    expect(cards.map(card => card.querySelector('[data-gauntlet-player]')?.textContent)).toEqual(pick.choices.map(player => player.name));
    fireEvent.click(cards[0]);
  }
  expect(loadDailyRun('2026-11-14')).toEqual(runGauntlet(daily.picks.map(pick => pick.choices[0])));
}, 15_000);

it('keeps the offer and lets the player spend the redraw later when this slot is short', async () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  vi.mocked(fetchSquadPool).mockResolvedValue(players.filter(player => player.position !== 'GK').concat(
    players.filter(player => player.position === 'GK').slice(0, 9),
  ));
  const view = render(<GauntletDraft />);
  await act(async () => {});
  fireEvent.click(view.getByRole('button', { name: /^Unlimited/ }));
  const cards = () => within(view.getByRole('group', { name: 'Draft cards' })).getAllByRole('button');
  const firstOffer = cards().map(card => card.textContent);
  expect(firstOffer).toHaveLength(5);
  fireEvent.click(view.getByRole('button', { name: 'Redraw cards' }));
  expect(view.getByText('Too few new players fit this slot. You can still redraw another slot.')).toBeVisible();
  expect(cards().map(card => card.textContent)).toEqual(firstOffer);
  expect(view.getByRole('button', { name: 'Redraw cards' })).toBeDisabled();
  fireEvent.click(cards()[0]);
  expect(view.getByRole('button', { name: 'Redraw cards' })).toBeEnabled();
  fireEvent.click(view.getByRole('button', { name: 'Redraw cards' }));
  expect(view.getByRole('button', { name: 'Redraw used' })).toBeDisabled();
});
