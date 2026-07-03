import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPlayerName } from '@/lib/completions';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES, type GameDef } from '@/data/gameRegistry';

import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trophy, Calendar, Loader2, Medal } from 'lucide-react';

/**
 * #102: game_completions-backed leaderboard. Rebuilt from scratch on top of
 * the anonymous, guest-first game_completions table (score + player_name
 * columns added alongside this rebuild) instead of the old user_scores /
 * user_best_scores / profiles.all_time_score reads, which are dead in
 * production (see docs/INCENTIVES_SPEC.md "Explicitly out of scope"). No
 * login required to appear on or read this leaderboard.
 */

interface ScoreRow {
  rank: number;
  playerName: string;
  score: number;
}

/** Every daily game in the registry, grouped the same way the registry groups them, for the game picker. */
const DAILY_GAMES_BY_CATEGORY: Array<{ title: string; games: GameDef[] }> = CATEGORIES
  .map(cat => ({ title: cat.title, games: cat.games.filter(g => g.daily) }))
  .filter(cat => cat.games.length > 0);

const ALL_DAILY_GAMES: GameDef[] = DAILY_GAMES_BY_CATEGORY.flatMap(c => c.games);

function slugFromPath(path: string): string {
  return path.replace(/^\//, '');
}

function labelForSlug(slug: string): string {
  const g = ALL_DAILY_GAMES.find(g => slugFromPath(g.path) === slug);
  return g ? `${g.emoji} ${g.label}` : slug;
}

/** UTC calendar date string, matching game_completions.completed_on's default (now() at time zone utc)::date. */
function todayUtcStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Leaderboard() {
  const { profile } = useAuth();
  const ownHandle = useMemo(() => getCurrentPlayerName(profile), [profile]);

  const [selectedSlug, setSelectedSlug] = useState<string>(
    ALL_DAILY_GAMES.length > 0 ? slugFromPath(ALL_DAILY_GAMES[0].path) : ''
  );
  const [activeTab, setActiveTab] = useState<'today' | 'alltime'>('today');
  const [loading, setLoading] = useState(true);
  const [todayRows, setTodayRows] = useState<ScoreRow[]>([]);
  const [allTimeRows, setAllTimeRows] = useState<ScoreRow[]>([]);

  useEffect(() => {
    if (!selectedSlug) { setLoading(false); return; }
    loadBoards(selectedSlug);
  }, [selectedSlug]);

  const loadBoards = async (slug: string) => {
    setLoading(true);
    try {
      // Single read, both tabs derived from it client-side: game_completions
      // isn't in the generated types (added directly via SQL, same pattern
      // as the rest of this table's access - see src/lib/completions.ts),
      // so it's addressed dynamically rather than through typed .from().
      const { data, error } = await (supabase.from as any)('game_completions')
        .select('player_name, score, completed_on, created_at')
        .eq('game', slug)
        .not('score', 'is', null)
        .not('player_name', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1000);

      if (error || !data) {
        setTodayRows([]);
        setAllTimeRows([]);
        setLoading(false);
        return;
      }

      const today = todayUtcStr();
      setAllTimeRows(groupToTopScores(data));
      setTodayRows(groupToTopScores(data.filter((r: any) => r.completed_on === today)));
    } catch {
      setTodayRows([]);
      setAllTimeRows([]);
    }
    setLoading(false);
  };

  /**
   * Groups raw rows by player_name, keeping each player's max score (ties
   * broken by whichever hit that score first, since rows are pre-sorted
   * ascending by created_at before this runs), then sorts descending and
   * caps at top 20.
   */
  const groupToTopScores = (rows: Array<{ player_name: string; score: number }>): ScoreRow[] => {
    const best = new Map<string, number>();
    rows.forEach(r => {
      const prev = best.get(r.player_name);
      if (prev === undefined || r.score > prev) best.set(r.player_name, r.score);
    });
    return [...best.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([playerName, score], i) => ({ rank: i + 1, playerName, score }));
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  const BoardList = ({ rows, emptyLabel }: { rows: ScoreRow[]; emptyLabel: string }) => {
    if (rows.length === 0) {
      return <p className="text-center text-muted-foreground py-12">{emptyLabel}</p>;
    }
    return (
      <div className="space-y-1">
        {rows.map(row => {
          const isOwn = row.playerName === ownHandle;
          return (
            <div
              key={row.playerName}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isOwn ? 'border-gold/50 bg-surface-1' : 'border-border hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-center justify-center w-6">{getRankDisplay(row.rank)}</div>
              <div className="flex-1 min-w-0">
                <span className={`font-medium truncate ${isOwn ? 'text-gold' : ''}`}>
                  {row.playerName}{isOwn ? ' (you)' : ''}
                </span>
              </div>
              <span className="text-lg font-bold text-primary">{row.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <PageSeo
        title="Leaderboards: Top Scores by Game | DoUKnowBall"
        description="See today's top scores and all-time bests for every daily game on DoUKnowBall. No account needed to play or to appear on the board."
        path="/leaderboard"
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2 text-center">Leaderboards</h1>
          <p className="text-center text-muted-foreground text-sm mb-6">
            Top scores for every daily game. Play as a guest and you still show up, under your own handle.
          </p>

          {ALL_DAILY_GAMES.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">No daily games are configured yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-4">
                <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue placeholder="Pick a game" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {DAILY_GAMES_BY_CATEGORY.map(cat => (
                      <SelectGroup key={cat.title}>
                        <SelectLabel>{cat.title}</SelectLabel>
                        {cat.games.map(g => (
                          <SelectItem key={g.path} value={slugFromPath(g.path)}>
                            {g.emoji} {g.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'today' | 'alltime')}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="today" className="gap-1.5 text-xs sm:text-sm">
                    <Calendar className="w-4 h-4" />
                    Today
                  </TabsTrigger>
                  <TabsTrigger value="alltime" className="gap-1.5 text-xs sm:text-sm">
                    <Trophy className="w-4 h-4" />
                    All-Time
                  </TabsTrigger>
                </TabsList>

                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <TabsContent value="today">
                      <Card className="bg-surface-1">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Top 20 Today: {labelForSlug(selectedSlug)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BoardList
                            rows={todayRows}
                            emptyLabel={`No scores yet today for ${labelForSlug(selectedSlug)}. Be the first!`}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="alltime">
                      <Card className="bg-surface-1">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Top 20 All-Time: {labelForSlug(selectedSlug)}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BoardList
                            rows={allTimeRows}
                            emptyLabel={`No scores yet for ${labelForSlug(selectedSlug)}. Be the first!`}
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </>
          )}
        </main>

        <div className="max-w-4xl mx-auto px-4">
          <Footer />
        </div>
      </div>
    </>
  );
}
