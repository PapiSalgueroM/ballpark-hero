import { cn } from '@/lib/utils';
import type { CareerState } from '@/lib/clubManager';
import {
  MAX_LEVEL, MAX_TREE_POINTS, SKILL_TREES, TREE_INFO,
  levelFor, levelProgress, pointsFree, pointsSpent, xpForLevel, xpOf,
} from '@/lib/clubManagerXp';
import type { SkillTree } from '@/lib/clubManagerXp';

interface XpScreenProps {
  career: CareerState;
  onSpendPoint: (tree: SkillTree) => void;
}

/**
 * Round 513: the manager's own progression, spec section 28.
 *
 * The screen is deliberately honest about two things the spec asks for. Every
 * tile says what a point BUYS rather than naming a stat, because "every skill
 * point must have visible gameplay effects" is worthless if the player cannot
 * tell what happened. And a filled tree says what it bought you, so the last
 * point is not a number going up with nothing behind it.
 *
 * A manager who has spent nothing sees the board and the bar and nothing else
 * changes anywhere in the game, which is Round 95's rule on screen.
 */
export function XpScreen({ career, onSpendPoint }: XpScreenProps) {
  const block = xpOf(career);
  const level = levelFor(block.xp);
  const free = pointsFree(block);
  const spent = pointsSpent(block);
  const progress = levelProgress(block.xp);
  const atCap = level >= MAX_LEVEL;
  const nextAt = atCap ? null : xpForLevel(level + 1);

  return (
    <div className="space-y-3" data-cm-xp>
      {/* The bar: where you are, and what it takes to get one more point. */}
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-foreground">🎖️ Manager level {level}</div>
          <div className="text-[10px] text-muted-foreground tabular-nums">
            {Math.round(block.xp).toLocaleString()} XP
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden" role="presentation">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground">
          {atCap
            ? 'Everything the trees hold is yours. There is nothing left to earn.'
            : `${Math.max(0, Math.round((nextAt ?? 0) - block.xp)).toLocaleString()} XP to level ${level + 1}, which is one more point.`}
        </div>
        <div className={cn('text-[11px] font-bold', free > 0 ? 'text-gold' : 'text-muted-foreground')}>
          {free > 0
            ? `${free} point${free === 1 ? '' : 's'} to spend`
            : `${spent} of ${SKILL_TREES.length * MAX_TREE_POINTS} points spent`}
        </div>
        <p className="text-[9px] text-muted-foreground">
          You earn XP for wins, trophies, board objectives, bringing a boy through the academy,
          going deep in Europe, finishing above what the board asked for, and a summer that sold
          more than it bought. Points are yours for good: nothing here can be taken back.
        </p>
      </div>

      {/* The trees. Small tiles, one row of controls each, no long stacked page. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SKILL_TREES.map(tree => {
          const info = TREE_INFO[tree];
          const have = Math.max(0, Math.min(MAX_TREE_POINTS, block.points[tree] ?? 0));
          const full = have >= MAX_TREE_POINTS;
          const canSpend = free > 0 && !full;
          return (
            <div
              key={tree}
              className={cn(
                'rounded-xl border p-2.5 space-y-1.5',
                full ? 'border-gold/50 bg-gold/5' : 'border-border bg-card',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-foreground">
                  {info.emoji} {info.label}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {'●'.repeat(have)}{'○'.repeat(MAX_TREE_POINTS - have)}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground">{info.blurb}</p>
              {full && <p className="text-[9px] text-gold">{info.atMax}</p>}
              <button
                onClick={() => onSpendPoint(tree)}
                disabled={!canSpend}
                title={
                  full
                    ? `${info.label} is full`
                    : free > 0
                      ? `Put a point into ${info.label}`
                      : 'No points to spend yet'
                }
                className={cn(
                  'w-full px-2 py-1 rounded-lg text-[10px] font-bold border transition-all',
                  canSpend
                    ? 'bg-primary text-primary-foreground border-primary hover:opacity-90'
                    : 'bg-secondary border-border text-muted-foreground cursor-not-allowed',
                )}
              >
                {full ? 'Full' : `Spend a point (${have}/${MAX_TREE_POINTS})`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default XpScreen;
