/**
 * Shared driver logic for the three Soccer Career drills (Wall Shot, Tackle,
 * Glove Save), one board over the arcade engine. One row file per drill still
 * exists beside this (the test discovers only *.driver.tsx); each names its
 * drill, the career position that deals it and the button that takes its
 * round.
 *
 * Round 645 part three. The drills are the third game on the arcade engine
 * Free Kick and Buzzer Beater share, and the only one that already saved its
 * daily run after every round. Two gaps were left: the round was filed when
 * its flight landed, so a refresh during the flight handed a seen round back,
 * and a resume re-seeded the spray stream from the top, so the rounds after it
 * were sprayed with numbers the player had already watched (and with draws
 * scripts/simCareerDrills.mjs never swept for winnability). The wall shot is
 * the drill that draws from the stream; the fix to the save applies to all
 * three, so all three carry a row (the review of the fix pass found tackle and
 * gloves had none).
 *
 * The board is not a route: it sits in the training panel of a career, so a
 * row mounts it on its own with a minimal career, as the panel does. It banks
 * into the career instead of recording a completion, so every row sets
 * `records: false` and assertion 4 requires that nothing is ever recorded.
 *
 * Freezes the two arcade globals (./arcadeGlobals) and performance.now, which
 * the board reads for the press time: every round is taken at the moment it
 * starts, with the board's opening controls, so two runs are the same run and
 * assertion 6 can compare the split one with the unbroken one.
 */
import { waitFor } from '@testing-library/react';
import { defineDriver, type DailyReloadDriver } from './driver';
import { freezeArcadeGlobals, withFullMotion } from './arcadeGlobals';
import { button, click, findButton, mountPage, type MountedPage } from './harness';
import { DRILL_META, ROUNDS_PER_RUN, type DrillKind } from '@/lib/careerDrills';
import type { CareerState } from '@/lib/soccerCareerEngine';
import DrillBoard from '@/components/soccer-career/DrillBoard';

export type DrillApi = MountedPage & { restore: () => void };

export interface DrillRow {
  kind: DrillKind;
  /** A position drillForPosition deals this drill to. */
  position: string;
  /** The button that takes the round with the board's opening controls. */
  press: RegExp;
}

const ENTRY = /^Today's ten$|^Finish today's ten$|^Today's result$/;

export function drillDriver(row: DrillRow): DailyReloadDriver<DrillApi> {
  const meta = DRILL_META[row.kind];
  const slug = meta.slug;
  /* What the board reads from a career: the position picks the drill, and
     the overall, the ceiling and the earned ceiling size the bank. */
  const career = { position: row.position, overall: 70, potential: 85, potentialEarned: 0 } as unknown as CareerState;
  const cardLine = new RegExp(`^\\d+ of \\d+ ${meta.verb}$`);

  const doneCard = (m: MountedPage): Element | null => {
    const line = Array.from(m.container.querySelectorAll('p')).find(p => cardLine.test((p.textContent ?? '').trim()));
    return line?.parentElement ?? null;
  };

  const roundLine = (m: MountedPage): Element | null =>
    Array.from(m.container.querySelectorAll('span')).find(s => /^Round \d+\/\d+$/.test((s.textContent ?? '').trim())) ?? null;

  const status = (m: MountedPage): 'playing' | 'finished' => {
    if (doneCard(m)) return 'finished';
    if (roundLine(m)) return 'playing';
    throw new Error('the drill shows neither a live round nor a finished session (intro?)');
  };

  /* Take up to `count` rounds, stopping when the session is over: a resumed
     run has fewer than ten left. */
  const take = async (m: MountedPage, count: number): Promise<void> => {
    for (let i = 0; i < count; i += 1) {
      if (doneCard(m)) return;
      await click(await waitFor(() => button(m.container, /^Start$|^Next one$/)));
      await click(await waitFor(() => button(m.container, row.press)));
      await click(await waitFor(() => button(m.container, /^Next$|^See the session$/)));
    }
  };

  const enterDaily = async (m: MountedPage): Promise<void> => {
    const daily = findButton(m.container, ENTRY);
    if (daily) { await click(daily); return; }
    throw new Error('the drill shows no way into today\'s ten');
  };

  return defineDriver<DrillApi>({
    slug,
    keyPrefix: `${slug}-daily-`,
    restoreStyle: 'handler',
    usesRestoreMark: false,
    records: false,

    async mount() {
      const restoreGlobals = freezeArcadeGlobals();
      const realNow = performance.now;
      const frozenNow = () => 1000;
      performance.now = frozenNow;
      const m = mountPage(<DrillBoard career={career} canBank onBank={() => undefined} onBack={() => undefined} />, '/soccer-career');
      await waitFor(() => { if (!findButton(m.container, ENTRY)) throw new Error('the drill intro has not drawn'); });
      return {
        ...m,
        restore: () => {
          restoreGlobals();
          if (performance.now === frozenNow) performance.now = realNow;
        },
      };
    },

    enterDaily,
    finish: m => take(m, ROUNDS_PER_RUN),
    status,

    /* Three rounds, then a reload has to come back on round four with the
       same wins and points. */
    playSome: m => take(m, 3),

    /* Assertion 7: one round taken with the ball (or the tackle, or the dive)
       left in the air, then the refresh. Round 468 filed the round when the
       flight landed, so this is the window it left open. */
    oneStep: m => take(m, 1),
    async interruptStep(m) {
      await click(await waitFor(() => button(m.container, /^Start$|^Next one$/)));
      const press = await waitFor(() => button(m.container, row.press));
      await withFullMotion(() => click(press));
      if (findButton(m.container, /^Next$|^See the session$/)) throw new Error('the round landed before the refresh, so the flight was never interrupted');
    },
    progress(m) {
      const line = roundLine(m);
      if (!line?.parentElement || doneCard(m)) throw new Error('no live round');
      return Array.from(line.parentElement.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).join('\n');
    },

    /* Every line on the session card: the wins, the points and the ceiling
       (and the tackle's fouls), and what it says about banking. */
    fingerprint(m) {
      const card = doneCard(m);
      if (!card) return 'no session card';
      return Array.from(card.querySelectorAll('p')).map(p => (p.textContent ?? '').replace(/\s+/g, ' ').trim()).join('\n');
    },

    /* A finished day's card offers Practice (unlimited, banks nothing) and a
       way back to the intro, where Today's ten must bring back this card. */
    async replay(m) {
      if (status(m) === 'playing') await take(m, ROUNDS_PER_RUN);
      const practice = findButton(m.container, /Practice again/);
      if (practice) await click(practice);
      const back = findButton(m.container, new RegExp(`^‹ ${meta.name}$`));
      if (back) await click(back);
      await enterDaily(m);
      if (status(m) === 'playing') await take(m, ROUNDS_PER_RUN);
    },

    hasDailyReplayControl(m) {
      const card = doneCard(m);
      if (!card) return false;
      return Array.from(card.querySelectorAll('button')).some(b => /today's ten|play again|reset|try again/i.test(b.textContent ?? ''));
    },

    unmount(m) {
      m.unmount();
      m.restore();
    },
  });
}
