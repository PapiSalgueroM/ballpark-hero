import fs from 'node:fs';
import path from 'node:path';
import { StrictMode, type ComponentType } from 'react';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCore, UsCareerSeason, UsCareerSport } from '@/lib/usCareerSport';

const calls = vi.hoisted(() => ({ completion: vi.fn(), activity: vi.fn() }));
vi.mock('@/lib/completions', () => ({ recordCompletion: calls.completion, recordActivity: calls.activity, getCurrentPlayerName: () => 'Recorded season fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() } }));

type SportCase = { label: 'NBA' | 'NFL'; Board: ComponentType; sport: UsCareerSport };
const NBA: SportCase = { label: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT };
const NFL: SportCase = { label: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT };
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();
function fixture(row: SportCase, played: boolean) {
  const sport = row.sport, pos = sport.create.defaultPos;
  const career = sport.startCareer('Recorded Season Player', pos, sport.create.archetypes[pos][0], () => 0.4, defaultAppearance(), 'now');
  Object.assign(career, { ovr: 70, pot: 90, health: 100, contractYears: 3, role: 'starter' });
  let line: UsCareerSeason | null = null;
  if (played) {
    line = sport.simSeason(career, 75, () => 0.4).line;
    sport.progress(career, () => 0.4);
    expect(career.seasons[career.seasons.length - 1], 'POPULAR_CAREER_SETUP_REAL_RECORDED_ROW').toEqual(line);
  }
  // Controlled saved-screen fixture: no pending question masks the Play card under test.
  Object.assign(career, { pendingRivalryEvent: null, pendingRivalryChoice: null, summer: undefined });
  const raw = JSON.stringify({ c: career, phase: 'season', teamQuality: 75, coach: null });
  localStorage.setItem(sport.saveKey, raw);
  const otherKey = row.label === 'NBA' ? NFL.sport.saveKey : NBA.sport.saveKey;
  localStorage.setItem(otherKey, 'UNRELATED_CAREER_UNCHANGED');
  return { career, line, raw, otherKey };
}
function mount(row: SportCase) {
  return render(<StrictMode><MemoryRouter><row.Board /></MemoryRouter></StrictMode>);
}
function snapshot(view: ReturnType<typeof render>) {
  const play = view.getByRole('button', { name: /^Play the \d+ season$/ });
  const card = play.parentElement!;
  const summary = Array.from(card.children).find(element =>
    element.tagName === 'P' && element.textContent?.trim().startsWith('Last season:'));
  return { summary: summary ? clean(summary.textContent ?? '') : null, playEnabled: !play.hasAttribute('disabled') };
}
function retain(name: string, value: unknown) {
  const receipt = { case: name, fixture: 'Real current sport constructor and optional real simulated season, seeded as a controlled ordinary saved screen. This is not a natural career or user-report reproduction.', value };
  const out = process.env.POPULAR_CAREER_RELOAD_RAW;
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  }
  console.info('POPULAR_CAREER_RELOAD_RAW ' + JSON.stringify(receipt));
}
function restoredRecord(row: SportCase) {
  const saved = fixture(row, true), before = JSON.stringify(saved.career);
  const expected = clean('Last season: ' + row.sport.statLine(saved.line!, saved.career.pos) + ' · ' + saved.line!.teamResult);
  const write = vi.spyOn(Storage.prototype, 'setItem'), remove = vi.spyOn(Storage.prototype, 'removeItem');
  const first = mount(row), firstView = snapshot(first);
  first.unmount();
  const second = mount(row), secondView = snapshot(second);
  const storage = localStorage.getItem(row.sport.saveKey), inputHeld = JSON.stringify(saved.career) === before;
  retain(row.label.toLowerCase() + '-recorded', { expected, first: firstView, reloaded: secondView,
    storedRows: (JSON.parse(storage!) as { c: UsCareerCore }).c.seasons.length,
    savedBytesHeld: storage === saved.raw, inputHeld, writes: write.mock.calls, removals: remove.mock.calls,
    completions: calls.completion.mock.calls, activity: calls.activity.mock.calls });
  expect(storage).toBe(saved.raw);
  expect(inputHeld).toBe(true);
  expect(localStorage.getItem(saved.otherKey)).toBe('UNRELATED_CAREER_UNCHANGED');
  expect(write).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  expect(calls.completion).not.toHaveBeenCalled(); expect(calls.activity).not.toHaveBeenCalled();
  expect(firstView.playEnabled).toBe(true); expect(secondView.playEnabled).toBe(true);
  const marker = 'POPULAR_CAREER_SAVED_LAST_SEASON_' + row.label;
  expect(firstView.summary, marker).toBe(expected);
  expect(secondView.summary, marker).toBe(expected);
}
function emptyRecord(row: SportCase) {
  const saved = fixture(row, false);
  expect(saved.career.seasons, 'POPULAR_CAREER_SETUP_EMPTY_RECORD').toHaveLength(0);
  const write = vi.spyOn(Storage.prototype, 'setItem'), remove = vi.spyOn(Storage.prototype, 'removeItem');
  const first = mount(row), firstView = snapshot(first);
  first.unmount();
  const second = mount(row), secondView = snapshot(second);
  retain(row.label.toLowerCase() + '-empty', { first: firstView, reloaded: secondView,
    savedBytesHeld: localStorage.getItem(row.sport.saveKey) === saved.raw, writes: write.mock.calls, removals: remove.mock.calls });
  expect(firstView).toEqual({ summary: null, playEnabled: true });
  expect(secondView).toEqual({ summary: null, playEnabled: true });
  expect(localStorage.getItem(row.sport.saveKey)).toBe(saved.raw);
  expect(localStorage.getItem(saved.otherKey)).toBe('UNRELATED_CAREER_UNCHANGED');
  expect(write).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  expect(calls.completion).not.toHaveBeenCalled(); expect(calls.activity).not.toHaveBeenCalled();
}
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.spyOn(Math, 'random').mockReturnValue(0.4);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); });

describe('Popular careers saved last season continuity', () => {
  it('NBA restores the real saved stat line and team result on repeated cold mounts', () => restoredRecord(NBA));
  it('NFL restores the real saved stat line and team result on repeated cold mounts', () => restoredRecord(NFL));
  it('NBA keeps an unplayed career free of an invented last season', () => emptyRecord(NBA));
  it('NFL keeps an unplayed career free of an invented last season', () => emptyRecord(NFL));
});
