/**
 * Round 986: the comparison and streak games reveal their score on the result
 * moment.
 *
 * Round 710 built a score pill into the shared result moment, and for a year
 * only Deadline Day passed it a score, so every other game showed its emoji
 * where the score should land. This file mounts each of the sixteen pages in
 * its finished state from a fixture and checks that the pill reads exactly the
 * score the game's own hook reports (or, for Rank 'Em, which keeps its state
 * in the page, the score it hands the completion recorder), once for a win and
 * once for a loss. The headline must stay the card's first h2.
 *
 * Every page is the REAL page. Only its game hook (so the finished state can be
 * dealt without playing ten rounds), the network, the recorder and the share
 * buttons are stubbed. The Higher or Lower totals come from the real
 * higherLowerScore and Face Off's from the real totals(), so a fixture can
 * never hold a score the game could not reach.
 *
 * Negative controls, run by hand in Round 986 and measured:
 *   1. the score prop deleted from all sixteen calls: 32 of 33 cases fail
 *      ("expected null to be '145'"), every page case, and only the fixture
 *      check that holds no page passes;
 *   2. the NBA page handed correctCount in place of totalScore: both NBA cases
 *      fail ("expected '8' to be '145'"), so a pill showing the wrong number of
 *      the page's own is caught, not just a missing one.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { higherLowerScore } from '@/lib/higherLowerScore';
import { loadSave, totals, outcome, pointsFor, type RoundResult } from '@/lib/faceOff';
import { higherLowerPlayers, hlNoteFor } from '@/data/higherLowerPlayers';
import { BOARD_SIZE } from '@/lib/silverwareSort';
import { getDailyRankRound, RANK_POINTS_PER_SLOT } from '@/lib/orderTheList';
import hofPlayers from '@/data/hofPlayers';

/* eslint-disable @typescript-eslint/no-explicit-any */
const H = vi.hoisted(() => ({
  fix: {} as Record<string, any>,
  recorded: [] as Array<{ slug: string; done: boolean; score: unknown }>,
}));

vi.mock('@/lib/completions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  recordCompletion: vi.fn(),
  recordActivity: vi.fn(),
  recordStreakDay: vi.fn(),
  getCurrentPlayerName: () => 'Tester',
}));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined, loading: false }),
}));
vi.mock('sonner', () => {
  const toast = Object.assign(() => undefined, { success: () => undefined, error: () => undefined, info: () => undefined, message: () => undefined });
  return { toast, Toaster: () => null };
});
/* No page here may reach the network: every table answers empty. */
vi.mock('@/integrations/supabase/client', () => {
  const chain = (): unknown => new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === 'then') return (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
      if (typeof prop === 'symbol') return undefined;
      return () => chain();
    },
    apply() { return chain(); },
  });
  const supabase = {
    from: () => chain(),
    rpc: () => chain(),
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => undefined,
  };
  return { supabase, SUPABASE_URL: 'http://stub', SUPABASE_PUBLISHABLE_KEY: 'stub' };
});
vi.mock('@/components/game/ShareButtons', () => ({
  default: ({ score, gameName }: { score: string; gameName: string }) => <div data-testid="share" data-game={gameName} data-score={score} />,
}));
vi.mock('@/components/game/PostGameStats', () => ({ default: () => null }));

/* The game hooks, each answering with the fixture the case dealt. */
vi.mock('@/hooks/useNbaHL', () => ({ useNbaHL: () => H.fix.hl }));
vi.mock('@/hooks/useNflHL', () => ({ useNflHL: () => H.fix.hl }));
vi.mock('@/hooks/useMlbHL', () => ({ useMlbHL: () => H.fix.hl }));
vi.mock('@/hooks/useHockeyHL', () => ({ useHockeyHL: () => H.fix.hl }));
vi.mock('@/hooks/useCfbHL', () => ({ useCfbHL: () => H.fix.hl }));
vi.mock('@/hooks/useF1HL', () => ({ useF1HL: () => H.fix.hl }));
vi.mock('@/hooks/useTennisHL', () => ({ useTennisHL: () => H.fix.hl }));
vi.mock('@/hooks/useGolfHL', () => ({ useGolfHL: () => H.fix.hl }));
vi.mock('@/hooks/useAflHL', () => ({ useAflHL: () => H.fix.hl }));
vi.mock('@/hooks/useHigherLower', () => ({ useHigherLower: () => H.fix.soccerHl }));
vi.mock('@/hooks/useFaceOff', () => ({ useFaceOff: () => H.fix.faceOff }));
vi.mock('@/hooks/useChampOrNot', () => ({ useChampOrNot: () => H.fix.champ }));
vi.mock('@/hooks/useWhodTheyBeat', () => ({ useWhodTheyBeat: () => H.fix.whod }));
vi.mock('@/hooks/useSilverwareSort', () => ({ useSilverwareSort: () => H.fix.silver }));
vi.mock('@/hooks/useHofOrBust', () => ({ useHofOrBust: () => H.fix.hof }));
/* Rank 'Em keeps its state in the page: only the daily log and the recorder are stubbed. */
vi.mock('@/hooks/useDailyPuzzle', () => ({ useDailyPuzzle: () => H.fix.rankDaily }));
vi.mock('@/hooks/useGameCompletion', () => ({
  useGameCompletion: (slug: string, done: boolean, score: unknown) => { H.recorded.push({ slug, done, score }); },
}));

const noop = () => undefined;
/* Mounted inside act, with one tick for the guide panel's own effects, so a
   page's settled screen is what gets read. */
async function mount(el: JSX.Element) {
  let out!: ReturnType<typeof render>;
  await act(async () => {
    out = render(<HelmetProvider><MemoryRouter>{el}</MemoryRouter></HelmetProvider>);
    await new Promise(r => setTimeout(r, 0));
  });
  return out;
}
const pill = (root: HTMLElement) => root.querySelector('[role="status"] [data-result-score]')?.textContent ?? null;
const firstH2 = (root: HTMLElement) => root.querySelector('[role="status"] h2')?.textContent ?? null;
const stateOf = (root: HTMLElement) => root.querySelector('[role="status"] [data-result-moment]')?.getAttribute('data-result-moment') ?? null;

beforeEach(() => {
  localStorage.clear();
  H.fix = {};
  H.recorded = [];
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  if (!('IntersectionObserver' in window)) vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } });
  if (!('ResizeObserver' in window)) vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  window.scrollTo = noop as typeof window.scrollTo;
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/* ---------- the nine Higher or Lower sport pages: one hook shape ---------- */
const { default: NbaHigherLower } = await import('@/pages/NbaHigherLower');
const { default: NflHigherLower } = await import('@/pages/NflHigherLower');
const { default: MlbHigherLower } = await import('@/pages/MlbHigherLower');
const { default: HockeyHigherLower } = await import('@/pages/HockeyHigherLower');
const { default: CfbHigherLower } = await import('@/pages/CfbHigherLower');
const { default: F1HigherLower } = await import('@/pages/F1HigherLower');
const { default: TennisHigherLower } = await import('@/pages/TennisHigherLower');
const { default: GolfHigherLower } = await import('@/pages/GolfHigherLower');
const { default: AflHigherLower } = await import('@/pages/AflHigherLower');

/* A daily run of ten, scored by the real higherLowerScore. 8 right is a win, 3 a loss. */
const WIN_RUN = [true, true, true, false, true, true, true, true, true, false];
const LOSS_RUN = [true, false, false, true, true, false, false, false, false, false];
function hlFixture(run: boolean[]) {
  const results = run.map(correct => ({ correct }));
  return {
    mode: 'daily', switchMode: noop, hard: false, toggleHard: noop, activeRound: null,
    currentPair: null, currentRound: run.length, results, showingResult: false, streak: 0,
    gameStatus: 'complete', correctCount: run.filter(Boolean).length, totalScore: higherLowerScore(results),
    makeGuess: noop, totalRounds: run.length, isLoading: false,
  };
}

const HL_PAGES: Array<[string, () => JSX.Element]> = [
  ['/nba-higher-lower', () => <NbaHigherLower />],
  ['/nfl-higher-lower', () => <NflHigherLower />],
  ['/mlb-higher-lower', () => <MlbHigherLower />],
  ['/hockey-higher-lower', () => <HockeyHigherLower />],
  ['/cfb-higher-lower', () => <CfbHigherLower />],
  ['/f1-higher-lower', () => <F1HigherLower />],
  ['/tennis-higher-lower', () => <TennisHigherLower />],
  ['/golf-higher-lower', () => <GolfHigherLower />],
  ['/afl-higher-lower', () => <AflHigherLower />],
];

describe('the Higher or Lower sport pages reveal the points the hook totals', () => {
  for (const [route, page] of HL_PAGES) {
    for (const [kind, run] of [['win', WIN_RUN], ['loss', LOSS_RUN]] as const) {
      it(`${route}: a ${kind} reveals its total on the pill`, async () => {
        H.fix.hl = hlFixture(run);
        const { container } = await mount(page());
        expect(stateOf(container)).toBe(kind);
        expect(pill(container)).toBe(String(H.fix.hl.totalScore));
        expect(firstH2(container)).toBe(`${H.fix.hl.correctCount}/10 Correct!`);
      });
    }
  }
  it('the fixtures are two different scores, so a pill stuck on one number cannot pass both', () => {
    expect(hlFixture(WIN_RUN).totalScore).not.toBe(hlFixture(LOSS_RUN).totalScore);
  });
});

/* ---------- soccer Higher or Lower: an endless streak, so every end is a loss ---------- */
const { default: HigherLower } = await import('@/pages/HigherLower');

function soccerFixture(streak: number, bestStreak: number) {
  return {
    currentPlayer: higherLowerPlayers[0], nextPlayer: higherLowerPlayers[1], streak, bestStreak,
    gameStatus: 'lost', lastChoice: { stat: 'goals', correct: false }, revealedStats: true,
    chooseStat: noop, giveUp: noop, resetGame: noop,
    streakReaction: { emoji: '😬', message: 'Unlucky.' }, lossReaction: { emoji: '😬', message: 'Unlucky.' },
    statLabels: { appearances: 'Appearances', goals: 'Goals', internationalCaps: "Int'l Caps" },
    noteFor: hlNoteFor,
  };
}

describe('soccer Higher or Lower reveals the final streak', () => {
  for (const [what, streak, best] of [['a new best of 7', 7, 7], ['a first pick miss', 0, 4]] as const) {
    it(`/higher-lower: ${what} reveals ${streak} on the pill`, async () => {
      H.fix.soccerHl = soccerFixture(streak, best);
      const { container } = await mount(<HigherLower />);
      expect(stateOf(container)).toBe('loss');
      expect(pill(container)).toBe(String(streak));
      expect(firstH2(container)).toBe('Game Over!');
    });
  }
});

/* ---------- Face Off: the scoreline, built by the real totals() ---------- */
const { default: FaceOff } = await import('@/pages/FaceOff');

const round = (youRight: boolean, youSecs: number, rivalRight: boolean, rivalSecs: number): RoundResult => ({
  pick: 'a', youCorrect: youRight, you: pointsFor(youRight, youSecs),
  rivalPick: 'a', rivalCorrect: rivalRight, rival: pointsFor(rivalRight, rivalSecs),
  secondsUsed: youSecs, rivalSeconds: rivalSecs,
});
function faceOffFixture(youRight: boolean[]) {
  const results = youRight.map((r, i) => round(r, 2 + (i % 4), i % 3 !== 0, 3.5));
  const t = totals(results);
  return {
    save: loadSave(null), phase: 'done', mode: 'unlimited', difficulty: 'pro', rounds: [], results,
    index: results.length, current: null, elapsed: 0, rivalLocked: false, turn: 1, totals: t,
    outcome: outcome(t), lastResult: results[results.length - 1], dailyPlayed: null, today: '2026-10-03',
    start: noop, pick: noop, ready: noop, next: noop, toMenu: noop,
  };
}

describe('Face Off reveals the scoreline the hook totals', () => {
  for (const [kind, run] of [
    ['win', [true, true, true, true, true, true, true, true, true, true]],
    ['loss', [false, true, false, false, true, false, false, true, false, false]],
  ] as const) {
    it(`/face-off: a ${kind} against The Pro reveals the totals on the pill`, async () => {
      H.fix.faceOff = faceOffFixture([...run]);
      expect(H.fix.faceOff.outcome).toBe(kind);
      const { container } = await mount(<FaceOff />);
      expect(stateOf(container)).toBe(kind);
      expect(pill(container)).toBe(`${H.fix.faceOff.totals.you} to ${H.fix.faceOff.totals.rival}`);
      expect(container.textContent).toContain('points, you to The Pro');
    });
  }
});

/* ---------- Champ or Not and Who'd They Beat: right answers out of ten ---------- */
const { default: ChampOrNot } = await import('@/pages/ChampOrNot');
const { default: WhodTheyBeat } = await import('@/pages/WhodTheyBeat');

const NINE_RIGHT = [true, true, true, true, false, true, true, true, true, true];
const FOUR_RIGHT = [true, false, false, true, false, true, false, false, true, false];
const champFixture = (answers: boolean[]) => ({
  loadState: 'ready', mode: 'daily', switchMode: noop, rounds: answers.map(() => ({})), roundIdx: answers.length - 1,
  current: null, showingResult: false, lastPick: null, answers, done: true, score: answers.filter(Boolean).length,
  answer: noop, advanceReveal: noop, playAgain: noop, today: '2026-10-03', hard: false, hardActive: false, toggleHard: noop,
});
const whodFixture = (answers: boolean[]) => ({
  loadState: 'ready', mode: 'daily', switchMode: noop, questions: answers.map(() => ({})), qIdx: answers.length - 1,
  current: null, showingResult: false, pickedIndex: null, answers, done: true, score: answers.filter(Boolean).length,
  answer: noop, advanceReveal: noop, playAgain: noop,
});

describe('Champ or Not and Who\'d They Beat reveal the right answers out of ten', () => {
  for (const [kind, answers] of [['win', NINE_RIGHT], ['loss', FOUR_RIGHT]] as const) {
    it(`/champ-or-not: a ${kind} reveals score/total on the pill`, async () => {
      H.fix.champ = champFixture([...answers]);
      const { container } = await mount(<ChampOrNot />);
      expect(stateOf(container)).toBe(kind);
      expect(pill(container)).toBe(`${H.fix.champ.score}/10`);
      expect(firstH2(container)).toBe(`${H.fix.champ.score}/10 Called Right!`);
    });
    it(`/whod-they-beat: a ${kind} reveals score/total on the pill`, async () => {
      H.fix.whod = whodFixture([...answers]);
      const { container } = await mount(<WhodTheyBeat />);
      expect(stateOf(container)).toBe(kind);
      expect(pill(container)).toBe(`${H.fix.whod.score}/10`);
      expect(firstH2(container)).toBe(`${H.fix.whod.score}/10 Remembered!`);
    });
  }
});

/* ---------- Silverware Sort: rungs right across three boards ---------- */
const { default: SilverwareSort } = await import('@/pages/SilverwareSort');

const board = (right: number, first: boolean) => ({ s: right, g: Array.from({ length: BOARD_SIZE }, (_, i) => i < right), f: first });
function silverFixture(results: Array<{ s: number; g: boolean[]; f: boolean }>) {
  return {
    loadState: 'ready', mode: 'daily', switchMode: noop, boards: results.map(() => ({})), boardIdx: results.length - 1,
    board: null, slots: Array.from({ length: BOARD_SIZE }, () => null), locked: false, attempt: 1, revealed: null,
    place: noop, unplace: noop, canSubmit: false, submit: noop, advanceReveal: noop, results, done: true,
    score: results.reduce((a, r) => a + r.s, 0), maxScore: results.length * BOARD_SIZE, playAgain: noop, today: '2026-10-03',
  };
}

describe('Silverware Sort reveals the rungs right out of the most there were', () => {
  for (const [kind, results] of [
    ['win', [board(5, true), board(4, false), board(3, false)]],
    ['loss', [board(2, false), board(3, false), board(1, false)]],
  ] as const) {
    it(`/silverware-sort: a ${kind} reveals score/maxScore on the pill`, async () => {
      H.fix.silver = silverFixture([...results]);
      const { container } = await mount(<SilverwareSort />);
      expect(stateOf(container)).toBe(kind);
      expect(pill(container)).toBe(`${H.fix.silver.score}/${H.fix.silver.maxScore}`);
      expect(firstH2(container)).toBe(`${H.fix.silver.score}/15 Rungs Right!`);
    });
  }
});

/* ---------- Rank 'Em: the page keeps its own state, so the pill is checked against what it records ---------- */
const { default: RankEm } = await import('@/pages/RankEm');

describe("Rank 'Em reveals the points it hands the recorder", () => {
  for (const kind of ['win', 'loss'] as const) {
    it(`/rank-em: a daily ${kind} reveals the recorded points on the pill`, async () => {
      const today = getDailyRankRound();
      const order = today.items.map(it => it.name);
      if (kind === 'loss') [order[0], order[1]] = [order[1], order[0]];
      H.fix.rankDaily = { guesses: [{ order }], addGuess: noop, gameStatus: kind === 'win' ? 'won' : 'lost', isLoading: false };
      const { container } = await mount(<RankEm />);
      const rec = H.recorded.filter(r => r.slug === 'rank-em' && r.done).pop();
      expect(rec).toBeDefined();
      expect(rec!.score).toBe((kind === 'win' ? 5 : 3) * RANK_POINTS_PER_SLOT);
      expect(stateOf(container)).toBe(kind);
      expect(pill(container)).toBe(String(rec!.score));
      expect(firstH2(container)).toBe(`${kind === 'win' ? 5 : 3} / 5 correct`);
    });
  }
});

/* ---------- Hall of Fame or Bust: the points the vote earned ---------- */
const { default: HofOrBust } = await import('@/pages/HofOrBust');

describe('Hall of Fame or Bust reveals the points the vote earned', () => {
  const player = hofPlayers.find(p => p.verdict === 'hof')!;
  for (const [what, vote, score] of [['the right call with one hint', 'hof', 900], ['the wrong call', 'bust', 0]] as const) {
    it(`/hof-or-bust: ${what} reveals ${score} on the pill`, async () => {
      H.fix.hof = {
        player, hintsRevealed: 1, status: 'revealed', userVote: vote, score, mode: 'daily', communityVotes: null,
        vote: noop, revealHint: noop, switchToUnlimited: noop, nextPuzzle: noop, unlimitedIndex: 0,
      };
      const { container } = await mount(<HofOrBust />);
      expect(stateOf(container)).toBe('close');
      expect(pill(container)).toBe(String(score));
      expect(firstH2(container)).toBe('Verdict Revealed');
    });
  }
});
