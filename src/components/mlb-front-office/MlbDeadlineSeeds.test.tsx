import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Board from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { AL, initMlbLeague, mlbLeagueSeeds, mlbStandings, NL, type MlbLeague } from '@/lib/mlbFrontOffice';
import { mlbStances, openMlbDesk } from '@/lib/mlbGmDesk';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'mlb-front-office-save-v1';
const TEAM = 'LAD';
const PARTNER = 'CHW';
function fixture() {
  const league = initMlbLeague(() => 0.25);
  league.round = 17;
  const wins = {
    NYY: 66, BOS: 63, TOR: 61, TBR: 59, BAL: 56,
    HOU: 65, SEA: 62, TEX: 60, ATH: 55, LAA: 52,
    CHW: 43, CLE: 42, DET: 41, KCR: 40, MIN: 39,
    NYM: 66, ATL: 63, PHI: 61, MIA: 59,
    LAD: 65, SDP: 62, SFG: 60, ARI: 55, COL: 52,
    MIL: 43, CHC: 42, CIN: 41, STL: 40, PIT: 39,
  };
  for (const team of Object.values(league.teams)) {
    team.wins = wins[team.abbr] ?? 31;
    team.losses = 96 - team.wins;
  }
  return league;
}
const saved = (): { league: MlbLeague } => JSON.parse(localStorage.getItem(KEY)!);
afterEach(() => { cleanup(); localStorage.clear(); });

it.each([[true, AL, PARTNER], [false, NL, 'MIL']] as const)('uses the October field for trade stances (AL: %s)', (al, group, divisionLeader) => {
  const league = fixture();
  expect(mlbStandings(league, group).slice(0, 6).map(t => t.abbr)).not.toContain(divisionLeader);
  const seeded = mlbLeagueSeeds(league, al);
  expect(seeded).toHaveLength(6);
  expect(seeded[2]).toBe(divisionLeader);
  const stances = mlbStances(league);
  for (const club of seeded) expect(stances[club], club).toBe('buyer');
  expect(stances[al ? 'MIN' : 'PIT']).toBe('seller');
});

it('keeps the preseason market neutral until clubs have played', () => {
  const stances = Object.values(mlbStances(initMlbLeague(() => 0.25)));
  expect(stances).toHaveLength(30);
  expect(stances.every(stance => stance === 'holding')).toBe(true);
});

it('prices a Trade Desk package as a buying division leader and saves the accepted swap', () => {
  const league = fixture();
  const mine = league.teams[TEAM].players.find(p => p.name === 'Will Smith')!;
  const theirs = league.teams[PARTNER].players.find(p => p.name === 'Kyle Teel')!;
  localStorage.setItem(KEY, JSON.stringify({
    league, myTeam: TEAM, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
    gm: openMlbDesk(league, TEAM),
  }));
  const original = localStorage.getItem(KEY);
  render(<Board />);
  fireEvent.click(screen.getByText('Trade desk'));
  const selector = screen.getByLabelText('Deal with');
  fireEvent.change(selector, { target: { value: PARTNER } });
  expect(within(selector).getByRole('option', { selected: true })).toHaveTextContent('White Sox (buying)');
  fireEvent.click(document.querySelector('[data-gm-tile="player:' + mine.id + '"]')!);
  fireEvent.click(document.querySelector('[data-gm-tile="player:' + theirs.id + '"]')!);
  const propose = screen.getByRole('button', { name: 'Make the trade' });
  expect(propose).toBeEnabled();
  expect(localStorage.getItem(KEY)).toBe(original);
  fireEvent.click(propose);
  const result = saved().league;
  expect(result.teams[TEAM].players).toContainEqual(theirs);
  expect(result.teams[PARTNER].players).toContainEqual(mine);
  expect(result.teams[TEAM].picks).toEqual(league.teams[TEAM].picks);
  expect(result.teams[PARTNER].picks).toEqual(league.teams[PARTNER].picks);
  const bytes = localStorage.getItem(KEY);
  cleanup();
  render(<Board />);
  expect(localStorage.getItem(KEY)).toBe(bytes);
}, 15000);
