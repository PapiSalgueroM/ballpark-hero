/**
 * /sports-bingo for scripts/simDailyReload.mjs.
 *
 * The page fetches its pool (fetchSquadPool, wrapped by ./mocks and fed the
 * baked 748 player pool the game itself falls back to), lands on a setup
 * menu, and Daily card deals one card and ten packs from the ET date. The
 * driver builds the same game from the same pool and seed and, pack by
 * pack, taps every square the open pack can claim before closing it, the
 * honest path to a real score with lines. The finished card is the shared
 * ResultScreen; its play again button goes back to the setup menu, where
 * the Daily entry is the way back at the daily.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { setPoolFixture } from './mocks';
import { players } from '@/data/players';
import { getTodayET } from '@/lib/dateUtils';
import { buildGame, claimableSquares, dailySeed, CARD_SIZE, PACK_COUNT } from '@/lib/sportsBingo';
import SportsBingo from '@/pages/SportsBingo';

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}

function advanceButton(m: MountedPage): HTMLButtonElement | null {
  return findButton(m.container, /^Done with this pack|^Finish$/);
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (advanceButton(m)) return 'playing';
  throw new Error('sports-bingo shows neither an open pack nor a result card (boot, setup or error state)');
}

function squareButtons(m: MountedPage): HTMLButtonElement[] {
  const grid = m.container.querySelector('div.grid-cols-5');
  if (!grid) throw new Error('no bingo card on the page');
  const buttons = Array.from(grid.querySelectorAll('button'));
  if (buttons.length !== CARD_SIZE) throw new Error(`the card has ${buttons.length} squares, expected ${CARD_SIZE}`);
  return buttons;
}

async function enterDaily(m: MountedPage): Promise<void> {
  if (resultCard(m)) return;
  await click(button(m.container, /^Daily card/));
}

async function finish(m: MountedPage): Promise<void> {
  const game = buildGame(players, dailySeed(getTodayET()));
  const marked: boolean[] = new Array(CARD_SIZE).fill(false);
  for (let i = 0; i < PACK_COUNT; i++) {
    for (const sq of claimableSquares(game, game.packs[i], marked)) {
      await click(squareButtons(m)[sq]);
      marked[sq] = true;
    }
    const next = advanceButton(m);
    if (!next) throw new Error(`no pack button on pack ${i + 1}`);
    await click(next);
  }
}

export default defineDriver<MountedPage>({
  slug: 'sports-bingo',
  keyPrefix: 'sports-bingo-daily-',
  restoreStyle: 'initializer',

  async mount() {
    setPoolFixture('squad', players);
    const m = mountPage(<SportsBingo />, '/sports-bingo');
    await waitFor(() => {
      if (!findButton(m.container, /^Daily card/) && !resultCard(m)) throw new Error('sports-bingo has drawn neither its setup menu nor a result');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* The headline, the squares and lines sentence, the score chip and the
     card grid: every number and every square the player saw. */
  fingerprint(m) {
    const card = resultCard(m);
    if (!card) return 'no result card';
    const headline = card.querySelector('h2')?.textContent ?? '';
    const lines = Array.from(card.querySelectorAll('p')).map(p => (p.textContent ?? '').trim());
    const stats = Array.from(card.querySelectorAll('span.font-display')).map(v => `${v.previousElementSibling?.textContent ?? ''}: ${v.textContent ?? ''}`);
    const grid = card.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    return [headline, ...lines, ...stats, grid].join('\n');
  },

  /* A live board is the replay (the daily came back fresh). Then the way a
     player would try again: the card's button back to the setup menu and
     the Daily entry there; if that deals a live board, play it out. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    const card = resultCard(m);
    const back = card ? Array.from(card.querySelectorAll('button')).find(b => /new card|back to modes/i.test(b.textContent ?? '')) : null;
    if (back) {
      await click(back);
      await waitFor(() => button(m.container, /^Daily card/));
      await enterDaily(m);
      if (status(m) === 'playing') await finish(m);
    }
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /new card|play again/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
