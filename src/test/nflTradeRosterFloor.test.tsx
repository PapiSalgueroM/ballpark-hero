import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import {
  executeTalksTrade, initLeague, NFL_ROSTER_MIN, proposeTrade, releasePlayer, tradeProbeCopy, tradeValue,
  type LeagueState,
} from '@/lib/frontOffice';
import { mulberry32 } from '@/lib/leagueCore';
import { nflPackageCapCheck, openNflDesk } from '@/lib/nflGmDesk';
import { findTrades } from '@/lib/tradeFinder';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const USER = 'DAL';
const RIVAL = 'PHI';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function floorLeague() {
  const league = initLeague(mulberry32(17), { depth: FO_DEPTH, userTeam: USER });
  const gm = openNflDesk(league, USER);
  const mine = league.teams[USER];
  const theirs = league.teams[RIVAL];
  const trim = (team: typeof mine) => {
    const ordered = [...team.players].sort((a, b) => tradeValue(b) - tradeValue(a));
    for (const p of ordered.slice(NFL_ROSTER_MIN + 1)) {
      expect(releasePlayer(team, league.freeAgents, p.id)).toBe(true);
    }
    return ordered;
  };
  const mineOrder = trim(mine), theirOrder = trim(theirs);
  const sent = mineOrder[0];
  const legal = theirs.players.find(p => proposeTrade(tradeProbeCopy(mine), tradeProbeCopy(theirs), sent.id, p.id, false, league.cap) === 'accepted'
    && !nflPackageCapCheck(league, { from: USER, to: RIVAL, give: [{ kind: 'player', id: sent.id }], get: [{ kind: 'player', id: p.id }] }))!;
  expect(legal).toBeTruthy();
  expect(releasePlayer(mine, league.freeAgents, mineOrder[NFL_ROSTER_MIN].id)).toBe(true);
  const otherCut = theirOrder.slice(0, NFL_ROSTER_MIN + 1).reverse().find(p => p.id !== legal.id)!;
  expect(releasePlayer(theirs, league.freeAgents, otherCut.id)).toBe(true);
  return { league, gm, sent, legal };
}

const readLeague = (): LeagueState => JSON.parse(localStorage.getItem(KEY)!).league;
afterEach(() => { cleanup(); localStorage.clear(); });

async function openAtFloor() {
  const fixture = floorLeague();
  const { league, gm, sent } = fixture;
  localStorage.setItem(KEY, JSON.stringify({ league, gm, myTeam: USER, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
  render(<FrontOfficeBoard />);
  fireEvent.click(await screen.findByText('Trades'));
  fireEvent.click(screen.getByText(`${sent.name} (${sent.pos})`, { exact: true }));
  return fixture;
}

it('shows and completes a Finder swap after legal cuts reach six', async () => {
  const { league, sent } = await openAtFloor();
  const before = localStorage.getItem(KEY);
  fireEvent.click(screen.getByRole('button', { name: 'Shop him around the league' }));
  expect(localStorage.getItem(KEY)).toBe(before);
  const accept = screen.getAllByRole('button', { name: 'Accept' })[0];
  const [offer] = findTrades(league.teams, USER, sent.id, league.cap, proposeTrade, tradeValue, { cloneTeam: tradeProbeCopy })
    .filter(o => !nflPackageCapCheck(league, { from: USER, to: o.teamId, give: [{ kind: 'player', id: sent.id }], get: [{ kind: 'player', id: o.playerId }] }));
  expect(offer).toBeTruthy();
  fireEvent.click(accept);
  const after = readLeague();
  expect(after.teams[USER].players).toHaveLength(NFL_ROSTER_MIN);
  expect(after.teams[offer.teamId].players).toHaveLength(league.teams[offer.teamId].players.length);
  expect(after.teams[USER].players.some(p => p.id === offer.playerId)).toBe(true);
  expect(after.teams[offer.teamId].players.some(p => p.id === sent.id)).toBe(true);
});

it('completes agreed one-for-one talks when both clubs have six players', async () => {
  const { league, sent, legal } = await openAtFloor();
  fireEvent.click(screen.getByRole('button', { name: RIVAL }));
  const target = document.querySelector<HTMLElement>(`[data-trade-row="${legal.id}"]`)!;
  fireEvent.click(within(target).getByRole('button', { name: 'Open talks' }));
  fireEvent.click(screen.getByRole('button', { name: 'Shake on it' }));
  const after = readLeague();
  expect(after.teams[USER].players.map(p => p.id)).toEqual([...league.teams[USER].players.filter(p => p.id !== sent.id).map(p => p.id), legal.id]);
  expect(after.teams[RIVAL].players.map(p => p.id)).toEqual([...league.teams[RIVAL].players.filter(p => p.id !== legal.id).map(p => p.id), sent.id]);
  expect(after.teams[USER].picks).toEqual(league.teams[USER].picks);
  expect(after.teams[RIVAL].picks).toEqual(league.teams[RIVAL].picks);
});

it.each([USER, RIVAL])('still rejects both trade paths when %s is already below six', below => {
  const { league, sent, legal } = floorLeague();
  const short = league.teams[below];
  const removed = short.players.find(p => p.id !== sent.id && p.id !== legal.id)!;
  short.players = short.players.filter(p => p.id !== removed.id);
  const original = clone(league);
  expect(proposeTrade(league.teams[USER], league.teams[RIVAL], sent.id, legal.id, false, league.cap)).toBe('invalid');
  expect(executeTalksTrade(league.teams[USER], league.teams[RIVAL], sent.id, legal.id, false, league.cap)).toBe('invalid');
  expect(league).toEqual(original);
});
