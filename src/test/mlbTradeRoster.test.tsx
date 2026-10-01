import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import * as engine from '@/lib/mlbFrontOffice';
import { findTrades } from '@/lib/tradeFinder';
import { openTalks } from '@/lib/foTradeTalks';
import { buildOwnerMandate } from '@/lib/foOwnerMandate';
import { MLB_TEAMS } from '@/data/conquestDataMlb';
import { recordCompletion, recordActivity } from '@/lib/completions';
import type { MlbGmPlayer, MlbLeague } from '@/lib/mlbFrontOffice';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {}, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: vi.fn() }) }));
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => null }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

const KEY = 'mlb-front-office-save-v1';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture(): MlbLeague {
  const positions = ['C', 'SS', 'OF', '1B', '2B', '3B', 'CF', 'RF', 'SP', 'SP', 'SP', 'RP', 'CL', 'OF', 'C', 'RP'];
  const teams = Object.fromEntries(MLB_TEAMS.map(team => [team.id, {
    abbr: team.id, wins: 3, losses: 2, picks: [1, 2],
    players: positions.map((pos, i): MlbGmPlayer => ({
      id: `${team.id}-${i}`, name: i === 10 ? `FictionalUnbrokenTradeRosterName${team.id}RepeatedFullName` : `Fictional ${team.id} Caldermere ${i} Full Name`,
      pos, ovr: (team.id === 'BOS' ? 95 : 78) - Math.max(0, i - 1), age: 25, salary: 1, years: 2, out: 0, pot: 95,
    })),
  }]));
  return { season: 2026, round: 4, cap: 1000, champions: [], freeAgents: [], teams };
}
const saved = (league: MlbLeague) => ({ league, myTeam: 'BOS', phase: 'hub', titles: 2, seasonsPlayed: 3, draftClass: null, picksLeft: 0, mandate: buildOwnerMandate(1, MLB_TEAMS.length, false, { title: 'the World Series', playoffs: 'October', round: 'a series', games: 162 }, 2026), trust: 60, fired: false, pressTilt: 0, seasonTradeLine: null as string | null, postseason: null });
const read = () => JSON.parse(localStorage.getItem(KEY)!) as ReturnType<typeof saved>;
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function open(league = fixture()) {
  const base = saved(league), raw = JSON.stringify(base); localStorage.setItem(KEY, raw);
  const writes = vi.spyOn(Storage.prototype, 'setItem'), random = vi.spyOn(Math, 'random');
  const view = render(<Board />);
  fireEvent.click(await view.findByRole('button', { name: /^🤝\s*Trades/ }));
  return { view, writes, random, randomCalls: random.mock.calls.length, league, raw, base };
}
type View = ReturnType<typeof render>;
const panel = (view: View, name: string) => view.container.querySelector<HTMLElement>(`[data-mlb-trade-roster="${name}"]`)!;
const rows = (view: View, name: string) => [...panel(view, name).querySelectorAll<HTMLButtonElement>('[data-mlb-trade-choice]')];
const row = (view: View, name: string, id: string) => panel(view, name).querySelector<HTMLButtonElement>(`[data-mlb-trade-choice="${id}"]`)!;
const expand = (view: View, name: string) => { const button = within(panel(view, name)).getByRole('button', { name: 'Load more players' }); button.focus(); fireEvent.click(button); };
const noBooking = () => { expect(recordCompletion).not.toHaveBeenCalled(); expect(recordActivity).not.toHaveBeenCalled(); };
const quiet = (state: Awaited<ReturnType<typeof open>>, randomCalls = state.randomCalls) => { expect(state.writes).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBe(state.raw); expect(state.random).toHaveBeenCalledTimes(randomCalls); noBooking(); };

describe('actual MLB whole-roster trade access', () => {
  it('holds the original first-eight rating and tied order without writes or choices', async () => {
    const state = await open();
    expect(rows(state.view, 'finder').map(button => button.dataset.mlbTradeChoice)).toEqual(Array.from({ length: 8 }, (_, i) => `BOS-${i}`));
    expect(within(panel(state.view, 'finder')).getByText('Showing 8 of 16 players')).toBeVisible();
    expect(state.view.getByRole('button', { name: 'Shop him around the league' })).toBeDisabled();
    expect(rows(state.view, 'finder').every(button => button.getAttribute('aria-pressed') === 'false')).toBe(true);
    quiet(state);
  });

  it('reaches all Finder choices with truthful counts, stable earlier nodes and native focus', async () => {
    const state = await open(), first = rows(state.view, 'finder'), calls = state.random.mock.calls.length;
    expand(state.view, 'finder');
    expect(rows(state.view, 'finder').map(button => button.dataset.mlbTradeChoice)).toEqual(Array.from({ length: 16 }, (_, i) => `BOS-${i}`));
    first.forEach((button, i) => expect(rows(state.view, 'finder')[i]).toBe(button));
    expect(panel(state.view, 'finder').querySelector('[data-mlb-trade-count]')).toHaveTextContent(/^Showing 16 of 16 players$/);
    expect(within(panel(state.view, 'finder')).getByRole('button', { name: 'All players shown' })).toBeDisabled();
    await waitFor(() => expect(row(state.view, 'finder', 'BOS-8')).toHaveFocus());
    state.view.rerender(<Board />); first.forEach((button, i) => expect(rows(state.view, 'finder')[i]).toBe(button));
    quiet(state, calls);
  });

  it('reaches all manual send choices and shares the exact selected ID with Finder', async () => {
    const state = await open(); fireEvent.click(state.view.getByRole('button', { name: 'NYY' }));
    const first = rows(state.view, 'send'), calls = state.random.mock.calls.length;
    expand(state.view, 'send');
    expect(rows(state.view, 'send')).toHaveLength(16); first.forEach((button, i) => expect(rows(state.view, 'send')[i]).toBe(button));
    fireEvent.click(row(state.view, 'send', 'BOS-10'));
    expect(row(state.view, 'send', 'BOS-10')).toHaveAttribute('aria-pressed', 'true');
    expect(row(state.view, 'finder', 'BOS-10')).toHaveAttribute('aria-pressed', 'true');
    expect(rows(state.view, 'finder')).toHaveLength(16); quiet(state, calls);
  });

  it('reaches every partner choice and resets only its page when changing clubs', async () => {
    const state = await open(); fireEvent.click(row(state.view, 'finder', 'BOS-0'));
    fireEvent.click(state.view.getByRole('button', { name: 'NYY' })); const first = rows(state.view, 'receive'), calls = state.random.mock.calls.length;
    expand(state.view, 'receive');
    expect(rows(state.view, 'receive').map(button => button.dataset.mlbTradeChoice)).toEqual(Array.from({ length: 16 }, (_, i) => `NYY-${i}`));
    first.forEach((button, i) => expect(rows(state.view, 'receive')[i]).toBe(button));
    await waitFor(() => expect(row(state.view, 'receive', 'NYY-8')).toHaveFocus());
    expect(within(panel(state.view, 'receive')).getByText('Showing 16 of 16 players')).toBeVisible();
    fireEvent.click(state.view.getByRole('button', { name: 'NYM' }));
    expect(rows(state.view, 'receive')).toHaveLength(8); expect(row(state.view, 'receive', 'NYM-8')).toBeNull();
    expect(within(panel(state.view, 'receive')).getByText('Showing 8 of 16 players')).toBeVisible();
    expect(row(state.view, 'finder', 'BOS-0')).toHaveAttribute('aria-pressed', 'true'); quiet(state, calls);
  });

  it('shops a later exact own ID through original Finder and accepts its unchanged full Save', async () => {
    const state = await open(), ownId = 'BOS-10'; expand(state.view, 'finder'); fireEvent.click(row(state.view, 'finder', ownId));
    const offers = findTrades(state.league.teams, 'BOS', ownId, state.league.cap, engine.mlbTrade, engine.mlbTradeValue);
    expect(offers.length).toBeGreaterThan(0); const calls = state.random.mock.calls.length;
    fireEvent.click(state.view.getByRole('button', { name: 'Shop him around the league' }));
    expect(within(panel(state.view, 'finder')).getAllByRole('button', { name: 'Accept' })).toHaveLength(offers.length);
    offers.forEach(offer => expect(panel(state.view, 'finder')).toHaveTextContent(`${offer.playerName} (${offer.playerPos})`)); quiet(state, calls);
    const expected = clone(state.base), offer = offers[0];
    expect(engine.mlbTrade(expected.league.teams.BOS, expected.league.teams[offer.teamId], ownId, offer.playerId, offer.sweeten, expected.league.cap)).toBe('accepted');
    expected.seasonTradeLine = `the deal that brought ${offer.playerName} in`;
    fireEvent.click(within(panel(state.view, 'finder')).getAllByRole('button', { name: 'Accept' })[0]);
    expect(state.writes).toHaveBeenCalledTimes(1); expect(read()).toEqual(expected); expect(state.random).toHaveBeenCalledTimes(calls); noBooking();
    expect(state.view.getByRole('button', { name: 'Shop him around the league' })).toBeDisabled();
  });

  it('opens and commits a later exact manual pair through original talks and salary/pick rules', async () => {
    const state = await open(); fireEvent.click(state.view.getByRole('button', { name: 'NYY' })); expand(state.view, 'send'); expand(state.view, 'receive');
    const mine = state.league.teams.BOS.players[10], want = state.league.teams.NYY.players[10]; fireEvent.click(row(state.view, 'send', mine.id));
    const talks = openTalks({ mine, want, theirRoster: state.league.teams.NYY.players, myPickCount: 2, pickValue: 13, value: engine.mlbTradeValue, theirCoverAtMyPos: state.league.teams.NYY.players.filter(p => p.pos === mine.pos && p.ovr >= mine.ovr - 2).length, openPremium: 1.07 });
    expect(talks.phase).toBe('agreed'); const calls = state.random.mock.calls.length;
    fireEvent.click(row(state.view, 'receive', want.id));
    const card = state.view.container.querySelector('[data-trade-talks]')!;
    expect(card).toHaveAttribute('data-trade-phase', talks.phase); expect(card).toHaveTextContent(talks.counterLine); expect(card).toHaveTextContent(mine.name); expect(card).toHaveTextContent(want.name); quiet(state, calls);
    const expected = clone(state.base); expect(engine.mlbExecuteTalksTrade(expected.league.teams.BOS, expected.league.teams.NYY, mine.id, talks.pkg!.theirPlayerId, talks.pkg!.addPick, expected.league.cap)).toBe('done');
    expected.seasonTradeLine = `the deal that brought ${talks.pkg!.theirPlayerName} in`;
    fireEvent.click(state.view.getByRole('button', { name: 'Shake on it' }));
    expect(state.writes).toHaveBeenCalledTimes(1); expect(read()).toEqual(expected); expect(state.random).toHaveBeenCalledTimes(calls); noBooking();
  });

  it('keeps later released-player refusals quiet and focuses the count when no receive choice is enabled', async () => {
    const league = fixture(); league.teams.BOS.releasedThisSeason = ['NYY-15'];
    const state = await open(league); fireEvent.click(state.view.getByRole('button', { name: 'NYY' })); expand(state.view, 'receive');
    const count = panel(state.view, 'receive').querySelector('[data-mlb-trade-count]')!; await waitFor(() => expect(count).toHaveFocus());
    fireEvent.click(row(state.view, 'send', 'BOS-0')); const denied = row(state.view, 'receive', 'NYY-15');
    expect(denied).toBeDisabled(); expect(denied).toHaveAttribute('title', 'You designated him for assignment this season. He can come back after the offseason.');
    denied.click(); expect(state.view.container.querySelector('[data-trade-talks]')).toBeNull(); quiet(state);
    const before = JSON.stringify(state.league); expect(engine.mlbTrade(state.league.teams.BOS, state.league.teams.NYY, 'BOS-0', 'NYY-15', false, state.league.cap)).toBe('invalid'); expect(JSON.stringify(state.league)).toBe(before);
  });

  it('holds an independent original-helper first-eight baseline without roster, RNG or save mutation', () => {
    const league = fixture(), before = JSON.stringify(league), random = vi.spyOn(Math, 'random');
    const offers = findTrades(league.teams, 'BOS', 'BOS-0', league.cap, engine.mlbTrade, engine.mlbTradeValue); expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) { const copy = clone(league); expect(engine.mlbTrade(copy.teams.BOS, copy.teams[offer.teamId], 'BOS-0', offer.playerId, offer.sweeten, league.cap)).toBe('accepted'); }
    expect(JSON.stringify(league)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(localStorage.getItem(KEY)).toBeNull(); noBooking();
  });

  it('blocks held-key default activation on newly exposed choices while fresh keys stay usable', async () => {
    const state = await open(); fireEvent.click(row(state.view, 'finder', 'BOS-0')); fireEvent.click(state.view.getByRole('button', { name: 'NYY' }));
    expand(state.view, 'finder'); expand(state.view, 'receive');
    for (const name of ['finder', 'send', 'receive']) {
      const choice = row(state.view, name, name === 'receive' ? 'NYY-8' : 'BOS-8');
      for (const key of ['Enter', ' ']) {
        const held = new KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true });
        expect(choice.dispatchEvent(held)).toBe(false); expect(held.defaultPrevented).toBe(true);
        const fresh = new KeyboardEvent('keydown', { key, repeat: false, bubbles: true, cancelable: true });
        expect(choice.dispatchEvent(fresh)).toBe(true); expect(fresh.defaultPrevented).toBe(false);
      }
    }
    expect(row(state.view, 'finder', 'BOS-8')).toHaveAttribute('aria-pressed', 'false');
    expect(state.view.container.querySelector('[data-trade-talks]')).toBeNull(); quiet(state);
  });
});
