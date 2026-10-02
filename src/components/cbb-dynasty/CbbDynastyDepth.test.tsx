/**
 * Round 823: the program layer on the CBB Dynasty board.
 *
 * Assistant coaches, rivalry night and strength of schedule are new save
 * fields, so the board has to carry a dynasty saved before them without
 * changing it until its offseason closes, switch the layer on for it then,
 * give a new dynasty its staff and a schedule, and run an
 * offseason hiring window that refuses what the pot cannot cover. It also
 * holds the recap fix ported from CFB's Round 426: a reload on the recap
 * must not play the season again. scripts/simCbbStaff.mjs runs this file
 * (section 8) and proves the engine side with its own negative controls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initCbb, simCbbRound, cbbOpenOffseason, runMarch, poyRace, CBB_ROUNDS, type CbbState } from '@/lib/cbbDynasty';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const SAVE_KEY = 'cbb-dynasty-save-v1';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const save = (shape: any) => localStorage.setItem(SAVE_KEY, JSON.stringify(shape));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);

function playRegularSeason(st: CbbState, rng: () => number) {
  for (let r = 1; r <= CBB_ROUNDS; r += 1) { simCbbRound(st, rng); if (r < CBB_ROUNDS) st.round += 1; }
}

/* A dynasty with the layer on, its season played, its hiring window open,
   and an offensive assistant on the books at 3 a season (set by hand, so a
   carousel that poached the real one cannot change the test). */
function windowState(): CbbState {
  const rng = lehmer(31);
  const st = initCbb('UK', rng, { depth: true });
  playRegularSeason(st, rng);
  cbbOpenOffseason(st, rng);
  st.teams.UK.staff!.OC = { id: 'test-oc', name: 'Hollis Pettibone', role: 'OC', rating: 70, salary: 3, since: st.season };
  return st;
}

describe('CBB Dynasty: the program layer on the board', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('plays a save from before assistant coaches existed without adding anything to it', () => {
    const st = initCbb('UK', lehmer(7));
    save({ st, phase: 'season', recruits: null, portal: null });
    render(<CbbDynastyBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Play Round 1'));
    const after = read();
    expect(after.st.round).toBe(2);
    expect(after.st.depth).toBeUndefined();
    expect(after.st.teams.UK.staff).toBeUndefined();
    expect(after.st.teams.UK.opps).toBeUndefined();
    fireEvent.click(screen.getByText('Schedule'));
    expect(screen.getByText(/started before the schedule log existed/)).toBeTruthy();
  });

  /* The board is the only thing that upgrades an old save: simCbbStaff
     section 7 calls cbbEnableDepth itself, so without this a board that
     never called it would leave every pre-823 dynasty without assistants,
     rivalry night or a schedule for good, and stay green. */
  it('gives a save from before assistant coaches existed the program layer when its offseason closes', () => {
    const rng = lehmer(23);
    const st = initCbb('UK', rng);
    playRegularSeason(st, rng);
    runMarch(st, rng);
    st.seasonsPlayed = 1;
    cbbOpenOffseason(st, rng);
    expect(st.depth).toBeUndefined();
    expect(st.staffWindow).toBeUndefined();
    const season = st.season;
    save({ st, phase: 'recruit', recruits: [], portal: [] });
    render(<CbbDynastyBoard />);
    fireEvent.click(screen.getByText(/Close the class, run it back/));
    const after = read();
    expect(after.phase).toBe('season');
    expect(after.st.depth).toBe(1);
    expect(after.st.season).toBe(season + 1);
    expect(after.st.round).toBe(1);
    expect(after.st.seasonsPlayed).toBe(1);
    for (const t of Object.values(after.st.teams) as any[]) {
      expect(t.staff.OC.name).toBeTruthy();
      expect(t.staff.DC.name).toBeTruthy();
    }
    expect(screen.getByText(/New this season: assistant coaches, rivalry night and strength of schedule/)).toBeTruthy();
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Play Round 1'));
    expect(read().st.mySlate).toHaveLength(2);
  });

  it('gives a new dynasty its assistants and a schedule with a strength', () => {
    render(<CbbDynastyBoard />);
    fireEvent.click(screen.getByText('Duke'));
    const s = read();
    expect(s.st.depth).toBe(1);
    expect(s.st.teams.DUKE.staff.OC.name).toBeTruthy();
    expect(s.st.teams.DUKE.staff.DC.name).toBeTruthy();
    expect(screen.getByText(/rivalry night: North Carolina, the in-state game \(both in North Carolina\)/)).toBeTruthy();
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Play Round 1'));
    expect(read().st.mySlate).toHaveLength(2);
    fireEvent.click(screen.getByText('Schedule'));
    expect(screen.getByText(/Strength of schedule/)).toBeTruthy();
  });

  it('refuses an assistant the pot cannot cover and changes nothing', () => {
    const st = windowState();
    st.nil = 0;
    const dearest = st.staffWindow!.market.filter(c => c.role === 'OC').sort((a, b) => b.salary - a.salary)[0];
    expect(dearest.salary).toBeGreaterThan(3);
    save({ st, phase: 'recruit', recruits: [], portal: [] });
    render(<CbbDynastyBoard />);
    fireEvent.click(screen.getAllByText('Shop')[0]);
    fireEvent.click(screen.getByText(dearest.name).closest('button')!);
    expect(screen.getByText(/Not enough budget for/)).toBeTruthy();
    const after = read();
    expect(after.st.nil).toBe(0);
    expect(after.st.teams.UK.staff.OC.salary).toBe(3);
  });

  it('lets an assistant go, puts his pay back in the pot, and hires into the empty chair', () => {
    const st = windowState();
    const pot = st.nil;
    save({ st, phase: 'recruit', recruits: [], portal: [] });
    render(<CbbDynastyBoard />);
    fireEvent.click(screen.getAllByText('Let go')[0]);
    let after = read();
    expect(after.st.teams.UK.staff.OC).toBeNull();
    expect(after.st.nil).toBe(pot + 3);
    expect(screen.getByText(/A grad assistant covers it/)).toBeTruthy();
    const cheapest = after.st.staffWindow.market.filter((c: any) => c.role === 'OC').sort((a: any, b: any) => a.salary - b.salary)[0];
    fireEvent.click(screen.getByText('Hire'));
    fireEvent.click(screen.getByText(cheapest.name).closest('button')!);
    after = read();
    expect(after.st.teams.UK.staff.OC.name).toBe(cheapest.name);
    expect(after.st.nil).toBe(pot + 3 - cheapest.salary);
    expect(after.st.nil).toBeGreaterThanOrEqual(0);
  });

  it('a reload on the recap draws the recap again, and an older recap save goes to recruiting, never replaying the season', () => {
    const rng = lehmer(19);
    const st = initCbb('UK', rng, { depth: true });
    playRegularSeason(st, rng);
    const result = runMarch(st, rng);
    const poy = poyRace(st, rng);
    st.poyWinners = [poy[0].name];
    st.titles.push({ season: st.season, team: result.champion });
    st.seasonsPlayed = 1;
    const wins = st.teams.UK.wins;
    save({ st, phase: 'recap', recruits: null, portal: null, march: { result, poy } });
    render(<CbbDynastyBoard />);
    expect(screen.getByText(/cut down the nets/)).toBeTruthy();
    expect(screen.getByText(/Rivalry night: (beat|lost to) Louisville/)).toBeTruthy();
    expect(screen.queryByText(/Final round \+ March/)).toBeNull();
    cleanup();
    /* The save every older version wrote from the recap: no March on it. */
    save({ st, phase: 'recap', recruits: null, portal: null });
    render(<CbbDynastyBoard />);
    expect(screen.getByText(`The ${st.season + 1} class`)).toBeTruthy();
    const after = read();
    expect(after.phase).toBe('recruit');
    expect(after.st.seasonsPlayed).toBe(1);
    expect(after.st.titles).toHaveLength(1);
    expect(after.st.teams.UK.wins).toBe(wins);
    expect(after.st.round).toBe(CBB_ROUNDS);
  });
});
