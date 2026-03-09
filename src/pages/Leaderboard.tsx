import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Flame, Calendar, Loader2, Medal } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  username: string | null;
  score?: number;
  streak?: number;
  game_type?: string;
}

const GAME_OPTIONS = [
  { value: 'all', label: 'All Games' },
  { value: 'footle', label: '🎯 Footle' },
  { value: 'career', label: '📜 Career Quiz' },
  { value: 'ufc-chain', label: '🔗 Combat Chain' },
  { value: 'football-grid', label: '🏈 Football Grid' },
  { value: 'nba-connect-4', label: '🏀 NBA Connect 4' },
];

export default function Leaderboard() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [gameFilter, setGameFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboards();
  }, [gameFilter, user]);

  const loadLeaderboards = async () => {
    setLoading(true);

    // Load daily scores
    let dailyQuery = supabase
      .from('user_game_scores')
      .select(`
        user_id,
        score,
        game_type,
        profiles!inner(display_name, username)
      `)
      .eq('puzzle_date', new Date().toISOString().split('T')[0])
      .order('score', { ascending: false })
      .limit(10);

    if (gameFilter !== 'all') {
      dailyQuery = dailyQuery.eq('game_type', gameFilter);
    }

    const { data: dailyData } = await dailyQuery;

    if (dailyData) {
      setDailyLeaderboard(
        dailyData.map((entry: any, index: number) => ({
          rank: index + 1,
          user_id: entry.user_id,
          display_name: entry.profiles?.display_name,
          username: entry.profiles?.username,
          score: entry.score,
          game_type: entry.game_type,
        }))
      );
    }

    // Load all-time best scores
    let allTimeQuery = supabase
      .from('user_best_scores')
      .select(`
        user_id,
        best_score,
        game_type,
        profiles!inner(display_name, username)
      `)
      .order('best_score', { ascending: false })
      .limit(10);

    if (gameFilter !== 'all') {
      allTimeQuery = allTimeQuery.eq('game_type', gameFilter);
    }

    const { data: allTimeData } = await allTimeQuery;

    if (allTimeData) {
      setAllTimeLeaderboard(
        allTimeData.map((entry: any, index: number) => ({
          rank: index + 1,
          user_id: entry.user_id,
          display_name: entry.profiles?.display_name,
          username: entry.profiles?.username,
          score: entry.best_score,
          game_type: entry.game_type,
        }))
      );
    }

    // Load streak leaderboard
    const { data: streakData } = await supabase
      .from('profiles')
      .select('user_id, display_name, username, current_streak')
      .gt('current_streak', 0)
      .order('current_streak', { ascending: false })
      .limit(10);

    if (streakData) {
      setStreakLeaderboard(
        streakData.map((entry: any, index: number) => ({
          rank: index + 1,
          user_id: entry.user_id,
          display_name: entry.display_name,
          username: entry.username,
          streak: entry.current_streak,
        }))
      );
    }

    // Calculate user's rank
    if (user) {
      const { count } = await supabase
        .from('user_game_scores')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', new Date().toISOString().split('T')[0])
        .gt('score', dailyData?.[0]?.score || 0);

      setUserRank(count ? count + 1 : null);
    }

    setLoading(false);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">{rank}</span>;
  };

  const LeaderboardList = ({ entries, type }: { entries: LeaderboardEntry[]; type: 'score' | 'streak' }) => (
    <div className="space-y-2">
      {entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No data yet</p>
      ) : (
        entries.map((entry) => (
          <div
            key={`${entry.user_id}-${entry.game_type || 'streak'}`}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              entry.user_id === user?.id ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            {getRankIcon(entry.rank)}
            <div className="flex-1 min-w-0">
              {entry.username ? (
                <Link to={`/profile/${entry.username}`} className="font-medium hover:text-primary">
                  {entry.display_name || `@${entry.username}`}
                </Link>
              ) : (
                <span className="font-medium">{entry.display_name || 'Anonymous'}</span>
              )}
              {entry.game_type && (
                <p className="text-xs text-muted-foreground">{entry.game_type}</p>
              )}
            </div>
            <div className="text-right">
              {type === 'score' ? (
                <span className="text-lg font-bold text-primary">{entry.score}</span>
              ) : (
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-lg font-bold">{entry.streak}</span>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      <PageSeo
        title="Leaderboard | DoUKnowBall"
        description="See the top players on DoUKnowBall. Daily scores, all-time bests, and longest streaks."
        path="/leaderboard"
      />
      <div className="min-h-screen bg-background">
        <Header />

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-display font-bold">🏆 Leaderboard</h1>
            <Select value={gameFilter} onValueChange={setGameFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by game" />
              </SelectTrigger>
              <SelectContent>
                {GAME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User's rank */}
          {user && userRank && (
            <Card className="mb-6 border-primary">
              <CardContent className="pt-4">
                <p className="text-center">
                  <span className="text-muted-foreground">You are ranked </span>
                  <span className="text-2xl font-bold text-primary">#{userRank}</span>
                  <span className="text-muted-foreground"> today</span>
                </p>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="daily" className="gap-2">
                <Calendar className="w-4 h-4" />
                Today
              </TabsTrigger>
              <TabsTrigger value="alltime" className="gap-2">
                <Trophy className="w-4 h-4" />
                All Time
              </TabsTrigger>
              <TabsTrigger value="streaks" className="gap-2">
                <Flame className="w-4 h-4" />
                Streaks
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <TabsContent value="daily">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Scores Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeaderboardList entries={dailyLeaderboard} type="score" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="alltime">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">All-Time Best Scores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeaderboardList entries={allTimeLeaderboard} type="score" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="streaks">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Longest Active Streaks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LeaderboardList entries={streakLeaderboard} type="streak" />
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
