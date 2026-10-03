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
}

/**
 * Round 942: the GM's own progression, the Club Manager XP screen's twin on the
 * shared ladder in gmXp.ts. Small tiles, one button each, no long page.
 * Not mounted by this round: each board mounts it once it feeds its trees.
 */
export function GmXpPanel({ block: raw, onSpendPoint, live }: GmXpPanelProps) {
  const block = gmXpOf(raw);
  const level = levelFor(block.xp, GM_MAX_LEVEL);
  const free = pointsFree(GM_TREE_SET, block);
  const spent = pointsSpent(GM_TREE_SET, block);
  const progress = levelProgress(block.xp, GM_MAX_LEVEL);
  const atCap = level >= GM_MAX_LEVEL;
  const nextAt = atCap ? null : xpForLevel(level + 1);

  return (
    <div className="space-y-3" data-gm-xp>
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground">🎖️ GM level {level}</div>
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {Math.round(block.xp).toLocaleString()} XP
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden" role="presentation">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="text-[10px] text-muted-foreground">
          {atCap
            ? 'Every tree is full. There is nothing left to earn.'
            : `${Math.max(0, Math.round((nextAt ?? 0) - block.xp)).toLocaleString()} XP to level ${level + 1}, which is one more point.`}
        </div>
        <div className={cn('text-[11px] font-bold', free > 0 ? 'text-gold' : 'text-muted-foreground')}>
          {free > 0
            ? `${free} point${free === 1 ? '' : 's'} to spend`
            : `${spent} of ${GM_TREES.length * GM_MAX_TREE_POINTS} points spent`}
        </div>
        <p className="text-[9px] text-muted-foreground">
          You earn XP for a winning season, titles, playoff rounds, beating the owner's ask,
          finishing higher than anyone expected and bringing a prospect through. Points are
          yours for good: nothing here can be taken back.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GM_TREES.map(tree => {
          const info = GM_TREE_INFO[tree];
          const have = Math.max(0, Math.min(GM_MAX_TREE_POINTS, block.points[tree] ?? 0));
          const full = have >= GM_MAX_TREE_POINTS;
          const onDesk = live.includes(tree);
          const canSpend = onDesk && free > 0 && !full;
          return (
            <div
              key={tree}
              data-gm-tree={tree}
              className={cn('rounded-xl border p-2.5 space-y-1.5', full ? 'border-gold/50 bg-gold/5' : 'border-border bg-card')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-foreground">{info.emoji} {info.label}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {'●'.repeat(have)}{'○'.repeat(GM_MAX_TREE_POINTS - have)}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground">{info.blurb}</p>
              <p className="text-[9px] text-muted-foreground/80 italic">
                {onDesk ? info.needs : 'Not on this desk yet, so it takes no points here.'}
              </p>
              {full && <p className="text-[9px] text-gold">{info.atMax}</p>}
              <button
                onClick={() => onSpendPoint(tree)}
                disabled={!canSpend}
                title={!onDesk ? `${info.label} does nothing on this desk yet` : full ? `${info.label} is full` : free > 0 ? `Put a point into ${info.label}` : 'No points to spend yet'}
                className={cn(
                  'w-full px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
                  canSpend
                    ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                    : 'bg-secondary border-border text-muted-foreground cursor-not-allowed',
                )}
              >
                {full ? 'Full' : !onDesk ? 'Not here yet' : `Spend a point (${have}/${GM_MAX_TREE_POINTS})`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GmXpPanel;
