import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Search from '@/pages/Search';

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search-location">{location.pathname + location.search}</output>;
}

function mount() {
  const view = render(<HelmetProvider><MemoryRouter initialEntries={['/search?q=career&source=composition&tag=one&tag=two']}>
    <Search /><LocationProbe />
  </MemoryRouter></HelmetProvider>);
  const field = view.getByRole('textbox', { name: 'Search games' }) as HTMLInputElement;
  const results = () => Array.from(view.container.querySelectorAll<HTMLAnchorElement>('a[data-result]'));
  expect(results().length, 'SEARCH_REAL_RESULTS_PRESENT').toBeGreaterThan(1);
  field.focus();
  return { ...view, field, results, route: () => view.getByTestId('search-location').textContent };
}

function key(target: HTMLElement, name: string, mode: 'ordinary' | 'modern' | 'legacy' = 'ordinary') {
  const event = new KeyboardEvent('keydown', {
    key: name, bubbles: true, cancelable: true, isComposing: mode === 'modern',
    keyCode: mode === 'legacy' ? 229 : 0,
  });
  expect(event.isComposing, 'SEARCH_EVENT_COMPOSITION_SIGNAL').toBe(mode === 'modern');
  expect(event.keyCode, 'SEARCH_EVENT_LEGACY_SIGNAL').toBe(mode === 'legacy' ? 229 : 0);
  fireEvent(target, event);
  return event;
}

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });

describe('Search composition keyboard ownership', () => {
  for (const mode of ['modern', 'legacy'] as const) {
    it.each(['ArrowDown', 'ArrowUp', 'Escape'] as const)(`does not consume ${mode} composing %s`, name => {
      const view = mount();
      const before = { query: view.field.value, route: view.route(), results: view.results() };
      const event = key(view.field, name, mode);
      expect(event.defaultPrevented, `SEARCH_COMPOSITION_${mode.toUpperCase()}_${name.toUpperCase()}_UNCONSUMED`).toBe(false);
      expect(document.activeElement, 'SEARCH_COMPOSITION_RETAINS_INPUT_FOCUS').toBe(view.field);
      expect(view.field.value, 'SEARCH_COMPOSITION_RETAINS_QUERY').toBe(before.query);
      expect(view.route(), 'SEARCH_COMPOSITION_RETAINS_ROUTE').toBe(before.route);
      expect(view.results(), 'SEARCH_COMPOSITION_RETAINS_RESULTS').toEqual(before.results);
    });
  }

  it('keeps ordinary ArrowDown navigation through actual results', () => {
    const view = mount();
    const links = view.results();
    expect(key(view.field, 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement, 'SEARCH_ORDINARY_DOWN_FIRST_RESULT').toBe(links[0]);
    expect(key(links[0], 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement, 'SEARCH_ORDINARY_DOWN_NEXT_RESULT').toBe(links[1]);
    expect(view.field.value).toBe('career');
  });

  it('keeps ordinary ArrowUp navigation through actual results', () => {
    const view = mount();
    const links = view.results();
    expect(key(view.field, 'ArrowUp').defaultPrevented).toBe(true);
    expect(document.activeElement, 'SEARCH_ORDINARY_UP_LAST_RESULT').toBe(links[links.length - 1]);
    expect(key(links[links.length - 1], 'ArrowUp').defaultPrevented).toBe(true);
    expect(document.activeElement, 'SEARCH_ORDINARY_UP_PREVIOUS_RESULT').toBe(links[links.length - 2]);
    expect(view.field.value).toBe('career');
  });

  it('keeps ordinary Escape clearing and the empty-query no-op', async () => {
    const view = mount();
    const first = view.results()[0];
    first.focus();
    expect(key(first, 'Escape').defaultPrevented).toBe(true);
    expect(view.field.value, 'SEARCH_ORDINARY_ESCAPE_CLEARS_QUERY').toBe('');
    expect(document.activeElement, 'SEARCH_ORDINARY_ESCAPE_RETURNS_INPUT').toBe(view.field);
    await act(async () => { vi.advanceTimersByTime(250); });
    const url = new URL(view.route()!, 'https://example.test');
    expect(url.searchParams.has('q'), 'SEARCH_ORDINARY_ESCAPE_CLEARS_URL_QUERY').toBe(false);
    expect(url.searchParams.get('source')).toBe('composition');
    expect(url.searchParams.getAll('tag')).toEqual(['one', 'two']);
    const before = view.route();
    expect(key(view.field, 'Escape').defaultPrevented, 'SEARCH_EMPTY_ESCAPE_UNCONSUMED').toBe(false);
    expect(view.field.value).toBe('');
    expect(document.activeElement).toBe(view.field);
    expect(view.route()).toBe(before);
  });

  it('leaves ordinary Left and Right in the input to native text editing', () => {
    const view = mount();
    view.field.setSelectionRange(3, 3);
    for (const name of ['ArrowLeft', 'ArrowRight']) {
      expect(key(view.field, name).defaultPrevented, 'SEARCH_CURSOR_KEYS_UNCONSUMED').toBe(false);
      expect(document.activeElement).toBe(view.field);
      expect(view.field.value).toBe('career');
    }
  });

  it('leaves native sport select keys and filtering intact', () => {
    const view = mount();
    const select = view.getByRole('combobox', { name: 'Filter by sport' }) as HTMLSelectElement;
    expect(select.options.length, 'SEARCH_REAL_SPORT_OPTIONS_PRESENT').toBeGreaterThan(1);
    const choice = select.options[1].value;
    select.focus();
    for (const name of ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Escape']) {
      expect(key(select, name).defaultPrevented, 'SEARCH_SELECT_KEYS_UNCONSUMED').toBe(false);
      expect(document.activeElement).toBe(select);
      expect(view.field.value).toBe('career');
    }
    fireEvent.change(select, { target: { value: choice } });
    expect(select.value, 'SEARCH_NATIVE_SPORT_CHOICE_APPLIED').toBe(choice);
    const headings = Array.from(view.container.querySelectorAll('main section > h2'));
    expect(headings, 'SEARCH_SPORT_FILTER_HAS_ONE_GROUP').toHaveLength(1);
    expect(headings[0].textContent).toContain(choice);
    expect(view.results().length).toBeGreaterThan(0);
  });
});
