import { cn } from '@/lib/utils';
/* Round 194: real players wear their real flag, from this world's map. */
import { nationalityOf } from '@/data/playerNationalities';
import { FlagImg } from '@/components/FlagImg';
import { ROLE_INFO, roleOf, promiseMood } from '@/lib/clubManager';
import type { CMPlayer } from '@/lib/clubManager';

/**
 * Round 132: the one label this round is really about.
 *
 * Once the world has a clock, some of the people on your teamsheet are real
 * footballers and some are players this game invented to fill the space the
 * real ones left when they retired. Nobody should have to guess which is
 * which, so every screen that shows a name shows this next to the made up
 * ones. Same spirit as the "partial data" flag on the club picker: if the data
 * is thin, say it is thin, right there, rather than hoping nobody notices.
 */
export function MadeUpTag({ className }: { className?: string }) {
  return (
    <span
      title="Not a real player. This game made him up because the real August 2026 data cannot tell us who is playing this far ahead."
      className={cn('text-[8px] font-bold text-sky-300/90 border border-sky-400/50 rounded px-1 shrink-0', className)}
    >
      MADE UP
    </span>
  );
}

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
  /* Round 194: which sealed world's nationality map to read. */
  eraId?: string;
}

/** Full squad list with fitness, morale and availability status. */
export function SquadScreen({ squad, xiIds, eraId }: SquadScreenProps) {
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
              {(() => { const nat = nationalityOf(eraId, p.name); return nat ? <FlagImg name={nat} size={13} /> : null; })()}
              <span className={cn('text-xs truncate', p.isYouth ? 'text-muted-foreground italic' : 'text-foreground')}>{p.name}</span>
              {p.generated && <MadeUpTag />}
              {inXI.has(p.id) && <span className="text-[8px] font-bold text-primary border border-primary/50 rounded px-1 shrink-0">XI</span>}
              {p.onLoan && <span className="text-[8px] font-bold text-muted-foreground border border-border rounded px-1 shrink-0">LOAN</span>}
              {/* Round 94: what you have told the market about him. */}
              {p.transferStatus === 'listed' && <span className="text-[8px] font-bold text-gold border border-gold/60 rounded px-1 shrink-0">LISTED</span>}
              {p.transferStatus === 'loanListed' && <span className="text-[8px] font-bold text-sky-400 border border-sky-400/60 rounded px-1 shrink-0">LOAN LIST</span>}
              {p.transferStatus === 'blocked' && <span className="text-[8px] font-bold text-red-400 border border-red-400/60 rounded px-1 shrink-0">BLOCKED</span>}
              {/* Round 127: he handed in a transfer request off his own bat. */}
              {p.wantsOut && <span className="text-[8px] font-bold text-red-400 border border-red-400/60 rounded px-1 shrink-0">WANTS OUT</span>}
            </div>
            {/* Round 73: the full stat line. */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {/* Round 127: the rung you put him on, and whether he is getting it. */}
              <span className="text-[9px] text-muted-foreground shrink-0">
                {ROLE_INFO[roleOf(p)].emoji} {ROLE_INFO[roleOf(p)].label}
                {promiseMood(p).tone === 'bad' ? ' · ' : ''}
                {promiseMood(p).tone === 'bad' && <span className="text-red-400 font-semibold">{promiseMood(p).text}</span>}
              </span>
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
