// Engine-made simulated careers exercise real board persistence and completion wiring.
import { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, within, waitFor } from '@testing-library/react';
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
import USCareerActionConfirm from '@/components/us-career/USCareerActionConfirm';
import { ARCHETYPES, startCareer, nflAssignRole, simSeason, progress, legacyOf } from '@/lib/nflMyCareer';
import { NBA_ARCHETYPES, startNbaCareer, nbaAssignRole, simNbaSeason, nbaProgress, nbaLegacyOf } from '@/lib/nbaMyCareer';
import { MLB_ARCHETYPES, startMlbCareer, mlbAssignRole, simMlbSeason, mlbProgress, mlbLegacyOf } from '@/lib/mlbMyCareer';
import { NHL_ARCHETYPES, startNhlCareer, nhlAssignRole, simNhlSeason, nhlProgress, nhlLegacyOf } from '@/lib/nhlMyCareer';

const SENTINEL_KEY = 'confirmation-fixture-unrelated';
const SENTINEL = 'preserved simulated unrelated save';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
interface CareerLike { name: string; retired: boolean; seasons: unknown[]; year: number }
function build<C extends CareerLike>(make: (rng: () => number) => C, role: (c: C, rng: () => number) => unknown,
  season: (c: C, rng: () => number) => unknown, advance: (c: C, rng: () => number) => unknown, legacy: (c: C) => { score: number }) {
  const rng = seededRandom(643), c = make(rng); role(c, rng);
  for (let i = 0; i < 6; i++) { season(c, rng); advance(c, rng); }
  c.retired = false;
  // Transient rivalry stops are outside this hub-action test, as in the recording fixture.
  delete (c as { pendingRivalryEvent?: unknown }).pendingRivalryEvent;
  delete (c as { pendingRivalryChoice?: unknown }).pendingRivalryChoice;
  return { c, phase: 'season', teamQuality: 80, coach: null, score: legacy(c).score };
}
interface CareerCase { label: string; slug: string; saveKey: string; Board: ComponentType; make: () => ReturnType<typeof build> }
const CASES: CareerCase[] = [
  { label: 'NFL', slug: 'nfl-my-career', saveKey: 'nfl-my-career-save-v1', Board: NflMyCareerBoard,
    make: () => build(r => startCareer('Simulated NFL Fixture', 'QB', ARCHETYPES.QB[0], r), (c, r) => nflAssignRole(c, 80, r), (c, r) => simSeason(c, 80, r), progress, legacyOf) },
  { label: 'NBA', slug: 'nba-my-career', saveKey: 'nba-my-career-save-v1', Board: NbaMyCareerBoard,
    make: () => build(r => startNbaCareer('Simulated NBA Fixture', 'PG', NBA_ARCHETYPES.PG[0], r), (c, r) => nbaAssignRole(c, 80, r), (c, r) => simNbaSeason(c, 80, r), nbaProgress, nbaLegacyOf) },
  { label: 'MLB', slug: 'mlb-my-career', saveKey: 'mlb-my-career-save-v1', Board: MlbMyCareerBoard,
    make: () => build(r => startMlbCareer('Simulated MLB Fixture', 'CF', MLB_ARCHETYPES.CF[0], r), (c, r) => mlbAssignRole(c, 80, r), (c, r) => simMlbSeason(c, 80, r), mlbProgress, mlbLegacyOf) },
  { label: 'NHL', slug: 'nhl-my-career', saveKey: 'nhl-my-career-save-v1', Board: NhlMyCareerBoard,
    make: () => build(r => startNhlCareer('Simulated NHL Fixture', 'C', NHL_ARCHETYPES.C[0], r), (c, r) => nhlAssignRole(c, 80, r), (c, r) => simNhlSeason(c, 80, r), nhlProgress, nhlLegacyOf) },
];
function seed(row: CareerCase, retired = false) {
  const { score, ...saved } = row.make(); saved.c.retired = retired; saved.phase = retired ? 'retired' : 'season';
  localStorage.setItem(row.saveKey, JSON.stringify(saved)); localStorage.setItem(SENTINEL_KEY, SENTINEL);
  return { saved, score, bytes: localStorage.getItem(row.saveKey)! };
}
const flush = () => act(async () => { await Promise.resolve(); });
const confirmName = (action: 'retire' | 'restart') => action === 'retire' ? 'Retire this player' : 'Start new career';
const cancelName = (action: 'retire' | 'restart') => action === 'retire' ? 'Keep playing' : 'Keep this career';
const title = (action: 'retire' | 'restart') => action === 'retire' ? 'Retire this player?' : 'Start a new career?';
function open(opener: HTMLElement, action: 'retire' | 'restart') {
  opener.focus(); fireEvent.click(opener);
  const dialog = within(document.body).getByRole('alertdialog', { name: title(action) });
  expect(dialog).toHaveAccessibleDescription(); return dialog;
}
async function cancel(opener: HTMLElement, action: 'retire' | 'restart', escape = false) {
  const dialog = open(opener, action);
  if (escape) fireEvent.keyDown(dialog, { key: 'Escape' }); else fireEvent.click(within(dialog).getByRole('button', { name: cancelName(action) }));
  await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
}
function assertUntouched(row: CareerCase, bytes: string) {
  expect(localStorage.getItem(row.saveKey)).toBe(bytes); expect(localStorage.getItem(SENTINEL_KEY)).toBe(SENTINEL);
  expect(recordCompletion).not.toHaveBeenCalled();
}
function shared(action: 'retire' | 'restart' = 'retire', accept = vi.fn()) {
  const unrelated = vi.fn();
  const view = render(<StrictMode><button onClick={() => unrelated(7)}>Unrelated fixture action</button>
    <USCareerActionConfirm action={action} sport="NFL" onConfirm={accept}><button>Original fixture action</button></USCareerActionConfirm></StrictMode>);
  return { view, accept, unrelated, opener: view.getByRole('button', { name: 'Original fixture action' }) };
}

beforeEach(() => {
  localStorage.clear(); vi.mocked(recordCompletion).mockClear();
  for (const row of CASES) consumeRestoredFinish(row.slug);
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); for (const row of CASES) consumeRestoredFinish(row.slug); });

describe('US career destructive action confirmation', () => {
  it.each(CASES)('$label preserves live restore and engine state as an independent baseline', async row => {
    const { saved, bytes, score } = seed(row); expect(saved.c.seasons).toHaveLength(6); expect(score).toBeGreaterThan(0);
    const first = render(<row.Board />); expect(first.getByRole('button', { name: /^Play the \d+ season$/ })).toBeEnabled();
    assertUntouched(row, bytes); first.unmount(); const second = render(<row.Board />);
    expect(second.getByText(new RegExp(saved.c.name))).toBeInTheDocument(); expect(second.getByRole('button', { name: 'Hang them up now' })).toBeEnabled();
    assertUntouched(row, bytes); expect(within(document.body).queryByRole('alertdialog')).toBeNull();
  });

  it.each(CASES)('$label keeps retirement pending until explicit acceptance and records its real legacy once', async row => {
    const { saved, bytes, score } = seed(row); const first = render(<row.Board />), opener = first.getByRole('button', { name: 'Hang them up now' });
    let dialog = open(opener, 'retire'); assertUntouched(row, bytes); expect(first.queryByText(`${saved.c.name} retires`)).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep playing' })); await flush(); assertUntouched(row, bytes);
    await cancel(opener, 'retire', true); assertUntouched(row, bytes);
    dialog = open(opener, 'retire'); assertUntouched(row, bytes); fireEvent.click(within(dialog).getByRole('button', { name: confirmName('retire') })); await flush();
    expect(first.getByText(`${saved.c.name} retires`)).toBeInTheDocument();
    const expected = clone(saved); expected.c.retired = true; expected.phase = 'retired';
    /* Round 1039: the retire button writes the last season played as the last (usCareerRetirementFlow manualRetire). */
    (expected.c as CareerLike & { retirement?: unknown }).retirement = { retiredYear: (saved.c.seasons[saved.c.seasons.length - 1] as { year: number }).year };
    /* Round 1051: the save that retires a career stamps the legacy calibration it retired on (usCareerRetirementFlow stampOnRetirement). */
    (expected.c as CareerLike & { hallCal?: unknown }).hallCal = 3; // Round 1301: today's calibration is 3
    expect(JSON.parse(localStorage.getItem(row.saveKey)!)).toEqual(expected); expect(localStorage.getItem(SENTINEL_KEY)).toBe(SENTINEL);
    expect(recordCompletion).toHaveBeenCalledExactlyOnceWith(`/${row.slug}`, score, 'Fixture player', 0);
    const retiredBytes = localStorage.getItem(row.saveKey); first.unmount(); render(<row.Board />); await flush();
    expect(within(document.body).getByText(`${saved.c.name} retires`)).toBeInTheDocument(); expect(localStorage.getItem(row.saveKey)).toBe(retiredBytes);
    expect(recordCompletion).toHaveBeenCalledTimes(1);
  });

  it.each(CASES)('$label keeps restart pending then deletes only its own career without another completion', async row => {
    const { saved, bytes } = seed(row, true); const first = render(<row.Board />), opener = first.getByRole('button', { name: 'New career' });
    expect(first.getByText(`${saved.c.name} retires`)).toBeInTheDocument();
    let dialog = open(opener, 'restart'); assertUntouched(row, bytes);
    fireEvent.click(within(dialog).getByRole('button', { name: cancelName('restart') })); await flush(); assertUntouched(row, bytes);
    await cancel(opener, 'restart', true); assertUntouched(row, bytes);
    dialog = open(opener, 'restart'); assertUntouched(row, bytes); fireEvent.click(within(dialog).getByRole('button', { name: confirmName('restart') })); await flush();
    expect(localStorage.getItem(row.saveKey)).toBeNull(); expect(localStorage.getItem(SENTINEL_KEY)).toBe(SENTINEL);
    expect(first.getByRole('button', { name: 'Enter the draft' })).toBeEnabled(); expect(recordCompletion).not.toHaveBeenCalled();
    first.unmount(); const second = render(<row.Board />); expect(second.getByRole('button', { name: 'Enter the draft' })).toBeEnabled();
    expect(localStorage.getItem(row.saveKey)).toBeNull(); expect(localStorage.getItem(SENTINEL_KEY)).toBe(SENTINEL); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('keeps closed mounts callback quiet and unrelated payloads exact as an independent baseline', () => {
    const { view, opener, accept, unrelated } = shared(); expect(opener).toHaveTextContent('Original fixture action');
    expect(within(document.body).queryByRole('alertdialog')).toBeNull(); fireEvent.click(view.getByRole('button', { name: 'Unrelated fixture action' }));
    expect(unrelated).toHaveBeenCalledExactlyOnceWith(7); expect(accept).not.toHaveBeenCalled();
    view.unmount(); expect(accept).not.toHaveBeenCalled();
  });

  it.each(['retire', 'restart'] as const)('%s starts on Cancel and returns both dismissal paths to its exact opener without scrolling', async action => {
    const { opener, accept } = shared(action); const spy = vi.spyOn(opener, 'focus');
    for (const escape of [false, true]) {
      const dialog = open(opener, action); expect(within(dialog).getByRole('button', { name: cancelName(action) })).toHaveFocus(); spy.mockClear();
      if (escape) fireEvent.keyDown(dialog, { key: 'Escape' }); else fireEvent.click(within(dialog).getByRole('button', { name: cancelName(action) }));
      await waitFor(() => expect(within(document.body).queryByRole('alertdialog')).toBeNull());
      await waitFor(() => expect(opener).toHaveFocus()); expect(spy).toHaveBeenCalledWith({ preventScroll: true }); expect(accept).not.toHaveBeenCalled();
    }
  });

  it('accepts two same-frame Confirm clicks once and rearms only after a new opening', async () => {
    const { opener, accept } = shared(); let dialog = open(opener, 'retire'); const button = within(dialog).getByRole('button', { name: confirmName('retire') });
    act(() => { button.click(); button.click(); }); await flush(); expect(accept).toHaveBeenCalledTimes(1);
    dialog = open(opener, 'retire'); fireEvent.click(within(dialog).getByRole('button', { name: confirmName('retire') })); await flush(); expect(accept).toHaveBeenCalledTimes(2);
  });

  it('unmounts an open prompt without accepting or erasing its caller save', async () => {
    localStorage.setItem(SENTINEL_KEY, SENTINEL); const { view, opener, accept } = shared(); open(opener, 'retire'); view.unmount(); await flush();
    // Radix schedules its close autofocus cleanup on the next timer turn.
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(accept).not.toHaveBeenCalled(); expect(localStorage.getItem(SENTINEL_KEY)).toBe(SENTINEL); expect(within(document.body).queryByRole('alertdialog')).toBeNull();
  });

  it('contains the explicit keyboard boundary events while Cancel spends nothing', () => {
    const { opener, accept } = shared(), dialog = open(opener, 'retire');
    const cancelButton = within(dialog).getByRole('button', { name: cancelName('retire') }), confirmButton = within(dialog).getByRole('button', { name: confirmName('retire') });
    expect(cancelButton).toHaveFocus(); expect(fireEvent.keyDown(cancelButton, { key: 'Tab', shiftKey: true })).toBe(false); expect(confirmButton).toHaveFocus();
    expect(fireEvent.keyDown(confirmButton, { key: 'Tab' })).toBe(false); expect(cancelButton).toHaveFocus(); expect(accept).not.toHaveBeenCalled();
  });
});
