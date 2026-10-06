import { useEffect, useState, type ReactNode } from 'react';

/**
 * Round 951: a daily's result moment plays once, when the game finishes in
 * front of the player, and never when a finished day is reopened or
 * reloaded. ResultScreen and ResultMoment animate on every mount and cannot
 * tell a fresh finish from one restored out of storage, so the board says
 * which it is and this wrapper shows a restored card on its final frame.
 */

/**
 * True only when this mount saw the game ready and still unfinished, and then
 * saw it finish. A finish restored from storage is already finished on its
 * first ready render, so it never counts. Pass ready=false while the board is
 * still loading its questions, so the loading render cannot pass for play.
 *
 * Round 953: gameKey is for a board that goes back to a mode menu with the
 * page still mounted and can open another game there. It names the game on
 * screen, or is null while there is none (the menu, a load). Play counts only
 * for the game it was seen in, and the menu forgets it, so an old result
 * reopened from the menu stays settled. A board with one game per mount
 * leaves it out.
 */
export function useFreshFinish(ready: boolean, finished: boolean, gameKey: string | null = ''): boolean {
  const [playedKey, setPlayedKey] = useState<string | null>(null);
  useEffect(() => {
    if (gameKey === null) {
      if (playedKey !== null) setPlayedKey(null);
    } else if (ready && !finished && playedKey !== gameKey) setPlayedKey(gameKey);
  }, [ready, finished, gameKey, playedKey]);
  return finished && gameKey !== null && playedKey === gameKey;
}

/* The moment's entrance pieces (ResultMoment's rm-*, the celebration kit's
   cm-*, the card's own fade in) stop on their settled frame, the same frame
   prefers-reduced-motion shows; the win burst and the confetti are not drawn.
   Nothing else in the card is touched, so the share row behaves as ever. */
const SETTLED_CSS = `
  [data-result-settled] > *,
  [data-result-settled] :is(.rm-score, .rm-badge, .rm-head, .rm-mark, .cm-rise, .cm-slam, .cm-tick-in, .cm-rise-gated, .cm-win-pulse, .cm-loss-shake) { animation: none !important; }
  [data-result-settled] :is(.rm-score, .rm-badge, .rm-head, .cm-rise, .cm-slam, .cm-tick-in, .cm-rise-gated) { opacity: 1 !important; transform: none !important; visibility: visible !important; }
  [data-result-settled] :is(.rm-burst, .cm-confetti) { display: none !important; }
`;

/** Wraps a finished board's ResultScreen; restored shows it settled and quiet. */
export function RestoredResult({ restored, children }: { restored: boolean; children: ReactNode }) {
  return (
    <div data-result-settled={restored ? '' : undefined}>
      <style>{SETTLED_CSS}</style>
      {children}
    </div>
  );
}
