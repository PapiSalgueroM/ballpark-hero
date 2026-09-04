/**
 * /missing-xi for scripts/simDailyReload.mjs.
 *
 * The page opens on today's daily (no mode menu), so enterDaily is the
 * Daily toggle, a no-op when it is already active. The shortest honest
 * finish is the answer itself: today's deterministic pick exposes the
 * candidate, his lineup spelling is in the roster the page hands the
 * autocomplete, so typing it surfaces a local suggestion the matcher
 * accepts (the remote search resolves to nothing under the mocked client).
 * First guess, 100 points.
 *
 * The finished card keeps a "Play Unlimited" button in daily mode. That is
 * not a replay of the daily, it starts an Unlimited run, so it does not
 * count as a daily replay control; replay() presses it and comes back to
 * Daily to prove the finished daily is still there.
 *
 * Restore: the page sits on useDailyPuzzle, whose mount effect restores the
 * action log and calls markRestoredFinish(gameSlug) before setting a
 * finished status, so this is a handler restore that depends on the mark.
 * restoreFile and finishedSetter name that hook and that line, and
 * slugBoundIn names the page that hands the hook gameSlug: 'missing-xi'.
 */
import './mocks';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { pickDailyPuzzle } from '@/lib/missingXi';
import MissingXi from '@/pages/MissingXi';

const DAILY_TOGGLE = /^📅 Daily$/;
const UNLIMITED_TOGGLE = /^∞ Unlimited$/;
const LOCK_IN = /^Lock in guess$/;
const SEARCH = 'input[role="combobox"]';

function resultCard(m: MountedPage): HTMLElement | null {
  return m.container.querySelector('[role="status"]');
}

function onDaily(m: MountedPage): boolean {
  return (m.container.textContent ?? '').includes('Same puzzle for everyone');
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (!onDaily(m)) throw new Error('missing-xi is not on the daily (the Unlimited toggle is active, or the page has not rendered)');
  if (resultCard(m)) return 'finished';
  if (findButton(m.container, LOCK_IN)) return 'playing';
  throw new Error('missing-xi shows neither a board nor a result card (spinner or error state)');
}

async function pointerDown(el: Element): Promise<void> {
  await act(async () => { fireEvent.pointerDown(el); });
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, DAILY_TOGGLE));
  await waitFor(() => { status(m); });
}

/* The suggestion rows are role="option" buttons that commit on pointerdown,
   not click. The one whose text is exactly the candidate's name is his
   roster row. */
async function finish(m: MountedPage): Promise<void> {
  const answer = pickDailyPuzzle().candidate.name;
  const input = m.container.querySelector(SEARCH);
  if (!input) throw new Error('no search box on the daily board');
  await typeInto(input, answer);
  let row: HTMLButtonElement | null = null;
  await waitFor(() => {
    row = Array.from(m.container.querySelectorAll<HTMLButtonElement>('button[role="option"]'))
      .find(b => (b.textContent ?? '').trim() === answer) ?? null;
    if (!row) throw new Error(`no suggestion row for "${answer}" yet`);
  });
  await pointerDown(row!);
  const lock = button(m.container, LOCK_IN);
  if (lock.disabled) throw new Error('Lock in guess is still disabled after picking the suggestion');
  await click(lock);
  await waitFor(() => { if (!resultCard(m)) throw new Error('no result card after the guess'); });
}

export default defineDriver<MountedPage>({
  slug: 'missing-xi',
  keyPrefix: 'missing-xi-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/hooks/useDailyPuzzle.ts',
  finishedSetter: 'setGameStatus(saved.gameStatus)',
  slugBoundIn: 'src/pages/MissingXi.tsx',

  async mount() {
    const m = mountPage(<MissingXi />, '/missing-xi');
    await waitFor(() => {
      if (!findButton(m.container, DAILY_TOGGLE)) throw new Error('the mode toggle has not come up');
    });
    /* The rules dialog opens on every mount (portaled into document.body);
       a player dismisses it before playing. */
    const letsPlay = findButton(document.body, /^Let's Play!$/);
    if (letsPlay) await click(letsPlay);
    return m;
  },

  enterDaily,
  finish,
  status,

  /* Everything on the card: headline, the candidate's name and position,
     the fact, the Score row, the emoji grid, the share row and the two
     lines under it. All of it derives from the action log and the date
     picked puzzle, so nothing on it is allowed to move on a restore. */
  fingerprint(m) {
    const card = resultCard(m);
    if (!card) return 'no result card';
    return (card.textContent ?? '').replace(/\s+/g, ' ').trim();
  },

  /* A live daily board is the bug itself: play it out, because that is the
     replay that re-pays the score. Then the two ways back at the daily a
     player has: the toggle (Unlimited, then Daily) and the card's Play
     Unlimited button followed by Daily. Each must land on the same finished
     card; if either deals a live board, it is played to the end. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    await click(button(m.container, UNLIMITED_TOGGLE));
    await click(button(m.container, DAILY_TOGGLE));
    if (status(m) === 'playing') await finish(m);
    const card = resultCard(m);
    const playUnlimited = card ? findButton(card, /^Play Unlimited$/) : null;
    if (playUnlimited) {
      await click(playUnlimited);
      await click(button(m.container, DAILY_TOGGLE));
      if (status(m) === 'playing') await finish(m);
    }
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new lineup|new puzzle|try again|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
