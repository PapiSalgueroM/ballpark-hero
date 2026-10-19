import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerSearch } from '@/components/game/PlayerSearch';
import type { Player } from '@/types/game';

// Fictional component fixtures, not sports records.
const PURPOSE = 'Visible Enter must choose the stable exact Footle Player';
function player(name: string): Player {
  return { name, club: 'Fixture Club', nationality: 'Fixture Nation', league: 'Other', goals: 0, assists: 0,
    position: 'CM', kitNumber: null, age: 25, marketValue: 0, difficulty: 'easy' };
}
const superstrings = () => 'ABCDEFGHIJ'.split('').map(letter => player(`Aster ${letter} Fixture Target`));
const stores = () => JSON.stringify({ local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
  session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])) });
let current: any;
let caseName = '';
function checkCase(name: string, body: () => void) { it(name, () => { caseName = name; body(); }); }
const traces: any[] = [];
beforeEach(() => { vi.useFakeTimers(); expect(vi.getTimerCount()).toBe(0); current = null; });
afterEach(() => {
  if (current) {
    current.final = current.snapshot(); current.pendingBeforeCleanup = vi.getTimerCount(); cleanup();
    current.pendingAfterCleanup = vi.getTimerCount(); current.afterStores = stores();
    traces.push({ name: caseName,
      players: current.players, beforeStores: current.beforeStores, afterStores: current.afterStores,
      phases: current.phases, final: current.final, pendingBeforeCleanup: current.pendingBeforeCleanup,
      pendingAfterCleanup: current.pendingAfterCleanup });
    const dir = process.env.FOOTLE_EXACT_TRACE_DIR;
    if (dir) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'trace.json'), JSON.stringify({ version: 1, cases: traces }, null, 2) + '\n'); }
    expect(current.pendingBeforeCleanup).toBe(0); expect(current.pendingAfterCleanup).toBe(0);
    expect(current.afterStores).toBe(current.beforeStores);
  } else cleanup();
  vi.useRealTimers();
});
function mount(players: Player[], guessedNames: string[] = []) {
  const selected = vi.fn<(choice: Player) => void>();
  const view = render(<PlayerSearch players={players} guessedNames={guessedNames} onSelect={selected} />);
  const input = view.getByRole('combobox', { name: 'Search for a player' }) as HTMLInputElement;
  const options = () => [...view.container.querySelectorAll<HTMLButtonElement>('[role="option"]')];
  const snapshot = () => ({ query: input.value, focused: document.activeElement === input,
    input: { role: input.getAttribute('role'), expanded: input.getAttribute('aria-expanded'), controls: input.getAttribute('aria-controls'),
      active: input.getAttribute('aria-activedescendant'), disabled: input.disabled },
    options: options().map(option => ({ id: option.id, name: option.querySelector('span')?.textContent,
      textContent: option.textContent, role: option.getAttribute('role'), selected: option.getAttribute('aria-selected') })),
    callbacks: selected.mock.calls.map(call => ({ player: call[0], sourceIndex: players.indexOf(call[0]) })), stores: stores(), timers: vi.getTimerCount() });
  const mark = (phase: string) => current.phases.push({ phase, state: snapshot() });
  current = { players, beforeStores: stores(), phases: [], snapshot };
  const search = (query: string) => { act(() => input.focus()); fireEvent.change(input, { target: { value: query } }); };
  const key = (key: string) => fireEvent.keyDown(input, { key });
  return { input, selected, options, search, key, mark, view };
}
function submit(game: ReturnType<typeof mount>, expected: Player) {
  game.mark('before-enter'); game.key('Enter'); game.mark('after-enter');
  expect(game.selected.mock.calls.map(call => call[0].name), PURPOSE).toEqual([expected.name]);
  expect(game.selected.mock.calls[0][0]).toBe(expected);
  game.key('Enter'); expect(game.selected).toHaveBeenCalledTimes(1);
  expect(game.input).toHaveValue(''); expect(game.options()).toHaveLength(0); expect(game.input).toHaveFocus();
}
describe('Footle exact name priority', () => {
  checkCase('selects the exact canonical tail after ten equal-score superstrings', () => {
    const exact = player('Fixture Target'), game = mount([...superstrings(), exact]);
    game.search('Fixture Target'); expect(game.options()).toHaveLength(10); game.mark('candidate'); submit(game, exact);
  });
  checkCase('selects the exact tail with case and repeated query whitespace', () => {
    const exact = player('Fixture Target'), game = mount([...superstrings(), exact]);
    game.search('  fIxTuRe \t tArGeT  '); expect(game.options()).toHaveLength(10); game.mark('candidate'); submit(game, exact);
  });
  checkCase('keeps equivalent exact order and selects its second canonical Player', () => {
    const first = player('FIXTURE Target'), second = player('Fixture  Target');
    const game = mount([...superstrings(), first, second]);
    game.search('fixture target'); expect(game.options()).toHaveLength(10); game.mark('candidate');
    game.key('ArrowDown'); game.mark('second-choice'); submit(game, second);
  });
  checkCase('preserves nonexact smartScore order incoming ties cap and bounded arrows', () => {
    const ranked = 'ABCDEFGHIJK'.split('').map(letter => player(`Alpha ${letter} Fixture`));
    const game = mount([player('Xal Fixture'), ...ranked, player('Àlpha Excluded')]);
    game.search('al');
    expect(game.options().map(option => option.querySelector('span')?.textContent)).toEqual(ranked.slice(0, 10).map(choice => choice.name));
    game.mark('candidate'); game.key('ArrowUp'); for (let i = 0; i < 20; i += 1) game.key('ArrowDown');
    game.key('ArrowUp'); game.mark('bounded-choice'); submit(game, ranked[8]);
  });
  checkCase('excludes guessed exact names with the existing case-only comparison', () => {
    const pool = superstrings(), exact = player('Fixture Target'), game = mount([...pool, exact], ['fIxTuRe TaRgEt']);
    game.search('Fixture Target'); expect(game.options()).toHaveLength(10);
    expect(game.options().map(option => option.querySelector('span')?.textContent)).toEqual(pool.map(choice => choice.name));
    game.mark('candidate'); submit(game, pool[0]);
  });
  checkCase('keeps an already first exact pointer selection and original object identity', () => {
    const exact = player('Fixture Target'), game = mount([exact, ...superstrings()]);
    game.search('Fixture Target'); game.mark('candidate');
    fireEvent.click(game.options()[0]); game.mark('after-pointer');
    expect(game.selected).toHaveBeenCalledTimes(1); expect(game.selected.mock.calls[0][0]).toBe(exact);
    expect(game.input).toHaveValue(''); expect(game.options()).toHaveLength(0); expect(game.input).toHaveFocus();
  });
  checkCase('keeps hidden Enter inert and deliberately reopens before canonical Enter', () => {
    const exact = player('Fixture Target'), game = mount([exact, ...superstrings()]);
    game.search('Fixture Target'); game.mark('candidate'); game.key('Escape'); game.mark('after-escape');
    game.key('Enter'); expect(game.selected).not.toHaveBeenCalled(); expect(game.options()).toHaveLength(0);
    game.key('ArrowDown'); game.mark('after-reopen'); submit(game, exact);
  });
  checkCase('keeps blank one-character and unmatched queries inert', () => {
    const game = mount([player('Fixture Target')]);
    for (const query of ['', 'F', '   ', 'zzqxvv']) {
      game.search(query); game.mark('query-' + JSON.stringify(query));
      for (const key of ['ArrowDown', 'ArrowUp', 'Enter']) game.key(key);
      expect(game.options()).toHaveLength(0); expect(game.selected).not.toHaveBeenCalled();
    }
    expect(game.view.getByText('No players found')).toBeVisible();
  });
});