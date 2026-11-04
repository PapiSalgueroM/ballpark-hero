import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import HubExperience from '@/components/hub/HubExperience';
import { ContinueRow } from '@/components/home/ContinueRow';
import { categoriesByTitle } from '@/data/gameRegistry';
import { hubFor } from '@/lib/sportHub';

const fixtures = [
  { route: '/soccer', path: '/soccer-career', key: 'soccerCareerSave', save: { currentClub: 'Harbour Training', age: 24 } },
  { route: '/pro-basketball', path: '/nba-my-career', key: 'nba-my-career-save-v1', save: { c: { team: 'Harbour Hoops', year: 2030 } } },
  { route: '/pro-football', path: '/nfl-my-career', key: 'nfl-my-career-save-v1', save: { c: { team: 'Harbour Football', year: 2030 } } },
];
function catalog(route: string) {
  const hub = hubFor(route);
  if (!hub) throw new Error('Expected an existing sport hub');
  return { hub, games: categoriesByTitle(...hub.titles).flatMap(c => c.games) };
}
function CurrentHub() {
  const location = useLocation();
  return <><HubExperience {...catalog(location.pathname)} /><output data-testid="location">{location.pathname + location.search}</output></>;
}
function keep(name: string, data: unknown) {
  if (!process.env.SAVED_LIBRARY_RAW) return;
  mkdirSync(process.env.SAVED_LIBRARY_RAW, { recursive: true });
  writeFileSync(path.join(process.env.SAVED_LIBRARY_RAW, name + '.json'), JSON.stringify(data, null, 2) + '\n');
}
const bytes = () => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]));
const paths = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-hub-game]')].map(n => n.dataset.hubGame).sort();
beforeEach(() => { localStorage.clear(); localStorage.setItem('library-unrelated', 'held'); });
afterEach(() => { cleanup(); localStorage.clear(); });

describe('Saved game access on Home and sport hubs', () => {
  for (const fixture of fixtures) it('filters to actual saved games without rewriting saves on ' + fixture.route, () => {
    localStorage.setItem(fixture.key, JSON.stringify(fixture.save));
    const before = bytes();
    const view = render(<MemoryRouter initialEntries={[fixture.route + '?from=library-test']}><CurrentHub /></MemoryRouter>);
    const filter = view.queryByRole('button', { name: /^Saved games/ });
    keep(fixture.route.slice(1), { before, filterPresent: filter !== null, paths: paths(view) });
    expect(filter, 'HUB_SAVED_FILTER').not.toBeNull();
    fireEvent.click(filter!);
    expect(paths(view)).toEqual([fixture.path]);
    const url = new URL(view.getByTestId('location').textContent!, 'https://fixture.test');
    expect(url.searchParams.get('filter')).toBe('saved');
    expect(url.searchParams.get('from')).toBe('library-test');
    expect(bytes()).toEqual(before);
  });

  it('reads the new sport save when the same hub component changes routes', () => {
    for (const fixture of fixtures.slice(0, 2)) localStorage.setItem(fixture.key, JSON.stringify(fixture.save));
    const before = bytes();
    const view = render(<MemoryRouter initialEntries={['/soccer']}><CurrentHub /></MemoryRouter>);
    expect(view.container.querySelector('[data-hub-saved="/soccer-career"]')).not.toBeNull();
    const basketball = view.container.querySelector<HTMLAnchorElement>('nav[aria-label="Sport hubs"] a[href="/pro-basketball"]');
    expect(basketball).not.toBeNull();
    fireEvent.click(basketball!);
    const resume = view.container.querySelector('[data-hub-saved="/nba-my-career"]');
    keep('sport-switch', { before, location: view.getByTestId('location').textContent, resume: resume?.textContent ?? null });
    expect(resume, 'HUB_SAVED_SPORT_SWITCH').not.toBeNull();
    expect(resume!.textContent).toContain('Harbour Hoops');
    expect(view.container.querySelector('[data-hub-saved="/soccer-career"]')).toBeNull();
    expect(bytes()).toEqual(before);
  });

  it('refreshes an existing Home career line after another tab saves progress without changing its cards', () => {
    const fixture = fixtures[0];
    localStorage.setItem(fixture.key, JSON.stringify(fixture.save));
    const view = render(<MemoryRouter><ContinueRow /></MemoryRouter>);
    const card = () => view.container.querySelector('[data-continue-card="/soccer-career"]')!;
    expect(card().textContent).toContain('age 24');
    const cardPaths = [...view.container.querySelectorAll('[data-continue-card]')].map(n => n.getAttribute('data-continue-card'));
    const next = JSON.stringify({ currentClub: 'Harbour Training', age: 25 });
    localStorage.setItem(fixture.key, next);
    act(() => { window.dispatchEvent(new StorageEvent('storage', { key: fixture.key, newValue: next, storageArea: localStorage })); });
    keep('home-progress', { line: card().textContent, savedBytes: localStorage.getItem(fixture.key), cardPaths });
    expect(card().textContent, 'HOME_SAVED_PROGRESS').toContain('age 25');
    expect([...view.container.querySelectorAll('[data-continue-card]')].map(n => n.getAttribute('data-continue-card'))).toEqual(cardPaths);
    expect(localStorage.getItem(fixture.key)).toBe(next);
    expect(localStorage.getItem('library-unrelated')).toBe('held');
  });
});
