import { useState, useEffect } from 'react';
import { useUfcGame } from '@/hooks/useUfcGame';
import { UfcFighterSearch } from '@/components/ufc/UfcFighterSearch';
import { UfcGameBoard } from '@/components/ufc/UfcGameBoard';
import { UfcHowToPlay } from '@/components/ufc/UfcHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { RotateCcw, HelpCircle } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { cn } from '@/lib/utils';

const UfcGame = () => {
  const {
    mode,
    switchMode,
    guesses,
    gameStatus,
    makeGuess,
    giveUp,
    resetGame,
    fighters,
    guessedFighterNames,
    maxGuesses,
    targetFighter,
    isLoading,
  } = useUfcGame();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('ufc-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('ufc-rules-seen', '1');
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="UFC Fighter Guesser - MMA Trivia Game | DoUKnowBall"
        description="Guess the UFC fighter from clues about their record, weight class, and career highlights."
        path="/ufc"
      />
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-3xl md:text-7xl font-bold tracking-[0.1em] md:tracking-[0.25em] text-primary font-display mb-1">
            UFC GUESSER
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Guess the UFC fighter in 8 tries using clues like weight class, record, and nationality. Free MMA trivia, no login needed.
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

          <p className="text-sm text-muted-foreground mt-4">
            Guesses:{' '}
            <span className="text-foreground font-semibold">{guesses.length}</span> / {maxGuesses}
          </p>
        </header>

        {isLoading ? (
          <div className="mb-8 flex justify-center">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : gameStatus === 'playing' ? (
          <div className="mb-8 space-y-3">
            <UfcFighterSearch
              fighters={fighters}
              guessedNames={guessedFighterNames}
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

        <UfcGameBoard guesses={guesses} maxGuesses={maxGuesses} />

        {gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <h2 className="text-2xl font-bold text-correct font-display mb-2">Correct!</h2>
                  <p className="text-foreground">
                    You guessed{' '}
                    <span className="font-bold text-primary">{targetFighter?.name}</span> in{' '}
                    {guesses.length} {guesses.length === 1 ? 'try' : 'tries'}!
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😞</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">Game Over</h2>
                  <p className="text-foreground">
                    The fighter was{' '}
                    <span className="font-bold text-primary">{targetFighter?.name}</span>
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    {targetFighter?.weightClass} · {targetFighter?.record}
                  </p>
                </>
              )}
              <ShareButtons
                score={gameStatus === 'won' ? `${guesses.length}/${maxGuesses} guesses` : `0/${maxGuesses}`}
                gameName="UFC Guesser"
                gamePath="/ufc"
              />
              {mode === 'unlimited' ? (
                <button
                  onClick={resetGame}
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

        <GameSeoContent
          title="Combat Sports Trivia Game | DoUKnowBall"
          description="Test your UFC and MMA knowledge with daily trivia puzzles covering fighters, records, weight classes and championship history."
          howToPlay={[
            "A mystery UFC fighter is selected. Guess who it is in 8 tries",
            "Each guess reveals clues: weight class, record, nationality and more",
            "Green means correct, yellow means close, red means wrong",
            "Use the higher/lower arrows to narrow down numeric stats",
          ]}
          examples={[
            "Conor McGregor: Featherweight/Lightweight, Ireland, 22-6",
            "Khabib Nurmagomedov: Lightweight, Russia, 29-0",
            "Jon Jones: Light Heavyweight/Heavyweight, USA, 27-1",
            "Amanda Nunes: Bantamweight/Featherweight, Brazil, 21-5",
            "Israel Adesanya: Middleweight, Nigeria/New Zealand, 24-3",
            "Charles Oliveira: Lightweight, Brazil, 34-10"
          ]}
        />

        <AdBanner slot="1234567892" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="ufc" gameContext={{ targetFighter: targetFighter?.name }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <UfcHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default UfcGame;
