import { useId, useState } from 'react';
import type { CareerSeason } from '@/types/career';
import { careerCellValue } from '@/lib/careerBoardCells';

interface CareerRevealReviewProps {
  career: CareerSeason[];
  revealedCells: Set<string>;
  guessesUsed: number;
  boxesUsed: number;
  won: boolean;
}

const COLUMNS = ['club', 'appearances', 'goals', 'assists', 'marketValue'] as const;
type ReviewColumn = (typeof COLUMNS)[number];
const COLUMN_LABELS: Record<ReviewColumn, string> = {
  club: 'Club',
  appearances: 'Apps',
  goals: 'Goals',
  assists: 'Assists',
  marketValue: 'Value',
};
const CELL_KEY = /^(0|[1-9]\d*)-(club|appearances|goals|assists|marketValue)$/;

export function CareerRevealReview({ career, revealedCells, guessesUsed, boxesUsed, won }: CareerRevealReviewProps) {
  const [open, setOpen] = useState(false);
  const [revealIndex, setRevealIndex] = useState(0);
  const [copyMessage, setCopyMessage] = useState('');
  const panelId = useId();
  const trail: { row: number; column: ReviewColumn }[] = [];
  const orderIndex = new Map<string, number>();

  for (const key of revealedCells) {
    const match = CELL_KEY.exec(key);
    if (!match || match[0] !== key) continue;
    const row = Number(match[1]);
    if (row >= career.length) continue;
    trail.push({ row, column: match[2] as ReviewColumn });
    orderIndex.set(key, trail.length);
  }

  const index = Math.min(revealIndex, Math.max(0, trail.length - 1));
  const current = trail[index];
  const map = [
    'Career Quiz reveal map',
    won ? 'Won' : 'Not solved',
    `Guesses: ${guessesUsed}`,
    `Boxes: ${boxesUsed}`,
    'Columns: Club | Apps | Goals | Assists | Value',
    ...career.map((_, i) => `Row ${i + 1}: ` + COLUMNS.map(col =>
      orderIndex.has(`${i}-${col}`) ? String(orderIndex.get(`${i}-${col}`)) : '.',
    ).join(' | ')),
  ].join('\n');

  const copyMap = async () => {
    setCopyMessage('');
    try {
      await navigator.clipboard.writeText(map);
      setCopyMessage('Reveal map copied.');
    } catch {
      setCopyMessage('Could not copy. Select the map above to copy it.');
    }
  };

  return (
    <section aria-label="Your reveal review" className="w-full min-w-0 text-left">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="min-h-[44px] w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
      >
        Review your reveals
      </button>
      {open && (
        <div id={panelId} className="mt-3 min-w-0 space-y-3">
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div><dt className="text-muted-foreground">Guesses</dt><dd className="font-semibold">{guessesUsed}</dd></div>
            <div><dt className="text-muted-foreground">Boxes</dt><dd className="font-semibold">{boxesUsed}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Your boxes, in the order they first opened. Hints can open several boxes together.
            The full board reveal at the end adds no entries.
          </p>
          {current ? (
            <>
              <div aria-live="polite" aria-atomic="true">
                <p className="text-sm font-semibold">Reveal {index + 1} of {trail.length}</p>
                <p className="mt-1 break-words text-sm">
                  {`Row ${current.row + 1} · ${career[current.row].season} · ${COLUMN_LABELS[current.column]}: ${careerCellValue(career[current.row], current.column)}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRevealIndex(Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous reveal
                </button>
                <button
                  type="button"
                  onClick={() => setRevealIndex(Math.min(trail.length - 1, index + 1))}
                  disabled={index === trail.length - 1}
                  className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next reveal
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm">No boxes were opened before the game ended.</p>
          )}
          <p className="text-xs text-muted-foreground">
            Numbers show first-opening order. Dots mark boxes you did not open.
          </p>
          <pre
            aria-label="Spoiler-free reveal map"
            tabIndex={0}
            className="max-h-48 min-w-0 max-w-full select-text overflow-auto rounded-lg bg-secondary p-3 text-xs"
          >{map}</pre>
          <button
            type="button"
            onClick={copyMap}
            className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Copy reveal map
          </button>
          <p role="status" className="text-xs text-muted-foreground">{copyMessage}</p>
        </div>
      )}
    </section>
  );
}
