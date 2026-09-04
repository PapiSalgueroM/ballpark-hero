/**
 * /gauntlet-draft, Group C of the Round 428 plan.
 *
 * The page owns a phase machine (boot, setup, drafting, running, done) and
 * a finished daily is restored inside start('daily'), a click handler that
 * runs after mount, so the restore has to call markRestoredFinish(SLUG)
 * right before setPhase('done') or every re-entry records the run again.
 * A refresh lands on the mode menu by design (the Perfect Season shape);
 * Daily gauntlet reopens the locked result.
 *
 * The pool is the bundled fallback pool (src/data/players.ts, the same
 * real players scripts/simGauntletDraft.mjs plays), dealt by today's
 * deterministic seed. finish() keeps the first card of every pick, the
 * star of each deal, then runs the cup under fake timers: the reveal is a
 * second a match plus a beat, up to six seconds on a run that reaches the
 * final, which is longer than vitest gives one test.
 */
import './mocks';
import { vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { setPoolFixture } from './mocks';
import { players } from '@/data/players';
import GauntletDraft from '@/pages/GauntletDraft';

/* A dealt card reads as rating, position, name, club: "88STErling Haaland...". */
const CARD = /^\d{2,3}(GK|CB|LB|RB|LWB|RWB|CDM|CM|CAM|LM|RM|LW|RW|CF|ST)/;

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}

function cards(m: MountedPage): HTMLButtonElement[] {
  return Array.from(m.container.querySelectorAll('button')).filter(b => CARD.test((b.textContent ?? '').trim()));
}

function cupRunning(m: MountedPage): boolean {
  return Array.from(m.container.querySelectorAll('p')).some(p => /The gauntlet · your XI rates/.test(p.textContent ?? ''));
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (cards(m).length > 0 || cupRunning(m)) return 'playing';
  throw new Error('gauntlet-draft shows neither a draft board nor a result card (mode menu, boot or error state)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, /^Daily gauntlet/));
}

async function finish(m: MountedPage): Promise<void> {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'], shouldAdvanceTime: true });
  try {
    for (let pick = 0; pick < 12 && cards(m).length > 0; pick++) {
      await click(cards(m)[0]);
    }
    if (!cupRunning(m)) throw new Error('eleven picks did not start the cup');
    /* One match a second, then a beat before the result card. */
    for (let tick = 0; tick < 8 && !resultCard(m); tick++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
  } finally {
    vi.useRealTimers();
  }
  if (!resultCard(m)) throw new Error('the cup never reached its result card');
}

/* Everything on the card but the buttons: headline, rounds survived, score,
   the emoji grid and the match by match list. */
function fingerprint(m: MountedPage): string {
  const card = resultCard(m);
  if (!card) return 'no result card';
  const copy = card.cloneNode(true) as Element;
  copy.querySelectorAll('button').forEach(b => b.remove());
  return (copy.textContent ?? '').trim();
}

export default defineDriver<MountedPage>({
  slug: 'gauntlet-draft',
  keyPrefix: 'gauntlet-draft-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/pages/GauntletDraft.tsx',
  finishedSetter: "setPhase('done')",

  async mount() {
    setPoolFixture('squad', players);
    const m = mountPage(<GauntletDraft />, '/gauntlet-draft');
    await waitFor(() => {
      if (!findButton(m.container, /^Daily gauntlet/)) throw new Error('the mode menu has not come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,
  fingerprint,

  /* The card's own button leads back to the mode menu; Daily gauntlet from
     there is the only way back at today's draft. A live board at any point
     is drafted to the end, because that is the replay that would re-pay
     the score. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
    const card = resultCard(m);
    const cta = card ? card.querySelector('button.bg-primary') : null;
    if (cta) await click(cta);
    await enterDaily(m);
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /new draft|play again|redraft|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
