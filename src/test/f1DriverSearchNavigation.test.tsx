import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { F1DriverSearch } from '@/components/f1-driver/F1DriverSearch';
import { smartMatch, smartScore, highlightMatches } from '@/lib/smartSearch';
import type { F1DriverPuzzle } from '@/types/f1Driver';

const fixture = vi.hoisted(() => ({ drivers: Array.from({ length: 14 }, (_, i) => ({ id: 'fiction-' + i, name: i === 8 ? 'FixtureCaldermereLongUnbrokenDriverNameForReadableSelection' : 'Fixture Driver ' + String(i).padStart(2, '0') })) }));
vi.mock('@/data/f1Drivers', () => ({ getAllF1DriverNames: (puzzle?: F1DriverPuzzle) => {
  const names = fixture.drivers.map(driver => ({ ...driver }));
  if (puzzle && !names.some(driver => driver.id === puzzle.id)) names.push({ id: puzzle.id, name: puzzle.driverName });
  return names;
} }));
const guesses: string[] = [];
const props = (onGuess: (name: string) => void = vi.fn()) => ({ onGuess, guesses });
const input = (view: ReturnType<typeof render>) => view.getByLabelText('Search F1 drivers') as HTMLInputElement;
const options = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLButtonElement>('[data-f1-driver-option]')];
const type = (view: ReturnType<typeof render>, query = 'Fixture') => { act(() => input(view).focus()); fireEvent.change(input(view), { target: { value: query } }); };
const arrow = (view: ReturnType<typeof render>, count: number, key = 'ArrowDown') => { for (let i = 0; i < count; i++) fireEvent.keyDown(input(view), { key }); };
const originalMatches = (query: string, used: string[] = []) => fixture.drivers.filter(driver => !used.some(name => name.toLowerCase() === driver.name.toLowerCase())).filter(driver => smartMatch(driver.name, query)).sort((a, b) => smartScore(a.name, query) - smartScore(b.name, query)).slice(0, 10);
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('actual F1 driver search navigation', () => {
  it('selects the third original match with ArrowDown and Enter', () => {
    const onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />);
    type(view); arrow(view, 2); fireEvent.keyDown(input(view), { key: 'Enter' });
    expect(onGuess).toHaveBeenCalledExactlyOnceWith(originalMatches('Fixture')[2].name);
  });

  it('keeps later highlight visible with local scrolling only', () => {
    const view = render(<F1DriverSearch {...props()} />); type(view);
    const list = view.getByRole('listbox');
    vi.spyOn(list, 'getBoundingClientRect').mockImplementation(() => ({ top: 100, bottom: 292, height: 192 } as DOMRect));
    options(view).forEach((node, i) => vi.spyOn(node, 'getBoundingClientRect').mockImplementation(() => ({ top: 100 + i * 44 - list.scrollTop, bottom: 144 + i * 44 - list.scrollTop, height: 44 } as DOMRect)));
    const windowScroll = vi.spyOn(window, 'scrollTo'), random = vi.spyOn(Math, 'random'), writes = vi.spyOn(Storage.prototype, 'setItem');
    arrow(view, 9);
    const last = options(view)[9]; expect(last).toHaveAttribute('aria-selected', 'true');
    expect(last.getBoundingClientRect().top).toBeGreaterThanOrEqual(100); expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(292);
    expect(list.scrollTop).toBeGreaterThan(0); expect(windowScroll).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });

  it('holds first-ten helper order, one-letter matching and guessed exclusion', () => {
    const used = [fixture.drivers[1].name.toUpperCase()], view = render(<F1DriverSearch {...props()} guesses={used} />); type(view, 'F');
    expect(options(view).map(node => node.dataset.f1DriverOption)).toEqual(originalMatches('F', used).map(driver => driver.id));
    expect(options(view)).toHaveLength(10); expect(options(view).map(node => node.textContent)).toEqual(originalMatches('F', used).map(driver => '🏎️ ' + driver.name));
  });

  it('resets changed candidates while preserving retained nodes on stable rerenders', () => {
    const onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />); type(view); const nodes = options(view); arrow(view, 3);
    view.rerender(<F1DriverSearch {...props(onGuess)} />); expect(options(view)[3]).toHaveAttribute('aria-selected', 'true');
    options(view).forEach((node, i) => expect(node).toBe(nodes[i]));
    view.rerender(<F1DriverSearch {...props(onGuess)} guesses={[fixture.drivers[0].name]} />);
    expect(options(view)[0]).toHaveAttribute('aria-selected', 'true'); expect(options(view)[0].dataset.f1DriverOption).toBe(fixture.drivers[1].id);
    type(view, 'Driver 05'); expect(options(view)[0]).toHaveAttribute('aria-selected', 'true'); expect(onGuess).not.toHaveBeenCalled();
  });

  it('describes the current option and closes Escape without a guess', () => {
    const onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />); type(view);
    expect(input(view)).toHaveAttribute('role', 'combobox'); expect(input(view)).toHaveAttribute('aria-expanded', 'true');
    expect(input(view).getAttribute('aria-controls')).toBe(view.getByRole('listbox').id);
    arrow(view, 1); expect(input(view).getAttribute('aria-activedescendant')).toBe(options(view)[1].id);
    fireEvent.keyDown(input(view), { key: 'Escape' }); expect(view.queryByRole('listbox')).toBeNull(); expect(input(view)).toHaveAttribute('aria-expanded', 'false'); expect(input(view)).not.toHaveAttribute('aria-activedescendant'); expect(onGuess).not.toHaveBeenCalled();
    fireEvent.focus(input(view)); expect(options(view)[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('preserves exact trimmed free-text fallback and original fuzzy matching', () => {
    const onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />); type(view, '  Unknown fictional racer  ');
    expect(options(view)).toHaveLength(0); fireEvent.keyDown(input(view), { key: 'Enter' }); expect(onGuess).toHaveBeenCalledExactlyOnceWith('Unknown fictional racer');
    type(view, 'Drivr'); expect(options(view).map(node => node.dataset.f1DriverOption)).toEqual(originalMatches('Drivr').map(driver => driver.id));
    expect(highlightMatches('Fixture Driver 00', 'Driver').map(segment => segment.text).join('')).toBe('Fixture Driver 00');
  });

  it('returns accepted option focus with preventScroll and honors external focus', () => {
    const onGuess = vi.fn(), view = render(<><F1DriverSearch {...props(onGuess)} /><button>Outside help</button></>); type(view);
    const focus = vi.spyOn(input(view), 'focus'); act(() => options(view)[2].focus()); fireEvent.click(options(view)[2]);
    expect(onGuess).toHaveBeenCalledExactlyOnceWith(fixture.drivers[2].name); expect(input(view)).toHaveFocus(); expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    const outside = view.getByText('Outside help'); view.rerender(<><F1DriverSearch {...props(() => outside.focus())} /><button>Outside help</button></>); type(view); fireEvent.click(options(view)[0]); expect(outside).toHaveFocus();
  });

  it('blocks held Enter and Space without blocking fresh native option activation', () => {
    const onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />); type(view);
    expect(fireEvent.keyDown(input(view), { key: 'Enter', repeat: true, cancelable: true })).toBe(false); expect(onGuess).not.toHaveBeenCalled();
    const option = options(view)[2]; act(() => option.focus()); expect(fireEvent.keyDown(option, { key: ' ', repeat: true, cancelable: true })).toBe(false);
    expect(fireEvent.keyDown(option, { key: 'Enter', repeat: true, cancelable: true })).toBe(false); expect(onGuess).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(option, { key: ' ', repeat: false, cancelable: true })).toBe(true); fireEvent.click(option, { detail: 0 }); expect(onGuess).toHaveBeenCalledExactlyOnceWith(fixture.drivers[2].name);
  });

  it('adopts the current puzzle answer and blocks disabled input events', async () => {
    const puzzle: F1DriverPuzzle = { id: 'fixture-pinned', driverName: 'Fixture Pinned Answer', commonNames: ['Pinned'], clues: ['Fictional clue'] }, onGuess = vi.fn();
    const view = render(<F1DriverSearch {...props(onGuess)} />); type(view, 'Pinned'); expect(options(view)).toHaveLength(0);
    view.rerender(<F1DriverSearch {...props(onGuess)} currentPuzzle={puzzle} />); expect(options(view).map(node => node.dataset.f1DriverOption)).toEqual(['fixture-pinned']);
    view.rerender(<F1DriverSearch {...props(onGuess)} currentPuzzle={puzzle} disabled />); fireEvent.keyDown(input(view), { key: 'Enter' }); expect(onGuess).not.toHaveBeenCalled(); expect(view.queryByRole('listbox')).toBeNull();
    view.rerender(<F1DriverSearch {...props(onGuess)} currentPuzzle={puzzle} />); await waitFor(() => expect(options(view)).toHaveLength(1)); fireEvent.keyDown(input(view), { key: 'Enter' }); expect(onGuess).toHaveBeenCalledExactlyOnceWith(puzzle.driverName);
  });

  it('opens within available viewport space and repositions without changing choices', () => {
    const onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />), field = input(view);
    const rect = vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ top: window.innerHeight - 100, bottom: window.innerHeight - 50 } as DOMRect);
    const windowScroll = vi.spyOn(window, 'scrollTo'), random = vi.spyOn(Math, 'random'), writes = vi.spyOn(Storage.prototype, 'setItem'); type(view);
    const list = view.getByRole('listbox'), nodes = options(view);
    expect(list.style.bottom).toBe('100%'); expect(list.style.maxHeight).toBe('192px');
    rect.mockReturnValue({ top: 50, bottom: 100 } as DOMRect); fireEvent(window, new Event('resize'));
    expect(list.style.top).toBe('100%'); expect(list.style.bottom).toBe('');
    options(view).forEach((node, i) => expect(node).toBe(nodes[i]));
    expect(options(view).map(node => node.dataset.f1DriverOption)).toEqual(originalMatches('Fixture').map(driver => driver.id));
    expect(onGuess).not.toHaveBeenCalled(); expect(windowScroll).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    arrow(view, 9); fireEvent.keyDown(field, { key: 'Enter' }); expect(onGuess).toHaveBeenCalledExactlyOnceWith(originalMatches('Fixture')[9].name);
  });

  it('holds an independent original-helper callback and quiet input baseline', () => {
    const query = 'Driver 03', expected = originalMatches(query), onGuess = vi.fn(), view = render(<F1DriverSearch {...props(onGuess)} />), before = JSON.stringify(fixture.drivers);
    const random = vi.spyOn(Math, 'random'), writes = vi.spyOn(Storage.prototype, 'setItem'); type(view, query);
    expect(expected[0].name).toBe(fixture.drivers[3].name);
    const button = [...view.container.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === '🏎️ ' + expected[0].name)!; fireEvent.click(button);
    expect(onGuess).toHaveBeenCalledExactlyOnceWith(expected[0].name); expect(input(view).value).toBe(''); expect(JSON.stringify(fixture.drivers)).toBe(before); expect(random).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
  });
});
