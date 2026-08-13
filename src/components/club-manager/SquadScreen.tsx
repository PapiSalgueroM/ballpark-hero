import { cn } from '@/lib/utils';
import type { CMPlayer } from '@/lib/clubManager';

export function ratingTint(r: number): string {
  if (r >= 78) return 'text-primary';
  if (r >= 70) return 'text-emerald-400';
  if (r >= 62) return 'text-yellow-400';
  return 'text-muted-foreground';
}

export function moraleEmoji(m: number): string {
  if (m >= 80) return '😄';
  if (m >= 60) return '🙂';
  if (m >= 40) return '😐';
  return '😡';
}

function FitnessBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 45 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.max(4, value)}%` }} />
    </div>
  );
}

interface SquadScreenProps {
  squad: CMPlayer[];
  xiIds: (string | null)[];
}

/** Full squad list with fitness, morale and availability status. */
export function SquadScreen({ squad, xiIds }: SquadScreenProps) {
  const inXI = new Set(xiIds.filter((id): id is string => !!id));
  const sorted = [...squad].sort((a, b) => b.rating - a.rating);

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide pb-1 border-b border-border/60">
        <span>Player ({squad.length} in squad)</span>
        <span>OVR · Fit · Mood</span>
      </div>
      {sorted.map(p => (
        <div key={p.id} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
          <span className="w-9 shrink-0 text-[10px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{p.position}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn('text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>{p.name}</span>
              {inXI.has(p.id) && <span className="text-[8px] font-bold text-primary border border-primary/50 rounded px-1 shrink-0">XI</span>}
              {p.onLoan && <span className="text-[8px] font-bold text-muted-foreground border border-border rounded px-1 shrink-0">LOAN</span>}
            </div>
            {/* Round 73: the full stat line. */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[9px] text-muted-foreground">{p.age}y</span>
              <span className="text-[9px] text-muted-foreground">
                {p.apps ?? 0} apps · {p.seasonGoals}g {p.seasonAssists}a
                {(p.position === 'GK' || ['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(p.position)) ? ` · ${p.cleanSheets ?? 0} CS` : ''}
              </span>
              {(p.apps ?? 0) > 0 && (
                <span className="text-[9px] font-semibold text-foreground/80">
                  ⌀ {((p.ratingSum ?? 0) / (p.apps ?? 1)).toFixed(1)}
                </span>
              )}
              {(p.seasonYellows ?? 0) > 0 && <span className="text-[9px] text-yellow-400">🟨{p.seasonYellows}</span>}
              {(p.seasonReds ?? 0) > 0 && <span className="text-[9px] text-red-400">🟥{p.seasonReds}</span>}
              {p.injuryWeeks > 0 && (
                <span className="text-[9px] font-bold text-red-400">🩹 {p.injuryWeeks}w</span>
              )}
              {p.suspendedMatches > 0 && (
                <span className="text-[9px] font-bold text-yellow-400">⛔ {p.suspendedMatches}</span>
              )}
            </div>
          </div>
          <span className={cn('text-sm font-bold font-display w-7 text-right', ratingTint(p.rating))}>{p.rating}</span>
          <FitnessBar value={p.fitness} />
          <span className="text-sm w-5 text-center">{moraleEmoji(p.morale)}</span>
        </div>
      ))}
    </div>
  );
}

export default SquadScreen;
