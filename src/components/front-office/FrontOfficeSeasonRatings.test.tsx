import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Board from '@/components/front-office/FrontOfficeBoard';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { aiWeeklyMoves, initLeague, injuryPass, reviewNflWeekRatings, runOffseason, simGame, type GmPlayer, type LeagueState } from '@/lib/frontOffice';
import { nflAwayHost } from '@/lib/nflGmCareer';
import { keyedRng } from '@/lib/keyedRng';
import { isFrontOfficeSave } from '@/lib/frontOfficeSave';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const opening = () => initLeague(keyedRng('week ratings schedule'), { depth: FO_DEPTH, userTeam: 'SEA' });
const everyone = (league: LeagueState) => [...Object.values(league.teams).flatMap(t => [...t.players, ...(t.practice ?? [])]), ...league.freeAgents];
const ratings = (league: LeagueState) => new Map(everyone(league).map(p => [p.id, p.ovr]));
const savedLeague = () => (JSON.parse(localStorage.getItem(KEY)!) as { league: LeagueState }).league;
const save = (league: LeagueState) => localStorage.setItem(KEY, JSON.stringify({
  league, myTeam: 'SEA', phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
}));

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

it('persists named rating gains and losses from Play Week on an older save', () => {
  const league = opening();
  const team = league.teams.SEA;
  team.players.forEach((p, i) => Object.assign(p, { age: i % 2 ? 32 : 23, ovr: 78, pot: 85 }));
  league.week = 4;
  save(league);
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('NFL rating UI'));
  render(<Board />);
  fireEvent.click(screen.getByText('This week'));
  let changes: [GmPlayer, number][] = [];
  let lastWeek = 0;
  const initial = new Map(team.players.map(p => [p.id, p.ovr]));
  let before = initial;
  for (let week = 4; week <= 7; week++) {
    fireEvent.click(screen.getByRole('button', { name: `Play Week ${week}` }));
    const updated = savedLeague().teams.SEA.players;
    changes = updated.filter(p => initial.has(p.id) && p.ovr !== before.get(p.id)).map(p => [p, p.ovr - before.get(p.id)!]);
    before = new Map(updated.map(p => [p.id, p.ovr]));
    if (changes.some(([, change]) => change === 1) && changes.some(([, change]) => change === -1)) {
      lastWeek = week;
      break;
    }
  }
  expect(lastWeek).toBeGreaterThanOrEqual(4);
  const raw = localStorage.getItem(KEY);
  const stored = JSON.parse(raw!);
  expect(isFrontOfficeSave(stored, 'NFL', 17)).toBe(true);
  const bad = structuredClone(stored);
  bad.league.ratingReview.changes[0][1] = 2;
  expect(isFrontOfficeSave(bad, 'NFL', 17)).toBe(false);
  cleanup();
  render(<Board />);
  fireEvent.click(screen.getByText('Roster', { exact: true }));
  fireEvent.click(screen.getByText('Rating changes', { exact: true }));
  const review = screen.getByRole('list', { name: 'Recent rating changes' });
  for (const [p, delta] of changes) expect(within(review).getByText(p.name).parentElement).toHaveTextContent(`${delta > 0 ? '+' : ''}${delta} OVR`);
  expect(localStorage.getItem(KEY)).toBe(raw);
});

it('updates all three personnel pools in an away season and carries those ratings through winter', () => {
  const league = opening();
  const young = league.teams.SEA.players[0], older = league.teams.KC.players[0];
  const practice = league.teams.SEA.practice![0], market = league.freeAgents[0];
  Object.assign(young, { age: 23, ovr: 78, pot: 79, years: 3 });
  Object.assign(older, { age: 33, ovr: 74, pot: 74, years: 3 });
  Object.assign(practice, { age: 23, ovr: 68, pot: 72 });
  Object.assign(market, { age: 30, ovr: 89, salary: 999 });
  const away = nflAwayHost('NONE');
  const rng = keyedRng('NFL year away');
  const firstWeek: LeagueState = JSON.parse(JSON.stringify(league));
  const firstRng = keyedRng('NFL year away');
  injuryPass(firstWeek.teams, firstRng);
  aiWeeklyMoves(firstWeek, '', firstRng);
  for (const fixture of firstWeek.schedule[0]) simGame(fixture, firstWeek.teams, firstRng);
  away.playRound(league, rng);
  expect(ratings(league)).toEqual(ratings(firstWeek));
  expect(rng()).toBe(firstRng());
  for (let week = 2; week <= 17; week++) {
    const previous = ratings(league);
    away.playRound(league, rng);
    for (const [id, ovr] of ratings(league)) expect(Math.abs(ovr - previous.get(id)!)).toBeLessThanOrEqual(1);
  }
  expect(young.ovr).toBe(79);
  expect(older.ovr).toBeLessThan(74);
  expect(practice.ovr).toBeGreaterThan(68);
  expect(market.ovr).toBe(88);
  const before = ratings(league);
  runOffseason(league, rng);
  for (const p of everyone(league)) if (before.has(p.id)) expect(p.ovr).toBe(before.get(p.id));
  expect(league.week).toBe(1);
  expect(market.age).toBe(31);
});

it('uses the same first veteran review after a signing and spends it only once', () => {
  const leave = opening();
  Object.assign(leave.freeAgents[0], { age: 30, ovr: 74 });
  const id = leave.freeAgents[0].id;
  const signed: LeagueState = JSON.parse(JSON.stringify(leave));
  signed.teams.SEA.players.push(signed.freeAgents.shift()!);
  let reviewedWeek = 0;
  for (let week = 4; week <= 7; week++) {
    leave.week = signed.week = week;
    reviewNflWeekRatings(leave);
    reviewNflWeekRatings(signed, 'SEA');
    expect(ratings(signed).get(id)).toBe(ratings(leave).get(id));
    if (ratings(leave).get(id) === 73) {
      reviewedWeek = week;
      const after = ratings(signed);
      reviewNflWeekRatings(signed, 'SEA');
      expect(ratings(signed)).toEqual(after);
      break;
    }
  }
  expect(reviewedWeek).toBeGreaterThanOrEqual(4);
});
