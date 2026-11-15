import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameNavbar } from '@/components/game/GameNavbar';
import SportHub from '@/pages/SportHub';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, session: null, loading: false }) }));
vi.mock('@/lib/completions', () => ({ getCurrentPlayerName: () => 'Hub fixture', getLocalTodayCount: () => 0 }));

const originalUrl = window.location.href;
const originalState = window.history.state;
const fixtures = [
  { route: '/soccer', sport: 'Soccer', savedLabel: 'Soccer Career', savedPath: '/soccer-career',
    firstLabel: 'Club Manager', firstPath: '/club-manager', saveKey: 'soccerCareerSave',
    save: '{"currentClub":"Fixture Soccer","age":24}' },
  { route: '/pro-basketball', sport: 'NBA', savedLabel: 'NBA My Career', savedPath: '/nba-my-career',
    firstLabel: 'NBA Front Office', firstPath: '/nba-front-office', saveKey: 'nba-my-career-save-v1',
    save: '{"c":{"team":"Fixture Hoops","year":2026}}' },
];
const storage = () => Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Mounted hub tests stay offline'); }));
});
afterEach(() => {
  cleanup();
  window.history.replaceState(originalState, '', originalUrl);
  localStorage.clear();
  vi.unstubAllGlobals();
});

it.each(fixtures.flatMap(hub => [false, true].map(saved => ({ ...hub, saved }))))(
  'jumps to the filtered $sport library and preserves the launch with a save=$saved', async fixture => {
    if (fixture.saved) localStorage.setItem(fixture.saveKey, fixture.save);
    localStorage.setItem('dukb-game-picks-v1', '["/footle"]');
    const stored = storage();
    const address = `${fixture.route}?${new URLSearchParams({ filter: 'sim', q: fixture.savedLabel, from: 'browse-fixture' })}`;
    window.history.replaceState({ idx: 0 }, '', address);
    render(<HelmetProvider><BrowserRouter><Routes>
      <Route path={fixture.route} element={<SportHub route={fixture.route} />} />
      <Route path="*" element={<><GameNavbar /><h1>Game destination</h1></>} />
    </Routes></BrowserRouter></HelmetProvider>);

    const launchName = fixture.saved ? `Resume ${fixture.savedLabel}` : `Play ${fixture.firstLabel}`;
    const launchPath = fixture.saved ? fixture.savedPath : fixture.firstPath;
    const launch = () => screen.getByRole('link', { name: launchName });
    const library = () => within(screen.getByRole('region', { name: `${fixture.sport} game library` }));
    const search = () => library().getByRole('textbox', { name: `Search ${fixture.sport} games` });
    const filter = () => library().getByRole('button', { name: /^Careers & sims/ });
    expect(launch()).toHaveAttribute('href', launchPath);
    expect(search()).toHaveValue(fixture.savedLabel);
    expect(filter()).toHaveAttribute('aria-pressed', 'true');

    const heading = library().getByRole('heading', { name: 'What are you playing?' });
    heading.scrollIntoView = vi.fn();
    const before = window.history.state;
    fireEvent.click(screen.getByRole('button', { name: 'Browse games' }));
    expect(heading).toHaveFocus();
    expect(heading.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
    expect(window.location.pathname + window.location.search).toBe(address);
    expect(window.history.state).toEqual(before);
    expect(search()).toHaveValue(fixture.savedLabel);
    expect(filter()).toHaveAttribute('aria-pressed', 'true');
    expect(storage()).toEqual(stored);

    fireEvent.click(launch());
    expect(screen.getByRole('heading', { name: 'Game destination' })).toBeVisible();
    expect(window.location.pathname).toBe(launchPath);
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe(address);
      expect(search()).toHaveValue(fixture.savedLabel);
    });
    expect(filter()).toHaveAttribute('aria-pressed', 'true');
    expect(storage()).toEqual(stored);
    expect(fetch).not.toHaveBeenCalled();
  },
);
