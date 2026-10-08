/**
 * Review probe, Round 1105 (never committed). Runs on the BRANCH: loads the saves main's code wrote
 * (RV_SAVE_IN, from rvBaseSave.test.tsx) through the branch's real hook, real engine and real decoder.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const state = vi.hoisted(() => ({ tableReads: 0, toasts: [] as string[] }));
const KEY_FILE = path.resolve(process.cwd(), 'scripts/data/collegeGridPlayers.json');
const SEARCH_FILE = path.resolve(process.cwd(), 'src/data/collegeGrid/collegeGridSearch.json');
const JUDGE_FILE = path.resolve(process.cwd(), 'src/data/collegeGrid/collegeGridJudge.json');
const TABLE_COLUMNS = ['id', 'display_name', 'name_norm', 'colleges', 'colleges_agreed', 'groups', 'best_pick', 'first_round', 'undrafted', 'heisman_year', 'first_season', 'seasons', 'dup'];

vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    if (table === 'college_grid_players') state.tableReads += 1;
    throw new Error(`network stubbed to throw: ${table}`);
  };
  return {
    SUPABASE_URL: 'https://offline.invalid',
    SUPABASE_PUBLISHABLE_KEY: 'offline',
    supabase: { from, functions: { invoke: () => { throw new Error('invoke'); } }, rpc: () => { throw new Error('rpc'); } },
  };
});
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: async () => undefined }) }));
vi.mock('sonner', () => {
  const say = (m: unknown) => { state.toasts.push(String(m)); };
  return { toast: Object.assign(say, { success: say, error: say, info: say }) };
});
vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), getCurrentPlayerName: () => 'review bot' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: async () => [] }));

import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import * as real from '@/lib/collegeGrid';
import searchUrl from '@/data/collegeGrid/collegeGridSearch.json?url';
import judgeUrl from '@/data/collegeGrid/collegeGridJudge.json?url';

interface Save { kind: string; board: string; storage: [string, string][]; expect: { correct: number; guessesLeft: number; status: string; names: (string | null)[] } }
const saves = JSON.parse(fs.readFileSync(process.env.RV_SAVE_IN as string, 'utf8')) as Save[];
let entries: real.CollegeGridEntry[];

beforeAll(() => {
  const file = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8')) as { columns: string[]; rows: unknown[][] };
  const at = TABLE_COLUMNS.map((c) => file.columns.indexOf(c));
  entries = real.indexCollegeEntries(file.rows.map((r) => Object.fromEntries(TABLE_COLUMNS.map((c, k) => [c, r[at[k]]]))));
  const shipped = new Map([[searchUrl, SEARCH_FILE], [judgeUrl, JUDGE_FILE]]);
  vi.stubGlobal('fetch', async (url: unknown) => {
    const f = shipped.get(String(url));
    if (!f) throw new Error(`network stubbed to throw: fetch ${String(url)}`);
    const text = fs.readFileSync(f, 'utf8');
    return { ok: true, json: async () => JSON.parse(text) };
  });
}, 120_000);
afterEach(() => { cleanup(); vi.useRealTimers(); });
afterAll(() => { vi.unstubAllGlobals(); });

describe("saves written by main's code load on the branch", () => {
  it('there are three saves to load', () => { expect(saves.map((s) => s.kind)).toEqual(['inprogress', 'won', 'lost']); });

  for (const s of saves) {
    it(`${s.kind}: restored exactly, and not one saved byte moves on load`, async () => {
      localStorage.clear();
      for (const [k, v] of s.storage) localStorage.setItem(k, v);
      const snap = () => JSON.stringify(s.storage.map(([k]) => [k, localStorage.getItem(k)]));
      const before = snap();
      const { result } = renderHook(() => useCollegeGrid());
      await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 60_000 });
      const r = () => result.current;
      expect(r().puzzle.id, 'same board as main dealt').toBe(s.board);
      expect(r().correctCount).toBe(s.expect.correct);
      expect(r().guessesLeft).toBe(s.expect.guessesLeft);
      expect(r().gameStatus).toBe(s.expect.status);
      expect(r().cells.map((c) => (c.status === 'correct' ? c.playerName : null))).toEqual(s.expect.names);
      await waitFor(() => expect(r().keyReady).toBe(true), { timeout: 60_000 });
      expect(snap(), 'every key main wrote is byte identical after the load and after the key landed').toBe(before);
      expect(state.tableReads).toBe(0);
      const dailyKey = s.storage.map(([k]) => k).find((k) => k.startsWith('college-grid-daily-')) as string;
      const old = JSON.parse(localStorage.getItem(dailyKey) as string);
      console.log(`RVLOAD| ${s.kind}: board ${r().puzzle.id}, correct ${r().correctCount}, left ${r().guessesLeft}, status ${r().gameStatus}; top keys ${Object.keys(old).join(',')}`);

      if (s.kind !== 'inprogress') {
        /* A finished board takes no more picks. */
        act(() => r().setActiveCell(1));
        await act(async () => { await r().submitGuess('Tom Brady'); });
        expect(snap(), 'a pick on a finished board writes nothing').toBe(before);
        return;
      }
      /* One more yes and one more no on top of main's log: the old actions stay a byte identical prefix. */
      const taken = new Set(s.expect.names.filter(Boolean));
      const empty = s.expect.names.findIndex((n) => n === null);
      const attrs = [r().puzzle.rows[Math.floor(empty / 3)], r().puzzle.cols[empty % 3]] as const;
      const yes = entries.find((e) => real.judgeCollegeCell(e, attrs[0], attrs[1]) === 'yes' && !taken.has(e.name)) as real.CollegeGridEntry;
      const no = entries.find((e) => real.judgeCollegeCell(e, attrs[0], attrs[1]) === 'no') as real.CollegeGridEntry;
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      act(() => r().setActiveCell(empty));
      await act(async () => { await r().submitGuess(no.name); });
      await act(async () => { vi.advanceTimersByTime(2000); });
      act(() => r().setActiveCell(empty));
      await act(async () => { await r().submitGuess(yes.name); });
      await act(async () => { vi.advanceTimersByTime(2000); });
      const now = JSON.parse(localStorage.getItem(dailyKey) as string);
      expect(Object.keys(now), 'same top level keys in the same order').toEqual(Object.keys(old));
      expect({ ...now, guesses: null, gameStatus: null }).toEqual({ ...old, guesses: null, gameStatus: null });
      expect(JSON.stringify(now.guesses.slice(0, old.guesses.length)), "main's actions are an untouched prefix").toBe(JSON.stringify(old.guesses));
      expect(now.guesses.length).toBe(old.guesses.length + 2);
      const shapes = (list: Record<string, unknown>[]) => [...new Set(list.map((g) => `${String(g.t)}:${Object.keys(g).join(',')}`))].sort();
      expect(shapes(now.guesses.slice(old.guesses.length)), 'the new actions have the shapes main wrote').toEqual(shapes(old.guesses));
      expect(r().correctCount).toBe(s.expect.correct + 1);
      expect(r().guessesLeft).toBe(s.expect.guessesLeft - 2);
      console.log(`RVLOAD| inprogress: +1 no (${no.name}) +1 yes (${yes.name}) on cell ${empty}; action shapes ${shapes(now.guesses).join(' | ')}`);
    }, 120_000);
  }
});
