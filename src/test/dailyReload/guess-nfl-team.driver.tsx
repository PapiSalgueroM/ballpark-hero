/**
 * /guess-nfl-team, Group A of the daily reload round (Round 428).
 *
 * The clue hook family: src/hooks/useGuessNflTeam.ts keeps the whole game
 * in useState<GuessNflTeamState | null>(null), startGame('daily') takes
 * the bundled pick getDailyNflTeamPuzzle(), and the board renders the mode
 * selector whenever that state is null. Before the fix nothing was written
 * to storage, so a refresh dealt the same team again from clue one and
 * every replay recorded and paid the score again; the result card also
 * offered Play Again on the daily. After the fix the daily branch of
 * startGame restores today's record (marking the restore first), an effect
 * keeps the record current, and the daily's result card offers no replay.
 *
 * The pool is bundled, so no fixture is needed: the driver types the same
 * deterministic pick the hook makes.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { getDailyNflTeamPuzzle } from '@/data/nflTeamPuzzles';
import GuessNflTeam from '@/pages/GuessNflTeam';

const SEARCH = 'input[placeholder="Search for a team..."]';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function resultCard(m: MountedPage): HTMLElement | null {
  return m.container.querySelector('[role="status"]');
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (m.container.querySelector(SEARCH)) return 'playing';
  throw new Error('guess-nfl-team shows neither a board nor a result card (mode selector or an unknown state)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, /Daily Challenge/));
  await waitFor(() => { status(m); });
}

async function finish(m: MountedPage): Promise<void> {
  const input = m.container.querySelector(SEARCH);
  if (!input) throw new Error('no search box on the daily board');
  const name = getDailyNflTeamPuzzle().fullName;
  await typeInto(input, name);
  const hit = findButton(m.container, new RegExp(`^${escapeRe(name)}$`));
  if (!hit) throw new Error(`no suggestion offered for ${name}`);
  await click(hit);
}

export default defineDriver<MountedPage>({
  slug: 'guess-nfl-team',
  keyPrefix: 'guess-nfl-team-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/hooks/useGuessNflTeam.ts',
  finishedSetter: 'setGameState({ ...saved, difficulty })',

  async mount() {
    const m = mountPage(<GuessNflTeam />, '/guess-nfl-team');
    await waitFor(() => {
      if (!findButton(m.container, /Daily Challenge/)) throw new Error('the mode selector has not come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* Every clue as revealed on the finished board, then the result card's
     headline, stat line, fun fact and emoji grid. The share row is left
     out: it is the same buttons on every outcome. */
  fingerprint(m) {
    const clues = Array.from(m.container.querySelectorAll('div.space-y-2.mb-8 p.text-foreground')).map(p => (p.textContent ?? '').trim());
    const card = resultCard(m);
    if (!card) return [...clues, 'no result card'].join('\n');
    const headline = card.querySelector('h2')?.textContent ?? '';
    const lines = Array.from(card.children).filter(el => el.tagName === 'P').map(el => (el.textContent ?? '').trim());
    const grid = Array.from(card.querySelectorAll('div')).find(d => d.className.includes('font-mono'))?.textContent ?? '';
    return [...clues, headline, ...lines, grid].join('\n');
  },

  /* A finished daily offers no search box, no skip and no give up; the only
     things left to try are a Play Again if one is offered, and the Daily
     entry if that lands on the selector. If a live board ever appears,
     play it to the end, because that is the replay that would re-pay the
     score. */
  async replay(m) {
    const again = findButton(m.container, /play again/i);
    if (again) await click(again);
    if (findButton(m.container, /Daily Challenge/)) await enterDaily(m);
    const box = m.container.querySelector(SEARCH);
    if (box) await finish(m);
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new team|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
