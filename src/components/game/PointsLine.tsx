import { cn } from '@/lib/utils';
import type { PointsAnswer } from '@/lib/knowledgeLine';
import { pointsHowTo, pointsOf } from '@/lib/pointsHowTo';

/**
 * Round 678: the points piece of a result card, written once for every game.
 *
 * Under the game's own result (right answers, a rating, a season record) it
 * says "Points: 62 of 100" and one line from the game's family, read from
 * src/lib/pointsHowTo.ts. A game that does not pay yet shows its for fun line
 * instead, and never a number.
 *
 * `answer` is what the game's engine returns from pointsFor for the board and
 * the result, so the number here is the number the recorder sends. Nothing
 * renders this before play: the line in it is set on the day's own key.
 * No game draws it yet; each game round wires its own card.
 */
export function PointsLine({
  slug,
  answer,
  guessing,
  className,
}: {
  slug: string;
  answer?: PointsAnswer;
  /** What guessing averages on this board, in the game's own result. */
  guessing?: number;
  className?: string;
}) {
  const how = pointsHowTo(slug);
  if (!how.pays) {
    return (
      <p data-points-line="fun" className={cn('text-xs text-muted-foreground', className)}>
        {how.cardLine()}
      </p>
    );
  }
  if (!answer) return null;
  return (
    <div data-points-line="" className={cn('space-y-0.5', className)}>
      <p className="text-sm font-bold text-foreground">{pointsOf(answer.points)}</p>
      <p className="text-xs text-muted-foreground">{how.cardLine({ answer, guessing })}</p>
    </div>
  );
}

export default PointsLine;
