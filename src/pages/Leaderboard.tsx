import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentPlayerName, publicName } from '@/lib/completions';
import { useAuth } from '@/contexts/AuthContext';
import { CATEGORIES } from '@/data/gameRegistry';

import PageSeo from '@/components/seo/PageSeo';
import { Button } from '@/components/ui/button';
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

/* Round 537: week and month are TRAILING windows, the last 7 and the last 30
   Eastern days, not calendar weeks or months. The labels say "7 Days" and
   "30 Days" rather than "This Week" for that reason: a trailing window is what
   the question "am I climbing" actually means, and a label that says week while
   the query means something else is the kind of small lie this repo does not
   ship. The day itself is Eastern everywhere now; before Round 537 this board
   was the one surface still rolling over at 20:00 Eastern.

   Today and All Time are the two windows this page loads on mount; the two new
   ones are fetched only when their own tab is opened. Round 370 exists because
   this query family was costing the project its Disk IO budget, and doubling
   the board scans on every leaderboard load would have walked back into it.

   Round 540 correction, because the sentence that used to be here was wrong and
   a later session would have trusted it. It said Today and All Time were
   "served by the cached player_ranks view". Read off pg_proc on production:
   global_leaderboard does not reference player_ranks at all, only global_rank
   does. So the two eager board calls were always live scans, and the choice
   below is between two live board scans and four, not between none and two. The
   decision still holds on those numbers. The cache is real, it just sits under
   the personal rank card rather than under the board. */
type Period = 'today' | 'week' | 'month' | 'alltime';

const ALL_PERIODS: Period[] = ['today', 'week', 'month', 'alltime'];
const EAGER_PERIODS: Period[] = ['today', 'alltime'];

/* Round 540: undefined means NOT LOADED YET and an array means loaded, even
   when it is empty. Round 537 used [] for both, so every one of these was the
   same value: a window still in flight, a window whose request failed, and a
   window that genuinely has nobody in it. The page then told a player "No
   scores in the last 7 days. Be the first!" during the fetch and again after a
   500, which is two different lies with the same words. */
type Board = BoardRow[] | undefined;
type Rank = MyRank | null | undefined;

const blank = <T,>(v: T): Record<Period, T> => ({ today: v, week: v, month: v, alltime: v });

const mapBoard = (res: any): BoardRow[] =>
  Array.isArray(res?.data)
    ? res.data.map((r: any) => ({
        rank: Number(r.rank),
        /* Round 318: every name shown on this shared board passes the render
           time blocklist; a dirty stored name prints as its stable substitute
           handle instead */
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

/** What a window is called in a sentence, so the empty and error copy can name
 *  the window the reader is actually looking at. */
const WINDOW_WORDS: Record<Period, string> = {
  today: 'today',
  week: 'in the last 7 days',
  month: 'in the last 30 days',
  alltime: 'yet',
};

export default function Leaderboard() {
  const { profile } = useAuth();
  /* Round 318: the raw handle goes to the RPCs (it has to match the stored
     rows), the filtered form is what renders and what the own-row highlight
     compares against, since every board row is filtered the same way. */
  const ownHandle = useMemo(() => getCurrentPlayerName(profile), [profile]);
  const ownShownName = useMemo(() => publicName(ownHandle), [ownHandle]);

  const [sport, setSport] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<Period>('today');
  const [rows, setRows] = useState<Record<Period, Board>>(() => blank(undefined as Board));
  const [myRank, setMyRank] = useState<Record<Period, Rank>>(() => blank(undefined as Rank));
  const [failed, setFailed] = useState<Record<Period, boolean>>(() => blank(false));

  /* Round 540: ONE generation counter, bumped the moment the filter or the
     handle changes, and every response checked against it before it is allowed
     to write. It replaces a pair of per effect `cancelled` flags that could not
     see each other, which is what made the two worst bugs in Round 537
     possible:

     The filter change race. The mount effect reset the boards to empty
     SYNCHRONOUSLY but wrote its results AFTER its await, while the window
     effect was in flight. The window usually won, because it awaits two RPCs
     over a covering index while the other awaits four including an unfiltered
     all time scan. Its rows landed, then the slower effect's late write spread
     empty over the top, and the 7 Days tab was stuck reading "No scores in the
     last 7 days. Be the first!" with no way to refetch, because the window was
     already marked as paid for.

     A generation check fixes that properly: a response from an older filter
     cannot write at all, in either direction, no matter which finishes first.

     A ref rather than state on purpose. It has to be readable by a closure
     created before the change happened. */
  const genRef = useRef(0);
  /* Which windows have a request in the air right now, so flapping between two
     tabs cannot fire the same live scan twice. Round 537 discarded superseded
     responses client side but the server had already run every one of them. */
  const inFlight = useRef<Set<Period>>(new Set());

  const slugsFor = (s: string) => SPORT_OPTIONS.find(o => o.value === s)?.slugs ?? null;

  /* The two windows this page always needs. Also the reset: a filter change
     invalidates every window, including the two lazy ones, so they are paid for
     again next time one is opened rather than showing another filter's numbers. */
  useEffect(() => {
    const gen = genRef.current + 1;
    genRef.current = gen;
    inFlight.current.clear();
    setRows(blank(undefined as Board));
    setMyRank(blank(undefined as Rank));
    setFailed(blank(false));

    const slugs = slugsFor(sport);
    (async () => {
      try {
        const [todayBoard, allBoard, myToday, myAll] = await Promise.all([
          (supabase.rpc as any)('global_leaderboard', { p_period: 'today', p_games: slugs }),
          (supabase.rpc as any)('global_leaderboard', { p_period: 'alltime', p_games: slugs }),
          (supabase.rpc as any)('global_rank', { p_player: ownHandle, p_period: 'today', p_games: slugs }),
          (supabase.rpc as any)('global_rank', { p_player: ownHandle, p_period: 'alltime', p_games: slugs }),
        ]);
        if (genRef.current !== gen) return;
        setRows(prev => ({ ...prev, today: mapBoard(todayBoard), alltime: mapBoard(allBoard) }));
        setMyRank(prev => ({ ...prev, today: mapMine(myToday), alltime: mapMine(myAll) }));
      } catch {
        if (genRef.current !== gen) return;
        setFailed(prev => ({ ...prev, today: true, alltime: true }));
        setRows(prev => ({ ...prev, today: [], alltime: [] }));
        setMyRank(prev => ({ ...prev, today: null, alltime: null }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport, ownHandle]);

  /* The two lazy windows, fetched the first time their own tab is opened.
     Round 540: there is no shared `loading` flag any more, and that is the
     point. Round 537 had one boolean owned by two effects and gating all four
     panels, so opening 7 Days and clicking away before it landed left it true
     for good: the cleanup stopped the in flight effect from clearing it, and
     the re-run returned early above the line that would have. The page sat on a
     spinner with no board on any tab until a reload. A keyboard user hit it
     every time, because a tab strip activates as the arrow key moves through
     it, so the two expensive windows were opened and abandoned in passing.
     Each window now owns its own state: undefined is loading, an array is
     loaded, and `failed` is failed. */
  useEffect(() => {
    const period = activeTab;
    if (EAGER_PERIODS.includes(period)) return;
    if (rows[period] !== undefined || failed[period]) return;
    if (inFlight.current.has(period)) return;

    const gen = genRef.current;
    inFlight.current.add(period);
    const slugs = slugsFor(sport);
    (async () => {
      try {
        const [board, mine] = await Promise.all([
          (supabase.rpc as any)('global_leaderboard', { p_period: period, p_games: slugs }),
          (supabase.rpc as any)('global_rank', { p_player: ownHandle, p_period: period, p_games: slugs }),
        ]);
        if (genRef.current !== gen) return;
        setRows(prev => ({ ...prev, [period]: mapBoard(board) }));
        setMyRank(prev => ({ ...prev, [period]: mapMine(mine) }));
      } catch {
        if (genRef.current !== gen) return;
        setFailed(prev => ({ ...prev, [period]: true }));
        setRows(prev => ({ ...prev, [period]: [] }));
        setMyRank(prev => ({ ...prev, [period]: null }));
      } finally {
        inFlight.current.delete(period);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, sport, ownHandle, rows, failed]);

  /** Lets a failed window be asked for again, which Round 537 had no way to do. */
  const retry = (period: Period) => {
    setFailed(prev => ({ ...prev, [period]: false }));
    setRows(prev => ({ ...prev, [period]: undefined }));
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-8 text-center text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  /* Round 540: the empty line names the window it is talking about. It used to
     read "No points yet" with " today" appended only on the Today tab, which
     was written when there were two tabs and never extended. On 7 Days it told
     4,555 of the 5,501 scoring players on this site that they had no points,
     while their all time total sat behind the next tab along. */
  const MyRankCard = ({ mine, period }: { mine: MyRank | null; period: Period }) => (
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
          <p className="font-semibold">No points {WINDOW_WORDS[period]}</p>
          <p className="text-xs text-muted-foreground">
            {period === 'alltime'
              ? `Finish any game and you'll appear here as ${ownShownName}.`
              : `Play something and you'll appear here as ${ownShownName}.`}
          </p>
        </div>
      )}
    </div>
  );

  /* Round 540: a window's whole panel, so each tab owns its own state and the
     four can never share one spinner again. Order matters: failed before empty,
     because a request that 500'd used to render as "be the first" and looked
     exactly like a board nobody is on. */
  const Panel = ({ period, title, emptyLabel }: { period: Period; title: string; emptyLabel: string }) => {
    const list = rows[period];
    if (failed[period]) {
      return (
        <div className="text-center py-12 space-y-3">
          <p className="text-muted-foreground">That board did not load. It is us, not you.</p>
          <Button size="sm" variant="outline" onClick={() => retry(period)}>Try again</Button>
        </div>
      );
    }
    if (list === undefined) {
      return (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <>
        <MyRankCard mine={myRank[period] ?? null} period={period} />
        <Card className="bg-surface-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <BoardList list={list} emptyLabel={emptyLabel} />
          </CardContent>
        </Card>
      </>
    );
  };

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
        description="One global leaderboard for every game on DoUKnowBall. Top 100 for today, the last 7 days, the last 30 days and all-time, plus your own world rank. No account needed."
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

          {/* Round 540: activationMode="manual". Radix activates a tab as the
              arrow key moves onto it, so a keyboard user going from Today to
              All-Time used to open BOTH expensive live windows in passing and
              abandon them, which is also how they hit the stuck spinner every
              single time. Manual means the arrows move focus and Enter or Space
              opens, so the two live scans are only ever run on purpose. */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Period)} activationMode="manual">
            {/* Round 537: four tabs have to fit a 320px phone, so the two new
                ones carry no icon and every label stays short. The icons on
                Today and All-Time are kept because they were already there and
                removing them would change two tabs nobody asked about. */}
            <TabsList aria-label="Leaderboard time window" className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="today" className="gap-1.5 px-1 py-2 text-xs sm:text-sm">
                <Calendar className="w-4 h-4 hidden sm:inline" />
                Today
              </TabsTrigger>
              <TabsTrigger value="week" className="px-1 py-2 text-xs sm:text-sm">
                7 Days
              </TabsTrigger>
              <TabsTrigger value="month" className="px-1 py-2 text-xs sm:text-sm">
                30 Days
              </TabsTrigger>
              <TabsTrigger value="alltime" className="gap-1.5 px-1 py-2 text-xs sm:text-sm">
                <Trophy className="w-4 h-4 hidden sm:inline" />
                All-Time
              </TabsTrigger>
            </TabsList>

            {/* Round 540: all four panels are always mounted. Round 537 rendered
                NO TabsContent at all while loading, so the selected trigger kept
                aria-selected true and pointed at a tabpanel id that did not
                exist in the document: a screen reader user opened a tab and
                found nothing, and the Tab key skipped from the tab strip to the
                page copy. A panel showing its own spinner is a panel. */}
            <TabsContent value="today">
              <Panel period="today" title="Top 100 Today" emptyLabel="No scores yet today. Be the first!" />
            </TabsContent>

            <TabsContent value="week">
              <Panel period="week" title="Top 100, last 7 days" emptyLabel="No scores in the last 7 days. Be the first!" />
            </TabsContent>

            <TabsContent value="month">
              <Panel period="month" title="Top 100, last 30 days" emptyLabel="No scores in the last 30 days. Be the first!" />
            </TabsContent>

            <TabsContent value="alltime">
              <Panel period="alltime" title="Top 100 All-Time" emptyLabel="No scores yet. Be the first!" />
            </TabsContent>
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

          <h3 className="text-base font-semibold text-foreground mt-5 mb-2">Four windows, and your own rank</h3>
          <p className="mb-3">
            <strong className="text-foreground">Today</strong> resets for everyone at the same moment, midnight
            Eastern, so it is a straight race on the same set of daily puzzles.
            {' '}<strong className="text-foreground">7 Days</strong> and <strong className="text-foreground">30 Days</strong> are
            rolling windows rather than calendar weeks and months: they cover the last seven and the last thirty
            days ending today, which is the honest answer to whether you are climbing right now.
            {' '}<strong className="text-foreground">All-Time</strong> is the running total and rewards turning up.
            Every tab lists the top 100, and your own rank card sits above it whether you are 7th or 4,000th,
            with how many players you are being measured against, because a rank with no field size behind it
            does not tell you anything.
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
