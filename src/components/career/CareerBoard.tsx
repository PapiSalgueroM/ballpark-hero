import { CareerSeason } from '@/types/career';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';

interface CareerBoardProps {
  career: CareerSeason[];
  revealedCells: Set<string>;
  onReveal: (key: string) => void;
  gameOver: boolean;
}

const COLUMNS = [
  { key: 'season', label: 'SEASON', emoji: '📅' },
  { key: 'club', label: 'CLUB', emoji: '🏟️' },
  { key: 'appearances', label: 'APPS', emoji: '🎽' },
  { key: 'goals', label: 'GOALS', emoji: '⚽' },
  { key: 'assists', label: 'AST', emoji: '👟' },
  { key: 'marketValue', label: 'VALUE', emoji: '💰' },
];

function CoveredCell({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center rounded-lg h-14 bg-secondary hover:bg-secondary/80 border border-border/50 transition-all cursor-pointer group"
    >
      <Eye className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  );
}

function RevealedCell({ value }: { value: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg h-14 bg-card border border-border/30 font-semibold text-sm animate-cell-reveal">
      <span className="leading-tight text-center px-1">{value}</span>
    </div>
  );
}

export function CareerBoard({ career, revealedCells, onReveal, gameOver }: CareerBoardProps) {
  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ minWidth: '650px' }}>
        {/* Headers */}
        <div
          className="grid gap-1.5 mb-2"
          style={{ gridTemplateColumns: 'repeat(6, minmax(90px, 1fr))' }}
        >
          {COLUMNS.map((c) => (
            <div key={c.key} className="text-center py-2 flex flex-col items-center gap-0.5">
              <span className="text-base">{c.emoji}</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {career.map((s, rowIdx) => (
          <div
            key={rowIdx}
            className="grid gap-1.5 mb-1.5"
            style={{ gridTemplateColumns: 'repeat(6, minmax(90px, 1fr))' }}
          >
            {COLUMNS.map((col) => {
              const cellKey = `${rowIdx}-${col.key}`;
              const isRevealed = col.key === 'season' || revealedCells.has(cellKey) || gameOver;

              if (!isRevealed) {
                return <CoveredCell key={col.key} onClick={() => onReveal(cellKey)} />;
              }

              let value = '';

              switch (col.key) {
                case 'season':
                  value = s.season;
                  break;
                case 'club':
                  value = s.club;
                  break;
                case 'appearances':
                  value = String(s.appearances);
                  break;
                case 'goals':
                  value = String(s.goals);
                  break;
                case 'assists':
                  value = String(s.assists);
                  break;
                case 'marketValue':
                  value = `$${s.marketValue}M`;
                  break;
              }

              return <RevealedCell key={col.key} value={value} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
