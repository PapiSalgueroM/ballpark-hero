/**
 * Round 829: the MLB Front Office board with every club's real 26, and with a
 * save from before the round.
 *
 * A new league opens a roster box of 26 rows in three small groups, tags the
 * 13 the sim plays from the engine's own read, marks a thin data rating, and
 * keeps the 22 to 28 limits. A save written before the round (the legacy
 * fixture scripts/simMlbFullRosters.mjs replays, written by the engine as it
 * stood) opens its 13 men on the old 9 to 16 limits.
 *
 * scripts/simMlbFullRosters.mjs runs this file in section 8.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { initMlbLeague, mlbSimReads, mlbDraftClass, mlbProspectToPlayer, mlbSalaryFor, MLB_DEPTH_SALARY, MLB_ROSTER_MIN, MLB_ROSTER_MAX, MLB_LEGACY_ROSTER_MIN, MLB_LEGACY_ROSTER_MAX, type MlbLeague } from '@/lib/mlbFrontOffice';
import { leagueNames } from '@/lib/foNames';
import { MLB_FO_PARTIAL } from '@/data/mlbFoRosters2026';
import MlbFrontOfficeBoard from '@/components/mlb-front-office/MlbFrontOfficeBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const SAVE_KEY = 'mlb-front-office-save-v1';
const save = (league: MlbLeague, team: string) =>
  localStorage.setItem(SAVE_KEY, JSON.stringify({ league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0, draftClass: null, picksLeft: 0 }));
const rows = () => [...document.querySelectorAll('[data-roster-row]')] as HTMLElement[];
const legacyLeague = (): { league: MlbLeague; team: string } => {
  const fx = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'scripts/data/mlbLegacySaveFixture.json'), 'utf8'));
  return { league: fx.rows[0].start as MlbLeague, team: fx.rows[0].team as string };
};

describe('MLB Front Office: full rosters on the board', () => {
  let restore: (() => void) | null = null;
  beforeEach(() => {
    localStorage.clear();
    const spy = vi.spyOn(Math, 'random').mockImplementation(lehmer(17));
    restore = () => spy.mockRestore();
  });
  afterEach(() => { cleanup(); restore?.(); });

  it('a new league opens 26 men in three groups, with the 13 the sim plays tagged from the engine', () => {
    const league = initMlbLeague(lehmer(5));
    const team = 'NYY';
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(rows()).toHaveLength(26);
    expect([...document.querySelectorAll('[data-roster-group]')].map(e => e.getAttribute('data-roster-group'))).toEqual(['bats', 'rot', 'pen']);
    expect(document.querySelector('[data-roster-count]')?.textContent).toContain('26 on the roster');
    const plays = new Set(mlbSimReads(league.teams[team]));
    expect(plays.size).toBe(13);
    for (const r of rows()) {
      const id = r.getAttribute('data-roster-row')!;
      expect(r.querySelector('[data-sim-plays]')?.getAttribute('data-sim-plays')).toBe(plays.has(id) ? 'yes' : 'no');
    }
    /* nobody is at the floor, so every DFA is live */
    expect(document.querySelector('[data-cut-block]')).toBeNull();
  });

  /* Round 829 review: real men on made up money. The box says the salaries
     are the game's own, and a depth deal in its last year says what he will
     cost a season before it lands. */
  it('says the salaries are the game\'s own and flags a depth deal in its last year', () => {
    const league = initMlbLeague(lehmer(5));
    const team = 'NYY';
    const reads = new Set(mlbSimReads(league.teams[team]));
    const man = league.teams[team].players.find(p => !reads.has(p.id) && mlbSalaryFor(p.ovr) > MLB_DEPTH_SALARY)!;
    expect(man.salary).toBe(MLB_DEPTH_SALARY);
    man.years = 1;
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(document.querySelector('[data-salary-note]')?.textContent).toContain('Salaries are the game\'s own, not real contracts.');
    expect(document.querySelector('[data-salary-note]')?.textContent).toContain('0.7M depth deals');
    const tags = [...document.querySelectorAll('[data-last-year]')];
    expect(tags).toHaveLength(1);
    expect(document.querySelector(`[data-roster-row="${man.id}"] [data-last-year]`)?.textContent).toContain(`$${mlbSalaryFor(man.ovr)}M`);
  });

  it('a thin data rating says so on its row', () => {
    const league = initMlbLeague(lehmer(5));
    const team = Object.keys(league.teams).find(a => league.teams[a].players.some(p => MLB_FO_PARTIAL.includes(p.name)))!;
    expect(team).toBeTruthy();
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    const thin = league.teams[team].players.filter(p => MLB_FO_PARTIAL.includes(p.name));
    expect(document.querySelectorAll('[data-partial]')).toHaveLength(thin.length);
    for (const p of thin) expect(document.querySelector(`[data-roster-row="${p.id}"] [data-partial]`)).toBeTruthy();
  });

  it('a new league keeps the full roster limits', () => {
    const league = initMlbLeague(lehmer(5));
    const team = 'LAD';
    league.teams[team].players = [...league.teams[team].players].sort((a, b) => b.ovr - a.ovr).slice(0, MLB_ROSTER_MIN);
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(document.querySelector('[data-cut-block]')?.textContent).toBe(`Your roster is at the minimum of ${MLB_ROSTER_MIN}, so nobody else can go.`);
    expect(MLB_ROSTER_MAX).toBe(28);
  });

  /* Round 829 review: the draft can take a full roster club past 28. Every
     CPU club is cut in the offseason; yours waits for you, and Play waits
     until you have DFA'd down through the same two taps as any other cut. */
  it('a club the draft took past 28 must DFA down before it plays', () => {
    const league = initMlbLeague(lehmer(5));
    const team = 'NYY';
    const cls = mlbDraftClass(lehmer(9), 24, leagueNames(league));
    for (const pr of cls.slice(0, 4)) league.teams[team].players.push(mlbProspectToPlayer(pr, lehmer(3)));
    expect(league.teams[team].players).toHaveLength(MLB_ROSTER_MAX + 2);
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Play'));
    expect(document.querySelector('[data-over-limit]')?.textContent).toContain('2 over the limit of 28');
    expect((screen.getByText('Play Round 1').closest('button') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByText('Play Round 1'));
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).league.round).toBe(1);
    cleanup();

    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(document.querySelector('[data-over-limit]')).toBeTruthy();
    const reads = new Set(mlbSimReads(league.teams[team]));
    const depth = rows().filter(r => !reads.has(r.getAttribute('data-roster-row')!)).slice(0, 2);
    for (const r of depth) {
      fireEvent.click(r.querySelector('button')!);
      fireEvent.click(screen.getByText('DFA him'));
    }
    const after = JSON.parse(localStorage.getItem(SAVE_KEY)!).league.teams[team];
    expect(after.players).toHaveLength(MLB_ROSTER_MAX);
    expect(after.deadCap).toHaveLength(2);
    expect(document.querySelector('[data-over-limit]')).toBeNull();
    cleanup();

    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Play'));
    expect((screen.getByText('Play Round 1').closest('button') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByText('Play Round 1'));
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).league.round).toBe(2);
  });

  it('a save from before the round opens its 13 men on the old limits', () => {
    const { league, team } = legacyLeague();
    expect(Object.values(league.teams).every(t => t.depth === undefined)).toBe(true);
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    expect(screen.getByText('Free agency').closest('button')?.textContent ?? '').not.toContain(`Roster full at ${MLB_LEGACY_ROSTER_MAX}`);
    fireEvent.click(screen.getByText('Roster'));
    expect(rows()).toHaveLength(13);
    expect(document.querySelector('[data-roster-count]')?.textContent).toContain('13 on the roster');
    cleanup();
    league.teams[team].players = league.teams[team].players.slice(0, MLB_LEGACY_ROSTER_MIN);
    save(league, team);
    render(<MlbFrontOfficeBoard />);
    fireEvent.click(screen.getByText('Roster'));
    expect(document.querySelector('[data-cut-block]')?.textContent).toBe(`Your roster is at the minimum of ${MLB_LEGACY_ROSTER_MIN}, so nobody else can go.`);
  });
});
