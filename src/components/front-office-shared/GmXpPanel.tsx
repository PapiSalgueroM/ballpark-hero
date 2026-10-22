import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  GM_MAX_LEVEL, GM_MAX_TREE_POINTS, GM_TREES, GM_TREE_INFO, GM_TREE_SET,
  gmXpOf, levelFor, levelProgress, pointsFree, pointsSpent, xpForLevel,
} from '@/lib/gmXp';
import type { GmTree } from '@/lib/gmXp';

interface GmXpPanelProps {
  /** The save's GM block, read as is. Absent or mangled reads as a fresh one. */
  block: unknown;
  onSpendPoint: (tree: GmTree) => void;
  /**
   * The trees whose number this board actually feeds. A tree not on the list
   * shows its tile but sells no point, so nobody buys a point that moves
   * nothing on their desk. A board binds a tree by passing its consumer the
   * points and naming it here.
   */
  live: readonly GmTree[];
  /**
   * Round 1533: what THIS desk pays XP for, already on the screen above the
   * panel (hostEarnsLine). Passed, the panel prints no sentence of its own
   * in its place, so the screen never promises a source the save cannot feed.
   * Absent, the panel prints the sentence it always has.
   */
  earns?: string;
}

/**
 * Round 942: the GM's own progression, the Club Manager XP screen's twin on the
 * shared ladder in gmXp.ts. Small tiles, one button each, no long page.
 * Round 1533 (the NFL bind mounts it): on a phone the trees are tiles two a
 * row, the live ones first, each with its own "?" for what it does, every
 * button at least 44 px tall and no text under 11 px.
 */
export function GmXpPanel({ block: raw, onSpendPoint, live, earns }: GmXpPanelProps) {
  const [why, setWhy] = useState<GmTree | null>(null);
  const block = gmXpOf(raw);
  const level = levelFor(block.xp, GM_MAX_LEVEL);
  const free = pointsFree(GM_TREE_SET, block);
  const spent = pointsSpent(GM_TREE_SET, block);
  const progress = levelProgress(block.xp, GM_MAX_LEVEL);
  const atCap = level >= GM_MAX_LEVEL;
  const nextAt = atCap ? null : xpForLevel(level + 1);
  const pointsIn = (tree: GmTree) => Math.max(0, Math.min(GM_MAX_TREE_POINTS, block.points[tree] ?? 0));
  /* A point is only "to spend" when some tile on this desk can take it. */
  const canTakeOne = GM_TREES.some(tree => live.includes(tree) && pointsIn(tree) < GM_MAX_TREE_POINTS);

  return (
    <div className="space-y-3" data-gm-xp>
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground">🎖️ GM level {level}</div>
          <div className="text-[11px] text-muted-foreground tabular-nums">
            {Math.round(block.xp).toLocaleString()} XP
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden" role="presentation">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="text-[11px] text-muted-foreground">
          {atCap
            ? 'Top level. Every point the trees hold has been earned.'
            : `${Math.max(0, Math.round((nextAt ?? 0) - block.xp)).toLocaleString()} XP to level ${level + 1}, which is one more point.`}
        </div>
        <div className={cn('text-[11px] font-bold', free > 0 && canTakeOne ? 'text-gold' : 'text-muted-foreground')}>
          {free > 0 && canTakeOne
            ? `${free} point${free === 1 ? '' : 's'} to spend`
            : free > 0
              ? `${free} point${free === 1 ? '' : 's'} saved. No tree on this desk can take one yet.`
              : `${spent} of ${GM_TREES.length * GM_MAX_TREE_POINTS} points spent`}
        </div>
        {earns === undefined && (
          <p className="text-[11px] text-muted-foreground" data-gm-xp-sources>
            You earn XP every season for your win share, plus titles, playoff rounds, meeting or
            beating the owner's ask, finishing higher than anyone expected and bringing a prospect
            through. Points are yours for good: nothing here can be taken back.
          </p>
        )}
      </div>

      {/* The live trees first, then the rest: on a phone the trees this desk feeds are on the first screen. */}
      <div className="grid grid-cols-2 gap-2">
        {[...GM_TREES.filter(t => live.includes(t)), ...GM_TREES.filter(t => !live.includes(t))].map(tree => {
          const info = GM_TREE_INFO[tree];
          const have = pointsIn(tree);
          const full = have >= GM_MAX_TREE_POINTS;
          const onDesk = live.includes(tree);
          const canSpend = onDesk && free > 0 && !full;
          const open = why === tree;
          return (
            <div
              key={tree}
              data-gm-tree={tree}
              className={cn('grid grid-cols-[1fr_auto] gap-x-1 gap-y-1.5 rounded-xl border p-2.5', full ? 'border-gold/50 bg-gold/5' : 'border-border bg-card')}
            >
              <span className="col-start-1 row-start-1 min-w-0 text-[11px] font-bold leading-tight text-foreground">{info.emoji} {info.label}</span>
              <span className="col-start-1 row-start-2 text-[11px] text-muted-foreground tabular-nums" aria-label={`${have} of ${GM_MAX_TREE_POINTS} points`}>
                {'●'.repeat(have)}{'○'.repeat(GM_MAX_TREE_POINTS - have)}
              </span>
              {/* The spend button comes first of the tile's buttons, so a harness reading the tile's button reads this one. */}
              <button
                onClick={() => onSpendPoint(tree)}
                disabled={!canSpend}
                title={!onDesk ? `${info.label} does nothing on this desk yet` : full ? `${info.label} is full` : free > 0 ? `Put a point into ${info.label}` : 'No points to spend yet'}
                className={cn(
                  'col-span-2 row-start-3 min-h-[44px] w-full rounded-lg border px-2 py-1 text-[11px] font-bold leading-tight transition-all',
                  canSpend
                    ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                    : 'bg-secondary border-border text-muted-foreground cursor-not-allowed',
                )}
              >
                {full ? 'Full' : !onDesk ? 'Not here yet' : `Spend a point (${have}/${GM_MAX_TREE_POINTS})`}
              </button>
              <button
                type="button"
                onClick={() => setWhy(open ? null : tree)}
                aria-expanded={open}
                aria-label={`What ${info.label} does`}
                className="col-start-2 row-span-2 row-start-1 -mr-1 -mt-1 h-11 w-11 rounded-full text-xs text-muted-foreground hover:text-foreground"
              >
                ?
              </button>
              {open && (
                <div className="col-span-2 row-start-4 space-y-1" data-gm-tree-help>
                  <p className="text-[11px] leading-snug text-muted-foreground">{info.blurb}</p>
                  <p className="text-[11px] italic leading-snug text-muted-foreground">
                    {onDesk ? info.needs : 'Not on this desk yet, so it takes no points here.'}
                  </p>
                  {full && <p className="text-[11px] leading-snug text-gold">{info.atMax}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GmXpPanel;
