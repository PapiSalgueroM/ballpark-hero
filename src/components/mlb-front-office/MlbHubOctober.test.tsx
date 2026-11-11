import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Board from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { AL, initMlbLeague, mlbLeagueSeeds, mlbStandings } from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'mlb-front-office-save-v1';
function seed(team: string, round: number) {
  const league = initMlbLeague(() => 0.25);
  league.round = round;
  if (round > 1) {
    const wins = {
      NYY: 66, BOS: 63, TOR: 61, TBR: 59, BAL: 56,
      HOU: 65, SEA: 62, TEX: 60, ATH: 55, LAA: 52,
      CHW: 43, CLE: 42, DET: 41, KCR: 40, MIN: 39,
    };
    for (const club of Object.values(league.teams)) {
      club.wins = wins[club.abbr] ?? 31;
      club.losses = 6 * (round - 1) - club.wins;
    }
  }
  localStorage.setItem(KEY, JSON.stringify({
    league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0,
    mandate: { tier: 'playoffs', text: 'Reach October.', reqLevel: 1, winFloor: 0, season: league.season },
  }));
  return league;
}
const standings = () => screen.getByRole('button', { name: /Standings/ });
afterEach(() => { cleanup(); localStorage.clear(); });

it('shows the division leader’s projected seed with its actual league record rank', () => {
  const league = seed('CHW', 21);
  expect(mlbLeagueSeeds(league, true)[2]).toBe('CHW');
  expect(mlbStandings(league, AL)[10].abbr).toBe('CHW');
  const bytes = localStorage.getItem(KEY);
  render(<Board />);
  expect(screen.getByText(/In the postseason picture/)).toBeInTheDocument();
  expect(standings()).toHaveTextContent('#11 in the AL');
  expect(standings()).toHaveTextContent('Projected seed #3');
  expect(standings().querySelector('.animate-pulse')).toBeNull();
  fireEvent.click(standings());
  expect(screen.getByText('AL Central')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Hub' }));
  expect(standings()).toHaveTextContent('Projected seed #3');
  expect(localStorage.getItem(KEY)).toBe(bytes);
});

it('warns a sixth-place team when division winners keep it out of the field', () => {
  const league = seed('TEX', 21);
  expect(mlbLeagueSeeds(league, true)).not.toContain('TEX');
  expect(mlbStandings(league, AL)[5].abbr).toBe('TEX');
  const bytes = localStorage.getItem(KEY);
  render(<Board />);
  expect(screen.getByText(/Outside the line right now/)).toBeInTheDocument();
  expect(standings()).toHaveTextContent('#6 in the AL');
  expect(standings()).toHaveTextContent('Outside playoff field');
  expect(standings().querySelector('.animate-pulse')).not.toBeNull();
  expect(localStorage.getItem(KEY)).toBe(bytes);
});

it('keeps the preseason hub quiet before the first round', () => {
  seed('CHW', 1);
  const bytes = localStorage.getItem(KEY);
  render(<Board />);
  expect(screen.queryByText(/In the postseason picture|Outside the line right now/)).toBeNull();
  expect(standings()).not.toHaveTextContent('Projected seed');
  expect(standings().querySelector('.animate-pulse')).toBeNull();
  expect(localStorage.getItem(KEY)).toBe(bytes);
});
