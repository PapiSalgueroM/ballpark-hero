import { cn } from '@/lib/utils';
import type { CareerState, UclTie, UclKoRound } from '@/lib/clubManager';

interface UclBracketCardProps {
  career: CareerState;
  onClubClick?: (club: string) => void;
}

const ROUND_LABEL: Record<UclKoRound, string> = {
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
};

/**
 * Round 95: the Champions League knockout stage as an actual bracket.
 * His ask: "once the champions league goes on and after the group stages
 * that u also show it in bracket format."
 *
 * Every one of the eight clubs is real and every tie is simulated, so the
 * bracket fills in around you whether or not you are still in it.
 */
export function UclBracketCard({ career, onClubClick }: UclBracketCardProps) {
  const bracket = career.uclBracket;
  if (!bracket || bracket.length === 0) return null;

  // Round 462: an era bracket opens with the round of 16 it really had.
  const rounds: UclKoRound[] = bracket.some(t => t.round === 'R16') ? ['R16', 'QF', 'SF', 'F'] : ['QF', 'SF', 'F'];
  const champion = bracket.find(t => t.round === 'F')?.winner ?? null;

  const side = (name: string, tie: UclTie, isHome: boolean) => {
    const goals = isHome ? tie.homeGoals : tie.awayGoals;
    const settled = tie.winner !== null;
    const through = settled && tie.winner === name;
    const mine = name === career.clubName;
    return (
      <div
        onClick={onClubClick ? () => onClubClick(name) : undefined}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
          onClubClick && 'cursor-pointer hover:bg-secondary/50',
          settled && !through && 'opacity-45',
        )}
      >
        <span className={cn(
          'flex-1 min-w-0 truncate text-[11px]',
          mine ? 'text-primary font-bold' : through ? 'text-foreground font-semibold' : 'text-foreground',
        )}>
          {name}
        </span>
        <span className={cn(
          'shrink-0 text-[11px] font-bold font-display w-4 text-right',
          through ? 'text-gold' : 'text-muted-foreground',
        )}>
          {goals === null ? '' : goals}
        </span>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">⭐ Champions League bracket</div>
        {champion && (
          <div className="text-[10px] font-bold text-gold truncate max-w-[50%] text-right">🏆 {champion}</div>
        )}
      </div>

      {rounds.map((r, i) => {
        const ties = bracket.filter(t => t.round === r).sort((a, b) => a.slot - b.slot);
        if (ties.length === 0) {
          const before = rounds[i - 1] ?? 'QF';
          return (
            <div key={r}>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{ROUND_LABEL[r]}</div>
              <div className="text-[10px] text-muted-foreground px-2 py-1.5 border border-dashed border-border rounded-lg">
                Waiting on the {ROUND_LABEL[before].toLowerCase()}.
              </div>
            </div>
          );
        }
        return (
          <div key={r}>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{ROUND_LABEL[r]}</div>
            <div className={cn('grid gap-1.5', ties.length > 2 ? 'sm:grid-cols-2' : 'grid-cols-1')}>
              {ties.map(t => (
                <div
                  key={`${t.round}-${t.slot}`}
                  className={cn(
                    'rounded-lg border py-1',
                    t.mine ? 'border-primary/60 bg-primary/10' : 'border-border bg-background/40',
                  )}
                >
                  {side(t.home, t, true)}
                  {side(t.away, t, false)}
                  {t.pens && (
                    <div className="text-[8px] text-muted-foreground px-2 pb-0.5">
                      Level after 90. {t.winner} win on penalties.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[9px] text-muted-foreground">
        Every tie is played, including the ones you are not in. Your own tie is decided by your match.
      </p>
    </div>
  );
}

export default UclBracketCard;
