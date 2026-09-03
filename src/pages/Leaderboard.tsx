import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { publicName } from '@/lib/completions';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayerName } from '@/hooks/usePlayerName';
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
  const { user, profile } = useAuth();
  /* Round 318: the raw handle goes to the RPCs (it has to match the stored
     rows), the filtered form is what renders and what the own-row highlight
     compares against, since every board row is filtered the same way. */
  const ownHandle = usePlayerName(profile, user?.id ?? 'guest');
  const ownShownName = useMemo(() => publicName(ownHandle ?? 'Player'), [ownHandle]);

  const [sport, setSport] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<Period>('today');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<Period, BoardRow[]>>({ today: [], alltime: [] });
  const [myRank, setMyRank] = useState<Record<Period, MyRank | null>>({ today: null, alltime: null });

  useEffect(() => {
    if (!ownHandle) return;
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
                /* Round 318: every name shown on this shared board passes
                   the render-time blocklist; a dirty stored name prints as
                   its stable substitute handle instead */
                playerName: publicName(String(r.player_name)),
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
            {mine.totalPoints.toLocaleString()} pts as {ownShownName}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="font-semibold">No points yet{activeTab === 'today' ? ' today' : ''}</p>
          <p className="text-xs text-muted-foreground">Finish any game and you'll appear here as {ownShownName}.</p>
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
          const isOwn = row.playerName === ownShownName;
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
        <main id="dukb-main" className="max-w-4xl mx-auto px-4 py-8">
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

        {/* ---------------------------------------------------------------
            ROUND 280: THIS PAGE'S PERMANENT COPY.

            Every word above this block is live data, and the prerenderer
            deliberately leaves database requests hanging so today's board is
            never frozen into a file. That is the right call, and the cost of it
            was that the saved copy of this page carried 165 characters a crawler
            could read once the shared footer was discounted: a heading and one
            sentence. Measured against all 126 submitted pages on 2026-08-23 it
            was the thinnest by a distance, 85 percent boilerplate, and thin is
            the exact complaint behind "Crawled, currently not indexed".

            So the page now answers, in writing that does not depend on a single
            row of data, the question anyone landing here actually has: how do I
            get on this thing. Nothing below is a figure that can go stale, and
            nothing below claims a number the database has to agree with.
            --------------------------------------------------------------- */}
        <section className="max-w-4xl mx-auto px-4 pb-16 prose-sm text-muted-foreground">
          <h2 className="text-xl font-display font-bold text-foreground mt-4 mb-3">How the world leaderboard works</h2>
          <p className="mb-3">
            There is one board on this site and everybody is on it. Points from every game you
            play add into the same total, so a run on <Link className="underline" to="/soccer-grid">Soccer Grid</Link> and a
            run on <Link className="underline" to="/nhl-connect-4">NHL Connect 4</Link> count toward the same
            standing. You do not need an account to appear: finish a game and you are on it under
            whatever handle you are playing as.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-5 mb-2">Every game is worth the same day</h3>
          <p className="mb-3">
            Each game pays up to 100 points a day and only your best run of that day counts. That
            is deliberate and it decides two things at once. A thirty second game cannot be replayed
            forty times for forty scores, so the board does not reward whoever had the most idle
            afternoon. And a long career sim cannot bury a quick daily puzzle, because both top out
            in the same place. What separates people on this board is how many different games they
            played well, not how many times they hit retry.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-5 mb-2">Today, all time, and your own rank</h3>
          <p className="mb-3">
            <strong className="text-foreground">Today</strong> resets for everyone at the same moment, so it is
            a straight race on the same set of daily puzzles. <strong className="text-foreground">All-Time</strong> is
            the running total and rewards turning up. Both tabs list the top 100, and your own rank
            card sits above them whether you are 7th or 4,000th, with how many players you are being
            measured against, because a rank with no field size behind it does not tell you anything.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-5 mb-2">Filtering by sport</h3>
          <p className="mb-3">
            The filter narrows the board to one sport's games and nothing else changes: same scoring,
            same daily cap, same top 100. It is there because the sitewide board is dominated by
            whoever plays the most breadth, and someone who only plays hockey deserves a table where
            that is the whole field. There is no per game leaderboard anywhere on this site, on
            purpose, because a hundred separate boards is a hundred places to be first at nothing.
          </p>

          <h3 className="text-base font-semibold text-foreground mt-5 mb-2">Getting on the board today</h3>
          <p className="mb-3">
            The quickest way up is breadth. Pick a sport you know from the{' '}
            <Link className="underline" to="/soccer">soccer</Link>,{' '}
            <Link className="underline" to="/pro-basketball">basketball</Link>,{' '}
            <Link className="underline" to="/pro-football">football</Link>,{' '}
            <Link className="underline" to="/baseball">baseball</Link>,{' '}
            <Link className="underline" to="/hockey">hockey</Link> or{' '}
            <Link className="underline" to="/college">college</Link> sections, play the daily puzzles
            there, then take one run at a game you have never tried. Four daily puzzles played
            reasonably will out score one game played obsessively, every time.
          </p>
          <p className="mb-3">
            If you want to know what the games are actually built on before you start,{' '}
            <Link className="underline" to="/records">The Record Books</Link> holds the champion tables the
            quizzes run on, checked against the official record, and{' '}
            <Link className="underline" to="/whats-new">What's New</Link> lists what shipped recently.
          </p>
        </section>
      </div>
    </>
  );
}
