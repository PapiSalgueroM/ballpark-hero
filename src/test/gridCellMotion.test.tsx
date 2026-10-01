import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { SoccerGridBoard } from '@/components/soccer-grid/SoccerGridBoard';
import motion from '@/components/game/GridCellMotion.module.css';
import type { CellState } from '@/types/footballGrid';

const puzzle = {
  id: 'motion-fixture',
  rows: ['First row', 'Second row', 'Third row'].map(label => ({ label, type: 'misc' as const })),
  cols: ['First column', 'Second column', 'Third column'].map(label => ({ label, type: 'misc' as const })),
};

const emptyCells = (): CellState[] => Array.from({ length: 9 }, (_, index) => ({
  index, status: 'empty', playerName: null, rarity: null,
}));

afterEach(cleanup);

describe.each([
  { name: 'football', Board: GridBoard },
  { name: 'soccer', Board: SoccerGridBoard },
])('$name grid cell feedback', ({ Board }) => {
  it('keeps all empty cells quiet and selects the same nine indices', () => {
    const cells = emptyCells();
    const original = JSON.stringify({ puzzle, cells });
    const onCellClick = vi.fn();
    const view = render(<Board puzzle={puzzle} cells={cells} activeCell={4} onCellClick={onCellClick} />);
    const buttons = view.getAllByRole('button');
    expect(buttons).toHaveLength(9);
    buttons.forEach(button => {
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute('data-grid-cell-status', 'empty');
      expect(button).not.toHaveClass(motion.correct);
      expect(button.querySelector(`.${motion.correctContent}, .${motion.wrongContent}`)).toBeNull();
      fireEvent.click(button);
    });
    expect(onCellClick.mock.calls).toEqual(Array.from({ length: 9 }, (_, index) => [index]));
    expect(buttons[4]).toHaveClass('ring-2');
    for (const attribute of [...puzzle.rows, ...puzzle.cols]) expect(view.getByText(attribute.label)).toBeVisible();
    expect(JSON.stringify({ puzzle, cells })).toBe(original);
  });

  it('changes feedback without replacing the focused button or accepting a locked cell', () => {
    const cells = emptyCells();
    const original = JSON.stringify({ puzzle, cells });
    const onCellClick = vi.fn();
    const view = render(<Board puzzle={puzzle} cells={cells} activeCell={4} onCellClick={onCellClick} />);
    const target = view.getAllByRole('button')[4];
    target.focus();
    expect(document.activeElement).toBe(target);

    const wrong = cells.map(cell => cell.index === 4 ? { ...cell, status: 'wrong' as const } : cell);
    view.rerender(<Board puzzle={puzzle} cells={wrong} activeCell={4} onCellClick={onCellClick} />);
    expect(view.getAllByRole('button')[4]).toBe(target);
    expect(document.activeElement).toBe(target);
    expect(target).toBeEnabled();
    expect(target).toHaveAttribute('data-grid-cell-status', 'wrong');
    expect(target).toHaveClass('bg-destructive/20', 'border-destructive');
    expect(within(target).getByText('✗')).toHaveClass(motion.wrongContent);
    expect(target).not.toHaveClass(motion.correct);
    fireEvent.click(target);
    expect(onCellClick).toHaveBeenCalledExactlyOnceWith(4);

    view.rerender(<Board puzzle={puzzle} cells={cells} activeCell={4} onCellClick={onCellClick} />);
    expect(view.getAllByRole('button')[4]).toBe(target);
    expect(document.activeElement).toBe(target);
    expect(target).toHaveAttribute('data-grid-cell-status', 'empty');
    expect(within(target).getByText('+')).toBeVisible();
    expect(target.querySelector(`.${motion.correctContent}, .${motion.wrongContent}`)).toBeNull();

    const correct = cells.map(cell => cell.index === 4 ? {
      ...cell, status: 'correct' as const, playerName: 'Answer Player', rarity: 3,
    } : cell);
    view.rerender(<Board puzzle={puzzle} cells={correct} activeCell={4} onCellClick={onCellClick} />);
    expect(view.getAllByRole('button')[4]).toBe(target);
    expect(target).toBeDisabled();
    expect(target).toHaveAttribute('data-grid-cell-status', 'correct');
    expect(target).toHaveClass(motion.correct, 'bg-correct/20', 'border-correct');
    expect(within(target).getByText('Answer Player').parentElement).toHaveClass(motion.correctContent);
    expect(within(target).getByText('3% picked this')).toBeVisible();
    expect(within(target).getByText('💎 Diamond')).toBeVisible();
    expect(target.querySelector(`.${motion.wrongContent}`)).toBeNull();
    fireEvent.click(target);
    expect(onCellClick).toHaveBeenCalledExactlyOnceWith(4);
    expect(JSON.stringify({ puzzle, cells })).toBe(original);
  });

  it('does not celebrate when a retry leaves the cell empty', () => {
    const cells = emptyCells();
    const onCellClick = vi.fn();
    const view = render(<Board puzzle={puzzle} cells={cells} activeCell={0} onCellClick={onCellClick} />);
    const target = view.getAllByRole('button')[0];
    view.rerender(<Board puzzle={puzzle} cells={emptyCells()} activeCell={0} onCellClick={onCellClick} />);
    expect(view.getAllByRole('button')[0]).toBe(target);
    expect(target).toBeEnabled();
    expect(target).toHaveAttribute('data-grid-cell-status', 'empty');
    expect(target).not.toHaveClass(motion.correct);
    expect(target.querySelector(`.${motion.correctContent}, .${motion.wrongContent}`)).toBeNull();
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it('preserves every rarity label and the unicorn wording', () => {
    const rarities = [0.8, 3, 7, 12, 25, 40, 60, 101, 80];
    const cells = emptyCells().map((cell, index) => ({
      ...cell, status: 'correct' as const, playerName: `Answer ${index}`, rarity: rarities[index],
    }));
    const original = JSON.stringify({ puzzle, cells });
    const onCellClick = vi.fn();
    const view = render(<Board puzzle={puzzle} cells={cells} activeCell={null} onCellClick={onCellClick} />);
    for (const label of ['🔥 Phoenix', '💎 Diamond', '✦ Emerald', '♦ Ruby', '★ Gold', '◈ Silver', '◉ Bronze', '🦄 Unicorn']) {
      expect(view.getByText(label)).toBeVisible();
    }
    expect(view.getByText('Only you!')).toBeVisible();
    for (const rarity of rarities.filter(rarity => rarity <= 100)) expect(view.getByText(`${rarity}% picked this`)).toBeVisible();
    view.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
    expect(onCellClick).not.toHaveBeenCalled();
    expect(JSON.stringify({ puzzle, cells })).toBe(original);
  });
});
