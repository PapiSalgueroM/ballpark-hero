import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordCompletion } from '@/lib/completions';
import type { PlayerEntity } from '@/lib/playerSearch';
import { fetchWhoAmIPool, whoAmIPlayerFromEntity, type WhoAmIPlayer } from '@/lib/whoAmI';
import { WHO_AM_I_ROUND_KEY } from '@/lib/whoAmIRoundSave';
import WhoAmI from '@/pages/WhoAmI';

vi.mock('@/lib/whoAmI', async original => ({
  ...await original<typeof import('@/lib/whoAmI')>(),
  fetchWhoAmIPool: vi.fn(async () => ({ pool: [first, second], clubHistory: new Map() })),
  whoAmIPlayerFromEntity: vi.fn(),
}));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'FixtureBaller' }));
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  default: ({ onSelect, disabled }: { onSelect: (player: PlayerEntity) => void; disabled?: boolean }) => (
    <div>
      {[first, second].map(player => (
        <button key={player.personKey} disabled={disabled} onClick={() => onSelect({
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
const openGame = () => render(<MemoryRouter><HelmetProvider><WhoAmI /></HelmetProvider></MemoryRouter>);
const roundBytes = () => localStorage.getItem(WHO_AM_I_ROUND_KEY);

async function start() {
  const view = openGame();
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

  it('restores an accepted guess and the completed answer across reload without recording twice', async () => {
    const initial = await start();
    lookup.mockResolvedValueOnce(second);
    await act(async () => click(initial, 'Guess Fixture Birch'));
    expect(initial.getByText('Last guess')).toBeVisible();
    const lastGuess = initial.getByText('Last guess').parentElement?.textContent;
    expect(lastGuess).toContain('Fixture Birch');
    const accepted = roundBytes();
    expect(accepted).not.toBeNull();
    initial.unmount();

    vi.mocked(fetchWhoAmIPool).mockResolvedValueOnce(null);
    const resumed = openGame();
    expect(await resumed.findByText('Last guess')).toBeVisible();
    expect(resumed.getByText('Last guess').parentElement?.textContent).toEqual(lastGuess);
    expect(resumed.getByText('24 left')).toBeVisible();
    expect(roundBytes()).toBe(accepted);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(resumed.getByRole('button', { name: 'Guess Fixture Alder' })).toBeDisabled();
    vi.mocked(fetchWhoAmIPool).mockResolvedValueOnce({ pool: [second], clubHistory: new Map() });
    await act(async () => fireEvent.click(await resumed.findByRole('button', { name: 'Try again' })));

    lookup.mockResolvedValueOnce(first);
    await act(async () => click(resumed, 'Guess Fixture Alder'));
    expect(resumed.getByRole('heading', { name: 'Found him in 2 guesses' })).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    const completed = roundBytes();
    resumed.unmount();

    vi.mocked(fetchWhoAmIPool).mockResolvedValueOnce(null);
    const result = openGame();
    expect(await result.findByRole('heading', { name: 'Found him in 2 guesses' })).toBeVisible();
    expect(roundBytes()).toBe(completed);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('keeps newer bytes when a stale tab receives the exact answer', async () => {
    const complete = holdLookup();
    const old = await start();
    click(old, 'Guess Fixture Alder');
    expect(old.getByText(checking)).toBeVisible();
    const newer = JSON.stringify({ version: 1, phase: 'playing', budget: 10, secret: second, guesses: [] });
    localStorage.setItem(WHO_AM_I_ROUND_KEY, newer);

    await complete(first);
    expect(old.getByRole('status')).toHaveTextContent('This round changed in another tab. Reload to continue.');
    expect(roundBytes()).toBe(newer);
    expect(recordCompletion).not.toHaveBeenCalled();
    expect(old.queryByText('Last guess')).toBeNull();
    old.unmount();
    const reopened = openGame();
    expect(await reopened.findByText('10 left')).toBeVisible();
  });

  it('drops a pending guess when its original page unmounts', async () => {
    const complete = holdLookup();
    const old = await start();
    click(old, 'Guess Fixture Alder');
    expect(old.getByText(checking)).toBeVisible();
    const accepted = roundBytes();
    old.unmount();

    const reopened = openGame();
    expect(await reopened.findByText('25 left')).toBeVisible();
    await complete(first);
    expect(roundBytes()).toBe(accepted);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('clears the result on Switch mode and opens the new guess limit', async () => {
    const view = await start();
    click(view, 'Give up');
    click(view, 'Yes, reveal it');
    expect(view.getByRole('heading', { name: 'Out of guesses' })).toBeVisible();
    const givenUp = roundBytes();
    view.unmount();

    const restored = openGame();
    const switchMode = await restored.findByRole('button', { name: 'Switch mode' });
    expect(roundBytes()).toBe(givenUp);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    fireEvent.click(switchMode);
    expect(roundBytes()).toBeNull();

    fireEvent.click(await restored.findByRole('button', { name: /Expert/ }));
    expect(restored.getByText('10 left')).toBeVisible();
    lookup.mockResolvedValueOnce(second);
    await act(async () => click(restored, 'Guess Fixture Birch'));
    expect(restored.getByRole('heading', { name: 'Found him in 1 guess' })).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(2);
    click(restored, 'Switch mode');
    restored.unmount();
    const mode = openGame();
    expect(await mode.findByRole('button', { name: /Expert/ })).toBeVisible();
    expect(roundBytes()).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(2);
  });

  it.each(['read', 'write'])('keeps playing locally when the round save cannot %s', async operation => {
    const get = Storage.prototype.getItem;
    const put = Storage.prototype.setItem;
    if (operation === 'read') {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
        if (key === WHO_AM_I_ROUND_KEY) throw new Error('Storage denied');
        return get.call(this, key);
      });
    } else {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
        if (key === WHO_AM_I_ROUND_KEY) throw new Error('Storage denied');
        return put.call(this, key, value);
      });
    }
    const view = await start();
    lookup.mockResolvedValueOnce(first);
    await act(async () => click(view, 'Guess Fixture Alder'));
    expect(view.getByRole('heading', { name: 'Found him in 1 guess' })).toBeVisible();
    expect(get.call(localStorage, WHO_AM_I_ROUND_KEY)).toBeNull();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it('keeps unknown saved versions untouched until a player chooses a new round', async () => {
    const unknown = JSON.stringify({ version: 2, phase: 'won', budget: 25, secret: first, guesses: [] });
    localStorage.setItem(WHO_AM_I_ROUND_KEY, unknown);
    const view = openGame();
    fireEvent.click(await view.findByRole('button', { name: "Let's Play!" }));
    expect(await view.findByRole('button', { name: /Casual/ })).toBeVisible();
    expect(roundBytes()).toBe(unknown);
    expect(recordCompletion).not.toHaveBeenCalled();
  });
});
