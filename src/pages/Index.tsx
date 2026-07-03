import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Trophy, Flame, TrendingUp, Sparkles, Users, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';

import { StreakReminder } from '@/components/game/StreakReminder';
import { useMostPlayed } from '@/hooks/useMostPlayed';

import { CATEGORIES, VISIBLE_CATEGORIES, TOTAL_GAMES, type GameDef } from '@/data/gameRegistry';

function countPlayedGames(): number {
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(today)) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed.status && parsed.status !== 'playing') count++;
        }
      } catch { /* not a game key */ }
    }
  }
  return count;
}

export default function Index() {
  const { user } = useAuth();
  const [playedCount, setPlayedCount] = useState(0);
  const [totalPlayed, setTotalPlayed] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const query = searchQuery.toLowerCase().trim();
  const isSearching = query.length > 0;

  const filteredGames = isSearching
    ? VISIBLE_CATEGORIES.flatMap(cat =>
        cat.games.filter(g =>
          g.label.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query) ||
          cat.title.toLowerCase().includes(query)
        )
      )
    : [];

  useEffect(() => {
    setPlayedCount(countPlayedGames());
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Sitewide games-played-today, now backed by the real, anonymous-
        // inclusive public.game_completions table instead of summing a
        // hardcoded list of per-game (mostly auth-only) score tables.
        // game_completions isn't in the generated Supabase types yet (added
        // via direct SQL), so it's addressed dynamically here.
        const { count: completionsToday } = await (supabase.from as any)('game_completions')
          .select('*', { count: 'exact', head: true })
          .eq('completed_on', today);
        setTotalPlayed(completionsToday ?? 0);

        // Players who completed a game today from daily_completions
        // TODO Round 3: daily_completions only counts logged-in users.
        // Add anonymous_play_counter table for full play count including anonymous visitors.
        const { count: dailyPlayers } = await supabase
          .from('daily_completions')
          .select('user_id', { count: 'exact', head: true })
          .eq('date', today);
        setTotalPlayers(dailyPlayers ?? 0);
      } catch { /* silent */ }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user best scores
  useEffect(() => {
    if (!user) { setBestScores({}); return; }
    const fetchBest = async () => {
      try {
        const { data } = await supabase
          .from('user_best_scores')
          .select('game_type, best_score')
          .eq('user_id', user.id);
        if (data) {
          const map: Record<string, number> = {};
          data.forEach(r => { map[r.game_type] = r.best_score; });
          setBestScores(map);
        }
      } catch { /* silent */ }
    };
    fetchBest();
  }, [user]);

  return (
    <>
      <PageSeo
        title="DoUKnowBall: The Ultimate Sports Trivia Hub"
        description="30+ free sports trivia games covering NFL, NBA, MLB, NHL, UFC, F1, Tennis, NASCAR, Soccer and more. Daily challenges, no login required."
        path="/"
      />
      <div className="min-h-screen bg-background text-foreground">
        
        
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-[hsl(43,85%,55%)]/5" />
          <div className="relative max-w-3xl mx-auto px-4 py-12 md:py-20 text-center">
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-primary mb-3">
              DoUKnowBall
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto mb-6">
              The Ultimate Sports Trivia Hub
            </p>

            {/* Stats bar */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Flame className="w-4 h-4 text-primary" />
                <span><strong className="text-foreground">{TOTAL_GAMES}</strong> games to play</span>
              </div>
              {totalPlayed !== null && totalPlayed > 0 && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span><strong className="text-foreground">{totalPlayed.toLocaleString()}</strong> games played today</span>
                </div>
              )}
              {totalPlayers !== null && (totalPlayers > 0 || !totalPlayed) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  {totalPlayers > 0 ? (
                    <span><strong className="text-foreground">{totalPlayers.toLocaleString()}</strong> playing today</span>
                  ) : (
                    <span>Be the first to play today!</span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Trophy className="w-4 h-4 text-[hsl(43,85%,55%)]" />
                <span>You've played <strong className="text-foreground">{playedCount}/{TOTAL_GAMES}</strong> today</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── GAME CATEGORIES ─── */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
          <MostPlayedToday />
          <StreakReminder />

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder='Search games... e.g. soccer, grid, NBA'
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
            {isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search results or categorized layout */}
          {isSearching ? (
            filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredGames.map(game => (
                  <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                No games found for "{searchQuery}"
              </div>
            )
          ) : (
            <>
              {VISIBLE_CATEGORIES.map(cat => (
                <section key={cat.title}>
                  <h2 className="flex items-center gap-2 text-lg font-display font-bold text-foreground mb-4">
                    <span className="text-xl">{cat.emoji}</span>
                    {cat.title}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({cat.games.length} {cat.games.length === 1 ? 'game' : 'games'})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.games.map(game => (
                      <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}

          {/* Coming Soon placeholder for Golf */}
          <section>
            <h2 className="flex items-center gap-2 text-lg font-display font-bold text-foreground mb-4">
              <span className="text-xl">🏌️</span>
              Golf
              <span className="text-xs font-normal text-muted-foreground ml-1">Coming Soon</span>
            </h2>
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              Golf trivia games are coming soon! Stay tuned.
            </div>
          </section>

          {/* ─── SOCIAL PROOF ─── */}
          {totalPlayed !== null && totalPlayed > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6 text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-display font-bold text-foreground mb-1">
                {totalPlayed.toLocaleString()} rounds played
              </p>
              <p className="text-sm text-muted-foreground">
                Join players from around the world testing their sports knowledge daily.
              </p>
            </section>
          )}

          <Footer />
        </div>
      </div>
    </>
  );
}

function formatPlays(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k plays`;
  return `${n} plays`;
}

/**
 * Wave 3 / item #11: wired to public.game_completions via useMostPlayed.
 * Renders unconditionally on every breakpoint (no md: hidden class) so it
 * always shows on mobile. While fewer than 3 games clear the 5-completions
 * threshold for today, useMostPlayed returns the curated flagship trio so
 * this section never renders empty or looks broken.
 */
function MostPlayedToday() {
  const { entries, loading } = useMostPlayed();

  if (loading && entries.length === 0) {
    return (
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">🔥 Most Played Today</p>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-14 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (entries.length === 0) return null;

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">🔥 Most Played Today</p>
      <div className="flex gap-2">
        {entries.map(({ game, count, isFallback }) => (
          <Link
            key={game.path}
            to={game.path}
            className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2.5 hover:border-primary/40 transition-colors"
          >
            <span className="text-lg shrink-0">{game.emoji}</span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">{game.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {isFallback ? 'Popular pick' : formatPlays(count)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── GAME CARD ─── */
function GameCard({ game, bestScore }: { game: GameDef; bestScore?: number }) {
  return (
    <Link
      to={game.path}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 hover:-translate-y-0.5 transition-all duration-200"
    >
      <span className="text-2xl shrink-0 mt-0.5">{game.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
            {game.label}
          </span>
          {game.daily && (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              Daily
            </span>
          )}
          {game.isNew && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/15 text-gold">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{game.description}</p>
        {bestScore != null && bestScore > 0 && (
          <span className="text-[10px] text-gold/70 mt-0.5 block">PB: {bestScore}</span>
        )}
      </div>
    </Link>
  );
}
