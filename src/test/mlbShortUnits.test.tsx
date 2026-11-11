import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { initMlbLeague, mlbRelease, mlbStrength, mlbStrengthUnits, mlbWinProb, simMlbRound } from '@/lib/mlbFrontOffice';
import { mlbDeskRoundOptions, openMlbDesk } from '@/lib/mlbGmDesk';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const SAVE_KEY = 'mlb-front-office-save-v1';
const rotationCuts = ['PJ Poulin', 'Jake Irvin', 'Connelly Early', 'Andrew Alvarez'];
function rng(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('shows a weaker rotation after the Nationals release four starters at the legal roster floor', () => {
  const league = initMlbLeague(rng(17));
  const team = league.teams.WSN;
  localStorage.setItem(SAVE_KEY, JSON.stringify({ league, myTeam: 'WSN', phase: 'hub', gm: openMlbDesk(league, 'WSN') }));
  const view = render(<MlbFrontOfficeBoard />);
  const strength = () => screen.getByText('Strength').querySelector('b')?.textContent;
  expect(strength()).toBe('83');
  fireEvent.click(screen.getByText('Roster'));
  const ratings = [];
  for (const name of rotationCuts) {
    const player = team.players.find(p => p.name === name)!;
    const row = within(view.container.querySelector(`[data-roster-row="${player.id}"]`) as HTMLElement);
    fireEvent.click(row.getByRole('button', { name: /^DFA,/ }));
    fireEvent.click(row.getByRole('button', { name: 'DFA him' }));
    ratings.push(strength());
  }
  expect(ratings).toEqual(['83', '83', '82', '79']);
  const bytes = localStorage.getItem(SAVE_KEY)!;
  const players = JSON.parse(bytes).league.teams.WSN.players as typeof team.players;
  expect(players).toHaveLength(22);
  expect(players.filter(p => p.pos === 'SP').map(p => p.name)).toEqual(['Cade Cavalli']);
  view.unmount();
  render(<MlbFrontOfficeBoard />);
  expect(strength()).toBe('79');
  expect(localStorage.getItem(SAVE_KEY)).toBe(bytes);
});

it.each([
  ['bats', 8, 0.55],
  ['rot', 3, 0.33],
  ['pen', 2, 0.12],
] as const)('uses the existing 62 replacement rating for missing %s in modern saves only', (unit, size, weight) => {
  const team = initMlbLeague(rng(17)).teams.WSN;
  const units = mlbStrengthUnits(team);
  const core = { ...team, players: [...units.bats, ...units.rot, ...units.pen] };
  const missing = units[unit].at(-1)!;
  const short = { ...core, players: core.players.map(p => p.id === missing.id ? { ...p, out: 1 } : p) };
  const empty = { ...core, players: core.players.filter(p => !units[unit].some(member => member.id === p.id)) };
  const mean = units[unit].reduce((sum, p) => sum + p.ovr, 0) / size;
  const fullStrength = mlbStrength(team);

  expect(mlbStrength(core)).toBe(fullStrength);
  expect(mlbStrength(short)).toBeCloseTo(fullStrength - weight * (missing.ovr - 62) / size, 10);
  expect(mlbStrength(empty)).toBeCloseTo(fullStrength - weight * (mean - 62), 10);
  const oldAverage = (mean * size - missing.ovr) / (size - 1);
  expect(mlbStrength({ ...short, depth: undefined })).toBeCloseTo(fullStrength + weight * (oldAverage - mean), 10);
});

it('uses the reduced strength in the odds and the same actual season round', () => {
  const intact = initMlbLeague(rng(17));
  const short = structuredClone(intact);
  const team = short.teams.WSN;
  for (const name of rotationCuts) {
    expect(mlbRelease(team, short.freeAgents, team.players.find(p => p.name === name)!.id)).toBe(true);
  }
  expect(mlbWinProb(team, short.teams.KCR)).toBeLessThan(mlbWinProb(intact.teams.WSN, intact.teams.KCR));
  const desk = openMlbDesk(intact, 'WSN');
  const a = simMlbRound(intact, 'WSN', rng(19), mlbDeskRoundOptions(desk, intact, 'WSN'));
  const b = simMlbRound(short, 'WSN', rng(19), mlbDeskRoundOptions(desk, short, 'WSN'));
  expect(a).toMatchObject({ myWins: 1, myLosses: 5 });
  expect(b).toMatchObject({ myWins: 0, myLosses: 6 });
  expect(b.notes).toEqual(a.notes);
});
