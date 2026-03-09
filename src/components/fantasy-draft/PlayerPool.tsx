import { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DraftPlayer {
  id: string;
  name: string;
  position: string;
  nationality: string;
  market_value_millions: number;
  dominant_foot: string;
}

interface PlayerPoolProps {
  players: DraftPlayer[];
  draftedIds: Set<string>;
  onSelect: (player: DraftPlayer) => void;
  disabled?: boolean;
}

const POS_COLORS: Record<string, string> = {
  GK: 'bg-amber-500/20 text-amber-400',
  DEF: 'bg-blue-500/20 text-blue-400',
  MID: 'bg-emerald-500/20 text-emerald-400',
  FWD: 'bg-red-500/20 text-red-400',
};

const POS_FILTERS = ['All', 'GK', 'DEF', 'MID', 'FWD'] as const;

export const PlayerPool = ({ players, draftedIds, onSelect, disabled }: PlayerPoolProps) => {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState<string>('All');

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (posFilter !== 'All' && p.position !== posFilter) return false;
      if (search.length >= 2 && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [players, search, posFilter]);

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
      <div className="max-h-[400px] sm:max-h-[480px] overflow-y-auto divide-y divide-border/50">
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No players found</p>
        )}
        {filtered.map((player) => {
          const isDrafted = draftedIds.has(player.id);
          return (
            <button
              key={player.id}
              disabled={isDrafted || disabled}
              onClick={() => onSelect(player)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                isDrafted
                  ? 'opacity-35 cursor-not-allowed bg-muted/20'
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
                <p className="text-xs text-muted-foreground">{player.nationality}</p>
              </div>

              {/* Value & foot */}
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-primary">£{player.market_value_millions}M</p>
                <p className="text-[10px] text-muted-foreground">{player.dominant_foot} foot</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-2 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">{filtered.length} players • {draftedIds.size} drafted</p>
      </div>
    </div>
  );
};
