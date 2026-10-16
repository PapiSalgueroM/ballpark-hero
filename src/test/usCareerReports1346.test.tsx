/* Round 1346: the player reports of 2026-10-16 on the real US career board, all four sports.
 *
 * (2) A coach retires from coaching behind the shared confirm: Keep coaching and Escape save nothing, Retire saves
 *     the same save with only coach.done set, the done screen shows, a remount lands on it without a write, and the
 *     retirement screen's card reviews the finished career instead of offering the sideline back; a second click
 *     right after the retirement opens no tile.
 * (3) An old coach save written before `done` existed mounts as an active career and is not rewritten on load.
 * (Undo) The showcase Skip can be undone until Draft day, back to the byte, on the real board; never after a graded
 *     approach; and a second tap right after the undo is never taken as a graded approach. (The cases (1), (4) and (5) of the brief were the age rule and the dirty money desk, both cut.)
 *
 * The saves are the board's own bytes from scripts/data/usBoardFixture.json (its `coach` save per sport), mounted on
 * the shared board with no Hall bound, the way that fixture was recorded, so every byte compared is one this board
 * wrote. Nothing here reaches the network.
 */
import fs from 'node:fs';
import path from 'node:path';
import { StrictMode, type ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
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
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { createUsCareerProspect, type UsCareerProspect } from '@/lib/usCareerProspect';
import { preDraftChoose, preDraftPlaySeason, preDraftShowcase, preDraftStart } from '@/lib/careerPreDraft';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import { SETTLE_MS } from '@/hooks/useTapSettle';

interface Saved { c: Record<string, unknown>; phase: string; coach: Record<string, unknown> | null; [k: string]: unknown }
const FIXTURE = path.resolve(process.cwd(), 'scripts/data/usBoardFixture.json');
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as { sports: Record<string, { saves: Record<string, string> }> };
const boards = new Map<UsCareerSport, ComponentType>();
function boardFor(sport: () => UsCareerSport): ComponentType {
  return function Board() {
    const s = sport();
    let B = boards.get(s);
    if (!B) {
      const bound: UsCareerSport = { ...s, hall: undefined };
      B = function NoHallBoard() { return <MemoryRouter><UsCareerBoard sport={bound} /></MemoryRouter>; };
      boards.set(s, B);
    }
    return <B />;
  };
}
const SPORTS: [string, string, ComponentType][] = [
  ['nfl', 'nfl-my-career-save-v1', boardFor(() => NFL_CAREER_SPORT)],
  ['nba', 'nba-my-career-save-v1', boardFor(() => NBA_CAREER_SPORT)],
  ['mlb', 'mlb-my-career-save-v1', boardFor(() => MLB_CAREER_SPORT)],
  ['nhl', 'nhl-my-career-save-v1', boardFor(() => NHL_CAREER_SPORT)],
];
const coachSave = (slug: string) => fixture.sports[slug].saves.coach;
const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as Saved;
const flush = () => act(async () => { await Promise.resolve(); });
const noDialog = () => waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
/** useTapSettle's window on a clock the test moves: the real performance.now plus a skew that `pass` adds to. */
function settleClock() {
  const real = performance.now.bind(performance);
  let skew = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => real() + skew);
  return { pass: () => { skew += SETTLE_MS; } };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Round 1346: retire from coaching on the real board', () => {
  it.each(SPORTS)('%s: Keep coaching and Escape save nothing, Retire saves only done, and a reload stays retired', async (slug, key, Board) => {
    const bytes = coachSave(slug), before = JSON.parse(bytes) as Saved;
    expect(before.phase).toBe('coach'); expect(before.coach?.done).toBe(false);
    localStorage.setItem(key, bytes);
    const view = render(<Board />); await flush();
    expect(localStorage.getItem(key)).toBe(bytes);
    const opener = view.getByRole('button', { name: 'Retire from coaching' });
    fireEvent.click(opener);
    let dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep coaching' })); await noDialog();
    expect(localStorage.getItem(key)).toBe(bytes);
    fireEvent.click(opener);
    dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.keyDown(dialog, { key: 'Escape' }); await noDialog();
    expect(localStorage.getItem(key)).toBe(bytes);
    fireEvent.click(opener);
    dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retire from coaching' })); await flush(); await noDialog();
    const after = read(key);
    expect(after).toEqual({ ...before, coach: { ...before.coach, done: true } });
    expect(view.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Retire from coaching' })).toBeNull();
    expect(view.queryByRole('button', { name: /^(Coach|Sit out) the \d+ season$/ })).toBeNull();
    const retiredBytes = localStorage.getItem(key);
    view.unmount();
    const again = render(<Board />); await flush();
    expect(again.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(localStorage.getItem(key)).toBe(retiredBytes);
    fireEvent.click(again.getByRole('button', { name: /Back to the playing career/ })); await flush();
    expect(again.queryByRole('button', { name: 'Back to the sideline' })).toBeNull();
    fireEvent.click(again.getByRole('button', { name: 'Review coaching career' })); await flush();
    expect(again.getByRole('heading', { name: 'Coaching career complete' })).toBeInTheDocument();
    expect(read(key).coach).toEqual({ ...before.coach, done: true });
  });

  /* The review saw the second click of a double click on the confirm open the Coaching Log, which slid under the
     pointer as the hub shrank. For a second after the retirement the tiles and the way back ignore a click. */
  it.each(SPORTS)('%s: a second click right after the retirement opens nothing on the done hub', async (slug, key, Board) => {
    const clock = settleClock();
    localStorage.setItem(key, coachSave(slug));
    const view = render(<Board />); await flush();
    fireEvent.click(view.getByRole('button', { name: 'Retire from coaching' }));
    const dialog = within(document.body).getByRole('alertdialog', { name: 'Retire from coaching?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retire from coaching' })); await flush(); await noDialog();
    const done = () => view.queryByRole('heading', { name: 'Coaching career complete' });
    expect(done()).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: /Coaching Log/ })); await flush();
    fireEvent.click(view.getByRole('button', { name: /Back to the playing career/ })); await flush();
    expect(done()).not.toBeNull();
    expect(view.queryByRole('button', { name: 'Review coaching career' })).toBeNull();
    clock.pass();
    fireEvent.click(view.getByRole('button', { name: /Coaching Log/ })); await flush();
    expect(done()).toBeNull();
  });

  it.each(SPORTS)('%s: an old coach save with no done mounts as an active career and is not rewritten', async (slug, key, Board) => {
    const old = JSON.parse(coachSave(slug)) as Saved;
    delete (old.coach as { done?: boolean }).done;
    const bytes = JSON.stringify(old);
    localStorage.setItem(key, bytes);
    const view = render(<Board />); await flush();
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(view.getByRole('button', { name: 'Retire from coaching' })).toBeInTheDocument();
    expect(view.queryByRole('heading', { name: 'Coaching career complete' })).toBeNull();
    expect(view.getAllByRole('button', { name: /^(Coach|Sit out) the \d+ season$/ }).length).toBe(1);
  });
});

/* The second report ("i accidentl ckilicke3d skipp"): the showcase Skip, the one Skip on these pages that costs the
   career something, can be taken back until Draft day. The save before the showcase is the board's own write (the
   last season or card is pressed on the board), so "back to the byte" compares two writes of the same board. */
const PROSPECTS: [string, ComponentType, UsCareerSport][] = [
  ['nfl', NflMyCareerBoard, NFL_CAREER_SPORT], ['nba', NbaMyCareerBoard, NBA_CAREER_SPORT],
  ['mlb', MlbMyCareerBoard, MLB_CAREER_SPORT], ['nhl', NhlMyCareerBoard, NHL_CAREER_SPORT],
];
function beforeShowcase(sport: UsCareerSport): UsCareerProspect {
  const pos = sport.create.defaultPos;
  const p = createUsCareerProspect(sport, { name: 'Simulated Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: defaultAppearance(), seed: `${sport.slug}:r1346` });
  const desc = sport.preDraft(p.eraId);
  let state = preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 12; n++) {
    const next = state.phase === 'season' ? preDraftPlaySeason(desc, state) : preDraftChoose(desc, state, 0);
    if (next.phase === 'showcase') break;
    state = next;
  }
  expect(state.phase === 'season' || state.phase === 'choice').toBe(true);
  return { ...p, state };
}
const journeyOf = (view: ReturnType<typeof render>) => view.container.querySelector<HTMLElement>('[data-prospect-journey]')!;
const phaseOf = (view: ReturnType<typeof render>) => journeyOf(view).getAttribute('data-prospect-phase');
const mountProspect = (Board: ComponentType) => render(<StrictMode><Board /></StrictMode>);
async function atShowcase(Board: ComponentType, sport: UsCareerSport) {
  const p = beforeShowcase(sport);
  localStorage.setItem(sport.saveKey, JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: p }));
  const view = mountProspect(Board), j = within(journeyOf(view));
  fireEvent.click(p.state!.phase === 'season'
    ? j.getByRole('button', { name: /Play (your first|the next) season/ })
    : within(j.getByTestId('pre-draft-choice')).getAllByRole('button')[0]);
  await flush();
  expect(phaseOf(view)).toBe('showcase');
  return { view, bytes: localStorage.getItem(sport.saveKey)! };
}

describe('Round 1346: the showcase Skip can be undone until Draft day', () => {
  it.each(PROSPECTS)('%s: Undo skip puts the save back to the byte, survives a reload, and is gone after Draft day', async (_, Board, sport) => {
    const first = await atShowcase(Board, sport), bytes = first.bytes;
    let view = first.view;
    const j = () => within(journeyOf(view));
    expect(j().queryByRole('button', { name: 'Undo skip' })).toBeNull();
    fireEvent.click(j().getByRole('button', { name: /^Skip it/ })); await flush();
    expect(phaseOf(view)).toBe('draft');
    const skipped = localStorage.getItem(sport.saveKey);
    expect(skipped).not.toBe(bytes);
    view.unmount(); view = mountProspect(Board); await flush();
    expect(localStorage.getItem(sport.saveKey)).toBe(skipped);
    fireEvent.click(j().getByRole('button', { name: 'Undo skip' })); await flush();
    expect(phaseOf(view)).toBe('showcase');
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    expect(j().queryByRole('button', { name: 'Undo skip' })).toBeNull();
    fireEvent.click(j().getByRole('button', { name: /^Skip it/ })); await flush();
    expect(localStorage.getItem(sport.saveKey)).toBe(skipped);
    fireEvent.click(j().getByRole('button', { name: 'Draft day' })); await flush();
    expect(phaseOf(view)).toBe('done');
    expect(j().queryByRole('button', { name: 'Undo skip' })).toBeNull();
    const drafted = localStorage.getItem(sport.saveKey);
    view.unmount(); view = mountProspect(Board); await flush();
    expect(phaseOf(view)).toBe('done');
    expect(j().queryByRole('button', { name: 'Undo skip' })).toBeNull();
    expect(localStorage.getItem(sport.saveKey)).toBe(drafted);
  });

  it.each(PROSPECTS)('%s: a graded showcase is never offered an undo', async (_, Board, sport) => {
    for (const approach of [/^Go all out/, /^Play it safe/]) {
      const { view } = await atShowcase(Board, sport);
      fireEvent.click(within(journeyOf(view)).getByRole('button', { name: approach })); await flush();
      expect(phaseOf(view)).toBe('draft');
      expect(within(journeyOf(view)).queryByRole('button', { name: 'Undo skip' })).toBeNull();
      view.unmount(); localStorage.clear();
    }
  });

  /* The review found a double tap on Undo skip pressing Go all out, which took the undo's place: a graded showcase
     with no way back. For a second after the undo the two graded approaches ignore a tap; then they work. */
  it.each(PROSPECTS)('%s: a second tap right after Undo skip is never taken as a graded showcase', async (_, Board, sport) => {
    const clock = settleClock();
    const { view, bytes } = await atShowcase(Board, sport);
    const j = () => within(journeyOf(view));
    fireEvent.click(j().getByRole('button', { name: /^Skip it/ })); await flush();
    fireEvent.click(j().getByRole('button', { name: 'Undo skip' })); await flush();
    expect(phaseOf(view)).toBe('showcase');
    for (const approach of [/^Go all out/, /^Play it safe/]) {
      fireEvent.click(j().getByRole('button', { name: approach })); await flush();
      expect(phaseOf(view)).toBe('showcase');
      expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    }
    clock.pass();
    fireEvent.click(j().getByRole('button', { name: /^Go all out/ })); await flush();
    expect(phaseOf(view)).toBe('draft');
    expect(j().queryByRole('button', { name: 'Undo skip' })).toBeNull();
  });
});

/* Draft night skipped by accident can be watched again, in the mount that played it. Nothing is saved: the night
   never was. Under reduced motion the night starts on its last frame and there is nothing to watch again. */
function atDraftDay(sport: UsCareerSport): UsCareerProspect {
  const p = beforeShowcase(sport), desc = sport.preDraft(p.eraId);
  const s = p.state!.phase === 'season' ? preDraftPlaySeason(desc, p.state!) : preDraftChoose(desc, p.state!, 0);
  return { ...p, state: preDraftShowcase(desc, s, 'skip') };
}
/** The night is a lazy chunk the journey asks for at the draft step. */
async function nightLoaded() {
  for (let n = 0; n < 3; n++) await act(async () => { await import('@/components/career/DraftNightSequence'); await Promise.resolve(); });
}
const nightIn = (view: ReturnType<typeof render>) => journeyOf(view).querySelector<HTMLElement>('[data-career-night]');

describe('Round 1346: draft night can be watched again', () => {
  it.each(PROSPECTS)('%s: Skip to the end, then Watch it again plays the night again and saves nothing', async (_, Board, sport) => {
    const clock = settleClock();
    localStorage.setItem(sport.saveKey, JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: atDraftDay(sport) }));
    const view = mountProspect(Board), j = () => within(journeyOf(view));
    await nightLoaded();
    fireEvent.click(j().getByRole('button', { name: 'Draft day' })); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'live');
    expect(j().queryByRole('button', { name: 'Watch it again' })).toBeNull();
    fireEvent.click(j().getByRole('button', { name: 'Skip to the end' }));
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'skipped');
    const bytes = localStorage.getItem(sport.saveKey);
    clock.pass();
    fireEvent.click(j().getByRole('button', { name: 'Watch it again' })); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'live');
    for (const row of nightIn(view)!.querySelectorAll<HTMLElement>('[data-night-row]')) expect(row.className).toMatch(/cm-(tick-in|slam|rise)/);
    expect(journeyOf(view).querySelector('[data-night-hold]')).not.toBeNull();
    expect(j().getByTestId('draft-result')).toHaveAttribute('aria-hidden', 'true');
    expect(journeyOf(view).querySelector('h3.sr-only')).toHaveFocus();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
    clock.pass();
    fireEvent.click(j().getByRole('button', { name: 'Skip to the end' }));
    expect(j().getByRole('button', { name: 'Watch it again' })).toBeEnabled();
    expect(localStorage.getItem(sport.saveKey)).toBe(bytes);
  });

  /* The review found the two halves of one cell taking a double tap: Skip to the end then Watch it again started the
     night over, and the reverse ended the replay at once. Each now ignores a tap for a second after the other. */
  it.each(PROSPECTS)('%s: a second tap on the night\'s shared button does nothing for a second', async (_, Board, sport) => {
    const clock = settleClock();
    localStorage.setItem(sport.saveKey, JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: atDraftDay(sport) }));
    const view = mountProspect(Board), j = () => within(journeyOf(view));
    await nightLoaded();
    fireEvent.click(j().getByRole('button', { name: 'Draft day' })); await flush();
    fireEvent.click(j().getByRole('button', { name: 'Skip to the end' })); await flush();
    fireEvent.click(j().getByRole('button', { name: 'Watch it again' })); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'skipped');
    clock.pass();
    fireEvent.click(j().getByRole('button', { name: 'Watch it again' })); await flush();
    fireEvent.click(j().getByRole('button', { name: 'Skip to the end' })); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'live');
    clock.pass();
    fireEvent.click(j().getByRole('button', { name: 'Skip to the end' })); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'skipped');
  });

  /* After a night that landed on its own the result's hold and the stage's are already on, so only a remount starts
     them again: without the card's and the stage's nightRun keys the pick would stay in sight during the replay. */
  it.each(PROSPECTS)('%s: Watch it again after a night that landed remounts the result and the stage', async (_, Board, sport) => {
    localStorage.setItem(sport.saveKey, JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: atDraftDay(sport) }));
    const view = mountProspect(Board), j = () => within(journeyOf(view));
    await nightLoaded();
    fireEvent.click(j().getByRole('button', { name: 'Draft day' })); await flush();
    const rows = nightIn(view)!.querySelectorAll<HTMLElement>('[data-night-row]');
    fireEvent.animationEnd(rows[rows.length - 1]); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'landed');
    const result = j().getByTestId('draft-result'), stage = journeyOf(view).querySelector('[data-night-hold]');
    expect(stage).not.toBeNull();
    fireEvent.click(j().getByRole('button', { name: 'Watch it again' })); await flush();
    expect(nightIn(view)).toHaveAttribute('data-night-stage', 'live');
    expect(j().getByTestId('draft-result')).not.toBe(result);
    expect(j().getByTestId('draft-result')).toHaveAttribute('aria-hidden', 'true');
    expect(journeyOf(view).querySelector('[data-night-hold]')).not.toBe(stage);
  });

  it.each(PROSPECTS)('%s: under reduced motion the night ends on its last frame with nothing to watch again', async (_, Board, sport) => {
    const real = window.matchMedia;
    window.matchMedia = ((q: string) => ({ ...real(q), matches: /reduce/.test(q) })) as typeof window.matchMedia;
    try {
      localStorage.setItem(sport.saveKey, JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: atDraftDay(sport) }));
      const view = mountProspect(Board), j = within(journeyOf(view));
      await nightLoaded();
      fireEvent.click(j.getByRole('button', { name: 'Draft day' })); await flush();
      expect(nightIn(view)).toHaveAttribute('data-night-stage', 'skipped');
      expect(j.queryByRole('button', { name: 'Watch it again' })).toBeNull();
    } finally { window.matchMedia = real; }
  });
});
