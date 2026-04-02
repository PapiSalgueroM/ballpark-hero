import { useState, useEffect } from 'react';
import { useWorldCup } from '@/hooks/useWorldCup';
import { WorldCupHowToPlay } from '@/components/world-cup/WorldCupHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, SkipForward, Send, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const WorldCup = () => {
  const {
    puzzle,
    revealedClues,
    revealedCount,
    totalClues,
    guess,
    setGuess,
    attempts,
    submitGuess,
    skipClue,
    giveUp,
    gameStatus,
    score,
  } = useWorldCup();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('wc-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('wc-rules-seen', '1');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitGuess(guess);
    setGuess('');
  };

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="World Cup Trivia – Guess the Player | DoUKnowBall"
        description="Guess the mystery World Cup player from progressive clues. Covers every tournament from 1970 to 2026. Daily challenge — same puzzle for everyone."
        path="/world-cup"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--wc-gold))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] font-display mb-1 text-[hsl(var(--wc-green))]">
            ⚽ WORLD CUP
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Guess the mystery World Cup player from progressive clues. A new challenge every day!
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            Clue{' '}
            <span className="font-semibold text-foreground">{Math.min(revealedCount, totalClues)}</span>{' '}
            / {totalClues}
          </p>
        </header>

        {/* Clues */}
        <div className="space-y-3 mb-8">
          {revealedClues.map((clue, i) => {
            const isFinalReveal = clue.label === 'Answer' && gameStatus !== 'playing';
            return (
              <div
                key={i}
                className={cn(
                  'rounded-xl border p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-300',
                  isFinalReveal
                    ? 'border-[hsl(var(--wc-gold))]/50 bg-[hsl(var(--wc-gold))]/10'
                    : 'border-border bg-card'
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--wc-green))]">
                  {clue.label}
                </span>
                <p className={cn(
                  'mt-1',
                  isFinalReveal
                    ? 'text-2xl md:text-3xl font-bold text-[hsl(var(--wc-gold))] font-display'
                    : 'text-foreground text-lg font-medium'
                )}>
                  {clue.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Input area */}
        {gameStatus === 'playing' && (
          <div className="space-y-3 mb-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Type your guess…"
                className="flex-1 rounded-full border border-border bg-card px-5 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--wc-green))]/50"
              />
              <button
                type="submit"
                disabled={!guess.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-[hsl(var(--wc-green))] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                Guess
              </button>
              <button
                type="button"
                onClick={skipClue}
                className="inline-flex items-center gap-1 px-4 py-3 rounded-full font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            </form>
            <div className="flex justify-center">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>
          </div>
        )}

        {/* Wrong attempts */}
        {attempts.length > 0 && gameStatus === 'playing' && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {attempts.map((a, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-destructive/15 text-destructive text-xs font-medium">
                ✗ {a}
              </span>
            ))}
          </div>
        )}

        {/* Result */}
        {gameStatus !== 'playing' && (
          <div className="flex justify-center mb-8">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <h2 className="text-2xl font-bold text-[hsl(var(--wc-green))] font-display mb-2">
                    Correct!
                  </h2>
                  <p className="text-foreground">
                    You guessed{' '}
                    <span className="font-bold text-[hsl(var(--wc-gold))]">{puzzle.answer}</span>{' '}
                    in {revealedCount} {revealedCount === 1 ? 'clue' : 'clues'}!
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Trophy className="w-5 h-5 text-[hsl(var(--wc-gold))]" />
                    <span className="text-xl font-bold text-[hsl(var(--wc-gold))]">{score} pts</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😞</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">Game Over</h2>
                  <p className="text-foreground">
                    The answer was{' '}
                    <span className="font-bold text-[hsl(var(--wc-gold))]">{puzzle.answer}</span>
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    <FlagImg name={puzzle.country} size={16} /> {puzzle.country} · {puzzle.year}
                  </p>
                </>
              )}
              <ShareButtons
                score={gameStatus === 'won' ? `${score} points in ${revealedCount} clues` : '0 points'}
                gameName="World Cup"
                gamePath="/world-cup"
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="World Cup Trivia Game | DoUKnowBall"
          description="Guess the mystery World Cup player from progressive clues spanning every tournament from 1970 to 2026. Daily challenge — the same puzzle for everyone, resetting at midnight."
          howToPlay={[
            'Clues are revealed one at a time — year, host, position, country, club, and achievement',
            'Guess the player at any point. Earlier guesses earn more points (up to 1,000)',
            'Wrong guesses or skips reveal the next clue',
            'A new daily challenge drops at midnight — same puzzle for all players',
          ]}
        />

        <AdBanner slot="1234567899" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="world-cup" gameContext={{ answer: puzzle.answer, year: puzzle.year }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <WorldCupHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default WorldCup;
