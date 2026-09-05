/**
 * /free-kick for scripts/simDailyReload.mjs.
 *
 * Round 445, and it is a gap being closed rather than a new game: Free Kick
 * shipped as a daily in Round 433 with no row here, so nothing checked that a
 * finished run survived a refresh, that it could not be replayed for a second
 * payout, or that a tampered key opened as a fresh daily. This round moved its
 * record onto the shared src/lib/arcadeRecord.ts, which is exactly the kind of
 * change that wants the row to exist before it lands.
 *
 * The page opens on an intro with "Today's ten" and "Unlimited"; Daily deals
 * ten kicks seeded from the pinned ET day, and each kick is loaded by holding
 * the strike button and released by letting go. See ./arcadeGlobals for the
 * two globals this freezes and why.
 */
import './mocks';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { freezeArcadeGlobals } from './arcadeGlobals';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { ROUNDS_PER_RUN } from '@/lib/freeKick';
import FreeKick from '@/pages/FreeKick';

type Api = MountedPage & { restoreGlobals: () => void };

function doneCard(m: MountedPage): Element | null {
  const line = Array.from(m.container.querySelectorAll('p')).find(p => /^\d+ of \d+ scored$/.test((p.textContent ?? '').trim()));
  return line?.parentElement ?? null;
}

function onPitch(m: MountedPage): boolean {
  return Array.from(m.container.querySelectorAll('span')).some(s => /^Kick\s*\d+\/\d+$/.test((s.textContent ?? '').replace(/\s+/g, ' ').trim()));
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (doneCard(m)) return 'finished';
  if (onPitch(m)) return 'playing';
  throw new Error('free kick shows neither a pitch nor a finished run (intro?)');
}

async function finish(m: MountedPage): Promise<void> {
  for (let i = 0; i < ROUNDS_PER_RUN; i += 1) {
    const strike = button(m.container, /^Hold to strike$/);
    /* Loading and striking are separate events on the same button, so this is
       a hold rather than a click. Both go in one act so no timer can run
       between them. */
    await act(async () => {
      fireEvent.mouseDown(strike);
      fireEvent.mouseUp(strike);
    });
    const next = await waitFor(() => button(m.container, /^Next kick$|^See the run$/));
    await click(next);
  }
}

async function enterDaily(m: MountedPage): Promise<void> {
  const daily = findButton(m.container, /^Today's ten$/);
  if (daily) { await click(daily); return; }
  if (doneCard(m)) return;
  throw new Error('free kick shows neither the intro nor a finished run');
}

export default defineDriver<Api>({
  slug: 'free-kick',
  keyPrefix: 'free-kick-daily-',
  restoreStyle: 'initializer',

  async mount() {
    const restoreGlobals = freezeArcadeGlobals();
    const m = mountPage(<FreeKick />, '/free-kick');
    await waitFor(() => {
      if (!findButton(m.container, /^Today's ten$/) && !doneCard(m)) throw new Error('free kick has not drawn its intro or its result');
    });
    return { ...m, restoreGlobals };
  },

  enterDaily,
  finish,
  status,

  /* Every number on the final card. The one line left out is the "come back
     tomorrow" note, which appears only on a restored daily and stands where
     the fresh finish puts its Another ten button. */
  fingerprint(m) {
    const card = doneCard(m);
    if (!card) return 'no final card';
    return Array.from(card.querySelectorAll('p'))
      .map(p => (p.textContent ?? '').trim())
      .filter(t => !/^Come back tomorrow/.test(t))
      .join('\n');
  },

  async replay(m) {
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = doneCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /another ten|play again|new kicks/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
    m.restoreGlobals();
  },
});
