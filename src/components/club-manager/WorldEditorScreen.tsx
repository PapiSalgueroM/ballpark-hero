/**
 * Round 964: the world editor screen, an optional stop in the Club Manager
 * start flow. Pick a club, pick the club it swaps with, done. Every move is a
 * swap, so every league keeps its size and its calendar. Small tiles and a
 * back button, the same as every other picker step.
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlagImg } from '@/components/FlagImg';
import { NATIONS, REAL_LEAGUES } from '@/lib/clubManager';
import {
  editedClubsOf, editedLeagueIdOf, realLeagueIdOf, swapClubs, worldEditMoves, worldLeagueName,
} from '@/lib/clubManagerWorldEdit';
import type { WorldEdit } from '@/lib/clubManagerWorldEdit';

const nationOfLeague = (id: string | null) => (id ? NATIONS.find(n => n.leagueIds.includes(id))?.name ?? '' : '');

interface Props {
  edit: WorldEdit | null;
  onChange: (edit: WorldEdit | null) => void;
  onBack: () => void;
  onDone: () => void;
}

export function WorldEditorScreen({ edit, onChange, onBack, onDone }: Props) {
  const [moving, setMoving] = useState<string | null>(null);
  const [fromLeague, setFromLeague] = useState('scottish');
  const [toLeague, setToLeague] = useState('premier');
  const [lastSwap, setLastSwap] = useState<string | null>(null);
  const [showMoves, setShowMoves] = useState(false);
  const moves = useMemo(() => worldEditMoves(edit), [edit]);
  const movingLeague = moving ? editedLeagueIdOf(edit, moving) : null;
  const leagueId = moving ? (toLeague === movingLeague ? REAL_LEAGUES.find(l => l.id !== movingLeague)!.id : toLeague) : fromLeague;
  const clubs = editedClubsOf(edit, leagueId);

  const pickClub = (club: string) => {
    if (!moving) {
      setMoving(club);
      setLastSwap(null);
      return;
    }
    const next = swapClubs(edit, moving, club);
    if (next === edit) return;
    const a = moving;
    setLastSwap(`${a} now plays in the ${worldLeagueName(leagueId)}, and ${club} in the ${worldLeagueName(movingLeague ?? '')}.`);
    setMoving(null);
    onChange(next);
  };

  return (
    <div className="max-w-2xl mx-auto" data-testid="cm-world-editor">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> All nations
      </button>
      <div className="rounded-xl border border-border bg-card p-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base leading-none">🌍</span>
          <span className="text-sm font-bold text-foreground">World editor</span>
          <span className="text-[10px] text-muted-foreground">
            {moves.length ? `${moves.length} clubs moved` : 'the real world, nothing moved yet'}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {moves.length > 0 && (
              <button
                onClick={() => setShowMoves(v => !v)}
                className="text-[10px] font-bold px-2 py-1 min-h-[32px] rounded border border-border hover:border-primary"
              >
                {showMoves ? 'Hide list' : 'See list'}
              </button>
            )}
            {moves.length > 0 && (
              <button
                onClick={() => { onChange(null); setMoving(null); setLastSwap(null); setShowMoves(false); }}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 min-h-[32px] rounded border border-border hover:border-destructive"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
          Move any club to any league before you start. Every move is a swap, so every league keeps its real size,
          its fixtures and its places. The board judges a moved club against its new league.
        </p>
        {showMoves && moves.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px]" data-testid="cm-world-moves">
            {moves.map(m => (
              <li key={m.club} className="flex items-center gap-1.5 min-w-0">
                <FlagImg name={nationOfLeague(m.from)} size={12} />
                <span className="font-bold text-foreground truncate">{m.club}</span>
                <span className="text-muted-foreground truncate">{worldLeagueName(m.from)} → {worldLeagueName(m.to)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lastSwap && !moving && (
        <div role="status" className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 mb-2.5 text-[11px] text-foreground">
          <ArrowLeftRight className="inline w-3.5 h-3.5 mr-1 text-primary" />{lastSwap}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-bold text-foreground">
          {moving ? <>2. Swap <span className="text-primary">{moving}</span> with a club from</> : '1. Pick a club to move, from'}
        </span>
        <select
          aria-label={moving ? 'League to swap into' : 'League to move a club from'}
          value={leagueId}
          onChange={e => (moving ? setToLeague(e.target.value) : setFromLeague(e.target.value))}
          className="text-xs rounded border border-border bg-background px-2 py-1.5 min-h-[32px] text-foreground"
        >
          {REAL_LEAGUES.filter(l => !moving || l.id !== movingLeague).map(l => (
            <option key={l.id} value={l.id}>{nationOfLeague(l.id)}: {l.name}</option>
          ))}
        </select>
        {moving && (
          <button
            onClick={() => setMoving(null)}
            className="text-[10px] font-bold px-2 py-1 min-h-[32px] rounded border border-border hover:border-primary ml-auto"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {clubs.map(c => {
          const home = realLeagueIdOf(c);
          const away = home !== leagueId;
          return (
            <button
              key={c}
              aria-label={moving ? `Swap ${moving} with ${c}` : `Move ${c}`}
              onClick={() => pickClub(c)}
              className={cn(
                'rounded-lg border px-2.5 py-2 text-left transition-all min-h-[40px] bg-card hover:border-primary',
                away ? 'border-primary/50' : 'border-border',
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FlagImg name={nationOfLeague(home)} size={12} />
                <span className="text-xs font-bold text-foreground truncate">{c}</span>
              </div>
              {away && <div className="text-[9px] text-primary mt-0.5 truncate">moved from the {worldLeagueName(home ?? '')}</div>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center">
        <button
          onClick={onDone}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {moves.length ? `Play this world (${moves.length} moved)` : 'Back to the real world'}
        </button>
      </div>
    </div>
  );
}

export default WorldEditorScreen;
