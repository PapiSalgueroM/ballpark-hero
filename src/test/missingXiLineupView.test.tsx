import './dailyReload/mocks';
import { act, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MissingXi from '@/pages/MissingXi';
import { pickDailyPuzzle, pickUnlimitedPuzzle, type ActivePuzzle, type XiPosition } from '@/lib/missingXi';
import { getTodayET } from '@/lib/dateUtils';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { recordCompletion, resetMocks } from './dailyReload/mocks';
import { click, findButton, mountPage, typeInto, type MountedPage } from './dailyReload/harness';

const fixture = vi.hoisted(() => {
  const positions: XiPosition[] = ['GK', 'RB', 'CB', 'CB', 'LB', 'CDM', 'CM', 'CM', 'RW', 'CF', 'LW'];
  const names = ['Fixture Keeper Fullname', 'Fixture Rightback Fullname', 'Fixture Centreback Fullname',
    'Fixture Hidden Fullname', 'Fixture Leftback Fullname', 'Fixture Anchor Fullname', 'Fixture Creator Fullname',
    'Fixture Runner Fullname', 'Fixture Rightwing Fullname', 'Fixture Forward Fullname', 'Fixture Leftwing Fullname'];
  const coordinates = [[50, 90], [84, 70], [62, 74], [38, 74], [16, 70], [50, 58], [68, 50], [32, 50], [80, 24], [50, 18], [20, 24]];
  const candidate = { name: names[3], slotIndex: 3, nationality: 'England', clubAtTime: 'Fixture Home' };
  const puzzle: ActivePuzzle = { candidate, lineup: { id: 'lineup-view-fictional', dateLabel: 'Fictional test lineup',
    competition: 'Fixture competition', matchDate: '2026-01-01', team: 'Fixture Home', opponent: 'Fixture Away',
    scoreLine: 'Fixture Home 2-1 Fixture Away', venue: 'Fixture Ground', formationLabel: '4-3-3', source: 'Fictional test data.',
    slots: positions.map((position, i) => ({ position, name: names[i], x: coordinates[i][0], y: coordinates[i][1] })), blankCandidates: [candidate] } };
  return { puzzle, names };
});
vi.mock('@/lib/missingXi', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/missingXi')>();
  return { ...actual, pickDailyPuzzle: vi.fn(() => fixture.puzzle), pickUnlimitedPuzzle: vi.fn(() => fixture.puzzle), XI_ROSTER_NAMES: fixture.names };
});
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const key = () => 'missing-xi-daily-' + getTodayET();
const compact = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();
const identity = (row: HTMLElement) => [...fixture.names, 'Missing player'].find(name => (row.textContent ?? '').includes(name));
function list(m: MountedPage) { return within(m.container).queryByRole('list', { name: 'Starting lineup' }); }
function controls(m: MountedPage) {
  return { group: within(m.container).queryByRole('group', { name: 'Lineup view' }),
    pitch: within(m.container).queryByRole('button', { name: 'Pitch' }),
    lineup: within(m.container).queryByRole('button', { name: 'Lineup' }) };
}
async function mount() {
  const m = mountPage(<MissingXi />, '/missing-xi');
  const letsPlay = findButton(document.body, /^Let's Play!$/);
  if (letsPlay) await click(letsPlay);
  await waitFor(() => expect(findButton(m.container, /^Lock in guess$/)).not.toBeNull());
  return m;
}
async function select(m: MountedPage, name: string) {
  const input = m.container.querySelector<HTMLInputElement>('input[role="combobox"]')!;
  await typeInto(input, name);
  let option: HTMLButtonElement | undefined;
  await waitFor(() => {
    option = Array.from(m.container.querySelectorAll<HTMLButtonElement>('button[role="option"]')).find(row => compact(row.textContent) === name);
    expect(option).toBeDefined();
  });
  await act(async () => { fireEvent.pointerDown(option!); });
  return input;
}
beforeEach(() => {
  cleanup(); resetMocks(); localStorage.clear(); localStorage.setItem('lineup-unrelated', 'held');
  consumeRestoredFinish('missing-xi'); vi.mocked(pickDailyPuzzle).mockClear(); vi.mocked(pickUnlimitedPuzzle).mockClear();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Missing XI equivalent lineup view', () => {
  it('offers two native pressed-state view buttons and starts on the existing pitch', async () => {
    const original = clone(fixture.puzzle), m = await mount(), view = controls(m);
    expect([!!view.group, view.pitch?.tagName, view.lineup?.tagName], 'MISSING_XI_LINEUP_CONTROLS').toEqual([true, 'BUTTON', 'BUTTON']);
    expect(within(view.group!).getAllByRole('button').map(button => compact(button.textContent))).toEqual(['Pitch', 'Lineup']);
    expect([view.pitch!.getAttribute('aria-pressed'), view.lineup!.getAttribute('aria-pressed')]).toEqual(['true', 'false']);
    expect(list(m)).toBeNull(); expect(m.container.querySelector('[style*="aspect-ratio"]')).not.toBeNull();
    expect(m.container.innerHTML).not.toContain(fixture.puzzle.candidate.name);
    expect(fixture.puzzle).toEqual(original); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('shows eleven ordered positions and ten complete names with a named blank while keeping the answer out of both views', async () => {
    const original = clone(fixture.puzzle), m = await mount(), view = controls(m);
    if (view.lineup) await click(view.lineup);
    const lineup = list(m);
    expect(!!lineup, 'MISSING_XI_LINEUP_ORDER').toBe(true);
    if (!lineup) return;
    expect(lineup.tagName).toBe('OL');
    const rows = within(lineup).getAllByRole('listitem');
    expect(rows.map(identity), 'MISSING_XI_LINEUP_EQUIVALENCE').toEqual(fixture.names.map((name, i) => i === 3 ? 'Missing player' : name));
    expect(rows.map((row, i) => (row.textContent ?? '').includes(fixture.puzzle.lineup.slots[i].position))).toEqual(Array(11).fill(true));
    expect(compact(rows[3].textContent)).toContain('Missing player'); expect(compact(rows[3].textContent)).toContain('CB');
    expect(lineup.outerHTML).not.toContain(fixture.puzzle.candidate.name);
    expect(m.container.innerHTML).not.toContain(fixture.puzzle.candidate.name);
    expect([view.pitch!.getAttribute('aria-pressed'), view.lineup!.getAttribute('aria-pressed')]).toEqual(['false', 'true']);
    await click(view.pitch!);
    expect(list(m)).toBeNull(); expect(m.container.innerHTML).not.toContain(fixture.puzzle.candidate.name);
    for (const name of fixture.names.filter(name => name !== fixture.puzzle.candidate.name)) expect(m.container.textContent).toContain(name);
    expect(fixture.puzzle).toEqual(original);
  });

  it('keeps the selected guess puzzle daily log and completion count unchanged while repeatedly switching views', async () => {
    const original = clone(fixture.puzzle), m = await mount(), input = await select(m, fixture.names[0]), view = controls(m);
    const daily = localStorage.getItem(key()), keys = Object.keys(localStorage).filter(name => name.startsWith('missing-xi-daily-'));
    const dailyPicks = vi.mocked(pickDailyPuzzle).mock.calls.length, unlimitedPicks = vi.mocked(pickUnlimitedPuzzle).mock.calls.length;
    const lock = findButton(m.container, /^Lock in guess$/)!;
    expect(lock.disabled).toBe(false);
    expect(!!view.lineup && !!view.pitch, 'MISSING_XI_LINEUP_READ_ONLY').toBe(true);
    const random = vi.spyOn(Math, 'random');
    for (let i = 0; i < 3; i++) {
      await click(view.lineup!); expect(list(m)).not.toBeNull();
      await click(view.pitch!); expect(list(m)).toBeNull();
      expect(input.value).toBe(fixture.names[0]); expect(lock.disabled).toBe(false);
      expect(localStorage.getItem(key())).toBe(daily);
    }
    expect(Object.keys(localStorage).filter(name => name.startsWith('missing-xi-daily-'))).toEqual(keys);
    expect(localStorage.getItem('lineup-unrelated')).toBe('held'); expect(recordCompletion).not.toHaveBeenCalled();
    expect(vi.mocked(pickDailyPuzzle).mock.calls.length).toBe(dailyPicks); expect(vi.mocked(pickUnlimitedPuzzle).mock.calls.length).toBe(unlimitedPicks);
    expect(random).not.toHaveBeenCalled(); expect(fixture.puzzle).toEqual(original);
    await click(lock);
    await waitFor(() => expect(m.container.textContent).toContain('Already tried: ' + fixture.names[0]));
    expect(JSON.parse(localStorage.getItem(key())!).guesses).toEqual([{ t: 'miss', name: fixture.names[0] }]);
  });

  it('reveals the correct eleventh full name after the real winning guess and preserves the finished daily across reload and view switches', async () => {
    const original = clone(fixture.puzzle), m = await mount();
    await select(m, fixture.puzzle.candidate.name); await click(findButton(m.container, /^Lock in guess$/)!);
    await waitFor(() => expect(m.container.querySelector('[role="status"]')).not.toBeNull());
    const result = compact(m.container.querySelector('[role="status"]')!.textContent), daily = localStorage.getItem(key());
    const view = controls(m); if (view.lineup) await click(view.lineup);
    const lineup = list(m);
    expect(!!lineup, 'MISSING_XI_LINEUP_REVEAL').toBe(true);
    if (!lineup) return;
    expect(within(lineup).getAllByRole('listitem').map(identity)).toEqual(fixture.names);
    expect(lineup.textContent).not.toContain('Missing player'); expect(JSON.parse(daily!).guesses).toEqual([{ t: 'won' }]);
    expect(JSON.parse(daily!).gameStatus).toBe('won'); await waitFor(() => expect(recordCompletion).toHaveBeenCalledTimes(1));
    await click(view.pitch!); expect(m.container.textContent).toContain(fixture.puzzle.candidate.name); expect(localStorage.getItem(key())).toBe(daily);
    m.unmount();
    const loaded = mountPage(<MissingXi />, '/missing-xi');
    const letsPlay = findButton(document.body, /^Let's Play!$/); if (letsPlay) await click(letsPlay);
    await waitFor(() => expect(compact(loaded.container.querySelector('[role="status"]')?.textContent ?? null)).toBe(result));
    const loadedView = controls(loaded); await click(loadedView.lineup!);
    expect(within(list(loaded)!).getAllByRole('listitem').map(identity)).toEqual(fixture.names);
    expect(localStorage.getItem(key())).toBe(daily); expect(recordCompletion).toHaveBeenCalledTimes(1); expect(fixture.puzzle).toEqual(original);
  });
});
