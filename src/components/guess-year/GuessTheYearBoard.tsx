import { useState } from 'react';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { useGuessTheYear } from '@/hooks/useGuessTheYear';
import { Button } from '@/components/ui/button';
import { GuessTheYearHowToPlay } from './GuessTheYearHowToPlay';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import { HelpCircle, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { POINTS_BY_CLUE } from '@/types/guessTheYear';

export function GuessTheYearBoard() {
  const {
    gameState,
    makeGuess,
    giveUp,
    revealNextClue,
    resetGame,
    yearRange,
    pointsForCurrentClue,
    maxClues,
  } = useGuessTheYear();

  const gameRef = useScrollToGame(gameState);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2000);

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    if (newYear >= yearRange.min && newYear <= yearRange.max) {
      setSelectedYear(newYear);
    }
  };

  const handleGuess = () => {
    makeGuess(selectedYear);
  };

  const isPlaying = gameState.gameStatus === 'playing';
  const isWon = gameState.gameStatus === 'won';
  const isLost = gameState.gameStatus === 'lost';

  return (
    <div ref={gameRef}>
      <GameShell
        /* Round 348: this board passes its own "How to Play" button through
           headerExtra, so the shell must not add a second one. */
        help="none"
        width="narrow"
        title="Guess The Year"
        emoji="📅"
        subtitle="What year did all these sports events happen?"
        headerExtra={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHelp(true)}
            className="mt-2"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            How to Play
          </Button>
        }
      >
        {/* Points indicator */}
        {isPlaying && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
              <span className="text-sm text-muted-foreground">Worth:</span>
              <span className="text-lg font-bold text-primary">{pointsForCurrentClue} pts</span>
            </div>
          </div>
        )}

        {/* Clues */}
        <div className="space-y-3 mb-8">
          {gameState.puzzle.clues.map((clue, index) => {
            const isRevealed = index < gameState.revealedClues;
            const clueNumber = index + 1;

            return (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-all ${
                  isRevealed
                    ? 'bg-card border-border'
                    : 'bg-muted/30 border-border/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isRevealed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {clueNumber}
                  </div>
                  <div className="flex-1">
                    {isRevealed ? (
                      <p className="text-foreground">{clue}</p>
                    ) : (
                      <p className="text-muted-foreground italic">
                        {POINTS_BY_CLUE[index]} points, clue locked
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Game controls */}
        {isPlaying && (
          <div className="space-y-4">
            {/* Year picker */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Back ten years"
                  onClick={() => handleYearChange(-10)}
                  disabled={selectedYear - 10 < yearRange.min}
                >
                  <ChevronDown className="w-4 h-4" />
                  <ChevronDown className="w-4 h-4 -ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Back one year"
                  onClick={() => handleYearChange(-1)}
                  disabled={selectedYear <= yearRange.min}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 sm:px-6 py-3 order-first sm:order-none basis-full sm:basis-auto justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-3xl font-bold font-display text-primary">
                    {selectedYear}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Forward one year"
                  onClick={() => handleYearChange(1)}
                  disabled={selectedYear >= yearRange.max}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Forward ten years"
                  onClick={() => handleYearChange(10)}
                  disabled={selectedYear + 10 > yearRange.max}
                >
                  <ChevronUp className="w-4 h-4" />
                  <ChevronUp className="w-4 h-4 -ml-2" />
                </Button>
              </div>

              <Button
                onClick={handleGuess}
                className="w-full max-w-xs"
                size="lg"
              >
                Guess {selectedYear}
              </Button>
            </div>

            {/* Previous guesses */}
            {gameState.guesses.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Previous guesses:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameState.guesses.map((guess, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-destructive/20 text-destructive rounded-full text-sm font-medium"
                    >
                      {guess}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skip clue / Give Up */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {gameState.revealedClues < maxClues && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={revealNextClue}
                  className="text-muted-foreground"
                >
                  Reveal next clue (−{POINTS_BY_CLUE[gameState.revealedClues - 1] - POINTS_BY_CLUE[gameState.revealedClues]} pts)
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={giveUp}
                className="text-muted-foreground"
              >
                🏳️ Give Up
              </Button>
            </div>
          </div>
        )}

        {/* Game over */}
        {(isWon || isLost) && (
          <ResultScreen
            won={isWon}
            outcomeEmoji={isWon ? '🎉' : '😞'}
            headline={isWon ? 'Correct!' : 'Game Over'}
            statLine={
              isWon
                ? <>You scored <span className="text-primary font-bold">{gameState.score}</span> points!</>
                : <>The answer was {gameState.puzzle.year}</>
            }
            funFact={<>The year was <span className="text-primary font-bold">{gameState.puzzle.year}</span></>}
            emojiGrid={isWon ? `Guessed ${gameState.puzzle.year} for ${gameState.score} points` : `Missed it. The year was ${gameState.puzzle.year}`}
            share={{
              score: isWon ? `${gameState.score} points in ${gameState.guesses.length} ${gameState.guesses.length === 1 ? 'guess' : 'guesses'}` : 'Did not guess',
              gameName: 'Guess The Year',
              gamePath: '/guess-the-year',
            }}
            onPlayAgain={resetGame}
          />
        )}

        {/* How to play modal */}
        <GuessTheYearHowToPlay open={showHelp} onOpenChange={setShowHelp} />

        {/* Other games */}
        <GameNav />
      </GameShell>
    </div>
  );
}
