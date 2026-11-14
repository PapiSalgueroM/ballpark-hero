import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import Index from '@/pages/Index';

const state = vi.hoisted(() => ({ heldQuery: undefined as string | undefined }));
vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return { ...react, useDeferredValue: <T,>(value: T) => state.heldQuery ?? value };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null }) }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Search fixture', getLocalTodayCount: () => 0 }));
vi.mock('@/hooks/useStreaks', () => ({ useStreaks: () => ({ globalCurrentStreak: 0 }) }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));
vi.mock('@/components/game/StreakReminder', () => ({ StreakReminder: () => null }));
vi.mock('@/components/seo/PageSeo', () => ({ default: () => null }));

afterEach(() => { cleanup(); localStorage.clear(); state.heldQuery = undefined; vi.unstubAllGlobals(); });

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
