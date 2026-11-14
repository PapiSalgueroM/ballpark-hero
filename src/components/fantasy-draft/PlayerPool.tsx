import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlagImg } from '@/components/FlagImg';
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
 *  whole draft). With a search: twenty name matches per page, drafted and blocked
 *  included, greyed with the reason. */
export function poolShortlist(
  players: DraftPlayer[],
  draftedIds: Set<string>,
  isEligible: ((p: DraftPlayer) => boolean) | undefined,
  posFilter: string,
  search: string,
  limit = search.length >= 2 ? 20 : 10,
): DraftPlayer[] {
  const searching = search.length >= 2;
  const base = players.filter((p) => {
    if (!searching && (draftedIds.has(p.id) || (isEligible && !isEligible(p)))) return false;
    if (posFilter !== 'All' && p.position !== posFilter) return false;
    if (searching && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const sorted = [...base].sort((a, b) => draftRating(b) - draftRating(a));
  return sorted.slice(0, limit);
}

export const PlayerPool = ({ players, draftedIds, onSelect, disabled, isEligible, ineligibleReason }: PlayerPoolProps) => {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('All');
  const [country, setCountry] = useState('');
  const [foot, setFoot] = useState('');
  const [poolPage, setPoolPage] = useState(0);
  const targeted = useMemo(
    () => players.filter(p => (!country || p.nationality === country) && (!foot || p.dominant_foot === foot)),
    [players, country, foot],
  );

  const matching = useMemo(
    () => poolShortlist(targeted, draftedIds, isEligible, posFilter, search, Infinity),
    [targeted, draftedIds, isEligible, posFilter, search],
  );
  const searching = search.length >= 2;
  const pageSize = searching ? 20 : 10;
  const pageCount = Math.ceil(matching.length / pageSize);
  const page = Math.min(poolPage, Math.max(0, pageCount - 1));
  const first = page * pageSize;
  const filtered = matching.slice(first, first + pageSize);

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
            onChange={(e) => { setSearch(e.target.value); setPoolPage(0); }}
            className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Position filters */}
        <div className="flex gap-1.5 flex-wrap">
          {POS_FILTERS.map((pos) => (
            <button
              key={pos}
              onClick={() => { setPosFilter(pos); setPoolPage(0); }}
              aria-pressed={posFilter === pos}
              className={cn(
                'min-h-[44px] px-3 py-1 rounded-full text-xs font-semibold transition-colors',
                posFilter === pos
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              )}
            >
              {pos}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 basis-32 text-xs font-semibold text-muted-foreground">
            Country
            <select value={country} onChange={e => { setCountry(e.target.value); setPoolPage(0); }} className="mt-1 h-11 w-full rounded-lg border border-border bg-secondary/60 px-2 text-sm text-foreground">
              <option value="">All</option>
              {[...new Set(players.map(p => p.nationality))].filter(Boolean).sort((a, b) => a.localeCompare(b)).map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="min-w-0 flex-1 basis-32 text-xs font-semibold text-muted-foreground">
            Foot
            <select value={foot} onChange={e => { setFoot(e.target.value); setPoolPage(0); }} className="mt-1 h-11 w-full rounded-lg border border-border bg-secondary/60 px-2 text-sm text-foreground">
              <option value="">All</option>
              {[...new Set(players.map(p => p.dominant_foot))].filter(Boolean).sort((a, b) => a.localeCompare(b)).map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => { setSearch(''); setPosFilter('All'); setCountry(''); setFoot(''); setPoolPage(0); }} disabled={!search && posFilter === 'All' && !country && !foot} className="min-h-[44px] rounded-lg border border-border px-3 text-xs font-semibold hover:bg-accent disabled:opacity-40">
            Reset filters
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p role="status">Showing {first ? `${first + 1} to ${first + filtered.length}` : filtered.length} of {matching.length} {searching ? 'matching' : 'available'} players.</p>
          {pageCount > 1 && <nav aria-label="Player pool pages" className="flex items-center gap-1.5">
            <button type="button" onClick={() => setPoolPage(page - 1)} disabled={page === 0} className="min-h-11 rounded-lg border border-border px-2.5 disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => setPoolPage(page + 1)} disabled={page + 1 >= pageCount} className="min-h-11 rounded-lg border border-border px-2.5 disabled:opacity-40">Next</button>
          </nav>}
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
                  <FlagImg name={player.nationality} size={12} showLabel />
                  {typeof player.age === 'number' ? ` • ${player.age}` : ''}
                </p>
              </div>

              {/* Value & blocked state */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-primary">{draftRating(player)} <span className="font-normal text-muted-foreground">· £{player.market_value_millions}M</span></p>
                {blocked ? (
                  <p className="text-[10px] font-semibold text-destructive">Pick blocked</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">{player.dominant_foot} foot</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">{draftedIds.size} drafted</p>
      </div>
    </div>
  );
};
