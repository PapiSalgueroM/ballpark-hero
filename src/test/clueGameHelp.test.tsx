import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TennisPlayerHowToPlay } from '@/components/tennis-player/TennisPlayerHowToPlay';
import { CbbProgramHowToPlay } from '@/components/cbb-program/CbbProgramHowToPlay';
import { POINTS_BY_CLUE as tennisPoints } from '@/types/tennisPlayer';
import { POINTS_BY_CLUE as cbbPoints } from '@/types/cbbProgram';

const cases = [
  { name: 'tennis', Help: TennisPlayerHowToPlay, example: 'Fictional example: you have 1,000 points available. Take one hint or make one wrong guess, then a correct guess is worth 800 points. At clue 6, it is worth 100.' },
  { name: 'college', Help: CbbProgramHowToPlay, example: 'Fictional example: you have 1,000 points available. Make one wrong guess, then a correct guess is worth 800 points. At clue 6, it is worth 100.' },
];
const tick = () => act(() => { vi.advanceTimersByTime(0); });
beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('actual clue-game help and original instructions', () => {
  for (const row of cases) {
    it(row.name + ' shows a truthful original-tier worked example and turn rules', () => {
      const view = render(<row.Help />);
      fireEvent.click(view.getByRole('button', { name: 'How to Play' })); tick();
      const dialog = view.getByRole('dialog', { name: 'How to Play' });
      expect(dialog).toHaveTextContent(row.example);
      expect(dialog).toHaveTextContent(row.name === 'tennis' ? 'Wrong guesses and hints reveal the next clue. Miss on the final clue and the round ends.' : 'A wrong guess opens the next clue. Miss on the final clue and the round ends.');
      expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
      expect(document.getElementById(dialog.getAttribute('aria-describedby')!)).toHaveTextContent(row.example);
      expect(localStorage.length).toBe(0);
    });

    it(row.name + ' returns Close and Escape to the exact stable opener with preventScroll', () => {
      const view = render(<row.Help />), opener = view.getByRole('button', { name: 'How to Play' });
      for (const close of ['Close', 'Escape']) {
        opener.focus(); fireEvent.click(opener); tick();
        const dialog = view.getByRole('dialog'), focus = vi.spyOn(opener, 'focus');
        view.rerender(<row.Help />); expect(view.getByRole('dialog')).toBe(dialog);
        if (close === 'Close') fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
        else fireEvent.keyDown(document, { key: 'Escape' });
        tick(); expect(view.queryByRole('dialog')).toBeNull();
        expect(view.getByRole('button', { name: 'How to Play' })).toBe(opener);
        expect(opener).toHaveFocus(); expect(focus).toHaveBeenCalledWith({ preventScroll: true }); focus.mockRestore();
      }
      expect(localStorage.length).toBe(0);
    });

    it(row.name + ' binds the owned 44px target and visible keyboard focus', () => {
      const view = render(<row.Help />), opener = view.getByRole('button', { name: 'How to Play' });
      expect(opener).toHaveClass('min-h-[44px]', 'min-w-[44px]', 'focus-visible:ring-2', 'focus-visible:ring-ring', 'focus-visible:ring-offset-2');
      expect(view.queryByRole('dialog')).toBeNull(); view.rerender(<row.Help />);
      expect(view.getByRole('button', { name: 'How to Play' })).toBe(opener); expect(localStorage.length).toBe(0);
    });
  }

  it('holds independent original instructions clue labels and both full point tiers', () => {
    expect(tennisPoints).toEqual([1000, 800, 600, 400, 200, 100]); expect(cbbPoints).toEqual(tennisPoints);
    for (const row of cases) {
      const view = render(<row.Help />); fireEvent.click(view.getByRole('button', { name: 'How to Play' })); tick();
      const dialog = view.getByRole('dialog');
      const instructions = row.name === 'tennis' ? ['Vibe word', 'Nationality & era', 'Tour (ATP or WTA)', 'Grand Slam wins', 'Which Slams they won', 'Famous moment'] : ['We pick a mystery college basketball program each round.', 'Clues reveal one at a time, from a vibe word to the mascot.', 'Type the school name to guess after each clue.', 'Guess early for a higher score. Max is 1,000 points.', 'Daily challenge gives everyone the same program.'];
      instructions.forEach(text => expect(dialog).toHaveTextContent(text));
      view.unmount(); tick(); expect(localStorage.length).toBe(0);
    }
  });
});
