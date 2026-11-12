import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NBA_OPENING_RATINGS } from '@/data/nbaOpeningRatings';
import { initNbaLeague, nbaSalaryFits, nbaTradeValue, type NbaLeague } from '@/lib/nbaFrontOffice';
import { openNbaDesk } from '@/lib/nbaGmDesk';
import NbaFrontOfficeBoard from './NbaFrontOfficeBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const key = 'nba-front-office-save-v1';
const club = 'DEN';

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

function startTrade(partner: string, player: string) {
  let seed = 11;
  const league = initNbaLeague(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }, NBA_OPENING_RATINGS);
  const save = {
    league, myTeam: club, phase: 'hub', titles: 0, seasonsPlayed: 0,
    draftClass: null, picksLeft: 0, gm: openNbaDesk(league, club),
  };
  localStorage.setItem(key, JSON.stringify(save));
  render(<NbaFrontOfficeBoard />);
  fireEvent.click(screen.getByText('Trades'));
  fireEvent.click(screen.getByRole('button', { name: partner, exact: true }));
  const sends = document.querySelector<HTMLElement>('[data-trade-send-list]')!;
  fireEvent.click(within(sends).getByRole('button', { name: new RegExp(player) }));
  const mine = league.teams[club];
  const theirs = league.teams[partner];
  const send = mine.players.find(p => p.name === player)!;
  const candidate = (name: string) => theirs.players.find(p => p.name === name)!;
  const fits = (name: string) => {
    const incoming = candidate(name);
    return nbaSalaryFits(mine, send, incoming, league.cap, league.taxScale)
      && nbaSalaryFits(theirs, incoming, send, league.cap, league.taxScale);
  };
  const row = (name: string) => within(document.querySelector<HTMLElement>('[data-trade-row="' + candidate(name).id + '"]')!);
  const open = (name: string) => fireEvent.click(row(name).getByRole('button', { name: 'Open talks' }));
  return { send, candidate, fits, open, row };
}

const savedLeague = (): NbaLeague => JSON.parse(localStorage.getItem(key)!).league;

it('blocks a salary-invalid handshake and lets the same player make a legal deal', () => {
  const { send, candidate, fits, open, row } = startTrade('BOS', 'Bruce Brown');
  const impossible = 'Derrick White';
  const legal = 'Baylor Scheierman';
  expect(nbaTradeValue(send)).toBeGreaterThanOrEqual(nbaTradeValue(candidate(impossible)) * 1.07);
  expect(fits(impossible)).toBe(false);
  expect(fits(legal)).toBe(true);
  const before = localStorage.getItem(key);
  open(impossible);
  expect(screen.queryByRole('button', { name: 'Shake on it' })).not.toBeInTheDocument();
  expect(row(impossible).getByText(/Those salaries do not fit the cap rules/)).toBeInTheDocument();
  expect(row(impossible).getByRole('button', { name: 'Open talks' })).toBeDisabled();
  expect(localStorage.getItem(key)).toBe(before);

  const arrived = candidate(legal).id;
  open(legal);
  fireEvent.click(screen.getByRole('button', { name: 'Shake on it' }));
  expect(savedLeague().teams[club].players.some(p => p.id === arrived)).toBe(true);
  expect(savedLeague().teams.BOS.players.some(p => p.id === send.id)).toBe(true);
});

it('offers a cap-legal alternative when the most valuable counter does not fit', () => {
  const { candidate, fits, open } = startTrade('MIN', 'Aaron Gordon');
  expect(fits('Julius Randle')).toBe(true);
  expect(fits('Joan Beringer')).toBe(false);
  expect(fits('Naz Reid')).toBe(true);
  open('Julius Randle');
  const card = document.querySelector<HTMLElement>('[data-trade-talks]')!;
  expect(within(card).getByText(/They would move Naz Reid/)).toBeInTheDocument();
  const arrived = candidate('Naz Reid').id;
  fireEvent.click(within(card).getByRole('button', { name: 'Take the deal' }));
  expect(savedLeague().teams[club].players.some(p => p.id === arrived)).toBe(true);
});
