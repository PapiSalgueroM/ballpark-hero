import { cn } from '@/lib/utils';
import { DRAFT_TURN_SECONDS } from '@/lib/xiSnakeDraft';
import type { DraftSeat } from '@/lib/xiSnakeDraft';

interface DraftTurnBannerProps {
  seat: DraftSeat;
  pickIndex: number;
  secondsLeft: number;
  paused: boolean;
}

export function DraftTurnBanner({ seat, pickIndex, secondsLeft, paused }: DraftTurnBannerProps) {
  const urgent = secondsLeft <= 8 && !paused;
  return (
    <div className="w-full max-w-full rounded-2xl border border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 text-sm font-bold',
            seat === 1 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
          )}
        >
          P1
        </span>
        <span
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 text-sm font-bold',
            seat === 2 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
          )}
        >
          P2
        </span>
      </div>
      <p className="mt-2 text-center text-base font-semibold text-foreground">
        Player {seat}'s turn
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Pick {Math.min(pickIndex + 1, 22)} of 22 · snake order P1, P2, P2, P1
      </p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <span
          className={cn(
            'inline-flex min-h-[44px] min-w-[4.5rem] items-center justify-center rounded-xl px-3 font-display text-2xl tabular-nums',
            urgent ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-foreground',
          )}
          aria-live="polite"
        >
          {secondsLeft}s
        </span>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        {paused
          ? 'Timer paused while you search.'
          : `If this hits zero the pick is skipped. Empty slot, next player. ${DRAFT_TURN_SECONDS}s per turn.`}
      </p>
    </div>
  );
}
