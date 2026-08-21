import { foldSpecialLatin } from '@/lib/nameFold';
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Trophy, Flame, Sparkles, Users, Search, X, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PageSeo from '@/components/seo/PageSeo';

import { StreakReminder } from '@/components/game/StreakReminder';
import { useMostPlayed } from '@/hooks/useMostPlayed';
import { PollOfTheDay } from '@/components/home/PollOfTheDay';
import { useStreaks } from '@/hooks/useStreaks';
import { AuthModal } from '@/components/auth/AuthModal';

import { ALL_GAMES, CATEGORIES, VISIBLE_CATEGORIES, FEATURED_GAMES, TOTAL_GAMES, type GameDef } from '@/data/gameRegistry';
import { getCurrentPlayerName, getLocalTodayCount } from '@/lib/completions';

/**
 * Home search (item #15 audit pass).
 *
 * Matching is case/diacritic-insensitive and scores across four fields
 * (label, description, category title, path fragments) with label matches
 * weighted highest. Exact/prefix matches on label outrank plain substring
 * hits, and a small alias table maps obvious shorthand ("grid", "xi",
 * "quiz", league abbreviations, common spellings) onto the terms that
 * actually appear in the registry, since the registry itself doesn't use
 * every synonym a player might type.
 */

/**
 * Strips diacritics and lowercases, e.g. "Beyonce" (accented) -> "beyonce".
 * NFD decomposes accented characters into base letter + combining mark, then
 * the U+0300..U+036F escape range strips every Unicode combining diacritical
 * mark. Written as a numeric \u escape range (not a literal character class)
 * so the source can't be corrupted by an editor/encoding round-trip.
 */
function normalizeSearchText(s: string): string {
  return foldSpecialLatin(
    s
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .toLowerCase()
      .trim(),
  );
}

/**
 * Obvious aliases players might type that don't literally appear in a game's
 * label/description/category/path. Each alias expands to extra terms that
 * ARE searched against those fields. Intentionally small and curated rather
 * than exhaustive, this is a quality pass, not a synonym engine.
 */
const SEARCH_ALIASES: Record<string, string[]> = {
  grid: ['grid'],
  deal: ['deal'],
  xi: ['xi', 'lineup', 'squad'],
  quiz: ['quiz', 'trivia'],
  trivia: ['quiz'],
  nba: ['nba', 'basketball'],
  basketball: ['nba', 'basketball', 'cbb', 'college basketball'],
  nfl: ['nfl', 'football', 'pro football'],
  football: ['nfl', 'football', 'college football'],
  soccer: ['soccer', 'football', 'club', 'transfer'],
  // Only the unaccented form is needed here: normQuery has already been run
  // through normalizeSearchText() (NFD + strip diacritics) before this table
  // is consulted, so a search for "futbol" always normalizes to this exact key.
  futbol: ['soccer'],
  hockey: ['hockey', 'nhl'],
  nhl: ['hockey', 'nhl'],
  baseball: ['baseball', 'mlb'],
  mlb: ['baseball', 'mlb'],
  tennis: ['tennis', 'grand slam'],
  ufc: ['ufc', 'mma', 'fighter', 'combat'],
  mma: ['ufc', 'mma', 'fighter', 'combat'],
  f1: ['f1', 'formula 1', 'racing', 'driver'],
  formula1: ['f1', 'formula 1'],
  nascar: ['nascar', 'racing', 'driver'],
  gameshow: ['deal', 'name them all', 'squad deal'],
  connections: ['connections', 'connect 4'],
  wheel: ['squad deal', 'mystery box'],
  banker: ['squad deal', 'mystery box'],
};

interface SearchableGame {
  game: GameDef;
  categoryTitle: string;
  normLabel: string;
  normDescription: string;
  normCategory: string;
  normPath: string;
}

/** One entry per game, pre-normalized once so scoring is cheap per keystroke. */
function buildSearchIndex(): SearchableGame[] {
  return VISIBLE_CATEGORIES.flatMap(cat =>
    cat.games.map(game => ({
      game,
      categoryTitle: cat.title,
      normLabel: normalizeSearchText(game.label),
      normDescription: normalizeSearchText(game.description),
      normCategory: normalizeSearchText(cat.title),
      normPath: normalizeSearchText(game.path.replace(/^\//, '').replace(/-/g, ' ')),
    }))
  );
}

/**
 * Scores a single search term against one indexed game. Higher is better;
 * 0 means "no match on this field for this term."
 *
 * Weighting: label exact (100) > label prefix (80) > label substring (60)
 * > description/category/path exact-word (40) > description/category/path
 * substring (20). A term can score on multiple fields; scores are summed.
 */
function scoreTerm(term: string, entry: SearchableGame): number {
  if (!term) return 0;
  let score = 0;

  if (entry.normLabel === term) score += 100;
  else if (entry.normLabel.startsWith(term)) score += 80;
  else if (entry.normLabel.includes(term)) score += 60;

  const labelWords = entry.normLabel.split(/\s+/);
  if (labelWords.includes(term)) score += 15; // whole-word bonus, e.g. "xi" in "Build Your XI"

  if (entry.normDescription.includes(term)) {
    score += entry.normDescription.split(/\s+/).includes(term) ? 40 : 20;
  }
  if (entry.normCategory === term) score += 45;
  else if (entry.normCategory.includes(term)) score += 20;

  if (entry.normPath.includes(term)) {
    score += entry.normPath.split(/\s+/).includes(term) ? 30 : 15;
  }

  return score;
}

/**
 * Ranks every game against a raw query string. Expands the query into the
 * query itself plus any aliased terms, scores each game against every term,
 * keeps the best single-term score per game (so a game doesn't get inflated
 * just because many alias terms happen to match), and returns games with a
 * positive score sorted highest first. Ties fall back to label alphabetical
 * so results are stable across renders.
 */
function rankGames(rawQuery: string, index: SearchableGame[]): GameDef[] {
  const normQuery = normalizeSearchText(rawQuery);
  if (!normQuery) return [];

  const terms = new Set<string>([normQuery]);
  const aliasHits = SEARCH_ALIASES[normQuery];
  if (aliasHits) aliasHits.forEach(t => terms.add(normalizeSearchText(t)));

  const scored = index
    .map(entry => {
      let best = 0;
      for (const term of terms) {
        best = Math.max(best, scoreTerm(term, entry));
      }
      return { entry, score: best };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.normLabel.localeCompare(b.entry.normLabel));

  return scored.map(({ entry }) => entry.game);
}

/** Shown in the "no results" state so a dead-end search still has a next step. */
const POPULAR_FALLBACK_PATHS = ['/soccer-grid', '/footle', '/squad-deal'];

function getPopularFallbackGames(): GameDef[] {
  const all = VISIBLE_CATEGORIES.flatMap(c => c.games);
  return POPULAR_FALLBACK_PATHS
    .map(path => all.find(g => g.path === path))
    .filter((g): g is GameDef => !!g);
}

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
  const { user, profile } = useAuth();
  // Owner (2026-08-05): the hero shows a CONSECUTIVE-day streak (not total
  // days visited), games played TODAY (not lifetime), and world rank, and all
  // of it only for signed-in players. Guests get a sign-up nudge instead.
  const { globalCurrentStreak } = useStreaks();
  const [playedCount, setPlayedCount] = useState(0);
  const [gamesToday, setGamesToday] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [worldRank, setWorldRank] = useState<number | null>(null);
  // Same identity game_completions rows are written under (guest handle or
  // profile display name), mirrors useGameNavbarStats.
  const playerName = useMemo(() => getCurrentPlayerName(profile), [profile]);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bestScores, setBestScores] = useState<Record<string, number>>({});
  const isSearching = searchQuery.trim().length > 0;

  // Index built once (registry is static at runtime), scoring re-run only
  // when the query text changes.
  const searchIndex = useMemo(buildSearchIndex, []);
  const filteredGames = useMemo(
    () => (isSearching ? rankGames(searchQuery, searchIndex) : []),
    [isSearching, searchQuery, searchIndex]
  );

  useEffect(() => {
    setPlayedCount(countPlayedGames());
    setGamesToday(getLocalTodayCount());
  }, []);

  // Lifetime hero stats: distinct games ever completed under this handle
  // (server truth from game_completions, floored by the local count so the
  // chip never regresses while an insert is in flight) + all-time world rank
  // from the same global_rank RPC the leaderboard's "Your world rank" uses.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const todayUtc = new Date().toISOString().split('T')[0];
        const [playedRes, rankRes, todayRes] = await Promise.all([
          (supabase.from as any)('game_completions')
            .select('game')
            .eq('player_name', playerName),
          (supabase.rpc as any)('global_rank', {
            p_player: playerName,
            p_period: 'alltime',
            p_games: null,
          }),
          (supabase.from as any)('game_completions')
            .select('game')
            .eq('player_name', playerName)
            .eq('completed_on', todayUtc),
        ]);
        if (cancelled) return;

        if (todayRes?.data) {
          const distinctToday = new Set(
            (todayRes.data as Array<{ game: string }>).map(r => r.game)
          ).size;
          setGamesToday(prev => Math.max(prev, distinctToday));
        }

        if (playedRes?.data) {
          // Only count games that still exist on the site, so the chip can
          // never read 40/38 after a game is retired.
          const liveSlugs = new Set(ALL_GAMES.map(g => g.path.replace(/^\//, '')));
          const distinct = new Set(
            (playedRes.data as Array<{ game: string }>)
              .map(r => r.game)
              .filter(g => liveSlugs.has(g))
          ).size;
          setPlayedCount(prev => Math.min(TOTAL_GAMES, Math.max(prev, distinct)));
        }

        const rankRow = Array.isArray(rankRes?.data) ? rankRes.data[0] : rankRes?.data ?? null;
        const rank = rankRow ? Number(rankRow.rank) : 0;
        setWorldRank(rank > 0 ? rank : null);
      } catch { /* silent: chips keep their local values */ }
    };
    load();
    return () => { cancelled = true; };
  }, [playerName]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);

        // Sitewide games-played-today, now backed by the real, anonymous-
        // inclusive public.game_completions table instead of summing a
        // hardcoded list of per-game (mostly auth-only) score tables.
        // game_completions isn't in the generated Supabase types yet (added
        // via direct SQL), so it's addressed dynamically here.
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
        description="100+ free sports trivia games and career sims covering NFL, NBA, MLB, NHL, Soccer, College Sports, UFC, F1, Tennis, NASCAR and more. Daily challenges, no login required."
        path="/"
      />
      <HomeTileStyles />
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

            {/* Stats bar: PERSONAL stats, signed-in only (owner 2026-08-05).
                Streak = consecutive days, played = today's count, plus world
                rank. Guests see a sign-up nudge because none of it saves
                without an account. Site-wide traffic numbers still must
                never render publicly (owner 2026-07-10). */}
            {user ? (
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span>
                    {globalCurrentStreak > 0 ? (
                      <><strong className="text-foreground">{globalCurrentStreak}</strong> {globalCurrentStreak === 1 ? 'day' : 'days'} in a row</>
                    ) : (
                      'Play anything to start your streak'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Trophy className="w-4 h-4 text-[hsl(43,85%,55%)]" />
                  <span>Played today: <strong className="text-foreground">{gamesToday}</strong></span>
                </div>
                {worldRank !== null && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Globe className="w-4 h-4 text-primary" />
                    <span>World rank <strong className="text-foreground">#{worldRank.toLocaleString()}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <Flame className="w-4 h-4" />
                  Make a free account
                </button>
                <p className="text-xs text-muted-foreground">
                  Sign up and your streak, points and world rank actually count.
                </p>
              </div>
            )}
            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab="signup" />
          </div>
        </section>

        {/* ─── GAME CATEGORIES ─── */}
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
          <MostPlayedToday />
          <PollOfTheDay />
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
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No games found for "{searchQuery}"
                </p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Try one of these instead
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {getPopularFallbackGames().map(game => (
                    <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} />
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              {/* Dynasty & Career Sims showcase (2026-08-05): the deep games, front and center */}
              <section>
                <h2 className="flex items-center gap-2 text-lg font-display font-bold text-foreground mb-1">
                  <span className="text-xl">👑</span>
                  Dynasty & Career Sims
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({FEATURED_GAMES.length} worlds)
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Not quizzes. Whole universes: run a franchise, live a career, build a dynasty. Every one saves your progress.
                </p>
                {/* Round 188: the tile curtain, once per section on scroll. */}
                <RevealSection>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {FEATURED_GAMES.map((game, i) => (
                      <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} revealIndex={i} />
                    ))}
                  </div>
                </RevealSection>
              </section>

              {VISIBLE_CATEGORIES.map(cat => (
                <section key={cat.title}>
                  <h2 className="flex items-center gap-2 text-lg font-display font-bold text-foreground mb-4">
                    <span className="text-xl">{cat.emoji}</span>
                    {cat.title}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({cat.games.length} {cat.games.length === 1 ? 'game' : 'games'})
                    </span>
                    {/* Round 198: the College hub existed with real copy and
                        links to every college game, but nothing on the site
                        pointed at it, so no crawler could reach it and no
                        person could find it. One link fixes both. */}
                    {cat.title === 'College Sports' && (
                      <Link
                        to="/college"
                        /* Round 203: this link was 16px tall, which is half
                           the height a thumb needs. Padded to a real tap
                           target without changing where it sits. */
                        className="ml-auto inline-flex items-center rounded-lg px-2.5 py-2 text-xs font-normal leading-5 text-primary hover:underline"
                      >
                        Hub
                      </Link>
                    )}
                  </h2>
                  <RevealSection>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cat.games.map((game, i) => (
                        <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} revealIndex={i} />
                      ))}
                    </div>
                  </RevealSection>
                </section>
              ))}
            </>
          )}

          {/* Golf went live 2026-08-05 (Guess The Golfer + Golf Higher or
              Lower), so the old Coming Soon placeholder is gone; the Golf
              category now renders through VISIBLE_CATEGORIES like the rest. */}

          {/* Round 91: the owner asked for the rounds-played social proof
              block to go. Removed. */}

        </div>
      </div>
    </>
  );
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (entries.length === 0) return null;

  return (
    <section>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-2">🔥 Most Played Today</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {entries.map(({ game, isFallback }) => (
          <Link
            key={game.path}
            to={game.path}
            className="min-w-0 flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2.5 hover:border-primary/40 transition-colors"
          >
            <span className="text-lg shrink-0">{game.emoji}</span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-foreground block truncate">{game.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {isFallback ? 'Popular pick' : 'Trending today'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ─── Round 188: the tile curtain (S-3's home page pass) ───
   Each game section reveals once as it scrolls into view: tiles rise in a
   short stagger, capped by a modulo so a 20-tile grid does not take five
   seconds to settle. Rules of the house: transforms and opacity only (no
   layout shift), the animation is emphasis on entrance and never hides
   anything from a user who prefers reduced motion (the media query kills
   it dead and shows everything instantly), and search results get NO
   curtain because search must feel instant. The observer disconnects
   after firing, so a section only ever performs its entrance once. */
function HomeTileStyles() {
  return (
    <style>{`
      [data-tile-reveal="out"] .home-tile { opacity: 0; }
      @keyframes homeTileIn { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: none; } }
      [data-tile-reveal="in"] .home-tile { animation: homeTileIn 0.45s ease-out both; }
      @media (prefers-reduced-motion: reduce) {
        [data-tile-reveal="out"] .home-tile, [data-tile-reveal="in"] .home-tile { animation: none; opacity: 1; transform: none; }
      }
    `}</style>
  );
}

function RevealSection({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* No observer, no theatre: everything simply shows. */
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} data-tile-reveal={inView ? 'in' : 'out'}>{children}</div>;
}

/** Stagger inside a section, capped so deep grids settle fast. */
const tileDelay = (i: number) => `${(i % 9) * 0.06}s`;

/* ─── GAME CARD ─── */
function GameCard({ game, bestScore, revealIndex }: { game: GameDef; bestScore?: number; revealIndex?: number }) {
  return (
    <Link
      to={game.path}
      className="home-tile group flex items-start gap-3 rounded-xl border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 hover:-translate-y-0.5 transition-all duration-200"
      style={revealIndex != null ? { animationDelay: tileDelay(revealIndex) } : undefined}
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
