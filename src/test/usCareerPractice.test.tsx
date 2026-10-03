import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import NflMyCareerBoard from '@/components/nfl-my-career/NflMyCareerBoard';
import NbaMyCareerBoard from '@/components/nba-my-career/NbaMyCareerBoard';
import MlbMyCareerBoard from '@/components/mlb-my-career/MlbMyCareerBoard';
import NhlMyCareerBoard from '@/components/nhl-my-career/NhlMyCareerBoard';
import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import type { UsCareerCore, UsCareerSport } from '@/lib/usCareerSport';

vi.mock('@/lib/completions', () => ({ recordCompletion: vi.fn(), recordActivity: vi.fn(), getCurrentPlayerName: () => 'Practice fixture' }));
vi.mock('@/lib/badges', () => ({ getNewlyEarnedBadges: () => Promise.resolve([]) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, profile: null, refreshProfile: () => undefined }) }));
vi.mock('sonner', () => ({ toast: { success: () => undefined } }));

interface SportCase { label: string; Board: ComponentType; sport: UsCareerSport; burst: RegExp; drill: string }
const SPORTS: SportCase[] = [
  { label: 'NFL', Board: NflMyCareerBoard, sport: NFL_CAREER_SPORT, burst: /The 40/, drill: 'forty' },
  { label: 'NBA', Board: NbaMyCareerBoard, sport: NBA_CAREER_SPORT, burst: /Lane Agility/, drill: 'lane' },
  { label: 'MLB', Board: MlbMyCareerBoard, sport: MLB_CAREER_SPORT, burst: /Home to First/, drill: 'first' },
  { label: 'NHL', Board: NhlMyCareerBoard, sport: NHL_CAREER_SPORT, burst: /Blue Line Sprint/, drill: 'sprint' },
];
type Save = { c: UsCareerCore; phase: string; teamQuality: number; coach: null };
function seed(row: SportCase, changes: Partial<UsCareerCore> = {}): Save {
  const sport = row.sport, pos = sport.create.defaultPos;
  const c: UsCareerCore = sport.startCareer('Simulated Practice Player', pos, sport.create.archetypes[pos][0], () => 0.4, defaultAppearance(), 'now');
  Object.assign(c, { ovr: 70, pot: 90, health: 100, contractYears: 3, role: 'starter', ...changes });
  const save: Save = { c, phase: c.retired ? 'retired' : 'season', teamQuality: 75, coach: null };
  localStorage.setItem(sport.saveKey, JSON.stringify(save));
  localStorage.setItem('unrelated-practice-fixture', 'keep this save');
  return save;
}
const saved = (row: SportCase): Save => JSON.parse(localStorage.getItem(row.sport.saveKey)!);
const mount = (row: SportCase) => render(<StrictMode><row.Board /></StrictMode>);
async function open(view: ReturnType<typeof render>) {
  const card = view.getByRole('region', { name: 'Season practice' });
  fireEvent.click(within(card).getByRole('button', { name: 'Start practice' }));
  /* Round 988: the dialog sits behind a lazy screen and an async drill load,
     and a loaded machine needs more than findByRole's default second for the
     first one (measured 1.3 to 2.4 s on this tree and on main 3da2d38f). */
  await view.findByRole('button', { name: 'Practice rules' }, { timeout: 10000 });
  return view.getByRole('dialog');
}
function playBurst(dialog: HTMLElement, row: SportCase, taps = 25) {
  fireEvent.click(within(dialog).getByRole('button', { name: row.burst }));
  vi.useFakeTimers();
  fireEvent.click(within(dialog).getByRole('button', { name: /Tap to start/ }));
  const floor = within(dialog).getByRole('button', { name: /GO GO GO/ });
  for (let i = 0; i < taps; i++) fireEvent.click(floor);
  act(() => { vi.advanceTimersByTime(5000); });
  vi.useRealTimers();
  expect(dialog.querySelector('[data-training-score]')).toHaveTextContent(String(Math.round(taps * 3.2)));
}
function bank(dialog: HTMLElement) {
  const button = within(dialog).getByRole('button', { name: 'Bank the session' });
  act(() => { fireEvent.click(button); fireEvent.click(button); });
}
function close(dialog: HTMLElement) { fireEvent.click(within(dialog).getByRole('button', { name: 'Back to your career' })); }

/* Round 988: these tests mount whole career boards in jsdom, and the one
   that plays a season took 4.7 to 6.8 s on main 3da2d38f on a loaded
   machine against the default 5, timing out without one assertion failing.
   Thirty seconds a test; open() below waits ten for the practice dialog, so
   a dialog that never comes is still an assertion failure, not a timeout.
   No assertion changed. */
vi.setConfig({ testTimeout: 30000 });

/* Round 988: warm the two lazy imports a practice open waits on (the
   practice screen, and each sport's drills) before any test opens one.
   Cold, they are transformed on first use, which on a loaded machine takes
   longer than the one second findByRole waits: whichever sport opens first
   (the NFL, by table order) failed to find "Practice rules", and the same
   open passed later in the run. Measured on this tree and on main 3da2d38f
   (no deck C): the first six to ten opens failed on both. Nothing the tests
   assert changes. */
beforeAll(async () => {
  await import('@/components/us-career/UsCareerPractice');
  await Promise.all(SPORTS.map(row => row.sport.loadTraining(row.sport.create.defaultPos)));
}, 120000);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(Math, 'random').mockReturnValue(0.4);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('US career practice on the actual boards', () => {
  it.each(SPORTS)('$label quiet legacy restore preserves the existing career unchanged', row => {
    const before = seed(row), bytes = localStorage.getItem(row.sport.saveKey);
    const first = mount(row);
    expect(first.getByRole('button', { name: /^Play the \d+ season$/ })).toBeEnabled();
    expect(saved(row)).toEqual(before);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    first.unmount();
    const again = mount(row);
    expect(again.getByRole('button', { name: /^Play the \d+ season$/ })).toBeEnabled();
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    expect(localStorage.getItem('unrelated-practice-fixture')).toBe('keep this save');
  });

  it.each(SPORTS)('$label banks played skill into the real save once and survives reload', async row => {
    const before = seed(row), bytes = localStorage.getItem(row.sport.saveKey);
    const view = mount(row), dialog = await open(view);
    expect(dialog.querySelector('[data-practice-rules]')).toHaveTextContent('Example: an 80 score at 74 OVR with a 75 ceiling earns +1');
    playBurst(dialog, row);
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    bank(dialog);
    expect(saved(row)).toEqual({ ...before, c: { ...before.c, ovr: 72, practice: { year: before.c.year, drill: row.drill, score: 80, before: 70, ovr: 72, tier: 2, gain: 2 } } });
    expect(writes.mock.calls.filter(([key]) => key === row.sport.saveKey)).toHaveLength(1);
    expect(within(dialog).getByRole('status')).toHaveTextContent('Rating +2. OVR 70 to 72.');
    close(dialog);
    const card = view.getByRole('region', { name: 'Season practice' });
    expect(card).toHaveTextContent(`Session banked for ${before.c.year}`);
    expect(within(card).getByRole('button', { name: 'View practice' })).toHaveFocus();
    const banked = localStorage.getItem(row.sport.saveKey);
    view.unmount();
    const reloaded = mount(row);
    fireEvent.click(reloaded.getByRole('button', { name: 'View practice' }));
    await reloaded.findByText('Already trained this season');
    const locked = reloaded.getByRole('dialog');
    expect(locked).toHaveTextContent('Already trained this season');
    expect(within(locked).queryByRole('button', { name: row.burst })).toBeNull();
    expect(localStorage.getItem(row.sport.saveKey)).toBe(banked);
    expect(localStorage.getItem('unrelated-practice-fixture')).toBe('keep this save');
  });

  it.each(SPORTS)('$label zero and solid scores bank only the rating earned', async row => {
    for (const tier of [{ taps: 0, gain: 0, note: 'No gains this time' }, { taps: 16, gain: 1, note: 'Rating +1.' }]) {
      const before = seed(row);
      const view = mount(row), dialog = await open(view);
      playBurst(dialog, row, tier.taps); bank(dialog);
      expect(saved(row).c.ovr).toBe(before.c.ovr + tier.gain);
      expect(saved(row).c.practice?.gain).toBe(tier.gain);
      expect(saved(row).c.practice?.year).toBe(before.c.year);
      expect(within(dialog).getByRole('status')).toHaveTextContent(tier.note);
      close(dialog);
      expect(view.getByRole('button', { name: 'View practice' })).toBeEnabled();
      view.unmount();
    }
  });

  for (const scenario of [
    { name: 'ceiling pays only the available headroom', taps: 25, ovr: 74, pot: 75, after: 75, gain: 1, note: 'Rating +1, and that is your ceiling.' },
    { name: 'old above-ceiling rating is never reduced', taps: 25, ovr: 82, pot: 80, after: 82, gain: 0, note: 'already at your ceiling' },
  ]) {
    it.each(SPORTS)(`$label ${scenario.name}`, async row => {
      seed(row, { ovr: scenario.ovr, pot: scenario.pot });
      const view = mount(row), dialog = await open(view);
      playBurst(dialog, row, scenario.taps);
      bank(dialog);
      expect(saved(row).c.ovr).toBe(scenario.after);
      expect(saved(row).c.practice?.gain).toBe(scenario.gain);
      expect(saved(row).c.practice?.year).toBe(saved(row).c.year);
      expect(within(dialog).getByRole('status')).toHaveTextContent(scenario.note);
      close(dialog);
      expect(view.getByRole('button', { name: 'View practice' })).toBeEnabled();
    });
  }

  it.each(SPORTS)('$label abort leaves no save changes and rules reopen during play', async row => {
    seed(row);
    const bytes = localStorage.getItem(row.sport.saveKey), view = mount(row);
    const loading = vi.spyOn(row.sport, 'loadTraining').mockRejectedValue(new Error('Simulated practice download failure'));
    fireEvent.click(view.getByRole('button', { name: 'Start practice' }));
    const retry = await view.findByRole('button', { name: 'Retry practice' });
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    loading.mockRestore();
    fireEvent.click(retry);
    await view.findByRole('button', { name: 'Practice rules' });
    const dialog = view.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: row.burst }));
    expect(dialog.querySelector('[data-practice-rules]')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Practice rules' }));
    expect(dialog.querySelector('[data-practice-rules]')).toHaveTextContent('Banking uses this season');
    vi.useFakeTimers();
    fireEvent.click(within(dialog).getByRole('button', { name: /Tap to start/ }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    act(() => { vi.advanceTimersByTime(6000); });
    vi.useRealTimers();
    expect(localStorage.getItem(row.sport.saveKey)).toBe(bytes);
    expect(view.queryByRole('dialog')).toBeNull();
    expect(view.getByRole('button', { name: 'Start practice' })).toHaveFocus();
    const again = await open(view);
    expect(within(again).getByRole('button', { name: row.burst })).toBeEnabled();
  });

  it.each(SPORTS)('$label earned rating reaches the next real season and practice renews afterwards', async row => {
    const before = seed(row), view = mount(row), dialog = await open(view);
    playBurst(dialog, row); bank(dialog); close(dialog);
    fireEvent.click(view.getByRole('button', { name: /^Play the \d+ season$/ }));
    const progressed = saved(row);
    expect(progressed.c.seasons).toHaveLength(1);
    expect(progressed.c.seasons[0].ovr).toBe(72);
    expect(progressed.c.year).toBe(before.c.year + 1);
    expect(progressed.c.practice?.year).toBe(before.c.year);
    expect(view.queryByRole('button', { name: 'Start practice' })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Continue' }));
    // Resolve the real pending cards before the next practice session is offered.
    for (let n = 0; n < 4 && !view.queryByRole('button', { name: 'Start practice' }); n++) {
      expect(view.queryByRole('button', { name: 'Start practice' })).toBeNull();
      const next = view.queryByRole('button', { name: 'Continue' });
      if (next) { fireEvent.click(next); continue; }
      const rivalry = view.container.querySelector<HTMLElement>('[data-rivalry-choice]');
      if (rivalry) { fireEvent.click(within(rivalry).getAllByRole('button')[0]); continue; }
      const card = view.container.querySelector<HTMLElement>('p.text-center.text-sm.font-bold')?.parentElement;
      expect(card, 'the real crossroads card is the remaining decision').toBeTruthy();
      fireEvent.click(within(card!).getAllByRole('button')[0]);
    }
    expect(view.getByRole('button', { name: 'Start practice' })).toBeEnabled();
    const nextDialog = await open(view);
    playBurst(nextDialog, row); bank(nextDialog);
    expect(saved(row).c.practice?.year).toBe(before.c.year + 1);
  });

  it.each(SPORTS)('$label keeps pending rivalry ahead of practice and resets a finished career cleanly', async row => {
    const pending = { id: 0, emoji: '🏀', title: 'Simulated rival beat', description: 'A fixture decision is waiting.', consequence: 'Resolve this beat first.' };
    seed(row, { pendingRivalryEvent: pending });
    let view = mount(row);
    expect(view.getByText(pending.title)).toBeInTheDocument();
    expect(view.queryByRole('button', { name: 'Start practice' })).toBeNull();
    view.unmount();
    seed(row, { retired: true, practice: { year: 2026, before: 70, ovr: 72, gain: 2, tier: 2, score: 80, drill: row.drill } });
    view = mount(row);
    expect(view.queryByRole('region', { name: 'Season practice' })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'New career' }));
    fireEvent.click(within(view.getByRole('alertdialog')).getByRole('button', { name: 'Start new career' }));
    expect(localStorage.getItem(row.sport.saveKey)).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Enter the draft' }));
    expect(saved(row).c.practice).toBeUndefined();
    expect(view.getByRole('button', { name: 'Start practice' })).toBeEnabled();
  });
});
