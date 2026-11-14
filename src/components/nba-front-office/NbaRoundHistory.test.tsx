import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import { initNbaLeague, simRound, type NbaLeague } from '@/lib/nbaFrontOffice';
import type { NbaRoundChange, NbaRoundResult } from '@/lib/nbaRoundHistory';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));

const key = 'nba-front-office-save-v1';
const team = 'DEN';
const parse = () => JSON.parse(localStorage.getItem(key)!);
const region = () => within(screen.getByRole('region', { name: 'Round results' }));
const openPlay = () => fireEvent.click(screen.getByText('Play', { exact: true }));
const play = (round: number) => fireEvent.click(screen.getByRole('button', { name: `Play Round ${round}`, exact: true }));
const fixture = () => {
  const league = initNbaLeague(keyedRng('NBA history fixture'));
  league.inSeasonRatings = true;
  league.teams[team].players.forEach((player, i) => Object.assign(player, {
    name: `Simulated player ${i}`, age: i % 2 === 0 ? 20 : 35, ovr: 78, pot: 89,
  }));
  simRound(league, team, keyedRng('NBA history opening legacy round'));
  league.round = 2;
  return { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 };
};

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('NBA Front Office round results', () => {
  it('keeps actual batch and OVR changes through later plays and reloads without changing draws', () => {
    const start = fixture();
    localStorage.setItem(key, JSON.stringify(start));
    const draw = keyedRng('NBA history paired draws');
    let boardDraws = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => { boardDraws++; return draw(); });
    const view = render(<NbaFrontOfficeBoard />);
    openPlay();
    expect(region().getByText('Results and rating changes are unavailable for this round.')).toBeVisible();
    const paired: NbaLeague = JSON.parse(JSON.stringify(start.league));
    const compare = keyedRng('NBA history paired draws');
    boardDraws = 0;
    let engineDraws = 0;
    const expected: Array<Omit<NbaRoundResult, 'changes'> & { changes: NbaRoundChange[] }> = [];
    for (let round = 2; round <= 5; round += 1) {
      const before = paired.teams[team].players.map(player => player.ovr);
      const report = simRound(paired, team, () => { engineDraws++; return compare(); });
      const changes = paired.teams[team].players.flatMap<NbaRoundChange>((player, i) => player.ovr === before[i] ? []
        : [[player.name, player.ovr - before[i], player.ovr]]);
      expected.push({ round, wins: report.myWins, losses: report.myLosses, changes });
      paired.round += 1;
      play(round);
      expect(parse().league).toEqual(paired);
      expect(parse().roundHistory).toEqual({ team, season: paired.season, rounds: expected });
    }
    expect(boardDraws).toBe(engineDraws);
    const changed = expected.find(row => row.changes.length > 0)!;
    expect(changed).toBeDefined();
    expect(expected.flatMap(row => row.changes).map(row => row[1])).toEqual(expect.arrayContaining([1, -1]));
    const raw = localStorage.getItem(key);
    view.unmount();
    render(<NbaFrontOfficeBoard />);
    openPlay();
    fireEvent.change(region().getByRole('combobox', { name: 'Played round' }), { target: { value: String(changed.round) } });
    expect(region().getByText(`Won ${changed.wins} · Lost ${changed.losses}`)).toBeVisible();
    expect(region().getAllByRole('listitem').map(row => row.textContent))
      .toEqual(changed.changes.map(([name, delta, ovr]) => `${name} ${delta === 1 ? '+1' : '-1'} OVR to ${ovr}`));
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it('shows a known older last-round record with unavailable rating changes and keeps its original bytes', () => {
    const start = fixture();
    const { season } = start.league;
    const { wins, losses } = start.league.teams[team];
    const raw = JSON.stringify({ ...start,
      lastRound: { team, season, round: 1, wins, losses, notes: [] },
      roundHistory: { team, season: season - 1, rounds: [{ round: 1, wins: 2, losses: 2, changes: [['Invalid era', 1, 91]] }] },
    });
    localStorage.setItem(key, raw);
    render(<NbaFrontOfficeBoard />);
    openPlay();
    expect(region().getByText(`Won ${wins} · Lost ${losses}`)).toBeVisible();
    expect(region().getByText('Rating changes are unavailable for this round.')).toBeVisible();
    expect(region().queryByText('Invalid era')).toBeNull();
    expect(localStorage.getItem(key)).toBe(raw);
    play(2);
    expect(parse().roundHistory.rounds[0]).toEqual({ round: 1, wins, losses, changes: null });
    fireEvent.change(region().getByRole('combobox', { name: 'Played round' }), { target: { value: '1' } });
    expect(region().getByText(`Won ${wins} · Lost ${losses}`)).toBeVisible();
    expect(region().getByText('Rating changes are unavailable for this round.')).toBeVisible();
  });
});
