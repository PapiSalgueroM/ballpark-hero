import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPlayerName } from '@/lib/completions';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES } from '@/data/gameRegistry';

import PageSeo from '@/components/seo/PageSeo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trophy, Calendar, Loader2, Medal, Globe } from 'lucide-react';

/**
 * ONE sitewide leaderboard (owner: "I don't like that each game has a
 * leaderboard. There should be just one in which everyone is there and their
 * total points are listed. But if u want to break it up by sport we can also
 * do that... it shouldn't be only top 20, I would love top 100, but also it
 * says what's ur rank in the world. Like ur 127.").
 *
 * - Global TOTAL points across every game, Today + All-Time tabs, top 100.
 * - Optional per-sport filter (registry categories), never per-game.
 * - "Your rank" card always shows YOUR world rank + points, even when you're
 *   outside the top 100 (via the global_rank RPC).
 * - Fair points: the RPCs normalize every game to a 0-100 daily scale (your
 *   best run of the day per game), so quick games can't be spammed for
 *   points and long games don't dwarf short ones.
 */

interface BoardRow {
  rank: number;
  playerName: string;
  totalPoints: number;
  gamesPlayed: number;
}

interface MyRank {
  rank: number;
  totalPoints: number;
  totalPlayers: number;
}

interface SportOption {
  value: string;
  label: string;
  slugs: string[] | null;
}

const SPORT_OPTIONS: SportOption[] = [
  { value: 'all', label: '🌍 All Sports', slugs: null },
  ...CATEGORIES.filter(c => c.games.length > 0).map(c => ({
    value: c.title,
    label: `${c.emoji} ${c.title}`,
    slugs: c.games.map(g => g.path.replace(/^\//, '')),
  })),
];

type Period = 'today' | 'alltime';

export default function Leaderboard() {
  const { profile } = useAuth();
  const ownHandle = useMemo(() => getCurrentPlayerName(profile), [profile]);

  const [sport, setSport] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<Period>('today');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<Period, BoardRow[]>>({ today: [], alltime: [] });
  const [myRank, setMyRank] = useState<Record<Period, MyRank | null>>({ today: null, alltime: null });

  useEffect(() => {
    let cancelled = false;
    const slugs = SPORT_OPTIONS.find(o => o.value === sport)?.slugs ?? null;

    const load = async () => {
      setLoading(true);
      try {
        const [todayBoard, allBoard, myToday, myAll] = await Promise.all([
          (supabase.rpc as any)('global_leaderboard', { p_period: 'today', p_games: slugs }),
          (supabase.rpc as any)('global_leaderboard', { p_period: 'alltime', p_games: slugs }),
          (supabase.rpc as any)('global_rank', { p_player: ownHandle, p_period: 'today', p_games: slugs }),
          (supabase.rpc as any)('global_rank', { p_player: ownHandle, p_period: 'alltime', p_games: slugs }),
        ]);
        if (cancelled) return;

        const mapBoard = (res: any): BoardRow[] =>
          Array.isArray(res?.data)
            ? res.data.map((r: any) => ({
                rank: Number(r.rank),
                playerName: String(r.player_name),
                totalPoints: Number(r.total_points) || 0,
                gamesPlayed: Number(r.games_played) || 0,
              }))
            : [];

        const mapMine = (res: any): MyRank | null => {
          const row = Array.isArray(res?.data) ? res.data[0] : null;
          if (!row) return null;
          return {
            rank: Number(row.rank),
            totalPoints: Number(row.total_points) || 0,
            totalPlayers: Number(row.total_players) || 0,
          };
        };

        setRows({ today: mapBoard(todayBoard), alltime: mapBoard(allBoard) });
        setMyRank({ today: mapMine(myToday), alltime: mapMine(myAll) });
      } catch {
        if (!cancelled) {
          setRows({ today: [], alltime: [] });
          setMyRank({ today: null, alltime: null });
        }
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [sport, ownHandle]);

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-8 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  const MyRankCard = ({ mine }: { mine: MyRank | null }) => (
    <div className="mb-4 rounded-xl border border-gold/50 bg-surface-1 px-4 py-3 flex items-center gap-3">
      <Globe className="w-5 h-5 text-gold shrink-0" />
      {mine ? (
        <div className="flex-1 min-w-0">
          <p className="font-semibold">
            Your world rank: <span className="text-gold">#{mine.rank.toLocaleString()}</span>
            <span className="text-muted-foreground font-normal"> in the world</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {mine.totalPoints.toLocaleString()} pts as {ownHandle}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="font-semibold">No points yet{activeTab === 'today' ? ' today' : ''}</p>
          <p className="text-xs text-muted-foreground">Finish any game and you'll appear here as {ownHandle}.</p>
        </div>
      )}
    </div>
  );

  const BoardList = ({ list, emptyLabel }: { list: BoardRow[]; emptyLabel: string }) => {
    if (list.length === 0) {
      return <p className="text-center text-muted-foreground py-12">{emptyLabel}</p>;
    }
    return (
      <div className="space-y-1">
        {list.map(row => {
          const isOwn = row.playerName === ownHandle;
          return (
            <div
              key={`${row.rank}-${row.playerName}`}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isOwn ? 'border-gold/50 bg-surface-1' : 'border-border hover:bg-secondary/30'
              }`}
            >
              <div className="flex items-center justify-center w-8">{getRankDisplay(row.rank)}</div>
              <div className="flex-1 min-w-0">
                <span className={`font-medium truncate ${isOwn ? 'text-gold' : ''}`}>
                  {row.playerName}{isOwn ? ' (you)' : ''}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  {row.gamesPlayed.toLocaleString()} scored {row.gamesPlayed === 1 ? 'game' : 'games'}
                </span>
              </div>
              <span className="text-lg font-bold text-primary">{row.totalPoints.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <PageSeo
        title="World Leaderboard: Total Points | DoUKnowBall"
        description="One global leaderboard for every game on DoUKnowBall. Top 100 today and all-time, plus your own world rank. No account needed."
        path="/leaderboard"
      />
      <div className="min-h-screen bg-background">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2 text-center">World Leaderboard</h1>
          <p className="text-center text-muted-foreground text-sm mb-6">
            One board, every game. Each game pays up to 100 pts a day: your best run counts, spamming doesn't.
          </p>

          <div className="mb-4">
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="All Sports" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {SPORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Period)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="today" className="gap-1.5 py-2 text-xs sm:text-sm">
                <Calendar className="w-4 h-4" />
                Today
              </TabsTrigger>
              <TabsTrigger value="alltime" className="gap-1.5 py-2 text-xs sm:text-sm">
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
                  <MyRankCard mine={myRank.today} />
                  <Card className="bg-surface-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Top 100 Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BoardList list={rows.today} emptyLabel="No scores yet today. Be the first!" />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="alltime">
                  <MyRankCard mine={myRank.alltime} />
                  <Card className="bg-surface-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Top 100 All-Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BoardList list={rows.alltime} emptyLabel="No scores yet. Be the first!" />
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </main>

        <div className="max-w-4xl mx-auto px-4">
        </div>
      </div>
    </>
  );
}
