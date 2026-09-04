/**
 * /guess-the-nation for scripts/simDailyReload.mjs.
 *
 * The countries come from the guess_nation_countries table, answered here by
 * a fixture of eight invented nations (shipped nowhere). The daily puzzle is
 * countries[parseInt(YYYYMMDD) % countries.length] in the order the query
 * returns them, the same arithmetic the hook uses, so this driver knows the
 * answer before it plays. Shortest honest path: one hint, then the answer,
 * which leaves "You scored 1100 points!" on the card and exercises
 * revealedClues on the way back from storage (a restore that fell back to
 * the fresh default of 1 would read 1200 and fail the fingerprint).
 *
 * The finished card keeps a button back to the mode menu (the menu is the
 * only way to Unlimited, Summer, Winter and the continents), so replay()
 * takes it, presses Daily Challenge again, and plays any live board it
 * finds to the end.
 */
import './mocks';
import { waitFor } from '@testing-library/react';
import { defineDriver } from './driver';
import { button, click, findButton, mountPage, typeInto, type MountedPage } from './harness';
import { setTableFixture } from './mocks';
import { getTodayET } from '@/lib/dateUtils';
import GuessTheNation from '@/pages/GuessTheNation';

const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
const ROWS = NAMES.map((n, i) => ({
  id: `probe-${i + 1}`,
  country_name: `Probe Nation ${n}`,
  common_names: [`PN ${n}`],
  flag_emoji: '🏳️',
  continent: 'Oceania',
  difficulty: i % 2 === 0 ? 'easy' : 'hard',
  season_focus: 'both',
  vibe_word: `Vibe ${n}`,
  continent_hint: 'Somewhere in the fixture ocean',
  population_hint: `About ${i + 1} million`,
  games_attended_hint: `${10 + i} Games`,
  total_medals_hint: `${20 + i} medals`,
  best_sport_hint: 'Rowing',
  famous_moment_hint: `A famous fixture moment ${i + 1}`,
  winter_history_hint: 'No winter medals',
  gold_medal_hint: `${i} golds`,
  flag_colors_hint: 'Blue and white',
  country_size_hint: 'Small',
  iconic_moment: `Iconic fixture moment ${n}`,
}));

const SEARCH = 'input[placeholder="Type a country name..."]';

function todaysNation(): string {
  const seed = parseInt(getTodayET().replace(/-/g, ''), 10);
  return ROWS[seed % ROWS.length].country_name;
}

function resultCard(m: MountedPage): Element | null {
  return m.container.querySelector('[role="status"]');
}

function status(m: MountedPage): 'playing' | 'finished' {
  if (resultCard(m)) return 'finished';
  if (m.container.querySelector(SEARCH)) return 'playing';
  throw new Error('guess-the-nation shows neither a board nor a result card (loading, mode menu or error state)');
}

async function enterDaily(m: MountedPage): Promise<void> {
  await click(button(m.container, /Daily Challenge/));
}

/* A suggestion button carries the flag slot (which for an invented nation
   is the name itself) and then the name, so it is matched by inclusion; the
   full name is typed, so only that nation is offered. */
async function guess(m: MountedPage, name: string): Promise<void> {
  const input = m.container.querySelector(SEARCH);
  if (!input) throw new Error('no search box to guess into');
  await typeInto(input, name);
  const suggestion = Array.from(m.container.querySelectorAll('button')).find(b => (b.textContent ?? '').includes(name));
  if (!suggestion) throw new Error(`no suggestion offered for ${name}`);
  await click(suggestion);
}

async function finish(m: MountedPage): Promise<void> {
  await click(button(m.container, /^💡 Hint/));
  await guess(m, todaysNation());
}

export default defineDriver<MountedPage>({
  slug: 'guess-the-nation',
  keyPrefix: 'guess-the-nation-daily-',
  restoreStyle: 'handler',
  restoreFile: 'src/hooks/useGuessTheNation.ts',
  finishedSetter: 'setGameState(saved)',

  async mount() {
    setTableFixture('guess_nation_countries', ROWS);
    const m = mountPage(<GuessTheNation />, '/guess-the-nation');
    await waitFor(() => {
      if (!findButton(m.container, /Daily Challenge/)) throw new Error('the mode menu has not come up');
    });
    return m;
  },

  enterDaily,
  finish,
  status,

  /* The headline, the score sentence, the fun fact and the one line grid.
     The share row and the button back to the menu are left out. */
  fingerprint(m) {
    const card = resultCard(m);
    if (!card) return '';
    return Array.from(card.querySelectorAll(':scope > h2, :scope > p, :scope > div[aria-hidden="true"]'))
      .map(el => (el.textContent ?? '').trim())
      .join('\n');
  },

  async replay(m) {
    if (m.container.querySelector(SEARCH)) await finish(m);
    const back = findButton(m.container, /^(Back to modes|Play Again)$/);
    if (back) await click(back);
    const daily = findButton(m.container, /Daily Challenge/);
    if (daily) {
      await click(daily);
      if (status(m) === 'playing') await finish(m);
    }
  },

  hasDailyReplayControl(m) {
    const card = resultCard(m);
    if (!card) return false;
    return Array.from(card.querySelectorAll('button')).some(b => /play again|new (nation|puzzle)|reset/i.test(b.textContent ?? ''));
  },

  unmount(m) {
    m.unmount();
  },
});
