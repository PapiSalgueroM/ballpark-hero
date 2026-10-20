import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { computeAccessibleName } from 'dom-accessibility-api';
import { writeFileSync } from 'node:fs';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { SoccerGridBoard } from '@/components/soccer-grid/SoccerGridBoard';
import type { CellState } from '@/types/footballGrid';

const puzzle = {
  id: 'fictional-grid-names',
  rows: ['Copper row', 'Maple row', 'Violet row'].map(label => ({ label, type: 'misc' as const })),
  cols: ['North column', 'East column', 'West column'].map(label => ({ label, type: 'misc' as const })),
};
const changedPuzzle = {
  id: 'fictional-grid-names',
  rows: ['Amber row', 'Birch row', 'Cobalt row'].map(label => ({ label, type: 'misc' as const })),
  cols: ['Upper column', 'Middle column', 'Lower column'].map(label => ({ label, type: 'misc' as const })),
};
const emptyNames = [
  'Copper row, North column: Choose a player', 'Copper row, East column: Choose a player', 'Copper row, West column: Choose a player',
  'Maple row, North column: Choose a player', 'Maple row, East column: Choose a player', 'Maple row, West column: Choose a player',
  'Violet row, North column: Choose a player', 'Violet row, East column: Choose a player', 'Violet row, West column: Choose a player',
];
const wrongNames = [
  'Copper row, North column: Try again', 'Copper row, East column: Try again', 'Copper row, West column: Try again',
  'Maple row, North column: Try again', 'Maple row, East column: Try again', 'Maple row, West column: Try again',
  'Violet row, North column: Try again', 'Violet row, East column: Try again', 'Violet row, West column: Try again',
];
const correctNames = [
  'Copper row, North column: Correct', 'Copper row, East column: Correct', 'Copper row, West column: Correct',
  'Maple row, North column: Correct', 'Maple row, East column: Correct', 'Maple row, West column: Correct',
  'Violet row, North column: Correct', 'Violet row, East column: Correct', 'Violet row, West column: Correct',
];
const completedNames = [
  'Copper row, North column: Correct Fictional Player One 3% picked this 💎 Diamond',
  'Copper row, East column: Correct Fictional Player Two 3% picked this 💎 Diamond',
  'Copper row, West column: Correct Fictional Player Three 3% picked this 💎 Diamond',
  'Maple row, North column: Correct Fictional Player Four 3% picked this 💎 Diamond',
  'Maple row, East column: Correct Fictional Player Five 3% picked this 💎 Diamond',
  'Maple row, West column: Correct Fictional Player Six 3% picked this 💎 Diamond',
  'Violet row, North column: Correct Fictional Player Seven 3% picked this 💎 Diamond',
  'Violet row, East column: Correct Fictional Player Eight 3% picked this 💎 Diamond',
  'Violet row, West column: Correct Fictional Player Nine 3% picked this 💎 Diamond',
];
const nextNames = [
  'Amber row, Upper column: Choose a player', 'Amber row, Middle column: Choose a player', 'Amber row, Lower column: Choose a player',
  'Birch row, Upper column: Choose a player', 'Birch row, Middle column: Choose a player', 'Birch row, Lower column: Choose a player',
  'Cobalt row, Upper column: Choose a player', 'Cobalt row, Middle column: Choose a player', 'Cobalt row, Lower column: Choose a player',
];
const players = ['Fictional Player One', 'Fictional Player Two', 'Fictional Player Three', 'Fictional Player Four', 'Fictional Player Five', 'Fictional Player Six', 'Fictional Player Seven', 'Fictional Player Eight', 'Fictional Player Nine'];
const emptyCells = (): CellState[] => Array.from({ length: 9 }, (_, index) => ({ index, status: 'empty', playerName: null, rarity: null }));
type Props = { puzzle: typeof puzzle; cells: CellState[]; activeCell: number | null; onCellClick: (index: number) => void };
type View = ReturnType<typeof render>;
const trace: object[] = [];
const traceFile = process.env.GRID_CELL_NAMES_TRACE;
function capture(variant: string, id: string, phase: string, view: View) {
  const buttons = view.getAllByRole('button');
  trace.push({ variant, id, phase, buttons: buttons.map(button => ({
    name: computeAccessibleName(button), text: button.textContent, html: button.outerHTML,
    disabled: (button as HTMLButtonElement).disabled, status: button.getAttribute('data-grid-cell-status'),
  })), focusedIndex: buttons.indexOf(document.activeElement as HTMLButtonElement), html: view.container.innerHTML });
}
function names(view: View, expected: string[]) {
  const buttons = view.getAllByRole('button');
  expect(buttons).toHaveLength(9);
  buttons.forEach((button, index) => expect(button).toHaveAccessibleName(expected[index]));
}
afterEach(() => {
  if (traceFile) writeFileSync(traceFile, JSON.stringify({ version: 1, records: trace }, null, 2) + '\n');
  cleanup();
});
const variants = [
  { name: 'Football', draw: (props: Props) => <GridBoard {...props} /> },
  { name: 'College', draw: (props: Props) => <GridBoard {...props} accentVar="--cg-green" headerBgVar="--cg-header" /> },
  { name: 'Soccer', draw: (props: Props) => <SoccerGridBoard {...props} /> },
];

describe.each(variants)('$name grid cell names', ({ name, draw }) => {
  it('announces all nine literal empty coordinates and actions', () => {
    const view = render(draw({ puzzle, cells: emptyCells(), activeCell: null, onCellClick: vi.fn() }));
    capture(name, '01', 'empty', view);
    names(view, emptyNames);
    for (const clue of ['Copper row', 'Maple row', 'Violet row', 'North column', 'East column', 'West column']) expect(view.getByText(clue, { exact: true })).toBeVisible();
    view.getAllByRole('button').forEach(button => expect(within(button).getByText('+')).toBeVisible());
  });
  it('announces all nine wrong actions without decorative crosses', () => {
    const cells = emptyCells().map(cell => ({ ...cell, status: 'wrong' as const }));
    const view = render(draw({ puzzle, cells, activeCell: 4, onCellClick: vi.fn() }));
    capture(name, '02', 'wrong', view);
    names(view, wrongNames);
    view.getAllByRole('button').forEach(button => { expect(button).toBeEnabled(); expect(within(button).getByText('✗')).toBeVisible(); });
  });
  it('announces correct without a player while retaining the disabled fallback', () => {
    const cells = emptyCells().map(cell => ({ ...cell, status: 'correct' as const }));
    const view = render(draw({ puzzle, cells, activeCell: null, onCellClick: vi.fn() }));
    capture(name, '03', 'correct-null', view);
    names(view, correctNames);
    view.getAllByRole('button').forEach(button => { expect(button).toBeDisabled(); expect(within(button).getByText('+')).toBeVisible(); });
  });
  it('retains completed full player rarity and badge names', () => {
    const cells = emptyCells().map((cell, index) => ({ ...cell, status: 'correct' as const, playerName: players[index], rarity: 3 }));
    const view = render(draw({ puzzle, cells, activeCell: null, onCellClick: vi.fn() }));
    capture(name, '04', 'completed', view);
    names(view, completedNames);
    view.getAllByRole('button').forEach((button, index) => {
      expect(button).toBeDisabled(); expect(within(button).getByTitle(players[index])).toHaveTextContent(players[index]);
      expect(within(button).getByText('3% picked this')).toBeVisible(); expect(within(button).getByText('💎 Diamond')).toBeVisible();
    });
  });
  it('updates all coordinate names when puzzle labels change', () => {
    const cells = emptyCells(), onCellClick = vi.fn();
    const view = render(draw({ puzzle, cells, activeCell: 4, onCellClick }));
    capture(name, '05', 'before-labels', view);
    const original = view.getAllByRole('button');
    view.rerender(draw({ puzzle: changedPuzzle, cells, activeCell: 4, onCellClick }));
    capture(name, '05', 'after-labels', view);
    names(view, nextNames);
    view.getAllByRole('button').forEach((button, index) => expect(button).toBe(original[index]));
  });
  it('preserves enabled identity focus active changes and callback indices', () => {
    const cells = emptyCells(), onCellClick = vi.fn();
    const view = render(draw({ puzzle, cells, activeCell: 4, onCellClick }));
    const original = view.getAllByRole('button'), target = original[4];
    target.focus(); original.forEach(button => fireEvent.click(button));
    capture(name, '06', 'before-active', view);
    view.rerender(draw({ puzzle, cells, activeCell: 0, onCellClick }));
    capture(name, '06', 'after-active', view);
    expect(view.getAllByRole('button')[4]).toBe(target); expect(target).toHaveFocus();
    const wrong = cells.map(cell => cell.index === 4 ? { ...cell, status: 'wrong' as const } : cell);
    view.rerender(draw({ puzzle, cells: wrong, activeCell: 4, onCellClick }));
    capture(name, '06', 'wrong', view);
    expect(view.getAllByRole('button')[4]).toBe(target); expect(target).toBeEnabled(); expect(target).toHaveFocus(); fireEvent.click(target);
    view.rerender(draw({ puzzle, cells, activeCell: 4, onCellClick }));
    capture(name, '06', 'empty-again', view);
    expect(view.getAllByRole('button')[4]).toBe(target); expect(target).toHaveFocus(); fireEvent.click(target);
    expect(onCellClick.mock.calls).toEqual([[0], [1], [2], [3], [4], [5], [6], [7], [8], [4], [4]]);
  });
  it('preserves correct locks complete visible content and input records', () => {
    const cells = emptyCells(), onCellClick = vi.fn(), before = JSON.stringify({ puzzle, cells });
    const view = render(draw({ puzzle, cells, activeCell: 4, onCellClick })), original = view.getAllByRole('button');
    capture(name, '07', 'before-locks', view);
    const settled = cells.map(cell => cell.index === 4 ? { ...cell, status: 'correct' as const, playerName: players[4], rarity: 3 } : cell.index === 5 ? { ...cell, status: 'correct' as const } : cell);
    const settledBefore = JSON.stringify(settled);
    view.rerender(draw({ puzzle, cells: settled, activeCell: null, onCellClick }));
    capture(name, '07', 'after-locks', view);
    const buttons = view.getAllByRole('button');
    expect(buttons[4]).toBe(original[4]); expect(buttons[5]).toBe(original[5]);
    expect(buttons[4]).toBeDisabled(); expect(buttons[5]).toBeDisabled();
    expect(within(buttons[4]).getByTitle(players[4])).toHaveTextContent(players[4]); expect(within(buttons[4]).getByText('3% picked this')).toBeVisible();
    expect(within(buttons[5]).getByText('+')).toBeVisible();
    fireEvent.click(buttons[4]); fireEvent.click(buttons[5]); expect(onCellClick).not.toHaveBeenCalled();
    expect(JSON.stringify({ puzzle, cells })).toBe(before); expect(JSON.stringify(settled)).toBe(settledBefore);
  });
});
