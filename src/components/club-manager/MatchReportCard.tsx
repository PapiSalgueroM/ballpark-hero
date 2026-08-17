import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { confidenceLabel } from '@/lib/clubManager';
import type { MatchWeekReport } from '@/lib/clubManager';
import { ConfettiBurst, CelebrationStyles } from '@/components/club-manager/Celebration';

interface MatchReportCardProps {
  report: MatchWeekReport;
  clubName: string;
  onContinue: () => void;
}

/**
 * Full-width post-match report: scoreline, scorers, events, other results.
 *
 * Round 147, the animation pass: full time now lands in stages the way a
 * result actually lands. The verdict slams in after a beat, scorers stagger
 * through in minute order, a win pulses green, a defeat gives one short
 * shake, and a trophy pours confetti. Everything animates on opacity and
 * transform only and every element is laid out at its final size from the
 * first frame, so the no-scroll rule survives the theatre. The Continue
 * button works from frame one: the show never holds the game hostage. And
 * the scoreboard itself is the true final score from the first frame, a
 * line playClubManager enforces (see the comment inside).
 */
export function MatchReportCard({ report, clubName, onContinue }: MatchReportCardProps) {
  const r = report;
  const resultTone = r.won ? 'text-correct' : r.drawn ? 'text-yellow-400' : 'text-destructive';
  const resultWord = r.won ? 'VICTORY' : r.drawn ? 'DRAW' : 'DEFEAT';

  /* The staged reveal, second draft. The first draft counted the score up
     from 0-0, and playClubManager flagged it within the hour: for a moment
     the screen showed a scoreline that contradicted the sim, and "the
     screen never lies about the sim" outranks theatre in this repo. So the
     SCOREBOARD is the true final from the first frame, and the show lives
     in everything around it: the verdict slams in after a beat, scorers
     stagger through in minute order, a win pulses, a defeat shakes once,
     a trophy pours confetti. Keyed off the report so every match re-runs. */
  const [verdict, setVerdict] = useState(false);
  useEffect(() => {
    setVerdict(false);
    const t = setTimeout(() => setVerdict(true), 450);
    return () => clearTimeout(t);
  }, [r.home, r.away, r.homeGoals, r.awayGoals]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      <CelebrationStyles />
      <div className={cn(
        'relative bg-surface-1 border border-border rounded-2xl p-5 text-center animate-in fade-in zoom-in-95 duration-300',
        verdict && r.won && 'cm-win-pulse',
        verdict && !r.won && !r.drawn && 'cm-loss-shake',
      )}>
        {verdict && r.trophyWon && <ConfettiBurst seed={r.homeGoals * 7 + r.awayGoals * 3 + 1} count={34} />}
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{r.compLabel}</div>
        {/* Laid out at final size from frame one; only opacity moves in. */}
        <h2 className={cn('text-2xl font-display font-bold mb-3', resultTone, verdict ? 'cm-slam' : 'opacity-0')}>
          {resultWord}{r.decidedBy === 'pens' ? ' (PENS)' : ''}
        </h2>

        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 text-right">
            <div className={cn('text-sm font-bold truncate', r.home === clubName ? 'text-primary' : 'text-foreground')}>{r.home}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-secondary font-display text-2xl font-bold text-foreground shrink-0 tabular-nums">
            {r.homeGoals} - {r.awayGoals}
          </div>
          <div className="flex-1 text-left">
            <div className={cn('text-sm font-bold truncate', r.away === clubName ? 'text-primary' : 'text-foreground')}>{r.away}</div>
          </div>
        </div>

        {(r.myScorers.length > 0 || r.oppScorers.length > 0) && (
          <div className="grid grid-cols-2 gap-3 mt-4 text-left">
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{clubName} scorers</div>
              {r.myScorers.length === 0 && <p className="text-[10px] text-muted-foreground">-</p>}
              {r.myScorers.map((sc, i) => (
                <p key={i} className="text-[11px] text-foreground cm-rise" style={{ animationDelay: `${0.35 + i * 0.14}s` }}>⚽ {sc.name} {sc.minute}'</p>
              ))}
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Them</div>
              {r.oppScorers.length === 0 && <p className="text-[10px] text-muted-foreground">-</p>}
              {r.oppScorers.map((sc, i) => (
                <p key={i} className="text-[11px] text-muted-foreground cm-rise" style={{ animationDelay: `${0.45 + i * 0.14}s` }}>⚽ {sc.name} {sc.minute}'</p>
              ))}
            </div>
          </div>
        )}

        {r.trophyWon && (
          <div className={cn('mt-4 py-2.5 px-3 rounded-xl bg-gold/10 border border-gold/40 text-gold font-bold text-sm', verdict && 'cm-gold-glow')}>
            🏆 {r.trophyWon} WON!
          </div>
        )}

        {r.events.length > 0 && (
          <div className="mt-4 text-left bg-surface-2 border border-border/60 rounded-xl p-3">
            {r.events.map((e, i) => (
              <p key={i} className="text-[11px] text-foreground py-0.5 cm-rise" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>{e}</p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-5 mt-4">
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">League pos</div>
            <div className="text-lg font-bold font-display text-foreground">#{r.myPosition}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Board</div>
            <div className={cn(
              'text-lg font-bold font-display',
              r.confidence >= 60 ? 'text-emerald-400' : r.confidence >= 30 ? 'text-yellow-400' : 'text-red-400',
            )}>
              {Math.round(r.confidence)}
              <span className={cn('text-[10px] font-normal ml-1', verdict ? 'cm-slam' : 'opacity-0', r.confidenceDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                ({r.confidenceDelta >= 0 ? '+' : ''}{r.confidenceDelta})
              </span>
            </div>
            <div className="text-[9px] text-muted-foreground">{confidenceLabel(r.confidence)}</div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="mt-5 inline-flex items-center gap-2 px-8 py-3 min-h-[44px] bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
        >
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {r.otherResults.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
            {r.competition === 'uclGroup' ? 'Other group result' : 'Around the grounds'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {r.otherResults.map((or, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-0.5 border-b border-border/30 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <span className="text-muted-foreground truncate flex-1">{or.home}</span>
                <span className="font-bold text-foreground px-2 shrink-0">{or.hg}-{or.ag}</span>
                <span className="text-muted-foreground truncate flex-1 text-right">{or.away}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchReportCard;
