/**
 * /rarity-round for scripts/simDailyReload.mjs.
 *
 * Round 645 part three. The page boots straight into today's daily in
 * Rarity mode: five categories from a seeded shuffle, each round fetching
 * that category's ranked pool (stubbed here with one five name fixture for
 * every category) and taking one answer through the shared search box
 * (stubbed to offer the fixture as pick buttons, see ./mocks). The honest
 * path picks the second ranked name every round, worth 75 fame points a
 * round, so the card carries 125 of 500 obscurity and 375 fame points,
 * numbers a fresh default could not read.
 *
 * Two toggles sit above the board: Daily against Unlimited, and Rarity
 * Round against Crowd Says. Only the ranked Rarity daily is this row's
 * daily; Crowd Says on the same day is its own warm up play with no score
 * and is left alone here. replay() takes Play Unlimited and both routes
 * back to the Daily toggle and plays any live daily board it finds.
 *
 * Round 645 part three: the row also resumes (assertion 6). Each answer is
 * filed as it is locked in, so two answers, a reload and the Daily board
 * must come back on round 3 with the same score so far.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { setPoolFixture } from './mocks';
import { button, click, findButton, mountPage, resultCard, resultText, type MountedPage } from './harness';
import { normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import { ROUNDS_PER_RUN, type PoolEntry } from '@/lib/rarityRound';
import RarityRound from '@/pages/RarityRound';

const NAMES = ['Fixture Alpha', 'Fixture Bravo', 'Fixture Charlie', 'Fixture Delta', 'Fixture Echo'];
const POOL: PoolEntry[] = NAMES.map((name, i) => ({ key: normalizeName(name), name, prominence: 100 - i * 10, rank: i + 1 }));
const ENTITIES: PlayerEntity[] = POOL.map(p => ({ key: p.key, name: p.name, rawName: p.name, meta: {}, matchRank: 0, prominence: p.prominence }));
const PICK = NAMES[1];

function roundLine(m: MountedPage): boolean {
  return Array.from(m.container.querySelectorAll('span')).some(s => /^Round \d+ of \d+$/.test((s.textContent ?? '').trim()));
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m.container)) return 'finished';
  if (roundLine(m)) return 'playing';
  throw new Error('rarity round shows neither a round nor the result card (boot or error?)');
}

/* Answer up to `count` rounds with the same pick, stopping when the run is
   over: a resumed run (Round 645 part three) has fewer than five left. */
async function answer(m: MountedPage, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    if (resultCard(m.container)) return;
    const pick = await waitFor(() => button(m.container, new RegExp(`^pick ${PICK}$`)));
    await click(pick);
    await click(button(m.container, /^Lock in answer$/));
    const next = await waitFor(() => button(m.container, /^Next round$|^See final score$/));
    await click(next);
  }
}

async function finish(m: MountedPage): Promise<void> {
  await answer(m, ROUNDS_PER_RUN);
  await waitFor(() => { if (!resultCard(m.container)) throw new Error('the run has not finished'); });
}

/* The line over the live board: the round it is on and the score so far. */
function progress(m: MountedPage): string {
  const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Round \d+ of \d+$/.test((s.textContent ?? '').trim()));
  if (!span?.parentElement) throw new Error('no live round');
  return (span.parentElement.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export default defineDriver<MountedPage>({
  slug: 'rarity-round',
  keyPrefix: 'rarity-round-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/pages/RarityRound.tsx',
  finishedSetter: "setPhase('done')",

  async mount() {
    setPoolFixture('rarity', POOL);
    setPoolFixture('autocomplete', ENTITIES);
    const m = mountPage(<RarityRound />, '/rarity-round');
    await waitFor(() => {
      if (resultCard(m.container) || findButton(m.container, /^pick /)) return;
      throw new Error('rarity round has not drawn its first round or its result');
    });
    return m;
  },

  async enterDaily() {
    /* the page opens on the daily */
  },

  finish,
  status,

  /* Round 645 part three: two answers, then a reload has to come back on
     round 3 with the same score so far. */
  playSome: m => answer(m, 2),
  progress,

  fingerprint(m) {
    const card = resultCard(m.container);
    return card ? resultText(card) : 'no result card';
  },

  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    const unlimited = findButton(m.container, /^Play Unlimited$/);
    if (unlimited) await click(unlimited);
    await click(button(m.container, /^📅 Daily$/));
    if (status(m) === 'playing') await finish(m);
    await click(button(m.container, /^∞ Unlimited$/));
    await click(button(m.container, /^📅 Daily$/));
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m.container);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new round|reset|try again/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
