/**
 * /guess-tennis-player, Group A of the daily reload round (Round 428).
 *
 * The clue hook family: src/hooks/useTennisPlayer.ts keeps the whole game
 * in useState<TennisPlayerState | null>(null), startGame('daily') resolves
 * today's player, and the board renders the mode menu whenever that state
 * is null. Before the fix nothing was written to storage, so a refresh
 * dealt the same daily again from clue one and every replay recorded and
 * paid the score again. After the fix the daily branch of startGame
 * restores today's record (marking the restore first) and an effect keeps
 * the record current while the daily is played.
 *
 * The pool is remote (tennis_players) and mocked here with eight invented
 * players, shipped nowhere. tennis_daily has no row for today in the
 * fixture, so the hook takes its own fallback pick, which this driver
 * mirrors to type the answer.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { setTableFixture } from './mocks';
import { getTodayET } from '@/lib/dateUtils';
import GuessTennisPlayer from '@/pages/GuessTennisPlayer';

const ROWS = Array.from({ length: 8 }, (_, i) => ({
  id: `fixture-racket-${i + 1}`,
  player_name: `Fixture Racket ${i + 1}`,
  common_names: [`Racket ${i + 1}`],
  vibe_word: `Vibe word ${i + 1}`,
  nationality_era_hint: `Era hint ${i + 1}`,
  tour_hint: `Tour hint ${i + 1}`,
  slam_count_hint: `Slam count hint ${i + 1}`,
  slam_detail_hint: `Slam detail hint ${i + 1}`,
  famous_moment_hint: `Famous moment hint ${i + 1}`,
}));

const SEARCH = 'input[aria-label="Search tennis players"]';

/* The hook's fallback when tennis_daily has no row for today:
   allPlayers[parseInt(YYYYMMDD) % allPlayers.length] over the id ordered pool. */
function dailyAnswer(): string {
  const seed = parseInt(getTodayET().replace(/-/g, ''), 10);
  return ROWS[seed % ROWS.length].player_name;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* The finished card is the div holding the outcome line. */
function resultCard(m: MountedPage): HTMLElement | null {
  const line = Array.from(m.container.querySelectorAll('p')).find(p => /^Guessed in \d+ clue|^It was /.test((p.textContent ?? '').trim()));
  return line?.parentElement ?? null;
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (m.container.querySelector(SEARCH)) return 'playing';
  throw new Error('guess-tennis-player shows neither a board nor a finished card (mode menu, loading or error state)');
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
  const hit = findButton(m.container, new RegExp(`${escapeRe(name)}$`));
  if (!hit) throw new Error(`no suggestion offered for ${name}`);
  await click(hit);
}

export default defineDriver<MountedPage>({
  slug: 'guess-tennis-player',
  keyPrefix: 'guess-tennis-player-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/hooks/useTennisPlayer.ts',
  finishedSetter: 'setGameState(saved)',

  async mount() {
    setTableFixture('tennis_players', ROWS);
    const m = mountPage(<GuessTennisPlayer />, '/guess-tennis-player');
    await waitFor(() => {
      const daily = findButton(m.container, /Daily Challenge/);
      if (!daily || daily.disabled) throw new Error('the Daily Challenge button is not ready');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* Every clue as revealed on the finished board, then the outcome lines
     (the name and the clue count with the score, or the answer and the
     consolation). The share row is left out: it is the same buttons on
     every outcome. */
  fingerprint(m) {
    const clues = Array.from(m.container.querySelectorAll('div.space-y-3 > div > p')).map(p => (p.textContent ?? '').trim());
    const card = resultCard(m);
    const lines = card ? Array.from(card.children).filter(el => el.tagName === 'P').map(el => (el.textContent ?? '').trim()) : ['no finished card'];
    return [...clues, ...lines].join('\n');
  },

  /* A finished daily offers no search box, no hint and no give up; the only
     things left to try are a Play Again if one is offered, and the Daily
     entry if that lands on the menu. If a live board ever appears, play it
     to the end, because that is the replay that would re-pay the score. */
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
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new player|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
