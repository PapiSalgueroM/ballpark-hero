import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, Link, Outlet, RouterProvider } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Search from '@/pages/Search';

type Router = ReturnType<typeof createMemoryRouter>;
type Visit = { key: string; pathname: string; search: string; action: string };
const mounted: Array<{ router: Router; unsubscribe: () => void }> = [];

function mount(entries = ['/search'], initialIndex = entries.length - 1) {
  const router = createMemoryRouter([{
    element: <><nav aria-label="Navigation fixtures">
      <Link to="/search">Search games again</Link>
      <Link to="/away">Leave Search</Link>
    </nav><Outlet /></>,
    children: [
      { path: '/search', element: <Search /> },
      { path: '/away', element: <p>Away from Search</p> },
      { path: '/before', element: <p>Previous page</p> },
    ],
  }], { initialEntries: entries, initialIndex });
  const visits: Visit[] = [];
  let lastKey = router.state.location.key;
  const unsubscribe = router.subscribe(state => {
    if (state.location.key === lastKey) return;
    lastKey = state.location.key;
    visits.push({
      key: state.location.key,
      pathname: state.location.pathname,
      search: state.location.search,
      action: state.historyAction,
    });
  });
  mounted.push({ router, unsubscribe });
  const view = render(<HelmetProvider><RouterProvider router={router} /></HelmetProvider>);
  const field = () => view.getByRole('textbox', { name: 'Search games' }) as HTMLInputElement;
  const type = (value: string) => fireEvent.change(field(), { target: { value } });
  return { ...view, router, visits, field, type };
}

async function advance(ms: number) {
  await act(async () => { vi.advanceTimersByTime(ms); });
}
async function external(router: Router, to: string, replace = false) {
  await act(async () => { await router.navigate(to, { replace }); });
}
const queryOf = (router: Router) => new URLSearchParams(router.state.location.search).get('q');

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  for (const { router, unsubscribe } of mounted.splice(0)) {
    unsubscribe();
    router.dispose();
  }
  vi.clearAllTimers();
  vi.useRealTimers();
  localStorage.clear();
});

describe('Search URL navigation ownership', () => {
  it('clears a pending draft when the real Search games link opens the same URL', async () => {
    const view = mount();
    view.type('NHL Connections');
    expect(view.field().value, 'SEARCH_TYPED_DRAFT_PRESENT').toBe('NHL Connections');
    expect(view.router.state.location.search, 'SEARCH_DRAFT_HAS_NOT_NAVIGATED').toBe('');

    const beforeKey = view.router.state.location.key;
    const beforeField = view.field();
    await act(async () => {
      fireEvent.click(view.getByRole('link', { name: 'Search games again' }));
    });
    expect(view.router.state.location.key, 'SEARCH_REAL_LINK_COMMITTED_LOCATION').not.toBe(beforeKey);
    expect(view.field(), 'SEARCH_REAL_LINK_KEEPS_MOUNTED_INPUT').toBe(beforeField);

    expect(view.field().value, 'SEARCH_SAME_URL_LINK_CLEARS_DRAFT').toBe('');
    expect(view.router.state.location.pathname).toBe('/search');
    expect(view.router.state.location.search).toBe('');
    await advance(1000);
    expect(view.field().value, 'SEARCH_SAME_URL_LINK_STAYS_CLEAR').toBe('');
    expect(view.router.state.location.search, 'SEARCH_LINK_CANCELS_STALE_TIMER').toBe('');
  });

  it.each([
    ['PUSH', false],
    ['REPLACE', true],
  ] as const)('adopts an external %s to the previous query instead of the pending draft', async (_action, replace) => {
    const view = mount(['/search?q=Footle']);
    const initialKey = view.router.state.location.key;
    view.type('NHL Connections');
    await external(view.router, '/search?q=Footle', replace);
    expect(view.router.state.location.key, 'SEARCH_EXTERNAL_LOCATION_IS_NEW').not.toBe(initialKey);
    expect(view.field().value, 'SEARCH_EXTERNAL_PREVIOUS_QUERY_WINS').toBe('Footle');
    await advance(1000);
    expect(queryOf(view.router), 'SEARCH_EXTERNAL_PREVIOUS_QUERY_CANCELS_TIMER').toBe('Footle');
    expect(view.field().value).toBe('Footle');
  });

  it('keeps a newer draft coalesced with its own debounce replacement', async () => {
    const view = mount();
    const initialKey = view.router.state.location.key;
    view.type('Footle');
    await act(async () => {
      vi.advanceTimersByTime(250);
      expect(queryOf(view.router), 'SEARCH_COALESCED_OWN_QUERY_COMMITTED').toBe('Footle');
      expect(view.router.state.historyAction, 'SEARCH_COALESCED_OWN_ACTION_COMMITTED').toBe('REPLACE');
      expect(view.router.state.location.key, 'SEARCH_COALESCED_OWN_LOCATION_COMMITTED').not.toBe(initialKey);
      expect(view.visits.map(visit => ({ search: visit.search, action: visit.action })), 'SEARCH_COALESCED_OWN_VISIT_OBSERVED').toEqual([
        { search: '?q=Footle', action: 'REPLACE' },
      ]);
      fireEvent.change(view.field(), { target: { value: 'NHL Connections' } });
    });
    expect(queryOf(view.router), 'SEARCH_OWN_REPLACE_IS_REAL').toBe('Footle');
    expect(view.field().value, 'SEARCH_OWN_REPLACE_RETAINS_NEWER_DRAFT').toBe('NHL Connections');
    await advance(249);
    expect(queryOf(view.router)).toBe('Footle');
    await advance(1);
    expect(queryOf(view.router), 'SEARCH_NEWER_DRAFT_GETS_ITS_OWN_TIMER').toBe('NHL Connections');
    expect(view.field().value).toBe('NHL Connections');
  });

  it('lets an external identical replacement win after an own replacement and newer draft in one act', async () => {
    const view = mount();
    const initialKey = view.router.state.location.key;
    view.type('Footle');
    let ownKey = '';
    await act(async () => {
      vi.advanceTimersByTime(250);
      expect(queryOf(view.router), 'SEARCH_IDENTICAL_OWN_QUERY_COMMITTED').toBe('Footle');
      expect(view.router.state.historyAction, 'SEARCH_IDENTICAL_OWN_ACTION_COMMITTED').toBe('REPLACE');
      ownKey = view.router.state.location.key;
      expect(ownKey, 'SEARCH_IDENTICAL_OWN_LOCATION_COMMITTED').not.toBe(initialKey);
      expect(view.visits.map(visit => ({ search: visit.search, action: visit.action })), 'SEARCH_IDENTICAL_OWN_VISIT_OBSERVED').toEqual([
        { search: '?q=Footle', action: 'REPLACE' },
      ]);
      fireEvent.change(view.field(), { target: { value: 'NHL Connections' } });
      await view.router.navigate('/search?q=Footle', { replace: true });
    });
    expect(ownKey, 'SEARCH_OWN_LOCATION_WAS_OBSERVED').not.toBe('');
    expect(view.router.state.location.key, 'SEARCH_IDENTICAL_EXTERNAL_REPLACE_HAS_ITS_OWN_KEY').not.toBe(ownKey);
    expect(view.field().value, 'SEARCH_IDENTICAL_EXTERNAL_REPLACE_WINS').toBe('Footle');
    await advance(1000);
    expect(queryOf(view.router), 'SEARCH_IDENTICAL_EXTERNAL_REPLACE_CANCELS_NEW_DRAFT').toBe('Footle');
    expect(view.field().value).toBe('Footle');
  });

  it('adopts actual Back and Forward locations while cancelling each pending draft', async () => {
    const view = mount(['/search?q=Footle', '/search?q=NHL%20Connections']);
    view.type('Club Manager');
    fireEvent.click(view.getByRole('button', { name: 'Back' }));
    await act(async () => { await Promise.resolve(); });
    expect(view.field().value, 'SEARCH_BACK_ADOPTS_QUERY').toBe('Footle');
    await advance(1000);
    expect(queryOf(view.router), 'SEARCH_BACK_CANCELS_TIMER').toBe('Footle');

    view.type('Soccer Career');
    await act(async () => { await view.router.navigate(1); });
    expect(view.field().value, 'SEARCH_FORWARD_ADOPTS_QUERY').toBe('NHL Connections');
    await advance(1000);
    expect(queryOf(view.router), 'SEARCH_FORWARD_CANCELS_TIMER').toBe('NHL Connections');
  });

  it('replaces only the final rapid edit while retaining unrelated parameters and previous history', async () => {
    const view = mount(['/before', '/search?source=nav&tag=one&tag=two&q=before']);
    view.type('N');
    await advance(100);
    view.type('NHL');
    await advance(100);
    view.type('Footle');
    await advance(249);
    expect(queryOf(view.router), 'SEARCH_NO_EARLY_REPLACE').toBe('before');
    expect(view.visits).toEqual([]);
    await advance(1);
    expect(view.visits.map(visit => visit.action), 'SEARCH_ONLY_LAST_EDIT_REPLACES').toEqual(['REPLACE']);
    const params = new URLSearchParams(view.router.state.location.search);
    expect(params.get('q')).toBe('Footle');
    expect(params.get('source'), 'SEARCH_UNRELATED_PARAMETER_HELD').toBe('nav');
    expect(params.getAll('tag'), 'SEARCH_REPEATED_PARAMETERS_HELD').toEqual(['one', 'two']);
    expect(view.container.querySelector('a[data-result][href="/footle"]') !== null, 'SEARCH_REAL_ENGINE_RESULTS_RENDER').toBe(true);

    fireEvent.click(view.getByRole('button', { name: 'Back' }));
    await act(async () => { await Promise.resolve(); });
    expect(view.router.state.location.pathname, 'SEARCH_REPLACE_KEEPS_PREVIOUS_HISTORY').toBe('/before');
    expect(view.queryByRole('textbox', { name: 'Search games' })).toBeNull();
  });

  it('adopts the same query with changed unrelated URL parameters and cancels the draft', async () => {
    const view = mount(['/search?q=Footle&source=old']);
    view.type('NHL Connections');
    await external(view.router, '/search?q=Footle&source=new&tag=kept');
    expect(view.field().value, 'SEARCH_SAME_QUERY_NEW_PARAMETERS_ADOPT').toBe('Footle');
    await advance(1000);
    expect(view.router.state.location.search, 'SEARCH_EXTERNAL_PARAMETER_URL_HELD').toBe('?q=Footle&source=new&tag=kept');
    expect(view.field().value).toBe('Footle');
  });

  it('does not navigate from a pending timer after the real leave link unmounts Search', async () => {
    const view = mount(['/search?q=Footle']);
    view.type('NHL Connections');
    fireEvent.click(view.getByRole('link', { name: 'Leave Search' }));
    await act(async () => { await Promise.resolve(); });
    expect(view.router.state.location.pathname, 'SEARCH_ACTUALLY_UNMOUNTED').toBe('/away');
    expect(view.queryByRole('textbox', { name: 'Search games' })).toBeNull();
    const visitsAfterLeaving = view.visits.length;
    await advance(1000);
    expect(view.router.state.location.pathname, 'SEARCH_UNMOUNT_CANCELS_TIMER').toBe('/away');
    expect(view.router.state.location.search).toBe('');
    expect(view.visits.length, 'SEARCH_NO_STALE_NAVIGATION_AFTER_UNMOUNT').toBe(visitsAfterLeaving);
  });
});