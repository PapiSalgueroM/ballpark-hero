/**
 * Round 643: the same finish is never recorded twice.
 *
 * A read only audit on 2026-09-19 proved, with probes, that a finished game
 * was recorded again in five shapes. The world board takes the day's best so
 * it did not move, but every extra record paid the raw score into a signed in
 * player's total again and added a play row:
 *
 *   fight    the three fight boards restored a finished save in an effect
 *            after mount with no markRestoredFinish, so every reload paid
 *   career   the four My Careers flipped done false then true on every
 *            Resume coaching then Back, paying the whole legacy again
 *   slug     twelve daily hooks marked a restored finish under their storage
 *            name while the recorder asked under another (nfl-hl against
 *            nfl-higher-lower), so the mark was never consumed
 *   toggle   ten pages gated the recorder on the mode, so a trip to
 *            Unlimited and back re-armed it over a daily already recorded
 *   restore  six hooks restored a finish after their data loaded, with no
 *            mark; one more (NFL Career Path) re-armed on its Daily tab and
 *            recorded again from a Play Unlimited that never left the daily
 *
 * Every row below mounts the REAL page, board or hook, with the real
 * useGameCompletion, the real restoredFinish handshake and jsdom's real
 * localStorage. Only the recorder, the auth context, the Supabase client and
 * the data loaders are replaced (./dailyReload/mocks plus the loaders here).
 * Each row then holds the same outcome, in order:
 *
 *   1. from a fresh start, the finish is played and records EXACTLY once
 *      (so a row whose finish never lands is red, not quietly green)
 *   2. a mode toggle and back, where the game has one: nothing more
 *   3. three coaching round trips, for the careers: nothing more
 *   4. any other replay path the row names: nothing more
 *   5. two reloads (unmount, remount on the same storage), each of which
 *      must come back FINISHED, so a reload that silently deals a fresh game
 *      cannot pass for one that restored: nothing more
 *
 * Slug rows also prove the storage key did not move: the finished daily is
 * saved under the old name every existing save sits under, and nothing is
 * written under the recorder's name.
 *
 * ADDING A GAME is one line in CASES, through the factory for its shape.
 *
 * scripts/simNoDoubleRecord.mjs runs this file and carries the negative
 * controls (NO_DOUBLE_CONTROL=nomark | slugdrift | togglerearm), each of
 * which edits a COPY of one module and points vitest at it through the
 * NO_DOUBLE_SWAP alias in vitest.config.ts. The `usesMark` flag on a row is
 * what nomark is judged against: every row that relies on the mark must go
 * red and every row that does not must stay green.
 */
import './dailyReload/mocks';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { recordCompletion, resetMocks, setTableFixture } from './dailyReload/mocks';
import { button, click, findButton, mountPage, typeInto } from './dailyReload/harness';
import stockDriver from './dailyReload/player-stock-market.driver';
import { consumeRestoredFinish, markRestoredFinish } from '@/lib/restoredFinish';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';

import FightCareerBoard from '@/components/fight-career/FightCareerBoard';
import FightGymBoard from '@/components/fight-gym/FightGymBoard';
import FightPromoterBoard from '@/components/fight-promoter/FightPromoterBoard';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { useNflHL } from '@/hooks/useNflHL';
import { useNbaHL } from '@/hooks/useNbaHL';
import { useMlbHL } from '@/hooks/useMlbHL';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import { useCfbHL } from '@/hooks/useCfbHL';
import { useF1HL } from '@/hooks/useF1HL';
import { useTennisHL } from '@/hooks/useTennisHL';
import { useGolfHL } from '@/hooks/useGolfHL';
import { useAflHL } from '@/hooks/useAflHL';
import { useUfcGame } from '@/hooks/useUfcGame';
import { useFootballConnect4 } from '@/hooks/useFootballConnect4';
import { useCareerGame } from '@/hooks/useCareerGame';
import { useChampOrNot } from '@/hooks/useChampOrNot';
import { useWhodTheyBeat } from '@/hooks/useWhodTheyBeat';
import { useSilverwareSort } from '@/hooks/useSilverwareSort';
import { useQuizBoard } from '@/hooks/useQuizBoard';
import { useBallIq } from '@/hooks/useBallIq';
import { useMysteryBox } from '@/hooks/useMysteryBox';
import { useNFLCareer } from '@/hooks/useNFLCareer';
import { useTransferPath } from '@/hooks/useTransferPath';
import { useGradeTransfer } from '@/hooks/useGradeTransfer';
import CareerLadder from '@/pages/CareerLadder';
import NbaGrid from '@/pages/NbaGrid';
import MlbGrid from '@/pages/MlbGrid';
import HockeyGrid from '@/pages/HockeyGrid';
import CbbGrid from '@/pages/CbbGrid';
import MissingFive from '@/pages/MissingFive';
import MissingNine from '@/pages/MissingNine';
import MissingEleven from '@/pages/MissingEleven';
import RankEm from '@/pages/RankEm';
import PuckDetective from '@/pages/PuckDetective';
import GuessTheGolfer from '@/pages/GuessTheGolfer';
import { newFightCareer } from '@/lib/fightCareer';
import { newGym } from '@/lib/fightGym';
import { newPromoter } from '@/lib/fightPromoter';
import { ARCHETYPES, progress, simSeason, startCareer } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, nbaProgress, simNbaSeason, startNbaCareer } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, mlbProgress, simMlbSeason, startMlbCareer } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, nhlProgress, simNhlSeason, startNhlCareer } from '@/lib/nhlMyCareer';
import { VALUES } from '@/lib/fetchQuizBoard';
import { getDailyRankRound } from '@/lib/orderTheList';
import { guessableGolfers } from '@/data/golfLegends';

/* ------------------------------------------------------------------------ */
/* The data loaders. Real modules, only the network call replaced.          */
/* ------------------------------------------------------------------------ */

const F = vi.hoisted(() => {
  const TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima'];
  /* Seven teams with the title counts 1, 2, 3, 4, 5, 6 and 3: Silverware Sort
     needs five strictly different counts per competition, Champ or Not needs
     eight rows. */
  const CHAMP_ROWS: { year: number; team: string }[] = [];
  let year = 1980;
  [1, 2, 3, 4, 5, 6, 3].forEach((n, t) => { for (let k = 0; k < n; k += 1) CHAMP_ROWS.push({ year: year++, team: TEAMS[t] }); });
  const FINALS_ROWS = Array.from({ length: 24 }, (_, i) => ({
    year: 1990 + i, winner: TEAMS[i % TEAMS.length], loser: TEAMS[(i + 5) % TEAMS.length], series: '4-2',
  }));
  const CLUE_VALUES = [200, 400, 600, 800, 1000];
  const CLUES = ['Cat A', 'Cat B', 'Cat C', 'Cat D', 'Cat E'].flatMap((category, ci) =>
    CLUE_VALUES.flatMap((value, vi2) => Array.from({ length: 4 }, (_, k) => ({
      clueId: `c${ci}-${vi2}-${k}`, category, clue: `clue ${ci} ${vi2} ${k}`, answer: `Answer ${ci}${vi2}${k}`, eventYear: 2000, value,
    }))));
  const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'CAM', 'ST', 'LW', 'RW'];
  const TIERS = ['fringe', 'squad', 'quality', 'star', 'superstar'];
  const PACK_POOL = Array.from({ length: 100 }, (_, i) => ({
    name: `Pack ${i}`, position: POSITIONS[i % POSITIONS.length], age: 25, nationality: 'X', club: 'Y', league: 'Z',
    marketValue: 5 + i, goals: 0, assists: 0, tier: TIERS[i % TIERS.length],
  }));
  const PUCK_POOL = Array.from({ length: 30 }, (_, i) => ({
    playerId: 1000 + i, name: `Skater ${i}`, position: 'C', team: 'TOR', jerseyNumber: i, age: 25,
    country: 'CAN', group: 'forward', careerPoints: 100 + i,
  }));
  const EMPTY_GRID = () => ({ players: [], byNormalizedName: new Map() });
  /* The college grid derives its schools from the data: a school is on the
     board only with ten players behind every achievement, and the two eras
     cannot share a player, so each school gets ten of each. */
  const CBB_GRID = () => ({
    players: ['Aspen', 'Birch', 'Cedar', 'Dogwood', 'Elm', 'Fir'].flatMap(school =>
      [1995, 2012].flatMap(from => Array.from({ length: 10 }, (_, i) => ({
        name: `${school} ${from} ${i}`, schools: new Set([school]), points: 2000, rebounds: 800, assists: 400,
        games: 130, position: 'G-F', fromYear: from, toYear: from + 4,
      })))),
    byNormalizedName: new Map(),
  });
  /* Career Ladder's pool arrives when the row says so (see its mount). */
  const LADDER = { pending: [] as ((pool: unknown) => void)[] };
  const LADDER_POOL = Array.from({ length: 12 }, (_, i) => ({
    id: `p${String(i).padStart(2, '0')}`, name: `Ladder Player ${i}`, nationality: 'England', position: 'Midfielder',
    seasons: Array.from({ length: 5 }, (_, s) => ({
      season: `201${s}/1${s + 1}`, club: `Club ${i}-${s}`, goals: 1, assists: 1, appearances: 10, marketValue: (i + 1) * 1_000_000, sortOrder: s,
    })),
  }));
  const GRADE_CASES = Array.from({ length: 8 }, (_, i) => ({
    playerName: `Graded ${i}`, nationality: 'X', position: 'CM', fromClub: `From ${i}`, toClub: `To ${i}`,
    moveYear: 2010 + i, valueAtMove: 10, valueAfter: 20, pctChange: 100, actualGrade: 'B',
  }));
  return { CHAMP_ROWS, FINALS_ROWS, CLUES, PACK_POOL, PUCK_POOL, EMPTY_GRID, CBB_GRID, LADDER, LADDER_POOL, GRADE_CASES };
});

vi.mock('@/lib/champOrNot', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/champOrNot')>()),
  fetchCompetitionRows: async () => F.CHAMP_ROWS,
}));
vi.mock('@/lib/whodTheyBeat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/whodTheyBeat')>()),
  fetchFinalsRows: async () => F.FINALS_ROWS,
}));
vi.mock('@/lib/fetchQuizBoard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/fetchQuizBoard')>()),
  fetchQuizBoardClues: async () => F.CLUES,
}));
vi.mock('@/lib/fetchPackPool', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/fetchPackPool')>()),
  fetchPackPool: async () => F.PACK_POOL,
}));
vi.mock('@/lib/fetchCareerPlayers', () => ({ fetchCareerPlayers: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchTransferPathPuzzles', () => ({ fetchTransferPathPuzzles: () => Promise.resolve([]) }));
vi.mock('@/lib/fetchTransferGrades', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/fetchTransferGrades')>()),
  fetchTransferGrades: async () => F.GRADE_CASES,
}));
vi.mock('@/lib/careerLadder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/careerLadder')>()),
  fetchCareerPool: () => new Promise(resolve => { F.LADDER.pending.push(resolve); }),
}));
vi.mock('@/lib/puckDetective', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/puckDetective')>()),
  fetchPuckDetectivePool: async () => F.PUCK_POOL,
}));
vi.mock('@/lib/nbaGrid', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/nbaGrid')>()),
  fetchNbaGridData: async () => F.EMPTY_GRID(),
}));
vi.mock('@/lib/mlbGrid', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mlbGrid')>()),
  fetchMlbGridData: async () => F.EMPTY_GRID(),
}));
vi.mock('@/lib/hockeyGrid', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hockeyGrid')>()),
  fetchHockeyGridData: async () => F.EMPTY_GRID(),
}));
vi.mock('@/lib/cbbGrid', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cbbGrid')>()),
  fetchCbbGridData: async () => F.CBB_GRID(),
}));
/* The grids' search box is a network autocomplete, and it is not what is
   under test. The stand in hands the page one name nobody in the (empty)
   grid data matches, which the page scores as a wrong guess. */
vi.mock('@/components/game/PlayerAutocomplete', () => ({
  PlayerAutocomplete: ({ onSelect }: { onSelect: (e: { name: string; rawName: string }) => void }) => (
    <button type="button" onClick={() => onSelect({ name: 'Nobody Real', rawName: 'Nobody Real' })}>stub guess</button>
  ),
}));

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

const CONTROL = process.env.NO_DOUBLE_CONTROL || '';
/** Run one row by its slug, e.g. NO_DOUBLE_ONLY=rank-em. */
const ONLY = process.env.NO_DOUBLE_ONLY || '';
const today = getTodayET();
const dailyKey = (storageSlug: string) => `${storageSlug}-daily-${today}`;
const paths = () => recordCompletion.mock.calls.map(c => String(c[0]));

async function settle(ms = 40): Promise<void> {
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
}

/* The games that wait out a result on a timer (2 to 3.4 seconds a round)
   play under fake timers, faked only for setTimeout so promises still run. */
async function withFakeTimers(fn: () => Promise<void>): Promise<void> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  try { await fn(); } finally { vi.useRealTimers(); }
}
async function advance(ms: number): Promise<void> {
  await act(async () => { vi.advanceTimersByTime(ms); });
}
async function run(fn: () => unknown): Promise<void> {
  await act(async () => { await fn(); });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Api {
  unmount(): void;
  /** The hook's current return, for hook rows. */
  readonly r: any;
  /** The rendered page, for page rows. */
  container: HTMLElement;
}

async function mountHook(useHook: () => unknown, ready: (r: any) => boolean = () => true): Promise<Api> {
  const h = renderHook(useHook);
  await waitFor(() => { if (!ready(h.result.current)) throw new Error('the hook is not ready yet'); }, { timeout: 3000 });
  return {
    unmount: h.unmount,
    get r() { return h.result.current; },
    container: document.body,
  };
}

async function mountEl(el: ReactElement, path: string, ready: (c: HTMLElement) => boolean): Promise<Api> {
  const m = mountPage(el, path);
  const buttons = () => Array.from(m.container.querySelectorAll('button')).map(b => (b.textContent ?? '').trim().slice(0, 40)).join(' | ');
  await waitFor(() => { if (!ready(m.container)) throw new Error(`${path} has not come up yet; buttons: ${buttons()}`); }, { timeout: 3000 });
  return { unmount: m.unmount, r: null, container: m.container };
}

const textOf = (el: ParentNode) => (el as HTMLElement).textContent ?? '';
const resultCard = (c: HTMLElement) => c.querySelector('[role="status"]');

/* ------------------------------------------------------------------------ */
/* The table                                                                 */
/* ------------------------------------------------------------------------ */

/* 'extra' holds the games the audit did not name, found by the Round 643
   sweep of every recorder call site. */
type Shape = 'fight' | 'career' | 'slug' | 'toggle' | 'restore' | 'extra';

interface Case {
  /** The slug the recorder records under; also the test's name. */
  id: string;
  shape: Shape;
  /** The reload relies on markRestoredFinish (the nomark control's verdict). */
  usesMark: boolean;
  /** Slug rows: the storage name every existing save of this daily sits under. */
  storageSlug?: string;
  /** Written before the first mount only: a game one honest step from its end. */
  seed?(): void;
  mount(): Promise<Api>;
  finish(api: Api): Promise<void>;
  /** The finished state is what this instance shows. */
  finished(api: Api): boolean;
  /** Over to the other mode and back again. */
  toggle?(api: Api): Promise<void>;
  /** One coaching round trip, retired to coaching to retired. */
  coach?(api: Api): Promise<void>;
  /** Any other replay path the game offers from its finished state. */
  replay?(api: Api): Promise<void>;
  /** Run on the first reload before it unmounts (the careers go coaching,
      so the second reload restores the coaching phase). */
  beforeSecondReload?(api: Api): Promise<void>;
}

/* -- slug: the nine Higher or Lower hooks, one engine per sport ----------- */
function hl(id: string, storageSlug: string, useHook: () => unknown): Case {
  return {
    id, shape: 'slug', usesMark: true, storageSlug,
    mount: () => mountHook(useHook, r => !r.isLoading),
    async finish(api) {
      await withFakeTimers(async () => {
        for (let i = 0; i < 12 && api.r.gameStatus === 'playing'; i += 1) {
          await run(() => api.r.makeGuess('left'));
          await advance(2100);
        }
      });
    },
    finished: api => api.r.mode === 'daily' && api.r.gameStatus === 'complete',
    async toggle(api) {
      await run(() => api.r.switchMode('unlimited'));
      await run(() => api.r.switchMode('daily'));
    },
  };
}

/* -- toggle: a page with a Daily and an Unlimited button ------------------ */
const DAILY_TOGGLE = /^📅 Daily$/;
const UNLIMITED_TOGGLE = /^∞ Unlimited$/;
function page(
  id: string,
  el: () => ReactElement,
  finish: (api: Api) => Promise<void>,
  opts: { usesMark: boolean; daily?: RegExp; unlimited?: RegExp; ready?: (c: HTMLElement) => boolean },
): Case {
  const daily = opts.daily ?? DAILY_TOGGLE;
  const unlimited = opts.unlimited ?? UNLIMITED_TOGGLE;
  return {
    id, shape: 'toggle', usesMark: opts.usesMark,
    /* Up means the toggle is drawn and either the board or the finished card
       is: a reload of a finished daily shows no board at all. */
    mount: () => mountEl(el(), `/${id}`, c => !!findButton(c, unlimited) && (!opts.ready || opts.ready(c) || !!resultCard(c))),
    finish,
    finished: api => !!resultCard(api.container),
    async toggle(api) {
      await click(button(api.container, unlimited));
      await settle();
      await click(button(api.container, daily));
      await settle();
    },
  };
}

/* A grid is finished by nine wrong guesses, the guess limit. */
const gridReady = (c: HTMLElement) => !!c.querySelector('button[aria-label^="Answer for"]');
async function gridFinish(api: Api): Promise<void> {
  for (let i = 0; i < 12 && !resultCard(api.container); i += 1) {
    const cell = api.container.querySelector<HTMLButtonElement>('button[aria-label^="Answer for"]');
    if (!cell) throw new Error('no open cell on the grid');
    await click(cell);
    await click(button(api.container, /^stub guess$/));
  }
}

async function giveUpFinish(api: Api): Promise<void> {
  await click(button(api.container, /^Give up$/));
}

/* -- restore: a hook that restores after its data loads ------------------- */
function modeToggle(): (api: Api) => Promise<void> {
  return async api => {
    await run(() => api.r.switchMode('unlimited'));
    await settle();
    await run(() => api.r.switchMode('daily'));
    await settle();
  };
}

/* -- career: the four My Careers, one board shape ------------------------- */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
interface CareerLike { name: string; retired: boolean; seasons: unknown[] }
function career(
  id: string,
  Board: () => ReactElement,
  make: (rng: () => number) => CareerLike,
  season: (c: CareerLike, rng: () => number) => void,
): Case {
  const saveKey = `${id}-save-v1`;
  let name = '';
  const finished = (api: Api) =>
    textOf(api.container).includes(`${name} retires`) || !!findButton(api.container, /Back to the playing career/);
  return {
    id, shape: 'career', usesMark: true,
    seed() {
      const rng = seededRandom(643);
      const c = make(rng);
      /* Six real seasons through the engine, so "Hang them up now" is on
         the hub: a career one honest step from its end. */
      for (let i = 0; i < 6; i += 1) season(c, rng);
      c.retired = false;
      /* A rivalry beat the sims left pending would stand in front of the
         hub; it is not what this row is about. */
      delete (c as { pendingRivalryEvent?: unknown }).pendingRivalryEvent;
      name = c.name;
      localStorage.setItem(saveKey, JSON.stringify({ c, phase: 'season', teamQuality: 80, coach: null }));
    },
    mount: () => mountEl(Board(), `/${id}`, c => textOf(c).includes(name)),
    async finish(api) {
      await click(button(api.container, /^Hang them up now$/));
      await settle();
    },
    finished,
    async coach(api) {
      await click(button(api.container, /Go after a coaching job|Back to the sideline/));
      await settle();
      if (!findButton(api.container, /Back to the playing career/)) throw new Error('the coaching career did not open');
      await click(button(api.container, /Back to the playing career/));
      await settle();
    },
    async beforeSecondReload(api) {
      await click(button(api.container, /Go after a coaching job|Back to the sideline/));
      await settle();
      if (!findButton(api.container, /Back to the playing career/)) throw new Error('the coaching career did not open before the reload');
    },
  };
}

const CASES: Case[] = [
  /* fight: a finished save restored in an effect after mount */
  {
    id: 'fight-career', shape: 'fight', usesMark: true,
    seed() {
      const st = newFightCareer('Probe Boxer', 'welter', 'outboxer', 'r643');
      st.fighter.age = 41; // the next bout is his last
      localStorage.setItem('fight-career-save-v1', JSON.stringify({ st, phase: 'hub' }));
    },
    mount: () => mountEl(<FightCareerBoard />, '/fight-career', c => textOf(c).includes('Probe Boxer')),
    async finish(api) {
      const offer = Array.from(api.container.querySelectorAll('button')).find(b => /\d+ rounds/.test(textOf(b)));
      if (!offer) throw new Error('no fight offer on the hub');
      await click(offer);
      await click(button(api.container, /^Finish camp$/));
      await click(button(api.container, /^Fight$/));
      const skip = findButton(api.container, /^Skip to the decision$/);
      if (skip) await click(skip);
      await click(button(api.container, /^See how you are remembered$/));
      await settle();
    },
    finished: api => /See how you are remembered|Final verdict/.test(textOf(api.container)),
  },
  {
    id: 'fight-gym', shape: 'fight', usesMark: true,
    seed() {
      const g = newGym('Probe Gym', 'r643');
      g.money = 0; // this week's bills close the doors
      localStorage.setItem('fight-gym-save-v1', JSON.stringify({ g }));
    },
    mount: () => mountEl(<FightGymBoard />, '/fight-gym', c => textOf(c).includes('Probe Gym')),
    async finish(api) {
      await click(button(api.container, /^Nothing this week, pay the bills$/));
      await settle();
    },
    finished: api => textOf(api.container).includes('What the gym is remembered as'),
  },
  {
    id: 'fight-promoter', shape: 'fight', usesMark: true,
    seed() {
      const st = newPromoter('Probe Promo', 'r643');
      st.money = -1000; // no gate covers this, so the first show is the last
      localStorage.setItem('fight-promoter-save-v1', JSON.stringify({ st }));
    },
    mount: () => mountEl(<FightPromoterBoard />, '/fight-promoter', c => textOf(c).includes('Probe Promo')),
    async finish(api) {
      /* Book one legal fight: pick men from the pool until one has a foe. */
      const rows = () => Array.from(api.container.querySelectorAll<HTMLButtonElement>('button'))
        .filter(b => /draw \d+/.test(textOf(b)) && !b.disabled);
      for (let i = 0; i < rows().length; i += 1) {
        await click(rows()[i]);
        const foe = Array.from(api.container.querySelectorAll<HTMLButtonElement>('button')).find(b => /appeal \d+/.test(textOf(b)));
        if (foe) { await click(foe); break; }
        await click(button(api.container, /Pick somebody else/));
      }
      await click(button(api.container, /^Put the show on$/));
      await settle();
    },
    finished: api => /See how you are remembered|How you are remembered/.test(textOf(api.container)),
  },

  /* career: done stays true across the coaching career */
  career('nfl-my-career', () => <NflMyCareerBoard />,
    rng => startCareer('Probe Nfl', 'QB', ARCHETYPES.QB[0], rng),
    (c, rng) => { simSeason(c as never, 80, rng); progress(c as never, rng); }),
  career('nba-my-career', () => <NbaMyCareerBoard />,
    rng => startNbaCareer('Probe Nba', 'PG', NBA_ARCHETYPES.PG[0], rng),
    (c, rng) => { simNbaSeason(c as never, 80, rng); nbaProgress(c as never, rng); }),
  career('mlb-my-career', () => <MlbMyCareerBoard />,
    rng => startMlbCareer('Probe Mlb', 'CF', MLB_ARCHETYPES.CF[0], rng),
    (c, rng) => { simMlbSeason(c as never, 80, rng); mlbProgress(c as never, rng); }),
  career('nhl-my-career', () => <NhlMyCareerBoard />,
    rng => startNhlCareer('Probe Nhl', 'C', NHL_ARCHETYPES.C[0], rng),
    (c, rng) => { simNhlSeason(c as never, 80, rng); nhlProgress(c as never, rng); }),

  /* slug: the mark goes under the recorder's slug, the save stays where it was */
  hl('nfl-higher-lower', 'nfl-hl', useNflHL),
  hl('nba-higher-lower', 'nba-hl', useNbaHL),
  hl('mlb-higher-lower', 'mlb-hl', useMlbHL),
  hl('hockey-higher-lower', 'hockey-hl', useHockeyHL),
  hl('cfb-higher-lower', 'cfb-hl', useCfbHL),
  hl('f1-higher-lower', 'f1-hl', useF1HL),
  hl('tennis-higher-lower', 'tennis-hl', useTennisHL),
  hl('golf-higher-lower', 'golf-hl', useGolfHL),
  hl('afl-higher-lower', 'afl-hl', useAflHL),
  {
    id: 'ufc', shape: 'slug', usesMark: true, storageSlug: 'ufc-game',
    mount: () => mountHook(useUfcGame, r => !r.isLoading && !!r.targetFighter),
    finish: async api => { await run(() => api.r.makeGuess(api.r.targetFighter)); },
    finished: api => api.r.mode === 'daily' && api.r.gameStatus !== 'playing',
    toggle: modeToggle(),
  },
  {
    id: 'football-connect-4', shape: 'slug', usesMark: true, storageSlug: 'football-connect4',
    async mount() {
      /* The answer checker is an edge function; every name is accepted. */
      vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
        const { playerName } = JSON.parse(init.body) as { playerName: string };
        return { ok: true, status: 200, json: async () => ({ valid: true, fullName: playerName }) };
      });
      return mountHook(useFootballConnect4, r => !r.isLoading);
    },
    async finish(api) {
      /* Blue stacks column 0 while red passes: four in a row on the 7th move. */
      for (let n = 0; n < 12 && api.r.phase === 'playing'; n += 1) {
        if (api.r.currentTurn === 'blue') {
          await run(() => api.r.selectColumn(0));
          await run(() => api.r.submitPlayer(`Probe Player ${n}`));
        } else {
          await run(() => api.r.skipTurn());
        }
      }
    },
    finished: api => api.r.mode === 'daily' && api.r.phase === 'won',
    toggle: modeToggle(),
  },
  {
    id: 'career', shape: 'slug', usesMark: true, storageSlug: 'career-path',
    mount: () => mountHook(useCareerGame, r => !r.isLoadingPool && !r.isLoading),
    finish: async api => { await run(() => api.r.makeGuess(api.r.targetPlayer.name)); },
    finished: api => api.r.mode === 'daily' && api.r.gameStatus === 'won',
    toggle: modeToggle(),
  },

  /* toggle: the recorder reads the daily status alone */
  page('nba-grid', () => <NbaGrid />, gridFinish, { usesMark: false, ready: gridReady }),
  page('mlb-grid', () => <MlbGrid />, gridFinish, { usesMark: false, ready: gridReady }),
  page('hockey-grid', () => <HockeyGrid />, gridFinish, { usesMark: false, ready: gridReady }),
  page('cbb-grid', () => <CbbGrid />, gridFinish, { usesMark: false, ready: gridReady }),
  page('missing-five', () => <MissingFive />, giveUpFinish, { usesMark: true, ready: c => !!findButton(c, /^Give up$/) }),
  page('missing-nine', () => <MissingNine />, giveUpFinish, { usesMark: true, ready: c => !!findButton(c, /^Give up$/) }),
  page('missing-eleven', () => <MissingEleven />, giveUpFinish, { usesMark: true, ready: c => !!findButton(c, /^Give up$/) }),
  page('rank-em', () => <RankEm />, async api => {
    for (const item of getDailyRankRound().items) {
      await click(button(api.container, new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)));
    }
  }, { usesMark: true }),
  /* Give up here is its own flag, restored in a state initializer. */
  page('puck-detective', () => <PuckDetective />, async api => {
    await click(button(api.container, /^Give up$/));
    await click(button(api.container, /^Yes, reveal it$/));
  }, { usesMark: false, ready: c => !!findButton(c, /^Give up$/) }),
  page('guess-the-golfer', () => <GuessTheGolfer />, async api => {
    const answer = guessableGolfers[dailyIndex(today, guessableGolfers.length)].name;
    const input = api.container.querySelector('input[aria-label="Guess the golfer"]');
    if (!input) throw new Error('no guess box');
    await typeInto(input, answer);
    await click(button(api.container, new RegExp(`^${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)));
  }, { usesMark: true, daily: /^Daily$/, unlimited: /^Unlimited$/ }),

  /* restore: a finish restored after the data lands says so first */
  {
    id: 'champ-or-not', shape: 'restore', usesMark: true,
    mount: () => mountHook(useChampOrNot, r => r.loadState === 'ready' && r.rounds.length > 0),
    finish: api => withFakeTimers(async () => {
      for (let i = 0; i < 30 && !api.r.done; i += 1) {
        await run(() => api.r.answer(api.r.current.isTrue));
        await advance(2300);
      }
    }),
    finished: api => api.r.mode === 'daily' && api.r.done,
    toggle: modeToggle(),
  },
  {
    id: 'whod-they-beat', shape: 'restore', usesMark: true,
    mount: () => mountHook(useWhodTheyBeat, r => r.loadState === 'ready' && r.questions.length > 0),
    finish: api => withFakeTimers(async () => {
      for (let i = 0; i < 30 && !api.r.done; i += 1) {
        await run(() => api.r.answer(api.r.current.correctIndex));
        await advance(2300);
      }
    }),
    finished: api => api.r.mode === 'daily' && api.r.done,
    toggle: modeToggle(),
  },
  {
    id: 'silverware-sort', shape: 'restore', usesMark: true,
    mount: () => mountHook(useSilverwareSort, r => r.loadState === 'ready' && r.boards.length > 0),
    finish: api => withFakeTimers(async () => {
      /* Slot i is right when it holds team i, so placing 0 to 4 in order is
         the right order on the first attempt. */
      for (let b = 0; b < 10 && !api.r.done; b += 1) {
        for (let t = 0; t < 5; t += 1) await run(() => api.r.place(t));
        await run(() => api.r.submit());
        await advance(3500);
      }
    }),
    finished: api => api.r.mode === 'daily' && api.r.done,
    toggle: modeToggle(),
  },
  {
    id: 'jeopardy', shape: 'restore', usesMark: true,
    mount: () => mountHook(useQuizBoard, r => !r.loading && r.totalTiles > 0),
    async finish(api) {
      for (const cat of api.r.categories as string[]) {
        for (const v of VALUES) {
          const tile = api.r.board[cat]?.[v];
          if (!tile || tile.answered) continue;
          await run(() => api.r.select(cat, v));
          await run(() => api.r.setGuess(tile.clue.answer));
          await run(() => api.r.submit());
        }
      }
    },
    finished: api => api.r.finished,
  },
  {
    id: 'ball-iq', shape: 'restore', usesMark: true,
    mount: () => mountHook(useBallIq, r => !r.loading && r.questions.length > 0),
    async finish(api) {
      for (let i = 0; i < 40 && api.r.status !== 'finished'; i += 1) {
        if (api.r.status === 'answering') await run(() => api.r.answer(api.r.current.options[0]));
        else await run(() => api.r.next());
      }
    },
    finished: api => api.r.status === 'finished',
  },
  {
    id: 'mystery-box', shape: 'restore', usesMark: true,
    mount: () => mountHook(useMysteryBox, r => !r.loading),
    async finish(api) {
      for (let i = 0; i < 40 && !api.r.finished; i += 1) {
        if (!api.r.revealed) await run(() => api.r.openPack());
        else await run(() => api.r.discard());
      }
    },
    finished: api => api.r.finished,
  },
  {
    id: 'nfl-career', shape: 'restore', usesMark: false,
    mount: () => mountHook(useNFLCareer),
    finish: async api => { await run(() => api.r.giveUp()); },
    finished: api => api.r.mode === 'daily' && api.r.gameStatus !== 'playing',
    toggle: modeToggle(),
    /* The result screen's "Play Unlimited" from the daily: it has to leave
       the daily, so solving that player neither records under the daily nor
       touches today's save. */
    async replay(api) {
      const saved = localStorage.getItem('nfl-career-daily');
      await run(() => api.r.nextUnlimited());
      expect(api.r.mode, 'Play Unlimited leaves the daily').toBe('unlimited');
      await run(() => api.r.makeGuess(api.r.targetPlayer.name));
      expect(api.r.gameStatus, 'the unlimited player is solved').toBe('won');
      expect(localStorage.getItem('nfl-career-daily'), 'today\'s save is untouched').toBe(saved);
      await run(() => api.r.switchMode('daily'));
    },
  },

  /* extra: found by the sweep, not named by the audit */
  {
    /* The daily is restored and marked at mount, but the page's phase waits
       on the pool, and the mark lasts five seconds. The pool here lands with
       the clock six seconds on, the case of a slow connection. */
    id: 'career-ladder', shape: 'extra', usesMark: true,
    async mount() {
      const api = await mountEl(<CareerLadder />, '/career-ladder', c => !!findButton(c, UNLIMITED_TOGGLE));
      await settle();
      vi.setSystemTime(new Date(Date.now() + 6000));
      try {
        const pending = F.LADDER.pending.splice(0);
        if (!pending.length) throw new Error('the page never asked for its pool');
        await run(() => { for (const resolve of pending) resolve(F.LADDER_POOL); });
        await waitFor(() => {
          if (!findButton(api.container, /^Give up$/) && !resultCard(api.container)) throw new Error('the ladder has not dealt yet');
        }, { timeout: 3000 });
        await settle();
      } finally {
        vi.useRealTimers();
      }
      return api;
    },
    async finish(api) {
      await click(button(api.container, /^Give up$/));
      await click(button(api.container, /^Yes, reveal it$/));
    },
    finished: api => !!resultCard(api.container),
    async toggle(api) {
      await click(button(api.container, UNLIMITED_TOGGLE));
      await settle();
      await click(button(api.container, DAILY_TOGGLE));
      await settle();
    },
  },
  {
    /* A give up was stored as still playing, so its reload carried no mark. */
    id: 'transfer-path', shape: 'extra', usesMark: true,
    mount: () => mountHook(useTransferPath, r => !r.isLoadingPool && !r.isLoading),
    finish: async api => { await run(() => api.r.giveUp()); },
    finished: api => api.r.mode === 'daily' && api.r.status === 'gaveup',
  },
  {
    /* The Ball IQ shape: the place is restored at mount, the cases after. */
    id: 'grade-transfer', shape: 'extra', usesMark: true,
    mount: () => mountHook(useGradeTransfer, r => !r.loading && r.rounds.length > 0),
    async finish(api) {
      for (let i = 0; i < 20 && api.r.status !== 'finished'; i += 1) {
        if (api.r.status === 'grading') await run(() => api.r.grade('A'));
        else await run(() => api.r.next());
      }
    },
    finished: api => api.r.status === 'finished',
  },
  {
    /* Restored in the initializer, so a reload is quiet; the hole was the
       menu. Unlimited clears the result first, and when its market fails to
       open, Back then Daily reopened the day's result after mount with no
       mark. The finish reuses the Round 458 daily driver and its fixtures. */
    id: 'player-stock-market', shape: 'extra', usesMark: true,
    async mount() {
      const m = await stockDriver.mount();
      return { unmount: m.unmount, r: null, container: m.container };
    },
    async finish(api) {
      const m = { container: api.container, unmount: api.unmount };
      await stockDriver.enterDaily(m);
      await stockDriver.finish(m);
    },
    finished: api => !!resultCard(api.container),
    async replay(api) {
      await click(button(api.container, /^Open another season$/));
      setTableFixture('player_market_tracked', []); // the unlimited market cannot open
      await click(button(api.container, /^Surprise me$/));
      await waitFor(() => { if (!findButton(api.container, /^Back$/) || !textOf(api.container).includes("Couldn't open")) throw new Error('the unlimited market has not failed yet'); });
      const back = Array.from(api.container.querySelectorAll('button')).filter(b => textOf(b).trim() === 'Back').pop();
      if (!back) throw new Error('no Back on the error screen');
      await click(back);
      await click(button(api.container, /^Today's market is closed/));
      await settle();
      expect(resultCard(api.container), 'the day\'s result reopens').not.toBeNull();
    },
  },
];

/* ------------------------------------------------------------------------ */
/* The runner                                                                */
/* ------------------------------------------------------------------------ */

beforeEach(() => {
  resetMocks();
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('no double record', () => {
  it('discovers the table', () => {
    for (const c of CASES) {
      console.log('NO_DOUBLE_CASE ' + JSON.stringify({ id: c.id, shape: c.shape, usesMark: c.usesMark, toggle: !!c.toggle, coach: !!c.coach }));
    }
    const ids = CASES.map(c => c.id);
    expect(new Set(ids).size, 'every row has its own slug').toBe(ids.length);
    const count = (s: Shape) => CASES.filter(c => c.shape === s).length;
    console.log(`NO_DOUBLE_TABLE ${JSON.stringify({ rows: CASES.length, fight: count('fight'), career: count('career'), slug: count('slug'), toggle: count('toggle'), restore: count('restore'), extra: count('extra') })}`);
    expect(count('slug'), 'all twelve slug pairs').toBe(12);
    expect(count('toggle'), 'all ten toggle pages').toBeGreaterThanOrEqual(10);
    expect(count('restore'), 'all six restore hooks and NFL Career Path').toBeGreaterThanOrEqual(7);
  });

  it(CONTROL === 'nomark' ? 'nomark control: markRestoredFinish is a no-op' : 'markRestoredFinish is live', () => {
    markRestoredFinish('no-double-probe');
    const consumed = consumeRestoredFinish('no-double-probe');
    expect(consumed, CONTROL === 'nomark' ? 'the control must swallow the mark' : 'the real handshake must see the mark').toBe(CONTROL !== 'nomark');
  });

  for (const c of CASES.filter(x => !ONLY || x.id === ONLY)) {
    it(c.id, async () => {
      const once = [`/${c.id}`];
      c.seed?.();
      let api = await c.mount();
      await settle();
      try {
        expect(c.finished(api), 'a fresh game is not finished').toBe(false);
        await c.finish(api);
        await settle();
        expect(c.finished(api), 'the finish reached the finished state').toBe(true);
        expect(paths(), 'the finish records exactly once').toEqual(once);

        if (c.storageSlug) {
          const raw = localStorage.getItem(dailyKey(c.storageSlug));
          expect(raw, `the daily is saved under ${dailyKey(c.storageSlug)}, where existing saves sit`).not.toBeNull();
          expect((JSON.parse(raw ?? '{}') as { gameStatus?: string }).gameStatus, 'the saved daily is finished').not.toBe('playing');
          if (c.storageSlug !== c.id) expect(localStorage.getItem(dailyKey(c.id)), 'nothing is saved under the recorder\'s slug').toBeNull();
        }

        if (c.toggle) {
          await c.toggle(api);
          await settle();
          expect(c.finished(api), 'back on the daily, it is still finished').toBe(true);
          expect(paths(), 'a mode toggle and back records nothing').toEqual(once);
        }
        if (c.coach) {
          for (let i = 1; i <= 3; i += 1) {
            await c.coach(api);
            expect(c.finished(api), `coaching round trip ${i} comes back to the retired career`).toBe(true);
            expect(paths(), `coaching round trip ${i} records nothing`).toEqual(once);
          }
        }
        if (c.replay) {
          await c.replay(api);
          await settle();
          expect(paths(), 'the replay path records nothing').toEqual(once);
        }
      } finally {
        api.unmount();
      }

      for (let reload = 1; reload <= 2; reload += 1) {
        api = await c.mount();
        await settle();
        try {
          expect(c.finished(api), `reload ${reload} restores the finished game`).toBe(true);
          if (reload === 1 && c.toggle) {
            await c.toggle(api);
            await settle();
            expect(c.finished(api), `reload ${reload}: back on the daily, it is still finished`).toBe(true);
          }
          if (reload === 1 && c.beforeSecondReload) await c.beforeSecondReload(api);
          expect(paths(), `reload ${reload} records nothing`).toEqual(once);
        } finally {
          api.unmount();
        }
      }
      expect(paths(), 'recorded once across the finish, the toggles, the coaching and two reloads').toEqual(once);
    }, 30000);
  }
});
