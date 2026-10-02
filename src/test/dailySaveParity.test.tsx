/**
 * Round 848 review: one tab plays exactly as it did before this round, and
 * every save the code before this round wrote comes back through the new
 * restore unchanged.
 *
 * Round 848 put three things into the one hook every daily game saves
 * through (src/hooks/useDailyPuzzle.ts): a shape check on restore that THROWS
 * A SAVE AWAY, a stale tab guard that can DROP AN ANSWER, and a storage
 * listener. A shape check that refuses a good save wipes a player's day, and
 * a guard that fires in a single tab eats an answer nobody else made. So
 * this file plays every consumer it can drive twice, once through the hook as
 * it stood before this round (R848_PRE_HOOK, written by
 * scripts/simDailySaveHardening.mjs from git) and once through the hook in
 * src, from the same clean storage, with the same inputs, and requires:
 *
 *   1. the stored bytes after every step are identical in both runs, and so
 *      is everything the game hands its page (single tab play is untouched,
 *      nothing was dropped, nothing was written differently), and the
 *      completion was recorded the same number of times;
 *   2. every distinct save the OLD run wrote (no answer, one, mid game, won,
 *      lost, given up, hard mode, the extra fields each game writes) restores
 *      through the NEW hook to exactly what the old hook restored, with the
 *      stored bytes untouched and nothing recorded.
 *
 * A save written by the old code is a real save of real play: each game makes
 * its own items from its own data, which is the only way to catch a per game
 * check that is one field stricter than the game writes.
 *
 * Without R848_PRE_HOOK the rows compare the hook in src with itself, which
 * proves nothing, so they are skipped and say so.
 */
import type { ComponentType } from 'react';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

/* The shared daily mocks (./dailyReload/mocks), plus an answer from the one
   edge function a daily consumer invokes (Soccer Grid's checker): every
   "Fit" name fits, nothing else does. */
const S = vi.hoisted(() => {
  const IGNORED = new Set(['toJSON', '$$typeof', 'constructor', 'asymmetricMatch', 'nodeType', 'length', 'name']);
  const result = (root: string, calls: string[]) => {
    if (root === 'auth') return { data: { session: null, user: null }, error: null };
    const mutating = calls.some((c) => c === 'insert' || c === 'upsert' || c === 'update' || c === 'delete');
    const single = calls.some((c) => c === 'single' || c === 'maybeSingle');
    return { data: root === 'from' && !mutating ? (single ? null : []) : null, error: null, count: 0, status: 200 };
  };
  function build(root: string, calls: string[]): unknown {
    return new Proxy(() => undefined, {
      get(_t, prop) {
        if (typeof prop === 'symbol' || IGNORED.has(prop)) return undefined;
        if (prop === 'then') {
          const settled = result(root, calls);
          return (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) => Promise.resolve(settled).then(ok, err);
        }
        if (prop === 'from') return () => build('from', []);
        if (prop === 'rpc') return () => build('rpc', []);
        if (prop === 'auth') return build('auth', []);
        if (prop === 'functions') {
          return {
            invoke: async (_name: string, opts?: { body?: { playerName?: string } }) => {
              const playerName = opts?.body?.playerName ?? '';
              return { data: { valid: playerName.startsWith('Fit'), fullName: playerName }, error: null };
            },
          };
        }
        return () => build(root, [...calls, String(prop)]);
      },
      apply() { return build(root, calls); },
    });
  }
  const auth = {
    user: null, session: null, profile: null, loading: false,
    signUp: async () => ({ error: null, session: null }), signIn: async () => ({ error: null }), signOut: async () => undefined,
    refreshProfile: async () => undefined, updateProfile: async () => ({ error: null }),
  };
  return { supabase: build('root', []), auth, recordCompletion: vi.fn() };
});
vi.mock('@/integrations/supabase/client', () => ({ SUPABASE_URL: 'https://stub.invalid', SUPABASE_PUBLISHABLE_KEY: 'stub-anon-key', supabase: S.supabase }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => S.auth, AuthProvider: ({ children }: { children: unknown }) => children }));
vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/completions')>()),
  recordCompletion: S.recordCompletion,
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ BADGE_DEFS: [], getBadgeState: () => Promise.resolve([]), getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('sonner', () => {
  const quiet = () => undefined;
  const toast = Object.assign(quiet, { success: quiet, error: quiet, info: quiet, warning: quiet, message: quiet, dismiss: quiet });
  return { toast, Toaster: () => null };
});
if (typeof window !== 'undefined') {
  window.scrollTo = () => undefined;
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined;
}
const recordCompletion = S.recordCompletion;
const resetMocks = () => S.recordCompletion.mockClear();

const IMPL = vi.hoisted(() => ({ which: 'new' as 'new' | 'old', calls: { new: 0, old: 0 }, preSource: '' }));
vi.mock('@/hooks/useDailyPuzzle', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/hooks/useDailyPuzzle')>();
  const prePath = process.env.R848_PRE_HOOK;
  const pre = prePath ? (await import(/* @vite-ignore */ prePath)) as typeof real : null;
  IMPL.preSource = pre ? String(pre.useDailyPuzzle) : '';
  return {
    ...real,
    useDailyPuzzle: ((options: Parameters<typeof real.useDailyPuzzle>[0]) => {
      if (IMPL.which === 'old') {
        if (!pre) throw new Error('R848_PRE_HOOK is not set');
        IMPL.calls.old += 1;
        /* The old hook has no takeNewerSave; a single tab never needs it. */
        return { takeNewerSave: () => false, ...pre.useDailyPuzzle(options) };
      }
      IMPL.calls.new += 1;
      return real.useDailyPuzzle(options);
    }) as typeof real.useDailyPuzzle,
  };
});

/* ------------------------------------------------------------ data loaders */
const F = vi.hoisted(() => ({
  STUB: { pick: '' },
  LADDER_POOL: Array.from({ length: 12 }, (_, i) => ({
    id: `p${String(i).padStart(2, '0')}`, name: `Ladder Player ${i}`, nationality: 'England', position: 'Midfielder',
    seasons: Array.from({ length: 5 }, (_, s) => ({
      season: `201${s}/1${s + 1}`, club: `Club ${i}-${s}`, goals: 1, assists: 1, appearances: 10, marketValue: (i + 1) * 1_000_000, sortOrder: s,
    })),
  })),
  PUCK_POOL: Array.from({ length: 30 }, (_, i) => ({
    playerId: 1000 + i, name: `Skater ${i}`, position: 'C', team: 'TOR', jerseyNumber: i, age: 25,
    country: 'CAN', group: 'forward', careerPoints: 100 + i,
  })),
  VALUE_POOL: Array.from({ length: 6 }, (_, i) => ({
    name: `Made Up ${i}`, club: `Club ${i}`, position: 'Midfielder', age: 20 + i, nationality: 'England',
    marketValue: (i + 1) * 5_000_000, matches: 10, goals: i, assists: i,
  })),
  GRID_NAMES: ['Fit Alpha', 'Fit Bravo', 'Fit Charlie', 'Fit Delta', 'Fit Echo', 'Fit Foxtrot', 'Fit Golf', 'Fit Hotel', 'Fit India', 'Miss 1', 'Miss 2', 'Miss 3', 'Miss 4', 'Miss 5', 'Miss 6', 'Miss 7', 'Miss 8', 'Miss 9', 'Miss 10', 'Miss 11', 'Miss 12', 'Miss 13', 'Miss 14', 'Miss 15'],
}));

vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/careerLadder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/careerLadder')>()),
  fetchCareerPool: async () => F.LADDER_POOL,
}));
vi.mock('@/lib/puckDetective', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/puckDetective')>()),
  fetchPuckDetectivePool: async () => F.PUCK_POOL,
}));
vi.mock('@/lib/fetchTransferValuePool', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/fetchTransferValuePool')>()),
  fetchTransferValuePool: async () => F.VALUE_POOL,
}));
/* The two grids judged on the device get an answer key where every "Fit"
   name fits every cell and every "Miss" name fits none, so a real ok and a
   real miss are both played through the game's own code. */
vi.mock('@/lib/nflGrid', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/nflGrid')>();
  const { normalizeGridName } = await import('@/lib/gridEngine');
  return {
    ...real,
    fetchNflGridData: async () => {
      const players = F.GRID_NAMES.map((name) => ({ name }));
      return { players, byNormalizedName: new Map(players.map((p) => [normalizeGridName(p.name), [p]])) };
    },
    playerMatchesCell: (p: { name: string }) => p.name.startsWith('Fit'),
  };
});
vi.mock('@/lib/collegeGrid', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/collegeGrid')>();
  const { normalizeGridName } = await import('@/lib/gridEngine');
  return {
    ...real,
    fetchCollegeGridData: async () => {
      const players = F.GRID_NAMES.map((name) => ({ name, colleges: [], groups: new Set<string>(), bestPick: null, firstRound: null, undrafted: false, identityOpen: false }));
      return { players, byNormalizedName: new Map(players.map((p) => [normalizeGridName(p.name), [p]])) };
    },
    judgeCollegeCell: (p: { name: string }) => (p.name.startsWith('Fit') ? 'yes' : 'no'),
  };
});
vi.mock('@/components/game/PlayerAutocomplete', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/game/PlayerAutocomplete')>()),
  PlayerAutocomplete: ({ onSelect }: { onSelect: (e: { name: string; rawName: string }) => void }) => {
    const pick = () => { const name = F.STUB.pick || 'Nobody Real'; onSelect({ name, rawName: name }); };
    return <button type="button" onClick={pick}>stub guess</button>;
  },
}));

import { useAflHL } from '@/hooks/useAflHL';
import { useCfbHL } from '@/hooks/useCfbHL';
import { useF1HL } from '@/hooks/useF1HL';
import { useGolfHL } from '@/hooks/useGolfHL';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import { useMlbHL } from '@/hooks/useMlbHL';
import { useNbaHL } from '@/hooks/useNbaHL';
import { useNflHL } from '@/hooks/useNflHL';
import { useTennisHL } from '@/hooks/useTennisHL';
import { useBaseballCareer } from '@/hooks/useBaseballCareer';
import { useHockeyCareer } from '@/hooks/useHockeyCareer';
import { useNbaCareer } from '@/hooks/useNbaCareer';
import { useOlympics } from '@/hooks/useOlympics';
import { useWorldCup } from '@/hooks/useWorldCup';
import { useGuessTheCollege } from '@/hooks/useGuessTheCollege';
import { useCareerGame } from '@/hooks/useCareerGame';
import { useConnections } from '@/hooks/useConnections';
import { useBaseballConnections } from '@/hooks/useBaseballConnections';
import { useNbaConnections } from '@/hooks/useNbaConnections';
import { useNflConnections } from '@/hooks/useNflConnections';
import { useNhlConnections } from '@/hooks/useNhlConnections';
import { useFootballGrid } from '@/hooks/useFootballGrid';
import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { useFootballConnect4 } from '@/hooks/useFootballConnect4';
import { useGame } from '@/hooks/useGame';
import { useUfcGame } from '@/hooks/useUfcGame';
import { useShirtNumber } from '@/hooks/useShirtNumber';
import { useTransferPath } from '@/hooks/useTransferPath';
import { useFootballDraft } from '@/hooks/useFootballDraft';
import { useGuessTransferValue } from '@/hooks/useGuessTransferValue';
import { getDailyRankRound } from '@/lib/orderTheList';
import { getDailyFivePuzzle } from '@/lib/missingFive';
import { getDailyNinePuzzle } from '@/lib/missingNine';
import { getDailyElevenPuzzle } from '@/lib/missingEleven';
import { pickDailyPuzzle as pickDailyXi } from '@/lib/missingXi';
import { guessableGolfers } from '@/data/golfLegends';
import { pickDailyMystery } from '@/lib/puckDetective';
import { dailyIndex } from '@/lib/dateUtils';
import { clubSeasonsOf, shareClub } from '@/lib/transferPathGraph';
import { careerPlayers } from '@/data/careerPlayers';

const TODAY = '2026-10-01';
const ONLY = process.env.R848_PARITY_ONLY || '';
const PRE = !!process.env.R848_PRE_HOOK;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Api = { readonly r: any; container: HTMLElement; unmount(): void };
type Step = { label: string; run(api: Api): Promise<void> };
type Driver = {
  id: string;
  key: string;
  mount(): Promise<Api>;
  view(api: Api): string;
  plays: Record<string, Step[]>;
  /** Run once before the plays, on the new hook, storage cleared after. */
  prepare?(): Promise<void>;
};

/* ------------------------------------------------------------------ util */
const raw = (key: string) => localStorage.getItem(key);
async function tick(ms = 30): Promise<void> {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}
async function settle(): Promise<void> { for (let i = 0; i < 6; i++) await tick(30); }
/* A page's lazy pieces (the how to play button, the guide) load on real time,
   which the fake clock does not move, so a page mount waits for every dynamic
   import in flight: otherwise one run draws the button and the other does not,
   and the comparison is a coin toss. */
async function settleImports(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await act(async () => { await vi.dynamicImportSettled(); });
    await settle();
  }
}
async function run(fn: () => unknown): Promise<void> { await act(async () => { await fn(); }); }
async function advance(ms: number): Promise<void> { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
async function until(cond: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 200; i++) { if (cond()) return; await tick(25); }
  throw new Error(`timed out waiting for ${what}`);
}

/** Everything a hook hands its page, functions left out, cycles cut. */
function serialise(value: unknown): string {
  const stack: unknown[] = [];
  const walk = (v: unknown, depth: number): unknown => {
    if (typeof v === 'function' || v === undefined) return undefined;
    if (v === null || typeof v !== 'object') return typeof v === 'number' && !Number.isFinite(v) ? String(v) : v;
    if (typeof Node !== 'undefined' && v instanceof Node) return '[node]';
    if (stack.includes(v) || depth > 14) return '[cycle]';
    stack.push(v);
    let out: unknown;
    if (v instanceof Set) out = { set: [...v].map((x) => walk(x, depth + 1)) };
    else if (v instanceof Map) out = { map: [...v.entries()].map(([k, x]) => [walk(k, depth + 1), walk(x, depth + 1)]) };
    else if (Array.isArray(v)) out = v.map((x) => walk(x, depth + 1));
    else out = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x, depth + 1)]));
    stack.pop();
    return out;
  };
  return JSON.stringify(walk(value, 0));
}
const hookView = (api: Api) => serialise(api.r);
function diffAt(a: string, b: string): string {
  let at = 0;
  while (at < a.length && a[at] === b[at]) at++;
  return `first at ${at}:\n    old ...${a.slice(Math.max(0, at - 80), at + 80)}\n    new ...${b.slice(Math.max(0, at - 80), at + 80)}`;
}
/* React's generated ids count up across mounts, and the "next puzzle in"
   countdown ticks with the test clock; nothing else may differ. */
const normalise = (html: string) => html.replace(/:r[0-9a-z]+:/g, ':r:').replace(/radix-[^"\s]+/g, 'radix-').replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, 'h:mm:ss');
const pageView = (api: Api) => normalise(api.container.innerHTML);

async function mountHook(useHook: () => unknown, ready: (r: any) => boolean = () => true): Promise<Api> {
  const h = renderHook(useHook);
  await settle();
  await until(() => ready(h.result.current), 'the hook to be ready');
  return { get r() { return h.result.current; }, container: document.body, unmount: h.unmount };
}
async function mountPage(Page: ComponentType, route: string, ready: (c: HTMLElement) => boolean): Promise<Api> {
  const view = render(
    <HelmetProvider><MemoryRouter initialEntries={[route]}><Page /></MemoryRouter></HelmetProvider>,
  );
  await settleImports();
  await until(() => ready(view.container), `${route} to come up`);
  return { r: null, container: view.container, unmount: view.unmount };
}
const findButton = (root: ParentNode, text: RegExp) =>
  Array.from(root.querySelectorAll('button')).find((b) => text.test((b.textContent ?? '').trim())) ?? null;
const button = (root: ParentNode, text: RegExp) => {
  const b = findButton(root, text);
  if (!b) throw new Error(`no button matching ${text}`);
  return b;
};
async function click(el: Element): Promise<void> { await act(async () => { fireEvent.click(el); }); await settle(); }
async function typeInto(el: Element, value: string): Promise<void> { await act(async () => { fireEvent.change(el, { target: { value } }); }); await settle(); }
async function submitForm(input: Element, value: string): Promise<void> {
  await typeInto(input, value);
  const form = input.closest('form');
  if (!form) throw new Error('no form around the guess box');
  await act(async () => { fireEvent.submit(form); });
  await settle();
}
const step = (label: string, fn: (api: Api) => unknown | Promise<unknown>): Step => ({ label, run: async (api) => { await run(() => fn(api)); await settle(); } });
const repeat = (n: number, make: (i: number) => Step): Step[] => Array.from({ length: n }, (_, i) => make(i));

/* --------------------------------------------------------------- drivers */
const keyOf = (storage: string) => `${storage}-daily-${TODAY}`;

function hl(id: string, storage: string, useHook: () => unknown): Driver {
  const answer = (i: number, choice: 'left' | 'right'): Step => ({
    label: `round ${i + 1} ${choice}`,
    run: async (api) => { await run(() => api.r.makeGuess(choice)); await advance(2100); },
  });
  return {
    id, key: keyOf(storage), mount: () => mountHook(useHook, (r) => !r.isLoading), view: hookView,
    plays: {
      ten: repeat(10, (i) => answer(i, i % 3 ? 'left' : 'right')),
      /* Hard mode is unlimited only: the daily key moves on the daily answer alone. */
      hard: [
        step('hard on', (api) => api.r.toggleHard()),
        answer(0, 'left'),
        step('back to daily', (api) => api.r.switchMode('daily')),
        answer(0, 'right'),
        step('unlimited', (api) => api.r.switchMode('unlimited')),
        answer(1, 'left'),
        step('daily again', (api) => api.r.switchMode('daily')),
      ],
    },
  };
}

function clueCareer(id: string, storage: string, useHook: () => unknown, who: (r: any) => string): Driver {
  return {
    id, key: keyOf(storage), mount: () => mountHook(useHook, (r) => !r.isLoading && !!who(r)), view: hookView,
    plays: {
      win: [
        step('clue', (api) => api.r.revealNextClue()),
        step('clue', (api) => api.r.revealNextClue()),
        step('wrong name', (api) => api.r.submitGuess('Nobody Atall')),
        { label: 'flash ends', run: async () => { await advance(1600); } },
        step('right name', (api) => api.r.submitGuess(who(api.r))),
      ],
      give: [step('clue', (api) => api.r.revealNextClue()), step('give up', (api) => api.r.giveUp())],
      clues: repeat(8, () => step('clue', (api) => api.r.revealNextClue())),
    },
  };
}

function sportConnections(id: string, useHook: () => unknown): Driver {
  const pick = (names: string[]): Step => step(`pick ${names.length}`, async (api) => {
    await run(() => api.r.deselectAll());
    for (const n of names) await run(() => api.r.togglePlayer(n));
  });
  const groups = (api: Api) => api.r.puzzle.groups as { players: string[] }[];
  const wrong = (api: Api, k: number) => [...groups(api)[k % 4].players.slice(0, 3), ...groups(api)[(k + 1) % 4].players.slice(0, 2)];
  return {
    id, key: keyOf(id), mount: () => mountHook(useHook, (r) => !r.isLoading && !!r.puzzle), view: hookView,
    plays: {
      win: [
        { label: 'miss', run: async (api) => { await pick(wrong(api, 0)).run(api); await step('submit', (a) => a.r.submitSelection()).run(api); } },
        ...repeat(4, (g) => ({ label: `group ${g + 1}`, run: async (api) => { await pick(groups(api)[g].players).run(api); await step('submit', (a) => a.r.submitSelection()).run(api); } })),
      ],
      lose: repeat(4, (k) => ({ label: `miss ${k + 1}`, run: async (api) => { await pick(wrong(api, k)).run(api); await step('submit', (a) => a.r.submitSelection()).run(api); } })),
    },
  };
}

function gridHook(id: string, useHook: () => unknown, ok: boolean): Driver {
  const guess = (cell: number, name: string): Step => ({
    label: `cell ${cell} ${name}`,
    run: async (api) => {
      await run(() => api.r.setActiveCell(cell));
      await run(() => api.r.submitGuess(name));
      await settle();
      await advance(1600);
    },
  });
  /* Fifteen misses is the day's guess limit on all three grids. */
  const misses = repeat(15, (i) => guess(i % 9, `Miss ${i + 1}`));
  const fits = repeat(9, (i) => guess(i, `Fit ${['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India'][i]}`));
  return {
    id, key: keyOf(id), mount: () => mountHook(useHook, (r) => !r.isLoading), view: hookView,
    plays: ok
      ? { mixed: [guess(0, 'Miss 1'), guess(0, 'Fit Alpha'), guess(4, 'Fit Bravo'), guess(8, 'Miss 2')], lose: misses, win: [guess(0, 'Miss 3'), ...fits] }
      : { lose: misses },
  };
}

function guesser(id: string, storage: string, useHook: () => unknown, pool: (r: any) => any[], target: (r: any) => any): Driver {
  const others = (api: Api) => pool(api.r).filter((p) => p.name !== target(api.r).name);
  return {
    id, key: keyOf(storage), mount: () => mountHook(useHook, (r) => !r.isLoading && !!target(r)), view: hookView,
    plays: {
      win: [
        step('wrong 1', (api) => api.r.makeGuess(others(api)[0])),
        step('wrong 2', (api) => api.r.makeGuess(others(api)[1])),
        step('right', (api) => api.r.makeGuess(target(api.r))),
      ],
      lose: repeat(8, (i) => step(`wrong ${i + 1}`, (api) => api.r.makeGuess(others(api)[i]))),
      forfeit: [step('wrong 1', (api) => api.r.makeGuess(others(api)[3])), step('give up', (api) => api.r.giveUp())],
      /* A give up before any guess saves an empty log marked lost. */
      forfeit0: [step('give up at once', (api) => api.r.giveUp())],
    },
  };
}

let transferPath: string[] = [];

const HOOKS: Driver[] = [
  hl('afl-higher-lower', 'afl-hl', useAflHL),
  hl('cfb-higher-lower', 'cfb-hl', useCfbHL),
  hl('f1-higher-lower', 'f1-hl', useF1HL),
  hl('golf-higher-lower', 'golf-hl', useGolfHL),
  hl('hockey-higher-lower', 'hockey-hl', useHockeyHL),
  hl('mlb-higher-lower', 'mlb-hl', useMlbHL),
  hl('nba-higher-lower', 'nba-hl', useNbaHL),
  hl('nfl-higher-lower', 'nfl-hl', useNflHL),
  hl('tennis-higher-lower', 'tennis-hl', useTennisHL),
  (() => {
    const d = clueCareer('baseball-career', 'baseball-career', useBaseballCareer, (r) => r.player?.name);
    d.plays.hard = [step('hard on', (api) => api.r.toggleHard()), step('clue', (api) => api.r.revealNextClue()), step('give up', (api) => api.r.giveUp())];
    return d;
  })(),
  (() => {
    const d = clueCareer('hockey-career', 'hockey-career', useHockeyCareer, (r) => r.player?.name);
    d.plays.hard = [step('hard on', (api) => api.r.toggleHard()), step('clue', (api) => api.r.revealNextClue()), step('give up', (api) => api.r.giveUp())];
    return d;
  })(),
  (() => {
    const d = clueCareer('nba-career', 'nba-career', useNbaCareer, (r) => r.player?.name);
    d.plays.hard = [step('hard on', (api) => api.r.toggleHard()), step('clue', (api) => api.r.revealNextClue()), step('give up', (api) => api.r.giveUp())];
    return d;
  })(),
  clueCareer('olympics', 'olympics', useOlympics, (r) => r.athlete?.name),
  {
    id: 'world-cup', key: keyOf('world-cup'), mount: () => mountHook(useWorldCup, (r) => !r.isLoading && !!r.puzzle), view: hookView,
    plays: {
      win: [
        step('daily', (api) => api.r.switchMode('daily')),
        step('wrong', (api) => api.r.submitGuess('Nowhere Land')),
        step('skip', (api) => api.r.skipClue()),
        step('right', (api) => api.r.submitGuess(api.r.puzzle.answer)),
      ],
      give: [step('daily', (api) => api.r.switchMode('daily')), step('skip', (api) => api.r.skipClue()), step('give up', (api) => api.r.giveUp())],
      out: [step('daily', (api) => api.r.switchMode('daily')), ...repeat(8, (i) => step(`wrong ${i + 1}`, (api) => api.r.submitGuess(`Nowhere ${i}`)))],
    },
  },
  {
    id: 'guess-the-college', key: keyOf('guess-the-college'), mount: () => mountHook(useGuessTheCollege, (r) => !r.isLoading && !!r.currentCollege), view: hookView,
    plays: {
      win: [
        step('wrong', (api) => api.r.submitGuess('Not A School')),
        step('skip', (api) => api.r.skipClue()),
        step('right', (api) => api.r.submitGuess(api.r.currentCollege.name)),
      ],
      give: repeat(12, () => step('skip', (api) => api.r.skipClue())),
    },
  },
  {
    id: 'career', key: keyOf('career-path'), mount: () => mountHook(useCareerGame, (r) => !r.isLoadingPool && !r.isLoading), view: hookView,
    plays: {
      win: [
        step('hint (four cells in one handler)', (api) => api.r.giveHint()),
        step('one cell', (api) => api.r.revealCell('0-goals')),
        step('wrong', (api) => api.r.makeGuess('Nobody Atall')),
        step('right', (api) => api.r.makeGuess(api.r.targetPlayer.name)),
      ],
      give: [step('one cell', (api) => api.r.revealCell('0-club')), step('give up', (api) => api.r.giveUp())],
      lose: repeat(6, (i) => step(`wrong ${i + 1}`, (api) => api.r.makeGuess(`Nobody ${i}`))),
    },
  },
  {
    id: 'connections', key: keyOf('connections'), mount: () => mountHook(useConnections, (r) => !r.isLoading && !r.isLoadingPool && !!r.puzzle), view: hookView,
    plays: {
      mixed: [
        { label: 'group 1', run: async (api) => { for (const p of api.r.puzzle.groups[0].players) await run(() => api.r.togglePlayer(p)); await step('submit', (a) => a.r.submitGuess()).run(api); } },
        { label: 'miss', run: async (api) => { const g = api.r.puzzle.groups; for (const p of [...g[1].players.slice(0, 2), ...g[2].players.slice(0, 2)]) await run(() => api.r.togglePlayer(p)); await step('submit', (a) => a.r.submitGuess()).run(api); } },
        step('hint', (api) => api.r.useHint()),
        step('give up', (api) => api.r.giveUp()),
      ],
      win: repeat(4, (g) => ({ label: `group ${g + 1}`, run: async (api) => { for (const p of api.r.puzzle.groups[g].players) await run(() => api.r.togglePlayer(p)); await step('submit', (a) => a.r.submitGuess()).run(api); } })),
    },
  },
  sportConnections('baseball-connections', useBaseballConnections),
  sportConnections('nba-connections', useNbaConnections),
  sportConnections('nfl-connections', useNflConnections),
  sportConnections('nhl-connections', useNhlConnections),
  gridHook('football-grid', useFootballGrid, true),
  gridHook('college-grid', useCollegeGrid, true),
  gridHook('soccer-grid', useSoccerGrid, true),
  {
    id: 'football-connect-4', key: keyOf('football-connect4'),
    async mount() {
      vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
        const { playerName } = JSON.parse(init.body) as { playerName: string };
        return { ok: true, status: 200, json: async () => ({ valid: true, fullName: playerName }) };
      });
      return mountHook(useFootballConnect4, (r) => !r.isLoading);
    },
    view: hookView,
    plays: {
      win: repeat(7, (n) => ({
        label: `move ${n + 1}`,
        run: async (api) => {
          if (api.r.currentTurn === 'blue') {
            await run(() => api.r.selectColumn(0));
            await run(() => api.r.submitPlayer(`Probe Player ${n}`));
          } else {
            await run(() => api.r.skipTurn());
          }
          await settle();
        },
      })),
      spread: repeat(5, (n) => ({
        label: `move ${n + 1}`,
        run: async (api) => {
          await run(() => api.r.selectColumn((n * 2) % 7));
          await run(() => api.r.submitPlayer(`Spread Player ${n}`));
          await settle();
        },
      })),
    },
  },
  guesser('footle', 'footle', useGame, (r) => r.availablePlayers, (r) => r.targetPlayer),
  guesser('ufc', 'ufc-game', useUfcGame, (r) => r.fighters, (r) => r.targetFighter),
  {
    id: 'shirt-number', key: keyOf('shirt-number'), mount: () => mountHook(useShirtNumber, (r) => !r.isLoading && !r.isLoadingPool && !!r.puzzle), view: hookView,
    plays: {
      win: [
        step('miss', (api) => api.r.submitGuess(((api.r.puzzle.kitNumber + 1) % 99) + 1)),
        step('miss', (api) => api.r.submitGuess(((api.r.puzzle.kitNumber + 2) % 99) + 1)),
        step('hit', (api) => api.r.submitGuess(api.r.puzzle.kitNumber)),
      ],
      lose: repeat(8, (i) => step(`miss ${i + 1}`, (api) => api.r.submitGuess(((api.r.puzzle.kitNumber + i + 1) % 99) + 1))),
      unlimited: [
        step('miss', (api) => api.r.submitGuess(((api.r.puzzle.kitNumber + 5) % 99) + 1)),
        step('unlimited', (api) => api.r.switchToUnlimited()),
        step('unlimited guess', (api) => api.r.submitGuess(1)),
      ],
    },
  },
  {
    id: 'transfer-path', key: keyOf('transfer-path'), mount: () => mountHook(useTransferPath, (r) => !r.isLoadingPool && !r.isLoading), view: hookView,
    async prepare() {
      /* The day's real path, from a give up on the new hook, then the slate is wiped. */
      const api = await this.mount();
      await run(() => api.r.giveUp());
      await settle();
      transferPath = (api.r.revealPath ?? []).map((s: { player: string }) => s.player).slice(1);
      api.unmount();
      localStorage.clear();
      expect(transferPath.length, 'the daily pair has a path').toBeGreaterThan(0);
    },
    plays: {
      give: [step('give up', (api) => api.r.giveUp())],
      walk: [
        step('a refused name', (api) => api.r.addPlayer('Nobody Atall')),
        { label: 'the path, man by man', run: async (api) => {
          for (const name of transferPath) {
            if (api.r.status !== 'building') break;
            await run(() => api.r.addPlayer(name));
            await settle();
          }
        } },
      ],
      first: [{ label: 'first man', run: async (api) => { await run(() => api.r.addPlayer(transferPath[0])); await settle(); } }, step('give up', (api) => api.r.giveUp())],
      /* A legal step that leaves the chain open: a man who never shared a
         club with the target cannot finish it on the spot. */
      mid: [
        { label: 'one open step', run: async (api) => {
          const keys = clubSeasonsOf(careerPlayers);
          const from = api.r.puzzle.playerA as string, target = api.r.puzzle.playerB as string;
          const open = careerPlayers.map((p) => p.name).find((n) => n !== target && n !== from && shareClub(keys, from, n) && !shareClub(keys, n, target));
          if (!open) throw new Error('no open first step on today\'s pair');
          await run(() => api.r.addPlayer(open));
          await settle();
          expect(api.r.chain.length, 'one man added').toBe(2);
          expect(api.r.status).toBe('building');
        } },
        step('give up', (api) => api.r.giveUp()),
      ],
    },
  },
  {
    id: 'football-draft', key: keyOf('football-draft'), mount: () => mountHook(useFootballDraft, (r) => !r.isLoading && !!r.puzzle), view: hookView,
    plays: {
      all: repeat(12, (i) => ({
        label: `pick ${i + 1}`,
        run: async (api) => {
          if (api.r.gameStatus !== 'playing') return;
          if (i % 2) await run(() => api.r.revealMore());
          await run(() => api.r.submitGuess(i % 8));
          await advance(2300);
        },
      })),
    },
  },
  {
    id: 'guess-transfer-value', key: keyOf('guess-transfer-value'), mount: () => mountHook(useGuessTransferValue, (r) => !r.isLoading && !!r.target), view: hookView,
    plays: {
      win: [step('low', (api) => api.r.makeGuess(1_000_000)), step('high', (api) => api.r.makeGuess(900_000_000)), step('right', (api) => api.r.makeGuess(api.r.target.marketValue))],
      lose: repeat(8, (i) => step(`wrong ${i + 1}`, (api) => api.r.makeGuess(1_000_000 + i))),
    },
  },
];

/* ----------------------------------------------------------------- pages */
const golfAnswer = () => guessableGolfers[dailyIndex(TODAY, guessableGolfers.length)].name;
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const guessBox = (c: HTMLElement, label: string) => {
  const input = c.querySelector(`input[aria-label="${label}"]`);
  if (!input) throw new Error(`no input labelled ${label}`);
  return input;
};
function missingN(id: string, load: () => Promise<{ default: ComponentType }>, answer: () => string, label: string): Driver {
  const box = (api: Api) => guessBox(api.container, label);
  return {
    id, key: keyOf(id),
    mount: async () => mountPage((await load()).default, `/${id}`, (c) => !!findButton(c, /^Give up$/) || !!c.querySelector('[role="status"]')),
    view: pageView,
    plays: {
      win: [
        { label: 'miss', run: async (api) => { await submitForm(box(api), 'Nobody Atall'); await advance(1300); } },
        { label: 'right', run: async (api) => { await submitForm(box(api), answer()); } },
      ],
      lose: repeat(3, (i) => ({ label: `miss ${i + 1}`, run: async (api) => { await submitForm(box(api), `Nobody ${i}`); await advance(1300); } })),
      give: [{ label: 'give up', run: async (api) => { await click(button(api.container, /^Give up$/)); } }],
    },
  };
}

const PAGES: Driver[] = [
  missingN('missing-five', () => import('@/pages/MissingFive'), () => getDailyFivePuzzle().candidate.name, 'Who was the missing starter?'),
  missingN('missing-nine', () => import('@/pages/MissingNine'), () => getDailyNinePuzzle().candidate.name, 'Who was the missing starter'),
  missingN('missing-eleven', () => import('@/pages/MissingEleven'), () => getDailyElevenPuzzle().candidate.name, 'Who was the missing starter'),
  {
    id: 'missing-xi', key: keyOf('missing-xi'),
    mount: async () => mountPage((await import('@/pages/MissingXi')).default, '/missing-xi', (c) => !!findButton(c, /^Lock in guess$/) || !!c.querySelector('[role="status"]')),
    view: pageView,
    plays: {
      win: [{
        label: 'the answer',
        run: async (api) => {
          const answer = pickDailyXi().candidate.name;
          const input = api.container.querySelector('input[role="combobox"]');
          if (!input) throw new Error('no search box');
          await typeInto(input, answer);
          await advance(800);
          const row = Array.from(api.container.querySelectorAll<HTMLButtonElement>('button[role="option"]')).find((b) => (b.textContent ?? '').trim() === answer);
          if (!row) throw new Error('no suggestion row for the answer');
          await act(async () => { fireEvent.pointerDown(row); });
          await click(button(api.container, /^Lock in guess$/));
        },
      }],
      give: [{ label: 'give up', run: async (api) => {
        await click(button(api.container, /^Give up$/));
        const sure = findButton(api.container, /^Yes, reveal it$/) ?? findButton(document.body, /^Yes, reveal it$/);
        if (sure) await click(sure);
      } }],
    },
  },
  {
    id: 'rank-em', key: keyOf('rank-em'),
    mount: async () => mountPage((await import('@/pages/RankEm')).default, '/rank-em', (c) => !!findButton(c, /^Lock order$/) || !!c.querySelector('[role="status"] h2')),
    view: pageView,
    plays: {
      perfect: [{ label: 'lock the true order', run: async (api) => {
        for (const item of getDailyRankRound().items) await click(button(api.container, new RegExp(`^${escape(item.name)}$`)));
        await click(button(api.container, /^Lock order$/));
      } }],
      reversed: [{ label: 'lock a wrong order', run: async (api) => {
        for (const item of [...getDailyRankRound().items].reverse()) await click(button(api.container, new RegExp(`^${escape(item.name)}$`)));
        await click(button(api.container, /^Lock order$/));
      } }],
    },
  },
  {
    id: 'guess-the-golfer', key: keyOf('guess-the-golfer'),
    mount: async () => mountPage((await import('@/pages/GuessTheGolfer')).default, '/guess-the-golfer', (c) => !!c.querySelector('input[aria-label="Guess the golfer"]') || !!c.querySelector('[role="status"]')),
    view: pageView,
    plays: {
      win: [
        { label: 'wrong golfer', run: async (api) => {
          const other = guessableGolfers.find((g) => g.name !== golfAnswer())!.name;
          await typeInto(guessBox(api.container, 'Guess the golfer'), other);
          await click(button(api.container, new RegExp(`^${escape(other)}$`)));
        } },
        { label: 'right golfer', run: async (api) => {
          await typeInto(guessBox(api.container, 'Guess the golfer'), golfAnswer());
          await click(button(api.container, new RegExp(`^${escape(golfAnswer())}$`)));
        } },
      ],
    },
  },
  {
    id: 'puck-detective', key: keyOf('puck-detective'),
    mount: async () => mountPage((await import('@/pages/PuckDetective')).default, '/puck-detective', (c) => !!findButton(c, /^stub guess$/) || !!c.querySelector('[role="status"]')),
    view: pageView,
    plays: {
      solve: [
        { label: 'wrong skater', run: async (api) => {
          const mystery = pickDailyMystery(F.PUCK_POOL as never).name;
          F.STUB.pick = F.PUCK_POOL.find((p) => p.name !== mystery)!.name;
          await click(button(api.container, /^stub guess$/));
        } },
        { label: 'the mystery', run: async (api) => {
          F.STUB.pick = pickDailyMystery(F.PUCK_POOL as never).name;
          await click(button(api.container, /^stub guess$/));
        } },
      ],
    },
  },
  {
    id: 'career-ladder', key: keyOf('career-ladder'),
    mount: async () => mountPage((await import('@/pages/CareerLadder')).default, '/career-ladder', (c) => !!findButton(c, /^Give up$/) || !!c.querySelector('[role="status"]')),
    view: pageView,
    plays: {
      give: [
        { label: 'give up', run: async (api) => { await click(button(api.container, /^Give up$/)); await click(button(api.container, /^Yes, reveal it$/)); } },
      ],
      guesses: [
        { label: 'reveal a stint', run: async (api) => { await click(button(api.container, /^Reveal next stint/)); } },
        ...[0, 1, 2].map((i): Step => ({ label: `guess Ladder Player ${i}`, run: async (api) => {
          if (api.container.querySelector('[role="status"]')) return;
          await submitForm(guessBox(api.container, 'Guess the player by name'), `Ladder Player ${i}`);
        } })),
      ],
    },
  },
];

/* ------------------------------------------------------------------- run */
type Frame = { label: string; bytes: string | null; view: string };

async function play(which: 'new' | 'old', d: Driver, steps: Step[]): Promise<{ frames: Frame[]; records: number }> {
  IMPL.which = which;
  vi.setSystemTime(new Date(`${TODAY}T16:00:00Z`));
  localStorage.clear();
  resetMocks();
  F.STUB.pick = '';
  consumeRestoredFinish(d.id);
  const api = await d.mount();
  const frames: Frame[] = [{ label: 'mounted', bytes: raw(d.key), view: d.view(api) }];
  for (const s of steps) {
    await s.run(api);
    frames.push({ label: s.label, bytes: raw(d.key), view: d.view(api) });
  }
  const records = recordCompletion.mock.calls.length;
  api.unmount();
  return { frames, records };
}

async function restore(which: 'new' | 'old', d: Driver, bytes: string): Promise<{ view: string; after: string | null; records: number }> {
  IMPL.which = which;
  vi.setSystemTime(new Date(`${TODAY}T16:00:00Z`));
  localStorage.clear();
  resetMocks();
  consumeRestoredFinish(d.id);
  localStorage.setItem(d.key, bytes);
  const api = await d.mount();
  const view = d.view(api);
  const after = raw(d.key);
  const records = recordCompletion.mock.calls.length;
  api.unmount();
  return { view, after, records };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date'] });
  vi.setSystemTime(new Date(`${TODAY}T16:00:00Z`));
  vi.spyOn(Math, 'random').mockReturnValue(0.01234);
  localStorage.clear();
  resetMocks();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); IMPL.which = 'new'; });

describe('one tab plays and restores exactly as before Round 848', () => {
  it.skipIf(PRE)('is skipped: R848_PRE_HOOK names no hook from before this round (simDailySaveHardening sets it)', () => {});

  for (const d of [...HOOKS, ...PAGES].filter((x) => !ONLY || ONLY.split(',').includes(x.id))) {
    it.runIf(PRE)(d.id, async () => {
      /* The hook named by R848_PRE_HOOK really is the one from before this
         round, and both hooks really ran. */
      expect(IMPL.preSource, 'the old hook loaded').toContain('writePersistedState');
      expect(IMPL.preSource, 'the old hook has no stale tab guard').not.toContain('adoptNewerSave');
      IMPL.calls.new = 0; IMPL.calls.old = 0;
      /* A page's first mount loads its lazy pieces (the guide says
         "loading" until its chunk lands), so every compared mount is a later one. */
      if (d.view === pageView) { localStorage.clear(); (await d.mount()).unmount(); localStorage.clear(); }
      if (d.prepare) await d.prepare();
      const problems: string[] = [];
      const saves = new Map<string, string>();
      let steps = 0;
      for (const [name, s] of Object.entries(d.plays)) {
        const before = await play('old', d, s);
        const after = await play('new', d, s);
        steps += s.length;
        for (let i = 0; i < before.frames.length; i++) {
          const o = before.frames[i], n = after.frames[i];
          if (o.bytes !== n.bytes) problems.push(`${name} after "${o.label}": stored bytes differ\n  old ${o.bytes}\n  new ${n.bytes}`);
          if (o.view !== n.view) problems.push(`${name} after "${o.label}": the game hands its page something different ${diffAt(o.view, n.view)}`);
          if (o.bytes !== null && !saves.has(o.bytes)) saves.set(o.bytes, `${name} after "${o.label}"`);
        }
        if (before.records !== after.records) problems.push(`${name}: recorded ${before.records} times before, ${after.records} now`);
      }
      const statuses = new Set<string>();
      for (const [bytes, where] of saves) {
        statuses.add(String(JSON.parse(bytes).gameStatus));
        const o = await restore('old', d, bytes);
        const n = await restore('new', d, bytes);
        if (o.after !== bytes) problems.push(`${where}: the OLD hook changed the bytes on restore (harness fault)`);
        if (n.after !== bytes) problems.push(`${where}: the new restore changed the stored bytes\n  was ${bytes}\n  now ${n.after}`);
        if (n.view !== o.view) problems.push(`${where}: restores to a different state than before (a save thrown away?) ${diffAt(o.view, n.view)}\n  bytes ${bytes}`);
        if (o.records || n.records) problems.push(`${where}: a restore recorded a completion (old ${o.records}, new ${n.records})`);
      }
      console.log(`R848_PARITY ${JSON.stringify({ id: d.id, plays: Object.keys(d.plays).length, steps, saves: saves.size, statuses: [...statuses].sort(), problems: problems.length, first: problems[0]?.slice(0, 600) })}`);
      expect(IMPL.calls.old, 'the old hook ran').toBeGreaterThan(0);
      expect(IMPL.calls.new, 'the new hook ran').toBeGreaterThan(0);
      expect(saves.size, 'the plays wrote saves to compare').toBeGreaterThan(0);
      expect(problems).toEqual([]);
    }, 120000);
  }
});
