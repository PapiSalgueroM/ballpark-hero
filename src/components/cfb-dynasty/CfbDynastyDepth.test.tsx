/**
 * Round 728: the program layer on the board.
 *
 * Coordinators, rivalry week and strength of schedule are new save fields, so
 * the board has to carry a dynasty saved before them without changing it,
 * give a new dynasty its staff, and run an offseason hiring window that
 * refuses what the pot cannot cover. scripts/simCfbStaff.mjs runs this file
 * (section 8) and proves the engine side with its own negative controls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { initCfb, simCfbRound, cfbOpenOffseason, CFB_ROUNDS, type CfbState } from '@/lib/cfbDynasty';
import CfbDynastyBoard from '@/components/cfb-dynasty/CfbDynastyBoard';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const SAVE_KEY = 'cfb-dynasty-save-v1';

function lehmer(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const save = (shape: any) => localStorage.setItem(SAVE_KEY, JSON.stringify(shape));
const read = (): any => JSON.parse(localStorage.getItem(SAVE_KEY)!);

/* A dynasty with the layer on, its season played, its hiring window open. */
function windowState(): CfbState {
  const rng = lehmer(31);
  const st = initCfb('UGA', rng, { depth: true });
  for (let r = 1; r <= CFB_ROUNDS; r += 1) { simCfbRound(st, rng); if (r < CFB_ROUNDS) st.round += 1; }
  cfbOpenOffseason(st, rng);
  /* Make the dearest OC on the market cost more than the chair does now. */
  st.teams.UGA.staff!.OC = { ...st.teams.UGA.staff!.OC!, salary: 3 };
  return st;
}

describe('CFB Dynasty: the program layer on the board', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); });

  it('plays a save from before coordinators existed without adding anything to it', () => {
    const st = initCfb('UGA', lehmer(7));
    save({ st, phase: 'season', recruits: null, portal: null });
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Play Week 1'));
    const after = read();
    expect(after.st.round).toBe(2);
    expect(after.st.depth).toBeUndefined();
    expect(after.st.teams.UGA.staff).toBeUndefined();
    fireEvent.click(screen.getByText('Schedule'));
    expect(screen.getByText(/started before the schedule log existed/)).toBeTruthy();
  });

  it('gives a new dynasty its coordinators and a schedule with a strength', () => {
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getByText('Georgia'));
    const s = read();
    expect(s.st.depth).toBe(1);
    expect(s.st.teams.UGA.staff.OC.name).toBeTruthy();
    expect(s.st.teams.UGA.staff.DC.name).toBeTruthy();
    fireEvent.click(screen.getByText('Play'));
    fireEvent.click(screen.getByText('Play Week 1'));
    expect(read().st.mySlate).toHaveLength(1);
    fireEvent.click(screen.getByText('Schedule'));
    expect(screen.getByText(/Strength of schedule/)).toBeTruthy();
  });

  it('refuses a coordinator the pot cannot cover and changes nothing', () => {
    const st = windowState();
    st.nil = 0;
    const dearest = st.staffWindow!.market.filter(c => c.role === 'OC').sort((a, b) => b.salary - a.salary)[0];
    save({ st, phase: 'recruit', recruits: [], portal: [] });
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getAllByText('Shop')[0]);
    fireEvent.click(screen.getByText(dearest.name).closest('button')!);
    expect(screen.getByText(/Not enough budget for/)).toBeTruthy();
    const after = read();
    expect(after.st.nil).toBe(0);
    expect(after.st.teams.UGA.staff.OC.salary).toBe(3);
  });

  it('lets a coordinator go, puts his pay back in the pot, and hires into the empty chair', () => {
    const st = windowState();
    const pot = st.nil;
    save({ st, phase: 'recruit', recruits: [], portal: [] });
    render(<CfbDynastyBoard />);
    fireEvent.click(screen.getAllByText('Let go')[0]);
    let after = read();
    expect(after.st.teams.UGA.staff.OC).toBeNull();
    expect(after.st.nil).toBe(pot + 3);
    expect(screen.getByText(/A grad assistant calls it/)).toBeTruthy();
    const cheapest = after.st.staffWindow.market.filter((c: any) => c.role === 'OC').sort((a: any, b: any) => a.salary - b.salary)[0];
    fireEvent.click(screen.getByText('Hire'));
    fireEvent.click(screen.getByText(cheapest.name).closest('button')!);
    after = read();
    expect(after.st.teams.UGA.staff.OC.name).toBe(cheapest.name);
    expect(after.st.nil).toBe(pot + 3 - cheapest.salary);
    expect(after.st.nil).toBeGreaterThanOrEqual(0);
  });
});
