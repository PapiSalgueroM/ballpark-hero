import { useEffect } from 'react';
import assert from 'node:assert/strict';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';
import { SiteMenu } from '@/components/layout/SiteMenu';
import { searchSite } from '@/lib/siteSearch';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ORIGINAL_LINKS = [
  ['Home', '/'], ['Search Games', '/search'], ['Record Books', '/records'],
  ['Leaderboard', '/leaderboard'], ["What's New", '/whats-new'],
  ['Soccer', '/soccer'], ['NBA', '/pro-basketball'], ['NHL', '/hockey'],
  ['NFL', '/pro-football'], ['MLB', '/baseball'], ['College', '/college'],
  ['About', '/about'], ['Contact', '/contact'], ['Privacy Policy', '/privacy'],
  ['Cookie Policy', '/cookie-policy'], ['Terms of Service', '/terms'],
  ['Accessibility', '/accessibility'],
] as const;

async function menuHost(initial = '/soccer?kept=one#anchor') {
  let actualNavigate: NavigateFunction | undefined;
  function Host() {
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => { actualNavigate = navigate; }, [navigate]);
    return <>
      <SiteMenu />
      <output data-testid="finder-router-location" data-route-key={location.key}
        data-pathname={location.pathname} data-search={location.search} data-hash={location.hash}>
        {location.pathname + location.search + location.hash}
      </output>
    </>;
  }
  render(<MemoryRouter initialEntries={[initial]}><Host /></MemoryRouter>);
  await waitFor(() => expect(actualNavigate, 'MENU_FINDER_ACTUAL_ROUTER_READY').toBeDefined());
  return {
    navigate(target: string) {
      if (!actualNavigate) throw new Error('MENU_FINDER_ACTUAL_ROUTER_NOT_READY');
      act(() => { actualNavigate!(target); });
    },
  };
}

async function openFinder() {
  const trigger = screen.getByRole('button', { name: 'Open site menu' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = await screen.findByRole('dialog', { name: 'Menu' });
  const menu = within(dialog);
  const field = menu.queryByRole('searchbox', { name: 'Find a game' });
  // The unchanged panel must stop here in each case, before later finder checks.
  assert(field instanceof HTMLInputElement, 'MENU_FINDER_FIELD_PRESENT');
  return { trigger, dialog, menu, field };
}

async function expectClosed(marker: string) {
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' }), marker).not.toBeInTheDocument());
}

function routeSnapshot() {
  const output = screen.getByTestId('finder-router-location');
  return {
    url: output.textContent,
    key: output.getAttribute('data-route-key'),
    pathname: output.getAttribute('data-pathname'),
    search: output.getAttribute('data-search'),
    hash: output.getAttribute('data-hash'),
  };
}

function expectOriginalNavigation(dialog: HTMLElement) {
  const nav = within(dialog).getByRole('navigation', { name: 'Site navigation' });
  const links = within(nav).getAllByRole('link');
  expect(links, 'MENU_FINDER_ORIGINAL_SEVENTEEN_LINKS').toHaveLength(17);
  for (const [name, href] of ORIGINAL_LINKS) {
    const link = within(nav).getByRole('link', { name });
    expect(link, 'MENU_FINDER_ORIGINAL_HREF_' + href).toHaveAttribute('href', href);
    expect(link, 'MENU_FINDER_ORIGINAL_VISIBLE_' + href).toBeVisible();
  }
}

function resultLinks(dialog: HTMLElement, raw: string) {
  const section = within(dialog).getByRole('region', { name: 'Game results' });
  const allHref = '/search?' + new URLSearchParams({ q: raw }).toString();
  return within(section).queryAllByRole('link').filter(link => link.getAttribute('href') !== allHref);
}

function expectRankedResults(dialog: HTMLElement, raw: string) {
  const expected = searchSite(raw);
  const shown = resultLinks(dialog, raw);
  expect(shown.map(link => link.getAttribute('href')), 'MENU_FINDER_ACTUAL_RANKED_FIRST_SIX')
    .toEqual(expected.slice(0, 6).map(row => row.game.path));
  shown.forEach((link, index) => {
    expect(link, 'MENU_FINDER_ACTUAL_RESULT_LABEL').toHaveTextContent(expected[index].game.label);
    expect(link, 'MENU_FINDER_ACTUAL_RESULT_CATEGORY').toHaveTextContent(expected[index].category);
  });
  return { expected, shown };
}

function storedRows(storage: Storage): [string, string | null][] {
  const rows: [string, string | null][] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null) rows.push([key, storage.getItem(key)]);
  }
  return rows.sort(([left], [right]) => left.localeCompare(right));
}

describe('Menu game finder', () => {
  it('opens without editable autofocus and keeps original navigation', async () => {
    await menuHost();
    const { dialog, menu, field } = await openFinder();
    expect(field, 'MENU_FINDER_SEARCH_INPUT_TYPE').toHaveAttribute('type', 'search');
    expect(field.maxLength, 'MENU_FINDER_NATIVE_MAX_LENGTH').toBe(80);
    expect(field, 'MENU_FINDER_INITIAL_EMPTY').toHaveValue('');
    await waitFor(() => expect(menu.getByRole('heading', { name: 'Menu' }),
      'MENU_FINDER_NONEDITABLE_TITLE_FOCUS').toHaveFocus());
    expect(field, 'MENU_FINDER_NO_EDITABLE_AUTOFOCUS').not.toHaveFocus();
    expectOriginalNavigation(dialog);
    expect(menu.getByRole('link', { name: 'Soccer' }), 'MENU_FINDER_CURRENT_ROUTE_HELD')
      .toHaveAttribute('aria-current', 'page');
    expect(menu.getByRole('button', { name: 'Close' }), 'MENU_FINDER_CLOSE_HELD').toBeVisible();
    const cookieHost = dialog.querySelector('[data-dukb-help-cookie-choices]');
    assert(cookieHost instanceof HTMLElement, 'MENU_FINDER_COOKIE_HOST_PRESENT');
    expect(cookieHost.parentElement?.firstElementChild, 'MENU_FINDER_COOKIE_HOST_FIRST').toBe(cookieHost);
    expect(menu.queryByRole('region', { name: 'Game results' })?.querySelectorAll('a').length ?? 0,
      'MENU_FINDER_NO_EMPTY_CATALOG_DUMP').toBe(0);
    fireEvent.change(field, { target: { value: '   ' } });
    expectOriginalNavigation(dialog);
    expect(menu.queryByRole('region', { name: 'Game results' })?.querySelectorAll('a').length ?? 0,
      'MENU_FINDER_WHITESPACE_IS_BROWSE').toBe(0);
  });

  it('ranks actual catalog games and updates results as query changes', async () => {
    await menuHost();
    const { dialog, field } = await openFinder();
    fireEvent.change(field, { target: { value: 'Club Manager' } });
    const first = expectRankedResults(dialog, 'Club Manager');
    assert(first.expected.length > 0, 'MENU_FINDER_REAL_CATALOG_MATCH_FOUNDATION');
    expect(first.expected[0].game.path, 'MENU_FINDER_KNOWN_EXACT_LABEL_PATH').toBe('/club-manager');
    expect(first.shown[0], 'MENU_FINDER_KNOWN_GAME_RENDERED').toHaveAttribute('href', '/club-manager');
    const firstPaths = first.shown.map(link => link.getAttribute('href'));
    fireEvent.change(field, { target: { value: 'hockey grid' } });
    const next = expectRankedResults(dialog, 'hockey grid');
    assert(next.expected.length > 0, 'MENU_FINDER_SECOND_REAL_QUERY_FOUNDATION');
    expect(next.expected[0].game.path, 'MENU_FINDER_SPORT_AND_GAME_MATCH').toBe('/hockey-grid');
    expect(next.shown.map(link => link.getAttribute('href')), 'MENU_FINDER_QUERY_UPDATE_IS_EFFECTIVE')
      .not.toEqual(firstPaths);
    expectOriginalNavigation(dialog);
  });

  it('shows honest no results and clears without navigating', async () => {
    await menuHost();
    const before = routeSnapshot();
    const { dialog, menu, field } = await openFinder();
    fireEvent.change(field, { target: { value: '*(' } });
    expect(searchSite('*('), 'MENU_FINDER_PUNCTUATION_MISS_FOUNDATION').toEqual([]);
    expect(menu.getByText(/no games found/i), 'MENU_FINDER_HONEST_NO_RESULTS').toBeVisible();
    expect(resultLinks(dialog, '*('), 'MENU_FINDER_NO_FALSE_BROWSE_RESULTS').toHaveLength(0);
    expect(menu.queryByRole('link', { name: 'See all results' }),
      'MENU_FINDER_NO_ALL_RESULTS_FOR_MISS').not.toBeInTheDocument();
    expectOriginalNavigation(dialog);
    fireEvent.click(menu.getByRole('button', { name: 'Clear search' }));
    expect(field, 'MENU_FINDER_CLEAR_EMPTY').toHaveValue('');
    expect(field, 'MENU_FINDER_CLEAR_REFOCUSES_FIELD').toHaveFocus();
    expect(menu.queryByText(/no games found/i), 'MENU_FINDER_CLEAR_REMOVES_MISS').not.toBeInTheDocument();
    expectOriginalNavigation(dialog);
    expect(routeSnapshot(), 'MENU_FINDER_CLEAR_DOES_NOT_NAVIGATE').toEqual(before);
  });

  it('passes the full query to the existing search page', async () => {
    await menuHost();
    const { dialog, menu, field } = await openFinder();
    const raw = '  grid  ';
    fireEvent.change(field, { target: { value: raw } });
    const ranked = expectRankedResults(dialog, raw);
    assert(ranked.expected.length > 6, 'MENU_FINDER_MORE_THAN_SIX_ACTUAL_MATCHES');
    expect(ranked.shown, 'MENU_FINDER_SIX_DISPLAYED').toHaveLength(6);
    const all = menu.getByRole('link', { name: 'See all results' });
    const href = '/search?' + new URLSearchParams({ q: raw }).toString();
    expect(all, 'MENU_FINDER_ALL_RESULTS_ENCODED_RAW_QUERY').toHaveAttribute('href', href);
    fireEvent.click(all);
    await expectClosed('MENU_FINDER_ALL_RESULTS_CLOSES');
    const location = routeSnapshot();
    expect(location.pathname, 'MENU_FINDER_EXISTING_SEARCH_ROUTE').toBe('/search');
    expect(location.search, 'MENU_FINDER_REAL_SEARCH_PARAMS').toBe(href.slice('/search'.length));
    expect(new URLSearchParams(location.search ?? '').get('q'), 'MENU_FINDER_RAW_QUERY_NOT_TRIMMED').toBe(raw);
  });

  it('navigates to a game and closes including the current game', async () => {
    await menuHost('/soccer');
    let opened = await openFinder();
    fireEvent.change(opened.field, { target: { value: 'Club Manager' } });
    let game = resultLinks(opened.dialog, 'Club Manager')
      .find(link => link.getAttribute('href') === '/club-manager');
    assert(game instanceof HTMLAnchorElement, 'MENU_FINDER_REAL_GAME_LINK_FOUNDATION');
    fireEvent.click(game);
    await expectClosed('MENU_FINDER_GAME_SELECTION_CLOSES');
    expect(routeSnapshot().url, 'MENU_FINDER_REAL_GAME_NAVIGATION').toBe('/club-manager');
    opened = await openFinder();
    fireEvent.change(opened.field, { target: { value: 'Club Manager' } });
    game = resultLinks(opened.dialog, 'Club Manager')
      .find(link => link.getAttribute('href') === '/club-manager');
    assert(game instanceof HTMLAnchorElement, 'MENU_FINDER_CURRENT_GAME_LINK_FOUNDATION');
    expect(game, 'MENU_FINDER_CURRENT_GAME_MARKED').toHaveAttribute('aria-current', 'page');
    fireEvent.click(game);
    await expectClosed('MENU_FINDER_CURRENT_GAME_SELECTION_CLOSES');
    expect(routeSnapshot().url, 'MENU_FINDER_CURRENT_GAME_TARGET_HELD').toBe('/club-manager');
  });

  it('dismisses from the finder and returns visible trigger focus', async () => {
    await menuHost();
    const before = routeSnapshot();
    const { menu, trigger, field } = await openFinder();
    field.focus();
    fireEvent.change(field, { target: { value: 'grid' } });
    expect(menu.getByRole('region', { name: 'Game results' }), 'MENU_FINDER_ESCAPE_WITH_ACTUAL_RESULTS')
      .toBeVisible();
    fireEvent.keyDown(field, { key: 'Escape', code: 'Escape' });
    await expectClosed('MENU_FINDER_ESCAPE_CLOSES_ACTUAL_SHEET');
    await waitFor(() => expect(trigger, 'MENU_FINDER_ESCAPE_RETURNS_TRIGGER').toHaveFocus());
    expect(trigger, 'MENU_FINDER_TRIGGER_REMAINS_VISIBLE').toBeVisible();
    expect(routeSnapshot(), 'MENU_FINDER_ESCAPE_DOES_NOT_NAVIGATE').toEqual(before);
  });

  it('clears the finder after close and a real route-key change', async () => {
    const host = await menuHost();
    let opened = await openFinder();
    fireEvent.change(opened.field, { target: { value: 'grid' } });
    expect(opened.field, 'MENU_FINDER_DRAFT_BEFORE_CLOSE').toHaveValue('grid');
    fireEvent.click(opened.menu.getByRole('button', { name: 'Close' }));
    await expectClosed('MENU_FINDER_CLOSE_BEFORE_REOPEN');
    opened = await openFinder();
    expect(opened.field, 'MENU_FINDER_CLOSE_RESETS_DRAFT').toHaveValue('');
    fireEvent.change(opened.field, { target: { value: 'NHL' } });
    const before = routeSnapshot();
    host.navigate('/soccer?kept=two#next');
    await expectClosed('MENU_FINDER_EXTERNAL_ROUTE_KEY_CLOSES');
    const after = routeSnapshot();
    expect(after.pathname, 'MENU_FINDER_EXTERNAL_SAME_PATH').toBe(before.pathname);
    expect(after.key, 'MENU_FINDER_EXTERNAL_REAL_KEY_CHANGED').not.toBe(before.key);
    expect(after.url, 'MENU_FINDER_EXTERNAL_REAL_LOCATION').toBe('/soccer?kept=two#next');
    opened = await openFinder();
    expect(opened.field, 'MENU_FINDER_EXTERNAL_ROUTE_RESETS_DRAFT').toHaveValue('');
    expectOriginalNavigation(opened.dialog);
  });

  it('keeps draft searches out of the location and saved storage', async () => {
    const localKey = 'menu-finder-kept-local';
    const sessionKey = 'menu-finder-kept-session';
    const priorLocal = window.localStorage.getItem(localKey);
    const priorSession = window.sessionStorage.getItem(sessionKey);
    window.localStorage.setItem(localKey, 'kept local bytes');
    window.sessionStorage.setItem(sessionKey, 'kept session bytes');
    const beforeLocal = storedRows(window.localStorage);
    const beforeSession = storedRows(window.sessionStorage);
    const setItem = vi.spyOn(window.Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(window.Storage.prototype, 'removeItem');
    const clear = vi.spyOn(window.Storage.prototype, 'clear');
    try {
      await menuHost();
      const before = routeSnapshot();
      const { menu, field } = await openFinder();
      assert(beforeLocal.length > 0 && beforeSession.length > 0, 'MENU_FINDER_NONEMPTY_STORAGE_FOUNDATION');
      fireEvent.change(field, { target: { value: 'grid' } });
      fireEvent.change(field, { target: { value: 'NHL Connections' } });
      // Let a mistakenly reused Search-page URL debounce become observable.
      await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 300)); });
      expect(field, 'MENU_FINDER_DRAFT_REMAINS_LOCAL').toHaveValue('NHL Connections');
      expect(routeSnapshot(), 'MENU_FINDER_DRAFT_LOCATION_AND_HISTORY_HELD').toEqual(before);
      expect(storedRows(window.localStorage), 'MENU_FINDER_ALL_LOCAL_STORAGE_BYTES_HELD').toEqual(beforeLocal);
      expect(storedRows(window.sessionStorage), 'MENU_FINDER_ALL_SESSION_STORAGE_BYTES_HELD').toEqual(beforeSession);
      fireEvent.click(menu.getByRole('button', { name: 'Clear search' }));
      fireEvent.click(menu.getByRole('button', { name: 'Close' }));
      await expectClosed('MENU_FINDER_LOCAL_DRAFT_CLOSES');
      expect(routeSnapshot(), 'MENU_FINDER_CLEAR_AND_CLOSE_HISTORY_HELD').toEqual(before);
      expect(storedRows(window.localStorage), 'MENU_FINDER_CLEAR_AND_CLOSE_LOCAL_HELD').toEqual(beforeLocal);
      expect(storedRows(window.sessionStorage), 'MENU_FINDER_CLEAR_AND_CLOSE_SESSION_HELD').toEqual(beforeSession);
      expect(setItem, 'MENU_FINDER_NO_NATIVE_STORAGE_SET').not.toHaveBeenCalled();
      expect(removeItem, 'MENU_FINDER_NO_NATIVE_STORAGE_REMOVE').not.toHaveBeenCalled();
      expect(clear, 'MENU_FINDER_NO_NATIVE_STORAGE_CLEAR').not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
      removeItem.mockRestore();
      clear.mockRestore();
      if (priorLocal === null) window.localStorage.removeItem(localKey);
      else window.localStorage.setItem(localKey, priorLocal);
      if (priorSession === null) window.sessionStorage.removeItem(sessionKey);
      else window.sessionStorage.setItem(sessionKey, priorSession);
    }
  });
});
