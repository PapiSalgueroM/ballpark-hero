import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import NbaBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import NflBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import MlbBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import * as training from '@/lib/careerTraining';
import type { TrainingDrillSkin } from '@/lib/careerTraining';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Fictional practice fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

interface SportCase { label: string; Board: ComponentType; sport: UsCareerSport; burst: string; drill: string; names?: string[] }
const OPEN: SportCase[] = [
  { label: 'NBA', Board: NbaBoard, sport: NBA_CAREER_SPORT, burst: 'Lane Agility', drill: 'lane', names: ['Handles', 'Lane Agility', 'Shooting Spots', 'Passing Reads'] },
  { label: 'NFL', Board: NflBoard, sport: NFL_CAREER_SPORT, burst: 'The 40', drill: 'forty', names: ['Footwork Cones', 'The 40', 'Accuracy Windows', 'Blitz Read'] },
];
const CLOSED: SportCase[] = [
  { label: 'MLB', Board: MlbBoard, sport: MLB_CAREER_SPORT, burst: 'Home to First', drill: 'first' },
  { label: 'NHL', Board: NhlBoard, sport: NHL_CAREER_SPORT, burst: 'Blue Line Sprint', drill: 'sprint' },
];
type Save = { c: UsCareerCore; phase: string; teamQuality: number; coach: null };
const read = (row: SportCase): Save => JSON.parse(localStorage.getItem(row.sport.saveKey)!);
function seed(row: SportCase, banked = false): Save {
  const sport = row.sport, pos = sport.create.defaultPos;
  const c: UsCareerCore = sport.startCareer('Fictional Free Practice Player', pos, sport.create.archetypes[pos][0], () => 0.4, defaultAppearance(), 'now');
  Object.assign(c, { ovr: banked ? 72 : 70, pot: 90, health: 100, contractYears: 3, role: 'starter' });
  if (banked) c.practice = { year: c.year, drill: row.drill, score: 80, before: 70, ovr: 72, tier: 2, gain: 2 };
  const value: Save = { c, phase: 'season', teamQuality: 75, coach: null };
  localStorage.setItem(sport.saveKey, JSON.stringify(value));
  localStorage.setItem('free-practice-sentinel', 'keep this unrelated save');
  return value;
}
const mount = (row: SportCase) => render(<StrictMode><row.Board /></StrictMode>);
async function open(view: ReturnType<typeof render>, banked: boolean) {
  const card = view.getByRole('region', { name: 'Season practice' });
  fireEvent.click(within(card).getByRole('button', { name: banked ? 'View practice' : 'Start practice' }));
  await view.findByRole('button', { name: 'Practice rules' }, { timeout: 10000 });
  return view.getByRole('dialog');
}
const menu = (dialog: HTMLElement, names: string[]) => names.filter(name => within(dialog).queryByRole('button', { name: new RegExp(name) }) !== null);
function raw(name: string, value: unknown) {
  if (!process.env.US_FREE_PRACTICE_RAW) return;
  mkdirSync(process.env.US_FREE_PRACTICE_RAW, { recursive: true });
  writeFileSync(join(process.env.US_FREE_PRACTICE_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}
function finishBurst(dialog: HTMLElement, taps = 25, focus?: HTMLElement) {
  vi.useFakeTimers();
  fireEvent.click(within(dialog).getByRole('button', { name: /Tap to start/ }));
  const floor = within(dialog).getByRole('button', { name: /GO GO GO/ });
  floor.focus();
  for (let i = 0; i < taps; i++) fireEvent.click(floor);
  focus?.focus();
  act(() => { vi.advanceTimersByTime(5000); });
  vi.useRealTimers();
  expect(dialog.querySelector('[data-training-score]')).toHaveTextContent(String(Math.round(taps * 3.2)));
}
function playBurst(dialog: HTMLElement, row: SportCase) {
  fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(row.burst) }));
  finishBurst(dialog);
}
function finishFreeDrill(dialog: HTMLElement, skin: TrainingDrillSkin) {
  fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(skin.name) }));
  if (skin.kind === 'burst') { finishBurst(dialog); return; }
  if (skin.kind === 'cones') {
    for (let n = 1; n <= 8; n++) fireEvent.click(within(dialog).getByRole('button', { name: String(n) }));
  } else if (skin.kind === 'zones') {
    expect(skin.mode).toBe('pick');
    vi.useFakeTimers();
    for (let n = 0; n < 5; n++) {
      fireEvent.click(within(dialog).getByRole('button', { name: skin.verb + ' ' + skin.zones[0] }));
      act(() => { vi.advanceTimersByTime(1100); });
    }
    vi.useRealTimers();
  } else {
    vi.useFakeTimers();
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(skin.startTitle) }));
    act(() => { vi.advanceTimersByTime(12000); });
    vi.useRealTimers();
  }
  const score = dialog.querySelector('[data-training-score]');
  expect(score).not.toBeNull();
  expect(Number(score!.textContent)).toBeGreaterThanOrEqual(0);
  expect(Number(score!.textContent)).toBeLessThanOrEqual(100);
}
vi.setConfig({ testTimeout: 30000 });
beforeAll(async () => {
  await import('@/components/us-career/UsCareerPractice');
  await Promise.all([...OPEN, ...CLOSED].map(row => row.sport.loadTraining(row.sport.create.defaultPos)));
}, 120000);
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.4);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('US free practice after banking', () => {
  it('keeps Escape working after the timed drill replaces the focused keyboard control', async () => {
    const row = OPEN[0];
    seed(row, true);
    const bytes = localStorage.getItem(row.sport.saveKey);
    const view = mount(row);
    const dialog = await open(view, true);
    playBurst(dialog, row);
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('button', { name: 'View practice' })).toHaveFocus();
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
  });

  it('keeps focus on a dialog control that survives the timed result', async () => {
    const row = OPEN[0];
    seed(row, true);
    const view = mount(row);
    const dialog = await open(view, true);
    const close = within(dialog).getByRole('button', { name: 'Close' });
    fireEvent.click(within(dialog).getByRole('button', { name: new RegExp(row.burst) }));
    finishBurst(dialog, 25, close);
    expect(close).toHaveFocus();
  });

  for (const row of OPEN) it(row.label + ' repeats a banked drill without another reward or save', async () => {
    const before = seed(row), view = mount(row), dialog = await open(view, false);
    const banks = vi.spyOn(training, 'bankTrainingRating');
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    playBurst(dialog, row);
    const bank = within(dialog).getByRole('button', { name: 'Bank the session' });
    act(() => { fireEvent.click(bank); fireEvent.click(bank); });
    expect(read(row)).toEqual({ ...before, c: { ...before.c, ovr: 72, practice: { year: before.c.year, drill: row.drill, score: 80, before: 70, ovr: 72, tier: 2, gain: 2 } } });
    expect(banks).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls.filter(([key]) => key === row.sport.saveKey)).toHaveLength(1);
    const bytes = localStorage.getItem(row.sport.saveKey);
    const again = within(dialog).queryByRole('button', { name: 'Try again' });
    raw(row.label.toLowerCase() + '-repeat', { bankedOvr: read(row).c.ovr, gain: read(row).c.practice?.gain, bankCalls: banks.mock.calls.length, writes: writes.mock.calls.length, repeatAvailable: !!again, sourceHeld: JSON.stringify(before.c) === JSON.stringify({ ...read(row).c, ovr: 70, practice: undefined }) });
    expect(again, 'US_FREE_PRACTICE_' + row.label + '_REPEAT').not.toBeNull();
    const draws = vi.mocked(Math.random).mock.calls.length;
    again!.focus();
    fireEvent.click(again!);
    expect(document.activeElement, 'US_FREE_PRACTICE_' + row.label + '_REPLAY_FOCUS').toBe(dialog);
    finishBurst(dialog);
    expect(dialog).toHaveTextContent('Practice only. No career boost.');
    expect(within(dialog).queryByRole('button', { name: 'Bank the session' })).toBeNull();
    const choose = within(dialog).getByRole('button', { name: 'Choose a drill' });
    choose.focus();
    fireEvent.click(choose);
    expect(document.activeElement, 'US_FREE_PRACTICE_' + row.label + '_MENU_FOCUS').toBe(dialog);
    const skin = await row.sport.loadTraining(row.sport.create.defaultPos);
    expect(menu(dialog, skin.drills.map(d => d.name))).toEqual(skin.drills.map(d => d.name));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('button', { name: 'View practice' })).toHaveFocus();
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    expect(banks).toHaveBeenCalledTimes(1);
    expect(writes.mock.calls.filter(([key]) => key === row.sport.saveKey)).toHaveLength(1);
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    expect(localStorage.getItem('free-practice-sentinel')).toBe('keep this unrelated save');
  });

  for (const row of OPEN) it(row.label + ' reopens all four free drills with private randomness and unchanged career bytes', async () => {
    const source = seed(row, true), bytes = localStorage.getItem(row.sport.saveKey);
    const view = mount(row), dialog = await open(view, true);
    const skin = await row.sport.loadTraining(row.sport.create.defaultPos), names = row.names!;
    expect(skin.drills.map(d => d.name)).toEqual(names);
    const actual = menu(dialog, names);
    const banks = vi.spyOn(training, 'bankTrainingRating'), writes = vi.spyOn(Storage.prototype, 'setItem');
    raw(row.label.toLowerCase() + '-all-drills', { names, actual, storedOvr: read(row).c.ovr, saveHeld: localStorage.getItem(row.sport.saveKey) === bytes, bankCalls: banks.mock.calls.length, writes: writes.mock.calls.length });
    expect(actual, 'US_FREE_PRACTICE_' + row.label + '_ALL_DRILLS').toEqual(names);
    const draws = vi.mocked(Math.random).mock.calls.length;
    for (const drill of skin.drills) {
      finishFreeDrill(dialog, drill);
      expect(dialog).toHaveTextContent('Practice only. No career boost.');
      expect(within(dialog).queryByRole('button', { name: 'Bank the session' })).toBeNull();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Choose a drill' }));
    }
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    expect(banks).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
    expect(read(row)).toEqual(source);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    view.unmount();
    const reloaded = mount(row), reopened = await open(reloaded, true);
    expect(menu(reopened, names)).toEqual(names);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    expect(localStorage.getItem('free-practice-sentinel')).toBe('keep this unrelated save');
  });

  for (const row of CLOSED) it(row.label + ' keeps the existing post-bank lock without writes or random draws', async () => {
    const source = seed(row, true), bytes = localStorage.getItem(row.sport.saveKey);
    const view = mount(row), dialog = await open(view, true);
    const skin = await row.sport.loadTraining(row.sport.create.defaultPos);
    const writes = vi.spyOn(Storage.prototype, 'setItem'), draws = vi.mocked(Math.random).mock.calls.length;
    const actual = menu(dialog, skin.drills.map(d => d.name));
    raw(row.label.toLowerCase() + '-lock', { actual, locked: dialog.textContent?.includes('Already trained this season'), saveHeld: localStorage.getItem(row.sport.saveKey) === bytes });
    expect(dialog).toHaveTextContent('Already trained this season');
    expect(actual).toEqual([]);
    expect(within(dialog).queryByRole('button', { name: 'Try again' })).toBeNull();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(vi.mocked(Math.random).mock.calls.length).toBe(draws);
    expect(writes).not.toHaveBeenCalled();
    expect(read(row)).toEqual(source);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
  });
});
