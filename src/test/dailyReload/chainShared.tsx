/**
 * Shared driver logic for the three chain routes (NASCAR, Tennis, Combat),
 * three boards over three hooks written as copies of one idea. One row file
 * per route still exists beside this (the test discovers only
 * *.driver.tsx); each hands its page, path, slug, daily button and the way
 * one link is added in here.
 *
 * Round 645 part three. Every board opens on a mode menu; the daily deals a
 * starting name hashed from the pinned ET day, and the chain ends on a wrong
 * guess, a repeat, or Give Up. The honest finish adds one real link and then
 * gives up, so the card carries a chain of one and a score a fresh default
 * could not read; a resumed chain that already has its link just gives up,
 * which is what lets assertion 6 require the split run to end byte identical
 * to the unbroken one. How the link is added is the sport's: the two network
 * validated chains pick a fixture name through the stubbed search box and
 * their edge function answers from a fixture (./mocks), and Combat types a
 * real winner from the bundled results into its own search.
 *
 * A finished daily offers no way back in: its card has a Back to modes
 * button in place of the unlimited run's Play Again, and the menu's Daily
 * button restores the finished chain. replay() tries every control a
 * regression could hand back and plays any live board it finds to the end.
 */
import type { ReactElement } from 'react';
import { waitFor } from '@testing-library/react';
import type { DailyReloadDriver } from './driver';
import { setFunctionFixture, setPoolFixture } from './mocks';
import { button, click, findButton, mountPage, unlimitedGiveUp, type MountedPage } from './harness';

function gameOverCard(m: MountedPage): Element | null {
  const h2 = Array.from(m.container.querySelectorAll('h2')).find(h => /^Game Over!$/.test((h.textContent ?? '').trim()));
  return h2?.parentElement ?? null;
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (gameOverCard(m)) return 'finished';
  if (findButton(m.container, /^Give Up$/)) return 'playing';
  throw new Error('the chain shows neither a live chain nor a finished one (mode menu?)');
}

/* "Score: N" over the live chain; every link is worth at least 100. */
function liveScore(m: MountedPage): number {
  const line = Array.from(m.container.querySelectorAll('div')).map(d => (d.textContent ?? '').trim()).find(t => /^Score: \d+$/.test(t));
  if (line === undefined) throw new Error('no score line over the live chain');
  return Number(line.slice('Score: '.length));
}

/* The name the chain is on: the line under the board's "Current ..." heading. */
export function currentName(m: MountedPage): string {
  const h2 = Array.from(m.container.querySelectorAll('h2')).find(h => /^Current (Champion|Player|Fighter)$/.test((h.textContent ?? '').trim()));
  const name = h2?.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('no current name on the live chain');
  return name;
}

export interface ChainRow {
  slug: string;
  path: string;
  page: ReactElement;
  dailyButton: RegExp;
  /** Register this row's fixtures; called on every mount. */
  fixtures(): void;
  /** Add one valid link to the live chain and wait for it to land. */
  addLink(m: MountedPage): Promise<void>;
}

export function chainDriver(row: ChainRow): DailyReloadDriver<MountedPage> {
  const { slug, path, page, dailyButton } = row;

  const enterDaily = async (m: MountedPage) => {
    const daily = findButton(m.container, dailyButton);
    if (daily) { await click(daily); return; }
    if (gameOverCard(m)) return;
    throw new Error(`${slug} shows neither the mode menu nor a finished chain`);
  };

  const finish = async (m: MountedPage) => {
    if (liveScore(m) === 0) await row.addLink(m);
    await click(button(m.container, /^Give Up$/));
    await waitFor(() => { if (!gameOverCard(m)) throw new Error('the chain has not ended'); });
  };

  return {
    slug,
    keyPrefix: `${slug}-daily-`,
    restoreStyle: 'handler',
    restoreFile: `src/hooks/${slug === 'nascar-chain' ? 'useNascarChain' : slug === 'tennis-chain' ? 'useTennisChain' : 'useUfcChain'}.ts`,
    finishedSetter: 'setGameState(saved)',

    async mount() {
      row.fixtures();
      const m = mountPage(page, path);
      await waitFor(() => {
        if (!findButton(m.container, dailyButton)) throw new Error('the mode menu has not come up');
      });
      return m;
    },

    enterDaily,
    /* Round 674 fix: a free run, for the free play line check (./driver). */
    ...unlimitedGiveUp(status),
    finish,
    status,

    /* One link in, then a reload has to come back on the same name with the
       same score. */
    playSome: m => row.addLink(m),
    progress(m) {
      if (status(m) !== 'playing') throw new Error('no live chain');
      return `Score: ${liveScore(m)}\n${currentName(m)}`;
    },

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

/** The two network validated chains: the stubbed search box offers one
 *  name, and the edge function says it beat whoever is current.
 *  Round 645 part three, second fix: the name is a real champion the sport's
 *  validator can hand back (`pick`, read from the bundled list and never a
 *  starter), because a part played chain naming anyone else is refused on
 *  the way back. */
export function networkChain(slug: string, path: string, page: ReactElement, fn: string, guessField: string, currentField: string, pick: () => string): ChainRow {
  let PICK = '';
  return {
    slug,
    path,
    page,
    dailyButton: /Daily Challenge/,
    fixtures() {
      PICK = pick();
      setPoolFixture('autocomplete', [{ key: PICK.toLowerCase(), name: PICK, rawName: PICK, meta: {}, matchRank: 0, prominence: 1 }]);
      setFunctionFixture(fn, (body: Record<string, string>) => ({
        valid: true,
        fullName: body[guessField],
        connection: `Beat ${body[currentField]} in the fixture final`,
      }));
    },
    async addLink(m) {
      const before = currentName(m);
      await click(await waitFor(() => button(m.container, new RegExp(`^pick ${PICK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))));
      await waitFor(() => { if (currentName(m) === before) throw new Error('the link has not landed'); });
    },
  };
}
