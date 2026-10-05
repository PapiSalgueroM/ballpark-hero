import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Index from '@/pages/Index';
import Search from '@/pages/Search';
import { GAME_PICKS_KEY, useGamePicks } from '@/hooks/useGamePicks';

const network = vi.hoisted(() => ({ recordCompletion: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture' }));
vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Fixture', getLocalTodayCount: () => 0, recordCompletion: network.recordCompletion }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/hooks/useMostPlayed', () => ({ useMostPlayed: () => ({ entries: [], loading: false }) }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/home/FeaturedStage', () => ({ FeaturedStage: () => null }));
vi.mock('@/components/home/ContinueRow', () => ({ ContinueRow: () => null }));
vi.mock('@/components/home/DailyRail', () => ({ DailyRail: () => <a href="/daily-fixture">Daily fixture</a> }));
vi.mock('@/components/home/JustShipped', () => ({ JustShipped: () => null }));
vi.mock('@/components/home/HomeAbout', () => ({ HomeAbout: () => null }));
vi.mock('@/components/home/PollOfTheDay', () => ({ PollOfTheDay: () => null }));

const KEY = 'dukb-game-picks-v1';
const warning = 'Picks last for this visit. This browser could not save them.';
const held = {
  'footle-daily-2026-10-05': '{"fixture":"unfinished Footle","guesses":["held"]}',
  'nba-connections-notes-v1:daily': '{"fixture":"held NBA notes"}',
  'dukb-local-completions': '[]',
  'dukb-play-diary-v1': '{"fixture":"held diary"}',
};
const protectedBytes = () => Object.keys(held).map(key => [key, localStorage.getItem(key)]);
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
function Address() { const location = useLocation(); return <output data-testid="address">{location.pathname + location.search}</output>; }
async function mount(path = '/') {
  const view = render(<MemoryRouter initialEntries={[path]}><Address /><Routes>
    <Route path="/" element={<Index />} /><Route path="/search" element={<Search />} />
    <Route path="*" element={<p>Game opened</p>} />
  </Routes></MemoryRouter>);
  await flush(); return view;
}
type View = Awaited<ReturnType<typeof mount>>;
const pin = (view: View, name: string) => view.getByRole('button', { name: 'Pin ' + name });
const shelf = (view: View) => view.container.querySelector<HTMLElement>('[data-home-picks]')!;
const shelfLinks = (view: View) => Array.from(shelf(view)?.querySelectorAll<HTMLAnchorElement>('a[data-game-pick-link]') ?? []).map(link => ({ path: link.getAttribute('href'), name: link.textContent?.trim() }));
const saved = () => JSON.parse(localStorage.getItem(KEY) || '[]') as string[];

beforeEach(() => {
  localStorage.clear(); network.recordCompletion.mockReset();
  for (const [key, value] of Object.entries(held)) localStorage.setItem(key, value);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Picks mounted tests must stay offline'); }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const reset = renderHook(() => useGamePicks());
  act(() => reset.result.current.toggle('/footle'));
  reset.unmount();
  localStorage.clear();
  for (const [key, value] of Object.entries(held)) localStorage.setItem(key, value);
});
afterEach(() => {
  cleanup(); expect(network.recordCompletion).not.toHaveBeenCalled();
  expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('browser-local game picks', () => {
  it('pins Footle from Home without opening a game or touching saves and scores', async () => {
    expect(GAME_PICKS_KEY).toBe(KEY);
    const view = await mount(), before = protectedBytes(), control = pin(view, 'Footle');
    expect(control.closest('a'), 'Pinning has a separate button from the launch link').toBeNull();
    expect(control).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(control);
    expect(view.getByTestId('address')).toHaveTextContent(/^\/$/);
    expect(saved()).toEqual(['/footle']);
    expect(shelf(view)).toHaveAttribute('data-no-prerender');
    expect(within(shelf(view)).getByRole('heading', { name: 'Your picks' })).toBeInTheDocument();
    expect(shelfLinks(view).map(link => link.path)).toEqual(['/footle']);
    expect(shelfLinks(view)[0].name).toContain('Footle');
    for (const button of view.getAllByRole('button', { name: 'Unpin Footle' })) expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(protectedBytes()).toEqual(before);
  });

  it('pins NHL Connections from Search and restores both exact Home destinations after remount', async () => {
    localStorage.setItem(KEY, JSON.stringify(['/footle']));
    const search = await mount('/search?q=NHL%20Connections'), before = protectedBytes();
    const control = pin(search, 'NHL Connections');
    expect(control.closest('a')).toBeNull(); fireEvent.click(control);
    expect(search.getByTestId('address')).toHaveTextContent('/search?q=NHL%20Connections');
    expect(saved()).toEqual(['/footle', '/nhl-connections']);
    expect(search.getByRole('button', { name: 'Unpin NHL Connections' })).toHaveAttribute('aria-pressed', 'true');
    search.unmount(); const home = await mount();
    expect(shelfLinks(home).map(link => link.path)).toEqual(['/footle', '/nhl-connections']);
    expect(shelfLinks(home).map(link => link.name).join(' ')).toContain('NHL Connections');
    expect(protectedBytes()).toEqual(before);
  });

  it('removes only the chosen pick and launches the retained game through its real link', async () => {
    localStorage.setItem(KEY, JSON.stringify(['/footle', '/nhl-connections']));
    const view = await mount(), before = protectedBytes();
    fireEvent.click(within(shelf(view)).getByRole('button', { name: 'Unpin Footle' }));
    expect(saved()).toEqual(['/nhl-connections']);
    expect(shelfLinks(view).map(link => link.path)).toEqual(['/nhl-connections']);
    expect(pin(view, 'Footle')).toHaveAttribute('aria-pressed', 'false');
    view.unmount(); const again = await mount();
    expect(shelfLinks(again).map(link => link.path)).toEqual(['/nhl-connections']);
    const link = shelf(again).querySelector<HTMLAnchorElement>('a[data-game-pick-link="/nhl-connections"]')!;
    fireEvent.click(link);
    expect(again.getByTestId('address')).toHaveTextContent('/nhl-connections');
    expect(again.getByText('Game opened')).toBeInTheDocument(); expect(protectedBytes()).toEqual(before);
  });

  it('filters hostile saved paths and duplicates without rewriting storage while reading', async () => {
    const documents: [string, string[]][] = [
      ['{', []], ['null', []], ['{"paths":["/footle"]}', []], ['"/footle"', []],
      [JSON.stringify(['/footle', '/footle', '/nhl-connections', '/does-not-exist', 'https://example.invalid', 'javascript:alert(1)', '/grade-transfer', null, 4, {}]), ['/footle', '/nhl-connections']],
    ];
    for (const [raw, expected] of documents) {
      localStorage.setItem(KEY, raw); const before = protectedBytes();
      const writes = vi.spyOn(Storage.prototype, 'setItem'); const view = await mount();
      expect(shelfLinks(view).map(link => link.path), 'Only real visible games may appear in Your picks').toEqual(expected);
      expect(localStorage.getItem(KEY), 'Reading never rewrites the saved document').toBe(raw);
      expect(writes.mock.calls.filter(([key]) => key === KEY)).toEqual([]);
      const notes = renderHook(() => useGamePicks());
      expect(notes.result.current.paths, 'Stored choices contain only valid unique game paths').toEqual(expected);
      notes.unmount();
      expect(protectedBytes()).toEqual(before); view.unmount(); writes.mockRestore();
    }
  });

  it('keeps failed writes useful across page changes and labels them as this-visit picks', async () => {
    const home = await mount(), before = protectedBytes();
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function(this: Storage, key, value) {
      if (key === KEY) throw new Error('Fixture quota'); realSet.call(this, key, value);
    });
    fireEvent.click(pin(home, 'Footle'));
    expect(shelfLinks(home).map(link => link.path)).toEqual(['/footle']);
    expect(home.queryByText(warning) !== null, 'Failed writes show the visit-only warning').toBe(true);
    expect(home.queryByText(warning)).toBeVisible(); expect(localStorage.getItem(KEY)).toBeNull();
    home.unmount(); const search = await mount('/search?q=NHL%20Connections');
    fireEvent.click(pin(search, 'NHL Connections'));
    expect(search.queryByText(warning)).toBeVisible(); search.unmount();
    const again = await mount();
    expect(shelfLinks(again).map(link => link.path)).toEqual(['/footle', '/nhl-connections']);
    expect(again.queryByText(warning)).toBeVisible(); expect(localStorage.getItem(KEY)).toBeNull();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: '[]', storageArea: localStorage })));
    expect(shelfLinks(again).map(link => link.path), 'Queued events cannot erase unsaved visit picks').toEqual(['/footle', '/nhl-connections']);
    expect(again.queryByText(warning)).toBeVisible();
    expect(protectedBytes()).toEqual(before);
  });

  it('shows an honest warning when the browser cannot read saved picks', async () => {
    const clean = await mount(); clean.unmount();
    const realGet = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function(this: Storage, key) {
      if (key === KEY) throw new Error('Fixture blocked read'); return realGet.call(this, key);
    });
    const view = await mount();
    expect(view.queryByText(warning) !== null, 'Failed reads show the visit-only warning').toBe(true);
    expect(view.queryByText(warning)).toBeVisible();
    expect(shelfLinks(view)).toEqual([]); expect(pin(view, 'Footle')).toBeEnabled();
  });

  it('adopts cross-tab updates removals and clear without echoing a storage write', async () => {
    const view = await mount(), before = protectedBytes();
    const realSet = Storage.prototype.setItem, realRemove = Storage.prototype.removeItem;
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    const removals = vi.spyOn(Storage.prototype, 'removeItem');
    const update = (key: string | null, stored: string | null, newValue = stored) => act(() => {
      if (stored === null) realRemove.call(localStorage, key ?? KEY);
      else realSet.call(localStorage, key ?? KEY, stored);
      window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: localStorage }));
    });
    update(KEY, JSON.stringify(['/footle', '/nhl-connections', '/not-real']));
    expect(shelfLinks(view).map(link => link.path)).toEqual(['/footle', '/nhl-connections']);
    update('another-feature', '[]');
    expect(shelfLinks(view).map(link => link.path)).toEqual(['/footle', '/nhl-connections']);
    update(KEY, JSON.stringify(['/nhl-connections']));
    expect(shelfLinks(view).map(link => link.path)).toEqual(['/nhl-connections']);
    update(KEY, JSON.stringify(['/footle']), JSON.stringify(['/nhl-connections']));
    expect(shelfLinks(view).map(link => link.path), 'Queued old payloads must not replace newer stored choices').toEqual(['/footle']);
    update(KEY, '{'); expect(shelfLinks(view)).toEqual([]);
    update(KEY, JSON.stringify(['/footle'])); update(null, null);
    expect(shelfLinks(view)).toEqual([]);
    expect(writes.mock.calls.filter(([key]) => key === KEY)).toEqual([]);
    expect(removals.mock.calls.filter(([key]) => key === KEY)).toEqual([]);
    expect(protectedBytes()).toEqual(before);
  });

  it('merges a stale tab toggle with the current stored picks', async () => {
    const view = await mount(), before = protectedBytes();
    localStorage.setItem(KEY, JSON.stringify(['/nhl-connections']));
    fireEvent.click(pin(view, 'Footle'));
    expect(saved(), 'A local pin must retain a pick saved before its storage event arrives').toEqual(['/nhl-connections', '/footle']);
    expect(shelfLinks(view).map(link => link.path)).toEqual(['/nhl-connections', '/footle']);
    view.unmount();

    localStorage.setItem(KEY, JSON.stringify(['/nhl-connections']));
    const sameTarget = await mount();
    const stalePin = pin(sameTarget, 'Footle');
    localStorage.setItem(KEY, JSON.stringify(['/nhl-connections', '/footle']));
    fireEvent.click(stalePin);
    expect(saved(), 'A stale Pin keeps the same game pinned after another tab pins it').toEqual(['/nhl-connections', '/footle']);
    expect(shelfLinks(sameTarget).map(link => link.path)).toEqual(['/nhl-connections', '/footle']);

    const staleUnpin = within(shelf(sameTarget)).getByRole('button', { name: 'Unpin Footle' });
    localStorage.setItem(KEY, JSON.stringify(['/nhl-connections']));
    fireEvent.click(staleUnpin);
    expect(saved(), 'A stale Unpin keeps the same game removed after another tab removes it').toEqual(['/nhl-connections']);
    expect(shelfLinks(sameTarget).map(link => link.path)).toEqual(['/nhl-connections']);
    expect(pin(sameTarget, 'Footle')).toHaveAttribute('aria-pressed', 'false');
    expect(protectedBytes()).toEqual(before);
  });

  it('keeps keyboard focus on a useful control when shelf picks are removed', async () => {
    localStorage.setItem(KEY, JSON.stringify(['/footle', '/nhl-connections']));
    const view = await mount(), row = shelf(view);
    const first = within(row).getByRole('button', { name: 'Unpin Footle' });
    first.focus(); fireEvent.click(first);
    const last = within(shelf(view)).getByRole('button', { name: 'Unpin NHL Connections' });
    expect(document.activeElement, 'Removing a focused pick keeps the next pick reachable').toBe(last);
    fireEvent.click(last);
    expect(shelf(view)).toBeNull();
    expect(document.activeElement, 'Removing the last pick focuses the next existing game link').toBe(view.getByRole('link', { name: 'Daily fixture' }));
    expect(saved()).toEqual([]);
  });

  it('keeps the original Search result link and arrow-key launch flow with no picks', async () => {
    const view = await mount('/search?q=Footle');
    const link = view.container.querySelector<HTMLAnchorElement>('a[data-result][href="/footle"]')!;
    expect(link).toBeInTheDocument(); expect(link).toHaveTextContent('Footle');
    const input = view.getByRole('textbox', { name: 'Search games' });
    input.focus(); fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(link);
    fireEvent.click(link); expect(view.getByTestId('address')).toHaveTextContent('/footle');
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
