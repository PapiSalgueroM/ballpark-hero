import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';

vi.mock('@/components/FlagImg', () => ({ FlagImg: ({ name }: { name: string }) => <span>{name}</span> }));

const names = ['Fixture Álex One', 'Fixture Øren Two', 'Fixture Plain Three'];
const players = names.map(name => ({ name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
const selected = vi.fn();
let view: ReturnType<typeof render> | null = null;
let phases: unknown[] = [], beforeStores = '';
const cases: unknown[] = [];
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])));
const fields = () => view!.getAllByLabelText('Search for a player') as HTMLInputElement[];
const input = () => fields()[0];
const list = () => view!.container.querySelector('form ul') as HTMLUListElement | null;
const items = () => Array.from(view!.container.querySelectorAll<HTMLLIElement>('form ul li'));
const visible = () => items().map(row => row.querySelector('span')!.textContent);
const snapshot = () => ({ fields: view ? fields().map(field => ({ value: field.value, role: field.getAttribute('role'),
  autocomplete: field.getAttribute('aria-autocomplete'), expanded: field.getAttribute('aria-expanded'),
  controls: field.getAttribute('aria-controls'), active: field.getAttribute('aria-activedescendant'), focused: document.activeElement === field })) : [],
  lists: view ? Array.from(view.container.querySelectorAll('form ul')).map(node => ({ id: node.id, role: node.getAttribute('role'),
    options: Array.from(node.querySelectorAll('li')).map(option => ({ id: option.id, role: option.getAttribute('role'),
      selected: option.getAttribute('aria-selected'), name: option.querySelector('span')!.textContent })) })) : [],
  callbacks: selected.mock.calls.map(call => call[0]), timers: vi.getTimerCount() });
const mark = (phase: string) => { phases.push({ phase, ...snapshot() }); };
const open = () => {
  view = render(<SoccerGridSearch players={players} onSelect={selected} disabled={false} />);
  expect(document.activeElement).toBe(input());
  fireEvent.change(input(), { target: { value: 'Fixture' } });
  expect(visible()).toEqual(names); expect(items()).toHaveLength(3); mark('real-canonical-menu');
};

beforeAll(() => {
  // JSDOM supplies no physical scroll. Native Chromium owns the AX/geometry proof.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => {
  vi.useFakeTimers(); selected.mockClear(); phases = [];
  expect(view).toBeNull(); expect(document.querySelector('input[aria-label="Search for a player"]')).toBeNull();
  localStorage.clear(); sessionStorage.clear(); localStorage.setItem('a11y-held-local', '{"held":true}'); sessionStorage.setItem('a11y-held-session', 'held');
  const setupTimersBefore = vi.getTimerCount(); act(() => { vi.advanceTimersByTime(0); });
  expect(vi.getTimerCount()).toBe(0); beforeStores = stores();
  phases.push({ phase: 'pre-mount-storage-setup', setupTimersBefore, setupTimersAfter: 0 });
});
afterEach(context => {
  const final = snapshot(), pendingBeforeCleanup = vi.getTimerCount(); cleanup(); view = null;
  act(() => { vi.runOnlyPendingTimers(); });
  const pendingAfterCleanup = vi.getTimerCount(), afterStores = stores();
  cases.push({ name: context.task.name, phases, final, pendingBeforeCleanup, pendingAfterCleanup, beforeStores, afterStores });
  expect(pendingAfterCleanup).toBe(0); expect(afterStores).toBe(beforeStores); vi.useRealTimers();
});
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor); else delete (Element.prototype as Partial<Element>).scrollIntoView;
  if (!process.env.GRID_SEARCH_A11Y_TRACE_DIR) return;
  fs.mkdirSync(process.env.GRID_SEARCH_A11Y_TRACE_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.GRID_SEARCH_A11Y_TRACE_DIR, 'trace.json'), JSON.stringify({ version: 1,
    scope: 'Actual Search DOM semantics and callbacks, fictional names and fake timers. No native AX or spoken-screen-reader claim.', cases }, null, 2) + '\n');
});

describe('Soccer Grid search accessibility', () => {
  it('exposes the existing named input as a collapsed list autocomplete', () => {
    view = render(<SoccerGridSearch players={players} onSelect={selected} disabled={false} />);
    expect(document.activeElement).toBe(input()); expect(input()).toHaveAttribute('type', 'text'); mark('real-focused-input');
    expect(input().getAttribute('role'), 'The real focused Search input must expose its combobox role').toBe('combobox');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list'); expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).not.toHaveAttribute('aria-controls'); expect(input()).not.toHaveAttribute('aria-activedescendant'); expect(list()).toBeNull();
  });
  it('connects its rendered canonical list to the expanded input', () => {
    open(); expect(document.activeElement).toBe(input()); const rendered = list()!; expect(rendered.tagName).toBe('UL'); mark('rendered-list-before-relation');
    expect(input().getAttribute('aria-controls'), 'An expanded Search must reference its actual rendered canonical list').toBe(rendered.id);
    expect(input()).toHaveAttribute('aria-expanded', 'true'); expect(rendered.id).not.toBe(''); expect(rendered).toHaveAttribute('role', 'listbox');
    expect(items().every(row => row.getAttribute('role') === 'option')).toBe(true);
  });
  it('moves its valid active option while retaining native input focus', () => {
    open(); fireEvent.keyDown(input(), { key: 'ArrowDown' }); expect(document.activeElement).toBe(input());
    expect(items()[1].className).toContain('bg-accent'); expect(visible()).toEqual(names); mark('second-visible-option');
    expect(input().getAttribute('aria-activedescendant'), 'Search must reference the currently highlighted mounted canonical option').toBe(items()[1].id);
    expect(items()[1].id).not.toBe(''); expect(document.getElementById(input().getAttribute('aria-activedescendant')!)).toBe(items()[1]);
  });
  it('marks only the current rendered option as selected', () => {
    open(); fireEvent.keyDown(input(), { key: 'ArrowDown' }); expect(items()[1].className).toContain('bg-accent'); mark('second-option-before-selected-state');
    expect(items().map(row => row.getAttribute('aria-selected')), 'Exactly the highlighted canonical option must expose selected state').toEqual(['false', 'true', 'false']);
  });
  it('clears the active relation when Escape removes the popup', () => {
    open(); fireEvent.keyDown(input(), { key: 'ArrowDown' }); fireEvent.keyDown(input(), { key: 'Escape' });
    expect(list()).toBeNull(); expect(document.activeElement).toBe(input()); expect(input()).toHaveValue('Fixture'); mark('escaped-real-popup');
    expect(input().getAttribute('aria-activedescendant'), 'A closed Search must not retain an active option ID for an unmounted popup').toBeNull();
    expect(input()).not.toHaveAttribute('aria-controls'); expect(selected).not.toHaveBeenCalled();
  });
  it('keeps canonical and manual callbacks exactly once', () => {
    open(); fireEvent.keyDown(input(), { key: 'ArrowDown' }); fireEvent.submit(input().closest('form')!);
    expect(selected).toHaveBeenCalledExactlyOnceWith(names[1]); expect(input()).toHaveValue(''); expect(list()).toBeNull();
    fireEvent.change(input(), { target: { value: '  fictional missing  ' } }); fireEvent.submit(input().closest('form')!);
    expect(selected.mock.calls.map(call => call[0])).toEqual([names[1], 'Fictional Missing']); expect(input()).toHaveValue(''); mark('two-exact-callbacks');
  });
  it('gives simultaneous mounted searches separate stable namespaces', () => {
    view = render(<><SoccerGridSearch players={players} onSelect={selected} disabled={false} /><SoccerGridSearch players={players} onSelect={selected} disabled={false} /></>);
    const both = fields(); expect(both).toHaveLength(2); for (const field of both) fireEvent.change(field, { target: { value: 'Fixture' } });
    const lists = Array.from(view.container.querySelectorAll('form ul')); expect(lists).toHaveLength(2); const ids = lists.map(node => node.id); mark('two-real-mounted-menus');
    expect(ids.every(Boolean) && new Set(ids).size === 2, 'Simultaneous Search lists must have separate nonempty stable ID namespaces').toBe(true);
    expect(both.map(field => field.getAttribute('aria-controls'))).toEqual(ids);
    fireEvent.keyDown(both[1], { key: 'ArrowDown' }); expect(Array.from(view.container.querySelectorAll('form ul'), node => node.id)).toEqual(ids);
    const optionIds = Array.from(view.container.querySelectorAll('form ul li'), node => node.id); expect(new Set(optionIds).size).toBe(6);
  });
  it('omits an active relation when no canonical result exists', () => {
    open(); fireEvent.change(input(), { target: { value: 'Fictional missing' } }); expect(list()).toBeNull(); expect(input()).toHaveValue('Fictional missing');
    expect(input()).not.toHaveAttribute('aria-activedescendant'); expect(input()).not.toHaveAttribute('aria-controls'); expect(selected).not.toHaveBeenCalled(); mark('no-canonical-result');
  });
});
