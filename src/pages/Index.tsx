import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame, TrendingUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Footer } from '@/components/game/Footer';
import PageSeo from '@/components/seo/PageSeo';
import { Header } from '@/components/layout/Header';
import { StreakReminder } from '@/components/game/StreakReminder';

// ─── game registry ───
interface GameDef {
  path: string;
  label: string;
  emoji: string;
  description: string;
  daily?: boolean;
  isNew?: boolean;
  storageKey?: string; // localStorage key pattern to check "played today"
}

const CATEGORIES: { title: string; emoji: string; games: GameDef[] }[] = [
  {
    title: 'Soccer',
    emoji: '⚽',
    games: [
      { path: '/footle', label: 'Footle', emoji: '🎯', description: 'Guess the soccer player from stats', storageKey: 'footle' },
      { path: '/career', label: 'Career Quiz', emoji: '📜', description: 'Guess from career history', storageKey: 'career-game' },
      { path: '/higher-lower', label: 'Higher or Lower', emoji: '📊', description: 'Compare all-time career stats' },
      { path: '/connections', label: 'Connections', emoji: '🔗', description: 'Find groups of 4 connected players' },
      { path: '/build-your-xi', label: 'Build Your XI', emoji: '⚽', description: 'Create a lineup, get AI rated' },
      { path: '/guess-the-face', label: 'Guess the Face', emoji: '🖼️', description: 'Unblur the soccer player' },
      { path: '/football-connect-4', label: 'Connect 4', emoji: '🔴', description: 'Soccer trivia meets Connect 4' },
      { path: '/world-cup', label: 'World Cup', emoji: '🏆', description: 'Guess the World Cup legend', daily: true },
      { path: '/guess-soccer-club', label: 'Guess The Club', emoji: '🏟️', description: 'Identify the mystery football club', daily: true, isNew: true },
    ],
  },
  {
    title: 'Pro Football',
    emoji: '🏈',
    games: [
      { path: '/football-grid', label: 'Pro Football Grid', emoji: '🏈', description: '3×3 grid puzzle with rarity scores', daily: true },
      { path: '/football-timeline', label: 'Timeline', emoji: '📅', description: 'Order players by draft year', daily: true },
      { path: '/football-draft', label: 'Draft Guesser', emoji: '🎰', description: 'Guess the draft round', daily: true },
      { path: '/nfl-career', label: 'NFL Career Path', emoji: '🏈', description: 'Guess the NFL player from clues', daily: true },
      { path: '/guess-nfl-team', label: 'Guess The Team', emoji: '🏈', description: 'Identify the NFL franchise', daily: true, isNew: true },
    ],
  },
  {
    title: 'College',
    emoji: '🎓',
    games: [
      { path: '/college-grid', label: 'College Grid', emoji: '🎓', description: 'College football 3×3 grid puzzle', daily: true },
      { path: '/guess-the-college', label: 'Guess The College', emoji: '🏫', description: 'Guess the D1 school from clues', daily: true, isNew: true },
    ],
  },
  {
    title: 'Pro Basketball',
    emoji: '🏀',
    games: [
      { path: '/nba-starting-5', label: 'NBA Starting 5', emoji: '🏀', description: 'Build a lineup with stat challenges' },
      { path: '/nba-connect-4', label: 'NBA Connect 4', emoji: '🏀', description: 'NBA trivia meets Connect 4' },
      { path: '/nba-chain', label: 'NBA Chain', emoji: '🔗', description: 'Build a chain of connected players' },
    ],
  },
  {
    title: 'Baseball',
    emoji: '⚾',
    games: [
      { path: '/baseball-career', label: 'Career Path', emoji: '⚾', description: 'Guess the baseball player', daily: true },
      { path: '/baseball-connections', label: 'Connections', emoji: '⚾', description: 'Group baseball players', daily: true },
    ],
  },
  {
    title: 'Hockey',
    emoji: '🏒',
    games: [
      { path: '/hockey-career', label: 'Career Path', emoji: '🏒', description: 'Guess the hockey player', daily: true },
      { path: '/hockey-higher-lower', label: 'Higher / Lower', emoji: '🏒', description: 'Compare career points', daily: true },
    ],
  },
  {
    title: 'Combat Sports',
    emoji: '🥊',
    games: [
      { path: '/ufc', label: 'UFC Guesser', emoji: '🥊', description: 'Guess the UFC fighter' },
      { path: '/ufc-chain', label: 'Combat Chain', emoji: '🔗', description: 'Build a chain of fighters who beat each other', isNew: true },
    ],
  },
  {
    title: 'Motorsport',
    emoji: '🏎️',
    games: [
      { path: '/f1-driver', label: 'Guess The F1 Driver', emoji: '🏎️', description: 'Guess the mystery F1 driver from clues', daily: true, isNew: true },
    ],
  },
  {
    title: 'Multi-Sport',
    emoji: '🏅',
    games: [
      { path: '/teammates', label: 'Teammates or Not?', emoji: '🤝', description: 'Were they ever teammates?', isNew: true },
      { path: '/olympics', label: 'The Medal Games', emoji: '🏅', description: 'Guess the mystery athlete from clues', daily: true, isNew: true },
      { path: '/guess-the-year', label: 'Guess The Year', emoji: '📅', description: 'What year did these happen?', daily: true, isNew: true },
      { path: '/guess-the-nation', label: 'Guess The Nation', emoji: '🌍', description: 'Identify the mystery sporting nation', daily: true, isNew: true },
    ],
  },
];

const ALL_GAMES = CATEGORIES.flatMap(c => c.games);
const TOTAL_GAMES = ALL_GAMES.length;


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

  useEffect(() => {
    setPlayedCount(countPlayedGames());
  }, []);

  // Fetch total scores from Supabase as social proof
  useEffect(() => {
    (async () => {
      try {
        const { count } = await supabase
          .from('medal_games_scores')
          .select('*', { count: 'exact', head: true });
        // Combine with grid selections for a bigger number
        const { count: fgCount } = await supabase
          .from('football_grid_selections')
          .select('*', { count: 'exact', head: true });
        const { count: cgCount } = await supabase
          .from('college_grid_selections')
          .select('*', { count: 'exact', head: true });
        setTotalPlayed((count ?? 0) + (fgCount ?? 0) + (cgCount ?? 0));
      } catch { /* silent */ }
    })();
  }, []);

  return (
    <>
      <PageSeo
        title="DoUKnowBall — The Ultimate Sports Trivia Hub"
        description="20+ free sports trivia games covering soccer, NFL, NBA, MLB, NHL, UFC and more. Daily challenges, no login required. How well do you know ball?"
        path="/"
      />
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        
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
                  <span><strong className="text-foreground">{totalPlayed.toLocaleString()}</strong> rounds played</span>
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
          <StreakReminder />
          
          {CATEGORIES.map(cat => (
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
