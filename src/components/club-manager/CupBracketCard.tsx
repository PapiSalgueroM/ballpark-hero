import { cn } from '@/lib/utils';
import { leagueOf } from '@/lib/clubManager';
import type { CareerState, CupTie, CupRound } from '@/lib/clubManager';

interface CupBracketCardProps {
  career: CareerState;
  onClubClick?: (club: string) => void;
}

const ROUND_LABEL: Record<CupRound, string> = {
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  F: 'Final',
};

/**
 * Round 102: the domestic cup as a real bracket.
 *
 * It used to be four one-off draws against clubs from my own league, with
 * nobody else in the competition and nothing to look at. Now it is sixteen
 * clubs from the whole country, so in England the Championship is in it,
 * every tie gets played, and a lower division side putting a giant out is
 * flagged as the upset it is.
 */
export function CupBracketCard({ career, onClubClick }: CupBracketCardProps) {
  const bracket = career.cupBracket;
  if (!bracket || bracket.length === 0) return null;

  const rounds: CupRound[] = ['R16', 'QF', 'SF', 'F'];
  const winner = bracket.find(t => t.round === 'F')?.winner ?? null;
  const cupName = leagueOf(career.clubName).cupName;
  const upsets = bracket.filter(t => t.upset && t.winner).length;

  const side = (name: string, tie: CupTie, isHome: boolean) => {
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
        <div className="text-xs text-muted-foreground uppercase tracking-wider">🏅 {cupName} bracket</div>
        {winner && <div className="text-[10px] font-bold text-gold truncate max-w-[50%] text-right">🏆 {winner}</div>}
      </div>

      {rounds.map(r => {
        const ties = bracket.filter(t => t.round === r).sort((a, b) => a.slot - b.slot);
        if (ties.length === 0) {
          return (
            <div key={r}>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{ROUND_LABEL[r]}</div>
              <div className="text-[10px] text-muted-foreground px-2 py-1.5 border border-dashed border-border rounded-lg">
                Waiting on the round before.
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
                    t.mine ? 'border-primary/60 bg-primary/10'
                      : t.upset ? 'border-gold/50 bg-gold/5'
                      : 'border-border bg-background/40',
                  )}
                >
                  {side(t.home, t, true)}
                  {side(t.away, t, false)}
                  {(t.pens || t.upset) && (
                    <div className="text-[8px] text-muted-foreground px-2 pb-0.5">
                      {t.upset && <span className="text-gold font-bold">Giant killing. </span>}
                      {t.pens && <>Level after 90. {t.winner} win on penalties.</>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[9px] text-muted-foreground">
        Sixteen clubs from across the country, every tie played.
        {upsets > 0 && ` ${upsets} giant killing${upsets === 1 ? '' : 's'} so far.`}
      </p>
    </div>
  );
}

export default CupBracketCard;
