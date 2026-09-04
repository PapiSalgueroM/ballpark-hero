/**
 * /guess-the-year for scripts/simDailyReload.mjs.
 *
 * The page opens straight on the daily (no mode menu, no unlimited mode),
 * so enterDaily is a no-op. The puzzle is a pure function of the ET date
 * (getDailyGuessTheYearPuzzle), so the driver knows the answer: it makes
 * one wrong guess first, then the right one, which exercises the guess
 * list and lands an 800 point win at clue two. The finished card is the
 * shared ResultScreen; the year picker, Reveal and Give Up rows are only
 * drawn while playing.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { getDailyGuessTheYearPuzzle } from '@/data/guessTheYearPuzzles';
import GuessTheYear from '@/pages/GuessTheYear';

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (findButton(m.container, /^Guess \d{4}$/)) return 'playing';
  throw new Error('guess-the-year shows neither the year picker nor a result card');
}

function selectedYear(m: MountedPage): number {
  const span = m.container.querySelector('span.text-3xl');
  const n = Number((span?.textContent ?? '').trim());
  if (!Number.isFinite(n)) throw new Error('the year picker shows no year');
  return n;
}

async function setYear(m: MountedPage, target: number): Promise<void> {
  const step = (label: string) => m.container.querySelector(`button[aria-label="${label}"]`);
  for (let guard = 0; guard < 200; guard++) {
    const cur = selectedYear(m);
    if (cur === target) return;
    const diff = target - cur;
    const big = step(diff > 0 ? 'Forward ten years' : 'Back ten years') as HTMLButtonElement | null;
    const small = step(diff > 0 ? 'Forward one year' : 'Back one year') as HTMLButtonElement | null;
    const el = Math.abs(diff) >= 10 && big && !big.disabled ? big : small;
    if (!el || el.disabled) throw new Error(`cannot move the picker from ${cur} toward ${target}`);
    await click(el);
  }
  throw new Error(`the picker never reached ${target}`);
}

async function guess(m: MountedPage, year: number): Promise<void> {
  await setYear(m, year);
  await click(button(m.container, /^Guess \d{4}$/));
}

async function finish(m: MountedPage): Promise<void> {
  const answer = getDailyGuessTheYearPuzzle().year;
  const wrong = answer === 2000 ? 2001 : 2000;
  await guess(m, wrong);
  await guess(m, answer);
}

export default defineDriver<MountedPage>({
  slug: 'guess-the-year',
  keyPrefix: 'guess-the-year-daily-',
  restoreStyle: 'initializer',

  async mount() {
    const m = mountPage(<GuessTheYear />, '/guess-the-year');
    await waitFor(() => { status(m); });
    return m;
  },

  async enterDaily() {
    /* the page opens on the daily */
  },

  finish,
  status,

  /* The headline, the score line, the answer line and the one line grid:
     every number the player saw. */
  fingerprint(m) {
    const card = resultCard(m);
    if (!card) return 'no result card';
    const headline = card.querySelector('h2')?.textContent ?? '';
    const lines = Array.from(card.querySelectorAll('p')).map(p => (p.textContent ?? '').trim());
    const grid = card.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    return [headline, ...lines, grid].join('\n');
  },

  /* A live board is the replay (the daily came back fresh), and so is a
     Play Again on the finished card. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    const again = findButton(m.container, /play again/i);
    if (again) {
      await click(again);
      if (status(m) === 'playing') await finish(m);
    }
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new puzzle|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
