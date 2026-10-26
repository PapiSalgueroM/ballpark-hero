import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import type { PlayerSourceConfig } from '@/lib/playerSearch';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from() { throw new Error('The fictional local source must not use remote transport'); } },
}));

function Picker() {
  const [value, setValue] = useState('');
  const source = useMemo<PlayerSourceConfig>(() => ({
    table: 'fictional-highlight-fixture', nameColumn: 'player_name',
    local: async () => Array.from({ length: 15 }, (_, index) => ({
      player_name: 'Fixture Picker ' + String(index).padStart(2, '0'),
    })),
  }), []);
  return <PlayerAutocomplete value={value} onChange={setValue} onSelect={() => {}}
    searchOptions={{ source, minChars: 0, limit: 15 }} debounceMs={0} validateOnly />;
}

/* JSDOM has no layout. These rectangles describe actual rendered options inside
 * one scrollable list. This is a DOM behavior check, not painted-browser evidence. */
function layout(list: HTMLElement, options: HTMLElement[], initialScroll = 0) {
  Object.defineProperties(list, {
    clientTop: { configurable: true, value: 1 },
    clientHeight: { configurable: true, value: 132 },
  });
  list.scrollTop = initialScroll;
  vi.spyOn(list, 'getBoundingClientRect').mockImplementation(() => ({
    x: 20, y: 200, left: 20, right: 320, top: 200, bottom: 334,
    width: 300, height: 134, toJSON: () => ({}),
  }));
  for (const [index, option] of options.entries()) {
    vi.spyOn(option, 'getBoundingClientRect').mockImplementation(() => {
      const top = 201 + index * 44 - list.scrollTop;
      return { x: 21, y: top, left: 21, right: 319, top, bottom: top + 44,
        width: 298, height: 44, toJSON: () => ({}) };
    });
  }
}
function bodyPosition() {
  return { document: document.documentElement.scrollTop, body: document.body.scrollTop,
    x: window.scrollX, y: window.scrollY };
}
function activeInside(list: HTMLElement, option: HTMLElement, marker: string) {
  const box = list.getBoundingClientRect(), row = option.getBoundingClientRect();
  const top = box.top + list.clientTop, bottom = top + list.clientHeight;
  expect(row.top >= top && row.bottom <= bottom, marker).toBe(true);
}
async function open() {
  render(<Picker />);
  const options = await screen.findAllByRole('option') as HTMLElement[];
  expect(options).toHaveLength(15);
  const list = screen.getByRole('listbox'), input = screen.getByRole('combobox') as HTMLInputElement;
  input.focus();
  return { options, list, input };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; });

describe('Player autocomplete highlighted option stays in its list', () => {
  it('reveals a lower and wrapped option without moving the page or input focus', async () => {
    const { options, list, input } = await open();
    layout(list, options);
    document.documentElement.scrollTop = 137; document.body.scrollTop = 73;
    const before = bodyPosition();
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[14]).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => activeInside(list, options[14], 'PLAYER_PICKER_HIGHLIGHT_VISIBLE: lower option'));
    expect(list.scrollTop).toBeGreaterThan(0);
    expect(bodyPosition()).toEqual(before);
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => activeInside(list, options[0], 'PLAYER_PICKER_HIGHLIGHT_VISIBLE: wrapped option'));
    expect(bodyPosition()).toEqual(before);
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('Fixture Picker 00');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(bodyPosition()).toEqual(before);
  });

  it('keeps an already visible highlighted option at the existing list position', async () => {
    const { options, list, input } = await open();
    layout(list, options);
    const before = bodyPosition();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    activeInside(list, options[0], 'PLAYER_PICKER_HIGHLIGHT_VISIBLE: first visible option');
    expect(list.scrollTop).toBe(0);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    activeInside(list, options[1], 'PLAYER_PICKER_HIGHLIGHT_VISIBLE: second visible option');
    expect(list.scrollTop).toBe(0);
    expect(bodyPosition()).toEqual(before);
    expect(input).toHaveFocus();
  });
});
