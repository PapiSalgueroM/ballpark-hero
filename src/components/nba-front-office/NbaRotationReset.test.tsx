/* Actual Board restart paths with a fictional restored franchise and local-only persistence. */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { NBA_TEAMS } from '@/data/conquestDataNba';
import { initNbaLeague, type NbaLeague } from '@/lib/nbaFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const KEY = 'nba-front-office-save-v1';
const SENTINEL = 'nba-rotation-reset-fixture-unrelated';
const rng = (seed: number) => () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };

function mount(manual = false) {
  const league = initNbaLeague(rng(887));
  const team = NBA_TEAMS[0].id;
  league.teams[team].players = Array.from({ length: 14 }, (_, i) => ({
    id: `fictional-reset-${i}`, name: `Simulated restart player ${i + 1}`, pos: (['G', 'F', 'C'] as const)[i % 3],
    age: 25, ovr: 90 - i, pot: 90 - i, salary: 2, years: 3, out: 0,
  }));
  if (manual) league.teams[team].rotation = [7, 1, 2, 3, 4, 5, 6, 0].map(i => `fictional-reset-${i}`);
  const raw = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw);
  localStorage.setItem(SENTINEL, 'unrelated exact payload');
  render(<NbaFrontOfficeBoard />);
  return { raw, next: NBA_TEAMS.find(t => t.id !== team)! };
}

async function restart(next: (typeof NBA_TEAMS)[number]) {
  fireEvent.click(screen.getByRole('button', { name: 'Abandon franchise and restart' }));
  expect(localStorage.getItem(KEY)).toBeNull();
  expect(localStorage.getItem(SENTINEL)).toBe('unrelated exact payload');
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${next.city} ${next.name}\\s`) }));
  await waitFor(() => expect(localStorage.getItem(KEY)).not.toBeNull(), { timeout: 4000 });
  const saved = JSON.parse(localStorage.getItem(KEY)!) as { league: NbaLeague; myTeam: string; phase: string };
  expect(saved.myTeam).toBe(next.id);
  expect(saved.phase).toBe('hub');
  expect(saved.league.teams[next.id]).not.toHaveProperty('rotation');
  expect(localStorage.getItem(SENTINEL)).toBe('unrelated exact payload');
  fireEvent.click(screen.getByText('Roster'));
}

describe('NBA rotation view lifecycle across actual Board restart', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(Math, 'random').mockImplementation(rng(889)); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('keeps ordinary restored roster and local save unchanged as an independent baseline', () => {
    const { raw } = mount();
    fireEvent.click(screen.getByText('Roster'));
    expect(screen.getByRole('button', { name: 'Set rotation' })).toBeInTheDocument();
    expect(document.querySelector('[data-nba-rotation]')).toBeNull();
    expect(document.querySelectorAll('[data-roster-row]')).toHaveLength(14);
    expect(localStorage.getItem(KEY)).toBe(raw);
    expect(localStorage.getItem(SENTINEL)).toBe('unrelated exact payload');
  });

  it('keeps ordinary new-franchise restart and own-key deletion as an independent baseline', async () => {
    const { next } = mount();
    await restart(next);
    expect(screen.getByRole('button', { name: 'Set rotation' })).toBeInTheDocument();
    expect(document.querySelector('[data-nba-rotation]')).toBeNull();
    expect(document.querySelectorAll('[data-roster-row]').length).toBeGreaterThan(0);
  });

  it('closes the previous rotation view before a new franchise opens its roster', async () => {
    const { raw, next } = mount(true);
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(screen.getByRole('button', { name: 'Set rotation' }));
    const oldPanel = document.querySelector('[data-nba-rotation]') as HTMLElement;
    expect(within(oldPanel).getByRole('combobox', { name: /^Starter 1 / })).toHaveValue('fictional-reset-7');
    expect(within(oldPanel).getByRole('status')).toBeEmptyDOMElement();
    expect(localStorage.getItem(KEY)).toBe(raw);
    await restart(next);
    expect(screen.queryByRole('button', { name: 'Set rotation' })).not.toBeNull();
    expect(document.querySelector('[data-nba-rotation]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Set rotation' }));
    const freshPanel = document.querySelector('[data-nba-rotation]') as HTMLElement;
    expect(within(freshPanel).getByRole('status')).toBeEmptyDOMElement();
    const starter = within(freshPanel).getByRole('combobox', { name: /^Starter 1 / }) as HTMLSelectElement;
    expect(starter).not.toHaveValue('fictional-reset-7');
    const saved = JSON.parse(localStorage.getItem(KEY)!) as { league: NbaLeague };
    expect(saved.league.teams[next.id].players.some(p => p.id === starter.value)).toBe(true);
    expect(localStorage.getItem(SENTINEL)).toBe('unrelated exact payload');
  });
});
