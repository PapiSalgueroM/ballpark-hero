/**
 * /football-timeline for scripts/simDailyReload.mjs.
 *
 * Round 645 part three. The page opens on today's five players (no mode
 * menu, no unlimited), shuffled, with up and down arrows and a Lock In
 * Order button; locking in scores the order against the draft years and
 * shows the shared result card. The shortest honest path is to lock the
 * order as dealt. The how to play dialog opens on a first visit (its own
 * localStorage flag, cleared with everything else at the start of a row) in
 * a portal beside the page, and gates nothing under test.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, resultCard, resultText, type MountedPage } from './harness';
import FootballTimeline from '@/pages/FootballTimeline';

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m.container)) return 'finished';
  if (findButton(m.container, /^Lock In Order$/)) return 'playing';
  throw new Error('football timeline shows neither the list nor the result card');
}

async function finish(m: MountedPage): Promise<void> {
  await click(button(m.container, /^Lock In Order$/));
}

export default defineDriver<MountedPage>({
  slug: 'football-timeline',
  keyPrefix: 'football-timeline-daily-',
  restoreStyle: 'initializer',

  async mount() {
    const m = mountPage(<FootballTimeline />, '/football-timeline');
    await waitFor(() => { status(m); });
    return m;
  },

  async enterDaily() {
    /* the page opens on the daily */
  },

  finish,
  status,

  /* The result card (headline, stat line, emoji grid) and every row of the
     locked order with its name and draft year. */
  fingerprint(m) {
    const card = resultCard(m.container);
    if (!card) return 'no result card';
    const names = Array.from(m.container.querySelectorAll('p.font-bold')).map(p => (p.textContent ?? '').trim());
    const years = Array.from(m.container.querySelectorAll('span')).map(s => (s.textContent ?? '').trim()).filter(t => /^(19|20)\d\d$/.test(t));
    return [resultText(card), ...names, ...years].join('\n');
  },

  /* A finished daily offers no control at all, so a live list is the only
     replay path: lock it in and let assertion 4 count the second record. */
  async replay(m) {
    if (status(m) === 'playing') await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m.container);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new puzzle|reset|try again/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
