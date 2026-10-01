import { cn } from '@/lib/utils';
import { BingoGame, CARD_SIZE, FREE_INDEX, squareCondition } from '@/lib/sportsBingo';

interface BingoCardGridProps {
  game: BingoGame;
  marked: boolean[];
  /** The square that just shook for a tap nothing in the pack matched. */
  wrongSquare: number | null;
  onTap: (sq: number) => void;
}

/** The 5 by 5 card. Round 727 lifted it out of the page so the solo board
 *  and every seat at a table draw the same grid. */
export function BingoCardGrid({ game, marked, wrongSquare, onTap }: BingoCardGridProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: CARD_SIZE }, (_, sq) => {
        const cond = squareCondition(game, sq);
        const isFree = sq === FREE_INDEX;
        const isMarked = isFree || marked[sq];
        return (
          <button
            key={sq}
            onClick={() => onTap(sq)}
            disabled={isFree || marked[sq]}
            className={cn(
              'aspect-square rounded-lg border p-1 text-center flex items-center justify-center transition-colors',
              isMarked
                ? 'bg-correct/20 border-correct text-foreground'
                : 'bg-card border-border hover:border-primary/50',
              wrongSquare === sq && 'animate-shake-wrong border-destructive',
            )}
          >
            <span className="text-[9px] sm:text-[10px] font-semibold leading-tight">
              {isFree ? '🎁 Free' : cond?.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BingoCardGrid;
