/**
 * /nba-stat-line, the positive control for scripts/simDailyReload.mjs.
 *
 * This route already keeps its finished daily: submit() writes
 * nba-stat-line-daily-<date> = {picks}, start('daily') restores the five
 * picks against the dated target and sets alreadyPlayed in the same batch
 * as phase 'done', so the page's useGameCompletion never sees a false to
 * true transition and no markRestoredFinish call is needed. A refresh lands
 * on the mode menu by design (the Perfect Season shape); Daily reopens the
 * locked result. The row must be green on day one; if it is not, the
 * harness cannot see a working lock and is wrong.
 *
 * Synthetic seasons, invented names, shipped nowhere: eight rows so the
 * daily anchor, the five picks and a sixth pick to refuse all exist.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { setPoolFixture } from './mocks';
import { buildPool } from '@/lib/nbaStatLine';
import NbaStatLine from '@/pages/NbaStatLine';

const ROWS = Array.from({ length: 8 }, (_, i) => ({
  season: `201${i}-1${i + 1}`.slice(0, 7),
  player_name: `Fixture Probe ${i + 1}`,
  position: 'SF',
  team: 'FXA',
  minutes: 1500 + i * 100,
  pts: 700 + i * 40,
  trb: 250 + i * 10,
  ast: 150 + i * 12,
  stl: 60 + i,
  blk: 30 + i,
  fg: 260 + i * 10,
  fga: 600 + i * 10,
  ft: 120 + i,
  fta: 150 + i,
  three_p: 50 + i,
  three_pa: 140 + i,
}));

const SEARCH = 'input[placeholder="Search any NBA player..."]';

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (m.container.querySelector(SEARCH) || findButton(m.container, /^Score my line$|^Pick \d more season/)) return 'playing';
  throw new Error('nba-stat-line shows neither a board nor a result card (mode menu, boot or error state)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, /^Daily target/));
}

async function finish(m: MountedPage): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const input = m.container.querySelector(SEARCH);
    if (!input) throw new Error(`no search box for pick ${i + 1}`);
    await typeInto(input, 'Fixture');
    const first = findButton(m.container, /^Fixture Probe/);
    if (!first) throw new Error(`no suggestion offered for pick ${i + 1}`);
    await click(first);
  }
  await click(button(m.container, /^Score my line$/));
}

export default defineDriver<MountedPage>({
  slug: 'nba-stat-line',
  keyPrefix: 'nba-stat-line-daily-',
  restoreStyle: 'handler',
  usesRestoreMark: false,
  payloadShape: 'legacy',

  async mount() {
    setPoolFixture('nbaStatLine', buildPool(ROWS));
    const m = mountPage(<NbaStatLine />, '/nba-stat-line');
    await waitFor(() => {
      if (!findButton(m.container, /^Daily target/)) throw new Error('the mode menu has not come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* The numbers the player sees: the score sentence, the emoji grid, and
     the stat by stat table with the picks line. The headline is left out
     because the page swaps it for "Today's run is in the books" on a
     restore, which is copy, not outcome. */
  fingerprint(m) {
    const card = resultCard(m);
    if (!card) return 'no result card';
    const paragraphs = Array.from(card.querySelectorAll('p'));
    const scoreLine = paragraphs.find(p => /scored \d+ out of 100/.test(p.textContent ?? ''))?.textContent ?? '';
    const grid = card.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    const tableLabel = paragraphs.find(p => /Stat by stat, per 36/.test(p.textContent ?? ''));
    const table = tableLabel?.parentElement?.textContent ?? '';
    return [scoreLine, grid, table].join('\n');
  },

  /* Back to the menu and into Daily again is the only route back at the
     daily; if that ever deals a live board, play it to the end, because
     that is the replay that would re-pay the score. */
  async replay(m) {
    await click(button(m.container, /^Back to modes$/));
    await enterDaily(m);
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /new target|play again/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
