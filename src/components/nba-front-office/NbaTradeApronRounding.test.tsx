import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Board from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { initNbaLeague, nbaCapUsed, nbaExecuteTalksTrade, nbaFirstApron, nbaSalaryFits, nbaTrade, type NbaLeague } from '@/lib/nbaFrontOffice';
import { nbaPackageCapCheck, nbaPileFits, openNbaDesk } from '@/lib/nbaGmDesk';
import type { TradePackage } from '@/lib/gmTradePackage';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'nba-front-office-save-v1';
const TEAM = 'HOU';
const PARTNER = 'DEN';
function openingLeague() {
  let seed = 7;
  return initNbaLeague(() => {
    seed = seed * 16807 % 2147483647;
    return (seed - 1) / 2147483646;
  });
}
function fixture(salary = 51.9) {
  const league = openingLeague();
  const mine = league.teams[TEAM];
  const other = league.teams[PARTNER];
  mine.players.find(p => p.name === 'Kevin Durant')!.salary = salary;
  const outgoing = mine.players.find(p => p.name === 'Fred VanVleet')!;
  const incoming = other.players.find(p => p.name === 'Aaron Gordon')!;
  const pkg: TradePackage = {
    from: TEAM, to: PARTNER,
    give: [{ kind: 'player', id: outgoing.id }],
    get: [{ kind: 'player', id: incoming.id }],
  };
  return { league, mine, other, outgoing, incoming, pkg };
}
const read = (): { league: NbaLeague } => JSON.parse(localStorage.getItem(KEY)!);
afterEach(() => { cleanup(); localStorage.clear(); });

it.each([[51.8, 236.3, true], [51.9, 236.4, true], [52, 236.5, false]] as const)(
  'applies matching at simulated salary %s and post-trade payroll %s', (salary, expectedPayroll, allowed) => {
    const { league, mine, other, outgoing, incoming, pkg } = fixture(salary);
    expect(nbaFirstApron(league.cap, league.taxScale)).toBe(236.4);
    expect(Math.round((nbaCapUsed(mine) - outgoing.salary + incoming.salary) * 10) / 10).toBe(expectedPayroll);
    expect(nbaSalaryFits(mine, outgoing, incoming, league.cap, league.taxScale)).toBe(allowed);
    expect(nbaPileFits(league, TEAM, outgoing.salary, incoming.salary)).toBe(allowed);
    expect(nbaPackageCapCheck(league, pkg)).toBe(allowed ? null : 'HOU would sit over the first apron, so it can take back no more salary than it sends out.');
    expect(nbaTrade(structuredClone(mine), structuredClone(other), outgoing.id, incoming.id, false, league.cap, league.taxScale)).toBe(allowed ? 'accepted' : 'invalid');
    expect(nbaExecuteTalksTrade(structuredClone(mine), structuredClone(other), outgoing.id, incoming.id, false, league.cap, league.taxScale)).toBe(allowed ? 'done' : 'invalid');
  },
);

it.each([[51.9, true], [52, false]] as const)('settles the Trade Desk package only when it fits (simulated salary %s)', (salary, allowed) => {
  const { league, outgoing, incoming } = fixture(salary);
  localStorage.setItem(KEY, JSON.stringify({
    league, myTeam: TEAM, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
    gm: openNbaDesk(league, TEAM),
  }));
  const original = localStorage.getItem(KEY);
  render(<Board />);
  fireEvent.click(screen.getByText('Trade desk'));
  fireEvent.change(screen.getByLabelText('Deal with'), { target: { value: PARTNER } });
  fireEvent.click(document.querySelector('[data-gm-tile="player:' + outgoing.id + '"]')!);
  fireEvent.click(document.querySelector('[data-gm-tile="player:' + incoming.id + '"]')!);
  const propose = screen.getByRole('button', { name: 'Make the trade' });
  expect(localStorage.getItem(KEY)).toBe(original);
  if (allowed) {
    expect(propose).toBeEnabled();
    fireEvent.click(propose);
    const settled = read().league;
    expect(nbaCapUsed(settled.teams[TEAM])).toBe(236.4);
    expect(settled.teams[TEAM].players).toContainEqual(incoming);
    expect(settled.teams[PARTNER].players).toContainEqual(outgoing);
    const bytes = localStorage.getItem(KEY);
    cleanup();
    render(<Board />);
    expect(localStorage.getItem(KEY)).toBe(bytes);
  } else {
    expect(propose).toBeDisabled();
    expect(screen.getByText(/HOU would sit over the first apron/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe(original);
  }
}, 15000);

it.each([[14.9, true], [15, false]] as const)('compares both above-apron package totals in tenths (Hauser salary %s)', (salary, allowed) => {
  const league = openingLeague();
  const mine = league.teams.DEN;
  const other = league.teams.BOS;
  const sending = ['Bruce Brown', 'Jonas Valanciunas'].map(name => mine.players.find(p => p.name === name)!);
  const receiving = ['Baylor Scheierman', 'Sam Hauser'].map(name => other.players.find(p => p.name === name)!);
  if (!allowed) receiving[1].salary = salary;
  const sendingSalary = sending.reduce((sum, player) => sum + player.salary, 0);
  const receivingSalary = receiving.reduce((sum, player) => sum + player.salary, 0);
  expect(nbaCapUsed(mine)).toBeGreaterThan(nbaFirstApron(league.cap, league.taxScale));
  expect(sendingSalary).toBe(27.7);
  expect(receivingSalary).toBeGreaterThan(sendingSalary);
  expect(Math.round(receivingSalary * 10) / 10).toBe(allowed ? 27.7 : 27.8);

  localStorage.setItem(KEY, JSON.stringify({
    league, myTeam: 'DEN', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
    gm: openNbaDesk(league, 'DEN'),
  }));
  const original = localStorage.getItem(KEY);
  render(<Board />);
  fireEvent.click(screen.getByText('Trade desk'));
  fireEvent.change(screen.getByLabelText('Deal with'), { target: { value: 'BOS' } });
  for (const player of [...sending, ...receiving]) {
    fireEvent.click(document.querySelector('[data-gm-tile="player:' + player.id + '"]')!);
  }
  const propose = screen.getByRole('button', { name: 'Make the trade' });
  expect(localStorage.getItem(KEY)).toBe(original);
  if (allowed) {
    expect(propose).toBeEnabled();
    fireEvent.click(propose);
    const settled = read().league;
    expect(nbaCapUsed(settled.teams.DEN)).toBe(nbaCapUsed(mine));
    expect(settled.teams.DEN.players).toEqual(expect.arrayContaining(receiving));
    expect(settled.teams.BOS.players).toEqual(expect.arrayContaining(sending));
    expect(settled.teams.DEN.picks).toEqual(mine.picks);
    const bytes = localStorage.getItem(KEY);
    cleanup();
    render(<Board />);
    expect(localStorage.getItem(KEY)).toBe(bytes);
  } else {
    expect(propose).toBeDisabled();
    expect(screen.getByText(/DEN would sit over the first apron/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe(original);
  }
}, 15000);
