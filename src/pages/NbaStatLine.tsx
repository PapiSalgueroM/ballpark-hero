import { useMemo } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useNbaStatLine } from '@/hooks/useNbaStatLine';
import {
  HIT_SCORE, PICK_COUNT, SPLIT_LABEL, STOCKS_FLOOR_YEAR, StatLineSeason,
  StatTarget, per36,
} from '@/lib/nbaStatLine';

/**
 * NBA Stat Line (Round 336). A target per-36 line is shown; build it by
 * picking five real player seasons. The combined line is minutes weighted,
 * the shooting split is recomputed from summed makes and attempts, and the
 * similarity score lands 0 to 100. Daily deals everyone the same target,
 * one scored run per day; unlimited deals a fresh one every run.
 */

const SLUG = 'nba-stat-line';

function targetChips(t: StatTarget): { label: string; value: string }[] {
  const chips = [
    { label: 'PTS', value: t.pts.toFixed(1) },
    { label: 'REB', value: t.trb.toFixed(1) },
    { label: 'AST', value: t.ast.toFixed(1) },
  ];
  if (t.stl != null) chips.push({ label: 'STL', value: t.stl.toFixed(1) });
  if (t.blk != null) chips.push({ label: 'BLK', value: t.blk.toFixed(1) });
  chips.push({ label: SPLIT_LABEL[t.split], value: `${t.splitPct.toFixed(1)}%` });
  return chips;
}

function seasonLine(s: StatLineSeason): string {
  const bits = [
    `${per36(s.pts, s.minutes).toFixed(1)} pts`,
    `${per36(s.trb, s.minutes).toFixed(1)} reb`,
    `${per36(s.ast, s.minutes).toFixed(1)} ast`,
  ];
  return `${bits.join(' · ')} per 36`;
}

export default function NbaStatLine() {
  const g = useNbaStatLine();
  const { phase, target, result } = g;

  const isDone = phase === 'done';
  const score = result?.total ?? 0;
  const hit = score >= HIT_SCORE;
  useGameCompletion(SLUG, isDone && !g.alreadyPlayed, score, hit ? 1 : 0);

  const emojiGrid = useMemo(() => {
    if (!result) return '';
    const squares = result.breakdown
      .map(s => (s.closeness >= 0.9 ? '🟩' : s.closeness >= 0.6 ? '🟨' : '⬜'))
      .join('');
    return `📊 NBA Stat Line ${score}/100\n${squares}`;
  }, [result, score]);

  const modeButton = (label: string, blurb: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="block font-bold text-foreground">{label}</span>
      <span className="block text-xs text-muted-foreground mt-0.5">{blurb}</span>
    </button>
  );

  return (
    <>
      <PageSeo
        title="NBA Stat Line: Build the Target Per 36 Line | DoUKnowBall"
        description="A target per-36 NBA stat line is shown. Pick five real player seasons and get your combined minutes weighted line as close as you can. Daily shared target and an unlimited mode."
        path="/nba-stat-line"
      />
      <GameShell width="wide" title="NBA Stat Line" emoji="📊" subtitle="Five real seasons, one combined per 36 line, get it close.">
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the season pool right now.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'setup' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">How to play</p>
              <p>A target per 36 minute stat line appears: points, rebounds, assists, a shooting split, and steals and blocks when the era tracked them.</p>
              <p>Search NBA history and pick {PICK_COUNT} real player seasons. Their combined line is minutes weighted, so big minute seasons pull harder.</p>
              <p>Submit for a similarity score out of 100. {HIT_SCORE} or better counts as nailing it.</p>
            </div>
            {modeButton('Daily target', 'Same target for everyone, one scored run per day', () => g.start('daily'))}
            {modeButton('Unlimited', 'A fresh random target every run', () => g.start('unlimited'))}
          </div>
        )}

        {phase === 'playing' && target && (
          <div className="space-y-4">
            {/* The target */}
            <div className="rounded-xl border border-primary/40 bg-surface-1 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Target line, per 36 minutes
              </p>
              <div className="flex flex-wrap gap-2">
                {targetChips(target).map(c => (
                  <div key={c.label} className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-center">
                    <span className="block text-base font-bold text-foreground tabular-nums">{c.value}</span>
                    <span className="block text-[10px] font-semibold text-muted-foreground">{c.label}</span>
                  </div>
                ))}
              </div>
              {target.floorYear >= STOCKS_FLOOR_YEAR && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  This target includes stats the league only tracked from {target.floorYear === STOCKS_FLOOR_YEAR ? '1973-74' : '1979-80'}, so only seasons from then on can be picked.
                </p>
              )}
            </div>

            {/* The five slots */}
            <div className="space-y-1.5">
              {Array.from({ length: PICK_COUNT }, (_, i) => {
                const p = g.picks[i];
                return p ? (
                  <div key={p.key} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-1 px-3 py-2">
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {p.player} <span className="text-muted-foreground font-normal">· {p.season} {p.team}</span>
                      </span>
                      <span className="block text-[11px] text-muted-foreground">{seasonLine(p)} · {p.minutes.toLocaleString()} min</span>
                    </div>
                    <button
                      onClick={() => g.removePick(p.key)}
                      aria-label={`Remove ${p.player} ${p.season}`}
                      className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div key={`empty-${i}`} className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                    Season {i + 1} of {PICK_COUNT}
                  </div>
                );
              })}
            </div>

            {/* Live combined line */}
            {g.combined && (
              <div className="rounded-xl border border-border bg-surface-1 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Your combined line so far ({g.picks.length} of {PICK_COUNT})
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-foreground">
                  <span>{g.combined.pts.toFixed(1)} PTS</span>
                  <span>{g.combined.trb.toFixed(1)} REB</span>
                  <span>{g.combined.ast.toFixed(1)} AST</span>
                  {target.stl != null && <span>{(g.combined.stl ?? 0).toFixed(1)} STL</span>}
                  {target.blk != null && <span>{(g.combined.blk ?? 0).toFixed(1)} BLK</span>}
                  <span>{g.combined.splitPct.toFixed(1)}% {SPLIT_LABEL[target.split]}</span>
                </div>
              </div>
            )}

            {/* Search */}
            {g.picks.length < PICK_COUNT && (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={g.query}
                    onChange={e => g.setQuery(e.target.value)}
                    placeholder="Search any NBA player..."
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {g.suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    {g.suggestions.map(s => (
                      <button
                        key={s.key}
                        onClick={() => g.addPick(s)}
                        className="w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors border-b border-border/50 last:border-b-0"
                      >
                        <span className="block text-sm font-semibold text-foreground">
                          {s.player} <span className="text-muted-foreground font-normal">· {s.season} {s.team}</span>
                        </span>
                        <span className="block text-[11px] text-muted-foreground">{seasonLine(s)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={g.submit}
              disabled={!g.canSubmit}
              className={cn(
                'w-full rounded-full py-2.5 font-semibold transition-colors',
                g.canSubmit
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {g.canSubmit ? 'Score my line' : `Pick ${PICK_COUNT - g.picks.length} more season${PICK_COUNT - g.picks.length === 1 ? '' : 's'}`}
            </button>
          </div>
        )}

        {isDone && result && target && (
          <ResultScreen
            won={hit}
            outcomeEmoji={hit ? '🎯' : score >= 70 ? '📊' : '🧱'}
            headline={
              g.alreadyPlayed
                ? 'Today\'s run is in the books'
                : hit ? 'You built the line!' : score >= 70 ? 'Close, real close' : 'The line got away'
            }
            statLine={`Your combined five season line scored ${score} out of 100${hit ? ', a hit' : ''}.`}
            statRow={[{ label: 'Score', value: score }]}
            emojiGrid={emojiGrid}
            share={{ score: String(score), gameName: 'NBA Stat Line', gamePath: '/nba-stat-line' }}
            onPlayAgain={g.mode === 'daily' ? undefined : g.backToSetup}
            playAgainLabel="New target"
            playNext={
              g.mode === 'daily'
                ? <p className="text-xs text-muted-foreground">One scored daily run. A new target lands at midnight Eastern, or play unlimited from the menu.</p>
                : undefined
            }
          >
            <div className="rounded-xl border border-border bg-surface-1 p-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stat by stat, per 36</p>
              <div className="space-y-1">
                {result.breakdown.map(s => (
                  <div key={s.key} className="flex items-center justify-between text-sm tabular-nums">
                    <span className="font-semibold text-foreground w-12">{s.label}</span>
                    <span className="text-muted-foreground">target {s.target.toFixed(1)}{s.key === 'split' ? '%' : ''}</span>
                    <span className="text-foreground">you {s.actual.toFixed(1)}{s.key === 'split' ? '%' : ''}</span>
                    <span className={cn('font-bold w-10 text-right', s.closeness >= 0.9 ? 'text-correct' : s.closeness >= 0.6 ? 'text-primary' : 'text-destructive')}>
                      {Math.round(s.closeness * 100)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Your picks: {g.picks.map(p => `${p.player} ${p.season}`).join(', ')}
              </p>
            </div>
            {g.mode === 'daily' && !g.alreadyPlayed && (
              <p className="text-xs text-muted-foreground mt-2">Want more reps? Unlimited mode deals fresh targets all day.</p>
            )}
          </ResultScreen>
        )}

        {isDone && g.mode === 'daily' && (
          <div className="flex justify-center mt-4">
            <button onClick={g.backToSetup} className="text-xs font-semibold text-primary hover:underline">
              Back to modes
            </button>
          </div>
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType={SLUG} />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="NBA Stat Line: Build the Target Per 36 Line"
          description="A target per-36 stat line from real NBA history, five player seasons of your choosing, and one minutes weighted combined line scored 0 to 100 by similarity. A shared daily target with one scored run, plus an unlimited mode with a fresh target every time."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
