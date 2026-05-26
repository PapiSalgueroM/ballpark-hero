import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGame';
import { PlayerSearch } from '@/components/game/PlayerSearch';
import { GameBoard } from '@/components/game/GameBoard';
import { HowToPlay } from '@/components/game/HowToPlay';
import { cn } from '@/lib/utils';
import { RotateCcw, HelpCircle } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PostGameStats from '@/components/game/PostGameStats';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const Index = () => {
  const {
    mode,
    switchMode,
    dailyTier,
    difficulty,
    changeDifficulty,
    guesses,
    gameStatus,
    makeGuess,
    giveUp,
    resetGame,
    availablePlayers,
    guessedPlayerNames,
    maxGuesses,
    targetPlayer,
    isLoading,
    isLoadingPool,
  } = useGame();

  const [showRules, setShowRules] = useState(false);

  // Show rules on first visit
  useEffect(() => {
    const seen = localStorage.getItem('footle-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('footle-rules-seen', '1');
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Footle - Daily Soccer Player Guessing Game | DoUKnowBall"
        description="Guess the mystery soccer player in 8 tries. New player every day. Free daily football puzzle game."
        path="/footle"
      />
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          {/* Help button */}
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-5xl md:text-7xl font-bold tracking-[0.25em] text-primary font-display mb-1">
            FOOTLE
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto">
            Guess the soccer player in 8 tries — one of 10+ free sports trivia games across soccer, NBA &amp; UFC. No login. No tracking. Just play.
          </p>

          {/* Daily / Unlimited toggle */}
          <div className="flex items-center justify-center gap-1 mt-6 bg-secondary rounded-full p-1 w-fit mx-auto">
            {(['daily', 'unlimited'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
              </button>
            ))}
          </div>

          {/* Daily tier banner — visible before first guess and throughout */}
          {mode === 'daily' && (
            <div className={cn(
              'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold mt-3',
              dailyTier === 'easy' && 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
              dailyTier === 'hard' && 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
              dailyTier === 'insane' && 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
            )}>
              Today's Daily: {dailyTier.toUpperCase()} MODE
            </div>
          )}

          {/* Difficulty selector — unlimited mode only */}
          {mode === 'unlimited' && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {(['easy', 'hard', 'insane'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => changeDifficulty(d)}
                  className={cn(
                    'px-6 py-2 rounded-full text-sm font-semibold transition-all capitalize',
                    difficulty === d
                      ? d === 'easy'
                        ? 'bg-correct text-correct-foreground'
                        : d === 'hard'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-destructive text-destructive-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Guess Counter */}
          <p className="text-sm text-muted-foreground mt-4">
            Guesses:{' '}
            <span className="text-foreground font-semibold">
              {guesses.length}
            </span>{' '}
            / {maxGuesses}
          </p>
        </header>

        {/* Search */}
        {(isLoadingPool || isLoading) ? (
          <div className="mb-8 flex justify-center">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : gameStatus === 'playing' ? (
          <div className="mb-8 space-y-3">
            <PlayerSearch
              players={availablePlayers}
              guessedNames={guessedPlayerNames}
              onSelect={makeGuess}
            />
            <div className="flex justify-center">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>
          </div>
        ) : null}

        {/* Game Board */}
        <GameBoard guesses={guesses} maxGuesses={maxGuesses} />

        {/* Game Over */}
        {gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-correct font-display mb-2">
                    Correct!
                  </h2>
                  <p className="text-foreground">
                    You guessed{' '}
                    <span className="font-bold text-primary">
                      {targetPlayer?.name}
                    </span>{' '}
                    in {guesses.length}{' '}
                    {guesses.length === 1 ? 'try' : 'tries'}!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😞</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">
                    Game Over
                  </h2>
                  <p className="text-foreground">
                    The player was{' '}
                    <span className="font-bold text-primary">
                      {targetPlayer?.name}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {targetPlayer?.club} · {targetPlayer?.league}
                  </p>
                </>
              )}
              <ShareButtons
                score={gameStatus === 'won' ? `${guesses.length}/${maxGuesses} guesses` : `0/${maxGuesses}`}
                gameName="Footle"
                gamePath="/"
              />
              <PostGameStats
                gameSlug="footle"
                userScore={gameStatus === 'won' ? Math.max(0, 1000 - (guesses.length - 1) * 125) : 0}
                isVisible={true}
              />
              {mode === 'unlimited' ? (
                <button
                  onClick={() => resetGame()}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again
                </button>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-correct" />
            <span>Correct</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-close" />
            <span>Close</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-incorrect" />
            <span>Not a match</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>▲▼</span>
            <span>Higher / Lower hint</span>
          </div>
        </div>

        {/* Ad placement */}
        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="footle" gameContext={{ targetPlayer: targetPlayer?.name, difficulty }} />
        </div>

        {/* Game Navigation */}
        <GameSeoContent
          title="Footle — Soccer Player Guessing Game"
          description="Guess the mystery soccer player in 8 tries. Each guess reveals clues about the player's club, league, nationality, position, and age. One of 30+ free daily sports trivia games."
          howToPlay={[
            "Type a soccer player's name and submit your guess. You get 8 attempts.",
            "After each guess, colored tiles show how close you are — green means correct, yellow means close.",
            "Use the clues to narrow down the mystery player. A new puzzle is available every day."
          ]}
          examples={[
            "Lionel Messi — Inter Miami, MLS, Argentina, Forward",
            "Erling Haaland — Manchester City, Premier League, Norway, Forward",
            "Jude Bellingham — Real Madrid, La Liga, England, Midfielder",
            "Kylian Mbappé — Real Madrid, La Liga, France, Forward",
            "Bukayo Saka — Arsenal, Premier League, England, Winger",
            "Vinícius Júnior — Real Madrid, La Liga, Brazil, Forward",
            "Pedri — Barcelona, La Liga, Spain, Midfielder",
            "Florian Wirtz — Bayer Leverkusen, Bundesliga, Germany, Midfielder"
          ]}
        />
        <GameNav />
        <Footer />
      </div>

      {/* How to Play Modal */}
      <HowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default Index;
