import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';

vi.mock('@/components/FlagImg', () => ({ FlagImg: ({ name }: { name: string }) => <span>{name}</span> }));

const PURPOSE = 'Enter must select the stable exact normalized catalog name';
const anchor = 'Fixture Anchor';
const superstrings = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => `Aster ${letter} Fixture Target`);
const capNames = Array.from({ length: 10 }, (_, index) => `Fixture Pool ${index}`);
const specs = [
  { title: 'selects an exact catalog tail after eight earlier substring matches', names: [...superstrings, anchor, 'Fixture Target'], query: 'Fixture Target', expected: ['Fixture Target'], action: 'submit' },
  { title: 'selects the normalized equivalent exact catalog tail', names: [...superstrings, anchor, 'Fixture Tárget'], query: 'fixture target', expected: ['Fixture Tárget'], action: 'submit' },
  { title: 'preserves equivalent exact tie order and selects its second canonical spelling', names: ['Aster A Fixture Target', 'Fixture Tárget', 'Aster B Fixture Target', 'Fixture Target', 'Aster C Fixture Target', anchor], query: 'fixture target', expected: ['Fixture Target'], action: 'second' },
  { title: 'keeps the first eight incoming nonexact matches and bounded arrows', names: [...capNames, anchor], query: 'Fixture Pool', expected: ['Fixture Pool 6'], action: 'cap' },
  { title: 'keeps an already first exact canonical selection', names: ['Fixture Existing', 'Fixture Existing Extra', anchor], query: 'Fixture Existing', expected: ['Fixture Existing'], action: 'submit' },
  { title: 'keeps unmatched manual entry title casing', names: [anchor, 'Fixture Other'], query: '  fictional missing  ', expected: ['Fictional Missing'], action: 'manual' },
  { title: 'keeps raw one-character and all-whitespace gates', names: [anchor, 'Fixture Other'], query: 'F', expected: [], action: 'gates' },
  { title: 'keeps Escape and expired blur followed by canonical refocus', names: [anchor, 'Fixture Escape'], query: 'Fixture Escape', expected: ['Fixture Escape'], action: 'refocus' },
];
const selected = vi.fn();
const cases: unknown[] = [];
let view: ReturnType<typeof render> | null = null;
let phases: unknown[] = [], beforeStores = '';
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, index) => storage.key(index)!).sort().map(key => [key, storage.getItem(key)])));
const input = () => view!.getByRole('combobox', { name: 'Search for a player' }) as HTMLInputElement;
const snapshot = () => {
  const field = view?.queryByRole('combobox', { name: 'Search for a player' }) as HTMLInputElement | null;
  const list = view?.container.querySelector('ul') ?? null;
  return { query: field?.value ?? null, focused: !!field && document.activeElement === field,
    input: field ? { role: field.getAttribute('role'), expanded: field.getAttribute('aria-expanded'), controls: field.getAttribute('aria-controls'), active: field.getAttribute('aria-activedescendant'), disabled: field.disabled } : null,
    list: list ? { id: list.id, role: list.getAttribute('role'), options: Array.from(list.querySelectorAll('li')).map(option => ({ id: option.id,
      role: option.getAttribute('role'), selected: option.getAttribute('aria-selected'), name: option.querySelector('span')!.textContent })) } : null,
    callbacks: selected.mock.calls.map(call => call[0]), timers: vi.getTimerCount(), stores: stores(), randomCalls: vi.mocked(Math.random).mock.calls.length };
};
const mark = (phase: string) => { phases.push({ phase, state: snapshot() }); };

beforeAll(() => {
  // JSDOM has no layout. The built-route method owns real Enter and AX geometry.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => {
  vi.useFakeTimers(); selected.mockClear(); phases = [];
  expect(view).toBeNull();
  const hadLocal = localStorage.length > 0, hadSession = sessionStorage.length > 0;
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('exact-name-held-local', '{"held":true}'); sessionStorage.setItem('exact-name-held-session', 'held');
  const setupTimersBefore = vi.getTimerCount();
  expect(setupTimersBefore).toBe(2 + Number(hadLocal) + Number(hadSession));
  act(() => { vi.runOnlyPendingTimers(); }); expect(vi.getTimerCount()).toBe(0);
  beforeStores = stores(); vi.spyOn(Math, 'random');
  phases.push({ phase: 'pre-mount-storage-setup', hadLocal, hadSession, setupTimersBefore, setupTimersAfter: 0 });
});
afterEach(context => {
  const final = snapshot(), pendingBeforeCleanup = vi.getTimerCount();
  cleanup(); view = null; act(() => { vi.runOnlyPendingTimers(); });
  const pendingAfterCleanup = vi.getTimerCount(), afterStores = stores(), randomCalls = vi.mocked(Math.random).mock.calls.length;
  cases.push({ name: context.task.name, phases, final, pendingBeforeCleanup, pendingAfterCleanup, beforeStores, afterStores, randomCalls });
  expect(pendingBeforeCleanup).toBe(0); expect(pendingAfterCleanup).toBe(0); expect(afterStores).toBe(beforeStores); expect(randomCalls).toBe(0);
  vi.restoreAllMocks(); vi.useRealTimers();
});
afterAll(() => {
  if (scrollDescriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollDescriptor);
  else delete (Element.prototype as Partial<Element>).scrollIntoView;
  const directory = process.env.SOCCER_GRID_EXACT_NAME_TRACE_DIR;
  if (directory) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'trace.json'), JSON.stringify({ version: 1,
    scope: 'Actual Search menu order and canonical callbacks. Fictional names; unit keydown plus form submit models Enter. Native Enter and AX are separate.', cases }, null, 2) + '\n'); }
});

describe('Soccer Grid exact name priority', () => {
  for (const spec of specs) it(spec.title, () => {
    const players = spec.names.map(name => ({ name, nationality: 'Fixture Nation', position: 'Fixture Position' }));
    view = render(<SoccerGridSearch players={players} onSelect={selected} disabled={false} />);
    expect(document.activeElement).toBe(input());
    fireEvent.change(input(), { target: { value: anchor } });
    expect(view.getByRole('option').querySelector('span')).toHaveTextContent(anchor);
    expect(input()).toHaveAttribute('aria-expanded', 'true'); mark('canonical-anchor-available');
    fireEvent.change(input(), { target: { value: spec.query } });
    expect(input()).toHaveValue(spec.query); expect(document.activeElement).toBe(input()); mark('candidate-query');
    if (spec.action === 'second') fireEvent.keyDown(input(), { key: 'ArrowDown' });
    if (spec.action === 'cap') {
      expect(Array.from(view.getAllByRole('option')).map(option => option.querySelector('span')!.textContent)).toEqual(capNames.slice(0, 8));
      for (let count = 0; count < 20; count++) fireEvent.keyDown(input(), { key: 'ArrowDown' });
      expect(view.getAllByRole('option')[7]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(input(), { key: 'ArrowUp' });
    }
    if (spec.action === 'gates') {
      expect(view.queryByRole('listbox')).toBeNull(); expect(view.getByRole('button', { name: 'Submit' })).toBeDisabled(); mark('raw-one-character');
      fireEvent.change(input(), { target: { value: '  ' } });
      expect(view.queryByRole('listbox')).toBeNull(); expect(view.getByRole('button', { name: 'Submit' })).toBeDisabled(); mark('all-whitespace');
    } else {
      if (spec.action === 'manual') expect(view.queryByRole('listbox')).toBeNull();
      if (spec.action === 'refocus') {
        fireEvent.keyDown(input(), { key: 'Escape' }); expect(view.queryByRole('listbox')).toBeNull(); mark('after-escape');
        act(() => { input().blur(); }); act(() => { vi.advanceTimersByTime(150); });
        expect(view.queryByRole('listbox')).toBeNull(); mark('after-expired-blur');
        act(() => { input().focus(); }); expect(view.getByRole('option').querySelector('span')).toHaveTextContent('Fixture Escape'); mark('after-refocus');
      }
      mark('before-enter-submit'); fireEvent.keyDown(input(), { key: 'Enter', code: 'Enter' }); fireEvent.submit(input().closest('form')!); mark('after-enter-submit');
    }
    expect(players.map(player => player.name)).toEqual(spec.names);
    expect(selected.mock.calls.map(call => call[0]), PURPOSE).toEqual(spec.expected);
    if (spec.action !== 'gates') { expect(input()).toHaveValue(''); expect(view.queryByRole('listbox')).toBeNull(); expect(selected).toHaveBeenCalledTimes(1); }
  });
});
