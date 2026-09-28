import { cn } from '@/lib/utils';

/**
 * Round 645: a free run says so, next to its score.
 *
 * Since Round 645 a finish outside the daily (Unlimited, free play, a new
 * season, versus, a CPU card) is recorded as a play and never as a record:
 * no points, no place on today's leaderboard, no daily tick
 * (src/hooks/useGameCompletion.ts, the ranked flag). Round 644's rule is that
 * a result screen shows the score that gets recorded, so a card that shows a
 * score the recorder did not keep has to say why, in plain words, where the
 * score is. This is that line, written once for every game: ResultScreen
 * renders it from its `ranked` prop, and the boards that build their own
 * card render it beside their score with the same flag their recorder gets.
 *
 * scripts/simRankedRecorder.mjs section 4 reads every card of a game whose
 * recorder takes the flag and fails when one does not carry this line, and
 * src/test/unrankedNote.test.tsx renders real cards through Unlimited (the
 * line shows) and through the daily (it does not).
 */
export const UNRANKED_LINE = "Free play: this one's just for fun. Only the daily counts for points and today's leaderboard.";

export function UnrankedNote({ ranked, className }: { ranked: boolean; className?: string }) {
  if (ranked) return null;
  return (
    <p data-unranked-note="" className={cn('text-xs text-muted-foreground', className)}>
      {UNRANKED_LINE}
    </p>
  );
}

export default UnrankedNote;
