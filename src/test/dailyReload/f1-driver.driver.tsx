/**
 * /f1-driver for scripts/simDailyReload.mjs.
 *
 * The daily driver comes from getDailyF1Puzzle() in src/data/f1Drivers.ts,
 * the same call the hook makes, so this driver knows the answer before it
 * plays. Shortest honest path: one hint, then the answer, which leaves
 * "Guessed in 2 clues: 800 pts" on the card and exercises revealedClues on
 * the way back from storage (a restore that fell back to the fresh default
 * of 1 would read 1000 pts and fail the fingerprint).
 *
 * A finished daily offers no board and no menu (Play Again is unlimited
 * only), so replay() tries every control a regression could hand back: the
 * search box, a Play Again button, a Daily Challenge button, and plays any
 * live board it finds to the end.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { getDailyF1Puzzle } from '@/data/f1Drivers';
import F1Driver from '@/pages/F1Driver';

const SEARCH = 'input[placeholder="Type driver name..."]';

function resultCard(m: MountedPage): Element | null {
  const line = Array.from(m.container.querySelectorAll('p'))
    .find(p => /^(Guessed in \d+ clues?: \d+ pts|It was .+)$/.test((p.textContent ?? '').trim()));
  return line?.parentElement ?? null;
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (m.container.querySelector(SEARCH)) return 'playing';
  throw new Error('f1-driver shows neither a board nor a result card (mode menu or error state)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, /Daily Challenge/));
}

/* The suggestion buttons read "🏎️ <name>"; the exact name is picked, not
   the first match, because the search is fuzzy. */
async function guess(m: MountedPage, name: string): Promise<void> {
  const input = m.container.querySelector(SEARCH);
  if (!input) throw new Error('no search box to guess into');
  await typeInto(input, name);
  const suggestion = Array.from(m.container.querySelectorAll('button'))
    .find(b => (b.textContent ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim() === name);
  if (!suggestion) throw new Error(`no suggestion offered for ${name}`);
  await click(suggestion);
}

async function finish(m: MountedPage): Promise<void> {
  await click(button(m.container, /^💡 Hint/));
  await guess(m, getDailyF1Puzzle().driverName);
}

export default defineDriver<MountedPage>({
  slug: 'f1-driver',
  keyPrefix: 'f1-driver-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/hooks/useF1Driver.ts',
  finishedSetter: 'setGameState(saved)',

  async mount() {
    const m = mountPage(<F1Driver />, '/f1-driver');
    await waitFor(() => {
      if (!findButton(m.container, /Daily Challenge/)) throw new Error('the mode menu has not come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* The card's own lines: the trophy, the driver's name and the clue count
     with the score. The share row underneath is left out. */
  fingerprint(m) {
    const card = resultCard(m);
    if (!card) return '';
    return Array.from(card.querySelectorAll(':scope > p')).map(p => (p.textContent ?? '').trim()).join('\n');
  },

  async replay(m) {
    if (m.container.querySelector(SEARCH)) await finish(m);
    const again = findButton(m.container, /^Play Again$/);
    if (again) await click(again);
    const daily = findButton(m.container, /Daily Challenge/);
    if (daily) {
      await click(daily);
      if (status(m) === 'playing') await finish(m);
    }
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new (driver|puzzle)|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
