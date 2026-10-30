import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CbbDynastyBoard from '@/components/cbb-dynasty/CbbDynastyBoard';
import { CBB_ROUNDS, initCbb, poyRace, runMarch, simCbbRound, type CbbState } from '@/lib/cbbDynasty';

// These presentation adapters do not replace the board, save codec or engine.
vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'cbb-dynasty-save-v1';
function rng(seed: number) {
  let n = seed;
  return () => { n = n * 16807 % 2147483647; return (n - 1) / 2147483646; };
}
function read() {
  const raw = localStorage.getItem(KEY);
  expect(raw, 'CBB_REPORT_SAVE_PRESENT').not.toBeNull();
  return JSON.parse(raw!) as { st: CbbState; phase: string; march?: unknown };
}
function play(round: number) {
  fireEvent.click(screen.getByText('Play'));
  const button = screen.getByRole('button', { name: `Play Round ${round}` });
  expect(button, 'CBB_REPORT_PLAY_CONTROL').toBeEnabled();
  fireEvent.click(button);
}
function closedSeason(seed: number, legacy = false) {
  const random = rng(seed);
  const st = initCbb('DUKE', random, legacy ? {} : { depth: true });
  for (let round = 1; round <= CBB_ROUNDS; round++) {
    simCbbRound(st, random);
    if (round < CBB_ROUNDS) st.round += 1;
  }
  const result = runMarch(st, random);
  const poy = poyRace(st, random);
  expect(result.champion, 'CBB_REPORT_SETUP_ACTUAL_MARCH').toBeTruthy();
  expect(poy, 'CBB_REPORT_SETUP_ACTUAL_POY').toHaveLength(4);
  st.titles.push({ season: st.season, team: result.champion });
  st.poyWinners.push(poy[0].name);
  st.seasonsPlayed += 1;
  if (result.champion === st.myTeam) st.myTitles += 1;
  return { st, march: { result, poy } };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(rng(64185));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('CBB Dynasty reported stuck-flow diagnostic', () => {
  it('starts a fresh program and continues real games after saving and reloading', () => {
    const first = render(<CbbDynastyBoard />);
    fireEvent.click(screen.getByText('Duke'));
    const started = read();
    expect(started).toMatchObject({ phase: 'season', st: { myTeam: 'DUKE', round: 1 } });
    play(1);
    const played = read();
    expect(played.st.round, 'CBB_REPORT_FRESH_ROUND_ADVANCES').toBe(2);
    expect(played.st.teams.DUKE.wins + played.st.teams.DUKE.losses).toBe(2);
    expect(played.st.mySlate).toHaveLength(2);
    first.unmount();
    render(<CbbDynastyBoard />);
    play(2);
    const continued = read();
    expect(continued.st.round, 'CBB_REPORT_RELOADED_ROUND_ADVANCES').toBe(3);
    expect(continued.st.teams.DUKE.wins + continued.st.teams.DUKE.losses).toBe(4);
    expect(continued.st.myTeam).toBe(started.st.myTeam);
    expect(continued.st.season).toBe(started.st.season);
  });

  it('continues an actual completed season through recruiting into another saved season', () => {
    const { st, march } = closedSeason(64186);
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'recap', recruits: null, portal: null, march }));
    const first = render(<CbbDynastyBoard />);
    const recruit = screen.getByRole('button', { name: 'Hit the recruiting trail' });
    expect(recruit, 'CBB_REPORT_RECAP_HAS_NEXT_ACTION').toBeEnabled();
    fireEvent.click(recruit);
    expect(read().phase).toBe('recruit');
    fireEvent.click(screen.getByRole('button', { name: 'Close the class, run it back' }));
    const next = read();
    expect(next, 'CBB_REPORT_NEXT_SEASON_REACHABLE').toMatchObject({ phase: 'season',
      st: { season: st.season + 1, round: 1, myTeam: st.myTeam, seasonsPlayed: st.seasonsPlayed } });
    expect(next.st.titles).toEqual(st.titles);
    first.unmount();
    render(<CbbDynastyBoard />);
    play(1);
    expect(read().st.round, 'CBB_REPORT_NEXT_SEASON_PLAYS').toBe(2);
  });

  it('restores a supported legacy recap without replaying its closed season', () => {
    const { st } = closedSeason(64187, true);
    expect(st.depth, 'CBB_REPORT_SETUP_LEGACY_LAYER_ABSENT').toBeUndefined();
    localStorage.setItem(KEY, JSON.stringify({ st, phase: 'recap', recruits: null, portal: null }));
    render(<CbbDynastyBoard />);
    expect(screen.getByRole('button', { name: 'Close the class, run it back' }),
      'CBB_REPORT_LEGACY_RECAP_HAS_NEXT_ACTION').toBeEnabled();
    const opened = read();
    expect(opened.phase).toBe('recruit');
    expect(opened.st.season).toBe(st.season);
    expect(opened.st.titles).toEqual(st.titles);
    expect(opened.st.seasonsPlayed).toBe(st.seasonsPlayed);
    fireEvent.click(screen.getByRole('button', { name: 'Close the class, run it back' }));
    const next = read();
    expect(next.st.season, 'CBB_REPORT_LEGACY_NEXT_SEASON').toBe(st.season + 1);
    expect(next.st.depth).toBe(1);
    expect(next.st.titles).toEqual(st.titles);
    expect(next.st.seasonsPlayed).toBe(st.seasonsPlayed);
    play(1);
    expect(read().st.round, 'CBB_REPORT_LEGACY_NEXT_SEASON_PLAYS').toBe(2);
  });
});
