/**
 * /buzzer-beater for scripts/simDailyReload.mjs.
 *
 * Round 445. The page opens on an intro with "Today's ten" and "Unlimited";
 * Daily deals ten shots seeded from the pinned ET day, and each shot is
 * loaded by holding the shoot button and released by letting go.
 *
 * See ./arcadeGlobals for the two globals this freezes and why, both of them
 * shared with the Free Kick row because both games run on the same engine.
 */
import './mocks';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { freezeArcadeGlobals, withFullMotion } from './arcadeGlobals';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { ROUNDS_PER_RUN } from '@/lib/buzzerBeater';
import BuzzerBeater from '@/pages/BuzzerBeater';

type Api = MountedPage & { restoreGlobals: () => void };

function doneCard(m: MountedPage): Element | null {
  const line = Array.from(m.container.querySelectorAll('p')).find(p => /^\d+ of \d+ made$/.test((p.textContent ?? '').trim()));
  return line?.parentElement ?? null;
}

function onCourt(m: MountedPage): boolean {
  return Array.from(m.container.querySelectorAll('span')).some(s => /^Shot\s*\d+\/\d+$/.test((s.textContent ?? '').replace(/\s+/g, ' ').trim()));
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (doneCard(m)) return 'finished';
  if (onCourt(m)) return 'playing';
  throw new Error('buzzer beater shows neither a court nor a finished run (intro?)');
}

/* Settle up to `count` shots, stopping early when the run is over: a resumed
   run (Round 645 part three) has fewer than ten left. */
async function takeShots(m: MountedPage, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    const shoot = findButton(m.container, /^Hold to shoot$/);
    if (!shoot) { if (doneCard(m)) return; throw new Error('no shoot button and no finished run'); }
    /* Loading and releasing are separate events on the same button, so this
       is a hold rather than a click. Both go in one act so no timer can run
       between them. */
    await act(async () => {
      fireEvent.mouseDown(shoot);
      fireEvent.mouseUp(shoot);
    });
    const next = await waitFor(() => button(m.container, /^Next shot$|^See the run$/));
    await click(next);
  }
}

const finish = (m: MountedPage) => takeShots(m, ROUNDS_PER_RUN);

/* The three pills over the court: the shot the board is on, the makes and
   the points. Byte identical across a reload of a part played run. */
function progress(m: MountedPage): string {
  const lines = Array.from(m.container.querySelectorAll('span'))
    .map(s => (s.textContent ?? '').replace(/\s+/g, ' ').trim())
    .filter(t => /^(Shot \d+\/\d+|Made \d+|Points -?\d+)$/.test(t));
  if (lines.length !== 3) throw new Error(`buzzer beater shows ${lines.length} of the three progress pills (no live court?)`);
  return lines.join('\n');
}

async function enterDaily(m: MountedPage): Promise<void> {
  const daily = findButton(m.container, /^Today's ten$/);
  if (daily) { await click(daily); return; }
  if (doneCard(m)) return;
  throw new Error('buzzer beater shows neither the intro nor a finished run');
}

export default defineDriver<Api>({
  slug: 'buzzer-beater',
  keyPrefix: 'buzzer-beater-daily-',
  restoreStyle: 'initializer',

  async mount() {
    const restoreGlobals = freezeArcadeGlobals();
    const m = mountPage(<BuzzerBeater />, '/buzzer-beater');
    await waitFor(() => {
      if (!findButton(m.container, /^Today's ten$/) && !doneCard(m)) throw new Error('buzzer beater has not drawn its intro or its result');
    });
    return { ...m, restoreGlobals };
  },

  enterDaily,
  finish,
  status,

  /* Round 645 part three: three of the ten, then a reload has to come back
     on shot four with the same makes and points. */
  playSome: m => takeShots(m, 3),
  progress,

  /* Assertion 7: one shot released with the ball left in the air, then the
     refresh. The shot is decided at the release, so it has to stay taken. */
  oneStep: m => takeShots(m, 1),
  async interruptStep(m) {
    const shoot = button(m.container, /^Hold to shoot$/);
    await withFullMotion(async () => {
      await act(async () => {
        fireEvent.mouseDown(shoot);
        fireEvent.mouseUp(shoot);
      });
    });
    if (findButton(m.container, /^Next shot$|^See the run$/)) throw new Error('the shot landed before the refresh, so the flight was never interrupted');
  },

  /* Every number on the final card: the makes, the points and the ceiling.
     The one line left out is the "come back tomorrow" note, which appears
     only on a restored daily and stands where the fresh finish puts its
     Another ten button. That is copy the page legitimately changes on a
     restore, and it is the only such line: no number is dropped. */
  fingerprint(m) {
    const card = doneCard(m);
    if (!card) return 'no final card';
    return Array.from(card.querySelectorAll('p'))
      .map(p => (p.textContent ?? '').trim())
      .filter(t => !/^Come back tomorrow/.test(t))
      .join('\n');
  },

  /* A restored daily offers no way back into it, so there is nothing to
     click; a live court would mean the daily came back fresh, which is the
     regression, so play it out and let assertion 4 count the second record. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = doneCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /another ten|play again|new shots/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
    m.restoreGlobals();
  },
});
