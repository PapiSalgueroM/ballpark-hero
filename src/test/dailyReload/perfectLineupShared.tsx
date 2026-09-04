/**
 * Shared driver logic for the three Perfect Lineup routes (NBA, NHL, F1),
 * which render the same GenericLineupBoard over usePerfectLineupGeneric.
 * One row file per route still exists beside this (the test discovers
 * only *.driver.tsx); each hands its page, path and slug in here.
 *
 * The board opens on the daily (mode toggles at the top, no menu): every
 * slot has a + Pick button that opens a Radix dialog listing the eligible
 * players, top rated first, so the driver takes the first option for each
 * slot and presses Simulate. The dialog renders in a portal on
 * document.body, not inside the page container.
 */
import type { ReactElement } from 'react';
import { waitFor } from '@testing-library/react';
import type { DailyReloadDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';

function resultCard(m: MountedPage): Element | null {
  const grade = Array.from(m.container.querySelectorAll('div')).find(d => /^Grade [A-D]\+?$/.test((d.textContent ?? '').trim()));
  return grade?.parentElement ?? null;
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (findButton(m.container, /^Simulate$/)) return 'playing';
  throw new Error('perfect lineup shows neither a picking board nor a result card');
}

function dialogOptions(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('[role="dialog"] button')).filter(b => !/^Close$/.test((b.textContent ?? '').trim())) as HTMLButtonElement[];
}

async function finish(m: MountedPage): Promise<void> {
  for (let guard = 0; guard < 12; guard++) {
    const pick = findButton(m.container, /^\+ Pick$/);
    if (!pick) break;
    await click(pick);
    const option = await waitFor(() => {
      const options = dialogOptions();
      if (options.length === 0) throw new Error('the picker offers no player');
      return options[0];
    });
    await click(option);
    await waitFor(() => {
      if (document.querySelector('[role="dialog"]')) throw new Error('the picker is still open');
    });
  }
  await click(button(m.container, /^Simulate$/));
}

function slotTexts(m: MountedPage): string[] {
  return Array.from(m.container.querySelectorAll('div[class*="w-[150px]"]')).map(d => (d.textContent ?? '').replace(/\s+/g, ' ').trim());
}

export function perfectLineupDriver(slug: string, path: string, page: ReactElement): DailyReloadDriver<MountedPage> {
  return {
    slug,
    keyPrefix: `${slug}-daily-`,
    restoreStyle: 'initializer',

    async mount() {
      const m = mountPage(page, path);
      await waitFor(() => { status(m); });
      return m;
    },

    async enterDaily() {
      /* the board opens on the daily */
    },

    finish,
    status,

    /* The scoreline, the grade, the rating and chemistry row, and every
       slot card with its name and grade square. */
    fingerprint(m) {
      const card = resultCard(m);
      if (!card) return 'no result card';
      const big = card.querySelector('.text-5xl')?.textContent ?? '';
      const grade = Array.from(card.querySelectorAll('div')).find(d => /^Grade /.test((d.textContent ?? '').trim()))?.textContent ?? '';
      const row = Array.from(card.querySelectorAll('div')).find(d => /Rating/.test(d.textContent ?? '') && /Chemistry/.test(d.textContent ?? ''))?.textContent ?? '';
      return [big, grade, row.replace(/\s+/g, ' ').trim(), ...slotTexts(m)].join('\n');
    },

    /* A live board is the replay (the daily came back fresh). Then every
       control that could deal it again: Edit Lineup on the card, the Daily
       toggle, and New Lineup then Daily. Any live board gets played out. */
    async replay(m) {
      if (status(m) === 'playing') await finish(m);
      const edit = findButton(m.container, /^Edit Lineup$/);
      if (edit) {
        await click(edit);
        if (status(m) === 'playing') await finish(m);
      }
      await click(button(m.container, /Daily$/));
      if (status(m) === 'playing') await finish(m);
      await click(button(m.container, /New Lineup$/));
      await click(button(m.container, /Daily$/));
      if (status(m) === 'playing') await finish(m);
    },

    hasDailyReplayControl(m) {
      const card = resultCard(m);
      if (!card) return false;
      return Array.from(card.querySelectorAll('button')).some(b => /edit lineup|play again|new lineup/i.test(b.textContent ?? ''));
    },

    unmount(m) {
      m.unmount();
    },
  };
}
