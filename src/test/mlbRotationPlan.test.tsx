import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { keyedRng } from '@/lib/keyedRng';
import {
  initMlbLeague, mlbLeagueSeeds, mlbRotationChoices, mlbStrength, mlbStrengthUnits, MLB_ROUNDS, setMlbRotationPlan, simMlbRound,
  runMlbPlayoffs, setMlbOctoberRotation, readMlbOctoberReceipt,
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

  it('allows the sixth starter to cover an IL slot without giving him the injury discount', () => {
    const start = smallLeague([92, 92, 92, 68, 65, 62]);
    let sawCover = false;
    for (let i = 0; i < 800; i++) {
      const played = plan(structuredClone(start));
      const usual = structuredClone(start);
      const seed = keyedRng('rotation depth control:' + i)();
      const draw = () => seed;
      const p = simMlbRound(played, team, draw);
      simMlbRound(usual, team, draw);
      const sixth = played.teams[team].players[13];
      expect(sixth.out).toBe(usual.teams[team].players[13].out);
      if (p.rotation && 'available' in p.rotation && p.rotation.available === 4 && sixth.out === 0) {
        const starters = mlbStrengthUnits(played.teams[team], 5).rot;
        expect(starters).toHaveLength(5);
        expect(starters.at(-1)?.id).toBe(sixth.id);
        const win = draw() < 1 / (1 + Math.pow(10, -(mlbStrength(played.teams[team], 5) - mlbStrength(played.teams.BOS)) / 25));
        expect(p.myWins).toBe(win ? 6 : 0);
        sawCover = true;
      }
    }
    expect(sawCover).toBe(true);
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

describe('MLB October starters', () => {
  const october = () => screen.getByRole('combobox', { name: 'October rotation' });
  const rates = [96, 84, 72];
  const contenders = (host: boolean, ratings = rates) => {
    const l = initMlbLeague(keyedRng('October ratings fixture'));
    l.round = MLB_ROUNDS;
    for (const [abbr, old] of Object.entries(l.teams)) {
      l.teams[abbr] = { ...controlledRoster(abbr, abbr === team ? ratings : [84, 84, 84]),
        wins: abbr === 'BOS' ? 97 : abbr === 'CLE' ? 92 : abbr === 'HOU' ? 91 : 10, losses: 0, picks: old.picks };
    }
    l.teams[team].wins = host ? 89 : 80;
    l.schedule![MLB_ROUNDS - 1] = Array(6).fill('NYY-BOS');
    l.teams.BAL.wins = host ? 80 : 89;
    l.teams.TBR.wins = host ? 76 : 86;
    return l;
  };

  it.each([true, false])('changes played games both ways using the same draws (home=%s)', host => {
    const start = contenders(host);
    const seeds = mlbLeagueSeeds(start, true);
    expect(seeds.indexOf(team)).toBe(host ? 3 : 5);
    const plain = structuredClone(start);
    const booked = setMlbOctoberRotation(start, team, true);
    expect(booked.octoberRotation).toEqual({ team, season: start.season });
    const queue = host ? [0.1, 0.1, 0.55, 0.1, 0.45, 0.9] : [0.45, 0.9, 0.46, 0.4];
    const play = (league: MlbLeague) => {
      let draw = 0;
      return runMlbPlayoffs(league, () => queue[draw++] ?? 0.1, undefined, team);
    };
    const usual = play(plain);
    const applied = play(booked);
    const row = applied.series.find(s => s.home === team || s.away === team)!;
    const baseline = usual.series.find(s => s.home === team || s.away === team)!;
    expect(row.name).toEqual(baseline.name);
    expect(row.home === team).toBe(host);
    expect(row.october?.games.map(g => [g.rating, g.won])).toEqual([[96, true], [84, true]]);
    expect([baseline.homeWins, baseline.awayWins]).toEqual([2, 1]);
    expect(baseline.winner).toBe(host ? team : baseline.home);
    expect(row.winner).toBe(team);
    expect(readMlbOctoberReceipt(row, team)).toEqual(row.october);
    expect(booked.octoberRotation).toBeUndefined();
    const receipt = row.october!;
    expect(readMlbOctoberReceipt({ ...row, october: { ...receipt, games: [{ ...receipt.games[0], won: false }, receipt.games[1]] } }, team)).toBeNull();
  });

  it('shows the exact loss tradeoff at the weaker third starter after the ace wins', () => {
    const fixture = contenders(true);
    const usual = structuredClone(fixture);
    const ace = setMlbOctoberRotation(fixture, team, true);
    const play = (league: MlbLeague) => {
      let i = 0;
      const rolls = [0.1, 0.1, 0.3, 0.8, 0.45, 0.9];
      return runMlbPlayoffs(league, () => rolls[i++] ?? 0.1, undefined, team).series.find(r => r.home === team || r.away === team)!;
    };
    const baseline = play(usual);
    const actual = play(ace);
    expect(actual.october?.games.map(g => [g.rating, g.won])).toEqual([[96, true], [84, false], [72, false]]);
    expect(actual.winner).not.toBe(team);
    expect(baseline.winner).toBe(team);
    expect(baseline.homeWins).toBe(2);
    expect(actual.homeWins).toBe(1);
  });

  it('emits only the normal playoff bytes if post-round injuries remove the third starter', () => {
    const booked = setMlbOctoberRotation(contenders(true), team, true);
    booked.teams[team].players.find(p => p.ovr === 72)!.out = 3;
    const plain = structuredClone(booked);
    delete plain.octoberRotation;
    const run = (lg: MlbLeague) => {
      let calls = 0;
      const r = keyedRng('October fallback proof');
      return { result: runMlbPlayoffs(lg, () => { calls++; return r(); }, undefined, team), calls };
    };
    expect(JSON.stringify(run(booked))).toBe(JSON.stringify(run(plain)));
    expect(booked.octoberRotation).toBeUndefined();
    expect(setMlbOctoberRotation({ ...plain, round: MLB_ROUNDS - 1 }, team, true).octoberRotation).toBeUndefined();
  });

  it('saves the October choice, then reloads actual starter names and results in the recap', () => {
    const league = contenders(true);
    localStorage.setItem(key, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, picksLeft: 0, draftClass: null }));
    let mounted = render(<MlbFrontOfficeBoard />);
    openRound();
    fireEvent.change(october(), { target: { value: 'ace' } });
    expect(read().league.octoberRotation).toEqual({ team, season: league.season });
    mounted.unmount();
    mounted = render(<MlbFrontOfficeBoard />);
    openRound();
    expect(october()).toHaveValue('ace');
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    fireEvent.click(screen.getByRole('button', { name: /Final stretch/ }));
    const result = read();
    const first = result.postseason.series.find((row: { october?: unknown }) => row.october);
    expect(first.october.games[0]).toEqual({ pitcher: 'NYY fixture 8', rating: 96, won: expect.any(Boolean) });
    expect(result.league.octoberRotation).toBeUndefined();
    expect(screen.getByRole('region', { name: 'October starters' })).toHaveTextContent('NYY fixture 8');
    mounted.unmount();
    render(<MlbFrontOfficeBoard />);
    expect(screen.getByRole('region', { name: 'October starters' })).toHaveTextContent('NYY fixture 8');
    expect(read()).toEqual(result);
  });
});
