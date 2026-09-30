import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { SoccerGridBoard } from '@/components/soccer-grid/SoccerGridBoard';
import layout from '@/components/game/GridCellLayout.module.css';
import motion from '@/components/game/GridCellMotion.module.css';
import type { CellState } from '@/types/footballGrid';

const fullName = 'LongFirstname AnotherMiddleName LongFamilyName';
const puzzle = {
  id: 'layout-fixture',
  rows: ['First row', 'Second row', 'Third row'].map(label => ({ label, type: 'misc' as const })),
  cols: ['First column', 'Second column', 'Third column'].map(label => ({ label, type: 'misc' as const })),
};
const empty = (): CellState[] => Array.from({ length: 9 }, (_, index) => ({ index, status: 'empty', playerName: null, rarity: null }));
afterEach(cleanup);

describe.each([
  { name: 'football', Board: GridBoard },
  { name: 'soccer', Board: SoccerGridBoard },
])('$name compact grid content', ({ Board }) => {
  it('retains the complete accessible name and every rarity label in the bounded content', () => {
    const rarities = [0.8, 3, 7, 12, 25, 40, 60, 101, 80];
    const cells = empty().map((cell, index) => ({ ...cell, status: 'correct' as const, playerName: `${fullName} ${index}`, rarity: rarities[index] }));
    const view = render(<Board puzzle={puzzle} cells={cells} activeCell={null} onCellClick={vi.fn()} />);
    view.getAllByRole('button').forEach((button, index) => {
      expect(button).toHaveAccessibleName(new RegExp(`${fullName} ${index}`));
      expect(button).toBeDisabled();
      expect(within(button).getByTitle(`${fullName} ${index}`)).toHaveTextContent(`${fullName} ${index}`);
      expect(within(button).getByText(rarities[index] > 100 ? 'Only you!' : `${rarities[index]}% picked this`)).toBeVisible();
    });
    for (const badge of ['🔥 Phoenix', '💎 Diamond', '✦ Emerald', '♦ Ruby', '★ Gold', '◈ Silver', '◉ Bronze', '🦄 Unicorn']) expect(view.getByText(badge)).toBeVisible();
  });

  it('bounds settled content without replacing buttons, changing callbacks or dropping motion classes', () => {
    const onCellClick = vi.fn();
    const cells = empty();
    const view = render(<Board puzzle={puzzle} cells={cells} activeCell={4} onCellClick={onCellClick} />);
    const buttons = view.getAllByRole('button');
    buttons[4].focus();
    buttons.forEach(button => fireEvent.click(button));
    expect(onCellClick.mock.calls).toEqual(Array.from({ length: 9 }, (_, index) => [index]));
    const wrong = cells.map(cell => cell.index === 4 ? { ...cell, status: 'wrong' as const } : cell);
    view.rerender(<Board puzzle={puzzle} cells={wrong} activeCell={4} onCellClick={onCellClick} />);
    expect(view.getAllByRole('button')[4]).toBe(buttons[4]);
    expect(document.activeElement).toBe(buttons[4]);
    expect(within(buttons[4]).getByText('✗')).toHaveClass(motion.wrongContent);
    const correct = cells.map(cell => cell.index === 4 ? { ...cell, status: 'correct' as const, playerName: fullName, rarity: 3 } : cell);
    view.rerender(<Board puzzle={puzzle} cells={correct} activeCell={4} onCellClick={onCellClick} />);
    expect(view.getAllByRole('button')[4]).toBe(buttons[4]);
    expect(buttons[4]).toHaveClass(layout.cell, motion.correct);
    const name = within(buttons[4]).getByTitle(fullName);
    expect(name).toHaveClass(layout.name);
    expect(name.parentElement).toHaveClass(layout.content, motion.correctContent);
    expect(buttons[4]).toHaveAccessibleName(new RegExp(fullName));
    fireEvent.click(buttons[4]);
    expect(onCellClick).toHaveBeenCalledTimes(9);
  });
});
