import { useMemo, useState } from 'react';
import { isLightHex, type ConquestMapSport } from '@/lib/conquestMapLook';
import { empireCounts, recordLabel, teamLabel, type ImpRecords, type ImperialismSport } from '@/lib/imperialismEngine';
import { cn } from '@/lib/utils';

/**
 * Round 529: Teams Remaining, always on.
 *
 * The web map's sidebar as a strip under the stage: every team ranked by the
 * land it holds (wins break ties), a bar for its share, the player's team
 * pinned first, and "N of T hold land, M wiped out" on the right. On a phone
 * (compact) the top eight show with a "+N more" button that opens the rest.
 * Tapping a chip highlights that empire on the map through onHighlight.
 * Colour and name only, never a logo.
 */

export interface ConquestStandingsStripProps {
  sport: ImperialismSport;
  map: ConquestMapSport;
  owners: Record<string, string>;
  records: ImpRecords;
  favorite: string | null;
  highlightTeam: string | null;
  onHighlight: (teamId: string | null) => void;
  compact?: boolean;
}

const COMPACT_ROWS = 8;

/** Teams Remaining: ranked chips (data-standings, data-team, data-count) with a territory bar, the favourite pinned first, "N of T hold land, M wiped out" on the right, top eight plus "+N more" when compact. */
export default function ConquestStandingsStrip({
  sport, map, owners, records, favorite, highlightTeam, onHighlight, compact = false,
}: ConquestStandingsStripProps) {
  const [expanded, setExpanded] = useState(false);
  const colorOf = useMemo(() => {
    const m = new Map(map.teams.map(t => [t.id, t.color]));
    return (id: string) => m.get(id) ?? '#2a3040';
  }, [map]);

  const counts = useMemo(() => empireCounts(sport, owners), [sport, owners]);
  const ranked = useMemo(() => {
    const ids = sport.teams.map(t => t.id);
    const order = new Map(ids.map((id, i) => [id, i]));
    const sorted = [...ids].sort((a, b) =>
      ((counts.get(b) ?? 0) - (counts.get(a) ?? 0)) ||
      ((records[b]?.w ?? 0) - (records[a]?.w ?? 0)) ||
      ((order.get(a) ?? 0) - (order.get(b) ?? 0)));
    const rank = new Map(sorted.map((id, i) => [id, i + 1]));
    const pinned = favorite && sorted.includes(favorite) ? [favorite, ...sorted.filter(id => id !== favorite)] : sorted;
    return pinned.map(id => ({ id, rank: rank.get(id) ?? 0, count: counts.get(id) ?? 0 }));
  }, [sport, counts, records, favorite]);

  const total = sport.teams.length;
  const holding = ranked.filter(r => r.count > 0).length;
  const wiped = total - holding;
  const most = Math.max(1, ...ranked.map(r => r.count));
  const shown = compact && !expanded ? ranked.slice(0, COMPACT_ROWS) : ranked;
  const hidden = ranked.length - shown.length;

  return (
    <div data-standings data-holding={holding} data-wiped={wiped} className="rounded-2xl border border-border bg-card p-2">
      <div className="flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Teams remaining</span>
        <span data-standings-summary className="text-foreground">{holding} of {total} hold land, {wiped} wiped out</span>
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
        {shown.map(({ id, rank, count }) => {
          const color = colorOf(id);
          const lit = highlightTeam === id;
          const mine = id === favorite;
          return (
            <button
              key={id}
              type="button"
              data-team={id}
              data-count={count}
              data-rank={rank}
              aria-pressed={lit}
              onClick={() => onHighlight(lit ? null : id)}
              className={cn(
                'relative min-h-[30px] overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] transition-colors',
                lit ? 'border-foreground bg-muted' : mine ? 'border-gold/60 bg-gold/10' : count > 0 ? 'border-border bg-background' : 'border-border/50 bg-background/40 text-muted-foreground',
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color, outline: isLightHex(color) ? '1px solid rgba(0,0,0,0.35)' : undefined }} />
                <span className={cn('min-w-0 flex-1 truncate', count > 0 ? 'font-semibold text-foreground' : '')}>
                  {rank}. {teamLabel(sport, id)}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{count}</span>
              </span>
              <span className="mt-1 block h-1 w-full rounded-full bg-muted">
                <span data-bar className="block h-1 rounded-full" style={{ width: `${Math.round((count / most) * 100)}%`, background: color }} />
              </span>
              <span className="sr-only">{recordLabel(records[id])}</span>
            </button>
          );
        })}
      </div>
      {compact && ranked.length > COMPACT_ROWS && (
        <button
          type="button"
          data-standings-more
          onClick={() => setExpanded(e => !e)}
          className="mt-1.5 inline-flex min-h-[30px] w-full items-center justify-center rounded-full text-[11px] font-semibold text-muted-foreground hover:text-foreground"
        >
          {expanded ? 'Show fewer' : `+${hidden} more`}
        </button>
      )}
    </div>
  );
}
