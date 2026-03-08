import { CellState, GridPuzzle } from '@/types/footballGrid';
import { cn } from '@/lib/utils';

interface Props {
  puzzle: GridPuzzle;
  cells: CellState[];
  activeCell: number | null;
  onCellClick: (index: number) => void;
}

function RarityBadge({ rarity }: { rarity: number }) {
  if (rarity < 5) {
    return <span className="text-[10px] font-bold text-[hsl(var(--fg-gold))]">Rare Pick 🔥</span>;
  }
  if (rarity <= 25) {
    return <span className="text-[10px] font-bold text-blue-400">Uncommon</span>;
  }
  return null;
}

export function GridBoard({ puzzle, cells, activeCell, onCellClick }: Props) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Grid with headers */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Top-left corner (empty) */}
        <div />

        {/* Column headers */}
        {puzzle.cols.map((col, i) => (
          <div
            key={`col-${i}`}
            className="flex items-center justify-center p-2 rounded-lg bg-[hsl(var(--fg-navy))]/80 border border-[hsl(var(--fg-gold))]/20 text-center"
          >
            <span className="text-[11px] md:text-xs font-semibold text-[hsl(var(--fg-gold))] leading-tight">
              {col.label}
            </span>
          </div>
        ))}

        {/* Rows with cells */}
        {puzzle.rows.map((row, rowIdx) => (
          <>
            {/* Row header */}
            <div
              key={`row-${rowIdx}`}
              className="flex items-center justify-center p-2 rounded-lg bg-[hsl(var(--fg-navy))]/80 border border-[hsl(var(--fg-gold))]/20 text-center"
            >
              <span className="text-[11px] md:text-xs font-semibold text-[hsl(var(--fg-gold))] leading-tight">
                {row.label}
              </span>
            </div>

            {/* Cells */}
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
                          ? 'bg-[hsl(var(--fg-gold))]/10 border-[hsl(var(--fg-gold))] ring-2 ring-[hsl(var(--fg-gold))]/30'
                          : 'bg-card border-border hover:border-[hsl(var(--fg-gold))]/50 cursor-pointer'
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
          </>
        ))}
      </div>
    </div>
  );
}
