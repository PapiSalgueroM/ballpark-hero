import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NbaFrontOfficeBoard from '@/components/nba-front-office/NbaFrontOfficeBoard';
import {
  initNbaLeague, nbaRestPlan, nbaRestPreview, nbaStrength, nbaWinProb, setNbaRestPlan, simRound,
  NBA_ROUNDS, type NbaGmPlayer, type NbaLeague,
} from '@/lib/nbaFrontOffice';
import { nbaTeamLines } from '@/lib/nbaSeasonStats';
import { keyedRng } from '@/lib/keyedRng';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const key = 'nba-front-office-save-v1', team = 'DEN', starter = 'DEN0';
const read = () => JSON.parse(localStorage.getItem(key)!);
const regular = [95, 85, 85, 85, 85, 75, 75, 75, 70];
const saved = (league: NbaLeague) => JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
const roster = (abbr: string, ratings: number[]): NbaGmPlayer[] => ratings.map((ovr, i) => ({
  id: abbr + i, name: abbr + ' fixture ' + i, pos: i % 3 === 2 ? 'C' : i % 3 === 1 ? 'F' : 'G',
  age: 27, ovr, pot: ovr, salary: 3, years: 3, out: 0,
}));
const start = (whole = false): NbaLeague => {
  const league = initNbaLeague(keyedRng('NBA starter rest fixture'));
  if (!whole) league.teams = { DEN: league.teams.DEN, BOS: league.teams.BOS };
  league.round = 2;
  league.inSeasonRatings = true;
  league.teams.DEN.players = roster('DEN', regular);
  league.teams.BOS.players = roster('BOS', [85, 85, 85, 85, 85, 75, 75, 75, 70]);
  league.schedule = Array.from({ length: NBA_ROUNDS }, () => Array(4).fill('DEN-BOS'));
  return league;
};
const play = (league: NbaLeague, first: number[] = []) => {
  let draws = 0;
  const report = simRound(league, team, () => first[draws++] ?? 0.48);
  return { report, draws };
};
const open = () => fireEvent.click(screen.getByText('Play', { exact: true }));

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('NBA Front Office starter rest', () => {
  it('uses the actual cover for game odds and box scores, preserving the preferred rotation and random stream', () => {
    const usual = start();
    usual.teams.DEN.rotation = usual.teams.DEN.players.slice(0, 8).map(player => player.id);
    const rested = setNbaRestPlan(structuredClone(usual), team, starter);
    const preview = nbaRestPreview(rested, team)!;
    expect(preview.cover.id).toBe('DEN8');
    expect(nbaWinProb(usual.teams.DEN, usual.teams.BOS)).toBeGreaterThan(0.48);
    expect(nbaWinProb(preview.lineup, rested.teams.BOS)).toBeLessThan(0.48);
    const a = play(usual), b = play(rested);
    expect(b.draws).toBe(a.draws);
    expect(a.report.myWins).toBe(4);
    expect(b.report).toMatchObject({ myWins: 0, myLosses: 4, rest: { player: 'DEN fixture 0' } });
    expect(nbaTeamLines(usual, team).find(line => line.id === starter)).toMatchObject({ g: 4, gs: 4 });
    expect(nbaTeamLines(rested, team).find(line => line.id === starter)).toBeUndefined();
    expect(nbaTeamLines(rested, team).find(line => line.id === preview.cover.id)).toMatchObject({ g: 4, gs: 4 });
    expect(rested.teams.DEN.rotation).toEqual(usual.teams.DEN.rotation);
    expect(nbaStrength(rested.teams.DEN)).toBeCloseTo(nbaStrength(usual.teams.DEN));
    expect(nbaRestPlan(rested, team)).toBeNull();
  });

  it('keeps a real injury-triggering draw and duration in the stream, protecting the rested player', () => {
    const usual = start();
    const rested = setNbaRestPlan(structuredClone(usual), team, starter);
    const a = play(usual, [0.01, 0.99]), b = play(rested, [0.01, 0.99]);
    expect(a.draws).toBe(b.draws);
    expect(usual.teams.DEN.players[0].out).toBe(3);
    expect(rested.teams.DEN.players[0].out).toBe(0);
    expect(b.report.rest).toEqual({ player: 'DEN fixture 0' });
    expect(b.report.notes.every(note => !note.includes('DEN fixture 0 is out'))).toBe(true);
    expect(rested.teams.BOS.players).toEqual(usual.teams.BOS.players);
  });

  it('falls back when the saved player has already lost his starting spot', () => {
    const booked = setNbaRestPlan(start(), team, starter);
    booked.teams.DEN.players[0].out = 2;
    expect(nbaRestPreview(booked, team)).toBeNull();
    const control = setNbaRestPlan(structuredClone(booked), team, '');
    expect(play(booked).report).toEqual({ ...play(control).report, rest: { unavailable: true } });
    expect(JSON.stringify(booked)).toBe(JSON.stringify(control));
  });

  it('saves the choice across reload and keeps the actual rest receipt after another batch', () => {
    const league = start(true), raw = saved(league);
    localStorage.setItem(key, raw);
    let view = render(<NbaFrontOfficeBoard />);
    open();
    const picker = () => screen.getByRole('combobox', { name: 'Rest a starter' });
    expect(localStorage.getItem(key)).toBe(raw);
    fireEvent.change(picker(), { target: { value: starter } });
    expect(screen.getByText(/DEN fixture 5 moves into the starting five/)).toBeInTheDocument();
    const booked = localStorage.getItem(key);
    view.unmount();
    view = render(<NbaFrontOfficeBoard />);
    open();
    expect(localStorage.getItem(key)).toBe(booked);
    expect(picker()).toHaveValue(starter);
    vi.spyOn(Math, 'random').mockReturnValue(0.48);
    fireEvent.click(screen.getByRole('button', { name: 'Play Round 2' }));
    expect(read().lastRound.rest).toMatchObject({ player: 'DEN fixture 0' });
    expect(nbaTeamLines(read().league, team).find(line => line.id === starter)).toBeUndefined();
    expect(picker()).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Play Round 3' }));
    expect(nbaTeamLines(read().league, team).find(line => line.id === starter)).toMatchObject({ g: 4, gs: 4 });
    const bytes = localStorage.getItem(key);
    view.unmount();
    render(<NbaFrontOfficeBoard />);
    open();
    const history = within(screen.getByRole('region', { name: 'Round results' }));
    fireEvent.change(history.getByRole('combobox', { name: 'Played round' }), { target: { value: '2' } });
    expect(history.getByText('DEN fixture 0 rested this round. The usual rotation resumes next round.')).toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(bytes);
  });
});
