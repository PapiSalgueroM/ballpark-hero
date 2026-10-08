import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { peekCurrentPlayerName } from '@/lib/completions';
import { formatNumber } from '@/lib/formatNumber';
import {
  DAILY_STANDING_RPC,
  bucketEdges,
  beatPercent,
  bucketIndexFor,
  parseStanding,
  type DailyStanding,
  type ScoreBucket,
} from '@/lib/dailyStanding';

export type { ScoreBucket };

interface PostGameStatsProps {
  /** The slug the game records under, the same one its useGameCompletion call uses. */
  gameSlug: string;
  /** The score the game recorded for today's daily. */
  userScore: number;
  /** Only true on the DAILY result. A practice or unlimited round is not
      today's puzzle, so it has no place on today's board. */
  isVisible: boolean;
  /** Rows on the scale the game really records, best row first. Round 644
      found Footle's panel on a 0 to 1000 default while its scores run 100 to
      700; Round 716 made this required so no game can fall back to that. */
  buckets: ScoreBucket[];
}

/**
 * Round 716: today's standing, the one shared panel every daily game mounts
 * beside its result. It asks the database for the day's counts
 * (src/lib/dailyStanding.ts has the rules) and shows the players, where you
 * landed, the median and the top score. Fewer than 20 players today, or any
 * failure at all, and it shows nothing: a number about 4 people is not a
 * standing, and a wrong one is worse than none.
 */
const PostGameStats = ({ gameSlug, userScore, isVisible, buckets }: PostGameStatsProps) => {
  const [standing, setStanding] = useState<DailyStanding | null>(null);
  const [grown, setGrown] = useState(false);
  const bucketKey = JSON.stringify(buckets);
  const rows = useMemo<ScoreBucket[]>(() => JSON.parse(bucketKey), [bucketKey]);

  useEffect(() => {
    setStanding(null);
    setGrown(false);
    if (!isVisible || !Number.isFinite(userScore)) return undefined;
    const edges = bucketEdges(rows);
    if (!edges) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase.rpc as any)(DAILY_STANDING_RPC, {
          p_game: gameSlug,
          p_edges: edges,
          p_score: Math.round(userScore),
          p_player: peekCurrentPlayerName() || null,
        });
        if (cancelled || error) return;
        const parsed = parseStanding(data, rows);
        if (!parsed) return;
        setStanding(parsed);
        requestAnimationFrame(() => { if (!cancelled) setGrown(true); });
      } catch {
        /* the standing is a bonus, never a crash */
      }
    })();
    return () => { cancelled = true; };
  }, [isVisible, gameSlug, userScore, rows]);

  if (!isVisible || !standing) return null;

  const pct = beatPercent(standing);
  const mostInARow = Math.max(...standing.counts, 1);
  const yourRow = bucketIndexFor(userScore, rows);

  return (
    <div
      data-no-prerender
      data-testid="daily-standing"
      className="bg-card border border-border rounded-xl p-4 mt-2 mb-4 w-full max-w-md mx-auto text-left"
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
        📊 Today's board · {standing.players.toLocaleString('en-US')} players
      </p>
      <p className="text-sm text-foreground mb-3">
        You beat <span className="text-primary font-bold">{pct}%</span> of players today
      </p>
      <div className="space-y-1.5">
        {rows.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2">
            <span className={`text-[11px] w-16 shrink-0 text-right font-mono ${i === yourRow ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {b.label}
            </span>
            <div className="flex-1 h-5 bg-secondary/50 rounded overflow-hidden relative">
              <div
                className={`h-full rounded transition-[width] duration-700 ease-out motion-reduce:transition-none ${i === yourRow ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                style={{ width: grown ? `${(standing.counts[i] / mostInARow) * 100}%` : '0%' }}
              />
              {standing.counts[i] > 0 && (
                <span className="absolute right-1.5 top-0 h-full flex items-center text-[10px] text-muted-foreground">
                  {formatNumber(standing.counts[i])}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <span>You <span className="font-semibold text-foreground">{formatNumber(Math.round(userScore))}</span></span>
        <span>Median <span className="font-semibold text-foreground">{formatNumber(Math.round(standing.median))}</span></span>
        <span>Top <span className="font-semibold text-foreground">{formatNumber(standing.top)}</span></span>
      </div>
    </div>
  );
};

export default PostGameStats;
