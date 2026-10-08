/**
 * Round 986: the finished states scripts/simResultPillComparison.mjs draws each
 * comparison and streak game in, bundled into the browser with the real pages.
 *
 * Each case is a hook fixture built from the game's own scoring code (the
 * Higher or Lower total from higherLowerScore, the Face Off scoreline from
 * totals(), the Rank 'Em points from scoreRankGuess through the page), so no
 * case holds a score the game could not reach. Every game gets its WIDEST
 * reachable score (the visual QA rule: the widest state is never the empty
 * one) and its narrowest, so the pill is measured at both ends.
 */
import { higherLowerScore } from '@/lib/higherLowerScore';
import { formatNumber } from '@/lib/formatNumber';
import { loadSave, totals, outcome, pointsFor, rivalFor, ROUNDS, MAX_EXTRA, type RoundResult } from '@/lib/faceOff';
import { getDailyRankRound, RANK_POINTS_PER_SLOT } from '@/lib/orderTheList';
import { BOARD_SIZE } from '@/lib/silverwareSort';
import { higherLowerPlayers, hlNoteFor } from '@/data/higherLowerPlayers';
import hofPlayers from '@/data/hofPlayers';

export interface PillCase {
  route: string;
  /** what the case is, for the log */
  what: string;
  /** the hook key the page reads (see the stub in the harness) and its fixture */
  fix: Record<string, unknown>;
  /** the text the pill must read exactly: the score the hook reports, with
   *  thousands grouped the way the shared moment prints a plain number since
   *  Round 1085 (1000 points read "1,000"; a scoreline or a fraction is as is) */
  expect: string;
}

const noop = () => undefined;

function hl(run: boolean[]) {
  const results = run.map(correct => ({ correct }));
  return {
    mode: 'daily', switchMode: noop, hard: false, toggleHard: noop, activeRound: null,
    currentPair: null, currentRound: run.length, results, showingResult: false, streak: 0,
    gameStatus: 'complete', correctCount: run.filter(Boolean).length, totalScore: higherLowerScore(results),
    makeGuess: noop, totalRounds: run.length, isLoading: false,
  };
}
const HL_ROUTES = ['nba', 'nfl', 'mlb', 'hockey', 'cfb', 'f1', 'tennis', 'golf', 'afl'];

function soccer(streak: number, bestStreak: number) {
  return {
    currentPlayer: higherLowerPlayers[0], nextPlayer: higherLowerPlayers[1], streak, bestStreak,
    gameStatus: 'lost', lastChoice: { stat: 'goals', correct: false }, revealedStats: true,
    chooseStat: noop, giveUp: noop, resetGame: noop,
    streakReaction: { emoji: '😬', message: 'Unlucky.' }, lossReaction: { emoji: '😬', message: 'Unlucky.' },
    statLabels: { appearances: 'Appearances', goals: 'Goals', internationalCaps: "Int'l Caps" },
    noteFor: hlNoteFor,
  };
}

function faceOff(mode: 'unlimited' | 'versus', difficulty: 'rookie' | 'pro' | 'legend', rounds: Array<[boolean, number, boolean, number]>) {
  const results: RoundResult[] = rounds.map(([y, ys, r, rs]) => ({
    pick: 'a', youCorrect: y, you: pointsFor(y, ys), rivalPick: 'a', rivalCorrect: r, rival: pointsFor(r, rs),
    secondsUsed: ys, rivalSeconds: rs,
  }));
  const t = totals(results);
  return {
    save: loadSave(null), phase: 'done', mode, difficulty, rounds: [], results, index: results.length,
    current: null, elapsed: 0, rivalLocked: false, turn: 1, totals: t, outcome: outcome(t),
    lastResult: results[results.length - 1], dailyPlayed: null, today: '2026-10-03',
    start: noop, pick: noop, ready: noop, next: noop, toMenu: noop,
  };
}

const answersOf = (right: number, n = 10) => Array.from({ length: n }, (_, i) => i < right);
const champ = (right: number) => {
  const answers = answersOf(right);
  return {
    loadState: 'ready', mode: 'daily', switchMode: noop, rounds: answers.map(() => ({})), roundIdx: 9, current: null,
    showingResult: false, lastPick: null, answers, done: true, score: right, answer: noop, advanceReveal: noop,
    playAgain: noop, today: '2026-10-03', hard: false, hardActive: false, toggleHard: noop,
  };
};
const whod = (right: number) => {
  const answers = answersOf(right);
  return {
    loadState: 'ready', mode: 'daily', switchMode: noop, questions: answers.map(() => ({})), qIdx: 9, current: null,
    showingResult: false, pickedIndex: null, answers, done: true, score: right, answer: noop, advanceReveal: noop, playAgain: noop,
  };
};

function silver(perBoard: number[]) {
  const results = perBoard.map(s => ({ s, g: Array.from({ length: BOARD_SIZE }, (_, i) => i < s), f: s === BOARD_SIZE }));
  return {
    loadState: 'ready', mode: 'daily', switchMode: noop, boards: results.map(() => ({})), boardIdx: results.length - 1,
    board: null, slots: Array.from({ length: BOARD_SIZE }, () => null), locked: false, attempt: 1, revealed: null,
    place: noop, unplace: noop, canSubmit: false, submit: noop, advanceReveal: noop, results, done: true,
    score: results.reduce((a, r) => a + r.s, 0), maxScore: results.length * BOARD_SIZE, playAgain: noop, today: '2026-10-03',
  };
}

/** Rank 'Em keeps its state in the page; the daily log decides the order it scores. */
function rankDaily(right: 5 | 3 | 0) {
  const order = getDailyRankRound().items.map(it => it.name);
  if (right === 3) [order[0], order[1]] = [order[1], order[0]];
  if (right === 0) order.push(order.shift()!);
  return { guesses: [{ order }], addGuess: noop, gameStatus: right === 5 ? 'won' : 'lost', isLoading: false };
}

function hof(vote: 'hof' | 'bust', hints: number, score: number) {
  const player = hofPlayers.find(p => p.verdict === 'hof')!;
  return {
    player, hintsRevealed: hints, status: 'revealed', userVote: vote, score, mode: 'daily', communityVotes: null,
    vote: noop, revealHint: noop, switchToUnlimited: noop, nextPuzzle: noop, unlimitedIndex: 0,
  };
}

/* The widest Face Off scoreline: a two player duel tied on every round at full speed, run to the last extra round. */
const DUEL_MAX = Array.from({ length: ROUNDS + MAX_EXTRA }, () => [true, 0, true, 0] as [boolean, number, boolean, number]);
const LEGEND_CLOSE = Array.from({ length: ROUNDS }, (_, i) => [true, 0, i !== 0, 0] as [boolean, number, boolean, number]);
const ROOKIE_ROUT = Array.from({ length: ROUNDS }, () => [false, 10, true, 1] as [boolean, number, boolean, number]);

export function pillCases(): PillCase[] {
  const out: PillCase[] = [];
  const ALL = Array.from({ length: 10 }, () => true);
  const NONE = Array.from({ length: 10 }, () => false);
  for (const sport of HL_ROUTES) {
    for (const [what, run] of [['all ten right', ALL], ['none right', NONE]] as const) {
      const fix = hl([...run]);
      out.push({ route: `/${sport}-higher-lower`, what, fix: { hl: fix }, expect: String(fix.totalScore) });
    }
  }
  out.push({ route: '/higher-lower', what: 'a three figure streak', fix: { soccerHl: soccer(143, 143) }, expect: '143' });
  out.push({ route: '/higher-lower', what: 'out on the first pick', fix: { soccerHl: soccer(0, 12) }, expect: '0' });
  for (const [what, f] of [
    ['a duel tied to the last extra round', faceOff('versus', 'pro', DUEL_MAX)],
    [`a full speed win over ${rivalFor('legend').label}`, faceOff('unlimited', 'legend', LEGEND_CLOSE)],
    [`shut out by ${rivalFor('rookie').label}`, faceOff('unlimited', 'rookie', ROOKIE_ROUT)],
  ] as const) out.push({ route: '/face-off', what, fix: { faceOff: f }, expect: `${f.totals.you} to ${f.totals.rival}` });
  for (const right of [10, 0]) {
    out.push({ route: '/champ-or-not', what: `${right} right`, fix: { champ: champ(right) }, expect: `${right}/10` });
    out.push({ route: '/whod-they-beat', what: `${right} right`, fix: { whod: whod(right) }, expect: `${right}/10` });
  }
  out.push({ route: '/silverware-sort', what: 'every rung right', fix: { silver: silver([5, 5, 5]) }, expect: '15/15' });
  out.push({ route: '/silverware-sort', what: 'one rung right', fix: { silver: silver([1, 0, 0]) }, expect: '1/15' });
  for (const right of [5, 3, 0] as const) {
    out.push({ route: '/rank-em', what: `${right} in place`, fix: { rankDaily: rankDaily(right) }, expect: formatNumber(right * RANK_POINTS_PER_SLOT) });
  }
  /* Written out, not formatted, so one case holds the grouped text on its own. */
  out.push({ route: '/hof-or-bust', what: 'the right call, no hints', fix: { hof: hof('hof', 0, 1000) }, expect: '1,000' });
  out.push({ route: '/hof-or-bust', what: 'the wrong call', fix: { hof: hof('bust', 2, 0) }, expect: '0' });
  return out;
}
