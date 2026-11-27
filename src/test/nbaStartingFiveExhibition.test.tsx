import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { NbaExhibition } from '@/components/nba/NbaExhibition';
import { exhibitionFive, exhibitionGame, exhibitionResults, exhibitionScout, readExhibition, SERIES_KEY, type ExhibitionCall, type ExhibitionPlayer } from '@/lib/nbaStartingFiveExhibition';
import { NBA_POSITIONS } from '@/types/nba';
import { type NbaFivePick, type NbaFiveTeamPool } from '@/lib/nbaStartingFiveScore';

const five: ExhibitionPlayer[] = NBA_POSITIONS.map(({ role }, i) => ({
  role, name: 'Fixture ' + role, ppg: [16, 25, 14, 12, 11][i], apg: [9, 2, 4, 1, 1][i], rpg: [3, 3, 5, 8, 9][i],
}));
const series = { five, seed: 5, calls: [] as ExhibitionCall[] };
const keep: ExhibitionCall = { lead: 'PG', action: 'keep' };
const pass: ExhibitionCall = { lead: 'PG', action: 'pass' };
const switchLead: ExhibitionCall = { lead: 'SG', action: 'keep' };
const key = 'dukb-nba-starting-five-draft-v1';
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('Starting 5 exhibition', () => {
  it('uses the matched career rows and withholds the exhibition when one rate is unknown', () => {
    const picks: NbaFivePick[] = five.map(p => ({ name: p.name, role: p.role, team: p.role, value: 500 }));
    const pools: NbaFiveTeamPool[] = five.map(p => ({ team: p.role, entries: [{
      name: p.name, position: null, key: p.name.toLowerCase(), hold: null, record: {
        player_name: p.name, teams: null, year_from: null, games: 100, points: p.ppg * 100,
        ast: p.apg * 100, trb: p.rpg * 100, stl: null, blk: null, three_p: null,
      },
    }] }));
    expect(exhibitionFive(picks, pools)).toEqual(five);
    pools[1].entries[0].record!.ast = 0;
    expect(exhibitionFive(picks, pools)?.[1].apg).toBe(0);
    pools[1].entries[0].record!.ast = null;
    expect(exhibitionFive(picks, pools)).toBeNull();
  });

  it('gives the same five opposite results against the same trap by reallocating actual shot attempts', () => {
    expect(exhibitionScout(series, 0)).toEqual({ trap: true, target: 13, watched: undefined });
    const first = exhibitionGame(series, 0, keep);
    const second = exhibitionGame(series, 0, pass);
    expect([first.points, first.won, first.shots.map(s => s.attempts)]).toEqual([8, false, [8, 1, 1, 1, 1]]);
    expect([second.points, second.won, second.shots.map(s => s.attempts)]).toEqual([14, true, [4, 2, 2, 2, 2]]);
    expect(exhibitionScout({ ...series, calls: [keep] }, 1)).toEqual({ trap: true, target: 11, watched: 'PG' });
    expect(exhibitionScout({ ...series, calls: [pass] }, 1)).toEqual({ trap: false, target: 11, watched: 'PG' });
  });

  it('makes the coverage, handler, shooting, passing and rebounding consequential on paired possessions', () => {
    const weak = five.map(p => ({ ...p, ppg: 0, apg: 0, rpg: 0 }));
    let dropWins = 0, trapWins = 0, roleDiffs = 0, passGains = 0, secondChances = 0, scoringGains = 0, pressureLosses = 0;
    for (let seed = 0; seed < 400; seed++) {
      const current = { ...series, seed, calls: [pass] };
      const drop = exhibitionGame(current, 1, keep);
      const unmarked = exhibitionGame({ ...current, calls: [{ ...pass, lead: 'SF' }] }, 1, keep);
      const trap = exhibitionGame({ ...current, calls: [keep] }, 1, keep);
      const trapPass = exhibitionGame({ ...current, calls: [keep] }, 1, pass);
      const noAssists = exhibitionGame({ ...current, calls: [keep], five: five.map(p => ({ ...p, apg: 0 })) }, 1, pass);
      const noPoints = exhibitionGame({ ...current, five: five.map(p => ({ ...p, ppg: 0 })) }, 1, keep);
      const noBoards = exhibitionGame({ ...current, five: weak }, 1, keep);
      if (drop.points > trap.points) dropWins++;
      if (drop.points < unmarked.points) pressureLosses++;
      if (trapPass.points > trap.points) trapWins++;
      if (drop.points !== exhibitionGame(current, 1, switchLead).points) roleDiffs++;
      if (trapPass.points > noAssists.points) passGains++;
      if (drop.points > noPoints.points) scoringGains++;
      if (drop.putback) secondChances++;
      expect(noBoards.putback).toBe(false);
      expect(drop.shots.reduce((sum, p) => sum + p.makes * 2, drop.putback ? 2 : 0)).toBe(drop.points);
    }
    for (const count of [dropWins, trapWins, roleDiffs, passGains, scoringGains, secondChances, pressureLosses]) expect(count).toBeGreaterThan(50);
  });

  it('replays stored calls exactly and refuses invalid or already-clinched game threes', () => {
    const sweep = { ...series, calls: [pass, switchLead] };
    expect(exhibitionResults(sweep)).toMatchObject({ wins: 2, losses: 0, complete: true });
    expect(readExhibition(JSON.stringify(sweep))).toEqual(sweep);
    expect(readExhibition(JSON.stringify({ ...sweep, calls: [...sweep.calls, keep] }))).toBeNull();
    expect(readExhibition(JSON.stringify({ ...series, five: five.slice(1) }))).toBeNull();
    expect(readExhibition(JSON.stringify({ ...series, calls: [{ action: 'pass', lead: 'coach' }] }))).toBeNull();
  });

  it('resumes the real dialog after a reload, preserves the classic draft and stops at two wins', () => {
    vi.spyOn(Math, 'random').mockReturnValue(5 / 0x100000000);
    localStorage.setItem(key, 'untouched classic draft');
    const first = render(<NbaExhibition five={five} />);
    fireEvent.click(screen.getByRole('button', { name: 'Coach this five' }));
    fireEvent.click(screen.getByLabelText(/Hit the cutters/));
    fireEvent.click(screen.getByRole('button', { name: 'Play game 1' }));
    expect(screen.getByText('Game 1 · Win · 14 to 13')).toBeInTheDocument();
    first.unmount();
    render(<NbaExhibition />);
    fireEvent.click(screen.getByRole('button', { name: 'Resume exhibition' }));
    const dlg = within(screen.getByRole('dialog'));
    fireEvent.change(dlg.getByRole('combobox', { name: 'Ball handler' }), { target: { value: 'SG' } });
    fireEvent.click(dlg.getByRole('button', { name: 'Play game 2' }));
    expect(dlg.getByText('Series won · 2 to 0')).toBeInTheDocument();
    expect(dlg.queryByRole('button', { name: 'Play game 3' })).toBeNull();
    expect(readExhibition(localStorage.getItem(SERIES_KEY))?.calls).toEqual([pass, switchLead]);
    expect(localStorage.getItem(key)).toBe('untouched classic draft');
    fireEvent.click(dlg.getByRole('button', { name: 'Play a new series' }));
    expect(dlg.getByText('Series score · 0 to 0')).toBeInTheDocument();
  });
});
