import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { capUsed, initLeague, type GmPlayer } from '@/lib/frontOffice';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const OTHER = 'front-office-save-retry-unrelated';
const NOTICE = 'Franchise progress is not saved on this device.';
const FLOOR = 'Your roster is at the minimum of 6, so nobody else can go.';

function random(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Explicitly fictional contract rows in a real constructor-created saved league.
 * Only this fixture's main-key writes can throw; every other write delegates. */
function fixture(count: number, refuse: boolean) {
  const league = initLeague(random(73));
  const positions: GmPlayer['pos'][] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'DB'];
  league.teams.KC.players = Array.from({ length: count }, (_, i): GmPlayer => ({
    id: 'save-retry-fixture-' + i, name: 'Save retry fixture ' + (i + 1),
    pos: positions[i % positions.length], age: 24, ovr: 70,
    salary: 2, years: 2, out: 0, pot: 80,
  }));
  const raw = JSON.stringify({ league, myTeam: 'KC', phase: 'hub', titles: 0,
    seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw);
  localStorage.setItem(OTHER, 'held');
  const originalSet = Storage.prototype.setItem;
  const attempts: string[] = [];
  let blocked = refuse;
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
    if (this === localStorage && key === KEY) {
      attempts.push(String(value));
      if (blocked) throw new DOMException('Fictional fixture quota refusal', 'QuotaExceededError');
    }
    originalSet.call(this, key, value);
  });
  const removals = vi.spyOn(Storage.prototype, 'removeItem');
  render(<FrontOfficeBoard />);
  const roster = buttons().find(control => [...control.children].some(child => child.textContent?.trim() === 'Roster'));
  expect(roster, 'The existing hub must expose its Roster box').toBeTruthy();
  fireEvent.click(roster!);
  expect(attempts).toEqual([]);
  expect(localStorage.getItem(KEY)).toBe(raw);
  return { league, raw, attempts, removals, allowWrites: () => { blocked = false; } };
}
function buttons() { return [...document.querySelectorAll<HTMLButtonElement>('button')]; }
function rows() { return [...document.querySelectorAll<HTMLElement>('[data-roster-row]')]; }
function cut(index: number) {
  const row = document.querySelector<HTMLElement>('[data-roster-row="save-retry-fixture-' + index + '"]');
  expect(row, 'The real active roster must contain the fixture player').not.toBeNull();
  const first = row!.querySelector<HTMLButtonElement>('button')!;
  expect(first.disabled).toBe(false);
  fireEvent.click(first);
  const confirm = [...row!.querySelectorAll<HTMLButtonElement>('button')].find(control => control.textContent?.trim() === 'Cut him');
  expect(confirm, 'The existing first tap must open the real confirmation').toBeTruthy();
  fireEvent.click(confirm!);
}
function retry() {
  const control = buttons().find(button => button.textContent?.trim() === 'Retry save');
  expect(control, 'The failed write must have a native Retry save action').toBeTruthy();
  fireEvent.click(control!);
}
function noticeCount() {
  return [...document.querySelectorAll<HTMLElement>('[role="alert"]')].filter(node => node.textContent?.includes(NOTICE)).length;
}
function observe(name: string, value: unknown) {
  console.log('FO_SAVE_RETRY_RAW ' + JSON.stringify({ name, value }));
  if (process.env.POPULAR_FO_SAVE_RAW) {
    mkdirSync(process.env.POPULAR_FO_SAVE_RAW, { recursive: true });
    writeFileSync(path.join(process.env.POPULAR_FO_SAVE_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
}
function attemptedTeam(bytes: string) {
  return (JSON.parse(bytes) as { league: { teams: Record<string, Parameters<typeof capUsed>[0]> } }).league.teams.KC;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(random(103));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL Front Office refused save recovery', () => {
  it('a real Cut reports its refused write and retries the exact pending snapshot until storage accepts it', () => {
    const f = fixture(7, true);
    const otherClubs = JSON.stringify(Object.fromEntries(Object.entries(f.league.teams).filter(([abbr]) => abbr !== 'KC')));
    cut(6);
    expect(rows()).toHaveLength(6);
    expect(f.attempts).toHaveLength(1);
    const pending = f.attempts[0];
    const team = attemptedTeam(pending);
    expect(team.players.map(player => player.id)).toEqual([
      'save-retry-fixture-0', 'save-retry-fixture-1', 'save-retry-fixture-2',
      'save-retry-fixture-3', 'save-retry-fixture-4', 'save-retry-fixture-5',
    ]);
    expect(team.deadCap).toEqual([{ playerId: 'save-retry-fixture-6', name: 'Save retry fixture 7', amount: 1, seasonsLeft: 2 }]);
    expect(capUsed(team)).toBe(13);
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    expect(localStorage.getItem(OTHER)).toBe('held');
    expect(document.querySelector('[data-cut-block]')?.textContent).toBe(FLOOR);
    expect(f.removals.mock.calls).toEqual([]);
    const raw: Record<string, unknown> = {
      initialRoster: 7, currentRoster: rows().length, diskRoster: attemptedTeam(f.raw).players.length,
      attempts: f.attempts.length, pendingRoster: team.players.length, pendingCap: capUsed(team),
      diskBytesHeld: localStorage.getItem(KEY) === f.raw, unrelatedHeld: localStorage.getItem(OTHER) === 'held',
      noticeCount: noticeCount(), afterRetry: null,
    };
    observe('refused', raw);
    expect(document.body.textContent, 'FO_SAVE_REFUSAL_NOTICE: the real refused write must tell the player that current progress is unsaved').toContain(NOTICE);
    expect(noticeCount()).toBe(1);
    retry();
    expect(f.attempts).toEqual([pending, pending]);
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    expect(noticeCount()).toBe(1);
    f.allowWrites();
    retry();
    expect(f.attempts).toEqual([pending, pending, pending]);
    expect(localStorage.getItem(KEY)).toBe(pending);
    expect(noticeCount()).toBe(0);
    expect(document.body.textContent).not.toContain(NOTICE);
    expect(rows()).toHaveLength(6);
    expect(document.querySelector('[data-cut-block]')?.textContent).toBe(FLOOR);
    expect(localStorage.getItem(OTHER)).toBe('held');
    expect(f.removals.mock.calls).toEqual([]);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(JSON.stringify(Object.fromEntries(Object.entries(saved.league.teams).filter(([abbr]) => abbr !== 'KC')))).toBe(otherClubs);
    raw.afterRetry = { attempts: f.attempts.length, exactPendingWritten: localStorage.getItem(KEY) === pending,
      currentRoster: rows().length, savedRoster: attemptedTeam(localStorage.getItem(KEY)!).players.length,
      noticeCount: noticeCount(), unrelatedHeld: localStorage.getItem(OTHER) === 'held' };
    observe('refused', raw);
  });

  it('two real refused Cuts retry the latest complete state rather than overwriting it with the earlier attempt', () => {
    const f = fixture(8, true);
    cut(7);
    expect(rows()).toHaveLength(7);
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    cut(6);
    expect(rows()).toHaveLength(6);
    expect(f.attempts).toHaveLength(2);
    const first = f.attempts[0], latest = f.attempts[1];
    expect(first).not.toBe(latest);
    expect(attemptedTeam(first).players).toHaveLength(7);
    const latestTeam = attemptedTeam(latest);
    expect(latestTeam.players).toHaveLength(6);
    expect(latestTeam.deadCap).toEqual([
      { playerId: 'save-retry-fixture-7', name: 'Save retry fixture 8', amount: 1, seasonsLeft: 2 },
      { playerId: 'save-retry-fixture-6', name: 'Save retry fixture 7', amount: 1, seasonsLeft: 2 },
    ]);
    expect(capUsed(latestTeam)).toBe(14);
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    expect(localStorage.getItem(OTHER)).toBe('held');
    expect(f.removals.mock.calls).toEqual([]);
    const raw: Record<string, unknown> = {
      initialRoster: 8, currentRoster: rows().length, diskRoster: attemptedTeam(f.raw).players.length,
      attempts: f.attempts.length, attemptedRosters: f.attempts.map(bytes => attemptedTeam(bytes).players.length),
      pendingCap: capUsed(latestTeam), diskBytesHeld: localStorage.getItem(KEY) === f.raw,
      unrelatedHeld: localStorage.getItem(OTHER) === 'held', noticeCount: noticeCount(), afterRetry: null,
    };
    observe('latest', raw);
    expect(document.body.textContent, 'FO_SAVE_LATEST_NOTICE: a later refused action must keep an honest unsaved warning and the latest retry state').toContain(NOTICE);
    expect(noticeCount()).toBe(1);
    f.allowWrites();
    retry();
    expect(f.attempts).toEqual([first, latest, latest]);
    expect(localStorage.getItem(KEY)).toBe(latest);
    expect(localStorage.getItem(KEY)).not.toBe(first);
    expect(attemptedTeam(localStorage.getItem(KEY)!).players).toHaveLength(6);
    expect(noticeCount()).toBe(0);
    expect(rows()).toHaveLength(6);
    expect(f.removals.mock.calls).toEqual([]);
    expect(localStorage.getItem(OTHER)).toBe('held');
    raw.afterRetry = { attempts: f.attempts.length, exactLatestWritten: localStorage.getItem(KEY) === latest,
      savedRoster: attemptedTeam(localStorage.getItem(KEY)!).players.length,
      noticeCount: noticeCount(), unrelatedHeld: localStorage.getItem(OTHER) === 'held' };
    observe('latest', raw);
  });

  it('a healthy real Cut still writes once with the existing cap cost and no refused-save warning', () => {
    const f = fixture(7, false);
    cut(6);
    const stored = localStorage.getItem(KEY)!;
    const team = attemptedTeam(stored);
    observe('healthy', { initialRoster: 7, currentRoster: rows().length,
      savedRoster: team.players.length, attempts: f.attempts.length,
      exactAttemptWritten: stored === f.attempts[0], cap: capUsed(team),
      deadCap: team.deadCap, noticeCount: noticeCount(),
      unrelatedHeld: localStorage.getItem(OTHER) === 'held', removals: f.removals.mock.calls.length });
    expect(rows()).toHaveLength(6);
    expect(team.players).toHaveLength(6);
    expect(f.attempts).toEqual([stored]);
    expect(stored).not.toBe(f.raw);
    expect(team.deadCap).toEqual([{ playerId: 'save-retry-fixture-6', name: 'Save retry fixture 7', amount: 1, seasonsLeft: 2 }]);
    expect(capUsed(team)).toBe(13);
    expect(document.querySelector('[data-cut-block]')?.textContent).toBe(FLOOR);
    expect(document.body.textContent).not.toContain(NOTICE);
    expect(noticeCount()).toBe(0);
    expect(buttons().some(control => control.textContent?.trim() === 'Retry save')).toBe(false);
    expect(f.removals.mock.calls).toEqual([]);
    expect(localStorage.getItem(OTHER)).toBe('held');
  });
});
