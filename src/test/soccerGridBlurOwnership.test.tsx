import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';

vi.mock('@/components/FlagImg', () => ({ FlagImg: ({ name }: { name: string }) => <span>{name}</span> }));

const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three'];
const players = names.map(name => ({ name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
const selected = vi.fn();
type View = ReturnType<typeof render>;
let view: View | null = null;
let elapsed = 0, beforeStores = '';
const cases: unknown[] = [];
let phases: unknown[] = [];
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])));
const input = () => view!.getByRole('textbox', { name: 'Search for a player' }) as HTMLInputElement;
const visibleNames = () => Array.from(view?.container.querySelectorAll('form ul li > span:first-child') ?? [], node => node.textContent);
const state = () => ({ elapsed, timers: vi.getTimerCount(), mounted: !!view?.queryByRole('textbox', { name: 'Search for a player' }),
  query: view?.queryByRole('textbox', { name: 'Search for a player' })?.getAttribute('value') ?? null,
  focused: document.activeElement?.getAttribute('aria-label') === 'Search for a player', visibleNames: visibleNames(), selected: selected.mock.calls.map(call => call[0]) });
const mark = (phase: string) => { phases.push({ phase, ...state() }); };
const advance = (ms: number, phase: string) => { act(() => { vi.advanceTimersByTime(ms); }); elapsed += ms; mark(phase); };
const focus = (phase: string) => { act(() => { input().focus(); }); expect(document.activeElement).toBe(input()); mark(phase); };
const blur = (phase: string) => { act(() => { input().blur(); }); expect(document.activeElement).not.toBe(input()); mark(phase); };
const open = () => {
  expect(vi.getTimerCount()).toBe(0);
  view = render(<SoccerGridSearch players={players} onSelect={selected} disabled={false} />);
  expect(document.activeElement).toBe(input()); expect(vi.getTimerCount()).toBe(0); mark('mounted');
  fireEvent.change(input(), { target: { value: 'Fixture' } }); expect(visibleNames()).toEqual(names); mark('list-open');
};
const submit = () => { act(() => { fireEvent.submit(input().closest('form')!); }); mark('submitted'); };

beforeAll(() => {
  // JSDOM has no physical scroll. The actual built route owns native geometry.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-18T16:00:00Z')); selected.mockClear(); elapsed = 0; phases = [];
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('blur-held-local', '{"held":true}'); sessionStorage.setItem('blur-held-session', 'held'); beforeStores = stores();
});
afterEach(context => {
  const final = state(), pendingBeforeCleanup = vi.getTimerCount();
  cleanup(); view = null;
  act(() => { vi.runOnlyPendingTimers(); });
  const pendingAfterCleanup = vi.getTimerCount(), afterStores = stores();
  cases.push({ name: context.task.name, phases, final, pendingBeforeCleanup, pendingAfterCleanup, beforeStores, afterStores });
  expect(pendingAfterCleanup).toBe(0); expect(afterStores, 'Search must preserve every stored field').toBe(beforeStores); vi.useRealTimers();
});
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor); else delete (Element.prototype as Partial<Element>).scrollIntoView;
  if (!process.env.SOCCER_GRID_BLUR_TRACE_DIR) return;
  fs.mkdirSync(process.env.SOCCER_GRID_BLUR_TRACE_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.SOCCER_GRID_BLUR_TRACE_DIR, 'trace.json'), JSON.stringify({ version: 1,
    scope: 'Actual Search focus, blur,150ms timer, unmount and canonical/manual callbacks. Fake timers and a JSDOM scroll shim; no physical browser or backend claim.', cases }, null, 2) + '\n');
});

describe('Soccer Grid blur ownership', () => {
  it('keeps the refocused canonical menu beyond the old blur deadline', () => {
    open(); fireEvent.keyDown(input(), { key: 'ArrowDown' }); mark('second-highlight');
    blur('blur-a'); advance(50, 'before-refocus'); focus('refocused'); expect(visibleNames()).toEqual(names);
    advance(100, 'old-deadline'); expect(document.activeElement).toBe(input()); expect(input()).toHaveValue('Fixture');
    expect(visibleNames(), 'A refocused menu must survive the old blur deadline').toEqual(names);
    submit(); expect(selected).toHaveBeenCalledExactlyOnceWith(names[1]); expect(input()).toHaveValue(''); expect(visibleNames()).toEqual([]);
  });
  it('gives a newer final blur its own full150ms grace', () => {
    open(); blur('blur-a'); advance(50, 'before-refocus'); focus('refocused'); advance(50, 'before-new-blur'); blur('blur-b');
    advance(50, 'old-deadline'); expect(document.activeElement).not.toBe(input()); expect(input()).toHaveValue('Fixture');
    expect(visibleNames(), 'A newer blur must keep its own full150ms grace').toEqual(names);
    advance(99, 'new-deadline-minus-one'); expect(visibleNames()).toEqual(names); advance(1, 'new-deadline');
    expect(visibleNames()).toEqual([]); expect(selected).not.toHaveBeenCalled(); expect(input()).toHaveValue('Fixture');
  });
  it('cancels the owned pending blur timeout on actual unmount', () => {
    open(); blur('pending-blur'); expect(vi.getTimerCount()).toBe(1);
    act(() => { view!.unmount(); }); expect(view!.queryByRole('textbox', { name: 'Search for a player' })).toBeNull(); mark('unmounted');
    expect(vi.getTimerCount(), 'Unmount must cancel the owned pending blur timeout').toBe(0); expect(selected).not.toHaveBeenCalled();
  });
  it('keeps uninterrupted blur open at149ms and closed at150ms', () => {
    open(); blur('final-blur'); advance(149, 'deadline-minus-one'); expect(visibleNames()).toEqual(names);
    advance(1, 'deadline'); expect(visibleNames()).toEqual([]); expect(input()).toHaveValue('Fixture'); expect(selected).not.toHaveBeenCalled();
  });
  it('keeps pointer selection canonical and exactly once', () => {
    open(); act(() => { fireEvent.mouseDown(view!.getByText(names[0], { exact: true })); }); mark('pointer-selected');
    expect(selected).toHaveBeenCalledExactlyOnceWith(names[0]); expect(input()).toHaveValue(''); expect(visibleNames()).toEqual([]);
  });
  it('keeps keyboard selection canonical and exactly once', () => {
    open(); fireEvent.keyDown(input(), { key: 'ArrowDown' }); mark('second-highlight'); submit();
    expect(selected).toHaveBeenCalledExactlyOnceWith(names[1]); expect(input()).toHaveValue(''); expect(visibleNames()).toEqual([]);
  });
  it('keeps trimmed title-cased manual submission', () => {
    open(); fireEvent.change(input(), { target: { value: '  fictional missing  ' } }); expect(visibleNames()).toEqual([]); mark('manual-query'); submit();
    expect(selected).toHaveBeenCalledExactlyOnceWith('Fictional Missing'); expect(input()).toHaveValue(''); expect(visibleNames()).toEqual([]);
  });
  it('reopens matching suggestions after an expired blur without editing', () => {
    open(); blur('final-blur'); advance(150, 'expired'); expect(visibleNames()).toEqual([]); focus('refocused-after-expiry');
    expect(visibleNames()).toEqual(names); expect(input()).toHaveValue('Fixture'); expect(selected).not.toHaveBeenCalled();
  });
});
