import { cn } from '@/lib/utils';
import { assetKey } from '@/lib/gmTradePackage';
import type { PackageVerdict, TradeAsset } from '@/lib/gmTradePackage';
import type { TradeWindow } from '@/lib/gmDeadline';

/**
 * Round 909: the package builder, shared by all four front offices.
 *
 * Two small columns of tiles, yours and theirs. Tap a tile to put it in the
 * deal or take it out. The board owns the state and the verdict: it builds a
 * TradePackage from the two selections, asks gmTradePackage.evaluatePackage
 * (which runs the deadline, the shape, the league's asset rules, the engine's
 * own cap check and the value, in that order), and hands the answer back
 * here. This file never values anything, so a tile cannot promise a deal the
 * engine would refuse.
 *
 * A piece the league will not let move (an ordinary MLB pick, say) comes in
 * with `blocked` set to the reason and is drawn locked with that reason under
 * it, rather than hidden, so the rule is visible where it bites.
 *
 * Not mounted by this round: the GM desk seam (Round 907) mounts it.
 */

export interface BuilderTile {
  asset: TradeAsset;
  /** The name or the pick, as the board prints it. */
  label: string;
  /** One short line: position and rating, or the round and year. */
  sub?: string;
  /** Why this piece cannot be part of any deal, or absent when it can. */
  blocked?: string;
}

export interface GmTradeBuilderProps {
  partnerName: string;
  mine: BuilderTile[];
  theirs: BuilderTile[];
  /** assetKey of every piece in the deal. */
  selected: Set<string>;
  onToggle: (asset: TradeAsset) => void;
  maxPerSide: number;
  /** The engine's answer to the deal as it stands, or null while it is empty. */
  verdict: PackageVerdict | null;
  window: TradeWindow;
  onPropose: () => void;
}

function Column({ title, tiles, selected, onToggle, full }: {
  title: string; tiles: BuilderTile[]; selected: Set<string>; onToggle: (a: TradeAsset) => void; full: boolean;
}) {
  const inDeal = tiles.filter(t => selected.has(assetKey(t.asset))).length;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{title} ({inDeal})</p>
      <ul className="mt-1 max-h-64 space-y-1 overflow-y-auto pr-0.5">
        {tiles.map(t => {
          const key = assetKey(t.asset);
          const on = selected.has(key);
          const locked = !!t.blocked || (!on && full);
          return (
            <li key={key}>
              <button
                type="button"
                data-gm-tile={key}
                aria-pressed={on}
                disabled={locked}
                onClick={() => onToggle(t.asset)}
                className={cn(
                  'w-full rounded-lg border px-2 py-1 text-left text-xs transition-colors',
                  on ? 'border-gold/60 bg-gold/15 text-foreground' : 'border-border bg-secondary/40 text-foreground',
                  locked && 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="block truncate font-semibold">{t.label}</span>
                {t.sub ? <span className="block truncate text-[10px] text-muted-foreground">{t.sub}</span> : null}
                {t.blocked ? <span className="block text-[10px] text-muted-foreground">{t.blocked}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GmTradeBuilder(props: GmTradeBuilderProps) {
  const { partnerName, mine, theirs, selected, onToggle, maxPerSide, verdict, window: win, onPropose } = props;
  const count = (tiles: BuilderTile[]) => tiles.filter(t => selected.has(assetKey(t.asset))).length;
  const giving = count(mine);
  const getting = count(theirs);
  const ready = win.open && giving > 0 && getting > 0 && verdict?.verdict === 'accepted';

  let line: string;
  if (!win.open) line = win.reason ?? 'The trade window is shut.';
  else if (giving === 0 || getting === 0) line = `Pick what you send and what you want back, up to ${maxPerSide} pieces a side.`;
  else if (!verdict) line = 'Working it out.';
  else if (verdict.verdict === 'accepted') line = `${partnerName} would take that deal.`;
  else line = verdict.reason ?? 'That deal does not work.';

  return (
    <div data-gm-trade-builder className="rounded-2xl border border-border bg-card p-3">
      <div className="flex gap-2">
        <Column title="You send" tiles={mine} selected={selected} onToggle={onToggle} full={giving >= maxPerSide} />
        <Column title={`From ${partnerName}`} tiles={theirs} selected={selected} onToggle={onToggle} full={getting >= maxPerSide} />
      </div>
      <p
        data-gm-verdict={verdict?.verdict ?? 'none'}
        className={cn('mt-2 text-xs', ready ? 'font-semibold text-foreground' : 'text-muted-foreground')}
      >
        {line}
      </p>
      <button
        type="button"
        data-gm-propose
        disabled={!ready}
        onClick={onPropose}
        className={cn(
          'mt-2 w-full rounded-xl px-3 py-2 text-sm font-bold transition-colors',
          ready ? 'bg-primary text-primary-foreground' : 'cursor-not-allowed bg-secondary text-muted-foreground',
        )}
      >
        Make the trade
      </button>
    </div>
  );
}
