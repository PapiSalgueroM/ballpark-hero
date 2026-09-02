import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { recordCompletion, getCurrentPlayerName } from '@/lib/completions';
import { getNewlyEarnedBadges } from '@/lib/badges';
import { consumeRestoredFinish } from '@/lib/restoredFinish';

/**
 * Marks a finished game for the hook-style callers.
 *
 * Round 300 hollowed this out on purpose. It used to own three jobs: the
 * anonymous game_completions row, the local streak record, and the whole
 * signed in save (user_game_scores, daily_completions, user_scores,
 * user_best_scores). That made it one of THREE pipelines, and which ones a
 * game fed depended on which helper it called: the 19 games mounting this
 * hook fed everything, every direct recordCompletion caller fed only the
 * anonymous row, so a signed in player could finish a Club Manager season
 * and watch their flame, points and rank not move.
 *
 * All of that lives in ONE place now, lib/completions.recordCompletion,
 * which fans out to all three pipelines itself (see saveAuthCompletion in
 * the same file, moved there verbatim from here). This hook is the React
 * shaped door to it: it watches isComplete, calls the one recorder exactly
 * once per finish, and keeps the two things that genuinely need React
 * context, the badge toasts and the profile refresh after the signed in
 * save lands (announced by the game-completion-saved event the lib
 * dispatches).
 */
export function useGameCompletion(
  gameSlug: string,
  isComplete: boolean,
  score: number,
  correctAnswers: number = 0
) {
  const { user, profile, refreshProfile } = useAuth();
  const trackedRef = useRef(false);
  /* Round 399: a finish restored from storage is not a new finish. This
     hook used to record whenever isComplete was true and its per mount ref
     was fresh, so a game that came back finished from localStorage was
     recorded again on every visit: another anonymous row and, for a signed
     in player, the score added to their points again. Measured 2026-09-01:
     half of all signed in saves outside the two big sims were repeats of a
     same day save, a retired Soccer Career legacy re-paid on every reload.
     Two rules now. The hook records only a transition it witnessed,
     isComplete going from false to true while mounted, which covers the two
     career sims and the daily games that restore in a state initializer.
     And a finish that useDailyPuzzle restores in an effect after mount (38
     games) is announced through src/lib/restoredFinish.ts and consumed here
     before anything is recorded, because to this hook that restore looks
     exactly like the player finishing. src/hooks/useGameCompletion.test.ts
     holds both. */
  const seenIncompleteRef = useRef(!isComplete);

  // Reset when the game resets (isComplete goes back to false)
  useEffect(() => {
    if (!isComplete) {
      trackedRef.current = false;
      seenIncompleteRef.current = true;
    }
  }, [isComplete]);

  useEffect(() => {
    if (!isComplete || trackedRef.current || !seenIncompleteRef.current) return;
    trackedRef.current = true;
    /* A finish the daily hook restored after mount said so first. */
    if (consumeRestoredFinish(gameSlug)) return;

    recordCompletion(`/${gameSlug}`, score, getCurrentPlayerName(profile), correctAnswers);

    // Badge toasts, best effort, guest or signed in.
    getNewlyEarnedBadges(profile)
      .then(newBadges => newBadges.forEach(b => toast.success(`Badge unlocked ${b.emoji}`, { description: `${b.name} - ${b.desc}` })))
      .catch(() => { /* best effort */ });
  }, [isComplete, gameSlug, score, correctAnswers, profile]);

  /* The lib announces the signed in save with a second
     game-completion-saved event; refresh the profile then so the header
     moves without waiting for a poll. Listening beats guessing a delay. */
  useEffect(() => {
    if (!user) return undefined;
    const onSaved = () => refreshProfile();
    window.addEventListener('game-completion-saved', onSaved);
    return () => window.removeEventListener('game-completion-saved', onSaved);
  }, [user, refreshProfile]);
}
