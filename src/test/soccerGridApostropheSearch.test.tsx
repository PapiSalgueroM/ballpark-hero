import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';

vi.mock('@/components/FlagImg', () => ({ FlagImg: ({ name }: { name: string }) => <span>{name}</span> }));

const straight = "Fixture N'Ara";
const curly = 'Fixture N\u2019Ara';
const PURPOSE = 'Enter must deliver the existing catalog spelling';
const specs = [
  { title: 'selects the straight catalog spelling after a right-curly query', catalog: straight, query: curly, expected: straight, alternate: true },
  { title: 'selects the right-curly catalog spelling after a straight query', catalog: curly, query: straight, expected: curly, alternate: true },
  { title: 'keeps an existing straight canonical selection', catalog: straight, query: straight, expected: straight, menu: true },
  { title: 'keeps an existing right-curly canonical selection', catalog: curly, query: curly, expected: curly, menu: true },
  { title: 'keeps a truly unmatched manual entry title-cased', catalog: straight, query: '  fictional missing  ', expected: 'Fictional Missing', menu: false },
  { title: 'keeps a left-curly apostrophe distinct for manual entry', catalog: straight, query: 'Fixture N\u2018Ara', expected: 'Fixture N\u2018Ara', menu: false },
];
const selected = vi.fn();
const cases: unknown[] = [];
let view: ReturnType<typeof render> | null = null;
let phases: unknown[] = [], beforeStores = '';
const scrollDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
const stores = () => JSON.stringify([localStorage, sessionStorage].map(storage => Array.from({ length: storage.length }, (_, i) => storage.key(i)!).sort().map(key => [key, storage.getItem(key)])));
const input = () => view!.getByRole('combobox', { name: 'Search for a player' }) as HTMLInputElement;
const snapshot = () => {
  const field = view?.queryByRole('combobox', { name: 'Search for a player' }) as HTMLInputElement | null;
  const list = view?.container.querySelector('ul') ?? null;
  return { query: field?.value ?? null, focused: !!field && document.activeElement === field,
    input: field ? { role: field.getAttribute('role'), expanded: field.getAttribute('aria-expanded'), controls: field.getAttribute('aria-controls'), active: field.getAttribute('aria-activedescendant') } : null,
    list: list ? { id: list.id, role: list.getAttribute('role'), options: Array.from(list.querySelectorAll('li')).map(option => ({ id: option.id,
      role: option.getAttribute('role'), selected: option.getAttribute('aria-selected'), name: option.querySelector('span')!.textContent })) } : null,
    callbacks: selected.mock.calls.map(call => call[0]), timers: vi.getTimerCount(), stores: stores(), randomCalls: vi.mocked(Math.random).mock.calls.length };
};
const mark = (phase: string) => { phases.push({ phase, state: snapshot() }); };

beforeAll(() => {
  // JSDOM has no layout; native route proof owns actual Enter and AX geometry.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: vi.fn() });
});
beforeEach(() => {
  vi.useFakeTimers(); selected.mockClear(); phases = [];
  expect(view).toBeNull();
  const hadLocal = localStorage.length > 0, hadSession = sessionStorage.length > 0;
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('apostrophe-held-local', '{"held":true}'); sessionStorage.setItem('apostrophe-held-session', 'held');
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
  const directory = process.env.SOCCER_GRID_APOSTROPHE_TRACE_DIR;
  if (directory) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(path.join(directory, 'trace.json'), JSON.stringify({ version: 1,
    scope: 'Actual Search callbacks and DOM. Fictional names; unit keydown plus real form submit models Enter default. Native Enter/AX is separate.', cases }, null, 2) + '\n'); }
});

describe('Soccer Grid apostrophe search', () => {
  for (const spec of specs) it(spec.title, () => {
    view = render(<SoccerGridSearch players={[{ name: spec.catalog, nationality: 'Fixture Nation', position: 'Fixture Position' }]} onSelect={selected} disabled={false} />);
    expect(document.activeElement).toBe(input());
    fireEvent.change(input(), { target: { value: spec.catalog } });
    expect(view.getByRole('option').querySelector('span')).toHaveTextContent(spec.catalog);
    expect(input()).toHaveAttribute('aria-expanded', 'true'); mark('canonical-available');
    fireEvent.change(input(), { target: { value: spec.query } });
    expect(input()).toHaveValue(spec.query); expect(document.activeElement).toBe(input());
    if (!spec.alternate) expect(view.queryByRole('option') !== null).toBe(spec.menu);
    mark('candidate-query');
    fireEvent.keyDown(input(), { key: 'Enter', code: 'Enter' });
    fireEvent.submit(input().closest('form')!);
    mark('after-enter-submit');
    expect(selected.mock.calls.map(call => call[0]), PURPOSE).toEqual([spec.expected]);
    expect(input()).toHaveValue(''); expect(view.queryByRole('listbox')).toBeNull(); expect(selected).toHaveBeenCalledTimes(1);
  });
});
