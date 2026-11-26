import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { UfcGameBoard } from '@/components/ufc/UfcGameBoard';
import { uniqueUfcFighters } from '@/data/ufcFighters';
import { compareUfcGuess } from '@/lib/ufcGameLogic';

it('reopens each guess with its own nine clues and selects the latest guess when play continues', () => {
  const [target, ...fighters] = uniqueUfcFighters;
  const guesses = fighters.slice(0, 3).map(fighter => compareUfcGuess(fighter, target, '2026-11-25'));
  const board = render(<UfcGameBoard guesses={[]} maxGuesses={8} />);
  const cards = within(screen.getByRole('region', { name: 'Fighter clues' }));
  expect(cards.queryByRole('combobox')).toBeNull();
  const checkGuess = (i: number) => {
    expect(cards.getByLabelText('Review a guess')).toHaveValue(String(i));
    for (const [key, cell] of Object.entries(guesses[i].cells)) {
      const entry = board.container.querySelector(`[data-ufc-clue="${key}"]`)!;
      expect(entry.querySelector('dd')?.textContent).toBe(cell.value);
      expect(entry.textContent).toContain({ correct: 'Exact', close: 'Close', incorrect: 'No match' }[cell.status]);
      if (cell.arrow) expect(entry.textContent).toContain(cell.arrow === 'up' ? 'Higher' : 'Lower');
    }
  };
  board.rerender(<UfcGameBoard guesses={guesses.slice(0, 2)} maxGuesses={8} />);
  checkGuess(1);
  fireEvent.change(cards.getByLabelText('Review a guess'), { target: { value: '0' } });
  checkGuess(0);
  board.rerender(<UfcGameBoard guesses={guesses} maxGuesses={8} />);
  checkGuess(2);
});
