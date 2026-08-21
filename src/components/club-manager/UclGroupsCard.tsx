import { useState } from 'react';
import { cn } from '@/lib/utils';
import { sortedTable, projectedUclBracket } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';

interface UclGroupsCardProps {
  career: CareerState;
  onClubClick?: (club: string) => void;
}

/**
 * Round 163, his ask word for word: "all UCL groups visible (not just mine),
 * and a projected knockout bracket from current group standings that
 * finalizes when the groups do."
 *
 * My group is always Group A. The other groups are real four club tables
 * playing their matchdays the same nights mine does, and the projection
 * below pairs the eight current leaders exactly the way the real
 * quarter-final draw will pair them, so a leader change IS a draw change.
 */
export function UclGroupsCard({ career, onClubClick }: UclGroupsCardProps) {
  const [pick, setPick] = useState('A');
  const group = career.uclGroup;
  if (!group || career.uclKoRound !== null) return null;

  const world = career.uclWorld ?? [];
  const letters = ['A', ...world.map(g => g.letter)];
  const activeRows = pick === 'A'
    ? sortedTable(group.table)
    : sortedTable(world.find(g => g.letter === pick)?.table ?? []);
  const projection = projectedUclBracket(career);
  const preseason = group.matchday === 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {letters.map(letter => (
          <button
            key={letter}
            onClick={() => setPick(letter)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
              letter === pick
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary',
            )}
          >
            {letter === 'A' ? '⭐ ' : ''}Group {letter}
          </button>
        ))}
      </div>

      <LeagueTableCard
        rows={activeRows}
        myClub={career.clubName}
        title={`⭐ UCL Group ${pick} · MD${group.matchday}/6${pick === 'A' ? ' · yours' : ''}`}
        preseason={preseason}
        onClubClick={onClubClick}
      />

      {projection && projection.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            Projected quarter-finals
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {projection.map((p, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-lg border px-2 py-1.5 text-[11px] flex items-center justify-between gap-2',
                  p.home === career.clubName || p.away === career.clubName
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border bg-background/40',
                )}
              >
                <span className={cn('truncate', p.home === career.clubName ? 'text-primary font-bold' : 'text-foreground')}>{p.home}</span>
                <span className="text-muted-foreground shrink-0">v</span>
                <span className={cn('truncate text-right', p.away === career.clubName ? 'text-primary font-bold' : 'text-foreground')}>{p.away}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5">
            {preseason
              ? 'If the groups ended right now. Nobody has kicked a ball, so this is just the draw order.'
              : 'If the groups ended today: the eight current leaders, paired the way the real draw pairs them. This locks in after matchday 6.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default UclGroupsCard;
