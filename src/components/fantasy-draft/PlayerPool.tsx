import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playerRating } from '@/lib/squadDeal';
import type { Player } from '@/types/game';

/** The one card curve the whole site uses, fed this table's fields. */
export function draftRating(p: DraftPlayer): number {
  return playerRating({ marketValue: Math.max(1, p.market_value_millions), age: p.age ?? 27 } as Player);
}

export interface DraftPlayer {
  id: string;
  name: string;
  position: string;
  nationality: string;
  market_value_millions: number;
  dominant_foot: string;
  /** Current age, backfilled from player_market_values (2026-08-05). */
  age?: number | null;
}

interface PlayerPoolProps {
  players: DraftPlayer[];
  draftedIds: Set<string>;
  onSelect: (player: DraftPlayer) => void;
  disabled?: boolean;
  /** Owner 2026-08-05: today's criteria is ENFORCED. Players failing it are
   *  greyed out with the reason instead of being silently pickable. */
  isEligible?: (player: DraftPlayer) => boolean;
  ineligibleReason?: string;
}

const POS_COLORS: Record<string, string> = {
  GK: 'bg-amber-500/20 text-amber-400',
  DEF: 'bg-blue-500/20 text-blue-400',
  MID: 'bg-emerald-500/20 text-emerald-400',
  FWD: 'bg-red-500/20 text-red-400',
};

const POS_FILTERS = ['All', 'GK', 'DEF', 'MID', 'FWD'] as const;

/** The rows the pool shows. With no search: the best ten that can actually be
 *  drafted (drafted and rule-blocked players are dropped BEFORE the sort, or the
 *  ten highest rated, exactly the ones a rule excludes, hold every slot for the
 *  whole draft). With a search: up to twenty name matches, drafted and blocked
 *  included, greyed with the reason. */
export function poolShortlist(
  players: DraftPlayer[],
  draftedIds: Set<string>,
  isEligible: ((p: DraftPlayer) => boolean) | undefined,
  posFilter: string,
  search: string,
): DraftPlayer[] {
  const searching = search.length >= 2;
  const base = players.filter((p) => {
    if (!searching && (draftedIds.has(p.id) || (isEligible && !isEligible(p)))) return false;
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    if (searching && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const sorted = [...base].sort((a, b) => draftRating(b) - draftRating(a));
  return sorted.slice(0, search.length >= 2 ? 20 : 10);
}

export const PlayerPool = ({ players, draftedIds, onSelect, disabled, isEligible, ineligibleReason }: PlayerPoolProps) => {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('All');

  /* Round 326, off the owner's review ("too much scrolling"): the pool no
     longer renders as a 480px scroll of every player. It shows the BEST
     AVAILABLE, top ten by the sitewide card rating, and the search reaches
     everyone else; a search shows up to twenty matches. The list is short
     enough to read whole, which is the point. */
  const filtered = useMemo(
    () => poolShortlist(players, draftedIds, isEligible, posFilter, search),
    [players, draftedIds, isEligible, posFilter, search],
  );

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border bg-card/70 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Player Pool</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search players..."
            aria-label="Search players"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Position filters */}
        <div className="flex gap-1.5 flex-wrap">
          {POS_FILTERS.map((pos) => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                posFilter === pos
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              )}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Player list */}
      <div className="divide-y divide-border/50">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No players found</p>
        )}
        {filtered.map((player) => {
          const isDrafted = draftedIds.has(player.id);
          const blocked = !isDrafted && isEligible ? !isEligible(player) : false;
          return (
            <button
              key={player.id}
              disabled={isDrafted || disabled || blocked}
              onClick={() => onSelect(player)}
              title={blocked ? ineligibleReason : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                isDrafted
                  ? 'opacity-35 cursor-not-allowed bg-muted/20'
                  : blocked
                    ? 'opacity-45 cursor-not-allowed'
                    : 'hover:bg-secondary/40 cursor-pointer'
              )}
            >
              {/* Position badge */}
              <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded', POS_COLORS[player.position] || 'bg-secondary text-foreground')}>
                {player.position}
              </span>

              {/* Name & nationality */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isDrafted ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {player.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {player.nationality}
                  {typeof player.age === 'number' ? ` • ${player.age}` : ''}
                </p>
              </div>

              {/* Value & blocked state */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">{draftRating(player)} <span className="font-normal text-muted-foreground">· £{player.market_value_millions}M</span></p>
                {blocked ? (
                  <p className="text-[10px] font-semibold text-destructive">Blocked by today's rule</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{player.dominant_foot} foot</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">Best available shown • search reaches the whole pool • {draftedIds.size} drafted</p>
      </div>
    </div>
  );
};
