import { FlagImg } from '@/components/FlagImg';
import { Player } from '@/types/game';

interface BingoPackListProps {
  pack: Player[];
  /** Round 727: at a table the pack turns up one player at a time. Omit it
   *  (solo play) and the whole pack is face up. */
  revealed?: number;
  /** Tapping a face down slot turns the next player up. */
  onReveal?: () => void;
}

/** One pack, a row per player with the attributes every condition reads. */
export function BingoPackList({ pack, revealed, onReveal }: BingoPackListProps) {
  const shown = revealed === undefined ? pack.length : revealed;
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {pack.map((p, i) => (
        i < shown ? (
          <div key={p.name} className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-foreground truncate">{p.name}</span>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {p.position} · {p.age > 0 ? `${p.age}y · ` : ''}<FlagImg name={p.nationality} size={11} showLabel /> · {p.league} · {p.marketValue}M
              {p.goals + p.assists > 0 ? ` · ${p.goals}g ${p.assists}a` : ''}
            </span>
          </div>
        ) : (
          <button
            key={`down-${i}`}
            onClick={onReveal}
            className="flex items-center justify-between rounded-lg border border-dashed border-border bg-background px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <span>Player {i + 1}</span>
            <span>{i === shown ? 'Tap to turn up' : 'Face down'}</span>
          </button>
        )
      ))}
    </div>
  );
}

export default BingoPackList;
