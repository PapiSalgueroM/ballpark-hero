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
 */
import './dailyReload/mocks';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resetMocks } from './dailyReload/mocks';

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
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('a damaged daily save resets itself', () => {
  for (const row of ROWS.filter((r) => !ONLY || r.route === ONLY)) {
    it(row.route, async () => {
      /* A first mount loads the page's own lazy pieces (the guide block
         says "loading" until its chunk lands), so the baseline is the second. */
      await mount(row);
      localStorage.clear();
      seen.clear();
      const fresh = await mount(row);
      const slugs = [...seen.entries()].filter(([, s]) => s.loaded);
      expect(slugs.length, 'the daily hook loaded on a fresh mount').toBeGreaterThan(0);
      const failures: string[] = [];
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
        if (form.same && html !== fresh) {
          let at = 0;
          while (at < html.length && html[at] === fresh[at]) at++;
          failures.push(`${form.name}: drew a different page from a fresh daily, first at ${at}: "${html.slice(Math.max(0, at - 60), at + 60)}"`);
        }
      }
      console.log(`R848_SHAPES ${JSON.stringify({ route: row.route, slugs: slugs.map(([s, v]) => ({ s, i: v.index, id: v.id ?? null })), failures })}`);
      expect(failures).toEqual([]);
    }, 60000);
  }
});
