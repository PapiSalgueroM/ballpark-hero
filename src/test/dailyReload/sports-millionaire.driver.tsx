/**
 * /sports-millionaire, Group C of the Round 428 plan and the highest stakes
 * route on the site: the completion score is the dollar amount, up to
 * 1,000,000 points a finish.
 *
 * The page opens on today's daily ladder straight out of boot, so
 * enterDaily is a no-op, and a finished daily is restored after mount on
 * two paths: the boot effect after the pool lands, and startRun('daily')
 * off the mode toggle. Both run after mount, so both must call
 * markRestoredFinish('sports-millionaire') right before setPhase('done').
 *
 * The pool is synthetic (invented names, shipped nowhere) and large enough
 * for every ladder step to find a fresh question. finish() answers Q1 right
 * and Q2 wrong, which ends the run on $0 before the first safe haven: the
 * one finish whose amount is falsy, so a save that tested finalAmount for
 * truth instead of null would never lock the day. The reveal is 1.6 s of
 * suspense plus a 1.4 s flash per answer, so the two answers run under
 * fake timers.
 */
import './mocks';
import { vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { setPoolFixture } from './mocks';
import type { TriviaPool, TriviaQuestion } from '@/lib/triviaQuestionBank';
import { LADDER_SIZE, buildFreshLadder } from '@/lib/sportsMillionaire';
import SportsMillionaire from '@/pages/SportsMillionaire';

const CLUBS = ['Fixture Athletic', 'Probe United', 'Harness Town', 'Driver City', 'Mock Rovers'];
const NATIONS = ['Fixtureland', 'Probia', 'Harnessia', 'Drivonia', 'Mockstan'];
const POSITIONS = ['GK', 'CB', 'CM', 'ST'];

/* Exported for the side door sections in src/test/dailyLockEdges.test.tsx. */
export const POOL: TriviaPool = {
  /* Sorted by value descending, every value distinct, the shape
     fetchMarketPool hands back. */
  market: Array.from({ length: 320 }, (_, i) => ({
    player_name: `Fixture Probe ${i + 1}`,
    position: POSITIONS[i % POSITIONS.length],
    nationality: NATIONS[i % NATIONS.length],
    club: CLUBS[i % CLUBS.length],
    market_value_usd: 200_000_000 - i * 500_000,
  })),
  ballonDor: Array.from({ length: 30 }, (_, i) => ({
    year: 1996 + i,
    rank: 1,
    player_name: `Fixture Laureate ${i + 1}`,
    nationality: NATIONS[i % NATIONS.length],
    club: CLUBS[i % CLUBS.length],
    award_type: 'Men',
  })),
  shirtNumbers: Array.from({ length: 40 }, (_, i) => ({
    player_name: `Fixture Shirt ${i + 1}`,
    club: CLUBS[i % CLUBS.length],
    league: 'Fixture League',
    nationality: NATIONS[i % NATIONS.length],
    kit_number: i + 1,
  })),
};

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}

function questionOnScreen(m: MountedPage): boolean {
  return Array.from(m.container.querySelectorAll('span')).some(s => /^Question \d+ of \d+/.test((s.textContent ?? '').trim()));
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (questionOnScreen(m)) return 'playing';
  throw new Error('sports-millionaire shows neither a question nor a result card (boot or error state)');
}

async function answer(m: MountedPage, q: TriviaQuestion, optionIndex: number): Promise<void> {
  const shown = Array.from(m.container.querySelectorAll('p')).some(p => (p.textContent ?? '').trim() === q.question);
  if (!shown) throw new Error(`the board is not on the expected question: ${q.question}`);
  const wanted = String.fromCharCode(65 + optionIndex) + q.options[optionIndex];
  const option = findButton(m.container, new RegExp(`^${wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  if (!option) throw new Error(`no option button reads ${wanted}`);
  await click(option);
  /* The suspense beat, then the flash, then the ladder moves on or ends. */
  await act(async () => { vi.advanceTimersByTime(1600); });
  await act(async () => { vi.advanceTimersByTime(1400); });
}

function questionNumber(m: MountedPage): number {
  const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Question \d+ of \d+/.test((s.textContent ?? '').trim()));
  if (!span) throw new Error('no question on screen');
  return Number((span.textContent ?? '').trim().match(/^Question (\d+)/)![1]);
}

function lifeline(m: MountedPage, label: RegExp): HTMLButtonElement {
  return button(m.container, label);
}

/* Round 645 part three fix: the honest path spends the 50:50 and the crowd
   on Q1 before answering it, so the run carries two spent lifelines and a
   question with two options gone and a poll on it, all of which a reload has
   to keep. finish() plays from wherever the ladder is (a lifeline already
   spent is not pressed again), so a run resumed part way plays exactly the
   moves the unbroken run did. */
async function spendOnQ1(m: MountedPage): Promise<void> {
  const fifty = lifeline(m, /50:50$/);
  if (!fifty.disabled) await click(fifty);
  const crowd = lifeline(m, /Crowd$/);
  if (!crowd.disabled) await click(crowd);
}

async function finish(m: MountedPage): Promise<void> {
  const ladder = buildFreshLadder(POOL, 'daily');
  if (ladder.length !== LADDER_SIZE) throw new Error(`the fixture pool built a ${ladder.length} question ladder`);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
  try {
    if (questionNumber(m) === 1) {
      await spendOnQ1(m);
      await answer(m, ladder[0], ladder[0].correctIndex);
    }
    await answer(m, ladder[1], (ladder[1].correctIndex + 1) % ladder[1].options.length);
  } finally {
    vi.useRealTimers();
  }
  if (!resultCard(m)) throw new Error('a wrong answer on Q2 did not end the run');
}

/* The live board as text: the question and its number, the options still
   showing, the crowd's poll, and which lifelines are spent. */
function progress(m: MountedPage): string {
  if (status(m) !== 'playing') throw new Error('no live question');
  const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Question \d+ of \d+/.test((s.textContent ?? '').trim()))!;
  const options = Array.from(m.container.querySelectorAll('button'))
    .filter(b => /^[A-D]\S/.test((b.textContent ?? '').trim()) && !b.className.includes('opacity-0'))
    .map(b => (b.textContent ?? '').trim());
  const poll = Array.from(m.container.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).filter(t => /^\d+%$/.test(t));
  const spent = [/50:50$/, /Crowd$/, /Swap$/].map(l => `${l.source} ${lifeline(m, l).disabled ? 'spent' : 'live'}`);
  return [(span.textContent ?? '').trim(), options.join(' | '), poll.join(' '), spent.join(', ')].join('\n');
}

/* Everything on the card but the buttons: headline, how far the run got,
   the final amount, cleared count, mode and the emoji grid. */
function fingerprint(m: MountedPage): string {
  const card = resultCard(m);
  if (!card) return 'no result card';
  const copy = card.cloneNode(true) as Element;
  copy.querySelectorAll('button').forEach(b => b.remove());
  return (copy.textContent ?? '').trim();
}

export default defineDriver<MountedPage>({
  slug: 'sports-millionaire',
  keyPrefix: 'sports-millionaire-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/pages/SportsMillionaire.tsx',
  finishedSetter: "setPhase('done')",

  async mount() {
    setPoolFixture('millionaire', (mode: 'daily' | 'unlimited') => ({ pool: POOL, ladder: buildFreshLadder(POOL, mode) }));
    const m = mountPage(<SportsMillionaire />, '/sports-millionaire');
    await waitFor(() => {
      if (!resultCard(m) && !questionOnScreen(m)) throw new Error('the page has not left boot');
    });
    return m;
  },

  async enterDaily() {
    /* The page opens on today's ladder. */
  },

  finish,
  status,
  fingerprint,

  /* Round 645 part three fix: the 50:50 and the crowd spent on Q1, then a
     reload has to come back on Q1 with the same two options left, the same
     poll and both lifelines still spent. */
  playSome: m => spendOnQ1(m),
  progress,

  /* Assertion 7: an answer locked in and the page refreshed during the
     suspense, before the reveal. The answer is decided when it is locked in,
     so a reload must come back on Q2 exactly as a landed right answer does. */
  async oneStep(m) {
    const ladder = buildFreshLadder(POOL, 'daily');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
    try {
      await answer(m, ladder[0], ladder[0].correctIndex);
    } finally {
      vi.useRealTimers();
    }
  },
  async interruptStep(m) {
    const q = buildFreshLadder(POOL, 'daily')[0];
    const wanted = String.fromCharCode(65 + q.correctIndex) + q.options[q.correctIndex];
    const option = Array.from(m.container.querySelectorAll('button')).find(b => (b.textContent ?? '').trim() === wanted);
    if (!option) throw new Error(`no option button reads ${wanted}`);
    await click(option);
    if (!Array.from(m.container.querySelectorAll('p')).some(p => /Locking in your answer/.test(p.textContent ?? ''))) {
      throw new Error('the answer revealed before the refresh, so the suspense was never interrupted');
    }
  },

  /* The only card button is Play Unlimited, which starts an unlimited run;
     the Daily toggle from there is the path most likely to deal today's
     ladder again. A live daily board at any point is played to the end,
     because that is the replay that would re-pay the score. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    const card = resultCard(m);
    const cta = card ? findButton(card, /^Play Unlimited$/) : null;
    if (cta) await click(cta);
    await click(button(m.container, /Daily$/));
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new ladder|try again|restart|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
