import { formatChemistry } from '@/lib/chemistry';
import type { ChemistryResult } from '@/lib/chemistry';
import type { XiOverall } from '@/lib/xiPitchChemistry';
import type { FilledSlot, PositionSlot } from '@/types/lineupBuilder';
import { cn } from '@/lib/utils';

interface SeatCard {
  label: string;
  filled: number;
  chemistry: ChemistryResult;
  overall: XiOverall;
  positions: PositionSlot[];
  filledMap: Map<number, FilledSlot>;
  active: boolean;
}

interface DraftSquadCompareProps {
  p1: SeatCard;
  p2: SeatCard;
}

function SeatColumn({ seat }: { seat: SeatCard }) {
  return (
    <div
      className={cn(
        'w-full rounded-xl border p-3',
        seat.active ? 'border-primary bg-primary/5' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">{seat.label}</p>
        <p className="text-xs font-semibold text-muted-foreground">{seat.filled}/11</p>
      </div>
      <p className="mt-1 text-lg font-display font-bold tabular-nums text-foreground">{seat.overall.score}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{seat.overall.label}</p>
      <p className="mt-2 text-xs font-semibold text-gold">{formatChemistry(seat.chemistry)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {seat.positions.map((pos, i) => {
          const filled = seat.filledMap.get(i);
          return (
            <span
              key={`${seat.label}-${i}`}
              className={cn(
                'inline-flex min-h-[44px] min-w-[44px] max-w-full items-center rounded-lg px-2 text-xs',
                filled ? 'bg-correct/20 text-foreground' : 'bg-secondary/40 text-muted-foreground',
              )}
            >
              <span className="mr-1 font-bold text-primary">{pos.label}</span>
              <span className="min-w-0 truncate">{filled?.playerName ?? 'open'}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function DraftSquadCompare({ p1, p2 }: DraftSquadCompareProps) {
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <SeatColumn seat={p1} />
        <SeatColumn seat={p2} />
      </div>
    </div>
  );
}
