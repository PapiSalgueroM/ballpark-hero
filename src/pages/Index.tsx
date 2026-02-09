import { useGame } from '@/hooks/useGame';
import { PlayerSearch } from '@/components/game/PlayerSearch';
import { GameBoard } from '@/components/game/GameBoard';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';
import { getClubLogoUrl } from '@/lib/clubData';

const Index = () => {
  const {
    difficulty,
    changeDifficulty,
    guesses,
    gameStatus,
    makeGuess,
    resetGame,
    availablePlayers,
    guessedPlayerNames,
    maxGuesses,
    targetPlayer,
  } = useGame();

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-[0.25em] text-primary font-display mb-1">
            FOOTLE
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Guess the football player in 8 tries
          </p>

          {/* Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => changeDifficulty('easy')}
              className={cn(
                'px-6 py-2 rounded-full text-sm font-semibold transition-all',
                difficulty === 'easy'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              Easy
            </button>
            <button
              onClick={() => changeDifficulty('hard')}
              className={cn(
                'px-6 py-2 rounded-full text-sm font-semibold transition-all',
                difficulty === 'hard'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              Hard
            </button>
          </div>

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
        {gameStatus === 'playing' && (
          <div className="mb-8">
            <PlayerSearch
              players={availablePlayers}
              guessedNames={guessedPlayerNames}
              onSelect={makeGuess}
            />
          </div>
        )}

        {/* Game Board */}
        <GameBoard guesses={guesses} maxGuesses={maxGuesses} />

        {/* Game Over */}
        {gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {/* Player image */}
              {targetPlayer && (
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <img
                      src={`https://img.a]sports.com/tiny-image/player-search/${encodeURIComponent(targetPlayer.name.toLowerCase().replace(/ /g, '-'))}`}
                      alt={targetPlayer.name}
                      className="w-24 h-24 rounded-full object-cover bg-secondary border-2 border-primary/30"
                      onError={(e) => {
                        // Fallback to club logo if player image fails
                        const clubLogo = getClubLogoUrl(targetPlayer.club);
                        if (clubLogo) {
                          e.currentTarget.src = clubLogo;
                          e.currentTarget.className = "w-24 h-24 rounded-full object-contain bg-secondary border-2 border-primary/30 p-3";
                        }
                      }}
                    />
                  </div>
                </div>
              )}
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
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {getClubLogoUrl(targetPlayer?.club || '') && (
                      <img src={getClubLogoUrl(targetPlayer?.club || '')} alt={targetPlayer?.club} className="w-5 h-5 object-contain" />
                    )}
                    <p className="text-muted-foreground text-sm">
                      {targetPlayer?.club} · {targetPlayer?.league}
                    </p>
                  </div>
                </>
              )}
              <button
                onClick={() => resetGame()}
                className="mt-6 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
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
      </div>
    </main>
  );
};

export default Index;
