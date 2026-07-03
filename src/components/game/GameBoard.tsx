import { GuessResult, CellResult } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  guesses: GuessResult[];
  maxGuesses: number;
}

const HEADERS = [
  { key: 'player', label: 'PLAYER', emoji: '👤' },
  { key: 'nationality', label: 'NAT', emoji: '🌍' },
  { key: 'club', label: 'CLUB', emoji: '🏟️' },
  { key: 'goals', label: 'GOALS', emoji: '⚽' },
  { key: 'assists', label: 'AST', emoji: '👟' },
  { key: 'position', label: 'POS', emoji: '📍' },
  { key: 'kitNumber', label: 'KIT #', emoji: '👕' },
  { key: 'age', label: 'AGE', emoji: '📅' },
  { key: 'marketValue', label: 'VALUE', emoji: '💰' },
];

const cellKeys = ['nationality', 'club', 'goals', 'assists', 'position', 'kitNumber', 'age', 'marketValue'] as const;

function CellComponent({ cell, animDelay }: { cell: CellResult; animDelay: number }) {
  const statusClasses = {
    correct: 'bg-correct text-correct-foreground',
    close: 'bg-close text-close-foreground',
    incorrect: 'bg-incorrect text-incorrect-foreground',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg h-16 min-w-[85px] font-bold text-sm animate-cell-reveal',
        statusClasses[cell.status]
      )}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <span className="leading-tight text-center px-1">{cell.value}</span>
      {cell.arrow && (
        <span className="text-[10px] mt-0.5 opacity-80">
          {cell.arrow === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
  );
}

function GuessRow({ guess, isLatest }: { guess: GuessResult; isLatest: boolean }) {
  // Newest row briefly pops (correct) or shakes (wrong) once its cells finish
  // flipping in. Reuses the shared feedback keyframes from index.css (already
  // reduced-motion safe via the prefers-reduced-motion block there) instead of
  // introducing new animation rules. Delay lets the per-cell reveal read first.
  const feedbackClass = isLatest
    ? guess.isCorrect
      ? 'animate-pop-correct'
      : 'animate-shake-wrong'
    : '';
  const feedbackDelay = isLatest ? `${(cellKeys.length + 1) * 80}ms` : undefined;

  return (
    <div
      className={cn('grid gap-1.5 mb-1.5', feedbackClass)}
      style={{
        gridTemplateColumns: '130px repeat(8, minmax(85px, 1fr))',
        animationDelay: feedbackDelay,
      }}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-lg h-16 px-2 font-bold text-xs animate-cell-reveal',
          guess.isCorrect ? 'bg-correct text-correct-foreground' : 'bg-card text-foreground'
        )}
        style={{ animationDelay: '0ms' }}
      >
        <span className="text-center leading-tight">{guess.playerName}</span>
      </div>

      {cellKeys.map((key, i) => (
        <CellComponent
          key={key}
          cell={guess.cells[key]}
          animDelay={(i + 1) * 80}
        />
      ))}
    </div>
  );
}

function EmptyRow() {
  return (
    <div
      className="grid gap-1.5 mb-1.5"
      style={{ gridTemplateColumns: '130px repeat(8, minmax(85px, 1fr))' }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg h-16 bg-muted/40 border border-border/30"
        />
      ))}
    </div>
  );
}

export function GameBoard({ guesses, maxGuesses }: GameBoardProps) {
  const emptyRows = maxGuesses - guesses.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ minWidth: '880px' }}>
        <div
          className="grid gap-1.5 mb-2"
          style={{ gridTemplateColumns: '130px repeat(8, minmax(85px, 1fr))' }}
        >
          {HEADERS.map((h) => (
            <div
              key={h.key}
              className="text-center py-2 flex flex-col items-center gap-0.5"
            >
              <span className="text-base">{h.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {h.label}
              </span>
            </div>
          ))}
        </div>

        {guesses.map((guess, i) => (
          <GuessRow key={i} guess={guess} isLatest={i === guesses.length - 1} />
        ))}

        {Array.from({ length: emptyRows }).map((_, i) => (
          <EmptyRow key={`empty-${i}`} />
        ))}
      </div>
    </div>
  );
}
