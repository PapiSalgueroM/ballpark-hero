import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { recordCompletion, getCurrentPlayerName } from '@/lib/completions';
import { getNewlyEarnedBadges } from '@/lib/badges';

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

  // Reset when the game resets (isComplete goes back to false)
  useEffect(() => {
    if (!isComplete) trackedRef.current = false;
  }, [isComplete]);

  useEffect(() => {
    if (!isComplete || trackedRef.current) return;
    trackedRef.current = true;

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
