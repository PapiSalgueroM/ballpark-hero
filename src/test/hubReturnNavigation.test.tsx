import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import HubExperience from '@/components/hub/HubExperience';
import { categoriesByTitle } from '@/data/gameRegistry';
import { hubFor } from '@/lib/sportHub';

const routes = ['/soccer', '/pro-basketball', '/pro-football'] as const;
const markers = {
  '/soccer': 'SOCCER',
  '/pro-basketball': 'BASKETBALL',
  '/pro-football': 'FOOTBALL',
} as const;

function catalog(route: string) {
  const hub = hubFor(route);
  if (!hub) throw new Error('Fixture requires an existing sport hub');
  return { hub, games: categoriesByTitle(...hub.titles).flatMap(category => category.games) };
}
function HistoryControls() {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="hub-location">{location.pathname + location.search}</output>
    <button onClick={() => navigate(-1)}>Go back one entry</button></>;
}
function open(route: string, search = '') {
  const item = catalog(route);
  return render(<MemoryRouter initialEntries={['/hub-origin', route + search]} initialIndex={1}>
    <Routes>
      <Route path={route} element={<HubExperience {...item} />} />
      <Route path="*" element={<p>Opened game destination</p>} />
    </Routes>
    <HistoryControls />
  </MemoryRouter>);
}
const paths = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-hub-game]')]
  .map(row => row.dataset.hubGame!).sort();
const storage = () => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
const location = (view: ReturnType<typeof render>) => new URL(view.getByTestId('hub-location').textContent!, 'https://fixture.test');
const snapshot = (view: ReturnType<typeof render>) => ({
  location: location(view).pathname + location(view).search,
  query: (view.getByRole('textbox') as HTMLInputElement).value,
  selectedFilter: view.container.querySelector('[aria-label="Filter games"] [aria-pressed="true"]')?.textContent,
  visiblePaths: paths(view),
  storage: storage(),
});
function raw(name: string, value: unknown) {
  const directory = process.env.HUB_LIBRARY_RAW;
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('hub-fixture-unrelated', '{"unchanged":true}');
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Sport hub discovery return state', () => {
  for (const route of routes) {
    it('opens the selected library from a shared URL on ' + route, () => {
      const item = catalog(route), selected = item.games.find(game => game.daily);
      if (!selected) throw new Error('Existing hub needs a daily game for this fixture');
      const params = new URLSearchParams({ filter: 'daily', q: selected.label, from: 'fixture-menu' });
      const held = storage(), view = open(route, '?' + params.toString()), observed = snapshot(view);
      const expected = item.games.filter(game => game.daily && (game.label + ' ' + game.description).toLocaleLowerCase().includes(selected.label.toLocaleLowerCase())).map(game => game.path).sort();
      raw('direct-' + route.slice(1), { case: 'direct', route, expected: { query: selected.label, paths: expected }, observed });
      expect(storage()).toEqual(held);
      expect((view.getByRole('textbox') as HTMLInputElement).value, 'HUB_URL_DIRECT_' + markers[route]).toBe(selected.label);
      expect(view.getByRole('button', { name: /^Daily puzzles/ }).getAttribute('aria-pressed')).toBe('true');
      expect(paths(view)).toEqual(expected);
      expect(location(view).searchParams.get('from')).toBe('fixture-menu');
    });

    it('returns from a game to the chosen library on ' + route, () => {
      const item = catalog(route), selected = item.games.find(game => game.featured);
      if (!selected) throw new Error('Existing hub needs a simulation for this fixture');
      const held = storage(), view = open(route, '?from=menu&from=second');
      fireEvent.click(view.getByRole('button', { name: /^Careers & sims/ }));
      fireEvent.change(view.getByRole('textbox'), { target: { value: selected.label } });
      expect(paths(view)).toContain(selected.path);
      fireEvent.click(view.getByRole('link', { name: selected.label }));
      expect(location(view).pathname).toBe(selected.path);
      expect(view.queryByRole('textbox')).toBeNull();
      fireEvent.click(view.getByRole('button', { name: 'Go back one entry' }));
      const observed = snapshot(view);
      raw('return-' + route.slice(1), { case: 'return', route, selected: selected.path, expectedQuery: selected.label, observed });
      expect(storage()).toEqual(held);
      expect((view.getByRole('textbox') as HTMLInputElement).value, 'HUB_URL_RETURN_' + markers[route]).toBe(selected.label);
      expect(location(view).searchParams.get('filter')).toBe('sim');
      expect(location(view).searchParams.get('q')).toBe(selected.label);
      expect(location(view).searchParams.getAll('from')).toEqual(['menu', 'second']);
      expect(view.getByRole('button', { name: /^Careers & sims/ }).getAttribute('aria-pressed')).toBe('true');

      fireEvent.click(view.getByRole('button', { name: 'Clear game search' }));
      expect(location(view).searchParams.has('q')).toBe(false);
      expect(location(view).searchParams.get('filter')).toBe('sim');
      expect(document.activeElement).toBe(view.getByRole('textbox'));
      fireEvent.change(view.getByRole('textbox'), { target: { value: 'zzzz-no-hub-game-fixture' } });
      fireEvent.click(view.getByRole('button', { name: 'Show all ' + item.hub.navLabel + ' games' }));
      expect(location(view).searchParams.has('q')).toBe(false);
      expect(location(view).searchParams.has('filter')).toBe(false);
      expect(location(view).searchParams.getAll('from')).toEqual(['menu', 'second']);
      expect(paths(view)).toEqual(item.games.map(game => game.path).sort());
      expect(document.activeElement).toBe(view.getByRole('textbox'));
      expect(storage()).toEqual(held);
      fireEvent.click(view.getByRole('button', { name: 'Go back one entry' }));
      expect(location(view).pathname).toBe('/hub-origin');
    });
  }

  it('keeps every plain hub catalog and unrelated storage unchanged', () => {
    const held = storage(), observations = [];
    for (const route of routes) {
      const item = catalog(route), view = open(route);
      observations.push({ route, observed: snapshot(view) });
      expect(paths(view)).toEqual(item.games.map(game => game.path).sort());
      expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('');
      expect(view.getByRole('button', { name: /^All games/ }).getAttribute('aria-pressed')).toBe('true');
      expect(storage()).toEqual(held);
      cleanup();
    }
    raw('plain', { case: 'plain', observations });
  });

  it('treats an unknown filter as all games without rewriting unrelated URL values', () => {
    const held = storage(), observations = [];
    for (const route of routes) {
      const item = catalog(route), view = open(route, '?filter=not-a-hub-filter&from=one&from=two');
      observations.push({ route, observed: snapshot(view) });
      expect(paths(view)).toEqual(item.games.map(game => game.path).sort());
      expect(view.getByRole('button', { name: /^All games/ }).getAttribute('aria-pressed')).toBe('true');
      expect((view.getByRole('textbox') as HTMLInputElement).value).toBe('');
      expect(location(view).searchParams.getAll('from')).toEqual(['one', 'two']);
      expect(location(view).searchParams.get('filter')).toBe('not-a-hub-filter');
      expect(storage()).toEqual(held);
      cleanup();
    }
    raw('invalid', { case: 'invalid', observations });
  });
});
