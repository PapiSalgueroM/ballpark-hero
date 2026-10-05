import './dailyReload/mocks';
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import NhlConnections from '@/pages/NhlConnections';
import { useNhlConnections } from '@/hooks/useNhlConnections';
import { nhlConnectionsPuzzles, type NhlConnectionsPuzzle } from '@/data/nhlConnectionsPuzzles';
import { emptyNhlDrafts, nhlDraftKey, nhlDraftScope, parseNhlDrafts, toggleNhlDraft } from '@/lib/nhlConnectionDrafts';
import { consumeRestoredFinish } from '@/lib/restoredFinish';
import { getTodayET } from '@/lib/dateUtils';
import { recordCompletion, resetMocks } from './dailyReload/mocks';

const network = vi.hoisted(() => ({ pool: [] as NhlConnectionsPuzzle[], pending: null as Promise<void> | null }));
vi.mock('@/lib/fetchNhlConnectionsPuzzles', () => ({ fetchNhlConnectionsPuzzles: async () => {
  if (network.pending) await network.pending;
  return network.pool;
} }));
vi.mock('@/components/game/GameShell', () => ({ GameShell: ({ children, headerExtra }: { children: ReactNode; headerExtra: ReactNode }) => <main>{headerExtra}{children}</main> }));
vi.mock('@/components/game/GameNav', () => ({ GameNav: () => null }));
vi.mock('@/components/game/ReportQuestion', () => ({ default: () => null }));
vi.mock('@/components/ads/AdBanner', () => ({ default: () => null }));
vi.mock('@/components/seo/GameSeoContent', () => ({ default: () => null }));
vi.mock('@/components/game/ShareButtons', () => ({ default: () => <span>Share fixture</span> }));

const puzzle = nhlConnectionsPuzzles[0];
const names = puzzle.groups.flatMap(group => group.players);
const date = '2026-10-03';
const dailyKey = `nhl-connections-daily-${date}`;
const scope = (mode: 'daily' | 'unlimited', id = puzzle.id) => nhlDraftScope(mode, id, date);
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const rawNotes = (mode: 'daily' | 'unlimited') => localStorage.getItem(nhlDraftKey(mode));
const readNotes = (mode: 'daily' | 'unlimited') => JSON.parse(rawNotes(mode)!);
beforeEach(() => {
  localStorage.clear(); resetMocks(); consumeRestoredFinish('nhl-connections');
  localStorage.setItem('nhlconn-planning-rules-seen-v1', '1');
  network.pool = [puzzle]; network.pending = null;
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.setSystemTime(new Date(date + 'T16:00:00Z'));
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
async function page() {
  const view = render(<HelmetProvider><MemoryRouter><NhlConnections /></MemoryRouter></HelmetProvider>);
  await flush(); return view;
}
type Page = Awaited<ReturnType<typeof page>>;
const button = (view: Page, name: string) => view.getByRole('button', { name });
const pick = (view: Page, selected: string[]) => selected.forEach(name => fireEvent.click(button(view, name)));
const tab = (view: Page, label: string) => fireEvent.click(button(view, `Draft ${label}`));
const submit = (view: Page) => fireEvent.click(button(view, 'Submit five'));
const wrong = [...puzzle.groups[0].players.slice(0, 4), puzzle.groups[1].players[0]];
async function hook() { const view = renderHook(() => useNhlConnections()); await flush(); return view; }
const selectHook = (view: Awaited<ReturnType<typeof hook>>, group: string[]) => act(() => {
  view.result.current.deselectAll(); group.forEach(name => view.result.current.togglePlayer(name));
});

describe('NHL planning bench', () => {
  it('moves canonical notes without duplication and rejects malformed or stale documents', () => {
    let notes = emptyNhlDrafts(scope('daily'), names);
    notes = toggleNhlDraft(notes, names[0]); notes = { ...notes, active: 1 };
    notes = toggleNhlDraft(notes, names[0]);
    expect(notes.groups, 'A moved name belongs to only one draft').toEqual([[], [names[0]], [], []]);
    expect(parseNhlDrafts(JSON.stringify(notes), scope('daily'), [...names].reverse(), names)).toEqual(notes);
    expect(parseNhlDrafts(JSON.stringify(notes), scope('daily'), names, names.slice(1))?.groups).toEqual([[], [], [], []]);
    for (const changed of [
      { ...notes, scope: scope('unlimited') }, { ...notes, scope: scope('daily', 'retired-puzzle') },
      { ...notes, roster: [...names.slice(1), 'Foreign name'] }, { ...notes, v: 2 }, { ...notes, active: -1 },
      { ...notes, active: 4 }, { ...notes, active: 0.5 }, { ...notes, groups: [null, [], [], []] },
      { ...notes, groups: [[names[0]], [names[0]], [], []] },
      { ...notes, groups: [['Foreign name'], [], [], []] },
      { ...notes, groups: [names.slice(0, 6), [], [], []] },
    ]) expect(parseNhlDrafts(JSON.stringify(changed), scope('daily'), names, names), 'Invalid or stale notes fail closed').toBeNull();
    for (const raw of ['{', 'null', '[]', '"notes"']) expect(parseNhlDrafts(raw, scope('daily'), names, names)).toBeNull();
  });

  it('plans four drafts freely and never submits the fifth selection', async () => {
    const view = await page(), before = localStorage.getItem(dailyKey);
    pick(view, puzzle.groups[0].players);
    expect(view.queryByLabelText('4 lives remaining'), 'Planning retains all four lives').not.toBeNull();
    expect(localStorage.getItem(dailyKey), 'Fifth selection must not book an action').toBe(before);
    expect(button(view, 'Submit five')).toBeEnabled();
    pick(view, [names[5]]);
    expect(readNotes('daily').groups[0], 'A draft stops at five').toEqual(puzzle.groups[0].players);
    tab(view, 'B'); pick(view, [names[0]]);
    expect(readNotes('daily').groups[0]).toEqual(puzzle.groups[0].players.slice(1));
    expect(readNotes('daily').groups[1]).toEqual([names[0]]);
    expect(button(view, names[0])).toHaveAttribute('aria-description', 'In draft B');
    tab(view, 'C'); pick(view, [names[6]]); tab(view, 'D'); pick(view, [names[11]]);
    expect(readNotes('daily').groups.map((group: string[]) => group.length)).toEqual([4, 1, 1, 1]);
    expect(localStorage.getItem(dailyKey)).toBe(before); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('revises a wrong draft then finds four groups for exactly the original 750 points', async () => {
    const view = await page();
    tab(view, 'B'); pick(view, puzzle.groups[2].players); tab(view, 'A'); pick(view, wrong); submit(view);
    expect(view.getByLabelText('3 lives remaining')).toBeVisible();
    expect(view.getByRole('status')).toHaveTextContent('Your draft stays here to revise');
    expect(readNotes('daily').groups[0]).toEqual(wrong);
    expect(readNotes('daily').groups[1]).toEqual(puzzle.groups[2].players);
    expect(button(view, 'Submit five')).toBeDisabled();
    pick(view, [wrong[4], puzzle.groups[0].players[4]]); submit(view);
    expect(view.getByRole('status')).toHaveTextContent('Locked: ' + puzzle.groups[0].theme);
    for (const name of puzzle.groups[0].players) expect(view.queryByRole('button', { name })).toBeNull();
    expect(readNotes('daily').groups[0]).toEqual([]);
    tab(view, 'B'); submit(view);
    for (const index of [1, 3]) { tab(view, 'A'); pick(view, puzzle.groups[index].players); submit(view); }
    await flush();
    expect(view.getByText('All Groups Found!')).toBeVisible();
    expect(recordCompletion).toHaveBeenCalledTimes(1);
    expect(recordCompletion).toHaveBeenCalledWith('/nhl-connections', 750, 'Tester', 0);
    const saved = JSON.parse(localStorage.getItem(dailyKey)!);
    expect(saved.guesses.map((action: { t: string }) => action.t)).toEqual(['x', 'ok', 'ok', 'ok', 'ok']);
    expect(saved.gameStatus).toBe('won');
    expect(readNotes('daily').groups.flat()).toEqual([]);
  });

  it('charges one life for same-frame submissions and rejects solved-name reuse', async () => {
    const view = await hook(); selectHook(view, wrong);
    act(() => { view.result.current.submitSelection(); view.result.current.submitSelection(); });
    expect(view.result.current.lives, 'Same-frame Submit costs one life').toBe(3);
    expect(JSON.parse(localStorage.getItem(dailyKey)!).guesses).toEqual([{ t: 'x' }]);
    for (const active of [0, 1, 0]) {
      act(() => view.result.current.selectDraft(active));
      expect(view.result.current.canSubmit, 'Draft navigation does not unlock an unchanged rejection').toBe(false);
      act(() => view.result.current.submitSelection());
    }
    expect(view.result.current.lives, 'Draft navigation never costs another life').toBe(3);
    expect(JSON.parse(localStorage.getItem(dailyKey)!).guesses).toEqual([{ t: 'x' }]);
    selectHook(view, puzzle.groups[0].players);
    act(() => { view.result.current.submitSelection(); view.result.current.submitSelection(); });
    expect(view.result.current.foundGroups).toBe(1);
    act(() => { puzzle.groups[0].players.forEach(name => view.result.current.togglePlayer(name)); });
    expect(view.result.current.selected).toEqual([]);
    expect(JSON.parse(localStorage.getItem(dailyKey)!).guesses).toHaveLength(2);
  });

  it('waits for the real loaded pool and restores mode notes with daily bytes held', async () => {
    let resolve!: () => void; network.pending = new Promise<void>(done => { resolve = done; });
    const notes = { ...emptyNhlDrafts(scope('daily'), names), active: 2, groups: [[], [], [names[0]], []] };
    const bytes = JSON.stringify(notes); localStorage.setItem(nhlDraftKey('daily'), bytes);
    const stored = JSON.stringify({ v: 1, date, puzzleIndex: 0, puzzleId: puzzle.id, guesses: [{ t: 'x' }], gameStatus: 'playing' });
    localStorage.setItem(dailyKey, stored);
    const view = await page();
    expect(view.queryByRole('button', { name: 'Draft A' }), 'No fallback bench before pool readiness').toBeNull();
    expect(rawNotes('daily')).toBe(bytes); expect(localStorage.getItem(dailyKey)).toBe(stored);
    await act(async () => { resolve(); await Promise.resolve(); });
    expect(button(view, 'Draft C').getAttribute('aria-pressed')).toBe('true');
    expect(button(view, names[0])).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button(view, '∞ Unlimited')); tab(view, 'D'); pick(view, [names[4]]);
    const unlimited = rawNotes('unlimited');
    fireEvent.click(button(view, '📅 Daily'));
    expect(button(view, 'Draft C').getAttribute('aria-pressed')).toBe('true');
    expect(rawNotes('daily')).toBe(bytes); expect(rawNotes('unlimited')).toBe(unlimited);
    view.unmount(); const again = await page();
    expect(button(again, names[0])).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(dailyKey)).toBe(stored); expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('reopens the saved Unlimited puzzle despite a new random draw and resets to the new scope', async () => {
    network.pool = [puzzle, nhlConnectionsPuzzles[1]];
    let view = await hook(); act(() => view.result.current.switchMode('unlimited'));
    act(() => { view.result.current.selectDraft(3); view.result.current.togglePlayer(names[0]); });
    const saved = rawNotes('unlimited'); view.unmount();
    vi.mocked(Math.random).mockReturnValue(0.9);
    view = await hook(); act(() => view.result.current.switchMode('unlimited'));
    expect(view.result.current.puzzle?.id, 'Valid notes restore their actual Unlimited puzzle').toBe(puzzle.id);
    expect(view.result.current.selected).toEqual([names[0]]); expect(view.result.current.lives).toBe(4);
    expect(rawNotes('unlimited')).toBe(saved);
    for (let index = 0; index < 4; index++) { selectHook(view, wrong); act(() => view.result.current.submitSelection()); }
    expect(view.result.current.gameStatus).toBe('complete'); expect(view.result.current.foundGroups).toBe(0);
    act(() => view.result.current.resetGame());
    expect(view.result.current.puzzle?.id).toBe(nhlConnectionsPuzzles[1].id);
    expect(view.result.current.drafts?.groups.flat()).toEqual([]);
    view.unmount(); vi.mocked(Math.random).mockReturnValue(0);
    view = await hook(); act(() => view.result.current.switchMode('unlimited'));
    expect(view.result.current.puzzle?.id, 'Reset persists the newly selected puzzle').toBe(nhlConnectionsPuzzles[1].id);
    expect(view.result.current.lives).toBe(4); expect(view.result.current.drafts?.groups.flat()).toEqual([]);
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('rejects a same-id changed roster and foreign saved names without overwriting during load', async () => {
    const bytes = JSON.stringify({ ...emptyNhlDrafts(scope('daily'), names), groups: [[names[0]], [], [], []] });
    localStorage.setItem(nhlDraftKey('daily'), bytes);
    const changed = { ...puzzle, groups: puzzle.groups.map((group, index) => index ? group : { ...group, players: ['Fictional fixture replacement', ...group.players.slice(1)] }) };
    network.pool = [changed];
    const view = await page();
    expect(button(view, 'Draft A')).toHaveTextContent('0/5');
    expect(rawNotes('daily'), 'Loading stale notes never overwrites their bytes').toBe(bytes);
    expect(view.queryByRole('button', { name: names[0] })).toBeNull();
    pick(view, ['Fictional fixture replacement']);
    expect(readNotes('daily').groups[0]).toEqual(['Fictional fixture replacement']);
    expect(localStorage.getItem(dailyKey)).toBeNull();
  });

  it('shows worked help and blocks background submission while its rules are open', async () => {
    const view = await page(); pick(view, wrong); const submitButton = button(view, 'Submit five');
    fireEvent.click(button(view, 'How to play'));
    const dialog = view.getByRole('dialog');
    expect(dialog).toHaveTextContent('Try this example'); expect(dialog).toHaveTextContent('Keep another idea in B');
    fireEvent.click(submitButton);
    expect(localStorage.getItem(dailyKey), 'Rules must prevent a background submission').toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    act(() => vi.advanceTimersByTime(0)); submit(view);
    expect(view.getByRole('status')).toHaveTextContent('One life used');
    expect(document.activeElement).toContainElement(view.getByRole('status'));
  });

  it('keeps live notes usable and warns when browser persistence fails', async () => {
    const view = await page();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Fixture quota'); });
    pick(view, [names[0]]);
    expect(button(view, names[0])).toHaveAttribute('aria-pressed', 'true');
    expect(view.queryByRole('alert'), 'A failed note save needs a visible warning').not.toBeNull();
    expect(view.getByRole('alert')).toHaveTextContent('Notes could not be saved');
    expect(recordCompletion).not.toHaveBeenCalled();
  });

  it('restores the original completed Daily payload quietly and keeps its exact bytes', async () => {
    const bytes = JSON.stringify({ v: 1, date: getTodayET(), puzzleIndex: 0, puzzleId: puzzle.id,
      guesses: [{ t: 'x' }, ...puzzle.groups.map(group => ({ t: 'ok', theme: group.theme, players: group.players, diff: group.difficulty }))], gameStatus: 'won' });
    localStorage.setItem(dailyKey, bytes);
    const view = await page();
    expect(view.getByText('All Groups Found!')).toBeVisible();
    expect(view.getByLabelText('3 lives remaining')).toBeVisible();
    expect(localStorage.getItem(dailyKey)).toBe(bytes); expect(recordCompletion).not.toHaveBeenCalled();
    expect(view.queryByRole('button', { name: 'Submit five' })).toBeNull();
  });
});
