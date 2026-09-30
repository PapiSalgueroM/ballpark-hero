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
 * Each game round wires its own card; Round 681 wired the choice dailies.
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

/**
 * Round 681: the Points section of a how to play, for the pages that draw
 * their own rules dialog instead of the shared "?" (which reads the same
 * sentences out of the game's guide). What 0 means, what 100 means, a worked
 * example and when the day's ranked go is spent, all from pointsHowTo, so the
 * dialog, the guide and the card say the same thing.
 */
export function PointsGuide({ slug, className }: { slug: string; className?: string }) {
  const { pays, guide } = pointsHowTo(slug);
  const lines = pays ? [guide.zero, guide.hundred, guide.example, guide.ranked] : [guide.zero];
  return (
    <div data-points-guide="" className={cn('space-y-1', className)}>
      <p className="font-semibold text-foreground">Points:</p>
      <ul className="list-disc pl-5 space-y-1">
        {lines.filter(Boolean).map(line => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export default PointsLine;
