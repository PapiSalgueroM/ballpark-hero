/**
 * /pack-battle for scripts/simDailyReload.mjs.
 *
 * Round 645 part three. The page boots by fetching the market value pool
 * (stubbed here with a 24 card fixture, the loader refuses fewer than 20)
 * and opens on the daily pack: the day's five cards from a seeded shuffle of
 * the pool, so this driver builds the same pack through the real
 * buildDailyPack and knows every value before it plays. Shortest honest
 * path with a number worth restoring: one correct call, then one wrong one,
 * which busts the pack with one card banked (a fresh default of nothing
 * banked would read as grade F and fail the fingerprint). Each call sits
 * behind a 1.4 second reveal timer before the next card is live, so mount()
 * shortens long timeouts the way the Minefield row does.
 *
 * The finished daily offers Play Unlimited (not a replay) and the two mode
 * toggles; replay() takes every one of them and plays any live daily board
 * it finds to the end.
 *
 * Round 645 part three: the row also resumes (assertion 6). Every call is
 * filed before its card turns over, so one correct call, a reload and the
 * Daily board must come back on card 3 with the same card banked.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { setPoolFixture } from './mocks';
import { button, click, findButton, mountPage, resultCard, resultText, shortenTimeouts, type MountedPage } from './harness';
import { buildDailyPack, type PackCard } from '@/lib/packBattle';
import PackBattle from '@/pages/PackBattle';

type Api = MountedPage & { restoreTimeout: () => void };

/* Distinct values, so a wrong call always exists whatever order the day
   deals them in (a tie counts in the player's favour). */
const POOL: PackCard[] = Array.from({ length: 24 }, (_, i) => ({
  name: `Fixture Player ${String(i + 1).padStart(2, '0')}`,
  club: `Fixture Club ${(i % 6) + 1}`,
  nationality: 'England',
  value: 1_000_000 + i * 750_000,
}));

function cardLine(m: MountedPage): number | null {
  const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Card \d+ of \d+$/.test((s.textContent ?? '').trim()));
  if (!span) return null;
  return Number((span.textContent ?? '').trim().match(/^Card (\d+) of/)![1]);
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m.container)) return 'finished';
  if (cardLine(m) !== null) return 'playing';
  throw new Error('pack battle shows neither a pack nor the result card (boot or error?)');
}

/* Call on the card that is face down: correctly or wrongly, from the pack
   the day deals. "Card N of 5" is the face down card's position, so the
   banked card is pack[N - 2]. */
async function press(m: MountedPage, correctly: boolean): Promise<void> {
  const pack = buildDailyPack(POOL);
  const n = cardLine(m);
  if (n === null) throw new Error('no face down card to call on');
  const banked = pack[n - 2];
  const next = pack[n - 1];
  const higherIsRight = next.value >= banked.value;
  const callHigher = correctly ? higherIsRight : !higherIsRight;
  await click(button(m.container, callHigher ? /^Higher$/ : /^Lower$/));
}

async function call(m: MountedPage, correctly: boolean): Promise<void> {
  await press(m, correctly);
  await waitFor(() => {
    if (findButton(m.container, /^Higher$/) || resultCard(m.container)) return;
    throw new Error('the reveal has not settled');
  });
}

/* One correct call, then a wrong one. A pack resumed after its first call
   (Round 645 part three, assertion 6) only has the wrong one left to make, so
   the split run ends exactly where the unbroken one did. */
async function finish(m: MountedPage): Promise<void> {
  if (cardLine(m) === 2) await call(m, true);
  if (status(m) === 'finished') return;
  await call(m, false);
  await waitFor(() => { if (!resultCard(m.container)) throw new Error('the pack has not busted'); });
}

/* The line over the live pack: the card being called on and the bank. */
function progress(m: MountedPage): string {
  const span = Array.from(m.container.querySelectorAll('span')).find(s => /^Card \d+ of \d+$/.test((s.textContent ?? '').trim()));
  if (!span?.parentElement) throw new Error('no live pack');
  return (span.parentElement.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export default defineDriver<Api>({
  slug: 'pack-battle',
  keyPrefix: 'pack-battle-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/pages/PackBattle.tsx',
  finishedSetter: "setPhase('done')",

  async mount() {
    setPoolFixture('pack', POOL);
    const restoreTimeout = shortenTimeouts();
    const m = mountPage(<PackBattle />, '/pack-battle');
    await waitFor(() => { status(m); });
    return { ...m, restoreTimeout };
  },

  async enterDaily() {
    /* the page opens on the daily */
  },

  finish,
  status,

  /* Round 645 part three: one correct call, then a reload has to come back
     on card 3 with the same card banked. */
  playSome: m => call(m, true),
  progress,

  /* Assertion 7: one call made and the page refreshed while the card is
     still turning over. The call is decided when it is made, so it has to
     stay made. */
  oneStep: m => call(m, true),
  async interruptStep(m) {
    await press(m, true);
    if (findButton(m.container, /^Higher$/) || resultCard(m.container)) throw new Error('the card settled before the refresh, so the reveal was never interrupted');
  },

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
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new pack|reset|try again/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
    m.restoreTimeout();
  },
});
