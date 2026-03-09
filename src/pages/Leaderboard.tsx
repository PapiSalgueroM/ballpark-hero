import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame, Calendar, Loader2, Medal, Gamepad2 } from 'lucide-react';

interface DailyLeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  games_completed: number;
  total_points: number;
  current_streak: number;
}

interface AllTimeEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  score: number;
  game_type?: string;
}

interface StreakEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  streak: number;
}

const TOTAL_GAMES = 37;

export default function Leaderboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<AllTimeEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<StreakEntry[]>([]);

  useEffect(() => {
    loadLeaderboards();

    // Auto-refresh every 60 seconds
    const interval = setInterval(loadLeaderboards, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  const loadLeaderboards = async () => {
    setLoading(true);

    // === Daily leaderboard from user_scores ===
    const { data: userScores } = await supabase
      .from('user_scores')
      .select('user_id, games_played_today, total_points, current_streak')
      .gt('games_played_today', 0)
      .order('games_played_today', { ascending: false })
      .order('total_points', { ascending: false })
      .limit(50);

    if (userScores && userScores.length > 0) {
      // Sort client-side for tiebreaker (Supabase may not guarantee multi-column order)
      const sorted = [...userScores].sort(
        (a, b) => b.games_played_today - a.games_played_today || b.total_points - a.total_points
      );

      const userIds = sorted.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds);

      const profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      profiles?.forEach((p: any) => profileMap.set(p.user_id, p));

      setDailyLeaderboard(
        sorted.map((entry, i) => {
          const p = profileMap.get(entry.user_id);
          return {
            rank: i + 1,
            user_id: entry.user_id,
            display_name: p?.display_name || null,
            username: p?.username || null,
            games_completed: entry.games_played_today,
            total_points: entry.total_points,
            current_streak: (entry as any).current_streak || 0,
          };
        })
      );
    } else {
      setDailyLeaderboard([]);
    }

    // === All-time best scores ===
    const { data: allTimeData } = await supabase
      .from('user_best_scores')
      .select('user_id, best_score, game_type')
      .order('best_score', { ascending: false })
      .limit(50);

    if (allTimeData) {
      const atUserIds = [...new Set(allTimeData.map((d) => d.user_id))];
      const { data: atProfiles } = atUserIds.length > 0
        ? await supabase.from('profiles').select('user_id, display_name, username').in('user_id', atUserIds)
        : { data: [] as any[] };
      const atMap = new Map<string, { display_name: string | null; username: string | null }>();
      atProfiles?.forEach((p: any) => atMap.set(p.user_id, p));

      setAllTimeLeaderboard(
        allTimeData.map((entry, i) => ({
          rank: i + 1,
          user_id: entry.user_id,
          display_name: atMap.get(entry.user_id)?.display_name || null,
          username: atMap.get(entry.user_id)?.username || null,
          score: entry.best_score,
          game_type: entry.game_type,
        }))
      );
    }

    // === Streak leaderboard ===
    const { data: streakData } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, current_streak')
      .gt('current_streak', 0)
      .order('current_streak', { ascending: false })
      .limit(50);

    if (streakData) {
      setStreakLeaderboard(
        streakData.map((entry, i) => ({
          rank: i + 1,
          user_id: entry.user_id,
          display_name: entry.display_name,
          username: entry.username,
          streak: entry.current_streak,
        }))
      );
    }

    setLoading(false);
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  const UserName = ({ entry }: { entry: { username: string | null; display_name: string | null } }) =>
    entry.username ? (
      <Link to={`/profile/${entry.username}`} className="font-medium hover:text-primary transition-colors truncate">
        {entry.display_name || `@${entry.username}`}
      </Link>
    ) : (
      <span className="font-medium truncate">{entry.display_name || 'Anonymous'}</span>
    );

  return (
    <>
      <PageSeo
        title="Daily Leaderboard — Top Players Today | DoUKnowBall"
        description="See who's completed the most games today on DoUKnowBall. Compete for the top spot on the daily leaderboard!"
        path="/leaderboard"
      />
      <div className="min-h-screen bg-background">
        <Header />

        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-6 text-center">🏆 Leaderboard</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="daily" className="gap-1.5 text-xs sm:text-sm">
                <Calendar className="w-4 h-4" />
                Today
              </TabsTrigger>
              <TabsTrigger value="alltime" className="gap-1.5 text-xs sm:text-sm">
                <Trophy className="w-4 h-4" />
                All Time
              </TabsTrigger>
              <TabsTrigger value="streaks" className="gap-1.5 text-xs sm:text-sm">
                <Flame className="w-4 h-4" />
                Streaks
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* ===== DAILY TAB ===== */}
                <TabsContent value="daily">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Top 50 — Games Completed Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dailyLeaderboard.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">No games played yet today — be the first!</p>
                      ) : (
                        <>
                          {/* Table header */}
                          <div className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_5rem_4.5rem] gap-2 px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border mb-2">
                            <span>#</span>
                            <span>Player</span>
                            <span className="text-center">Games</span>
                            <span className="text-center">Points</span>
                            <span className="text-center">Streak</span>
                          </div>

                          <div className="space-y-1">
                            {dailyLeaderboard.map((entry) => {
                              const isCurrentUser = entry.user_id === user?.id;
                              return (
                                <div
                                  key={entry.user_id}
                                  className={`grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_5rem_5rem_4.5rem] gap-2 items-center px-3 py-2.5 rounded-lg border transition-colors ${
                                    isCurrentUser
                                      ? 'border-green-500/40 bg-green-500/10'
                                      : 'border-border hover:bg-secondary/30'
                                  }`}
                                >
                                  {/* Rank */}
                                  <div className="flex items-center justify-center">
                                    {getRankDisplay(entry.rank)}
                                  </div>

                                  {/* Name */}
                                  <div className="min-w-0">
                                    <UserName entry={entry} />
                                    {/* Mobile inline stats */}
                                    <div className="flex items-center gap-3 sm:hidden mt-0.5">
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Gamepad2 className="w-3 h-3" />
                                        {entry.games_completed}/{TOTAL_GAMES}
                                      </span>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Trophy className="w-3 h-3 text-yellow-500" />
                                        {entry.total_points.toLocaleString()}
                                      </span>
                                      {entry.current_streak > 0 && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Flame className="w-3 h-3 text-orange-500" />
                                          {entry.current_streak}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Desktop stats */}
                                  <span className="hidden sm:block text-center text-sm font-semibold">
                                    {entry.games_completed}/{TOTAL_GAMES}
                                  </span>
                                  <span className="hidden sm:block text-center text-sm font-semibold text-[hsl(var(--ft-gold))]">
                                    {entry.total_points.toLocaleString()}
                                  </span>
                                  <span className="hidden sm:flex items-center justify-center gap-1 text-sm">
                                    {entry.current_streak > 0 ? (
                                      <>
                                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                                        <span className="font-medium">{entry.current_streak}</span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </span>

                                  {/* Mobile right side — empty since stats inline */}
                                  <span className="sm:hidden" />
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ===== ALL-TIME TAB ===== */}
                <TabsContent value="alltime">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">All-Time Best Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {allTimeLeaderboard.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">No scores yet</p>
                      ) : (
                        <div className="space-y-1">
                          {allTimeLeaderboard.map((entry) => (
                            <div
                              key={`${entry.user_id}-${entry.game_type}`}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                entry.user_id === user?.id ? 'border-green-500/40 bg-green-500/10' : 'border-border'
                              }`}
                            >
                              <div className="flex items-center justify-center w-6">{getRankDisplay(entry.rank)}</div>
                              <div className="flex-1 min-w-0">
                                <UserName entry={entry} />
                                {entry.game_type && <p className="text-xs text-muted-foreground">{entry.game_type}</p>}
                              </div>
                              <span className="text-lg font-bold text-primary">{entry.score}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ===== STREAKS TAB ===== */}
                <TabsContent value="streaks">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Longest Active Streaks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {streakLeaderboard.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">No active streaks</p>
                      ) : (
                        <div className="space-y-1">
                          {streakLeaderboard.map((entry) => (
                            <div
                              key={entry.user_id}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                entry.user_id === user?.id ? 'border-green-500/40 bg-green-500/10' : 'border-border'
                              }`}
                            >
                              <div className="flex items-center justify-center w-6">{getRankDisplay(entry.rank)}</div>
                              <div className="flex-1 min-w-0">
                                <UserName entry={entry} />
                              </div>
                              <div className="flex items-center gap-1">
                                <Flame className="w-4 h-4 text-orange-500" />
                                <span className="text-lg font-bold">{entry.streak}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </main>

        <div className="max-w-4xl mx-auto px-4">
          <Footer />
        </div>
      </div>
    </>
  );
}
