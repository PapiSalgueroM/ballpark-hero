import { useState } from 'react';
import { UfcGuessResult, UfcCellResult } from '@/types/ufc';
import { cn } from '@/lib/utils';
import { clues } from './ufcClues';

interface UfcGameBoardProps {
  guesses: UfcGuessResult[];
  maxGuesses: number;
}

const statusText = { correct: 'Exact', close: 'Close', incorrect: 'No match' };
const statusClass = {
  correct: 'bg-correct text-correct-foreground',
  close: 'bg-close text-close-foreground',
  incorrect: 'bg-incorrect text-incorrect-foreground',
};
function feedback(cell: UfcCellResult) {
  return statusText[cell.status] + (cell.arrow === 'up' ? ' · Higher' : cell.arrow === 'down' ? ' · Lower' : '');
}

function ClueCards({ guesses }: { guesses: UfcGuessResult[] }) {
  const [selection, setSelection] = useState({ index: -1, count: -1 });
  const index = selection.count === guesses.length ? selection.index : guesses.length - 1;
  const guess = guesses[index];
  return <section aria-label="Fighter clues" className="mb-3 lg:hidden">
    {!guess ? <p className="text-center text-sm text-muted-foreground">Your first guess reveals nine clues.</p> : <>
      <label className="text-sm font-semibold" htmlFor="ufc-review-guess">Review a guess</label>
      <select id="ufc-review-guess" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-card px-3 font-semibold"
        value={index} onChange={e => setSelection({ index: Number(e.target.value), count: guesses.length })}>
        {guesses.map((item, i) => <option value={i} key={i}>{i + 1}. {item.fighterName}</option>)}
      </select>
      <dl className="mt-2 grid grid-cols-2 gap-1.5 min-[360px]:grid-cols-3">
        {clues.map(({ key, label }) => {
          const cell = guess.cells[key];
          return <div data-ufc-clue={key} key={key} className={cn('min-w-0 rounded-lg p-2 [overflow-wrap:anywhere]', statusClass[cell.status])}>
            <dt className="text-xs">{label}</dt>
            <dd className="mt-1 text-sm font-bold">{cell.value}</dd>
            <dd className="mt-1 text-xs">{feedback(cell)}</dd>
          </div>;
        })}
      </dl>
    </>}
  </section>;
}

function CellComponent({ cell, animDelay }: { cell: UfcCellResult; animDelay: number }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg h-16 min-w-0 [overflow-wrap:anywhere] font-bold text-sm animate-cell-reveal',
        statusClass[cell.status]
      )}
      style={{ animationDelay: `${animDelay}ms` }}
    >
      <span className="leading-tight text-center px-1">{cell.value}</span>
      <span className="sr-only">{feedback(cell)}</span>
      {cell.arrow && (
        <span aria-hidden="true" className="text-[10px] mt-0.5 opacity-80">
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
      style={{ gridTemplateColumns: '120px repeat(9, minmax(0, 1fr))' }}
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

      {clues.map(({ key }, i) => (
        <CellComponent key={key} cell={guess.cells[key]} animDelay={(i + 1) * 80} />
      ))}
    </div>
  );
}

function EmptyRow() {
  return (
    <div
      className="grid gap-1.5 mb-1.5"
      style={{ gridTemplateColumns: '120px repeat(9, minmax(0, 1fr))' }}
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-lg h-16 bg-muted/40 border border-border/30" />
      ))}
    </div>
  );
}

export function UfcGameBoard({ guesses, maxGuesses }: UfcGameBoardProps) {
  const emptyRows = maxGuesses - guesses.length;

  return (
    <>
      <ClueCards guesses={guesses} />
      <section aria-label="Fighter comparison board" className="hidden pb-4 lg:block">
        <div
          className="grid gap-1.5 mb-2"
          style={{ gridTemplateColumns: '120px repeat(9, minmax(0, 1fr))' }}
        >
          <div className="py-2 text-center text-[10px] font-semibold tracking-wider text-muted-foreground"><span className="block text-base">🥊</span>FIGHTER</div>
          {clues.map((h) => (
            <div key={h.key} className="text-center py-2 flex flex-col items-center gap-0.5">
              <span className="text-base">{h.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {h.short}
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
      </section>
    </>
  );
}
