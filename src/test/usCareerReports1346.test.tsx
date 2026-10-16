/* Round 1346: the player reports of 2026-10-16 on the real US career board, all four sports.
 *
 * (2) A coach retires from coaching behind the shared confirm: Keep coaching and Escape save nothing, Retire saves
 *     the same save with only coach.done set, the done screen shows, a remount lands on it without a write, and the
 *     retirement screen's card reviews the finished career instead of offering the sideline back.
 * (3) An old coach save written before `done` existed mounts as an active career and is not rewritten on load.
 *
 * The saves are the board's own bytes from scripts/data/usBoardFixture.json (its `coach` save per sport), mounted on
 * the shared board with no Hall bound, the way that fixture was recorded, so every byte compared is one this board
 * wrote. Nothing here reaches the network.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';

interface Saved { c: Record<string, unknown>; phase: string; coach: Record<string, unknown> | null; [k: string]: unknown }
const FIXTURE = path.resolve(process.cwd(), 'scripts/data/usBoardFixture.json');
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as { sports: Record<string, { saves: Record<string, string> }> };
const boards = new Map<UsCareerSport, ComponentType>();
function boardFor(sport: () => UsCareerSport): ComponentType {
  return function Board() {
    const s = sport();
    let B = boards.get(s);
    if (!B) {
      const bound: UsCareerSport = { ...s, hall: undefined };
      B = function NoHallBoard() { return <MemoryRouter><UsCareerBoard sport={bound} /></MemoryRouter>; };
      boards.set(s, B);
    }
    return <B />;
  };
}
const SPORTS: [string, string, ComponentType][] = [
  ['nfl', 'nfl-my-career-save-v1', boardFor(() => NFL_CAREER_SPORT)],
  ['nba', 'nba-my-career-save-v1', boardFor(() => NBA_CAREER_SPORT)],
  ['mlb', 'mlb-my-career-save-v1', boardFor(() => MLB_CAREER_SPORT)],
  ['nhl', 'nhl-my-career-save-v1', boardFor(() => NHL_CAREER_SPORT)],
];
const coachSave = (slug: string) => fixture.sports[slug].saves.coach;
const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as Saved;
const flush = () => act(async () => { await Promise.resolve(); });
const noDialog = () => waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Round 1346: retire from coaching on the real board', () => {
  it.each(SPORTS)('%s: Keep coaching and Escape save nothing, Retire saves only done, and a reload stays retired', async (slug, key, Board) => {
    const bytes = coachSave(slug), before = JSON.parse(bytes) as Saved;
    expect(before.phase).toBe('coach'); expect(before.coach?.done).toBe(false);
    localStorage.setItem(key, bytes);
    const view = render(<Board />); await flush();
    expect(localStorage.getItem(key)).toBe(bytes);
    const opener = view.getByRole('button', { name: 'Retire from coaching' });
    fireEvent.click(opener);
    let dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep coaching' })); await noDialog();
    expect(localStorage.getItem(key)).toBe(bytes);
    fireEvent.click(opener);
    dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.keyDown(dialog, { key: 'Escape' }); await noDialog();
    expect(localStorage.getItem(key)).toBe(bytes);
    fireEvent.click(opener);
    dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retire from coaching' })); await flush(); await noDialog();
    const after = read(key);
    expect(after).toEqual({ ...before, coach: { ...before.coach, done: true } });
    expect(view.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Retire from coaching' })).toBeNull();
    expect(view.queryByRole('button', { name: /^(Coach|Sit out) the \d+ season$/ })).toBeNull();
    const retiredBytes = localStorage.getItem(key);
    view.unmount();
    const again = render(<Board />); await flush();
    expect(again.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(retiredBytes);
    fireEvent.click(again.getByRole('button', { name: /Back to the playing career/ })); await flush();
    expect(again.queryByRole('button', { name: 'Back to the sideline' })).toBeNull();
    fireEvent.click(again.getByRole('button', { name: 'Review coaching career' })); await flush();
    expect(again.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(read(key).coach).toEqual({ ...before.coach, done: true });
  });

  it.each(SPORTS)('%s: an old coach save with no done mounts as an active career and is not rewritten', async (slug, key, Board) => {
    const old = JSON.parse(coachSave(slug)) as Saved;
    delete (old.coach as { done?: boolean }).done;
    const bytes = JSON.stringify(old);
    localStorage.setItem(key, bytes);
    const view = render(<Board />); await flush();
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(view.getByRole('button', { name: 'Retire from coaching' })).toBeInTheDocument();
    expect(view.queryByRole('heading', { name: 'Coaching career complete' })).toBeNull();
    expect(view.getAllByRole('button', { name: /^(Coach|Sit out) the \d+ season$/ }).length).toBe(1);
  });
});
