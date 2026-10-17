/* Round 1500: the dirty money desk on the real US career board, all four sports.
 *
 * (4) A playing save holding 9.5M of dirty money with every washer of its own shop owned reads the honest sentence
 *     and offers "Deal with it"; the desk prints each way's numbers, one tap only picks a way (a second tap inside
 *     the settle does nothing), Back and Keep it quiet save nothing, and Come clean, Do it saves exactly the shared
 *     rule's change (dirty money 0, the 1.0M fine, heat 55 to 50, karma +3) with its line on screen and in the feed.
 *     With one washer unowned the old sentence is there byte for byte, and the desk still is.
 * (5) The desk is never shown on a save with no dirty money, and a save with dirty money mounts without a write.
 * (6) The desk is offered in a playing season only: a contract talk or free agency save holding dirty money shows the
 *     heat meter and no "Deal with it" (simUsDirtyMoney's control anyphase drops the guard and needs this red).
 *
 * The saves are the board's own bytes from scripts/data/usBoardFixture.json (its `dirty` save per sport, 2.5M at
 * heat 55, recorded before this round), with only the dirty money, the heat and the washers set, mounted the way that
 * fixture was recorded. scripts/simUsDirtyMoney.mjs section 6 runs this file with the desk or the sentence taken out
 * and needs it red. Nothing here reaches the network.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Tester' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

import UsCareerBoard from '@/components/us-career/UsCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import type { UsCareerSport } from '@/lib/usCareerSport';
import { DIRTY_SENTENCE_NO_WASHERS, washerIds, type DirtyMoneyHost } from '@/lib/careerDirtyMoney';
import { dealWithDirtyMoney, previewDirty } from '@/lib/careerDirtyMoneyDesk';
import { SETTLE_MS } from '@/hooks/useTapSettle';

interface Saved { c: DirtyMoneyHost & { purchased?: string[] }; phase: string; [k: string]: unknown }
const FIXTURE = path.resolve(process.cwd(), 'scripts/data/usBoardFixture.json');
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as { sports: Record<string, { saves: Record<string, string> }> };
function boardFor(sport: UsCareerSport): ComponentType {
  const bound: UsCareerSport = { ...sport, hall: undefined };
  return function Board() { return <MemoryRouter><UsCareerBoard sport={bound} /></MemoryRouter>; };
}
const SPORTS: [string, string, UsCareerSport, ComponentType][] = [
  ['nfl', 'nfl-my-career-save-v1', NFL_CAREER_SPORT, boardFor(NFL_CAREER_SPORT)],
  ['nba', 'nba-my-career-save-v1', NBA_CAREER_SPORT, boardFor(NBA_CAREER_SPORT)],
  ['mlb', 'mlb-my-career-save-v1', MLB_CAREER_SPORT, boardFor(MLB_CAREER_SPORT)],
  ['nhl', 'nhl-my-career-save-v1', NHL_CAREER_SPORT, boardFor(NHL_CAREER_SPORT)],
];
const OLD_SENTENCE = 'Wash it in the Shady aisle or it keeps burning.';
const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as Saved;
const flush = () => act(async () => { await Promise.resolve(); });
/** The fixture's dirty save with the money, the heat and the washers this case needs. */
function dirtySave(slug: string, sport: UsCareerSport, o: { dirty: number; washersOwned: number }): string {
  const save = JSON.parse(fixture.sports[slug].saves.dirty) as Saved;
  expect(save.phase).toBe('season');
  expect(save.c.retired).toBe(false);
  const washers = washerIds(sport.shopItems);
  expect(washers).toHaveLength(3);
  save.c.dirtyMoney = o.dirty;
  save.c.heat = 55;
  save.c.purchased = [...(save.c.purchased ?? []), ...washers.slice(0, o.washersOwned)];
  return JSON.stringify(save);
}
/** useTapSettle's window on a clock the test moves. */
function settleClock() {
  const real = performance.now.bind(performance);
  let skew = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => real() + skew);
  return { pass: () => { skew += SETTLE_MS; } };
}
const deskButton = (root: HTMLElement) => root.querySelector('[data-dirty-money-desk] button');

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Round 1500: deal with dirty money on the real board', () => {
  it.each(SPORTS)('%s: every washer owned, the desk previews, holds a second tap, and Come clean saves exactly the rule', async (slug, key, sport, Board) => {
    const clock = settleClock();
    const bytes = dirtySave(slug, sport, { dirty: 9.5, washersOwned: 3 });
    const before = JSON.parse(bytes) as Saved;
    localStorage.setItem(key, bytes);
    const view = render(<Board />); await flush();
    expect(localStorage.getItem(key), 'no write on load').toBe(bytes);
    expect(view.container.textContent).toContain(`$9.5M unexplained. ${DIRTY_SENTENCE_NO_WASHERS}`);
    expect(view.container.textContent).not.toContain(OLD_SENTENCE);
    const opener = deskButton(view.container);
    expect(opener?.textContent).toBe('Deal with it');
    fireEvent.click(opener as Element);
    const clean = await view.findByRole('button', { name: /^\S+ Come clean/ });
    for (const name of [/^\S+ Give it away/, /^\S+ Keep it quiet/, /^\S+ Wash it/]) expect(view.getByRole('button', { name })).toBeInTheDocument();
    const p = previewDirty(before.c, 'clean');
    expect(p.lines[0]).toBe('Pay back all 9.5M plus a 1.0M fine');
    expect(p.lines.slice(1, 3)).toEqual(['Heat -5', 'Karma +3']);
    expect(clean.textContent).toContain(p.lines.join(''));

    /* Wash it previews its whole percent, and Back saves nothing. */
    fireEvent.click(view.getByRole('button', { name: /^\S+ Wash it/ }));
    const wash = previewDirty(before.c, 'wash');
    expect(wash.caughtPct).toBe(41);
    expect(view.container.textContent).toContain('41 percent chance you are caught');
    fireEvent.click(view.getByRole('button', { name: 'Back' }));
    expect(localStorage.getItem(key)).toBe(bytes);

    /* Keep it quiet closes the desk and saves nothing. */
    clock.pass();
    fireEvent.click(view.getByRole('button', { name: /^\S+ Keep it quiet/ }));
    clock.pass();
    fireEvent.click(view.getByRole('button', { name: 'Keep it' })); await flush();
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(deskButton(view.container)?.textContent).toBe('Deal with it');

    /* Come clean: a second tap inside the settle is not "Do it"; after it, Do it saves the rule's change. */
    fireEvent.click(deskButton(view.container) as Element);
    fireEvent.click(await view.findByRole('button', { name: /^\S+ Come clean/ }));
    fireEvent.click(view.getByRole('button', { name: 'Do it' })); await flush();
    expect(localStorage.getItem(key), 'a double tap never spends the money').toBe(bytes);
    clock.pass();
    fireEvent.click(view.getByRole('button', { name: 'Do it' })); await flush();
    const after = read(key);
    const rule = dealWithDirtyMoney(before.c, 'clean');
    expect(after).toEqual({ ...before, c: rule.state });
    expect([after.c.dirtyMoney, after.c.heat, after.c.karma]).toEqual([0, 50, (before.c.karma ?? 50) + 3]);
    expect(after.c.netWorth).toBe(Math.round(((before.c.netWorth ?? 0) - 1) * 10) / 10);
    expect(rule.line).toBe('You came clean and paid back 9.5M plus a 1.0M fine. Heat -5, karma +3.');
    expect(view.container.textContent).toContain(rule.line);
    fireEvent.click(view.getByRole('button', { name: 'Back to your career' })); await flush();
    expect(deskButton(view.container)).toBeNull();
    expect(view.container.textContent).not.toContain('unexplained');
    expect(localStorage.getItem(key)).toBe(JSON.stringify(after));
  });

  it.each(SPORTS)('%s: with one washer unowned the old sentence stands byte for byte, beside the desk', async (slug, key, sport, Board) => {
    localStorage.setItem(key, dirtySave(slug, sport, { dirty: 9.5, washersOwned: 2 }));
    const view = render(<Board />); await flush();
    expect(view.container.textContent).toContain(`$9.5M unexplained. ${OLD_SENTENCE}`);
    expect(view.container.textContent).not.toContain(DIRTY_SENTENCE_NO_WASHERS);
    expect(deskButton(view.container)?.textContent).toBe('Deal with it');
  });

  it.each(SPORTS)('%s: no dirty money, no desk; the recorded dirty save mounts without a write and offers it', async (slug, key, sport, Board) => {
    const none = dirtySave(slug, sport, { dirty: 0, washersOwned: 0 });
    localStorage.setItem(key, none);
    let view = render(<Board />); await flush();
    expect(view.container.textContent, 'the heat meter is still there').toContain(sport.heatTitle);
    expect(deskButton(view.container)).toBeNull();
    view.unmount();
    localStorage.clear();
    const recorded = fixture.sports[slug].saves.dirty;
    localStorage.setItem(key, recorded);
    view = render(<Board />); await flush();
    expect(localStorage.getItem(key)).toBe(recorded);
    expect(deskButton(view.container)?.textContent).toBe('Deal with it');
    await waitFor(() => expect(view.container.textContent).toContain(OLD_SENTENCE));
  });

  /* Advice 17's guard (the Round 1500 review's run minor 1): the heat meter is drawn in every phase, the desk only
     in a playing season. The fixture's contract talk and free agency saves come back in those phases on load. */
  it.each(SPORTS)('%s: outside a playing season the desk is not offered, over a contract talk or free agency', async (slug, key, sport, Board) => {
    for (const [name, marker] of [['extTalk', '[data-extension-talk]'], ['faTalk', '[data-fa-window]']] as const) {
      const save = JSON.parse(fixture.sports[slug].saves[name]) as Saved;
      expect(save.c.retired, `${name}: a playing career`).toBe(false);
      save.c.dirtyMoney = 9.5;
      save.c.heat = 55;
      localStorage.setItem(key, JSON.stringify(save));
      const view = render(<Board />); await flush();
      await waitFor(() => expect(view.container.querySelector(marker), `${name}: the screen it was saved on is up`).not.toBeNull());
      expect(view.container.textContent, `${name}: the heat meter is there`).toContain('$9.5M unexplained');
      expect(deskButton(view.container), `${name}: no Deal with it outside a season`).toBeNull();
      view.unmount();
      localStorage.clear();
    }
  });
});
