/**
 * Round 645: a free run says so on its result card.
 *
 * Round 644's rule is that a result screen shows the score that gets
 * recorded. Since Round 645 a finish outside the daily (Unlimited, free play,
 * a new season, versus) is recorded as a play with no score, so a card that
 * still shows its score has to say, next to it, that this one pays no points
 * and is not on today's leaderboard. The line is written once
 * (src/components/game/UnrankedNote.tsx) and reaches every card two ways:
 * ResultScreen renders it from its `ranked` prop, and a board that builds its
 * own card renders it beside its score.
 *
 * This renders both kinds for real, through Unlimited (the line shows) and
 * through the daily (it does not): the shared card on its own, Guess The F1
 * Driver (its own card) and Hall of Fame or Bust (the shared card), each on
 * its real page with the network stubbed.
 *
 * scripts/simRankedRecorder.mjs section 4 runs this file and carries the
 * controls: notesilent swaps in a copy of the line that never renders (every
 * case that expects the line goes red, every other stays green), and
 * screendrops swaps in a copy of ResultScreen that drops it (the shared card
 * cases go red, F1 Driver's own card stays green).
 */
import './dailyReload/mocks';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, waitFor } from '@testing-library/react';
import { resetMocks } from './dailyReload/mocks';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './dailyReload/harness';
import f1Driver from './dailyReload/f1-driver.driver';
import { ResultScreen } from '@/components/game/ResultScreen';
import { UNRANKED_LINE } from '@/components/game/UnrankedNote';
import HofOrBust from '@/pages/HofOrBust';

const lines = (root: ParentNode) =>
  Array.from(root.querySelectorAll('[data-unranked-note]')).filter(el => (el.textContent ?? '').trim() === UNRANKED_LINE).length;

beforeEach(() => {
  resetMocks();
  localStorage.clear();
});
afterEach(() => cleanup());

const card = (ranked?: boolean) => (
  <ResultScreen
    ranked={ranked}
    outcomeEmoji="⚽"
    headline="Full time"
    statRow={[{ label: 'Score', value: 70 }]}
    emojiGrid="🟩🟩🟥"
    share={{ score: '70', gameName: 'Test', gamePath: '/test' }}
  />
);

describe('the shared card', () => {
  it('the shared card: a free run shows the line under its score', () => {
    const m = mountPage(card(false), '/test');
    expect(lines(m.container)).toBe(1);
  });

  it('the shared card: a ranked finish and a one mode game show no line', () => {
    const ranked = mountPage(card(true), '/test');
    expect(ranked.container.textContent).toContain('Full time');
    expect(lines(ranked.container)).toBe(0);
    ranked.unmount();
    const single = mountPage(card(undefined), '/test');
    expect(single.container.textContent).toContain('Full time');
    expect(lines(single.container)).toBe(0);
  });
});

/* A guess from the suggestion list, then Give Up if that guess did not end
   it: an Unlimited driver is random, so the finish does not depend on
   knowing it. */
async function finishUnlimitedDriver(m: MountedPage): Promise<void> {
  const input = m.container.querySelector('input[placeholder="Type driver name..."]');
  if (!input) throw new Error('no search box on the Unlimited board');
  await typeInto(input, 'a');
  const suggestion = Array.from(m.container.querySelectorAll('button')).find(b => (b.textContent ?? '').trim().startsWith('🏎️'));
  if (!suggestion) throw new Error('no suggestion offered');
  await click(suggestion);
  if (f1Driver.status(m) === 'finished') return;
  await click(button(m.container, /Give Up$/));
  await click(button(m.container, /^Yes, Give Up$/));
}

describe('Guess The F1 Driver, its own card', () => {
  it('F1 Driver, its own card: an Unlimited finish shows the line', async () => {
    const m = await f1Driver.mount();
    await click(button(m.container, /Unlimited Mode/));
    await finishUnlimitedDriver(m);
    expect(f1Driver.status(m)).toBe('finished');
    expect(lines(m.container)).toBe(1);
    m.unmount();
  });

  it('F1 Driver, its own card: a daily finish shows no line', async () => {
    const m = await f1Driver.mount();
    await f1Driver.enterDaily(m);
    await f1Driver.finish(m);
    expect(f1Driver.status(m)).toBe('finished');
    expect(lines(m.container)).toBe(0);
    m.unmount();
  });
});

describe('Hall of Fame or Bust, the shared card', () => {
  it('HOF or Bust, the shared card: the daily shows no line, Unlimited after it does', async () => {
    const m = mountPage(<HofOrBust />, '/hof-or-bust');
    await waitFor(() => { if (!findButton(m.container, /^Hall of Fame$/)) throw new Error('no vote buttons yet'); });
    await click(button(m.container, /^Hall of Fame$/));
    await waitFor(() => { if (!/Verdict Revealed/.test(m.container.textContent ?? '')) throw new Error('no verdict yet'); });
    expect(lines(m.container)).toBe(0);
    await click(button(m.container, /Play Unlimited/));
    await waitFor(() => { if (!findButton(m.container, /^Bust$/)) throw new Error('no Unlimited vote buttons yet'); });
    await click(button(m.container, /^Bust$/));
    await waitFor(() => { if (!/Verdict Revealed/.test(m.container.textContent ?? '')) throw new Error('no Unlimited verdict yet'); });
    expect(lines(m.container)).toBe(1);
    m.unmount();
  });
});
