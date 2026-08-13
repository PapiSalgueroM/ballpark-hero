import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { REAL_LEAGUES, leagueOf, sortedTable, leagueRounds } from '@/lib/clubManager';
import type { CareerState, TableRow } from '@/lib/clubManager';
import { LeagueTableCard } from '@/components/club-manager/LeagueTableCard';

interface WorldTablesCardProps {
  career: CareerState;
  /** My own league's live table (already sorted upstream). */
  myRows: TableRow[];
  onClubClick?: (club: string) => void;
}

/**
 * Round 95: standings for every league, not just the one I manage in.
 * His ask: "I would love it if u can see the standings of others leagues."
 * Every other league is simulated week by week alongside mine, so these are
 * live tables rather than a static preview.
 */
export function WorldTablesCard({ career, myRows, onClubClick }: WorldTablesCardProps) {
  const myLeague = leagueOf(career.clubName);
  const [pick, setPick] = useState<string>(myLeague.id);

  // My league first, then the rest in their usual order.
  const leagues = useMemo(
    () => [myLeague, ...REAL_LEAGUES.filter(l => l.id !== myLeague.id)],
    [myLeague],
  );

  const active = leagues.find(l => l.id === pick) ?? myLeague;
  const mine = active.id === myLeague.id;
  const world = career.world?.[active.id];
  const rows = mine ? myRows : world ? sortedTable(world.table) : null;
  const played = mine
    ? career.calendar.slice(0, career.week).filter(e => e.type === 'league').length
    : world?.round ?? 0;
  const total = leagueRounds(active.clubs.length);

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {leagues.map(l => (
          <button
            key={l.id}
            onClick={() => setPick(l.id)}
            className={cn(
              'shrink-0 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all',
              l.id === pick
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary',
            )}
          >
            {l.id === myLeague.id ? '⭐ ' : ''}{l.name}
          </button>
        ))}
      </div>

      {rows ? (
        <>
          <LeagueTableCard
            rows={rows}
            myClub={career.clubName}
            title={`${active.name} · round ${Math.min(played, total)} of ${total}`}
            onClubClick={onClubClick}
          />
          {!mine && (
            <p className="text-[9px] text-muted-foreground px-1">
              Simulated live alongside your season, week for week. Tap a club to scout their squad.
            </p>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 text-xs text-muted-foreground">
          {active.name} kicks off with your next league round.
        </div>
      )}
    </div>
  );
}

export default WorldTablesCard;
