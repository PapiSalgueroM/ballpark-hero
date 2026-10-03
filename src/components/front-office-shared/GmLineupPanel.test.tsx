import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmLineupPanel } from './GmLineupPanel';
import { type GmLineupChoice, type GmLineupSport, gmLineupStrength } from '@/lib/gmLineup';
import { mlbLineupSport, nflLineupSport } from '@/lib/gmLineupSports';
import { type MlbGmTeam, mlbStrength } from '@/lib/mlbFrontOffice';
import { initLeague, teamStrength } from '@/lib/frontOffice';

afterEach(cleanup);
const lcg = (start: number) => { let s = start >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

/* Fictional men only: generated labels, no real names. */
const player = (id: string, pos: string, ovr: number, out = 0) => ({ id, name: `Player ${id}`, pos, age: 27, ovr, salary: 1, years: 2, out, pot: ovr });
const mlbTeam = (): MlbGmTeam => ({
  abbr: 'TST',
  players: [
    ...['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'C'].map((pos, i) => player(`b${i}`, pos, 60 + i * 3)),
    ...[70, 82, 64, 77, 59, 68].map((o, i) => player(`s${i}`, 'SP', o)),
    player('r0', 'RP', 72), player('r1', 'CL', 80), player('r2', 'RP', 61),
  ],
  wins: 0, losses: 0, picks: [],
});

function Harness<T>({ sport, team, spy }: { sport: GmLineupSport<T>; team: T; spy: (c: GmLineupChoice) => void }) {
  const [choice, setChoice] = useState<GmLineupChoice>({});
  return <GmLineupPanel sport={sport} team={team} choice={choice} onChange={c => { spy(c); setChoice(c); }} />;
}
const strengthText = (root: HTMLElement) => root.querySelector('[data-lineup-strength] b')!.textContent;

describe('GmLineupPanel', () => {
  it('opens on the sim\'s pick at today\'s strength, and a bench tap costs what the engine says', () => {
    const team = mlbTeam();
    const spy = vi.fn();
    const { container } = render(<Harness sport={mlbLineupSport()} team={team} spy={spy} />);
    expect(strengthText(container)).toBe(mlbStrength(team).toFixed(1));
    expect(container.querySelectorAll('[data-lineup-group]')).toHaveLength(3);
    fireEvent.click(container.querySelector('[data-lineup-group="bats"]')!);
    expect(container.querySelectorAll('[data-lineup-slot]')).toHaveLength(9);
    fireEvent.click(container.querySelector('[data-lineup-slot="0"]')!);
    fireEvent.click(container.querySelector('[data-lineup-bench="b0"]')!);
    expect(spy).toHaveBeenCalledTimes(1);
    const choice = spy.mock.calls[0][0] as GmLineupChoice;
    expect(choice.slots?.bats?.[0]).toBe('b0');
    expect(strengthText(container)).toBe(gmLineupStrength(mlbLineupSport(), team, choice).toFixed(1));
    expect(gmLineupStrength(mlbLineupSport(), team, choice)).toBeLessThan(mlbStrength(team));
    fireEvent.click(container.querySelector('[data-lineup-reset]')!);
    expect(spy.mock.calls[1][0]).toEqual({});
    expect(strengthText(container)).toBe(mlbStrength(team).toFixed(1));
  });

  it('skips the last rotation spot and says so, and a refused tap moves nothing', () => {
    const team = mlbTeam();
    const spy = vi.fn();
    const { container } = render(<Harness sport={mlbLineupSport()} team={team} spy={spy} />);
    fireEvent.click(container.querySelector('[data-lineup-group="rotation"]')!);
    fireEvent.click(container.querySelector('[data-lineup-open]')!);
    expect((spy.mock.calls[0][0] as GmLineupChoice).slots?.rotation?.[4]).toBeNull();
    expect(container.querySelector('[data-lineup-slot="4"]')!.textContent).toContain('Skipped');
    fireEvent.click(container.querySelector('[data-lineup-slot="4"]')!);
    fireEvent.click(container.querySelector('[data-lineup-slot="3"]')!);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-lineup-refused]')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-lineup-back]')!);
    expect(container.querySelector('[data-lineup-group="rotation"]')!.textContent).toContain('Your pick');
  });

  it('a last spot empty for want of a fit starter reads Open with no button, and a hurt man\'s slot says it is kept', () => {
    const team = mlbTeam();
    for (const id of ['s4', 's5']) team.players.find(p => p.id === id)!.out = 2;
    team.players.find(p => p.id === 's0')!.out = 2;
    const spy = vi.fn();
    const { container, rerender } = render(<Harness sport={mlbLineupSport()} team={team} spy={spy} />);
    fireEvent.click(container.querySelector('[data-lineup-group="rotation"]')!);
    expect(container.querySelector('[data-lineup-slot="4"]')!.textContent).toContain('Open');
    expect(container.querySelector('[data-lineup-slot="4"]')!.textContent).not.toContain('Skipped');
    expect(container.querySelector('[data-lineup-open]')).toBeNull();
    /* a bats save, then its leadoff man gets hurt: the slot says who it is kept for */
    fireEvent.click(container.querySelector('[data-lineup-back]')!);
    fireEvent.click(container.querySelector('[data-lineup-group="bats"]')!);
    fireEvent.click(container.querySelector('[data-lineup-slot="7"]')!);
    fireEvent.click(container.querySelector('[data-lineup-slot="8"]')!);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-lineup-held]')).toBeNull();
    team.players.find(p => p.id === 'b9')!.out = 2;
    rerender(<Harness sport={mlbLineupSport()} team={team} spy={spy} />);
    expect(container.querySelector('[data-lineup-slot="0"] [data-lineup-held="b9"]')).not.toBeNull();
  });

  it('NFL: the chart fills the slots, the GM picks the scheme', () => {
    const team = Object.values(initLeague(lcg(9)).teams)[0];
    const spy = vi.fn();
    const { container } = render(<Harness sport={nflLineupSport()} team={team} spy={spy} />);
    expect(strengthText(container)).toBe(teamStrength(team).toFixed(1));
    fireEvent.click(container.querySelector('[data-lineup-group="def"]')!);
    expect((container.querySelector('[data-lineup-slot="0"]') as HTMLButtonElement).disabled).toBe(true);
    expect((container.querySelector('[data-lineup-scheme="43"]') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(container.querySelector('[data-lineup-scheme="34"]')!);
    expect(spy.mock.calls[0][0]).toEqual({ schemes: { def: '34' } });
    expect(container.querySelectorAll('[data-lineup-slot]')).toHaveLength(11);
    expect(container.querySelector('[data-lineup-bench-list]')).toBeNull();
  });
});
