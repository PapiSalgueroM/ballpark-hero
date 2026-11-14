import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordCompletion } from '@/lib/completions';
import type { PlayerEntity } from '@/lib/playerSearch';
import { whoAmIPlayerFromEntity, type WhoAmIPlayer } from '@/lib/whoAmI';
import WhoAmI from '@/pages/WhoAmI';

vi.mock('@/lib/whoAmI', async original => ({
  ...await original<typeof import('@/lib/whoAmI')>(),
  fetchWhoAmIPool: vi.fn(async () => ({ pool: [first, second], clubHistory: new Map() })),
  whoAmIPlayerFromEntity: vi.fn(),
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  default: ({ onSelect }: { onSelect: (player: PlayerEntity) => void }) => (
    <div>
      {[first, second].map(player => (
        <button key={player.personKey} onClick={() => onSelect({
          key: player.personKey, personKey: player.personKey, name: player.name, rawName: player.name,
          meta: {}, matchRank: 0, prominence: player.value,
        })}>Guess {player.name}</button>
      ))}
    </div>
  ),
}));
vi.mock('@/components/game/GameNavbar', () => ({ GameNavbar: () => null }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));

const first: WhoAmIPlayer = {
  name: 'Fixture Alder', personKey: 'fixture-alder', nationality: 'England', position: 'Centre-Forward',
  club: 'Fixture United', value: 50_000_000, age: 25, year: 2026,
};
const second = { ...first, name: 'Fixture Birch', personKey: 'fixture-birch' };
const checking = 'Checking his season...';
const lookup = vi.mocked(whoAmIPlayerFromEntity);

function holdLookup() {
  let resolve!: (result: WhoAmIPlayer | null) => void;
  const promise = new Promise<WhoAmIPlayer | null>(done => { resolve = done; });
  lookup.mockReturnValueOnce(promise);
  return (result: WhoAmIPlayer | null) => act(async () => resolve(result));
}

type View = ReturnType<typeof render>;
const click = (view: View, name: string | RegExp) => fireEvent.click(view.getByRole('button', { name }));

async function start() {
  const view = render(<MemoryRouter><HelmetProvider><WhoAmI /></HelmetProvider></MemoryRouter>);
  fireEvent.click(await view.findByRole('button', { name: "Let's Play!" }));
  fireEvent.click(await view.findByRole('button', { name: /Casual/ }));
  return view;
}

function giveUp(view: View) {
  expect(view.getByText(checking)).toBeVisible();
  expect(view.getByRole('button', { name: 'Give up' })).toBeEnabled();
  click(view, 'Give up');
  click(view, 'Yes, reveal it');
  expect(view.getByRole('heading', { name: 'Out of guesses' })).toBeVisible();
  expect(recordCompletion).toHaveBeenCalledTimes(1);
}

beforeEach(() => {
  localStorage.clear();
  lookup.mockReset();
  vi.mocked(recordCompletion).mockClear();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Who Am I guess lookup ownership', () => {
  it('keeps a confirmed give-up result when the lookup returns its exact answer', async () => {
    const complete = holdLookup();
    const view = await start();
    click(view, 'Guess Fixture Alder');
    giveUp(view);

    await complete(first);
    expect(view.queryByRole('heading', { name: 'Out of guesses' })).toBeVisible();
    expect(view.queryByText('Your guesses, hottest first')).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it.each([['the exact answer', first], ['a lookup failure', null]] as const)(
    'keeps a new round pending when an old lookup returns %s', async (_, oldResult) => {
      const completeOld = holdLookup();
      const completeNew = holdLookup();
      const view = await start();
      click(view, 'Guess Fixture Alder');
      giveUp(view);
      click(view, 'Play again');
      expect(view.queryByText(checking)).toBeNull();
      click(view, 'Guess Fixture Birch');
      expect(view.getByText(checking)).toBeVisible();
      expect(lookup).toHaveBeenCalledTimes(2);

      await completeOld(oldResult);
      expect(view.getByText(checking)).toBeVisible();
      expect(view.queryByText(/Couldn't pull up his season/)).toBeNull();
      expect(view.queryByText('Last guess')).toBeNull();
      expect(recordCompletion).toHaveBeenCalledTimes(1);
      click(view, 'Guess Fixture Alder');
      expect(lookup).toHaveBeenCalledTimes(2);

      await completeNew(second);
      expect(view.getByRole('heading', { name: 'Found him in 1 guess' })).toBeVisible();
      expect(recordCompletion).toHaveBeenCalledTimes(2);
    },
  );

  it('still shows a legitimate lookup failure and scores the retry after cancelling give-up', async () => {
    const fail = holdLookup();
    const view = await start();
    click(view, 'Guess Fixture Alder');
    click(view, 'Give up');
    click(view, 'Keep playing');
    await fail(null);
    expect(view.getByText(/Couldn't pull up his season/)).toBeVisible();
    expect(recordCompletion).not.toHaveBeenCalled();

    const retry = holdLookup();
    click(view, 'Guess Fixture Alder');
    await retry(first);
    expect(view.getByRole('heading', { name: 'Found him in 1 guess' })).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith('/who-am-i', undefined, 'FixtureBaller');
  });
});
