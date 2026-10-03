import assert from 'node:assert/strict';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import HubExperience from '@/components/hub/HubExperience';
import { hubFixtures, continuationFixtures } from './hubs994-fixtures';

const paths = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-hub-game]')].map(item => item.dataset.hubGame).sort();
type HubItem = ReturnType<typeof hubFixtures>[number];
const expected = (games: HubItem['games']) => games.map(game => game.path).sort();
function Location() { return <output data-current-route>{useLocation().pathname}</output>; }
function open(item: HubItem) { return render(<MemoryRouter initialEntries={[item.hub.route]}><HubExperience {...item} /><Location /></MemoryRouter>); }
const filter = (view: ReturnType<typeof render>, name: string) => view.getByRole('button', { name: new RegExp(`^${name}`) });
const enter = (view: ReturnType<typeof render>, value: string) => fireEvent.change(view.getByRole('textbox'), { target: { value } });
const cases: [string, () => void][] = [
  ['all six catalogs link each registry game exactly once', () => {
    for (const item of hubFixtures()) {
      const view = open(item);
      assert.deepEqual(paths(view), expected(item.games));
      for (const game of item.games) {
        const card = view.container.querySelector(`[data-hub-game="${game.path}"]`)!;
        assert.equal(card.querySelector('h3 a')?.getAttribute('href'), game.path);
        assert.equal(card.querySelector('h3 a')?.textContent, game.label);
      }
      assert.equal(view.getByRole('navigation', { name: 'Sport hubs' }).querySelectorAll('a').length, 6);
      assert.equal(view.container.querySelector('[aria-current="page"]')?.getAttribute('href'), item.hub.route);
      assert.equal(view.queryByRole('region', { name: 'Your saved games' }), null);
      cleanup();
    }
  }],
  ['daily filters match the registry flags on all six hubs', () => {
    for (const item of hubFixtures()) {
      const view = open(item), daily = item.games.filter(game => game.daily);
      if (daily.length) { const button = filter(view, 'Daily puzzles'); fireEvent.click(button); assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.deepEqual(paths(view), expected(daily)); }
      else assert.equal(view.queryByRole('button', { name: /^Daily puzzles/ }), null);
      cleanup();
    }
  }],
  ['simulation filters match the registry flags on all six hubs', () => {
    for (const item of hubFixtures()) {
      const view = open(item), sims = item.games.filter(game => game.featured);
      if (sims.length) { const button = filter(view, 'Careers & sims'); fireEvent.click(button); assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.deepEqual(paths(view), expected(sims)); }
      else assert.equal(view.queryByRole('button', { name: /^Careers & sims/ }), null);
      cleanup();
    }
  }],
  ['search matches labels and descriptions with whitespace and clear recovery', () => {
    for (const item of hubFixtures()) {
      const view = open(item);
      for (const query of [item.games.at(-1)!.label, item.games.at(-1)!.description.split(' ').find(word => word.length > 4)!]) {
        enter(view, `  ${query.toUpperCase()}  `);
        const needle = query.toLowerCase();
        assert.deepEqual(paths(view), expected(item.games.filter(game => `${game.label} ${game.description}`.toLowerCase().includes(needle))));
      }
      fireEvent.click(view.getByRole('button', { name: 'Clear game search' }));
      assert.deepEqual(paths(view), expected(item.games));
      cleanup();
    }
  }],
  ['empty searches disable discovery and reset both query and active filter', () => {
    for (const item of hubFixtures()) {
      const view = open(item);
      if (item.games.some(game => game.featured)) fireEvent.click(filter(view, 'Careers & sims'));
      enter(view, 'zzzx994-no-such-game');
      assert.deepEqual(paths(view), []);
      assert.equal((view.getByRole('button', { name: 'Pick a game for me' }) as HTMLButtonElement).disabled, true);
      fireEvent.click(view.getByRole('button', { name: `Show all ${item.hub.navLabel} games` }));
      assert.equal((view.getByRole('textbox') as HTMLInputElement).value, '');
      assert.equal(filter(view, 'All games').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(paths(view), expected(item.games));
      cleanup();
    }
  }],
  ['random navigation uses only the visible searched set', () => {
    const random = Math.random;
    try {
      for (const item of hubFixtures()) {
        const view = open(item), query = item.games.at(-1)!.label;
        enter(view, query);
        const visible = item.games.filter(game => `${game.label} ${game.description}`.toLowerCase().includes(query.toLowerCase()));
        assert.ok(visible.length && !visible.some(game => game.path === item.games[0].path), 'The directed subset excludes the first unfiltered game');
        for (const value of [0, 0.499, 0.999999]) {
          Math.random = () => value;
          fireEvent.click(view.getByRole('button', { name: 'Pick a game for me' }));
          assert.ok(visible.some(game => game.path === view.container.querySelector('[data-current-route]')?.textContent));
        }
        cleanup();
      }
    } finally { Math.random = random; }
  }],
  ['real engine continuations stay in their sport and preserve every save and record byte', () => {
    const fixtures = continuationFixtures();
    for (const item of hubFixtures()) {
      for (const fixture of fixtures) localStorage.setItem(fixture.saveKey, fixture.raw);
      localStorage.setItem('dukb-local-completions', '{"date":"2026-10-02","slugs":["/footle"]}');
      const held = { ...localStorage };
      const view = open(item), own = fixtures.filter(fixture => item.games.some(game => game.path === fixture.path));
      assert.equal(own.length, 1, 'One real engine continuation belongs to this hub');
      assert.deepEqual([...view.container.querySelectorAll('[data-hub-saved]')].map(link => link.getAttribute('href')).sort(), own.map(fixture => fixture.path).sort());
      for (const fixture of own) assert.equal(view.container.querySelector(`[data-hub-saved="${fixture.path}"] small`)?.textContent, fixture.description);
      assert.equal(view.container.querySelector('header a')?.getAttribute('href'), own[0].path);
      enter(view, 'zzzx994-no-such-game'); fireEvent.click(view.getByRole('button', { name: 'Clear game search' }));
      assert.deepEqual({ ...localStorage }, held);
      cleanup(); localStorage.clear();
      localStorage.setItem(own[0].saveKey, '{damaged');
      const damaged = open(item);
      assert.equal(damaged.container.querySelector('[data-hub-saved] small')?.textContent, 'Saved in this browser');
      assert.equal(localStorage.getItem(own[0].saveKey), '{damaged');
      cleanup(); localStorage.clear();
    }
  }],
];

export async function run() {
  const rows = [];
  for (const [title, body] of cases) {
    localStorage.clear();
    try { body(); rows.push({ title, status: 'PASS' }); }
    catch (error) { rows.push({ title, status: 'FAIL', error: { name: error.name, message: error.message } }); }
    finally { cleanup(); localStorage.clear(); }
  }
  return { total: rows.length, passed: rows.filter(row => row.status === 'PASS').length, failed: rows.filter(row => row.status === 'FAIL').length, rows };
}
