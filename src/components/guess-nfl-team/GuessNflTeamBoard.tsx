import { useState } from 'react';
import { useGuessNflTeam } from '@/hooks/useGuessNflTeam';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { Button } from '@/components/ui/button';
import { GuessNflTeamHowToPlay } from './GuessNflTeamHowToPlay';
import { NflTeamModeSelector } from './NflTeamModeSelector';
import { NflTeamSearch } from './NflTeamSearch';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { HelpCircle } from 'lucide-react';
import { POINTS_BY_CLUE, CLUE_LABELS } from '@/types/guessNflTeam';

export function GuessNflTeamBoard() {
  const {
    gameState,
    startGame,
    makeGuess,
    giveUp,
    revealNextClue,
    resetGame,
    getClueText,
    getAvailableTeams,
    maxClues,
    pointsForCurrentClue,
  } = useGuessNflTeam();

  const gameRef = useScrollToGame(gameState);
  const [showHelp, setShowHelp] = useState(false);

  const isPlaying = gameState?.gameStatus === 'playing';
  const isWon = gameState?.gameStatus === 'won';
  const isLost = gameState?.gameStatus === 'lost';

  // Mode selection screen
  if (!gameState) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-primary mb-2 font-display">
              🏈 Guess The Pro Football Team
            </h1>
            <p className="text-muted-foreground mb-4">
              Progressive clues reveal the mystery NFL team!
            </p>
            <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
              <HelpCircle className="w-4 h-4 mr-1" />
              How to Play
            </Button>
          </div>

          <NflTeamModeSelector onStart={startGame} />

          <GuessNflTeamHowToPlay open={showHelp} onOpenChange={setShowHelp} />
          <GameNav />
        </div>
      </div>
    );
  }

  const getModeLabel = () => {
    switch (gameState.mode) {
      case 'daily': return '🗓️ Daily Challenge';
      case 'unlimited': return '🔄 Unlimited';
      case 'conference':
        if (gameState.divisionFilter) {
          return `🏆 ${gameState.conferenceFilter} ${gameState.divisionFilter}`;
        }
        return `🏆 ${gameState.conferenceFilter}`;
      default: return '';
    }
  };

  return (
    <div ref={gameRef} className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2 font-display">
            🏈 Guess The Pro Football Team
          </h1>
          <p className="text-sm text-muted-foreground">{getModeLabel()}</p>
          <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} className="mt-1">
            <HelpCircle className="w-4 h-4 mr-1" />
            How to Play
          </Button>
        </div>

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
        <div className="space-y-2 mb-8">
          {Array.from({ length: maxClues }).map((_, index) => {
            const isRevealed = index < gameState.revealedClues;
            const clueNumber = index + 1;

            return (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-all ${
                  isRevealed
                    ? 'bg-card border-border'
                    : 'bg-muted/30 border-border/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isRevealed
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {clueNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRevealed ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">{CLUE_LABELS[index]}</p>
                        <p className="text-foreground">{getClueText(index)}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">
                        {CLUE_LABELS[index]} — {POINTS_BY_CLUE[index]} pts
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
            <NflTeamSearch
              teams={getAvailableTeams()}
              usedTeams={gameState.guesses}
              onSelect={makeGuess}
            />

            {/* Previous guesses */}
            {gameState.guesses.length > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Wrong guesses:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameState.guesses.map((guess, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-destructive/20 text-destructive rounded-full text-sm"
                    >
                      {guess}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skip clue / Give Up buttons */}
            <div className="flex items-center justify-center gap-3">
              {gameState.revealedClues < maxClues && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={revealNextClue}
                  className="text-muted-foreground"
                >
                  Skip to next clue
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
          <div className="text-center space-y-6">
            <div className={`p-6 rounded-xl border ${isWon ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
              <h2 className={`text-2xl font-bold mb-2 ${isWon ? 'text-green-500' : 'text-destructive'}`}>
                {isWon ? '🎉 Correct!' : '😞 Game Over'}
              </h2>
              <p className="text-3xl font-bold font-display text-primary mb-2">
                {gameState.puzzle.fullName}
              </p>
              {isWon && (
                <p className="text-lg text-muted-foreground">
                  You scored <span className="text-primary font-bold">{gameState.score}</span> points!
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-4 italic">
                {gameState.puzzle.funFact}
              </p>
            </div>

            <div className="space-y-4">
              <ShareButtons
                score={isWon ? `${gameState.score} points in ${gameState.guesses.length} guess${gameState.guesses.length !== 1 ? 'es' : ''}` : 'Did not guess'}
                gameName="Guess The Pro Football Team"
                gamePath="/guess-nfl-team"
              />

              <Button onClick={resetGame} variant="outline" className="w-full max-w-xs">
                Play Again
              </Button>
            </div>
          </div>
        )}

        <GuessNflTeamHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <GameNav />
      </div>
    </div>
  );
}
