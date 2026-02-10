import { UfcGuessResult, UfcCellResult } from '@/types/ufc';
import { cn } from '@/lib/utils';

interface UfcGameBoardProps {
  guesses: UfcGuessResult[];
  maxGuesses: number;
}

const HEADERS = [
  { key: 'fighter', label: 'FIGHTER', emoji: '🥊' },
  { key: 'yearsActive', label: 'YRS', emoji: '📅' },
  { key: 'weightClass', label: 'WEIGHT', emoji: '⚖️' },
  { key: 'nationality', label: 'NAT', emoji: '🌍' },
  { key: 'age', label: 'AGE', emoji: '🎂' },
  { key: 'wins', label: 'WINS', emoji: '✅' },
  { key: 'losses', label: 'LOSSES', emoji: '❌' },
  { key: 'draws', label: 'DRAWS', emoji: '🤝' },
  { key: 'koTko', label: 'KO/TKO', emoji: '💥' },
  { key: 'submissions', label: 'SUBS', emoji: '🔒' },
  { key: 'p4pRank', label: 'P4P', emoji: '🏆' },
];

const cellKeys = ['yearsActive', 'weightClass', 'nationality', 'age', 'wins', 'losses', 'draws', 'koTko', 'submissions', 'p4pRank'] as const;

function CellComponent({ cell, animDelay }: { cell: UfcCellResult; animDelay: number }) {
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

function GuessRow({ guess }: { guess: UfcGuessResult }) {
  return (
    <div
      className="grid gap-1.5 mb-1.5"
      style={{ gridTemplateColumns: '120px repeat(10, minmax(75px, 1fr))' }}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-lg h-16 px-2 font-bold text-xs animate-cell-reveal',
          guess.isCorrect ? 'bg-correct text-correct-foreground' : 'bg-card text-foreground'
        )}
        style={{ animationDelay: '0ms' }}
      >
        <span className="text-center leading-tight">{guess.fighterName}</span>
      </div>

      {cellKeys.map((key, i) => (
        <CellComponent key={key} cell={guess.cells[key]} animDelay={(i + 1) * 80} />
      ))}
    </div>
  );
}

function EmptyRow() {
  return (
    <div
      className="grid gap-1.5 mb-1.5"
      style={{ gridTemplateColumns: '120px repeat(10, minmax(75px, 1fr))' }}
    >
      {Array.from({ length: 11 }).map((_, i) => (
        <div key={i} className="rounded-lg h-16 bg-muted/40 border border-border/30" />
      ))}
    </div>
  );
}

export function UfcGameBoard({ guesses, maxGuesses }: UfcGameBoardProps) {
  const emptyRows = maxGuesses - guesses.length;

  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ minWidth: '960px' }}>
        <div
          className="grid gap-1.5 mb-2"
          style={{ gridTemplateColumns: '120px repeat(10, minmax(75px, 1fr))' }}
        >
          {HEADERS.map((h) => (
            <div key={h.key} className="text-center py-2 flex flex-col items-center gap-0.5">
              <span className="text-base">{h.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {h.label}
              </span>
            </div>
          ))}
        </div>

        {guesses.map((guess, i) => (
          <GuessRow key={i} guess={guess} />
        ))}

        {Array.from({ length: emptyRows }).map((_, i) => (
          <EmptyRow key={`empty-${i}`} />
        ))}
      </div>
    </div>
  );
}
