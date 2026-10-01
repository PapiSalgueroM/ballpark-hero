import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Page from '@/pages/NbaStatLine';
import * as stats from '@/lib/nbaStatLine';
import { getTodayET } from '@/lib/dateUtils';
import { recordCompletion } from '@/lib/completions';

vi.mock('@/lib/nbaStatLine', async original => ({ ...await original<typeof import('@/lib/nbaStatLine')>(), fetchNbaStatLinePool: async () => pool }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, loading: false, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', async original => ({ ...await original<typeof import('@/lib/completions')>(), recordCompletion: vi.fn(), getCurrentPlayerName: () => 'Fixture guest' }));
vi.mock('@/lib/badges', async original => ({ ...await original<typeof import('@/lib/badges')>(), getNewlyEarnedBadges: async () => [] }));

const NAME = 'FictionalCaldermereLongUnbrokenNameWithEverySeasonVisible';
const BASE_POOL: stats.StatLineSeason[] = Array.from({ length: 34 }, (_, i) => ({
  key: `${NAME}|${1990 + i}-${String((1991 + i) % 100).padStart(2, '0')}|FXA`,
  player: NAME, season: `${1990 + i}-${String((1991 + i) % 100).padStart(2, '0')}`, endYear: 1991 + i,
  position: 'SF', team: 'FXA', minutes: 700 + (33 - i) * 65,
  pts: 400 + i * 39, trb: 120 + i * 17, ast: 80 + i * 13, stl: 20 + i, blk: 10 + i,
  fg: 170 + i * 11, fga: 510 + i * 7, ft: 60 + i * 5, fta: 130 + i * 4, threeP: 25 + i * 3, threePa: 90 + i * 2,
}));
let pool = BASE_POOL;
const keyPrefix = 'nba-stat-line-daily-';
const frame = () => <HelmetProvider><MemoryRouter initialEntries={['/nba-stat-line']}><Page /></MemoryRouter></HelmetProvider>;
type View = ReturnType<typeof render>;
const choices = (view: View) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-nba-season-choice]')];
const search = (view: View) => view.getByRole('searchbox', { name: 'Search NBA player seasons' }) as HTMLInputElement;
const count = (view: View) => view.container.querySelector('[data-nba-season-count]')!;
const selectedKeys = (view: View) => [...view.container.querySelectorAll<HTMLElement>('[data-nba-picked-season]')].map(node => node.dataset.nbaPickedSeason!);
const type = (view: View, value = NAME) => { search(view).focus(); fireEvent.change(search(view), { target: { value } }); };
const click = (node: HTMLButtonElement) => { node.focus(); fireEvent.click(node); };
const expand = (view: View) => click(view.getByRole('button', { name: 'Load more seasons' }) as HTMLButtonElement);
const pick = (view: View, key: string) => {
  type(view);
  while (!choices(view).some(node => node.dataset.nbaSeasonChoice === key)) expand(view);
  click(choices(view).find(node => node.dataset.nbaSeasonChoice === key)!);
};
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); pool = BASE_POOL;
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function start(mode: 'daily' | 'unlimited' = 'daily') {
  const view = render(frame());
  const menu = await view.findByRole('button', { name: /^Daily target/ });
  click(mode === 'daily' ? menu as HTMLButtonElement : view.getByRole('button', { name: /^Unlimited/ }) as HTMLButtonElement);
  const writes = vi.spyOn(Storage.prototype, 'setItem'), random = vi.spyOn(Math, 'random');
  const snapshot = JSON.stringify(pool), target = stats.buildDailyTarget(pool, getTodayET())!.target;
  return { view, writes, random, calls: random.mock.calls.length, snapshot, target };
}
const quiet = (state: Awaited<ReturnType<typeof start>>) => {
  expect(state.writes).not.toHaveBeenCalled(); expect(state.random.mock.calls.length).toBe(state.calls);
  expect(recordCompletion).not.toHaveBeenCalled(); expect(JSON.stringify(pool)).toBe(state.snapshot);
};

describe('actual NBA Stat Line season picker', () => {
  it('holds the original first-ten order, labeled search and quiet typing', async () => {
    const state = await start(); type(state.view);
    const expected = stats.suggestSeasons(stats.eligiblePoolFor(pool, state.target), NAME, new Set(), 10);
    expect(choices(state.view).map(node => node.dataset.nbaSeasonChoice)).toEqual(expected.map(season => season.key));
    expect(count(state.view)).toHaveTextContent(/^Showing 10 matching seasons, more available\.$/);
    expect(search(state.view)).toHaveAttribute('placeholder', 'Search any NBA player...'); quiet(state);
  });

  it('reaches beyond20 with stable earlier choices, exact counts and query reset', async () => {
    const state = await start(); type(state.view); const earlier = choices(state.view);
    expand(state.view); expect(choices(state.view)).toHaveLength(20);
    expect(document.activeElement).toBe(choices(state.view)[10]);
    expand(state.view); expect(choices(state.view)).toHaveLength(30);
    earlier.forEach((node, index) => expect(choices(state.view)[index]).toBe(node));
    expect(count(state.view)).toHaveTextContent(/^Showing 30 matching seasons, more available\.$/);
    expand(state.view); expect(choices(state.view)).toHaveLength(34);
    expect(count(state.view)).toHaveTextContent(/^Showing 34 matching seasons\.$/);
    expect(state.view.getByRole('button', { name: 'All matching seasons shown' })).toBeDisabled();
    type(state.view, 'Fictional'); expect(choices(state.view)).toHaveLength(10);
    expect(count(state.view)).toHaveTextContent(/^Showing 10 matching seasons, more available\.$/); quiet(state);
  });

  it('picks an exact later season object and returns focus to search without booking', async () => {
    const state = await start(), combine = vi.spyOn(stats, 'combineLine'); const later = pool[24];
    pick(state.view, later.key); expect(selectedKeys(state.view)).toEqual([later.key]);
    expect(combine.mock.calls[combine.mock.calls.length - 1][0][0]).toBe(later); expect(document.activeElement).toBe(search(state.view));
    type(state.view); expand(state.view); expand(state.view);
    expect(choices(state.view).some(node => node.dataset.nbaSeasonChoice === later.key)).toBe(false);
    expect(state.view.queryByRole('button', { name: 'Score my line' })).toBeNull(); quiet(state);
  });

  it('focuses Score on the fifth pick and search after removal while retaining earlier picks', async () => {
    const state = await start(); const selected = [pool[24], pool[2], pool[29], pool[5], pool[33]];
    for (const season of selected) pick(state.view, season.key);
    const retained = [...state.view.container.querySelectorAll('[data-nba-picked-season]')];
    const score = state.view.getByRole('button', { name: 'Score my line' }); expect(document.activeElement).toBe(score);
    expect(state.view.queryByRole('searchbox')).toBeNull(); expect(selectedKeys(state.view)).toEqual(selected.map(season => season.key));
    click(within(retained[2] as HTMLElement).getByRole('button', { name: /^Remove / }) as HTMLButtonElement);
    expect(document.activeElement).toBe(search(state.view));
    expect(selectedKeys(state.view)).toEqual(selected.filter((_, i) => i !== 2).map(season => season.key));
    [0, 1, 3, 4].forEach(index => expect(state.view.container.querySelector(`[data-nba-picked-season="${selected[index].key}"]`)).toBe(retained[index]));
    quiet(state);
  });

  it('preserves exact weighted score, summed splits, daily keys, share and quiet restored finish', async () => {
    const state = await start(), selected = [pool[24], pool[2], pool[29], pool[5], pool[33]];
    for (const season of selected) pick(state.view, season.key);
    const combined = stats.combineLine(selected, state.target.split), scored = stats.scoreCombined(state.target, combined);
    expect(combined.pts).toBe(selected.reduce((sum, season) => sum + season.pts, 0) / combined.minutes * 36);
    expect(combined.splitPct).toBe(combined.splitMakes / combined.splitAtts * 100);
    quiet(state); click(state.view.getByRole('button', { name: 'Score my line' }) as HTMLButtonElement);
    expect(localStorage.getItem(keyPrefix + getTodayET())).toBe(JSON.stringify({ picks: selected.map(season => season.key) }));
    expect(state.writes.mock.calls.filter(([key]) => String(key).startsWith(keyPrefix))).toHaveLength(1);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/nba-stat-line', scored.total, 'Fixture guest', scored.total >= stats.HIT_SCORE ? 1 : 0);
    const result = state.view.container.querySelector('[role="status"]')!;
    expect(result).toHaveTextContent(`scored ${scored.total} out of 100`);
    for (const entry of scored.breakdown) expect(result).toHaveTextContent(`target ${entry.target.toFixed(1)}`);
    const clipboard = vi.fn().mockResolvedValue(undefined); Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
    click(state.view.getByRole('button', { name: /Copy Score Card/ }) as HTMLButtonElement);
    await waitFor(() => expect(clipboard).toHaveBeenCalledTimes(1));
    const squares = scored.breakdown.map(entry => entry.closeness >= 0.9 ? '🟩' : entry.closeness >= 0.6 ? '🟨' : '⬜').join('');
    expect(clipboard.mock.calls[0][0]).toBe(`📊 NBA Stat Line: Oct 1, 2026\n📊 NBA Stat Line ${scored.total}/100\n${squares}\nScore: ${scored.total}\ndouknowball.com/nba-stat-line`);
    state.view.unmount(); state.writes.mockClear();
    const restored = render(frame()); click(await restored.findByRole('button', { name: /^Daily target/ }) as HTMLButtonElement);
    expect(restored.container.querySelector('[role="status"]')).toHaveTextContent(`scored ${scored.total} out of 100`);
    expect(restored.getByText("Today's run is in the books")).toBeInTheDocument();
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(state.writes).not.toHaveBeenCalled();
  });

  it('keeps unlimited results unsaved and resets visibility for a new target', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const state = await start('unlimited'), selected = [pool[24], pool[2], pool[29], pool[5], pool[33]];
    const target = stats.buildRandomTarget(pool, () => 0.25)!.target;
    for (const season of selected) pick(state.view, season.key);
    const expected = stats.scoreCombined(target, stats.combineLine(selected, target.split)).total;
    quiet(state); click(state.view.getByRole('button', { name: 'Score my line' }) as HTMLButtonElement);
    expect(recordCompletion).toHaveBeenCalledWith('/nba-stat-line', expected, 'Fixture guest', expected >= stats.HIT_SCORE ? 1 : 0);
    expect(state.writes).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0);
    click(state.view.getByRole('button', { name: 'New target' }) as HTMLButtonElement);
    click(state.view.getByRole('button', { name: /^Unlimited/ }) as HTMLButtonElement); type(state.view);
    expect(choices(state.view)).toHaveLength(10); expect(selectedKeys(state.view)).toEqual([]);
    expect(recordCompletion).toHaveBeenCalledTimes(1); expect(state.writes).not.toHaveBeenCalled();
  });

  it('keeps empty and no-match searches, disabled paging and cloned renders quiet', async () => {
    const state = await start(); type(state.view, 'F'); expect(count(state.view)).toBeNull();
    type(state.view, 'Absent fictional person'); expect(count(state.view)).toHaveTextContent('No eligible seasons match that name.');
    expect(choices(state.view)).toHaveLength(0); const more = state.view.getByRole('button', { name: 'All matching seasons shown' }) as HTMLButtonElement;
    expect(more).toBeDisabled(); more.click();
    const input = search(state.view); state.view.rerender(frame()); expect(search(state.view)).toBe(input); expect(document.activeElement).toBe(input);
    type(state.view, ''); expect(count(state.view)).toBeNull(); quiet(state);
  });

  it('blocks held Enter and Space on paging, choice, removal and Score while allowing fresh keys', async () => {
    const state = await start(); type(state.view);
    const assertKeys = (button: HTMLButtonElement) => {
      for (const key of ['Enter', ' ']) {
        const held = new KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true });
        expect(button.dispatchEvent(held)).toBe(false); expect(held.defaultPrevented).toBe(true);
        const fresh = new KeyboardEvent('keydown', { key, repeat: false, bubbles: true, cancelable: true });
        expect(button.dispatchEvent(fresh)).toBe(true); expect(fresh.defaultPrevented).toBe(false);
      }
    };
    assertKeys(state.view.getByRole('button', { name: 'Load more seasons' }) as HTMLButtonElement); expand(state.view);
    assertKeys(choices(state.view)[10]); click(choices(state.view)[10]);
    assertKeys(state.view.getByRole('button', { name: /^Remove / }) as HTMLButtonElement);
    for (const season of [pool[24], pool[2], pool[29], pool[33]]) pick(state.view, season.key);
    assertKeys(state.view.getByRole('button', { name: 'Score my line' }) as HTMLButtonElement); quiet(state);
  });

  it('retains original prefix tiers and era eligibility after every expansion', async () => {
    const old = { ...BASE_POOL[0], key: 'Caldermere old|1960-61|FXO', player: 'Caldermere old', season: '1960-61', endYear: 1961, stl: null, blk: null, threeP: null, threePa: null };
    const missing = { ...BASE_POOL[0], key: 'Caldermere missing|2020-21|FXO', player: 'Caldermere missing', stl: null, blk: null };
    pool = [...BASE_POOL, { ...BASE_POOL[0], key: 'Caldermere prefix|2020-21|FXP', player: 'Caldermere prefix' }, { ...BASE_POOL[1], key: 'Fictional Caldermere word|2020-21|FXW', player: 'Fictional Caldermere word' }, old, missing];
    for (let day = 1; day <= 28; day++) {
      const date = `2026-10-${String(day).padStart(2, '0')}`;
      if (stats.buildDailyTarget(pool, date)!.target.stl != null) { vi.setSystemTime(new Date(date + 'T12:00:00Z')); break; }
    }
    const state = await start(); expect(state.target.stl).not.toBeNull(); type(state.view, 'Caldermere');
    while (!state.view.queryByRole('button', { name: 'All matching seasons shown' })) expand(state.view);
    const expected = stats.suggestSeasons(stats.eligiblePoolFor(pool, state.target), 'Caldermere', new Set(), pool.length);
    expect(choices(state.view).map(node => node.dataset.nbaSeasonChoice)).toEqual(expected.map(season => season.key));
    expect(choices(state.view).map(node => node.dataset.nbaSeasonChoice)).not.toContain(old.key);
    expect(choices(state.view).map(node => node.dataset.nbaSeasonChoice)).not.toContain(missing.key); quiet(state);
  });

  it('holds an independent original-helper weighted and summed baseline without mutation or RNG', () => {
    const before = JSON.stringify(BASE_POOL), random = vi.spyOn(Math, 'random'), selected = [BASE_POOL[24], BASE_POOL[2], BASE_POOL[29], BASE_POOL[5], BASE_POOL[33]];
    const target = stats.buildDailyTarget(BASE_POOL, getTodayET())!.target, combined = stats.combineLine(selected, 'FG');
    const minutes = selected.reduce((sum, season) => sum + season.minutes, 0);
    expect(combined.pts).toBe(selected.reduce((sum, season) => sum + season.pts, 0) / minutes * 36);
    expect(combined.splitPct).toBe(selected.reduce((sum, season) => sum + season.fg, 0) / selected.reduce((sum, season) => sum + season.fga, 0) * 100);
    expect(combined.splitPct).not.toBe(selected.reduce((sum, season) => sum + season.fg / season.fga * 100, 0) / 5);
    expect(stats.scoreCombined(target, stats.combineLine(selected, target.split)).total).toBeGreaterThanOrEqual(0);
    expect(stats.suggestSeasons(BASE_POOL, NAME, new Set([BASE_POOL[0].key]), 30)[23]).toBe(BASE_POOL[24]);
    expect(JSON.stringify(BASE_POOL)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(localStorage.length).toBe(0); expect(recordCompletion).not.toHaveBeenCalled();
  });
});
