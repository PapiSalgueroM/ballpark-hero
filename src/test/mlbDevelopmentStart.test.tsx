import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { keyedRng } from '@/lib/keyedRng';
import {
  initMlbLeague, mlbAiMoves, mlbDevelopmentChoices, mlbDevelopmentPlan, mlbDevelopmentPreview, mlbDevelopmentUsed, mlbStrength, setMlbDevelopmentStart, simMlbRound,
  MLB_ROUNDS, type MlbLeague, type MlbGmPlayer,
} from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'mlb-front-office-save-v1', team = 'NYY', prospect = team + '9';
const get = (league: MlbLeague, id = prospect) => league.teams[team].players.find(player => player.id === id)!;
const history = () => within(screen.getByRole('region', { name: 'Round results' }));
const pickRound = (round: number) => fireEvent.change(history().getByRole('combobox', { name: 'Played round' }), { target: { value: String(round) } });
const open = () => fireEvent.click(screen.getByRole('button', { name: /^🏟️/ }));
const play = (league: MlbLeague) => simMlbRound(league, team, () => 0.48);
const fixture = (): MlbLeague => {
  const club = (abbr: string) => {
    const positions = ['C', 'SS', '1B', '2B', 'OF', 'OF', 'OF', 'DH', 'OF', 'OF', 'SP', 'SP', 'SP', 'SP', 'SP', 'RP', 'RP'];
    const players: MlbGmPlayer[] = positions.map((pos, i) => {
      const young = abbr === team && i === 9;
      const ovr = young ? 62 : i === 8 || i === 9 ? 70 : 83;
      return { id: abbr + i, name: abbr + ' fixture ' + i, pos, age: young ? 21 : 28, ovr, pot: young ? 63 : ovr, salary: 2, years: 2, out: 0 };
    });
    return { abbr, players, wins: 0, losses: 0, picks: [], depth: 26 };
  };
  return { season: 2033, round: 1, cap: 244, teams: { NYY: club(team), BOS: club('BOS') }, champions: [], freeAgents: [],
    inSeasonRatings: true, schedule: Array.from({ length: MLB_ROUNDS }, () => Array(6).fill('NYY-BOS')) };
};
const mountedLeague = () => {
  const league = fixture();
  league.teams = { ...initMlbLeague(keyedRng('MLB development mounted league')).teams, ...league.teams };
  return league;
};
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('MLB bench development start', () => {
  it('uses the previewed replacement in the real batch and earns one point up to potential', () => {
    const usual = fixture(), choice = mlbDevelopmentChoices(usual, team)!;
    expect(choice.replaced.id).toBe(team + '7');
    expect(choice.eligible.map(player => player.id)).toEqual([prospect]);
    const lg = setMlbDevelopmentStart(structuredClone(usual), team, prospect);
    expect(mlbDevelopmentPlan(lg, team)?.replacedId).toBe(choice.replaced.id);
    expect(mlbDevelopmentPreview(lg, team)?.bats.map(player => player.id))
      .toEqual([...choice.bats.slice(0, -1).map(player => player.id), prospect]);
    const sameTeam = mlbStrength(usual.teams[team]), other = mlbStrength(usual.teams.BOS);
    const booked = sameTeam + (get(usual).ovr - choice.replaced.ovr) * 0.55 / 8;
    const prob = (strength: number) => 1 / (1 + Math.pow(10, -(strength - other) / 25));
    expect(prob(booked)).toBeLessThan(0.48);
    expect(prob(sameTeam)).toBeGreaterThan(0.48);
    expect(play(usual).myWins).toBe(6);
    const report = play(lg);
    expect(report.myWins).toBe(0);
    expect(report.myLosses).toBe(6);
    expect(report.development).toEqual({ player: 'NYY fixture 9', replaced: 'NYY fixture 7', before: 62, after: 63 });
    expect(get(lg).ovr).toBe(get(lg).pot);
    expect(mlbDevelopmentPlan(lg, team)).toBeNull();
    expect(mlbDevelopmentUsed(lg, team)).toBe(true);
    lg.round = 2;
    get(lg, team + '8').age = 21; get(lg, team + '8').pot = 76;
    expect(setMlbDevelopmentStart(lg, team, team + '8')).toBe(lg);
    lg.season += 1;
    expect(setMlbDevelopmentStart(lg, team, team + '8')).not.toBe(lg);
  });

  it.each([prospect, team + '7'])('keeps the opportunity when the expected pair changes before the batch (%s)', failed => {
    const lg = setMlbDevelopmentStart(fixture(), team, prospect);
    get(lg, failed).out = 3;
    const defaultLeague = setMlbDevelopmentStart(structuredClone(lg), team, '');
    const ordinary = play(defaultLeague), report = play(lg);
    expect(report).toEqual({ ...ordinary, development: { unavailable: true } });
    expect(JSON.stringify(lg)).toBe(JSON.stringify(defaultLeague));
    expect(mlbDevelopmentUsed(lg, team)).toBe(false);
  });

  it('counts a natural same-round gain once', () => {
    const lg = fixture();
    get(lg).pot = 89;
    const scheduled = Array.from({ length: MLB_ROUNDS }, (_, i) => i + 1).find(round => {
      const control = structuredClone(lg);
      control.round = round;
      play(control);
      return get(control).ovr === 63;
    })!;
    expect(scheduled).toBeDefined();
    lg.round = scheduled;
    const active = setMlbDevelopmentStart(structuredClone(lg), team, prospect);
    expect(play(active).development).toMatchObject({ before: 62, after: 63 });
    expect(get(active).ovr).toBe(63);
  });

  it('drops the booked batting change when an actual kickoff injury makes the selected hitter unavailable', () => {
    const initial = fixture();
    const prep = setMlbDevelopmentStart(structuredClone(initial), team, prospect);
    expect(mlbDevelopmentPreview(prep, team)?.player.id).toBe(prospect);
    let control: MlbLeague, injuryDraw: number;
    for (let i = 0; i < 500; i += 1) {
      const seed = keyedRng('MLB development kickoff injury:' + i)();
      const candidate = structuredClone(initial);
      let first = true;
      simMlbRound(candidate, team, () => { if (!first) return 0.48; first = false; return seed; });
      if (get(candidate).out === 0) continue;
      control = candidate;
      injuryDraw = seed;
      break;
    }
    expect(control).toBeDefined();
    let needsDraw = true;
    const report = simMlbRound(prep, team, () => { if (!needsDraw) return 0.48; needsDraw = false; return injuryDraw; });
    expect(report.development).toEqual({ unavailable: true });
    expect(JSON.stringify(prep)).toBe(JSON.stringify(control));
  });

  it('saves the selection, keeps the exact preview on reload, and reports the played result', () => {
    const league = mountedLeague();
    const initial = JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
    localStorage.setItem(key, initial);
    const picker = () => screen.getByRole('combobox', { name: 'Development start' });
    let view = render(<MlbFrontOfficeBoard />);
    open();
    expect(localStorage.getItem(key)).toBe(initial);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
    fireEvent.change(picker(), { target: { value: prospect } });
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save the development start');
    expect(localStorage.getItem(key)).toBe(initial);
    fireEvent.change(picker(), { target: { value: prospect } });
    expect(picker()).toHaveValue(prospect);
    expect(screen.getByText(/NYY fixture 9 replaces NYY fixture 7/)).toBeVisible();
    const accepted = localStorage.getItem(key);
    view.unmount();
    view = render(<MlbFrontOfficeBoard />);
    open();
    expect(picker()).toHaveValue(prospect);
    expect(localStorage.getItem(key)).toBe(accepted);
    vi.spyOn(Math, 'random').mockReturnValue(0.48);
    fireEvent.click(screen.getByRole('button', { name: 'Play Round 1' }));
    const completed = localStorage.getItem(key);
    const saved = JSON.parse(completed!);
    expect(saved.lastRound.wins).toBe(0);
    expect(saved.lastRound.development).toEqual({ player: 'NYY fixture 9', replaced: 'NYY fixture 7', before: 62, after: 63 });
    view.unmount();
    view = render(<MlbFrontOfficeBoard />);
    expect(screen.getByText(/NYY fixture 9 played in place of NYY fixture 7 and gained 1 OVR/)).toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(completed);
    open();
    const line = 'NYY fixture 9 played in place of NYY fixture 7 and gained 1 OVR (62 to 63).';
    expect(saved.roundHistory.rounds[0]).toMatchObject({ round: 1, wins: 0, losses: 6, changes: expect.arrayContaining([['NYY fixture 9', 1, 63]]), reports: [line] });
    expect(history().getByRole('listitem')).toHaveTextContent('NYY fixture 9 +1 OVR to 63');
    fireEvent.click(screen.getByRole('button', { name: 'Play Round 2' }));
    pickRound(1);
    expect(history().getByText('Won 0 · Lost 6')).toBeInTheDocument();
    expect(history().getByText(line)).toBeInTheDocument();
    expect(history().getByRole('listitem')).toHaveTextContent('NYY fixture 9 +1 OVR to 63');
    view.unmount();
  });

  it('keeps a legacy record and development line while marking complete ratings unknown, with exact new batch bytes', () => {
    const league = mountedLeague();
    league.round = 2;
    const planned = setMlbDevelopmentStart(league, team, prospect);
    const report = play(planned);
    planned.round = 3;
    localStorage.setItem(key, JSON.stringify({ league: planned, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0,
      draftClass: null, picksLeft: 0, lastRound: { team, season: league.season, round: 2,
        wins: report.myWins, losses: report.myLosses, development: report.development, notes: [] } }));
    const control = structuredClone(planned);
    let oldDraws = 0, newDraws = 0;
    const draws = () => { oldDraws += 1; return 0.48; };
    simMlbRound(control, team, draws);
    mlbAiMoves(control, team, draws);
    control.round += 1;
    const view = render(<MlbFrontOfficeBoard />);
    open();
    expect(history().getByText('Rating changes are unavailable for this round.')).toBeInTheDocument();
    vi.spyOn(Math, 'random').mockImplementation(() => { newDraws += 1; return 0.48; });
    fireEvent.click(screen.getByRole('button', { name: 'Play Round 3' }));
    const stored = localStorage.getItem(key);
    const reloaded = JSON.parse(stored!);
    expect(JSON.stringify(reloaded.league)).toBe(JSON.stringify(control));
    expect(newDraws).toBe(oldDraws);
    expect(reloaded.roundHistory.rounds[0]).toMatchObject({ round: 2, changes: null, reports: expect.any(Array) });
    expect(reloaded.roundHistory.rounds[1]).toMatchObject({ round: 3, changes: [] });
    expect(history().getByText('No rating changes this round.')).toBeInTheDocument();
    pickRound(1);
    expect(history().getByText('Results and rating changes are unavailable for this round.')).toBeInTheDocument();
    view.unmount();
    render(<MlbFrontOfficeBoard />);
    open();
    pickRound(2);
    expect(history().getByText('Rating changes are unavailable for this round.')).toBeInTheDocument();
    expect(history().getByText(/NYY fixture 9 played in place of NYY fixture 7/)).toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(stored);
  });
});
