/**
 * The hub box, and the bar that gets you back from one.
 *
 * Round 74 gave Club Manager the owner's rule: "make it smaller and with
 * boxes and when they open it takes u to see something different". Round
 * 204 brought it to the four front offices and put the drawing in one
 * file. Round 208 brings it to the four My Career games too, which is why
 * the file now lives here under components/hub rather than inside the
 * front office folder it started in: the same box now serves nine games
 * across four different engines, and the name should not claim otherwise.
 *
 * What a box says is always decided in a harnessed engine (foHub.ts for
 * the GM games, careerHub.ts for the career games), never here. This file
 * is only the shape of it, so a change to the look lands everywhere at
 * once and a change to the words is checkable without a browser.
 */
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/** One box. The engines all produce this shape. */
export interface HubTile {
  key: string;
  icon: string;
  /** The word on the box. Harnesses tap by it, so it is contract. */
  title: string;
  /** The headline fact. Never empty. */
  value: string;
  /** The second line. Never empty: an empty box looks broken. */
  sub: string;
  /** The pulse. True means something wants a decision from you. */
  accent: boolean;
}

export function HubTiles({ tiles, onOpen }: { tiles: HubTile[]; onOpen: (key: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {tiles.map(t => (
        <button
          key={t.key}
          onClick={() => onOpen(t.key)}
          className={cn(
            'rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary',
            t.accent ? 'border-gold/50' : 'border-border',
          )}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-base leading-none">{t.icon}</span>
            {t.accent && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.title}</div>
          <div className="truncate font-display text-sm font-bold text-foreground">{t.value}</div>
          <div className="mt-0.5 truncate text-[9px] text-muted-foreground">{t.sub}</div>
        </button>
      ))}
    </div>
  );
}

/** The bar above an opened box. Round 203's thumb rule: py-2, not py-0.5. */
export function HubPanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Hub
      </button>
      <span className="font-display text-sm font-bold text-foreground">{title}</span>
    </div>
  );
}
