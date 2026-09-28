/**
 * Shared driver logic for the three chain routes (NASCAR, Tennis, Combat),
 * three boards over three hooks written as copies of one idea. One row file
 * per route still exists beside this (the test discovers only
 * *.driver.tsx); each hands its page, path, slug and daily button in here.
 *
 * Round 645 part three. Every board opens on a mode menu; the daily deals a
 * starting name hashed from the pinned ET day, and the chain ends on a wrong
 * guess, a repeat, or Give Up. The shortest honest finish is Give Up on the
 * starter: a chain of 0, a score of 0, and the reason on the card. The two
 * network validated chains (NASCAR, Tennis) never reach their edge function
 * on that path, and Combat validates from bundled data, so no fixture is
 * needed.
 *
 * A finished daily offers no way back in: its card has a Back to modes
 * button in place of the unlimited run's Play Again, and the menu's Daily
 * button restores the finished chain. replay() tries every control a
 * regression could hand back and plays any live board it finds to the end.
 */
import type { ReactElement } from 'react';
import { waitFor } from '@testing-library/react';
import type { DailyReloadDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';

function gameOverCard(m: MountedPage): Element | null {
  const h2 = Array.from(m.container.querySelectorAll('h2')).find(h => /^Game Over!$/.test((h.textContent ?? '').trim()));
  return h2?.parentElement ?? null;
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (gameOverCard(m)) return 'finished';
  if (findButton(m.container, /^Give Up$/)) return 'playing';
  throw new Error('the chain shows neither a live chain nor a finished one (mode menu?)');
}

async function finish(m: MountedPage): Promise<void> {
  await click(button(m.container, /^Give Up$/));
  await waitFor(() => { if (!gameOverCard(m)) throw new Error('the chain has not ended'); });
}

export function chainDriver(slug: string, path: string, page: ReactElement, dailyButton: RegExp): DailyReloadDriver<MountedPage> {
  const enterDaily = async (m: MountedPage) => {
    const daily = findButton(m.container, dailyButton);
    if (daily) { await click(daily); return; }
    if (gameOverCard(m)) return;
    throw new Error(`${slug} shows neither the mode menu nor a finished chain`);
  };

  return {
    slug,
    keyPrefix: `${slug}-daily-`,
    restoreStyle: 'handler',
    restoreFile: `src/hooks/${slug === 'nascar-chain' ? 'useNascarChain' : slug === 'tennis-chain' ? 'useTennisChain' : 'useUfcChain'}.ts`,
    finishedSetter: 'setGameState(saved)',

    async mount() {
      const m = mountPage(page, path);
      await waitFor(() => {
        if (!findButton(m.container, dailyButton)) throw new Error('the mode menu has not come up');
      });
      return m;
    },

    enterDaily,
    finish,
    status,

    /* The card's own lines: the reason the chain ended, the final score, the
       chain length, the bonus note, the badge, and for Combat the correct
       answer. The nickname form and the share row are left out. */
    fingerprint(m) {
      const card = gameOverCard(m);
      if (!card) return '';
      const lines = Array.from(card.querySelectorAll('h2, p, div'))
        .map(el => (el.textContent ?? '').replace(/\s+/g, ' ').trim())
        .filter(t => /^(Final Score: \d+|Chain Length: \d+|Includes x[\d.]+ chain bonus!|Chain of \d+!|Correct answer was:.+)$/.test(t));
      const reason = card.querySelector(':scope > p')?.textContent?.trim() ?? '';
      return [reason, ...lines].join('\n');
    },

    async replay(m) {
      if (status(m) === 'playing') await finish(m);
      const back = findButton(m.container, /^Play Again$|^Back to modes$/);
      if (back) await click(back);
      const daily = findButton(m.container, dailyButton);
      if (daily) {
        await click(daily);
        if (status(m) === 'playing') await finish(m);
      }
    },

    hasDailyReplayControl(m) {
      const card = gameOverCard(m);
      if (!card) return false;
      return Array.from(card.querySelectorAll('button')).some(b => /play again|new chain|reset|try again/i.test(b.textContent ?? ''));
    },

    unmount(m) {
      m.unmount();
    },
  };
}
