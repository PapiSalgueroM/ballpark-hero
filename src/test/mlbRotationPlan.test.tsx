import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { keyedRng } from '@/lib/keyedRng';
import {
  initMlbLeague, mlbRotationChoices, MLB_ROUNDS, setMlbRotationPlan, simMlbRound,
  type MlbGmPlayer, type MlbLeague,
} from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'mlb-front-office-save-v1';
const team = 'NYY';
const plan = (league: MlbLeague) => setMlbRotationPlan(league, team, true);
const pitching = () => screen.getByRole('combobox', { name: /Pitching plan for Round/ });
const openRound = () => fireEvent.click(screen.getByRole('button', { name: /^🏟️/ }));
const read = () => JSON.parse(localStorage.getItem(key)!);

function controlledRoster(abbr: string, ratings: number[]) {
  const positions = ['C', 'SS', '1B', '2B', 'OF', 'OF', 'OF', 'DH', ...ratings.map(() => 'SP'), 'RP', 'RP'];
  const players: MlbGmPlayer[] = positions.map((pos, index) => {
    const ovr = pos === 'SP' ? ratings[index - 8] : 83;
    return { id: abbr + index, name: abbr + ' fixture ' + index, pos, age: 29, ovr, pot: ovr, salary: 2, years: 2, out: 0 };
  });
  return { abbr, wins: 0, losses: 0, picks: [], depth: 26, players };
}

function smallLeague(ratings: number[]): MlbLeague {
  return { season: 2030, round: 1, cap: 244, teams: { NYY: controlledRoster(team, ratings),
    BOS: controlledRoster('BOS', [88, 88, 88, 88, 88]) },
  champions: [], freeAgents: [], schedule: [[...Array(6).fill('NYY-BOS')]] };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('MLB rotation workload', () => {
  it.each([
    ['deep', [92, 92, 92, 91, 91], 0.132, 45],
    ['top heavy', [92, 92, 92, 68, 65], 3.366, 370],
  ] as const)('measures the strength cost and injury reduction with a %s rotation', (_label, ratings, cost, winThreshold) => {
    const start = smallLeague([...ratings]);
    const choice = mlbRotationChoices(start, team)!;
    expect(choice.usual - choice.protected).toBeCloseTo(cost, 6);
    const baselineOut = { rotation: 0, wins: 0 }, protectedOut = { rotation: 0, wins: 0 };
    for (let i = 0; i < 1600; i++) {
      const usual = structuredClone(start), protectedRound = plan(structuredClone(start));
      const run = (league: MlbLeague) => {
        const rng = keyedRng('paired workload:' + i);
        let draws = 0;
        const report = simMlbRound(league, team, () => { draws += 1; return rng(); });
        return { report, draws };
      };
      const a = run(usual), b = run(protectedRound);
      expect(b.draws).toBe(a.draws);
      expect(a.report.myWins + a.report.myLosses).toBe(6);
      expect(b.report.myWins + b.report.myLosses).toBe(6);
      expect(protectedRound.rotationPlan).toBeUndefined();
      const mine = (lg: MlbLeague) => lg.teams[team].players.filter(p => p.pos === 'SP' && p.out > 0).length;
      baselineOut.rotation += mine(usual);
      protectedOut.rotation += mine(protectedRound);
      baselineOut.wins += a.report.myWins;
      protectedOut.wins += b.report.myWins;
      expect(b.report.rotation).toEqual({ available: 5 - mine(protectedRound) });
      expect(protectedRound.teams.BOS.players).toEqual(usual.teams.BOS.players);
      expect(protectedRound.teams[team].players.filter(p => p.pos !== 'SP')).toEqual(usual.teams[team].players.filter(p => p.pos !== 'SP'));
    }
    expect(baselineOut.rotation).toBeGreaterThan(170);
    expect(protectedOut.rotation / baselineOut.rotation).toBeLessThan(0.72);
    if (cost < 1) expect(Math.abs(baselineOut.wins - protectedOut.wins)).toBeLessThan(winThreshold);
    else expect(baselineOut.wins - protectedOut.wins).toBeGreaterThan(winThreshold);
  });

  it('uses the usual plan if the saved choice no longer has five healthy starters', () => {
    const signed = plan(smallLeague([92, 92, 92, 80, 80]));
    signed.teams[team].players.at(-3)!.out = 3;
    const usual = setMlbRotationPlan(structuredClone(signed), team, false);
    expect(mlbRotationChoices(signed, team)).toBeNull();
    const a = simMlbRound(usual, team, keyedRng('unsupported rotation'));
    const b = simMlbRound(signed, team, keyedRng('unsupported rotation'));
    expect(b).toEqual({ ...a, rotation: { unavailable: true } });
    expect(signed).toEqual(usual);
  });

  it.each([1, MLB_ROUNDS])('persists and consumes the choice, then restores the actual Round %d receipt', round => {
    const league = initMlbLeague(keyedRng('mounted rotation'));
    league.round = round;
    for (const p of league.teams[team].players) p.out = 0;
    const prior = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    localStorage.setItem(key, prior);
    let view = render(<MlbFrontOfficeBoard />);
    openRound();
    expect(localStorage.getItem(key)).toBe(prior);
    expect(pitching()).toHaveValue('usual');
    fireEvent.change(pitching(), { target: { value: 'protect' } });
    expect(read().league.rotationPlan).toEqual({ team, season: league.season, round });
    view.unmount();
    view = render(<MlbFrontOfficeBoard />);
    openRound();
    expect(pitching()).toHaveValue('protect');
    vi.spyOn(Math, 'random').mockImplementation(keyedRng('play protected'));
    fireEvent.click(screen.getByRole('button', { name: round === MLB_ROUNDS ? /Final stretch/ : /Play Round 1/ }));
    const result = read();
    expect(result.league.rotationPlan).toBeUndefined();
    expect(result.lastRound.rotation).toEqual({ available: expect.any(Number) });
    expect(result.lastRound.wins + result.lastRound.losses).toBe(6);
    const receipt = new RegExp('Protected rotation: ' + result.lastRound.rotation.available + ' of 5');
    expect(screen.getAllByText(receipt).length).toBeGreaterThan(0);
    view.unmount();
    render(<MlbFrontOfficeBoard />);
    expect(screen.getAllByText(receipt).length).toBeGreaterThan(0);
    expect(read()).toEqual(result);
  });
});
