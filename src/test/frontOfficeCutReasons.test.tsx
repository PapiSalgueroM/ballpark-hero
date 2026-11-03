import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import FrontOfficeBoard from '@/components/front-office/FrontOfficeBoard';
import { capUsed, initLeague, NFL_ROSTER_MIN, type GmPlayer } from '@/lib/frontOffice';
import { cutRefusal } from '@/lib/frontOfficeCuts';

vi.mock('@/hooks/useGameCompletion', () => ({ useGameCompletion: () => undefined }));
vi.mock('@/lib/completions', () => ({ recordActivity: () => undefined }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => null }));
vi.mock('@/hooks/useRevealScroll', () => ({ useRevealScroll: () => ({ current: null }) }));

const KEY = 'front-office-save-v1';
const OTHER = 'front-office-cut-reason-unrelated';
const REASON = 'Your roster is at the minimum of 6, so nobody else can go.';

function random(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Explicitly fictional players in an ordinary legacy-size saved league.
 * The real league constructor and all other clubs/data stay unchanged. */
function fixture(count: number) {
  const league = initLeague(random(73));
  const positions: GmPlayer['pos'][] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'DB'];
  league.teams.KC.players = positions.slice(0, count).map((pos, i): GmPlayer => ({
    id: 'cut-reason-fixture-' + i, name: 'Cut reason fixture ' + (i + 1),
    pos, age: 24, ovr: 70, salary: 2, years: 2, out: 0, pot: 80,
  }));
  const raw = JSON.stringify({ league, myTeam: 'KC', phase: 'hub', titles: 0,
    seasonsPlayed: 0, draftClass: null, picksLeft: 0 });
  localStorage.setItem(KEY, raw);
  localStorage.setItem(OTHER, 'held');
  render(<FrontOfficeBoard />);
  const roster = [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === 'Roster');
  expect(roster, 'The existing hub must expose its Roster box').toBeTruthy();
  fireEvent.click(roster!);
  return { league, raw };
}

function rows() {
  return [...document.querySelectorAll<HTMLElement>('[data-roster-row]')];
}
function cuts() {
  return rows().map(row => row.querySelector<HTMLButtonElement>('button')!);
}
function observe(name: string, value: unknown) {
  console.log('FO_CUT_REASON_RAW ' + JSON.stringify({ name, value }));
  if (process.env.POPULAR_FO_CUT_RAW) {
    mkdirSync(process.env.POPULAR_FO_CUT_RAW, { recursive: true });
    writeFileSync(path.join(process.env.POPULAR_FO_CUT_RAW, name + '.json'), JSON.stringify(value, null, 2) + '\n');
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(random(103));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('NFL Front Office cut explanations', () => {
  it('the roster floor explains why every Cut is unavailable on touch and keyboard', () => {
    const f = fixture(6);
    expect(NFL_ROSTER_MIN).toBe(6);
    expect(cutRefusal(f.league.teams.KC, NFL_ROSTER_MIN)).toBe(REASON);
    expect(rows()).toHaveLength(6);
    expect(cuts().every(button => button.disabled)).toBe(true);
    expect(cuts().every(button => button.title === REASON)).toBe(true);
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    const reason = document.querySelector<HTMLElement>('[data-roster-cut-refusal]');
    observe('floor', { roster: rows().length, floor: NFL_ROSTER_MIN,
      disabled: cuts().map(button => button.disabled), titles: cuts().map(button => button.title),
      descriptions: cuts().map(button => button.getAttribute('aria-describedby')),
      visibleReason: reason?.textContent ?? null, rawHeld: localStorage.getItem(KEY) === f.raw,
      unrelatedHeld: localStorage.getItem(OTHER) === 'held' });
    expect(reason, 'FO_CUT_REFUSAL_VISIBLE: a disabled Cut needs its real reason outside a hover tooltip').not.toBeNull();
    expect(reason!.textContent).toBe(REASON);
    expect(reason!.closest('[hidden]')).toBeNull();
    expect(reason!.id).not.toBe('');
    expect(document.querySelectorAll('[id="' + reason!.id + '"]')).toHaveLength(1);
    expect(cuts().every(button => button.getAttribute('aria-describedby') === reason!.id)).toBe(true);
    expect(localStorage.getItem(OTHER)).toBe('held');
  });

  it('a roster above the floor keeps every Cut available without a false refusal', () => {
    const f = fixture(7);
    observe('eligible', { roster: rows().length, helper: cutRefusal(f.league.teams.KC, NFL_ROSTER_MIN),
      disabled: cuts().map(button => button.disabled), rawHeld: localStorage.getItem(KEY) === f.raw });
    expect(cutRefusal(f.league.teams.KC, NFL_ROSTER_MIN)).toBeNull();
    expect(rows()).toHaveLength(7);
    expect(cuts().every(button => !button.disabled)).toBe(true);
    expect(document.querySelector('[data-roster-cut-refusal]')).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    expect(localStorage.getItem(OTHER)).toBe('held');
  });

  it('the existing two tap Cut still moves the man once and keeps the exact dead money', () => {
    const f = fixture(7);
    const otherClubs = JSON.stringify(Object.fromEntries(Object.entries(f.league.teams).filter(([abbr]) => abbr !== 'KC')));
    const id = 'cut-reason-fixture-6';
    const row = document.querySelector<HTMLElement>('[data-roster-row="' + id + '"]')!;
    fireEvent.click(row.querySelector('button')!);
    expect(localStorage.getItem(KEY)).toBe(f.raw);
    const confirm = [...row.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === 'Cut him');
    expect(confirm, 'The first tap must open the existing real confirmation').toBeTruthy();
    fireEvent.click(confirm!);
    const saved = JSON.parse(localStorage.getItem(KEY)!);
    const team = saved.league.teams.KC;
    const pooled = saved.league.freeAgents.filter((player: GmPlayer) => player.id === id);
    observe('cut', { roster: team.players.length, pool: pooled.map((player: GmPlayer) => ({ id: player.id, years: player.years, salary: player.salary })),
      deadCap: team.deadCap, released: team.releasedThisSeason, cap: capUsed(team),
      disabled: cuts().map(button => button.disabled), unrelatedHeld: localStorage.getItem(OTHER) === 'held' });
    expect(team.players).toHaveLength(6);
    expect(team.players.some((player: GmPlayer) => player.id === id)).toBe(false);
    expect(pooled).toHaveLength(1);
    expect(pooled[0].years).toBe(1);
    expect(pooled[0].salary).toBe(2);
    expect(team.deadCap).toEqual([{ playerId: id, name: 'Cut reason fixture 7', amount: 1, seasonsLeft: 2 }]);
    expect(team.releasedThisSeason).toEqual([id]);
    expect(capUsed(team)).toBe(13);
    expect(JSON.stringify(Object.fromEntries(Object.entries(saved.league.teams).filter(([abbr]) => abbr !== 'KC')))).toBe(otherClubs);
    expect(cuts().every(button => button.disabled)).toBe(true);
    expect(localStorage.getItem(OTHER)).toBe('held');
  });
});
