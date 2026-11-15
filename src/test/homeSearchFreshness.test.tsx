import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useSyncExternalStore } from 'react';
import { BrowserRouter, Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Index from '@/pages/Index';
import { ScrollToTop } from '@/App';
import { ALL_GAMES, VISIBLE_CATEGORIES } from '@/data/gameRegistry';
import type { useMostPlayed } from '@/hooks/useMostPlayed';

const state = vi.hoisted(() => ({
  heldQuery: undefined as string | undefined,
  popular: undefined as ReturnType<typeof useMostPlayed> | undefined,
  popularListeners: new Set<() => void>(),
}));
const subscribePopular = (listener: () => void) => {
  state.popularListeners.add(listener);
  return () => { state.popularListeners.delete(listener); };
};
const readPopular = () => state.popular;
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return { ...react, useDeferredValue: <T,>(value: T) => state.heldQuery ?? value };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Search fixture', getLocalTodayCount: () => 0 }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/hooks/useMostPlayed', async importOriginal => {
  const actual = await importOriginal<typeof import('@/hooks/useMostPlayed')>();
  return { useMostPlayed: (enabled?: boolean) => {
    const fixture = useSyncExternalStore(subscribePopular, readPopular);
    const live = actual.useMostPlayed(fixture ? false : enabled);
    return fixture ?? live;
  } };
});
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

afterEach(() => { cleanup(); localStorage.clear(); state.heldQuery = undefined; state.popular = undefined; vi.unstubAllGlobals(); });

function home() {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const tree = () => <MemoryRouter><Index /></MemoryRouter>;
  const view = render(tree());
  const main = screen.getByRole('main');
  const field = screen.getByRole('textbox', { name: 'Search games' });
  const change = (value: string) => fireEvent.change(field, { target: { value } });
  return { main, field, change, release: () => { state.heldQuery = undefined; view.rerender(tree()); } };
}

it('holds the old results in place without exposing old links or pin controls during rapid input', async () => {
  const { main, field, change, release } = home();
  change('Soccer Career');
  await act(async () => { await vi.dynamicImportSettled(); });
  const oldPin = screen.getByRole('button', { name: 'Pin Soccer Career' });
  const oldCard = oldPin.closest<HTMLElement>('[data-home-game-card]')!;
  const oldLink = within(oldCard).getByRole('link');
  state.heldQuery = 'Soccer Career';
  for (const query of ['NBA My Career', 'Club Manager']) {
    change(query);
    expect(field).toHaveValue(query);
    expect(main.querySelector('[aria-busy="true"]')).toContainElement(oldCard);
    expect(oldLink).not.toBeVisible();
    expect(oldPin).not.toBeVisible();
    expect(within(oldCard).queryByRole('link')).toBeNull();
    expect(within(oldCard).queryByRole('button')).toBeNull();
  }
  release();
  const result = within(main).getByRole('button', { name: 'Pin Club Manager' }).closest<HTMLElement>('[data-home-game-card]')!;
  expect(within(result).getByRole('link')).toBeVisible();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('hides stale empty wording and clears immediately while ranking is held', async () => {
  const { main, field, change, release } = home();
  change('*(');
  await act(async () => { await vi.dynamicImportSettled(); });
  const status = screen.getByRole('status', { name: 'Search results' });
  expect(screen.getAllByText('No games found for *(')).toEqual([status]);
  state.heldQuery = '*(';
  change('NBA My Career');
  expect(status).toBeEmptyDOMElement();
  expect(within(main).queryByRole('button', { name: 'Pin Soccer Grid' })).toBeNull();
  field.focus();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(field).toHaveValue('');
  expect(field).toHaveFocus();
  expect(within(main).getByRole('heading', { name: 'Main event' })).toBeInTheDocument();
  release();
  expect(status).toBeEmptyDOMElement();
});

it('announces only settled matches and keeps focus when the search clears', async () => {
  const { field, change, release } = home();
  const status = screen.getByRole('status', { name: 'Search results' });
  expect(status).toBeEmptyDOMElement();
  field.focus();
  change('Soccer Career');
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(status).toHaveTextContent(/\d+ (game found|games found) for Soccer Career/);
  expect(status).not.toHaveClass('sr-only');
  state.heldQuery = 'Soccer Career';
  change('*(');
  expect(status).toBeEmptyDOMElement();
  release();
  expect(status).toHaveTextContent('No games found for *(');
  state.heldQuery = '*(';
  change('Club Manager');
  expect(status).toBeEmptyDOMElement();
  fireEvent.keyDown(field, { key: 'Escape' });
  release();
  expect(status).toBeEmptyDOMElement();
  expect(field).toHaveFocus();
});

it('finds the right game from a first-time visitor’s description', async () => {
  const { main, field, change } = home();
  const status = screen.getByRole('status', { name: 'Search results' });
  change('manage an nfl team');
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(status).toHaveTextContent('1 game found for manage an nfl team');
  const results = [...main.querySelectorAll('[data-home-game-card] a')].filter(el => !el.closest('[hidden]'));
  expect(results.map(el => el.getAttribute('href'))).toEqual(['/front-office']);
  field.focus();
  fireEvent.keyDown(field, { key: 'ArrowDown' });
  expect(results[0]).toHaveFocus();
});

it('narrows Home search by sport and restores that search after playing', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  function Game() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Go back</button>;
  }
  const view = render(<MemoryRouter><Routes>
    <Route path="/" element={<Index />} />
    <Route path="/nfl-gauntlet-draft" element={<Game />} />
  </Routes></MemoryRouter>);
  const field = () => screen.getByRole('textbox', { name: 'Search games' });
  const filter = () => screen.getByRole('combobox', { name: 'Filter by sport' });
  const status = () => screen.getByRole('status', { name: 'Search results' });
  const results = () => [...view.container.querySelectorAll<HTMLAnchorElement>('[data-home-game-card] a')]
    .filter(link => !link.closest('[hidden]'));
  fireEvent.change(field(), { target: { value: 'gauntlet' } });
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(results().map(link => link.getAttribute('href'))).toContain('/nba-gauntlet-draft');
  fireEvent.change(filter(), { target: { value: 'football' } });
  expect(results().map(link => link.getAttribute('href'))).toEqual(['/nfl-gauntlet-draft']);
  expect(status()).toHaveTextContent('1 game found for gauntlet in NFL');
  field().focus();
  fireEvent.keyDown(field(), { key: 'ArrowDown' });
  expect(results()[0]).toHaveFocus();
  fireEvent.click(results()[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(field()).toHaveValue('gauntlet');
  expect(filter()).toHaveValue('football');
  expect(results()[0]).toHaveFocus();
  fireEvent.change(filter(), { target: { value: 'rugby' } });
  expect(results()).toEqual([]);
  expect(status()).toHaveTextContent('No games found for gauntlet in Rugby League');
  fireEvent.click(screen.getByRole('button', { name: 'Show all sports' }));
  expect(filter()).toHaveValue('');
  expect(filter()).toHaveFocus();
  expect(results().map(link => link.getAttribute('href'))).toContain('/nba-gauntlet-draft');
  fireEvent.change(filter(), { target: { value: 'football' } });
  fireEvent.keyDown(field(), { key: 'Escape' });
  fireEvent.change(field(), { target: { value: 'gauntlet' } });
  expect(filter()).toHaveValue('');
  expect(localStorage.getItem('dukb-fav-sport')).toBeNull();
});

it('puts active saves and picks before discovery in keyboard order and restores both shelves after search', async () => {
  const saved = '{"season":{"year":2027}}';
  localStorage.setItem('nrl-manager-save-v1-slot-2', saved);
  localStorage.setItem('dukb-game-picks-v1', JSON.stringify(['/soccer-grid']));
  const { main, change, field } = home();
  const continueShelf = within(main).getByRole('region', { name: 'Continue playing' });
  const featuredShelf = within(main).getByRole('region', { name: 'Main event' });
  expect(continueShelf.compareDocumentPosition(featuredShelf) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(continueShelf).getByRole('link', { name: /NRL Team Manager/ })).toHaveAttribute('href', '/nrl-team-manager?slot=2');
  const pickShelf = within(main).getByRole('region', { name: 'Your picks' });
  expect(pickShelf.compareDocumentPosition(featuredShelf) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  change('Soccer Career');
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(continueShelf).not.toBeVisible();
  expect(pickShelf).not.toBeVisible();
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(continueShelf).toBeVisible();
  expect(pickShelf).toBeVisible();
  expect(localStorage.getItem('nrl-manager-save-v1-slot-2')).toBe(saved);
});

it('restores the exact result and keyboard focus when a game navigates back to a Home search', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  function Game() {
    const navigate = useNavigate();
    return <><button onClick={() => navigate(-1)}>Go back</button><Link to="/">Home</Link></>;
  }
  function Home() {
    const location = useLocation();
    return <><output aria-label="Location">{location.search}</output><Index /></>;
  }
  const view = render(<MemoryRouter initialEntries={['/?kept=1']}><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/build-your-xi" element={<Game />} />
  </Routes></MemoryRouter>);
  const field = () => screen.getByRole('textbox', { name: 'Search games' });
  const result = () => view.container.querySelector<HTMLAnchorElement>('[data-home-game-card]:not([data-catalog-card]) a[href="/build-your-xi"]')!;
  fireEvent.change(field(), { target: { value: 'Build Your XI' } });
  await act(async () => { await vi.dynamicImportSettled(); });
  result().focus();
  fireEvent.click(result());
  expect(screen.queryByRole('textbox', { name: 'Search games' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(field()).toHaveValue('Build Your XI');
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(result()).toHaveFocus();
  expect(screen.getByRole('status', { name: 'Search results' })).toHaveTextContent('for Build Your XI');
  expect(screen.getByLabelText('Location')).toHaveTextContent('?kept=1');
  field().focus();
  fireEvent.keyDown(field(), { key: 'Escape' });
  expect(field()).toHaveValue('');
  expect(field()).toHaveFocus();
  fireEvent.change(field(), { target: { value: 'Build Your XI' } });
  fireEvent.click(result());
  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(field()).toHaveValue('');
  expect(screen.getByRole('status', { name: 'Search results' })).toBeEmptyDOMElement();
  view.unmount();
}, 15000);

it('returns keyboard focus to the catalogue tile that opened a game', () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  function Game() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Go back</button>;
  }
  const { container } = render(<MemoryRouter><Routes>
    <Route path="/" element={<Index />} />
    <Route path="/hockey-higher-lower" element={<Game />} />
  </Routes></MemoryRouter>);
  const card = () => container.querySelector<HTMLAnchorElement>('[data-catalog-card] a[href="/hockey-higher-lower"]')!;
  card().focus();
  fireEvent.click(card());
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(card()).toHaveFocus();
  expect(screen.getByRole('textbox', { name: 'Search games' })).toHaveValue('');
  expect(screen.getByRole('status', { name: 'Search results' })).toBeEmptyDOMElement();
});

it.each(['/footle', '/stadium-tycoon'])('expands the full sport catalogue and restores it when returning from %s', (path) => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  function Game() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Go back</button>;
  }
  const { container } = render(<MemoryRouter initialEntries={[{ pathname: '/', key: 'catalogue-' + path }]}><Routes>
    <Route path="/" element={<Index />} />
    <Route path={path} element={<Game />} />
  </Routes></MemoryRouter>);
  const sport = () => container.querySelector<HTMLElement>('section[data-sport="soccer"]')!;
  const cards = () => Array.from(sport().querySelectorAll<HTMLAnchorElement>('[data-catalog-card] a[href]'));
  const openingCard = () => cards().find(card => card.getAttribute('href') === path);
  const gamePaths = VISIBLE_CATEGORIES.find(category => category.title === 'Soccer')!.games.map(game => game.path);
  expect(cards().map(card => card.getAttribute('href'))).toEqual(gamePaths.slice(0, 12));
  const showMore = within(sport()).getByRole('button', { name: /^Show \d+ more Soccer games$/ });
  expect(showMore).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(showMore);
  expect(showMore).toHaveAttribute('aria-expanded', 'true');
  expect(cards().map(card => card.getAttribute('href'))).toEqual(gamePaths);
  const opener = openingCard()!;
  opener.focus();
  fireEvent.click(opener);
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(openingCard()).toHaveFocus();
  expect(within(sport()).getByRole('button', { name: 'Show fewer Soccer games' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(within(sport()).getByRole('button', { name: 'Show fewer Soccer games' }));
  expect(cards()).toHaveLength(12);
});

it('opens the settled best match with Enter and reaches it with ArrowDown', async () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  function Game() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Go back</button>;
  }
  const view = render(<MemoryRouter><Routes>
    <Route path="/" element={<Index />} />
    <Route path="/build-your-xi" element={<Game />} />
  </Routes></MemoryRouter>);
  const field = () => screen.getByRole('textbox', { name: 'Search games' });
  const result = () => view.container.querySelector<HTMLAnchorElement>('[data-home-game-card]:not([data-catalog-card]) a[href="/build-your-xi"]')!;
  field().focus();
  fireEvent.change(field(), { target: { value: 'Build Your XI' } });
  await act(async () => { await vi.dynamicImportSettled(); });
  fireEvent.keyDown(field(), { key: 'ArrowDown' });
  expect(result()).toHaveFocus();
  field().focus();
  state.heldQuery = 'Build Your XI';
  fireEvent.change(field(), { target: { value: 'Club Manager' } });
  fireEvent.keyDown(field(), { key: 'Enter' });
  expect(field()).toHaveFocus();
  expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  state.heldQuery = undefined;
  fireEvent.change(field(), { target: { value: 'Build Your XI' } });
  fireEvent.keyDown(field(), { key: 'Enter', ctrlKey: true });
  expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  fireEvent.keyDown(field(), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(field()).toHaveValue('Build Your XI');
  expect(result()).toHaveFocus();
});

it.each([
  ['pin shelf', '[data-home-picks] [data-game-pick-link]', '/hockey-higher-lower'],
  ['first NRL save', '[data-home-continue] a', '/nrl-team-manager'],
  ['parked Club Manager save', '[data-home-continue] a', '/club-manager?slot=3'],
  ['second NRL save', '[data-home-continue] a', '/nrl-team-manager?slot=2'],
  ['Main event', 'a[data-stage-card]', '/soccer-career'],
  ['NRL launch on the featured deck', 'a[data-home-nrl-launch]', '/nrl-team-manager'],
  ['Most played', 'a[data-home-popular-game]', '/soccer-grid'],
  ['Just shipped', '[data-home-shipped] [data-home-game-card] a', '/nrl-team-manager'],
])('focuses the exact %s opener when navigating back to Home', (_label, selector, href) => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  localStorage.setItem('dukb-game-picks-v1', '["/hockey-higher-lower"]');
  localStorage.setItem('nrl-manager-save-v1', '{"season":{"year":2026}}');
  localStorage.setItem('nrl-manager-save-v1-slot-2', '{"season":{"year":2027}}');
  localStorage.setItem('dukb-cm-slots', '{"active":2}');
  localStorage.setItem('dukb-cm-slot-3', JSON.stringify({
    saveVersion: 3, clubName: 'Parked FC', season: 3, week: 0, leagueClubs: ['Parked FC'],
    squad: [], calendar: [], xiIds: [], table: [],
  }));
  function Game() {
    const navigate = useNavigate();
    const location = useLocation();
    return <><output>{location.pathname + location.search}</output><button onClick={() => navigate(-1)}>Go back</button></>;
  }
  const { container } = render(<MemoryRouter initialEntries={[{ pathname: '/', key: 'return-' + _label }]}><Routes>
    <Route path="/" element={<Index />} />
    <Route path="*" element={<Game />} />
  </Routes></MemoryRouter>);
  const card = () => container.querySelector<HTMLAnchorElement>(selector + '[href="' + href + '"]')!;
  if (href === '/soccer-grid') fireEvent.click(screen.getByRole('button', { name: /^Show \d+ more Soccer games$/ }));
  expect(container.querySelector('[data-catalog-card] a[href="' + href.split('?')[0] + '"]')).toBeInTheDocument();
  card().focus();
  fireEvent.click(card());
  expect(screen.getByRole('status')).toHaveTextContent(href);
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(card()).toHaveFocus();
  expect(screen.getByRole('textbox', { name: 'Search games' })).toHaveValue('');
});

it.each([false, true])('restores the Soccer hub link with its catalogue expanded=%s', expanded => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  function Hub() {
    const navigate = useNavigate();
    return <><h1>Soccer Games</h1><button onClick={() => navigate(-1)}>Go back</button></>;
  }
  function LocationMarker() {
    return <output aria-label="Current anchor">{useLocation().hash}</output>;
  }
  const { container } = render(<MemoryRouter initialEntries={[{ pathname: '/', hash: '#sport-soccer', key: 'hub-return-' + expanded }]}>
    <LocationMarker />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/soccer" element={<Hub />} />
    </Routes>
  </MemoryRouter>);
  const section = () => container.querySelector<HTMLElement>('section[data-sport="soccer"]')!;
  const opener = () => within(section().querySelector('h2')!.parentElement!).getByRole('link', { name: /^(Hub|Soccer hub)$/ });
  const more = () => section().querySelector('button[aria-controls="home-more-soccer"]')!;
  if (expanded) fireEvent.click(more());
  const visibleGames = section().querySelectorAll('[data-catalog-card]').length;
  expect(opener()).toHaveAttribute('href', '/soccer');
  opener().focus();
  fireEvent.click(opener());
  expect(screen.getByRole('heading', { name: 'Soccer Games' })).toBeVisible();
  expect(screen.getByLabelText('Current anchor')).toBeEmptyDOMElement();

  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(screen.getByLabelText('Current anchor')).toHaveTextContent('#sport-soccer');
  expect(opener()).toHaveFocus();
  expect(opener()).toHaveAccessibleName('Soccer hub');
  expect(more()).toHaveAttribute('aria-expanded', String(expanded));
  expect(section().querySelectorAll('[data-catalog-card]')).toHaveLength(visibleGames);
  const football = container.querySelector<HTMLElement>('section[data-sport="football"] h2')!.parentElement!;
  expect(within(football).getByRole('link', { name: 'NFL hub' })).toHaveAttribute('href', '/pro-football');
});

it('jumps from Browse sports to game picks and restores the opener with Back', () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  function HistoryControls() {
    const navigate = useNavigate();
    const { hash } = useLocation();
    return <><button onClick={() => navigate(-1)}>Go back</button><output aria-label="Current anchor">{hash}</output></>;
  }
  render(<MemoryRouter initialEntries={[{ pathname: '/', key: 'home-picks-discovery-entry' }]}><Index /><HistoryControls /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'Browse sports' });
  const target = screen.getByRole('heading', { name: 'Games to try' });
  target.scrollIntoView = vi.fn();
  trigger.focus();
  fireEvent.click(trigger);
  const menu = screen.getByRole('dialog', { name: 'Browse sports' });
  expect(within(menu).getByRole('link', { name: 'Rugby League' })).toHaveAttribute('href', '#sport-rugby');
  fireEvent.click(within(menu).getByRole('link', { name: 'Game picks' }));
  expect(screen.queryByRole('dialog', { name: 'Browse sports' })).toBeNull();
  expect(screen.getByLabelText('Current anchor')).toHaveTextContent('#home-game-picks');
  expect(target).toHaveFocus();
  expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });

  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(screen.getByLabelText('Current anchor')).toBeEmptyDOMElement();
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  expect(trigger).toHaveFocus();
});

it('keeps the sport heading when native history reuses the initial key for a different fragment', () => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const scrollTo = vi.fn();
  vi.stubGlobal('scrollTo', scrollTo);
  const originalUrl = window.location.href;
  const originalState = window.history.state;
  const initialKey = 'sport-reload-test';
  window.history.replaceState({ idx: 0, key: initialKey }, '', '/#browse-sports');
  try {
    render(<BrowserRouter><Index /></BrowserRouter>);
    const catalogue = screen.getByRole('navigation', { name: 'Browse sports' });
    const link = within(catalogue).getByRole('link', { name: 'Rugby League' });
    const heading = screen.getByRole('heading', { name: /^Rugby League/, level: 2 });
    heading.scrollIntoView = vi.fn();
    fireEvent.click(link);
    expect(window.location.hash).toBe('#sport-rugby');
    expect(heading).toHaveFocus();

    act(() => {
      window.history.pushState({ key: initialKey }, '', '/#sport-rugby');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(window.location.hash).toBe('#sport-rugby');
    expect(heading).toHaveFocus();
    expect(scrollTo).not.toHaveBeenCalled();
  } finally {
    window.history.replaceState(originalState, '', originalUrl);
  }
});

it('stops the previous Home scroll restore on a second browser Back from Game picks', () => {
  const scrollTo = vi.fn();
  const requestFrame = vi.fn((_callback: FrameRequestCallback) => 1);
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('requestAnimationFrame', requestFrame);
  sessionStorage.setItem('home-scroll-y', '860');
  function HistoryControls() {
    const navigate = useNavigate();
    const { pathname, hash } = useLocation();
    return <><button onClick={() => navigate(-1)}>Go back</button><output aria-label="Current page">{pathname + hash}</output></>;
  }
  try {
    render(<MemoryRouter initialEntries={['/', '/#home-game-picks', '/nfl-my-career']} initialIndex={2}>
      <ScrollToTop /><HistoryControls />
    </MemoryRouter>);
    const back = screen.getByRole('button', { name: 'Go back' });
    fireEvent.click(back);
    expect(screen.getByLabelText('Current page')).toHaveTextContent('/#home-game-picks');
    expect(scrollTo).toHaveBeenLastCalledWith(0, 860);
    const hold = requestFrame.mock.calls.at(-1)![0];

    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    fireEvent.click(back);
    expect(screen.getByLabelText('Current page')).toHaveTextContent(/^\/$/);
    scrollTo.mockClear();
    act(() => hold(performance.now()));
    expect(scrollTo).not.toHaveBeenCalled();
  } finally {
    sessionStorage.removeItem('home-scroll-y');
  }
});

it.each(['same game', 'different games', 'focus moved'])('restores focus after Back when the ranking returns with %s', async scenario => {
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  const entry = (path: string, isFallback: boolean) => ({
    game: ALL_GAMES.find(game => game.path === path)!, count: isFallback ? 0 : 9, isFallback,
  });
  const ranked = { loading: false, entries: ['/soccer-career', '/club-manager', '/nba-my-career'].map(path => entry(path, false)) };
  const loading = { loading: true, entries: ['/soccer-grid', '/perfect-season-nba', '/transfer-path'].map(path => entry(path, true)) };
  state.popular = ranked;
  function Game() {
    const navigate = useNavigate();
    return <button onClick={() => navigate(-1)}>Go back</button>;
  }
  const tree = () => <MemoryRouter><Routes>
    <Route path="/" element={<Index />} />
    <Route path="*" element={<Game />} />
  </Routes></MemoryRouter>;
  const view = render(tree());
  const opener = () => view.container.querySelector('a[data-home-popular-game][href="/soccer-career"]')!;
  fireEvent.click(opener());
  state.popular = loading;
  fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
  expect(opener()).toBeNull();
  const search = screen.getByRole('textbox', { name: 'Search games' });
  if (scenario === 'focus moved') {
    await act(async () => {
      search.focus();
      await vi.dynamicImportSettled();
    });
  }
  act(() => {
    state.popular = scenario === 'different games'
      ? { ...ranked, entries: [entry('/higher-lower', false), ...ranked.entries.slice(1)] }
      : ranked;
    state.popularListeners.forEach(listener => listener());
  });
  if (scenario === 'different games') {
    expect(opener()).toBeNull();
    expect(screen.getByRole('heading', { name: 'Most played today' })).toHaveFocus();
  } else {
    expect(opener()).toBeInTheDocument();
    expect(scenario === 'focus moved' ? search : opener()).toHaveFocus();
  }
});
