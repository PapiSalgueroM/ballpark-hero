import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame, TrendingUp, Sparkles, Users, Search, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';

import { StreakReminder } from '@/components/game/StreakReminder';
import { DailyChecklist } from '@/components/game/DailyChecklist';

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
  const [playedCount, setPlayedCount] = useState(0);
  const [totalPlayed, setTotalPlayed] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        // Games played today from multiple score tables
        const tables = [
          'medal_games_scores', 'football_grid_selections', 'college_grid_selections',
          'soccer_grid_selections', 'nascar_scores', 'tennis_scores', 'cbb_scores',
          'college_guess_scores', 'guess_nation_scores', 'soccer_club_guess_scores',
          'nascar_chain_scores', 'tennis_chain_scores', 'ufc_chain_scores',
        ] as const;

        let total = 0;
        for (const table of tables) {
          const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          total += count ?? 0;
        }
        setTotalPlayed(total);

        // Active players in last 24 hours from user_scores
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: activeData } = await supabase
          .from('user_scores')
          .select('user_id')
          .gte('last_played_at', cutoff);
        if (activeData) {
          setTotalPlayers(activeData.length);
        }
      } catch { /* silent */ }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <PageSeo
        title="DoUKnowBall — The Ultimate Sports Trivia Hub"
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
              {totalPlayers !== null && (
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
          <DailyChecklist />
          <StreakReminder />
          
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
                  <GameCard key={game.path} game={game} />
                ))}
              </div>
            </section>
          ))}

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

/* ─── GAME CARD ─── */
function GameCard({ game }: { game: GameDef }) {
  return (
    <Link
      to={game.path}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-card/80 transition-all"
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
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[hsl(43,85%,55%)]/15 text-[hsl(43,85%,55%)]">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{game.description}</p>
      </div>
    </Link>
  );
}
