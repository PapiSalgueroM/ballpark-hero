import { SoccerGridCell, SoccerGridPuzzle } from '@/types/soccerGrid';
import { cn } from '@/lib/utils';

interface Props {
  puzzle: SoccerGridPuzzle;
  cells: SoccerGridCell[];
  activeCell: number | null;
  onCellClick: (index: number) => void;
}

function RarityBadge({ rarity }: { rarity: number }) {
  if (rarity < 2)  return <span className="text-[10px] font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">🔥 Phoenix</span>;
  if (rarity < 5)  return <span className="text-[10px] font-bold text-cyan-400">💎 Diamond</span>;
  if (rarity < 10) return <span className="text-[10px] font-bold text-emerald-400">✦ Emerald</span>;
  if (rarity < 20) return <span className="text-[10px] font-bold text-rose-400">♦ Ruby</span>;
  if (rarity < 35) return <span className="text-[10px] font-bold text-amber-400">★ Gold</span>;
  if (rarity < 50) return <span className="text-[10px] font-bold text-slate-400">◈ Silver</span>;
  if (rarity < 70) return <span className="text-[10px] font-bold text-orange-700">◉ Bronze</span>;
  return null;
}

export function SoccerGridBoard({ puzzle, cells, activeCell, onCellClick }: Props) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="grid grid-cols-4 gap-1.5">
        <div />

        {puzzle.cols.map((col, i) => (
          <div
            key={`col-${i}`}
            className="flex items-center justify-center p-2 rounded-lg border text-center bg-[hsl(var(--sg-green))] border-[hsl(var(--sg-accent))/0.2]"
          >
            <span className="text-[11px] md:text-xs font-semibold leading-tight text-[hsl(var(--sg-accent))]">
              {col.label}
            </span>
          </div>
        ))}

        {puzzle.rows.map((row, rowIdx) => (
          <div key={`row-group-${rowIdx}`} className="contents">
            <div
              className="flex items-center justify-center p-2 rounded-lg border text-center bg-[hsl(var(--sg-green))] border-[hsl(var(--sg-accent))/0.2]"
            >
              <span className="text-[11px] md:text-xs font-semibold leading-tight text-[hsl(var(--sg-accent))]">
                {row.label}
              </span>
            </div>

            {[0, 1, 2].map((colIdx) => {
              const cellIndex = rowIdx * 3 + colIdx;
              const cell = cells[cellIndex];
              const isActive = activeCell === cellIndex;

              return (
                <button
                  key={`cell-${cellIndex}`}
                  onClick={() => cell.status !== 'correct' && onCellClick(cellIndex)}
                  disabled={cell.status === 'correct'}
                  className={cn(
                    'aspect-square rounded-lg border-2 flex flex-col items-center justify-center p-1 transition-all text-center',
                    cell.status === 'correct'
                      ? 'bg-correct/20 border-correct cursor-default'
                      : cell.status === 'wrong'
                        ? 'bg-destructive/20 border-destructive'
                        : isActive
                          ? 'ring-2 border-[hsl(var(--sg-accent))] shadow-[0_0_0_2px_hsl(var(--sg-accent)/0.3)] bg-[hsl(var(--sg-accent)/0.1)]'
                          : 'bg-card border-border cursor-pointer hover:border-[hsl(var(--sg-accent))/0.5]'
                  )}
                >
                  {cell.status === 'correct' && cell.playerName ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[11px] md:text-xs font-bold text-foreground leading-tight">
                        {cell.playerName}
                      </span>
                      {cell.rarity !== null && (
                        <>
                          <span className="text-[9px] text-muted-foreground">
                            {cell.rarity}% of players
                          </span>
                          <RarityBadge rarity={cell.rarity} />
                        </>
                      )}
                    </div>
                  ) : cell.status === 'wrong' ? (
                    <span className="text-xs text-destructive font-semibold">✗</span>
                  ) : (
                    <span className="text-lg text-muted-foreground/30">+</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
