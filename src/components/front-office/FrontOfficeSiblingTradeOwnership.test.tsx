import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import NhlFrontOfficeBoard from '@/components/nhl-front-office/NhlFrontOfficeBoard';
import { initNbaLeague, NBA_ROSTER_MIN } from '@/lib/nbaFrontOffice';
import { initMlbLeague, MLB_ROSTER_MIN } from '@/lib/mlbFrontOffice';
import { initNhlLeague, NHL_ROSTER_MIN } from '@/lib/nhlFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const cases = [
  { sport: 'NBA', key: 'nba-front-office-save-v1', init: initNbaLeague, Board: NbaFrontOfficeBoard, floor: NBA_ROSTER_MIN, arm: /^Waive, /, confirm: 'Waive him' },
  { sport: 'MLB', key: 'mlb-front-office-save-v1', init: initMlbLeague, Board: MlbFrontOfficeBoard, floor: MLB_ROSTER_MIN, arm: /^DFA, /, confirm: 'DFA him' },
  { sport: 'NHL', key: 'nhl-front-office-save-v1', init: initNhlLeague, Board: NhlFrontOfficeBoard, floor: NHL_ROSTER_MIN, arm: /^Waive, /, confirm: 'Waive him' },
];

type Player = { id: string; name: string; ovr: number; pos: string };
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name, exact: true }));
const tile = (name: string) => fireEvent.click(screen.getByText(name, { exact: true }));
const talks = () => document.querySelector('[data-trade-talks]');
const available = () => screen.queryAllByRole('button', { name: 'Open talks', exact: true });
function row(attr: string, player: Player) {
  const found = document.querySelector<HTMLElement>(`[${attr}="${player.id}"]`);
  expect(found, player.name).toBeTruthy();
  return within(found!);
}
function pick(player: Player) {
  const button = screen.getAllByText(`${player.name} (${player.pos})`, { exact: true })
    .map(element => element.closest('button')).find(Boolean);
  expect(button).toBeTruthy();
  fireEvent.click(button!);
}
function seeded() {
  let seed = 7;
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

for (const c of cases) {
  it(`${c.sport} restores manual negotiation after losing the outgoing player`, () => {
    const { Board } = c;
    const league = c.init(seeded());
    const teams = league.teams as Record<string, { players: Player[] }>;
    const team = Object.keys(teams).find(id => teams[id].players.length > c.floor)!;
    const [partner, alternate] = Object.keys(teams).filter(id => id !== team);
    const roster = [...teams[team].players].sort((a, b) => b.ovr - a.ovr);
    const outgoing = roster[0];
    const wanted = [...teams[partner].players].sort((a, b) => b.ovr - a.ovr)[0];
    const initial = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    localStorage.setItem(c.key, initial);
    render(<Board />);

    tile('Trades');
    click(partner);
    pick(outgoing);
    fireEvent.click(row('data-trade-row', wanted).getByRole('button', { name: 'Open talks' }));
    const before = talks()?.textContent;
    expect(before).toBeTruthy();
    click('Hub');
    tile('Trades');
    expect(talks()?.textContent).toBe(before);
    expect(localStorage.getItem(c.key)).toBe(initial);

    click('Hub');
    tile('Roster');
    const owned = row('data-roster-row', outgoing);
    fireEvent.click(owned.getByRole('button', { name: c.arm }));
    fireEvent.click(owned.getByRole('button', { name: c.confirm, exact: true }));
    const after = localStorage.getItem(c.key)!;
    const saved = JSON.parse(after).league.teams[team];
    expect(saved.players.length).toBe(roster.length - 1);
    expect(saved.releasedThisSeason).toEqual([outgoing.id]);
    click('Hub');
    tile('Trades');
    expect(talks()).toBeNull();
    expect(available().length).toBeGreaterThan(0);
    expect(available().every(button => (button as HTMLButtonElement).disabled)).toBe(true);

    click(alternate);
    pick(roster[1]);
    const nextWanted = [...teams[alternate].players].sort((a, b) => b.ovr - a.ovr)[0];
    fireEvent.click(row('data-trade-row', nextWanted).getByRole('button', { name: 'Open talks' }));
    expect(talks()).toBeTruthy();
    expect(localStorage.getItem(c.key)).toBe(after);
  }, 15_000);
}
