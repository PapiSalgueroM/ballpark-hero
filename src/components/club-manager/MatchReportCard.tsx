import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { confidenceLabel } from '@/lib/clubManager';
import type { MatchWeekReport, MatchStats } from '@/lib/clubManager';
import { ConfettiBurst, CelebrationStyles } from '@/components/club-manager/Celebration';

/** Round 157: one stat as two bars meeting in the middle, matchday-app style. */
function StatBar({ label, mine, theirs, decimals = 0 }: {
  label: string; mine: number; theirs: number; decimals?: number;
}) {
  const total = mine + theirs;
  const myShare = total > 0 ? (mine / total) * 100 : 50;
  const fmt = (n: number) => decimals ? n.toFixed(decimals) : String(n);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="font-bold text-foreground tabular-nums">{fmt(mine)}</span>
        <span className="text-muted-foreground uppercase tracking-wider text-[9px]">{label}</span>
        <span className="font-bold text-muted-foreground tabular-nums">{fmt(theirs)}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary gap-px">
        <div className="bg-primary rounded-l-full" style={{ width: `${myShare}%` }} />
        <div className="bg-muted-foreground/40 rounded-r-full" style={{ width: `${100 - myShare}%` }} />
      </div>
    </div>
  );
}

/** The full stats block, only when the report carries the Round 157 detail. */
function StatsBlock({ stats }: { stats: MatchStats }) {
  return (
    <div className="space-y-2 text-left">
      <StatBar label="Possession" mine={stats.possession} theirs={100 - stats.possession} />
      <StatBar label="Shots" mine={stats.shots} theirs={stats.oppShots} />
      <StatBar label="On target" mine={stats.onTarget} theirs={stats.oppOnTarget} />
      <StatBar label="Expected goals" mine={stats.xg} theirs={stats.oppXg} decimals={2} />
      <StatBar label="Corners" mine={stats.corners} theirs={stats.oppCorners} />
      <StatBar label="Fouls" mine={stats.fouls} theirs={stats.oppFouls} />
    </div>
  );
}

/**
 * Round 169: momentum as a continuous area chart, the way his match app
 * models draw it: one smooth flow line, our spells filled above the middle,
 * theirs below. Pure SVG from the same nine buckets the bars used, so the
 * data did not move, only the picture.
 */
function MomentumArea({ momentum }: { momentum: number[] }) {
  const W = 100;
  const H = 40;
  const MID = H / 2;
  const AMP = 16;
  const pts = momentum.map((m, i) => ({
    x: momentum.length > 1 ? (i / (momentum.length - 1)) * W : 0,
    y: MID - m * AMP,
  }));
  // A smooth line through the buckets: quadratic segments via midpoints.
  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    const my = (pts[i - 1].y + pts[i].y) / 2;
    line += ` Q ${pts[i - 1].x} ${pts[i - 1].y} ${mx} ${my}`;
  }
  line += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  const area = `${line} L ${W} ${MID} L 0 ${MID} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <clipPath id="cmMomUp"><rect x="0" y="0" width={W} height={MID} /></clipPath>
        <clipPath id="cmMomDown"><rect x="0" y={MID} width={W} height={MID} /></clipPath>
      </defs>
      <path d={area} className="fill-primary/45" clipPath="url(#cmMomUp)" />
      <path d={area} className="fill-red-400/40" clipPath="url(#cmMomDown)" />
      <line x1="0" y1={MID} x2={W} y2={MID} className="stroke-border" strokeWidth="0.5" />
      <path d={line} className="stroke-primary fill-none" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

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
  /* Round 157: the ratings list folds away because ten rows of numbers is a
     lot of card, but the man of the match is always on show. */
  const [showRatings, setShowRatings] = useState(false);
  const detail = r.detail ?? null;
  const motm = detail?.myRatings.find(x => x.motm) ?? null;

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
        {/* Round 169: the venue line his match app models lead with. */}
        {detail?.attendance !== undefined && (
          <div className="text-[9px] text-muted-foreground mb-1">
            🏟️ {detail.venue === 'home' ? 'Your ground' : detail.venue === 'away' ? 'Away day' : 'Neutral venue'}
            {' · '}crowd {detail.attendance.toLocaleString()}
            {detail.capacity ? ` of ${detail.capacity.toLocaleString()}` : ''}
            {detail.added ? ` · +${detail.added.h1}' & +${detail.added.h2}' added` : ''}
          </div>
        )}
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
                <p key={i} className="text-[11px] text-foreground cm-rise" style={{ animationDelay: `${0.35 + i * 0.14}s` }}>
                  ⚽ {sc.name} {sc.minute}'
                  {sc.assist && <span className="text-[9px] text-muted-foreground"> · 🅰️ {sc.assist}</span>}
                </p>
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

        {/* Round 157: cards, injuries and subs with their minutes, right under
            the scorers where a matchday app puts them. */}
        {detail && (detail.cards.length > 0 || detail.injuries.length > 0 || detail.subs.length > 0) && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {detail.cards.map((c, i) => (
              <span key={`c${i}`} className={cn(
                'text-[10px] rounded-full px-2 py-0.5 border',
                c.kind === 'red' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-500',
              )}>
                {c.kind === 'red' ? '🟥' : '🟨'} {c.name} {c.minute}'
              </span>
            ))}
            {detail.injuries.map((inj, i) => (
              <span key={`i${i}`} className="text-[10px] rounded-full px-2 py-0.5 border bg-secondary border-border text-foreground">
                🩹 {inj.name} {inj.minute}' ({inj.weeks}w)
              </span>
            ))}
            {detail.subs.map((s, i) => (
              <span key={`s${i}`} className="text-[10px] rounded-full px-2 py-0.5 border bg-secondary border-border text-muted-foreground">
                <span className="text-emerald-400">▲ {s.on}</span> <span className="text-red-400">▼ {s.off}</span> {s.minute}'
              </span>
            ))}
          </div>
        )}

        {r.trophyWon && (
          <div className={cn('mt-4 py-2.5 px-3 rounded-xl bg-gold/10 border border-gold/40 text-gold font-bold text-sm', verdict && 'cm-gold-glow')}>
            🏆 {r.trophyWon} WON!
          </div>
        )}

        {/* Round 157: the numbers behind the scoreline, derived once inside
            the sim from the same lambdas the goals were drawn from. */}
        {detail && (
          <div className="mt-4 bg-surface-2 border border-border/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
              <span className="text-primary font-bold normal-case">{clubName}</span>
              <span>Match stats</span>
              <span className="font-bold normal-case">Them</span>
            </div>
            <StatsBlock stats={detail.stats} />
            {/* Round 169: momentum as one continuous flow, us above the
                line, them below, like his match app models draw it. */}
            <div className="mt-3">
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1 text-left">Balance of play</div>
              <MomentumArea momentum={detail.momentum} />
              <div className="flex justify-between text-[8px] text-muted-foreground/70">
                <span>0'</span><span>45'</span><span>90'</span>
              </div>
            </div>
          </div>
        )}

        {/* Round 157: the man of the match, and everyone's number behind him. */}
        {detail && motm && (
          <div className="mt-3 text-left bg-surface-2 border border-border/60 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] text-foreground">
                ⭐ <span className="font-bold">{motm.name}</span>
                <span className="text-muted-foreground"> · Player of the match</span>
              </div>
              <span className="text-xs font-bold font-display text-gold tabular-nums">{motm.rating.toFixed(1)}</span>
            </div>
            {detail.oppBest && (
              <div className="text-[10px] text-muted-foreground mt-1">Their danger man on the day: {detail.oppBest}</div>
            )}
            <button
              onClick={() => setShowRatings(v => !v)}
              className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronDown className={cn('w-3 h-3 transition-transform', showRatings && 'rotate-180')} />
              {showRatings ? 'Hide player ratings' : 'All player ratings'}
            </button>
            {showRatings && (
              <div className="mt-1.5 space-y-0.5">
                {detail.myRatings.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="w-7 shrink-0 text-muted-foreground">{p.pos}</span>
                    <span className="text-foreground truncate">{p.name}</span>
                    {p.goals > 0 && <span className="shrink-0">{'⚽'.repeat(Math.min(p.goals, 3))}</span>}
                    {p.assists > 0 && <span className="shrink-0 text-muted-foreground">🅰️{p.assists > 1 ? `x${p.assists}` : ''}</span>}
                    <span className={cn(
                      'ml-auto shrink-0 font-bold tabular-nums rounded px-1',
                      p.rating >= 7.5 ? 'text-emerald-400' : p.rating >= 6.3 ? 'text-foreground' : 'text-red-400',
                    )}>
                      {p.rating.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
