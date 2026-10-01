/**
 * Round 828: the NFL board on a full roster.
 *
 * The engine rules are fenced by scripts/simNflFullRosters.mjs. This is the
 * board: a full roster's Roster box opens on one tile per position group and
 * one for the practice squad (small tiles and a back button, never one long
 * list of fifty men), a group tile opens that group's men with their Cut
 * buttons, a practice squad man can be called up while there is a spot and
 * the button is greyed with the reason at 53, the market says the roster is
 * full and greys every Sign, and tapping a team on the pick screen starts a
 * league that carries the whole club. A fifteen man save keeps the old list.
 *
 * Same setup as FrontOfficeTagDepth.test.tsx: a save from the real engine
 * under a seeded rng, the real board rendered on it, the save read back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { FO_DEPTH } from '@/data/frontOfficeDepth';
import { initLeague, promoteFromPractice, DEEP_ROSTER_MAX, DEPTH_GROUPS, type LeagueState } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const read = (): any => JSON.parse(localStorage.getItem(KEY)!);
const save = (league: LeagueState, team: string) =>
  localStorage.setItem(KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
const all = (sel: string) => [...document.querySelectorAll(sel)] as HTMLElement[];
const el = (sel: string) => document.querySelector(sel) as HTMLElement;

describe('NFL Front Office: a full roster on the board', () => {
  let restoreRandom: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(5));
    restoreRandom = () => spy.mockRestore();
  });
  afterEach(() => { cleanup(); restoreRandom?.(); });

  it('opens the Roster box on group tiles, never a list of every man', () => {
    const league = initLeague(lehmer(3), { depth: FO_DEPTH });
    save(league, 'KC');
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(all('[data-roster-group]').map(b => b.getAttribute('data-roster-group'))).toEqual([...DEPTH_GROUPS, 'practice']);
    expect(all('[data-roster-row]').length).toBe(0);
    fireEvent.click(el('[data-roster-group="WR"]'));
    const wrs = league.teams.KC.players.filter(p => p.pos === 'WR');
    expect(all('[data-roster-row]').length).toBe(wrs.length);
    expect(wrs.length).toBeGreaterThan(3);
    fireEvent.click(screen.getByText('Groups'));
    expect(all('[data-roster-row]').length).toBe(0);
    expect(el('[data-roster-groups]')).toBeTruthy();
  });

  it('calls a practice squad man up while there is a spot, and greys the button at 53', () => {
    const league = initLeague(lehmer(4), { depth: FO_DEPTH });
    const team = league.teams.KC;
    expect(team.players.length).toBeLessThan(DEEP_ROSTER_MAX);
    save(league, 'KC');
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(el('[data-roster-group="practice"]'));
    const first = all('[data-practice-row]')[0];
    const id = first.getAttribute('data-practice-row')!;
    fireEvent.click(first.querySelector('button')!);
    const after = read().league.teams.KC;
    expect(after.players.some((p: any) => p.id === id)).toBe(true);
    expect(after.practice.some((p: any) => p.id === id)).toBe(false);
    cleanup();

    /* at 53 the call up and every Sign are refused, with the reason on screen */
    const full = initLeague(lehmer(4), { depth: FO_DEPTH });
    const t = full.teams.KC;
    while (t.players.length < DEEP_ROSTER_MAX) promoteFromPractice(t, t.practice![0].id);
    save(full, 'KC');
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    fireEvent.click(el('[data-roster-group="practice"]'));
    expect(el('[data-practice-full]').textContent).toContain(`${DEEP_ROSTER_MAX}`);
    expect(all('[data-practice-row] button').every(b => (b as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByText('Hub'));
    fireEvent.click(screen.getByText('Free agency'));
    expect(el('[data-market-full]')).toBeTruthy();
    expect(all('[data-fa-row] button').every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it('starts a new league with the whole club when a team is tapped', async () => {
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Kansas City Chiefs'));
    await waitFor(() => expect(localStorage.getItem(KEY)).toBeTruthy());
    const lg = read().league;
    expect(lg.rosterDepth).toBe(2);
    const kc = lg.teams.KC;
    expect(kc.players.length).toBe(15 + FO_DEPTH.KC.bench.length);
    expect(kc.practice.length).toBe(FO_DEPTH.KC.practice.length);
  });

  it('keeps the old list on a fifteen man save', () => {
    const league = initLeague(lehmer(6));
    save(league, 'KC');
    render(<FrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(all('[data-roster-group]').length).toBe(0);
    expect(all('[data-roster-row]').length).toBe(league.teams.KC.players.length);
  });
});
