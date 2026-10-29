/**
 * Reviewer (run lens) for Round 1570, copied into src/test only on the runner, never committed.
 * Saves made by the BASE's code (Round 1569's head, .rc/x/review-run-genbase.mjs) are loaded one after another
 * on the branch's real board, the way a player who retired many careers before this round would open them:
 *   - the save's bytes never change on load;
 *   - the only write of a first visit is one setItem on the wall key, and a second visit writes nothing;
 *   - the plaque's Hall record is exactly the card the BASE showed for that save;
 *   - the New career prompt says the card stays;
 *   - the wall after each load equals an independent model of the one eviction rule, over real outcomes.
 */
import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined, dismiss: () => undefined }) }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { HALL_WALL_ENTRY_MAX_BYTES, hallWallKey, wallKeyOf, type HallWallEntry } from '@/lib/usCareerHallWall';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

const SAVES = JSON.parse(readFileSync(process.env.BASE_SAVES!, 'utf8')) as { sports: Record<string, { kind: string; name: string; raw: string; card: unknown }[]> };
const ROWS: { label: string; sport: UsCareerSport }[] = [
  { label: 'NFL', sport: NFL_CAREER_SPORT }, { label: 'NBA', sport: NBA_CAREER_SPORT },
  { label: 'MLB', sport: MLB_CAREER_SPORT }, { label: 'NHL', sport: NHL_CAREER_SPORT },
];
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const mount = (sport: UsCareerSport) => render(<StrictMode><MemoryRouter><UsCareerBoard sport={sport} /></MemoryRouter></StrictMode>);
const readWall = (sport: UsCareerSport) => {
  const raw = localStorage.getItem(hallWallKey(sport.slug));
  return raw ? (JSON.parse(raw) as { v: number; entries: HallWallEntry[] }) : null;
};
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 60)); });
const button = (name: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(name));
const KEPT = ' The Hall of Fame card stays on your Hall wall.';

/** An independent model of the rule: in place if the key is up; else the new one first, then past 12 the oldest
 *  of the ones already up that missed the Hall comes down, or the oldest when all of those are in. */
function model(list: { key: string; inducted: boolean }[], key: string, inducted: boolean) {
  const at = list.findIndex(e => e.key === key);
  if (at >= 0) { const next = list.slice(); next[at] = { key, inducted }; return next; }
  const next = [{ key, inducted }, ...list];
  while (next.length > 12) {
    const old = next.slice(1);
    let idx = -1;
    for (let j = old.length - 1; j >= 0; j -= 1) if (!old[j].inducted) { idx = j + 1; break; }
    next.splice(idx >= 0 ? idx : next.length - 1, 1);
  }
  return next;
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(mulberry32(1570));
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe.each(ROWS)('$label: base saves loaded one after another on the branch board', ({ label, sport }) => {
  it('save bytes, one write, the base card, the prompt, and the eviction rule', async () => {
    const rows = SAVES.sports[sport.slug];
    expect(rows.length).toBeGreaterThan(12);
    let expected: { key: string; inducted: boolean }[] = [];
    const tally: Record<string, number> = {};
    for (const [i, row] of rows.entries()) {
      cleanup();
      localStorage.removeItem(sport.saveKey);
      localStorage.setItem(sport.saveKey, row.raw);
      const c = JSON.parse(row.raw).c as UsCareerCore;
      const key = wallKeyOf(c, sport.hall!);
      const writes = vi.spyOn(Storage.prototype, 'setItem');
      mount(sport);
      await waitFor(() => expect(readWall(sport)?.entries.some(e => e.key === key), `${label} row ${i} (${row.kind}) plaque up`).toBe(true), { timeout: 10000 });
      await settle();
      expect(localStorage.getItem(sport.saveKey), `${label} row ${i} save bytes`).toBe(row.raw);
      expect(writes.mock.calls.map(([k]) => k), `${label} row ${i} writes`).toEqual([hallWallKey(sport.slug)]);
      const wall = readWall(sport)!;
      const mine = wall.entries.find(e => e.key === key)!;
      expect(mine.hall, `${label} row ${i} (${row.kind}) plaque vs the base card`).toEqual(row.card);
      expect(mine.name, `${label} row ${i} name kept whole`).toBe(row.name);
      expect(JSON.stringify(mine).length).toBeLessThanOrEqual(HALL_WALL_ENTRY_MAX_BYTES);
      expected = model(expected, key, mine.hall.outcome === 'inducted');
      expect(wall.entries.map(e => e.key), `${label} row ${i} wall order`).toEqual(expected.map(e => e.key));
      tally[mine.hall.outcome] = (tally[mine.hall.outcome] ?? 0) + 1;
      // The New career prompt of this retired save says the card stays.
      await waitFor(() => expect(button('New career'), `${label} row ${i} New career button`).toBeTruthy(), { timeout: 20000 });
      fireEvent.click(button('New career')!);
      const dialog = await waitFor(() => within(document.body).getByRole('alertdialog', { name: 'Start a new career?' }));
      expect(dialog.textContent, `${label} row ${i} prompt`).toContain(KEPT.trim());
      fireEvent.click(within(dialog).getByRole('button', { name: 'Keep this career' }));
      // A second visit of the same save writes nothing.
      cleanup(); writes.mockClear();
      mount(sport);
      await settle(); await settle();
      expect(writes.mock.calls, `${label} row ${i} second visit`).toEqual([]);
      writes.mockRestore();
    }
    console.log(`REVIEW ${label}: ${rows.length} base saves, final wall ${expected.length}, outcomes ${JSON.stringify(tally)}, wall bytes ${localStorage.getItem(hallWallKey(sport.slug))!.length}`);
  }, 600000);
});
