import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { initLeague, NFL_ROSTER_MIN, proposeTrade, tradeProbeCopy, tradeValue, type GmPlayer } from '@/lib/frontOffice';
import { findTrades } from '@/lib/tradeFinder';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const SAVE_KEY = 'front-office-save-v1';
function setup() {
  let seed = 7;
  const league = initLeague(() => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  });
  const [team, partner, otherPartner] = Object.keys(league.teams);
  const roster = [...league.teams[team].players].sort((a, b) => b.ovr - a.ovr);
  expect(roster.length).toBeGreaterThan(NFL_ROSTER_MIN);
  const initial = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(SAVE_KEY, initial);
  render(<FrontOfficeBoard />);
  return { league, team, partner, otherPartner, roster, initial };
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const tile = (name: string) => fireEvent.click(screen.getByText(name, { exact: true }));
const readSave = () => localStorage.getItem(SAVE_KEY)!;
const talks = () => document.querySelector('[data-trade-talks]');
const row = (attribute: string, player: GmPlayer) => {
  const element = document.querySelector<HTMLElement>(`[${attribute}="${player.id}"]`);
  expect(element, player.name).toBeTruthy();
  return within(element!);
};

function pickOutgoing(player: GmPlayer) {
  const button = screen.getAllByText(`${player.name} (${player.pos})`, { exact: true })
    .map(element => element.closest('button')).find(Boolean);
  expect(button).toBeTruthy();
  fireEvent.click(button!);
}
function startTalk(partner: string, outgoing: GmPlayer, wanted: GmPlayer) {
  click(partner);
  pickOutgoing(outgoing);
  fireEvent.click(row('data-trade-row', wanted).getByRole('button', { name: 'Open talks' }));
  expect(talks()).toBeTruthy();
}
function cut(player: GmPlayer) {
  click('Hub');
  tile('Roster');
  const playerRow = row('data-roster-row', player);
  fireEvent.click(playerRow.getByRole('button', { name: /Cut, / }));
  fireEvent.click(playerRow.getByRole('button', { name: 'Cut him' }));
  click('Hub');
  tile('Trades');
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('clears the missing outgoing player and reopens manual talks after a cut', () => {
  const { league, team, partner, otherPartner, roster, initial } = setup();
  const [outgoing, replacement] = roster;
  const wanted = [...league.teams[partner].players].sort((a, b) => a.ovr - b.ovr)[0];
  const random = vi.spyOn(Math, 'random');
  tile('Trades');
  startTalk(partner, outgoing, wanted);
  const card = talks()?.textContent;
  click('Hub');
  tile('Trades');
  expect(talks()?.textContent).toBe(card);
  expect(readSave()).toBe(initial);
  expect(random).not.toHaveBeenCalled();

  cut(outgoing);
  const afterCut = readSave();
  const savedTeam = JSON.parse(afterCut).league.teams[team];
  expect(savedTeam.players.length).toBe(roster.length - 1);
  expect(savedTeam.releasedThisSeason).toEqual([outgoing.id]);
  expect(savedTeam.deadCap[0].playerId).toBe(outgoing.id);
  expect(talks()).toBeNull();
  expect(row('data-trade-row', wanted).getByRole('button', { name: 'Open talks' })).toBeDisabled();

  startTalk(otherPartner, replacement, league.teams[otherPartner].players[0]);
  expect(readSave()).toBe(afterCut);
  expect(random).not.toHaveBeenCalled();
});

it('keeps a valid negotiation open after an unrelated roster cut', () => {
  const { league, team, partner, roster } = setup();
  const [outgoing, unrelated] = roster;
  const wanted = [...league.teams[partner].players].sort((a, b) => a.ovr - b.ovr)[0];
  tile('Trades');
  startTalk(partner, outgoing, wanted);
  const card = talks()?.textContent;
  cut(unrelated);

  const savedTeam = JSON.parse(readSave()).league.teams[team];
  expect(savedTeam.releasedThisSeason).toEqual([unrelated.id]);
  expect(talks()?.textContent).toBe(card);
  expect(screen.queryByRole('button', { name: 'Open talks' })).toBeNull();
  expect(talks()?.getAttribute('data-trade-phase')).toBe('agreed');

  click('Shake on it');
  const settled = JSON.parse(readSave()).league.teams[team];
  expect(settled.players.some((player: GmPlayer) => player.id === outgoing.id)).toBe(false);
  expect(settled.players.some((player: GmPlayer) => player.id === wanted.id)).toBe(true);
  expect(settled.players.length).toBe(roster.length - 1);
  expect(settled.deadCap).toEqual(savedTeam.deadCap);
});

it('clears talks if the wanted player joins through the Finder first', () => {
  const { league, team, roster } = setup();
  const finderOutgoing = roster[0];
  const negotiatingOutgoing = roster[1];
  const offer = findTrades(league.teams, team, finderOutgoing.id, league.cap, proposeTrade, tradeValue, { cloneTeam: tradeProbeCopy })[0];
  expect(offer).toBeTruthy();
  const wanted = league.teams[offer.teamId].players.find(player => player.id === offer.playerId)!;
  tile('Trades');
  startTalk(offer.teamId, negotiatingOutgoing, wanted);
  pickOutgoing(finderOutgoing);
  click('Shop him around the league');
  const accept = screen.getAllByRole('button', { name: 'Accept' })
    .find(button => button.parentElement?.textContent?.includes(`${offer.teamId} offer: ${wanted.name}`));
  expect(accept).toBeTruthy();
  fireEvent.click(accept!);

  const afterDeal = readSave();
  const saved = JSON.parse(afterDeal).league;
  expect(saved.teams[team].players.some((player: GmPlayer) => player.id === wanted.id)).toBe(true);
  expect(saved.teams[team].players.some((player: GmPlayer) => player.id === negotiatingOutgoing.id)).toBe(true);
  expect(saved.teams[offer.teamId].players.some((player: GmPlayer) => player.id === wanted.id)).toBe(false);
  expect(talks()).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Open talks' }).length).toBeGreaterThan(0);
  expect(readSave()).toBe(afterDeal);
});
