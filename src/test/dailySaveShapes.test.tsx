/**
 * A damaged daily save resets itself and never breaks the page.
 *
 * Round 848, from the other lane's audit (QA847-03). On nine Higher or Lower
 * games a save that kept v, date and puzzleIndex but carried guesses as null,
 * an object or an array holding null showed "This page broke", and the retry
 * read the same bytes and broke again: useDailyPuzzle validated the version,
 * the date and the puzzle, then trusted whatever the game's deserializer
 * returned, and every deserializer on the site is a type assertion. Measured
 * against the hook as it stood before this round, 35 of these 36 routes threw
 * on those forms, not nine (Missing XI was the one that already filtered).
 *
 * This file mounts the REAL page of every route that renders a useDailyPuzzle
 * consumer (the three consumers no route renders are covered at hook level in
 * dailySaveHardening.test.tsx), first with no save, then with today's key
 * preset to each damaged form below, built on the very version, date, puzzle
 * index and puzzle id that route's own hook reads, so the form reaches the
 * guess check instead of being turned away earlier. Every damaged mount must
 * throw nothing and must have loaded the daily. The forms in DAMAGED must also
 * draw exactly the page a fresh daily draws (React's generated ids aside). A
 * log longer than the game can ever write is held to that on the games that
 * declare their size (`long`); elsewhere, and for the two fuzz forms (every
 * action tag the site uses, bare, and items whose fields all have the wrong
 * type), it must mount without throwing.
 *
 * scripts/simDailySaveHardening.mjs runs this file and carries the negative
 * control: R848_CONTROL=shape removes the shared shape check from a copy of
 * the hook, and this file must then go red.
 *
 * Round 1210: the baseline is taken only once the route's guide has landed.
 * The test used to call a page settled after six turns of a zero timer, which
 * is a count and not a condition. Two things on a game page draw differently
 * before and after the route's guide file arrives (the guide block, which
 * stamps data-seo-content loading or ready, and the "?" help button, which is
 * not drawn at all until the guide resolves), and the guide files are fetched
 * one sport at a time and kept. So the FIRST row that needed a given file paid
 * for its import inside its own two baseline mounts: when the import landed
 * after them, "fresh" was the page without its guide, every damaged mount had
 * it, and the row failed with "drew a different page from a fresh daily" on
 * healthy code. Measured on GitHub runners on origin/main 074a9054, three runs
 * side by side: 12 of 12 runs red, /olympics every time and /nba-career twice
 * (the first rows of world.ts and basketball.ts).
 * Now each row fetches its route's guide through the loader itself before its
 * first mount and says by name when it has not landed, takes its baseline, and
 * after the last damaged form mounts fresh once more: if that differs, the
 * failure says the fresh page moved, which names any lazy piece that lands
 * late and not only the guide.
 * R848_GUIDE makes the race happen on demand (the harness's guide controls):
 *   slow  the loader answers 300 ms late, the row does its fetch: all green.
 *   late  the loader waits behind a gate, the row SKIPS its fetch and opens
 *         the gate only after its baseline (the two named guide assertions are
 *         off): the first row of each guide file draws the recorded red.
 *   held  the gate never opens: every row with a guide fails by name within a
 *         short bound, never on a diff and never by hanging.
 */
import './dailyReload/mocks';
import { act, cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { loadGameContent, peekGameContent, PATH_BUNDLE } from '@/data/gameContent/loader';
import { resetMocks } from './dailyReload/mocks';

/* The guide loader, passed through untouched unless R848_GUIDE is set. With it
   set, a load of a route whose guide file is not held yet waits first: a real
   300 ms under slow, a gate under late and held. A file that is already held
   is never delayed, so only the first row of each guide file is exposed, as on
   a real run. */
const guide = vi.hoisted(() => {
  const state = { mode: process.env.R848_GUIDE || '', open: () => {}, gate: Promise.resolve(), waited: 0 };
  state.gate = new Promise<void>((r) => { state.open = r; });
  return state;
});
vi.mock('@/data/gameContent/loader', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/data/gameContent/loader')>();
  if (!guide.mode) return { ...real };
  return {
    ...real,
    loadGameContent: async (path: string) => {
      if (real.PATH_BUNDLE[path] !== undefined && real.peekGameContent(path) === undefined) {
        guide.waited += 1;
        if (guide.mode === 'slow') await new Promise((r) => setTimeout(r, 300));
        else await guide.gate;
      }
      return real.loadGameContent(path);
    },
  };
});
const GUIDE = guide.mode;
if (GUIDE && !['slow', 'late', 'held'].includes(GUIDE)) throw new Error(`unknown R848_GUIDE ${GUIDE}`);
/* How long a row waits for its guide before it fails by name. */
const GUIDE_BOUND_MS = GUIDE === 'held' ? 500 : 30000;
const GUIDE_NOT_LANDED = 'the guide for this route had not landed when the baseline was taken';

/* What each useDailyPuzzle call reads, captured through a pass-through
   wrapper: the storage key prefix, and once it has loaded, the index and id
   a save must carry to reach the guess check at all. */
const seen = vi.hoisted(() => new Map<string, { index: number; id?: string; loaded: boolean }>());
vi.mock('@/hooks/useDailyPuzzle', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/hooks/useDailyPuzzle')>();
  return {
    ...real,
    useDailyPuzzle: ((options: Parameters<typeof real.useDailyPuzzle>[0]) => {
      const state = real.useDailyPuzzle(options);
      const slug = options.storageSlug ?? options.gameSlug;
      const id = state.puzzle != null && options.getPuzzleId ? options.getPuzzleId(state.puzzle as never) : undefined;
      const prior = seen.get(slug);
      seen.set(slug, { index: state.puzzleIndex, id, loaded: (prior?.loaded ?? false) || !state.isLoading });
      return state;
    }) as typeof real.useDailyPuzzle,
  };
});

/* Career Ladder takes its daily man from a Supabase pool, which the shared
   stub answers with nothing; the same made up pool src/test/noDoubleRecord
   uses, handed over at once. */
const LADDER_POOL = vi.hoisted(() => Array.from({ length: 12 }, (_, i) => ({
  id: `p${String(i).padStart(2, '0')}`, name: `Ladder Player ${i}`, nationality: 'England', position: 'Midfielder',
  seasons: Array.from({ length: 5 }, (_, s) => ({
    season: `201${s}/1${s + 1}`, club: `Club ${i}-${s}`, goals: 1, assists: 1, appearances: 10, marketValue: (i + 1) * 1_000_000, sortOrder: s,
  })),
})));
vi.mock('@/lib/careerLadder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/careerLadder')>()),
  fetchCareerPool: async () => LADDER_POOL,
}));

const TODAY = '2026-10-01';

const cell = { value: 'x', status: 'incorrect' };
const HL_LONG = () => Array.from({ length: 11 }, () => ({ t: 'result', correct: true }));
const CONN_LONG = () => Array.from({ length: 5 }, () => ({ t: 'x' }));

type Row = { route: string; page: () => Promise<{ default: ComponentType }>; long?: () => unknown[] };
/* Every route whose page renders a useDailyPuzzle consumer. The harness
   checks this list against a grep of the source, so a new consumer cannot be
   left out. long: a log one past what the game can ever write, for the games
   that declare their size through isValidGuesses. */
export const ROWS: Row[] = [
  { route: '/afl-higher-lower', page: () => import('@/pages/AflHigherLower'), long: HL_LONG },
  { route: '/baseball-career', page: () => import('@/pages/BaseballCareer') },
  { route: '/baseball-connections', page: () => import('@/pages/BaseballConnections'), long: CONN_LONG },
  { route: '/career', page: () => import('@/pages/CareerGame') },
  { route: '/cfb-higher-lower', page: () => import('@/pages/CfbHigherLower'), long: HL_LONG },
  { route: '/college-grid', page: () => import('@/pages/CollegeGrid') },
  { route: '/connections', page: () => import('@/pages/Connections') },
  { route: '/f1-higher-lower', page: () => import('@/pages/F1HigherLower'), long: HL_LONG },
  { route: '/football-connect-4', page: () => import('@/pages/FootballConnect4') },
  { route: '/football-grid', page: () => import('@/pages/FootballGrid') },
  { route: '/footle', page: () => import('@/pages/Footle'), long: () => Array.from({ length: 9 }, () => ({
    playerName: 'Nobody', isCorrect: false,
    cells: { nationality: cell, club: cell, goals: cell, assists: cell, position: cell, kitNumber: cell, age: cell, marketValue: cell },
  })) },
  { route: '/golf-higher-lower', page: () => import('@/pages/GolfHigherLower'), long: HL_LONG },
  { route: '/guess-the-college', page: () => import('@/pages/GuessTheCollege') },
  { route: '/hockey-career', page: () => import('@/pages/HockeyCareer') },
  { route: '/hockey-higher-lower', page: () => import('@/pages/HockeyHigherLower'), long: HL_LONG },
  { route: '/mlb-higher-lower', page: () => import('@/pages/MlbHigherLower'), long: HL_LONG },
  { route: '/nba-career', page: () => import('@/pages/NbaCareer') },
  { route: '/nba-connections', page: () => import('@/pages/NbaConnections'), long: CONN_LONG },
  { route: '/nba-higher-lower', page: () => import('@/pages/NbaHigherLower'), long: HL_LONG },
  { route: '/nfl-connections', page: () => import('@/pages/NflConnections'), long: CONN_LONG },
  { route: '/nfl-higher-lower', page: () => import('@/pages/NflHigherLower'), long: HL_LONG },
  { route: '/nhl-connections', page: () => import('@/pages/NhlConnections'), long: CONN_LONG },
  { route: '/olympics', page: () => import('@/pages/Olympics') },
  { route: '/shirt-number', page: () => import('@/pages/ShirtNumber') },
  { route: '/soccer-grid', page: () => import('@/pages/SoccerGrid') },
  { route: '/tennis-higher-lower', page: () => import('@/pages/TennisHigherLower'), long: HL_LONG },
  { route: '/transfer-path', page: () => import('@/pages/TransferPath') },
  { route: '/ufc', page: () => import('@/pages/UfcGame'), long: () => Array.from({ length: 9 }, () => ({
    fighterName: 'Nobody', isCorrect: false,
    cells: { yearsActive: cell, weightClass: cell, nationality: cell, age: cell, wins: cell, losses: cell, draws: cell, koTko: cell, submissions: cell },
  })) },
  { route: '/career-ladder', page: () => import('@/pages/CareerLadder') },
  { route: '/guess-the-golfer', page: () => import('@/pages/GuessTheGolfer') },
  { route: '/missing-eleven', page: () => import('@/pages/MissingEleven') },
  { route: '/missing-five', page: () => import('@/pages/MissingFive') },
  { route: '/missing-nine', page: () => import('@/pages/MissingNine') },
  { route: '/missing-xi', page: () => import('@/pages/MissingXi') },
  { route: '/puck-detective', page: () => import('@/pages/PuckDetective') },
  { route: '/rank-em', page: () => import('@/pages/RankEm'), long: () => [{ order: [] }, { order: [] }] },
];

const ONLY = process.env.ONLY || '';

async function settle() {
  for (let i = 0; i < 6; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
}

/* React's generated ids count up across mounts; nothing else may differ. */
const normalise = (html: string) => html.replace(/:r[0-9a-z]+:/g, ':r:').replace(/radix-[^"\s]+/g, 'radix-');

async function mount(row: Row) {
  const Page = (await row.page()).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <MemoryRouter initialEntries={[row.route]}><Page /></MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>,
  );
  await settle();
  const html = normalise(view.container.innerHTML);
  view.unmount();
  return html;
}

type Form = { name: string; key: (slug: string) => string; bytes: string; same: boolean };

/* The audit's three forms, the brief's five more, and a status nothing writes. */
function damaged(base: { index: number; id?: string }, row: Row): Form[] {
  const today = (slug: string) => `${slug}-daily-${TODAY}`;
  const head = { v: 1, date: TODAY, puzzleIndex: base.index, ...(base.id !== undefined ? { puzzleId: base.id } : {}) };
  const save = (guesses: unknown, gameStatus: unknown = 'playing') => JSON.stringify({ ...head, guesses, gameStatus });
  const two = save([{ t: 'result', correct: true }, { t: 'result', correct: false }]);
  const forms: Form[] = [
    { name: 'guesses null', key: today, bytes: save(null), same: true },
    { name: 'guesses an object', key: today, bytes: save({ 0: { t: 'result', correct: true } }), same: true },
    { name: 'guesses an array holding null', key: today, bytes: save([{ t: 'result', correct: true }, null]), same: true },
    { name: 'guesses a string', key: today, bytes: save('[{"t":"result","correct":true}]'), same: true },
    { name: 'guesses a number', key: today, bytes: save(3), same: true },
    { name: 'a save cut off inside the guess array', key: today, bytes: two.slice(0, two.indexOf('},{') + 2), same: true },
    { name: 'a finished save dated tomorrow under today\'s key', key: today, bytes: JSON.stringify({ ...head, date: '2026-10-02', guesses: [], gameStatus: 'lost' }), same: true },
    { name: 'a finished save under tomorrow\'s key', key: (slug) => `${slug}-daily-2026-10-02`, bytes: JSON.stringify({ ...head, date: '2026-10-02', guesses: [], gameStatus: 'lost' }), same: true },
    { name: 'a status the hook never writes', key: today, bytes: save([], 'finished'), same: true },
  ];
  const tags = ['ok', 'x', 'cell', 'step', 'move', 'guess', 'w', 'miss', 'won', 'give', 'reveal', 'wrong', 'result', 'hint', 'skip', 's', 'g'];
  const wrong = { cellIndex: 'a', playerName: 5, rarity: 'x', board: 5, theme: 5, players: 'abc', diff: 5, cat: 5, key: 5, name: 5, player: 5, club: 5, col: 'a', row: 'b', team: 5, v: 5, score: 'a', order: 'abc', guess: 'a', correct: 'yes', playerId: 'z', isCorrect: 'no', cells: 5, fighterName: 5 };
  forms.push(
    row.long
      ? { name: 'a log one past what the game can write', key: today, bytes: save(row.long()), same: true }
      : { name: 'a log of 1001 entries', key: today, bytes: save(Array.from({ length: 1001 }, () => ({ t: 'x' }))), same: false },
    { name: 'every action tag, bare', key: today, bytes: save(tags.map((t) => ({ t }))), same: false },
    { name: 'every field the wrong type', key: today, bytes: save(tags.map((t) => ({ t, ...wrong }))), same: false },
  );
  return forms;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(`${TODAY}T16:00:00Z`));
  vi.spyOn(Math, 'random').mockReturnValue(0.01234);
  localStorage.clear();
  resetMocks();
  seen.clear();
  /* A gate of its own for every row: the one a row opened must not let the
     next guide file through early. */
  guide.gate = new Promise<void>((r) => { guide.open = r; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
/* Output, not runtime, proves the switch was on: how many loads were made to wait. */
afterAll(() => { if (GUIDE) console.log(`R848_GUIDE ${JSON.stringify({ mode: GUIDE, waited: guide.waited })}`); });

/** True when the promise settled inside the bound. The timer is real (only Date is faked here). */
function landedWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    work.then(() => true),
    new Promise<boolean>((r) => { timer = setTimeout(() => r(false), ms); }),
  ]).finally(() => clearTimeout(timer));
}

const firstDifference = (a: string, b: string) => {
  let at = 0;
  while (at < a.length && a[at] === b[at]) at++;
  return `first at ${at}: "${a.slice(Math.max(0, at - 60), at + 60)}"`;
};

describe('a damaged daily save resets itself', () => {
  for (const row of ROWS.filter((r) => !ONLY || r.route === ONLY)) {
    it(row.route, async () => {
      const failures: string[] = [];
      const hasGuide = PATH_BUNDLE[row.route] !== undefined;
      let guideState: 'ready' | 'none' | 'skipped' | 'missing' = hasGuide ? 'missing' : 'none';
      let slugs: [string, { index: number; id?: string; loaded: boolean }][] = [];
      run: {
        /* The route's guide, through the loader itself, before anything is
           mounted: from here every mount of this row, baseline and damaged
           alike, starts with the guide held (what peekGameContent is for). */
        if (hasGuide && GUIDE === 'late') guideState = 'skipped';
        else if (hasGuide) {
          const landed = await landedWithin(loadGameContent(row.route), GUIDE_BOUND_MS);
          if (!landed || peekGameContent(row.route) === undefined) {
            failures.push(`${GUIDE_NOT_LANDED} (the loader had not answered after ${GUIDE_BOUND_MS} ms)`);
            break run;
          }
          guideState = 'ready';
        }
        /* A first mount still warms the page's own lazy pieces, so the
           baseline is the second. */
        await mount(row);
        localStorage.clear();
        seen.clear();
        const fresh = await mount(row);
        slugs = [...seen.entries()].filter(([, s]) => s.loaded);
        expect(slugs.length, 'the daily hook loaded on a fresh mount').toBeGreaterThan(0);
        if (GUIDE !== 'late' && fresh.includes('data-seo-content="loading"')) {
          failures.push(`${GUIDE_NOT_LANDED} (the baseline's guide block still says loading)`);
          break run;
        }
        if (hasGuide && GUIDE === 'late') {
          guide.open();
          await loadGameContent(row.route);
        }
        for (const form of damaged(slugs[0][1], row)) {
          localStorage.clear();
          seen.clear();
          for (const [slug] of slugs) localStorage.setItem(form.key(slug), form.bytes);
          let html = '';
          try {
            html = await mount(row);
          } catch (e) {
            failures.push(`${form.name}: threw ${(e as Error).message.split('\n')[0]}`);
            continue;
          }
          if (![...seen.values()].some((s) => s.loaded)) failures.push(`${form.name}: the daily never loaded`);
          if (form.same && html !== fresh) failures.push(`${form.name}: drew a different page from a fresh daily, ${firstDifference(html, fresh)}`);
        }
        /* The baseline once more, last. A lazy piece that landed while the row
           ran shows here as itself, and not as a damaged save's fault. */
        localStorage.clear();
        seen.clear();
        const again = await mount(row);
        if (again !== fresh) failures.push(`the fresh page moved while the row ran, ${firstDifference(again, fresh)}`);
      }
      console.log(`R848_SHAPES ${JSON.stringify({ route: row.route, slugs: slugs.map(([s, v]) => ({ s, i: v.index, id: v.id ?? null })), guide: guideState, failures })}`);
      expect(failures).toEqual([]);
    }, 60000);
  }
});
