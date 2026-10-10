import { cn } from '@/lib/utils';
import type { CareerState, UclKoRound } from '@/lib/clubManager';
import { CelebrationStyles } from '@/components/club-manager/Celebration';
// Round 983: the cup card holds the moment and the club line; this card shares them.
import { BracketSide, tieKey, tieMoment, trophyGlow, useBracketMoment } from '@/components/club-manager/CupBracketCard';

const UCL_ROUNDS: UclKoRound[] = ['PO', 'R16', 'QF', 'SF', 'F'];

interface UclBracketCardProps {
  career: CareerState;
  onClubClick?: (club: string) => void;
}

const ROUND_LABEL: Record<UclKoRound, string> = {
  PO: 'Knockout playoffs',
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
  // Round 983: above the empty bracket return, hooks never follow one.
  const moment = useBracketMoment(career, 'ucl', bracket, UCL_ROUNDS);
  if (!bracket || bracket.length === 0) return null;

  // Round 462: an era bracket opens with the round of 16 it really had.
  const rounds: UclKoRound[] = bracket.some(t => t.round === 'PO') ? UCL_ROUNDS
    : bracket.some(t => t.round === 'R16') ? UCL_ROUNDS.filter(round => round !== 'PO') : ['QF', 'SF', 'F'];
  const champion = bracket.find(t => t.round === 'F')?.winner ?? null;

  return (
    <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">⭐ Champions League bracket</div>
        {champion && (
          <div
            className={cn('text-[10px] font-bold text-gold truncate max-w-[50%] text-right', moment?.wonFinal && 'cm-gold-glow rounded-md')}
            style={moment?.wonFinal ? trophyGlow(moment) : undefined}
          >
            🏆 {champion}
          </div>
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
              {ties.map(t => {
                const m = tieMoment(moment, t);
                return (
                <div
                  key={`${t.round}-${t.slot}`}
                  className={cn(
                    'rounded-lg border py-1',
                    t.mine ? 'border-primary/60 bg-primary/10' : 'border-border bg-background/40',
                    m.drawn && 'cm-tick-in',
                  )}
                  style={m.drawn ? { animationDelay: m.delay } : undefined}
                  data-cm-bracket-drawn={m.drawn ? tieKey(t) : undefined}
                >
                  <BracketSide name={t.home} tie={t} isHome clubName={career.clubName} onClubClick={onClubClick} landing={m.through} delay={m.delay} />
                  <BracketSide name={t.away} tie={t} isHome={false} clubName={career.clubName} onClubClick={onClubClick} landing={m.through} delay={m.delay} />
                  {/* Round 507: a two legged tie shows the legs under the
                      aggregate, and shows the first leg on its own while the
                      second is still to come, because until then the headline
                      score is deliberately empty. */}
                  {t.legs === 2 && t.leg1 && (
                    <div className="text-[8px] text-muted-foreground px-2 pb-0.5" data-cm-bracket-legs={t.leg2 ? `${t.homeGoals}-${t.awayGoals}` : 'open'}>
                      {/* Round 781: the headline numbers on a finished two legged tie ARE the aggregate, so say so. */}
                      {t.leg2
                        ? `Agg ${t.homeGoals}-${t.awayGoals}. First leg ${t.leg1.homeGoals}-${t.leg1.awayGoals}, second leg ${t.leg2.awayGoals}-${t.leg2.homeGoals}${t.aet ? ' after extra time' : ''} at ${t.away}.`
                        : `First leg ${t.leg1.homeGoals}-${t.leg1.awayGoals}. Second leg at ${t.away}.`}
                    </div>
                  )}
                  {t.byAwayGoals && (
                    <div className="text-[8px] text-muted-foreground px-2 pb-0.5">
                      Level on aggregate{t.aet ? ' after extra time' : ''}. {t.winner} through on away goals.
                    </div>
                  )}
                  {/* Round 670: a tie that went to extra time says so. One
                      settled in it, and one still level after it. A tie
                      written before this round carries no aet and keeps the
                      line it always had. */}
                  {t.aet && !t.pens && !t.byAwayGoals && (
                    <div className="text-[8px] text-muted-foreground px-2 pb-0.5" data-cm-bracket-aet>
                      {t.legs === 2 ? 'Level on aggregate after 90.' : 'Level after 90.'} {t.winner} won it in extra time.
                    </div>
                  )}
                  {t.pens && (
                    <div className="text-[8px] text-muted-foreground px-2 pb-0.5">
                      {t.aet ? (t.legs === 2 ? 'Level on aggregate after extra time.' : 'Level after extra time.') : t.legs === 2 ? 'Level over two legs.' : 'Level after 90.'} {t.winner} win on penalties.
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <p className="text-[9px] text-muted-foreground">
        Every tie is played, including the ones you are not in. Your own tie is decided by your match.
      </p>
      {/* Round 983: the kit's keyframes, only while a moment plays, and last
          so the card's space-y gap never lands on the line under it. */}
      {moment && <CelebrationStyles />}
    </div>
  );
}

export default UclBracketCard;
