import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { confidenceLabel } from '@/lib/clubManager';
import type { MatchWeekReport } from '@/lib/clubManager';

interface MatchReportCardProps {
  report: MatchWeekReport;
  clubName: string;
  onContinue: () => void;
}

/** Full-width post-match report: scoreline, scorers, events, other results. */
export function MatchReportCard({ report, clubName, onContinue }: MatchReportCardProps) {
  const r = report;
  const resultTone = r.won ? 'text-correct' : r.drawn ? 'text-yellow-400' : 'text-destructive';
  const resultWord = r.won ? 'VICTORY' : r.drawn ? 'DRAW' : 'DEFEAT';
  const homeIsMine = r.home === clubName;
  const myScore = homeIsMine ? r.homeGoals : r.awayGoals;
  const oppScore = homeIsMine ? r.awayGoals : r.homeGoals;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="bg-surface-1 border border-border rounded-2xl p-5 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{r.compLabel}</div>
        <h2 className={cn('text-2xl font-display font-bold mb-3', resultTone)}>
          {resultWord}{r.decidedBy === 'pens' ? ' (PENS)' : ''}
        </h2>

        <div className="flex items-center justify-center gap-3">
          <div className="flex-1 text-right">
            <div className={cn('text-sm font-bold truncate', r.home === clubName ? 'text-primary' : 'text-foreground')}>{r.home}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-secondary font-display text-2xl font-bold text-foreground shrink-0">
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
                <p key={i} className="text-[11px] text-foreground">⚽ {sc.name} {sc.minute}'</p>
              ))}
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Them</div>
              {r.oppScorers.length === 0 && <p className="text-[10px] text-muted-foreground">-</p>}
              {r.oppScorers.map((sc, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">⚽ {sc.name} {sc.minute}'</p>
              ))}
            </div>
          </div>
        )}

        {r.trophyWon && (
          <div className="mt-4 py-2.5 px-3 rounded-xl bg-gold/10 border border-gold/40 text-gold font-bold text-sm">
            🏆 {r.trophyWon} WON!
          </div>
        )}

        {r.events.length > 0 && (
          <div className="mt-4 text-left bg-surface-2 border border-border/60 rounded-xl p-3">
            {r.events.map((e, i) => (
              <p key={i} className="text-[11px] text-foreground py-0.5">{e}</p>
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
              <span className="text-[10px] font-normal text-muted-foreground ml-1">
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
