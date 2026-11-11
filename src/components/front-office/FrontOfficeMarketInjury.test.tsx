import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Board from '@/components/front-office/FrontOfficeBoard';
import { loadNflCareerKit } from '@/components/front-office/nflCareerKitLoad';
import { initLeague, releasePlayer, runPlayoffs, type LeagueState } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const team = 'SEA';
const leagueFromSave = (): LeagueState => JSON.parse(localStorage.getItem(KEY)!).league;
const row = (attribute: string, id: string) => within(document.querySelector('[' + attribute + '="' + id + '"]') as HTMLElement);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const tile = (name: string) => fireEvent.click(screen.getByText(name));
function start(league: LeagueState, extra: object = {}) {
  localStorage.setItem(KEY, JSON.stringify({
    league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0, ...extra,
  }));
  render(<Board />);
}
beforeAll(async () => { await loadNflCareerKit(); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('counts played weeks towards an unsigned player’s injury before signing', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const league = initLeague();
  const own = league.teams[team].players[0];
  own.out = 3;
  const [early, late] = league.teams.KC.players;
  early.out = late.out = 3;
  early.salary = late.salary = 2;
  expect(releasePlayer(league.teams.KC, league.freeAgents, early.id)).toBe(true);
  expect(releasePlayer(league.teams.KC, league.freeAgents, late.id)).toBe(true);
  start(league);

  tile('Roster');
  fireEvent.click(row('data-roster-row', own.id).getByRole('button', { name: /^Cut,/ }));
  fireEvent.click(row('data-roster-row', own.id).getByRole('button', { name: 'Cut him' }));
  tile('Hub');
  tile('Free agency');
  expect(row('data-fa-row', own.id).getByRole('button', { name: 'Sign' })).toBeDisabled();
  expect(leagueFromSave().freeAgents.find(p => p.id === own.id)?.out).toBe(3);

  fireEvent.click(row('data-fa-row', early.id).getByRole('button', { name: 'Sign' }));
  expect(leagueFromSave().teams[team].players.find(p => p.id === early.id)?.out).toBe(3);
  tile('Hub');
  tile('This week');
  click('Play Week 1');
  click('Play Week 2');
  const played = leagueFromSave();
  expect(played.week).toBe(3);
  expect(played.teams[team].players.find(p => p.id === early.id)?.out).toBe(1);
  expect(played.freeAgents.find(p => p.id === own.id)?.out).toBe(1);
  expect(played.freeAgents.find(p => p.id === late.id)?.out).toBe(1);

  tile('Hub');
  tile('Free agency');
  fireEvent.click(row('data-fa-row', late.id).getByRole('button', { name: 'Sign' }));
  expect(leagueFromSave().teams[team].players.find(p => p.id === late.id)?.out).toBe(1);
  const bytes = localStorage.getItem(KEY);
  cleanup();
  render(<Board />);
  tile('Roster');
  expect(row('data-roster-row', late.id).getByText(/\(out 1w\)/)).toBeInTheDocument();
  expect(localStorage.getItem(KEY)).toBe(bytes);
}, 15000);

it('clears free-agent injuries when the league starts a new season', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const league = initLeague();
  for (const t of Object.values(league.teams)) {
    t.picks = [];
    for (const p of t.players) p.years = 3;
  }
  const player = league.freeAgents[0];
  Object.assign(player, { out: 3, ovr: 85 });
  league.week = 17;
  const postseason = runPlayoffs(league.teams, Math.random);
  league.champions.push({ season: league.season, team: postseason.champion });
  start(league, { phase: 'recap', postseason, seasonsPlayed: 1 });
  click('Go to the draft');
  click('Run the league draft and offseason');
  click('Continue to the hub');

  const after = leagueFromSave();
  expect(after.season).toBe(league.season + 1);
  expect(after.freeAgents.find(p => p.id === player.id)?.out).toBe(0);
}, 15000);
