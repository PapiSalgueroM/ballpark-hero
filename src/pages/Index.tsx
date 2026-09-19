import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Trophy, Flame, Sparkles, Users, Search, X, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PageSeo from '@/components/seo/PageSeo';

import { StreakReminder } from '@/components/game/StreakReminder';
import { useMostPlayed } from '@/hooks/useMostPlayed';
import { PollOfTheDay } from '@/components/home/PollOfTheDay';
import { FeaturedStage } from '@/components/home/FeaturedStage';
import { SportGlyph, sportStyle } from '@/components/home/SportGlyph';
import { useStreaks } from '@/hooks/useStreaks';
import { AuthModal } from '@/components/auth/AuthModal';

import { ALL_GAMES, CATEGORIES, VISIBLE_CATEGORIES, FEATURED_GAMES, GAME_COUNT_LABEL, TOTAL_GAMES, type GameDef, type CategoryTitle } from '@/data/gameRegistry';
import { CATEGORY_SPORT, sportOf } from '@/data/homeFront';
import { isNewGame } from '@/lib/newBadge';
import { searchSite } from '@/lib/siteSearch';
import { getTodayET } from '@/lib/dateUtils';
import { SPORT_HUBS } from '@/lib/sportHub';

/** Round 270: the hub that gathers this category, or null when it has none. */
const hubForCategory = (title: CategoryTitle) =>
  SPORT_HUBS.find(h => h.titles.includes(title)) ?? null;
import { getCurrentPlayerName, getLocalTodayCount } from '@/lib/completions';

/**
 * Home search (item #15 audit pass, rehomed in Round 526).
 *
 * The ranking used to live in this file: about 150 lines of normalising,
 * scoring and an alias table, all of it good, none of it reachable from
 * anywhere else. Round 526 built /search and the choice was to write that
 * ranking a second time or to lift this one out. It is lifted:
 * src/lib/siteSearch.ts is the engine now, this box and the search page both
 * call it, and scripts/simSiteSearch.mjs measures it directly. A change to how
 * results are ordered lands in both places at once, which is the whole reason
 * this repo keeps one engine per idea.
 *
 * The home box still shows what it always showed: a flat ranked list of tiles.
 * Only the ranking moved. Round 658 moved the box itself up into the title
 * row, so a visitor who knows what they want no longer scrolls past the polls
 * to find it, and the results now land directly under it.
 */

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

  // The engine builds its index once on first call and caches it, so this is
  // scoring only, re-run when the query text changes and not before.
  const filteredGames = useMemo(
    () => (isSearching ? searchSite(searchQuery).map(r => r.game) : []),
    [isSearching, searchQuery]
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
      {/* Round 265: this title must MATCH the one in index.html. A crawler
          with JavaScript off reads the template's title and one that renders
          reads this one, and until now they said two different things, so
          Google was choosing between "The Ultimate Sports Trivia Hub" and
          "Free Daily Sports Trivia Games" depending on how it fetched the
          page. The template's wording wins because it is what people search
          for. simHomeCopy fails if the two drift apart again. The comment
          sits OUT here rather than inside the props: a comment between the
          attributes compiles fine but breaks simIndexing's parse of the
          PageSeo block, which is how this was caught. */}
      <PageSeo
        title="DoUKnowBall: Free Sports Trivia Games and Daily Quizzes"
        description={`${GAME_COUNT_LABEL} free sports trivia games, daily sports quizzes and career sims covering NFL, NBA, MLB, NHL, Soccer, College Sports, UFC, F1, Tennis, NASCAR and more. No login required.`}
        path="/"
      />
      <HomeTileStyles />
      {/* Round 215: the skip link in App.tsx points here. */}
      <div id="dukb-main" className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-4 pb-12">

          {/* ─── TITLE ROW ───
              ROUND 283 took the hero down to what was carrying weight, and
              Round 658 takes the rest of the way: the owner's h1 and his
              tagline, compact and left aligned, with the search box beside
              them instead of three screens down. Nothing here asks for
              anything; the account line sits under the games now.

              The Round 283 note still holds for the tagline: it carries NO
              number of its own. GAME_COUNT_LABEL is derived from the registry
              and the template's counts are checked against the registry by
              simHomeCopy, so a typed figure here would be a second copy with
              no guard behind it.

              The signed-in chips live in the h1's own row, whose height is
              fixed, so auth resolving (or a streak arriving) moves nothing on
              the page. playHomeFold section 4 plants a record and holds it. */}
          <div className="pt-4 pb-3 md:flex md:items-end md:justify-between md:gap-8 md:pt-7 md:pb-6">
            <div className="min-w-0">
              <div className="flex h-8 items-center gap-3 md:h-11">
                <h1 className="font-display text-2xl font-bold leading-none tracking-tight text-primary md:text-[40px]">
                  DoUKnowBall
                </h1>
                {/* Stats: PERSONAL stats, signed-in only (owner 2026-08-05).
                    Streak = consecutive days, played = today's count, plus
                    world rank. Site-wide traffic numbers still must never
                    render publicly (owner 2026-07-10). */}
                {user && (
                  <div className="ml-auto flex min-w-0 items-center gap-1.5 md:ml-2">
                    <StatChip icon={<Flame className="h-3.5 w-3.5 text-warn" />} label="Days in a row" value={String(globalCurrentStreak)} unit={globalCurrentStreak === 1 ? 'day' : 'days'} />
                    <StatChip icon={<Trophy className="h-3.5 w-3.5 text-gold" />} label="Played today" value={String(gamesToday)} unit="today" />
                    {worldRank !== null && (
                      <StatChip icon={<Globe className="h-3.5 w-3.5 text-primary" />} label="World rank" value={`#${worldRank.toLocaleString()}`} />
                    )}
                  </div>
                )}
              </div>
              {/* Owner 2026-08-28: "hero headline is too long", replaced with
                  his shape. The Round 297 honesty rule survives the cut: the
                  account claim stays phrased as what is true, every game plays
                  without one. The legal disclaimer lives in the footer. */}
              <p className="mt-1 text-[13px] leading-5 text-muted-foreground md:mt-1.5 md:text-base md:leading-6">
                {`${GAME_COUNT_LABEL} free games across every sport. All playable without an account.`}
              </p>
            </div>

            <div className="relative mt-3 md:mt-0 md:w-[340px] md:shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search games"
                placeholder='Search games... e.g. soccer, grid, NBA'
                className="h-11 w-full pl-10 pr-10 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
              {isSearching && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Search results replace everything under the title row, so they
              arrive right under the box with nothing to scroll past. */}
          {isSearching ? (
            filteredGames.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
            <div className="space-y-10">
              <div className="space-y-4">
                {/* ─── MAIN EVENT ───
                    Round 658: the four flagships on the first screen, Soccer
                    Career on the big stage. It is the first thing on the page
                    to play: a 390 by 844 phone sees it at about y=250, where
                    the Round 283 fence allows 430. */}
                <FeaturedStage />

                {/* A line, not a gate. Everything on this site plays signed
                    out, so the account is an upsell and belongs where an
                    upsell goes: after the games, not in front of them. The nav
                    still carries Sign Up for anyone who came here to make one. */}
                {!user && (
                  <p className="text-xs text-muted-foreground">
                    Every game here plays without an account.{' '}
                    {/* Round 285: py-2 with a matching negative margin.
                        sweepPhone measured this control at 16px tall on a
                        phone, which is half the tap target floor. The padding
                        grows the hit area to 32px; the negative margin keeps
                        the sentence's line spacing exactly where it was. */}
                    <button
                      onClick={() => setAuthOpen(true)}
                      className="text-primary font-medium underline underline-offset-2 hover:opacity-80 py-2 -my-2"
                    >
                      Make a free one
                    </button>{' '}
                    and your streak, points and world rank start counting.
                  </p>
                )}
                <StreakReminder />
              </div>

              <MostPlayedToday />
              {/* Round 293 put a personal dailies checklist here. Round 297 removed
                  it on the owner's direct instruction in the 2026-08-26 tweaks
                  document ("The your dailies I would say get rid of it"). Most
                  played stays, per the same document. */}
              <PollOfTheDay />
              {/* ROUND 382: the maker's note is gone from here, on the owner's
                  instruction: "it shouldnt pop up there I would rather you put it
                  in one the small like tabs on the bottom like near the privacy
                  policy". It now lives on /about, which is the first link in that
                  small footer row, and it no longer carries his name. Round 346
                  put it here and that was his idea at the time; changing his mind
                  about his own voice on his own site is his call. */}

              {/* Dynasty & Career Sims showcase (2026-08-05): the deep games, front and center */}
              <section>
                <h2 className="flex items-center gap-2.5 text-lg font-display font-bold text-foreground mb-1">
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-base ring-1 ring-inset ring-gold/30">👑</span>
                  Dynasty & Career Sims
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({FEATURED_GAMES.length} worlds)
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mb-4 md:pl-[42px]">
                  Not quizzes. Whole universes: run a franchise, live a career, build a dynasty. Every one saves your progress.
                </p>
                {/* Round 188: the tile curtain, once per section on scroll. */}
                <RevealSection>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {FEATURED_GAMES.map((game, i) => (
                      <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} revealIndex={i} />
                    ))}
                  </div>
                </RevealSection>
              </section>

              {VISIBLE_CATEGORIES.map(cat => (
                <section key={cat.title} data-sport={CATEGORY_SPORT[cat.title]}>
                  {/* Round 658: the sport's drawn glyph in its own ink leads
                      every section, so the colour on the cards below always
                      has a shape and a name beside it. */}
                  <h2 className="flex items-center gap-2.5 text-lg font-display font-bold text-foreground mb-4" style={sportStyle(CATEGORY_SPORT[cat.title])}>
                    <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tile/15 text-tile ring-1 ring-inset ring-tile/30">
                      <SportGlyph sport={CATEGORY_SPORT[cat.title]} className="h-[18px] w-[18px]" />
                    </span>
                    {cat.title}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({cat.games.length} {cat.games.length === 1 ? 'game' : 'games'})
                    </span>
                    {/* Round 198: the College hub existed with real copy and
                        links to every college game, but nothing on the site
                        pointed at it, so no crawler could reach it and no
                        person could find it. One link fixes both.
                        Round 270: five more sports got a hub, so the link is
                        driven off the hub list instead of one hand written
                        case, and a hub added there gets its link here free. */}
                    {hubForCategory(cat.title) && (
                      <Link
                        to={hubForCategory(cat.title)!.route}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {cat.games.map((game, i) => (
                        <GameCard key={game.path} game={game} bestScore={bestScores[game.path.slice(1)]} revealIndex={i} />
                      ))}
                    </div>
                  </RevealSection>
                </section>
              ))}
            </div>
          )}

          {/* Golf went live 2026-08-05 (Guess The Golfer + Golf Higher or
              Lower), so the old Coming Soon placeholder is gone; the Golf
              category now renders through VISIBLE_CATEGORIES like the rest. */}

          {/* Round 91: the owner asked for the rounds-played social proof
              block to go. Removed. */}

          <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultTab="signup" />
        </div>
      </div>
    </>
  );
}

/** One signed-in stat in the title row. The unit words drop on a phone so
    three chips fit beside the h1 without making the row any taller. */
function StatChip({ icon, label, value, unit }: { icon: ReactNode; label: string; value: string; unit?: string }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-border bg-surface-1 px-2 text-xs text-muted-foreground">
      {icon}
      <span className="sr-only">{label}: </span>
      <strong className="text-foreground">{value}</strong>
      {unit && <span className="hidden sm:inline">{unit}</span>}
    </span>
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
              {/* ROUND 283: all three of these tiles read "Popular pick", the
                  same two words under three different games, because the
                  fallback label is a constant. Every game in the registry
                  carries its own one line description and that is what a
                  person needs in order to choose between three tiles. The
                  "Trending today" case keeps its label, because there the
                  label IS the information: it says the ranking is real. */}
              <span className="text-[10px] text-muted-foreground block truncate">
                {isFallback ? game.description : 'Trending today'}
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

/* ─── GAME CARD ───
   Round 658: every card wears its sport. A 3px rule and a tinted icon tile
   in the sport's ink, and the sport's drawn glyph as a badge on the icon so
   the colour is never the only signal (search results and the sims row mix
   sports on one grid). The game's own emoji stays in the tile: it is the one
   thing on the card that tells two games of the same sport apart at a
   glance. The description is clamped to two lines so a grid of cards lines
   up in rows. */
function GameCard({ game, bestScore, revealIndex }: { game: GameDef; bestScore?: number; revealIndex?: number }) {
  /* Round 447: the NEW badge is derived from the day the game shipped, not
     read from a flag ("u call like everything new": 111 of 131 tiles wore
     it). The day is pinned once at mount, the same rule every daily game
     follows, so the tiles cannot disagree with each other across midnight. */
  const todayStr = useRef(getTodayET()).current;
  const sport = sportOf(game.path);
  return (
    <Link
      to={game.path}
      data-sport={sport}
      className="home-tile group relative flex items-start gap-3 overflow-hidden rounded-xl border border-border/80 bg-surface-1 p-4 pt-[18px] hover:border-tile/50 hover:bg-surface-2 hover:-translate-y-0.5 transition-all duration-200"
      style={{ ...sportStyle(sport), ...(revealIndex != null ? { animationDelay: tileDelay(revealIndex) } : {}) }}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-tile" />
      <SportGlyph sport={sport} className="pointer-events-none absolute -bottom-4 -right-4 h-20 w-20 text-tile opacity-[0.07] transition-opacity duration-200 group-hover:opacity-[0.13]" />
      <span aria-hidden="true" className="relative mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tile/15 text-2xl ring-1 ring-inset ring-tile/25">
        {game.emoji}
        <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-surface-1 text-tile ring-1 ring-tile/50">
          <SportGlyph sport={sport} className="h-3.5 w-3.5" />
        </span>
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
          {/* Round 650: the game's name is an h3 under its category's h2, so
              the rendered home page reads as a real outline of the site.
              The reset gives a heading the inherited size and weight, so the
              tile looks exactly as it did with a span. */}
          <h3 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
            {game.label}
          </h3>
          {game.daily && (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              Daily
            </span>
          )}
          {isNewGame(game.addedOn, todayStr) && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/15 text-gold">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">{game.description}</p>
        {bestScore != null && bestScore > 0 && (
          <span className="text-[10px] text-gold/70 mt-0.5 block">PB: {bestScore}</span>
        )}
      </div>
    </Link>
  );
}
