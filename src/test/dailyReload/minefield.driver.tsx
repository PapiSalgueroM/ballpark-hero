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
import { buildRun, daySeed } from '@/lib/minefield';
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

function liveTile(m: MountedPage, name: string): HTMLButtonElement | null {
  return Array.from(m.container.querySelectorAll('button')).find(x => (x.textContent ?? '').trim() === name && !x.disabled) ?? null;
}

function boardNumber(m: MountedPage): number {
  const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Board \d+\/\d+$/.test((s.textContent ?? '').trim()));
  if (!span) throw new Error('no board on screen');
  return Number((span.textContent ?? '').trim().match(/^Board (\d+)\//)![1]) - 1;
}

/* Round 645 part three fix: the honest path now takes a life on the first
   board (its first mine, then every real name), so the run carries a hit, a
   named mine and a lost heart for a reload to keep; the other two boards are
   cleared clean. Each board's moves are played from wherever the board is, a
   tile already picked being skipped, so a run resumed part way (assertion 6)
   plays exactly the moves the unbroken run did. */
function movesFor(board: number): string[] {
  const tiles = buildRun(daySeed())[board].tiles;
  const real = tiles.filter(t => !t.isMine).map(t => t.name);
  if (board > 0) return real;
  return [tiles.find(t => t.isMine)!.name, ...real];
}

async function playBoard(m: MountedPage, moves: string[]): Promise<void> {
  for (const name of moves) {
    const tile = liveTile(m, name);
    if (tile) await click(tile);
  }
}

async function finish(m: MountedPage): Promise<void> {
  while (!doneCard(m)) {
    await playBoard(m, movesFor(boardNumber(m)));
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

  /* Round 674 fix: a free run, for the free play line check (./driver).
     Unlimited boards are dealt at random, so the run is walked out without
     knowing the mines: the first open tile on each board until the board
     ends, then on to the next. */
  async enterFree(m) {
    await click(button(m.container, /^Unlimited$/));
    await waitFor(() => { if (status(m) !== 'playing') throw new Error('no free board yet'); });
  },
  async finishFree(m) {
    for (let guard = 0; guard < 200 && !doneCard(m); guard += 1) {
      const next = findButton(m.container, /^Next board|^See final score$/);
      if (next) { await click(next); continue; }
      const tile = Array.from(m.container.querySelectorAll('div.grid button')).find(b => !(b as HTMLButtonElement).disabled);
      if (tile) { await click(tile); continue; }
      await waitFor(() => { if (!findButton(m.container, /^Next board|^See final score$/) && !doneCard(m)) throw new Error('the board ended with no way on'); }, { timeout: 4000 });
    }
    if (!doneCard(m)) throw new Error('the free run never reached its final score');
  },

  /* Round 645 part three fix: the mine and two real names on the first
     board, then a reload has to come back on board 1 with the same picks,
     one heart gone, the mine still named and 20 points. */
  playSome: m => playBoard(m, movesFor(0).slice(0, 3)),
  progress(m) {
    if (status(m) !== 'playing') throw new Error('no live board');
    const row = Array.from(m.container.querySelectorAll('span')).find(s => /^Board \d+\/\d+$/.test((s.textContent ?? '').trim()))!.parentElement!;
    const hearts = row.querySelectorAll('.fill-red-400').length;
    const mine = Array.from(m.container.querySelectorAll('div')).map(d => (d.textContent ?? '').trim()).find(t => /was a mine/.test(t) && t.startsWith('💥')) ?? '';
    const picked = Array.from(m.container.querySelectorAll('button')).filter(b => b.disabled && /✓|💥/.test(b.textContent ?? '')).map(b => (b.textContent ?? '').trim()).sort();
    return [Array.from(row.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).join(' | '), `hearts ${hearts}`, mine, picked.join(', ')].join('\n');
  },

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
