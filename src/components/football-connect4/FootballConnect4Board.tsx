import { cn } from '@/lib/utils';
import { Board, ROWS, COLS, FootballConnect4Board as BoardConfig, Team } from '@/types/footballConnect4';

interface Props {
  boardConfig: BoardConfig;
  board: Board;
  currentTurn: Team;
  selectedColumn: number | null;
  targetRow: number | null;
  onSelectColumn: (col: number) => void;
  disabled: boolean;
}

export function FootballConnect4Board({
  boardConfig,
  board,
  currentTurn,
  selectedColumn,
  targetRow,
  onSelectColumn,
  disabled,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Column headers */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${COLS}, 1fr)` }}>
          <div /> {/* empty corner */}
          {boardConfig.columnAttributes.map((attr, col) => (
            <button
              key={col}
              onClick={() => onSelectColumn(col)}
              disabled={disabled}
              className={cn(
                'text-[10px] sm:text-xs font-semibold p-1 sm:p-2 rounded-lg text-center transition-all min-h-[48px] flex items-center justify-center leading-tight',
                selectedColumn === col
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                  : 'bg-secondary text-foreground hover:bg-primary/20',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {attr}
            </button>
          ))}
        </div>

        {/* Board rows */}
        {Array.from({ length: ROWS }).map((_, row) => (
          <div
            key={row}
            className="grid gap-1 mt-1"
            style={{ gridTemplateColumns: `120px repeat(${COLS}, 1fr)` }}
          >
            {/* Row label */}
            <div className={cn(
              'text-[10px] sm:text-xs font-semibold p-1 sm:p-2 rounded-lg flex items-center justify-center text-center leading-tight min-h-[52px] transition-all',
              targetRow === row
                ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                : 'bg-secondary text-foreground'
            )}>
              {boardConfig.rowAttributes[row]}
            </div>

            {/* Cells */}
            {Array.from({ length: COLS }).map((_, col) => {
              const cell = board[row][col];
              const isSelected = selectedColumn === col && !cell;
              // Find lowest empty in this column to highlight the target
              let lowestEmpty = -1;
              for (let r = ROWS - 1; r >= 0; r--) {
                if (!board[r][col]) { lowestEmpty = r; break; }
              }
              const isTarget = isSelected && row === lowestEmpty;

              return (
                <button
                  key={col}
                  onClick={() => !cell && onSelectColumn(col)}
                  disabled={disabled || !!cell}
                  /* Round 215: an empty square has no text in it, so a screen
                     reader announced 42 of these as nothing at all. The label
                     carries the pair of clues a sighted player reads off the
                     edges of the grid. */
                  aria-label={
                    cell
                      ? `${cell.playerName}, ${boardConfig.rowAttributes[row]} and ${boardConfig.columnAttributes[col]}`
                      : `Empty square, ${boardConfig.rowAttributes[row]} and ${boardConfig.columnAttributes[col]}`
                  }
                  className={cn(
                    'rounded-lg border min-h-[52px] flex items-center justify-center p-1 transition-all text-[9px] sm:text-[11px] font-medium leading-tight text-center',
                    cell?.team === 'blue' && 'bg-blue-500/90 text-black border-blue-600',
                    cell?.team === 'red' && 'bg-red-500/90 text-black border-red-600',
                    !cell && isTarget && currentTurn === 'blue' && 'border-blue-400 bg-blue-500/10 ring-1 ring-blue-400',
                    !cell && isTarget && currentTurn === 'red' && 'border-red-400 bg-red-500/10 ring-1 ring-red-400',
                    !cell && !isTarget && 'border-border bg-card hover:bg-card/80',
                    (disabled || !!cell) && 'cursor-not-allowed'
                  )}
                >
                  {cell ? cell.playerName : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
