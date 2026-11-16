import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';
import { mlbNoteArrivals, openMlbDesk } from '@/lib/mlbGmDesk';
import { keyedRng } from '@/lib/keyedRng';
import {
  initMlbLeague, mlbActivePlayers, mlbCapUsed, mlbDraftClass, mlbFarmChoice, mlbMoveFarmPlayer,
  mlbOffseason, mlbOverLimit, mlbSimReads, mlbStrength, mlbStrengthUnits, mlbWinProb,
  MLB_ROUNDS, simMlbRound, type MlbGmPlayer, type MlbLeague,
} from '@/lib/mlbFrontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const key = 'mlb-front-office-save-v1';
const team = 'ARI';
const saved = (): { league: MlbLeague; lastRound?: { wins: number; losses: number } } => JSON.parse(localStorage.getItem(key)!);
const saveLeague = (league: MlbLeague) => localStorage.setItem(key, JSON.stringify({ ...saved(), league }));
const own = (league: MlbLeague, id: string) => league.teams[team].players.find(p => p.id === id)!;
const option = (p: MlbGmPlayer) => screen.getByRole('button', { name: 'Option ' + p.name + ' to Triple-A' });
const recall = (p: MlbGmPlayer) => screen.getByRole('button', { name: 'Recall ' + p.name });
const roster = () => fireEvent.click(screen.getByText('Roster'));
const play = (round: number) => {
  fireEvent.click(screen.getByRole('button', { name: /^🏟️/ }));
  return screen.getByRole('button', { name: 'Play Round ' + round });
};
const reload = () => { cleanup(); render(<MlbFrontOfficeBoard />); };
const rowFor = (p: MlbGmPlayer) => within(document.querySelector<HTMLElement>('[data-roster-row="' + p.id + '"]')!);

function draftRookie(pos: string = 'SP') {
  const league = initMlbLeague(keyedRng('farm fixture'));
  const club = league.teams[team];
  league.round = MLB_ROUNDS;
  club.picks = [2];
  club.players.forEach((player, i) => {
    Object.assign(player, { name: 'Home player ' + i, age: 29, years: 3 });
  });
  for (let i = club.players.length; i < 28; i++) {
    club.players.push({ ...club.players[0], id: 'extra-' + i, name: 'Preseason depth ' + i });
  }
  const draftClass = mlbDraftClass(keyedRng('farm prospect'));
  Object.assign(draftClass[0], { name: 'Fictional Farm Rookie', pos, trueOvr: 87, age: 20 });
  localStorage.setItem(key, JSON.stringify({ league, myTeam: team, phase: 'draft', titles: 0, seasonsPlayed: 1,
    draftClass, picksLeft: 1, draftBatchesLeft: 1, trust: 70 }));
  vi.spyOn(Math, 'random').mockImplementation(keyedRng('farm draft and summer'));
  render(<MlbFrontOfficeBoard />);
  fireEvent.click(screen.getByRole('button', { name: /^Fictional Farm Rookie / }));
  const player = saved().league.teams[team].players.find(p => p.name === draftClass[0].name)!;
  reload();
  roster();
  return player;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('MLB Front Office Triple-A options', () => {
  it('clears preseason with a real draft pick optioned and keeps his full contract after reload', () => {
    const rookie = draftRookie();
    const before = saved().league;
    expect(before.teams[team].players).toHaveLength(29);
    expect(rookie.draftedBy).toEqual({ team, season: before.season - 1 });
    expect(mlbOverLimit(before.teams[team])).toBe(1);
    expect(mlbSimReads(before.teams[team])).toContain(rookie.id);
    expect(rowFor(before.teams[team].players[0]).queryByRole('button', { name: /Triple-A/ })).toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
    fireEvent.click(option(rookie));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save the Triple-A move.');
    expect(saved().league).toEqual(before);
    expect(option(rookie)).toBeEnabled();
    fireEvent.click(option(rookie));

    const after = saved().league;
    expect(own(after, rookie.id)).toMatchObject(rookie);
    expect(mlbOverLimit(after.teams[team])).toBe(0);
    expect(mlbCapUsed(after.teams[team])).toBe(mlbCapUsed(before.teams[team]));
    expect(after.teams[team].deadCap).toEqual(before.teams[team].deadCap);
    expect(after.freeAgents).toEqual(before.freeAgents);
    expect(mlbSimReads(after.teams[team])).not.toContain(rookie.id);

    reload();
    roster();
    expect(screen.getByText(/28 active.*1 in Triple-A/)).toBeInTheDocument();
    expect(recall(rookie)).toBeDisabled();
    expect(rowFor(rookie).getByText('Open an active roster spot before recalling him.')).toBeInTheDocument();
    reload();
    expect(play(1)).toBeEnabled();
  });

  it('offers current options to a prior draft pick recorded by the existing re-sign desk', () => {
    const rookie = draftRookie();
    const state = saved(), league = state.league;
    delete own(league, rookie.id).draftedBy;
    const gm = mlbNoteArrivals(openMlbDesk(league, team), { ...league, season: league.season - 1 }, team, [rookie.id], 'draft', 2);
    const raw = JSON.stringify({ ...state, gm });
    localStorage.setItem(key, raw);
    reload();
    roster();
    expect(localStorage.getItem(key)).toBe(raw);
    fireEvent.click(option(rookie));
    expect(own(saved().league, rookie.id).draftedBy).toEqual({ team, season: league.season - 1 });
    expect(mlbOverLimit(saved().league.teams[team])).toBe(0);
  });

  it.each([['OF', 3], ['SP', 4]] as const)('%s regular recall waits until Round %i and carries the option through rollover', (pos, ready) => {
    const rookie = draftRookie(pos);
    fireEvent.click(option(rookie));
    const league = saved().league;
    const club = league.teams[team];
    club.players = club.players.filter(p => p.id !== 'extra-27');
    const player = own(league, rookie.id);
    league.round = ready - 1;
    expect(mlbFarmChoice(league, team, player)?.reason).toContain('Recall from Round ' + ready);
    expect(mlbMoveFarmPlayer(league, team, rookie.id, 'recall')).toBe(false);
    league.round = ready;
    const recalled = structuredClone(league);
    expect(mlbMoveFarmPlayer(recalled, team, rookie.id, 'recall')).toBe(true);
    expect(own(recalled, rookie.id).farmAssignment?.recalled?.coverage).toBeUndefined();
    expect(mlbMoveFarmPlayer(recalled, team, rookie.id, 'recall')).toBe(false);

    const sameContract = { id: player.id, name: player.name, salary: player.salary, years: player.years - 1 };
    const sameAssignment = structuredClone(player.farmAssignment);
    mlbOffseason(league, keyedRng('farm rollover'), team);
    expect(own(league, rookie.id)).toMatchObject(sameContract);
    expect(own(league, rookie.id).farmAssignment).toEqual(sameAssignment);
    expect(mlbActivePlayers(club)).not.toContain(player);
    expect(mlbCapUsed(club) - mlbCapUsed({ ...club, players: club.players.filter(p => p.id !== rookie.id) })).toBeCloseTo(player.salary);
    expect(mlbMoveFarmPlayer(league, team, rookie.id, 'recall')).toBe(true);
  });

  it('uses an early recall for an actual IL starter and changes the scored round after reload', () => {
    const rookie = draftRookie();
    fireEvent.click(option(rookie));
    const league = saved().league;
    const club = league.teams[team];
    const rival = league.teams.ATL;
    const period = 2;
    league.round = period;
    league.schedule![period - 1] = Array(6).fill('ARI-ATL');
    // Keep the fixture's control strengths identical before injury cover.
    for (const t of [club, rival]) {
      t.players.forEach(p => { p.out = 0; if (p.id !== rookie.id) p.ovr = p.pos === 'SP' ? 72 : 83; });
      const rotation = t.players.filter(p => p.pos === 'SP' && p.id !== rookie.id);
      [84, 80, 75].forEach((ovr, i) => { rotation[i].ovr = ovr; });
    }
    const starter = club.players.filter(p => p.pos === 'SP' && p.id !== rookie.id)[3];
    starter.ovr = 93;
    starter.out = 3;
    saveLeague(league);
    reload();
    roster();
    expect(recall(rookie)).toBeDisabled();
    fireEvent.click(rowFor(club.players.find(p => p.id === 'extra-27')!).getByRole('button', { name: /^DFA,/ }));
    fireEvent.click(screen.getByRole('button', { name: 'DFA him' }));
    const control = saved().league;
    expect(mlbActivePlayers(control.teams[team])).toHaveLength(27);
    expect(mlbWinProb(control.teams[team], control.teams.ATL)).toBe(.5);
    expect(rowFor(rookie).getByText('Covers ' + starter.name + ' on the IL.')).toBeInTheDocument();

    fireEvent.click(recall(rookie));
    const recalled = saved().league;
    expect(mlbCapUsed(recalled.teams[team])).toBe(mlbCapUsed(control.teams[team]));
    expect(mlbStrength(recalled.teams[team]) - mlbStrength(control.teams[team])).toBeCloseTo(1.32);
    expect(mlbStrengthUnits(recalled.teams[team]).rot.map(p => p.id)).toContain(rookie.id);
    expect(own(recalled, rookie.id).farmAssignment?.recalled).toMatchObject({
      season: recalled.season, round: period, coverage: { id: starter.id },
    });

    const tape = (injuryRoll: number) => {
      let draws = 0;
      return () => { draws += 1; return draws === 1 ? injuryRoll : draws === 2 ? .51 : .99; };
    };
    // Isolate the played strength delta from unrelated fresh injuries.
    const seed = Array.from({ length: 128 }, (_, i) => keyedRng('farm game ' + i)()).find(roll => {
      const no = simMlbRound(structuredClone(control), team, tape(roll));
      const yes = simMlbRound(structuredClone(recalled), team, tape(roll));
      return no.myWins === 0 && yes.myWins === 1;
    });
    expect(seed).toBeDefined();

    reload();
    roster();
    expect(rowFor(rookie).getByText('Recalled in ' + recalled.season + ', Round 2 to cover ' + starter.name + ' on the IL.')).toBeInTheDocument();
    reload();
    vi.mocked(Math.random).mockImplementation(tape(seed!));
    fireEvent.click(play(period));
    expect(saved().lastRound).toMatchObject({ wins: 1, losses: 5 });
    expect(saved().league.teams[team].players.filter(p => p.id === rookie.id)).toHaveLength(1);
    expect(own(saved().league, rookie.id).farmAssignment).toEqual(own(recalled, rookie.id).farmAssignment);
  });
});
