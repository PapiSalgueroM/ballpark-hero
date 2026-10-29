// Round 1569: the player reports of 2026-10-26 on the shared US career board, in all four sports.
// A: Start over is on every screen and reaches the draft screen in two taps, clearing only that career.
// B: an extension talk with no offer says why, tells the truth about a last season and lets a veteran retire;
//    the market lets a veteran retire too, and the retirement is the full one (the retired card).
import { type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within, waitFor, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Fixture player' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import { recordCompletion } from '@/lib/completions';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';

const SENTINEL_KEY = 'reports-1569-unrelated';
const SENTINEL = 'an unrelated save that must survive';
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
interface Row { label: string; slug: string; sport: UsCareerSport; Board: ComponentType; pos: string; lastAge: number }
/* lastAge: the age at which the sport's own retire rule ends the career after the next season (one under its cap). */
const ROWS: Row[] = [
  { label: 'NFL', slug: 'nfl-my-career', sport: NFL_CAREER_SPORT, Board: NflMyCareerBoard, pos: 'QB', lastAge: 39 },
  { label: 'NBA', slug: 'nba-my-career', sport: NBA_CAREER_SPORT, Board: NbaMyCareerBoard, pos: 'PG', lastAge: 40 },
  { label: 'MLB', slug: 'mlb-my-career', sport: MLB_CAREER_SPORT, Board: MlbMyCareerBoard, pos: 'CF', lastAge: 41 },
  { label: 'NHL', slug: 'nhl-my-career', sport: NHL_CAREER_SPORT, Board: NhlMyCareerBoard, pos: 'C', lastAge: 39 },
];
type Edit = (c: Record<string, unknown> & { seasons: unknown[] }, save: Record<string, unknown>) => void;
/** A career made with the binding's own calls on a seeded stream, six seasons in, then edited. */
function seed(row: Row, seasons = 6, edit?: Edit) {
  const rng = seededRandom(1569), S = row.sport;
  const c = S.startCareer('Report Fixture', row.pos, S.create.archetypes[row.pos][0], rng, null as never, 'now');
  S.assignRole(c, 80, rng);
  for (let i = 0; i < seasons; i++) { S.simSeason(c, 80, rng); S.progress(c, rng); }
  c.retired = false;
  delete c.pendingRivalryEvent; delete c.pendingRivalryChoice; delete c.summer;
  const save: Record<string, unknown> = { c, phase: 'season', teamQuality: 80, coach: null };
  edit?.(c as never, save);
  localStorage.setItem(S.saveKey, JSON.stringify(save));
  localStorage.setItem(SENTINEL_KEY, SENTINEL);
}
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const click = async (el: HTMLElement) => { fireEvent.click(el); await flush(); };
async function answerTalk(view: RenderResult) {
  /* The retirement talk's card is a lazy chunk: the first sport to show it waits for it to load. */
  await waitFor(() => expect(view.queryByRole('button', { name: /One more year|^Play the \d+ season$/ })).not.toBeNull(), { timeout: 20000 });
  const more = view.queryByRole('button', { name: /One more year/ });
  if (more) await click(more);
}
async function play(view: RenderResult) {
  await answerTalk(view);
  await click(view.getByRole('button', { name: /^Play the \d+ season$/ }));
}
/** The whole of A's rule: one tap opens the confirmation, the second starts over, and only this career goes. */
async function startOver(view: RenderResult, row: Row) {
  await click(view.getByRole('button', { name: 'Start over' }));
  const dialog = within(document.body).getByRole('alertdialog', { name: 'Start a new career?' });
  await click(within(dialog).getByRole('button', { name: 'Start new career' }));
  await waitFor(() => expect(view.getByRole('button', { name: 'Enter the draft' })).toBeEnabled());
  expect(localStorage.getItem(row.sport.saveKey)).toBeNull();
  expect(localStorage.getItem(SENTINEL_KEY)).toBe(SENTINEL);
  expect(recordCompletion).not.toHaveBeenCalled();
  expect(view.queryByRole('button', { name: 'Start over' })).toBeNull();
}

beforeEach(() => {
  localStorage.clear(); vi.mocked(recordCompletion).mockClear();
  for (const row of ROWS) consumeRestoredFinish(row.slug);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const row of ROWS) consumeRestoredFinish(row.slug); });

describe('Round 1569 report A: Start over from every screen', () => {
  it.each(ROWS)('$label starts over from the hub of a two season career', async row => {
    seed(row, 2); const view = render(<row.Board />); await flush();
    expect(view.queryByRole('button', { name: 'Hang them up now' })).toBeNull();
    await startOver(view, row);
  });
  it.each(ROWS)('$label starts over from the free agency window', async row => {
    seed(row, 6, c => { c.contractYears = 0; }); const view = render(<row.Board />); await flush();
    await play(view); expect(document.querySelector('[data-fa-window]')).not.toBeNull();
    await startOver(view, row);
  });
  it.each(ROWS)('$label starts over from the extension talk', async row => {
    seed(row, 6, c => { c.contractYears = 1; }); const view = render(<row.Board />); await flush();
    await play(view); expect(document.querySelector('[data-extension-talk]')).not.toBeNull();
    await startOver(view, row);
  });
  it.each(ROWS)('$label starts over from the retired card and from the coaching career', async row => {
    seed(row, 6, (c, save) => { c.retired = true; save.phase = 'retired'; }); const view = render(<row.Board />); await flush();
    expect(view.getByRole('button', { name: 'New career' })).toBeEnabled();
    await click(view.getByRole('button', { name: /Go after a coaching job/ }));
    expect(view.queryByRole('button', { name: 'Review seasons' })).toBeNull();
    await startOver(view, row);
  });
  it.each(ROWS)('$label starts over from the road to the draft', async row => {
    localStorage.setItem(SENTINEL_KEY, SENTINEL);
    const view = render(<row.Board />); await flush();
    expect(view.queryByRole('button', { name: 'Start over' })).toBeNull();
    await click(view.getByRole('button', { name: 'Play your road to the draft' }));
    expect(document.querySelector('[data-career-prospect-entry]')).toBeNull();
    await startOver(view, row);
  });
});

describe('Round 1569 report B: no offer is never a dead end', () => {
  it.each(ROWS)('$label: a no offer talk in the last season says why, says it is the last, and retires in full', async row => {
    seed(row, 6, c => { c.contractYears = 1; c.age = row.lastAge; c.ovr = 70; }); const view = render(<row.Board />); await flush();
    await play(view);
    const why = document.querySelector('[data-extension-why]');
    expect(why?.textContent).toMatch(/^No offer, and here is why: at \d+ you are \d+ years? past the age/);
    expect(why?.textContent).toMatch(/The open market prices you around \$[\d.]+M a year\.$/);
    expect(document.querySelector('[data-extension-talk]')?.textContent).toMatch(/of your career whatever happens, so no market opens after it/);
    expect(document.querySelector('[data-extension-talk]')?.textContent).not.toMatch(/reach free agency/);
    expect(view.getByRole('button', { name: 'Play the year out' })).toBeEnabled();
    await click(view.getByRole('button', { name: 'Retire now' }));
    const dialog = within(document.body).getByRole('alertdialog', { name: 'Retire this player?' });
    await click(within(dialog).getByRole('button', { name: 'Retire this player' }));
    await waitFor(() => expect(view.getByRole('button', { name: 'Review seasons' })).toBeEnabled());
    const saved = JSON.parse(localStorage.getItem(row.sport.saveKey)!);
    expect(saved.c.retired).toBe(true); expect(saved.phase).toBe('retired'); expect(saved.contractTalk ?? null).toBeNull();
  });
  it.each(ROWS)('$label: a no offer talk with seasons left keeps the market promise and still offers retirement', async row => {
    seed(row, 6, c => { c.contractYears = 1; c.age = 35; c.ovr = 70; }); const view = render(<row.Board />); await flush();
    await play(view);
    expect(document.querySelector('[data-extension-why]')?.textContent).toMatch(/^No offer, and here is why: /);
    expect(document.querySelector('[data-extension-talk]')?.textContent).toMatch(/reach free agency/);
    expect(view.getByRole('button', { name: 'Retire now' })).toBeEnabled();
  });
  it.each(ROWS)('$label: free agency offers a veteran Retire instead, and a two season player none', async row => {
    seed(row, 6, c => { c.contractYears = 0; }); const view = render(<row.Board />); await flush();
    await play(view); expect(view.getByRole('button', { name: 'Retire instead' })).toBeEnabled();
    cleanup(); localStorage.clear();
    seed(row, 2, c => { c.contractYears = 0; }); const young = render(<row.Board />); await flush();
    await play(young); expect(document.querySelector('[data-fa-window]')).not.toBeNull();
    expect(young.queryByRole('button', { name: 'Retire instead' })).toBeNull();
  });
});
