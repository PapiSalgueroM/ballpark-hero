/**
 * /guess-soccer-club, Group A of the daily reload round (Round 428).
 *
 * The clue hook family: src/hooks/useGuessSoccerClub.ts keeps the classic
 * game in useState<GuessSoccerClubState | null>(null), startGame('daily')
 * takes dailyIndex over its pool, and the board renders the mode menu
 * whenever that state is null. Before the fix nothing was written to
 * storage, so a refresh dealt the same club again from clue one and every
 * replay recorded and paid the score again; the result card also offered
 * Play Again on the daily. After the fix the daily branch of startGame
 * restores today's record (marking the restore first), an effect keeps the
 * record current, and the daily's result card offers no replay.
 *
 * The pool is fetched from soccer_club_puzzles, which the shared Supabase
 * stub answers with nothing, so the hook keeps its bundled fallback pool;
 * the driver takes the same dailyIndex pick over that pool. The notable
 * players enrichment reads player_market_values, also empty here.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { dailyIndex, getTodayET } from '@/lib/dateUtils';
import { soccerClubPuzzles } from '@/data/soccerClubPuzzles';
import GuessSoccerClub from '@/pages/GuessSoccerClub';

const SEARCH = 'input[placeholder="Type a club name…"]';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function dailyAnswer(): string {
  return soccerClubPuzzles[dailyIndex(getTodayET(), soccerClubPuzzles.length)].fullName;
}

/* The finished card is the div holding the outcome headline. */
function resultCard(m: MountedPage): HTMLElement | null {
  const headline = Array.from(m.container.querySelectorAll('h2')).find(h => /Correct!|Game Over/.test(h.textContent ?? ''));
  return headline?.parentElement ?? null;
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (m.container.querySelector(SEARCH)) return 'playing';
  throw new Error('guess-soccer-club shows neither a board nor a finished card (mode menu, loading or the question round)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, /Daily Challenge/));
  await waitFor(() => { status(m); });
}

async function finish(m: MountedPage): Promise<void> {
  const input = m.container.querySelector(SEARCH);
  if (!input) throw new Error('no search box on the daily board');
  const name = dailyAnswer();
  await typeInto(input, name);
  const hit = findButton(m.container, new RegExp(`^${escapeRe(name)}$`));
  if (!hit) throw new Error(`no suggestion offered for ${name}`);
  await click(hit);
}

export default defineDriver<MountedPage>({
  slug: 'guess-soccer-club',
  keyPrefix: 'guess-soccer-club-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/hooks/useGuessSoccerClub.ts',
  finishedSetter: 'setGameState(saved)',

  async mount() {
    const m = mountPage(<GuessSoccerClub />, '/guess-soccer-club');
    await waitFor(() => {
      if (!findButton(m.container, /Daily Challenge/)) throw new Error('the mode menu has not come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* Every clue as revealed on the finished board (the club name is the
     last one), then the card's headline, score line and fun fact. The
     share row is left out: it is the same buttons on every outcome. */
  fingerprint(m) {
    const clues = Array.from(m.container.querySelectorAll('div.space-y-2.mb-8 p.leading-snug')).map(p => (p.textContent ?? '').trim());
    const card = resultCard(m);
    const lines = card ? Array.from(card.children).map(el => (el.textContent ?? '').trim()) : ['no finished card'];
    return [...clues, ...lines].join('\n');
  },

  /* A finished daily offers no search box and no give up; the only things
     left to try are a Play Again if one is offered, and the Daily entry if
     that lands on the menu. If a live board ever appears, play it to the
     end, because that is the replay that would re-pay the score. */
  async replay(m) {
    const again = findButton(m.container, /play again/i);
    if (again) await click(again);
    if (findButton(m.container, /Daily Challenge/)) await enterDaily(m);
    const box = m.container.querySelector(SEARCH);
    if (box) await finish(m);
  },

  /* The card and the buttons under it share one wrapper. */
  hasDailyReplayControl(m) {
    const wrapper = resultCard(m)?.parentElement;
    if (!wrapper) return false;
    return Array.from(wrapper.querySelectorAll('button')).some(b => /play again|new club|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
