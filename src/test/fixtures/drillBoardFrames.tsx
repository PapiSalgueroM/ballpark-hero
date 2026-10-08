/* Round 1047: the frames of a training ground drill that the markup record
   holds, walked the same way for the board as it stands and for the board
   as it stood before the Season Centre's `match` prop.

   Five frames a drill: the rules card, the first ready card, the round live,
   the result card of a round left to run out (the wall shot is struck at its
   lowest power) and the second round's ready card. The last two are where
   the `match` prop's edits sit (the Next button, and "Next one" on the
   button of every round after the first), so they are in the record too. */
import type { ComponentType } from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';
import type { CareerState } from '@/lib/soccerCareerEngine';

type Board = ComponentType<{ career: CareerState; canBank: boolean; onBank: () => void; onBack: () => void }>;

export const DRILL_FRAMES = ['intro', 'ready', 'playing', 'roundEnd', 'ready2'] as const;

/** Walk one drill through its five frames into `seen`. Fake timers must be on. */
export function drillFrames(BoardIn: unknown, career: CareerState, name: string, seen: Record<string, string>) {
  const Board = BoardIn as Board;
  const view = render(<Board career={career} canBank onBank={vi.fn()} onBack={vi.fn()} />);
  seen[`${name}:intro`] = view.container.innerHTML;
  fireEvent.click(view.getByRole('button', { name: /Today's ten/ }));
  seen[`${name}:ready`] = view.container.innerHTML;
  fireEvent.click(view.getByRole('button', { name: 'Start' }));
  seen[`${name}:playing`] = view.container.innerHTML;
  const live = !!view.container.querySelector('[data-drill-phase="playing"]');
  if (name === 'wallshot') {
    for (let i = 0; i < 8; i += 1) fireEvent.keyDown(window, { key: 's' });
    fireEvent.click(view.getByRole('button', { name: 'Shoot now' }));
  }
  for (let i = 0; i < 600 && !view.container.querySelector('[data-drill-phase="roundEnd"]'); i += 1) act(() => { vi.advanceTimersByTime(50); });
  const ended = !!view.container.querySelector('[data-drill-phase="roundEnd"]');
  /* let the result card settle before it is read */
  act(() => { vi.advanceTimersByTime(2000); });
  seen[`${name}:roundEnd`] = view.container.innerHTML;
  fireEvent.click(view.getByRole('button', { name: 'Next' }));
  seen[`${name}:ready2`] = view.container.innerHTML;
  const second = !!view.getByRole('button', { name: 'Next one' });
  return { live, ended, second };
}
