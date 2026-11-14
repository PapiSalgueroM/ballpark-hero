import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Board from '@/components/front-office/FrontOfficeBoard';
import { loadNflCareerKit } from '@/components/front-office/nflCareerKitLoad';
import { initLeague, runPlayoffs, type LeagueState } from '@/lib/frontOffice';
import { openNflDesk } from '@/lib/nflGmDesk';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const SAVE_KEY = 'front-office-save-v1';
const saved = (): { league: LeagueState } => JSON.parse(localStorage.getItem(SAVE_KEY)!);
beforeAll(async () => { await loadNflCareerKit(); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it.each([false, true])('ages contract departures once (GM desk: %s)', deskOn => {
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const league = initLeague();
  for (const team of Object.values(league.teams)) {
    team.picks = [];
    for (const player of team.players) player.years = 3;
  }
  const rival = league.teams.KC.players[0];
  Object.assign(rival, { age: 30, years: 1, ovr: 75 });
  const incumbent = league.freeAgents[0];
  Object.assign(incumbent, { age: 30, ovr: 82 });
  const own = league.teams.SEA.players[0];
  Object.assign(own, { age: 30, years: 1, ovr: 71 });
  league.week = 17;
  const postseason = runPlayoffs(league.teams, Math.random);
  league.champions.push({ season: league.season, team: postseason.champion });
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    league, myTeam: 'SEA', phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, postseason,
    ...(deskOn ? { gm: openNflDesk(league, 'SEA') } : {}),
  }));
  render(<Board />);

  fireEvent.click(screen.getByRole('button', { name: 'Go to the draft' }));
  fireEvent.click(screen.getByRole('button', { name: 'Run the league draft and offseason' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue to the hub' }));

  const bytes = localStorage.getItem(SAVE_KEY);
  const settled = saved().league;
  expect(settled.season).toBe(league.season + 1);
  expect(settled.teams.KC.players.some(p => p.id === rival.id)).toBe(false);
  expect(settled.freeAgents.find(p => p.id === incumbent.id)).toMatchObject({ age: 31, ovr: 82 });
  expect(settled.freeAgents.find(p => p.id === own.id)).toMatchObject({ age: 31, ovr: 71 });
  expect(settled.freeAgents.find(p => p.id === rival.id)).toMatchObject({ age: 31, ovr: 75 });
  cleanup();
  render(<Board />);
  fireEvent.click(screen.getByRole('button', { name: /Free agency/i }));
  expect(document.querySelector('[data-fa-row="' + rival.id + '"]')).toHaveTextContent('31y');
  expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
}, 15000);
