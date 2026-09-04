/**
 * /minefield for scripts/simDailyReload.mjs.
 *
 * The page opens on an intro with Daily Boards and Unlimited; Daily deals
 * three boards seeded from the ET day (buildRun(daySeed())), so the driver
 * builds the same run and clears every board by clicking exactly the tiles
 * that belong, the honest path to the full score. Each board ends behind a
 * reveal animation (window.setTimeout, about 1.8 seconds a board) before the
 * Next board button appears; three of those would push one assertion past
 * vitest's 5 second budget, so mount() shortens any timeout of half a
 * second or more to a few milliseconds and unmount() puts it back. The
 * animation gates a button, not the game, so nothing under test moves.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { buildRun, daySeed, ROUNDS_PER_RUN } from '@/lib/minefield';
import Minefield from '@/pages/Minefield';

type Api = MountedPage & { restoreTimeout: () => void };

function doneCard(m: MountedPage): Element | null {
  const line = Array.from(m.container.querySelectorAll('p')).find(p => /boards cleared/.test(p.textContent ?? ''));
  return line?.parentElement ?? null;
}

function onBoard(m: MountedPage): boolean {
  return Array.from(m.container.querySelectorAll('span')).some(s => /^Board \d+\/\d+$/.test((s.textContent ?? '').trim()));
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (doneCard(m)) return 'finished';
  if (onBoard(m)) return 'playing';
  throw new Error('minefield shows neither a board nor the final score (intro?)');
}

function tileButton(m: MountedPage, name: string): HTMLButtonElement {
  const b = Array.from(m.container.querySelectorAll('button')).find(x => (x.textContent ?? '').trim() === name && !x.disabled);
  if (!b) throw new Error(`no live tile named ${name}`);
  return b;
}

async function finish(m: MountedPage): Promise<void> {
  const run = buildRun(daySeed());
  for (let r = 0; r < ROUNDS_PER_RUN; r++) {
    for (const tile of run[r].tiles) {
      if (!tile.isMine) await click(tileButton(m, tile.name));
    }
    const next = await waitFor(() => button(m.container, /^Next board|^See final score$/), { timeout: 4000 });
    await click(next);
  }
}

async function enterDaily(m: MountedPage): Promise<void> {
  const daily = findButton(m.container, /^Daily Boards$/);
  if (daily) { await click(daily); return; }
  if (doneCard(m)) return;
  throw new Error('minefield shows neither the intro nor a finished run');
}

export default defineDriver<Api>({
  slug: 'minefield',
  keyPrefix: 'minefield-daily-',
  restoreStyle: 'initializer',

  async mount() {
    const real = window.setTimeout;
    const quick = ((fn: TimerHandler, ms?: number, ...rest: unknown[]) =>
      real(fn, typeof ms === 'number' && ms >= 500 ? 5 : ms, ...rest)) as typeof window.setTimeout;
    window.setTimeout = quick;
    const m = mountPage(<Minefield />, '/minefield');
    await waitFor(() => {
      if (!findButton(m.container, /^Daily Boards$/) && !doneCard(m)) throw new Error('minefield has not drawn its intro or its result');
    });
    return { ...m, restoreTimeout: () => { if (window.setTimeout === quick) window.setTimeout = real; } };
  },

  enterDaily,
  finish,
  status,

  /* The score and the boards line, every number on the final card. */
  fingerprint(m) {
    const card = doneCard(m);
    if (!card) return 'no final score';
    return Array.from(card.querySelectorAll('p')).map(p => (p.textContent ?? '').trim()).join('\n');
  },

  /* The finished card offers no way back to the daily; a live board is the
     replay (the daily came back fresh), so play it out. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = doneCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /daily boards|play again|new boards/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
    m.restoreTimeout();
  },
});
