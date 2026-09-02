/**
 * Round 399: a finish restored from storage is not a new finish.
 *
 * useGameCompletion records a completion when isComplete goes from false to
 * true while the page is mounted. That holds for a game that restores its
 * state in a useState initializer (it is complete on the first render, so
 * there is no transition to see). It does not hold for useDailyPuzzle, which
 * starts every game at 'playing' and restores the saved 'won' or 'lost'
 * inside an effect after mount, because to the completion hook that restore
 * looks exactly like the player finishing. 38 daily games sit on that hook,
 * and every reload of a finished one was another row and another payment of
 * the score into a signed in player's points.
 *
 * So the restore says what it is. useDailyPuzzle calls markRestoredFinish
 * right before it sets a finished status it read from storage, and the
 * completion hook asks consumeRestoredFinish before it records. The mark is
 * consumed once and expires on its own, so a stale one can never swallow a
 * real finish minutes later: the restore and the hook's effect are the same
 * commit and its re-render, well inside the window.
 */
const RESTORE_WINDOW_MS = 5000;
const marks = new Map<string, number>();

export function markRestoredFinish(gameSlug: string): void {
  marks.set(gameSlug, Date.now());
}

export function consumeRestoredFinish(gameSlug: string): boolean {
  const at = marks.get(gameSlug);
  if (at === undefined) return false;
  marks.delete(gameSlug);
  return Date.now() - at <= RESTORE_WINDOW_MS;
}
