/**
 * Round 204: the tile hub, shared by all four front offices.
 *
 * Deliberately the same box as Club Manager's HubTile from Round 74, down
 * to the padding and the pulse, because the point of the reformat is that
 * every management game on this site opens the same way. What each box
 * SAYS is decided in src/lib/foHub.ts, which is harnessed; this file is
 * only the shape of it.
 *
 * The other half of the rule is the drill in: opening a box replaces the
 * grid instead of unrolling underneath it, and a back control returns you.
 * That is what keeps the hub one thumb tall on the phone the owner plays
 * this on rather than a page you scroll for ten seconds.
 */
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FoPanelKey, FoTile } from '@/lib/foHub';

export function FoHubTiles({ tiles, onOpen }: { tiles: FoTile[]; onOpen: (key: FoPanelKey) => void }) {
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
export function FoPanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
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
