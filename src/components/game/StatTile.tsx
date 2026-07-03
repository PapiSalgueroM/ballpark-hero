import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatTileState = 'correct' | 'close' | 'incorrect' | 'pending' | 'hidden';

interface StatTileProps {
  /** Small uppercase label above the value, e.g. "Club" or "Nationality". */
  label: string;
  /** The revealed value. Ignored while state is "hidden" (renders a placeholder instead). */
  value: ReactNode;
  /** Drives both color and the reveal/feedback animation. Defaults to "pending". */
  state?: StatTileState;
  /** Optional higher/lower direction hint, rendered as an arrow under the value. */
  direction?: 'up' | 'down' | null;
  /** Set true to trigger the one-shot pop/shake animation for this render.
   *  Callers should flip this back to false (or remount via key) so a repeat
   *  guess in the same direction can replay the animation. */
  animate?: boolean;
  className?: string;
}

/**
 * Shared clue/stat tile per R5 spec 3.3. Used for Footle-style guess-board
 * cells, HigherLowerTransfers-style comparison cards (via revealed/hidden
 * state), and any future attribute-tile game.
 */
export function StatTile({ label, value, state = 'pending', direction, animate = false, className }: StatTileProps) {
  const revealed = state !== 'hidden';

  // Close reuses the pop-correct keyframe (spec 3.5: "a gentler pop... via a
  // close variant class or an inline style multiplier") but plays shorter and
  // skips the success-glow shadow, which spec 4.2 reserves for full correct.
  const animationStyle = animate && state === 'close' ? { animationDuration: '0.28s' } : undefined;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-center flex flex-col items-center gap-1 transition-all duration-200',
        state === 'correct' && 'bg-correct/15 border-correct text-correct-foreground',
        state === 'close' && 'bg-close/15 border-close',
        state === 'incorrect' && 'bg-surface-2 border-border text-muted-foreground',
        state === 'pending' && 'bg-surface-1 border-border/60',
        state === 'hidden' && 'bg-surface-1 border-border/60',
        animate && state === 'correct' && 'animate-pop-correct shadow-[0_0_24px_hsl(var(--success-glow))]',
        animate && state === 'close' && 'animate-pop-correct',
        animate && state === 'incorrect' && 'animate-shake-wrong',
        className,
      )}
      style={animationStyle}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-base font-bold font-display">
        {revealed ? value : '???'}
      </span>
      {direction && revealed && (
        <span className="text-xs" aria-hidden="true">
          {direction === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
  );
}

export default StatTile;
