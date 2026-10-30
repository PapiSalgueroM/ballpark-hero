/**
 * Round 1579: Swap Question, on the page, never deals a question already on
 * the ladder.
 *
 * scripts/simTriviaBank.mjs section 10 holds the rule over swapQuestion
 * itself. It cannot see the page handing the swap the wrong array ([] or
 * [question] both pass the type gate), so this renders /sports-millionaire,
 * hands it a fixed ladder as the daily, and swaps on a planted random stream.
 * The streams are found here with the swap as it was (five draws, compared
 * with the question on screen only) over the real generator: REPEAT_1 deals
 * a later rung's text at rung 1, FRESH_1 a question the ladder does not hold,
 * REPEAT_3 rung 1's or rung 2's text at rung 3. Measured on 1573's bank: 1, 2
 * and 42. Case B is also the proof that nothing else draws Math.random
 * between the spy and the swap: the page deals exactly the old swap's draw.
 *
 * The pool is the dailyReload driver's synthetic one
 * (src/test/dailyReload/sports-millionaire.driver.tsx, invented names,
 * shipped nowhere), copied.
 */
import './dailyReload/mocks';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { click, findButton, mountPage, type MountedPage } from './dailyReload/harness';
import { resetMocks, setPoolFixture } from './dailyReload/mocks';
import { generateQuestion, generateQuestionLadder, type TriviaPool, type TriviaQuestion } from '@/lib/triviaQuestionBank';
import SportsMillionaire from '@/pages/SportsMillionaire';

const CLUBS = ['Fixture Athletic', 'Probe United', 'Harness Town', 'Driver City', 'Mock Rovers'];
const NATIONS = ['Fixtureland', 'Probia', 'Harnessia', 'Drivonia', 'Mockstan'];
const POSITIONS = ['GK', 'CB', 'CM', 'ST'];
const POOL: TriviaPool = {
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

/* the bank's stream (src/lib/triviaQuestionBank.ts keeps its own unexported) */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LADDER = generateQuestionLadder(POOL, 15, mulberry32(1579));
const TEXTS = LADDER.map(q => q.question);

/* the swap as it was before Round 1579, on stream s */
function oldSwap(current: TriviaQuestion, s: number): TriviaQuestion {
  const rng = mulberry32(s);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateQuestion(POOL, current.difficulty, rng);
    if (candidate && candidate.question !== current.question) return candidate;
  }
  return current;
}
function firstStream(test: (s: number) => boolean): number {
  for (let s = 1; s <= 5000; s++) if (test(s)) return s;
  return 0;
}
const REPEAT_1 = firstStream(s => { const q = oldSwap(LADDER[0], s); return q !== LADDER[0] && TEXTS.indexOf(q.question) > 0; });
const FRESH_1 = firstStream(s => { const q = oldSwap(LADDER[0], s); return q !== LADDER[0] && !TEXTS.includes(q.question); });
const REPEAT_3 = firstStream(s => { const q = oldSwap(LADDER[2], s); return q.question === TEXTS[0] || q.question === TEXTS[1]; });

/* the rung label and the question text the board shows */
function board(m: MountedPage): { rung: string; text: string } | null {
  const label = Array.from(m.container.querySelectorAll('span')).find(s => /^Question \d+ of \d+/.test((s.textContent ?? '').trim()));
  const text = label?.parentElement?.parentElement?.querySelector('p')?.textContent?.trim();
  return label && text ? { rung: (label.textContent ?? '').trim(), text } : null;
}

async function mount(): Promise<MountedPage> {
  const m = mountPage(<SportsMillionaire />, '/sports-millionaire');
  await waitFor(() => { if (!board(m)) throw new Error('the page has not reached question 1'); });
  return m;
}

async function swapOn(m: MountedPage, s: number): Promise<void> {
  const swap = findButton(m.container, /^Swap$/);
  if (!swap) throw new Error('no Swap button on the page');
  const spy = vi.spyOn(Math, 'random').mockImplementation(mulberry32(s));
  try {
    await click(swap);
  } finally {
    spy.mockRestore();
  }
}

async function answerRight(m: MountedPage, q: TriviaQuestion): Promise<void> {
  if (board(m)?.text !== q.question) throw new Error(`the board is not on the expected question: ${q.question}`);
  const wanted = String.fromCharCode(65 + q.correctIndex) + q.options[q.correctIndex];
  const option = findButton(m.container, new RegExp(`^${wanted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  if (!option) throw new Error(`no option button reads ${wanted}`);
  await click(option);
  /* the suspense beat, then the flash, then the ladder moves on */
  await act(async () => { vi.advanceTimersByTime(1600); });
  await act(async () => { vi.advanceTimersByTime(1400); });
}

describe('Sports Millionaire, Swap Question on the page (Round 1579)', () => {
  beforeEach(() => {
    resetMocks();
    localStorage.clear();
    setPoolFixture('millionaire', { pool: POOL, ladder: LADDER });
  });

  it('the fixture ladder is whole and the three streams exist', () => {
    console.info(`sportsMillionaireSwap streams: REPEAT_1 ${REPEAT_1}, FRESH_1 ${FRESH_1}, REPEAT_3 ${REPEAT_3}`);
    expect(LADDER.length).toBe(15);
    expect(new Set(TEXTS).size).toBe(15);
    expect(REPEAT_1, 'no stream in 5,000 makes the old swap repeat at rung 1, so case A is blind').toBeGreaterThan(0);
    expect(FRESH_1, 'no stream in 5,000 makes the old swap fresh at rung 1').toBeGreaterThan(0);
    expect(REPEAT_3, 'no stream in 5,000 makes the old swap repeat rung 1 or 2 at rung 3, so case C is blind').toBeGreaterThan(0);
  });

  it('A: on a stream where the old swap dealt a later rung, the swap at question 1 deals a question not on the ladder', async () => {
    const m = await mount();
    try {
      expect(board(m)?.text).toBe(TEXTS[0]);
      await swapOn(m, REPEAT_1);
      const shown = board(m);
      expect(shown?.rung).toMatch(/^Question 1 of 15/);
      expect(TEXTS, `the swap dealt a question already on the ladder: ${shown?.text}`).not.toContain(shown?.text);
      expect(findButton(m.container, /^Swap$/)?.disabled).toBe(true);
    } finally {
      m.unmount();
    }
  });

  it('B: on a stream where the old swap was fresh, the page deals exactly what it dealt before', async () => {
    const m = await mount();
    try {
      await swapOn(m, FRESH_1);
      expect(board(m)?.text).toBe(oldSwap(LADDER[0], FRESH_1).question);
    } finally {
      m.unmount();
    }
  });

  it('C: after two right answers, the swap at question 3 never brings back question 1 or 2', async () => {
    const m = await mount();
    try {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
      try {
        await answerRight(m, LADDER[0]);
        await answerRight(m, LADDER[1]);
      } finally {
        vi.useRealTimers();
      }
      expect(board(m)?.rung).toMatch(/^Question 3 of 15/);
      await swapOn(m, REPEAT_3);
      const shown = board(m);
      expect(TEXTS, `the swap dealt a question already on the ladder: ${shown?.text}`).not.toContain(shown?.text);
    } finally {
      m.unmount();
    }
  });
});
