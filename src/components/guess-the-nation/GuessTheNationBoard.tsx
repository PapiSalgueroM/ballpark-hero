import { useState } from 'react';
import { useGuessTheNation } from '@/hooks/useGuessTheNation';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { NationSearch } from './NationSearch';
import GuessTheNationHowToPlay from './GuessTheNationHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { Button } from '@/components/ui/button';
import { POINTS_BY_CLUE, CLUE_LABELS, MAX_CLUES } from '@/types/guessTheNation';
import { Trophy, Loader2 } from 'lucide-react';
import { FlagImg } from '@/components/FlagImg';

const CONTINENTS = ['Europe', 'Asia', 'North America', 'South America', 'Africa', 'Oceania'];
const continentEmoji: Record<string, string> = {
  Europe: '🇪🇺', Asia: '🌏', 'North America': '🌎',
  'South America': '🌎', Africa: '🌍', Oceania: '🌏',
};

export function GuessTheNationBoard() {
  const {
    countries, loading, gameState, streak, currentBadge,
    pointsForCurrentClue, startGame, makeGuess, giveUp, resetGame,
  } = useGuessTheNation();

  const gameRef = useScrollToGame(gameState);
  const [difficulty, setDifficulty] = useState<'easy' | 'hard'>('easy');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  /* ─── Mode selection ─── */
  if (!gameState) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🌍</div>
            <h1 className="text-4xl font-bold text-amber-400 font-display mb-2">
              Guess The Nation
            </h1>
            <p className="text-muted-foreground">
              How well do you know the world's greatest sporting nations?
            </p>
            <div className="mt-3 flex justify-center">
              <GuessTheNationHowToPlay />
            </div>
            {streak > 0 && currentBadge && (
              <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full text-sm">
                <span>{currentBadge.emoji}</span>
                <span className="text-amber-400 font-semibold">{currentBadge.label}</span>
                <span className="text-muted-foreground">({streak} streak)</span>
              </div>
            )}
          </div>

          {/* Difficulty toggle */}
          <div className="flex justify-center gap-2 mb-6">
            <Button
              size="sm"
              variant={difficulty === 'easy' ? 'default' : 'outline'}
              onClick={() => setDifficulty('easy')}
              className={difficulty === 'easy' ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'border-amber-500/30'}
            >
              Easy
            </Button>
            <Button
              size="sm"
              variant={difficulty === 'hard' ? 'default' : 'outline'}
              onClick={() => setDifficulty('hard')}
              className={difficulty === 'hard' ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'border-amber-500/30'}
            >
              Hard
            </Button>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-14 text-lg font-semibold bg-amber-500 hover:bg-amber-600 text-black"
              onClick={() => startGame('daily', difficulty)}
            >
              🗓️ Daily Challenge
            </Button>
            <Button
              variant="outline"
              className="w-full h-14 text-lg font-semibold border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => startGame('unlimited', difficulty)}
            >
              🔄 Unlimited
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 text-sm border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => startGame('summer', difficulty)}
              >
                ☀️ Summer Focus
              </Button>
              <Button
                variant="outline"
                className="h-11 text-sm border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => startGame('winter', difficulty)}
              >
                ❄️ Winter Focus
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-center text-sm text-muted-foreground mb-3 font-medium uppercase tracking-wide">
                Filter by Continent
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CONTINENTS.map((cont) => (
                  <Button
                    key={cont}
                    variant="outline"
                    className="h-11 text-sm border-amber-500/30 hover:bg-amber-500/10"
                    onClick={() => startGame('continent', difficulty, cont)}
                  >
                    {continentEmoji[cont]} {cont}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <GameNav />
        </div>
      </div>
    );
  }

  /* ─── Game playing / game over ─── */
  const isPlaying = gameState.gameStatus === 'playing';
  const isWon = gameState.gameStatus === 'won';
  const isLost = gameState.gameStatus === 'lost';

  const getClueContent = (index: number): string => {
    const { clues } = gameState.puzzle;
    switch (index) {
      case 0: return `"${clues.vibeWord}"`;
      case 1: return clues.continentHint;
      case 2: return clues.populationHint;
      case 3: return clues.gamesAttendedHint;
      case 4: return clues.totalMedalsHint;
      case 5: return clues.bestSportHint;
      case 6: return clues.famousMomentHint;
      case 7: return clues.winterHistoryHint;
      case 8: return clues.goldMedalHint;
      case 9: return clues.flagColorsHint;
      case 10: return clues.countrySizeHint;
      case 11: return gameState.puzzle.countryName;
      default: return '';
    }
  };

  const modeLabel =
    gameState.mode === 'daily' ? '🗓️ Daily Challenge'
    : gameState.mode === 'summer' ? '☀️ Summer Focus'
    : gameState.mode === 'winter' ? '❄️ Winter Focus'
    : gameState.mode === 'continent'
      ? `${continentEmoji[gameState.continentFilter ?? '']} ${gameState.continentFilter}`
    : '🔄 Unlimited';

  const shareScore = isWon
    ? `I guessed today's Nation in ${gameState.revealedClues} clue${gameState.revealedClues !== 1 ? 's' : ''} on DoUKnowBall!\nScore: ${gameState.score} 🌍`
    : `I couldn't guess today's Nation — it was ${gameState.puzzle.countryName} 🌍`;

  return (
    <div ref={gameRef} className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-400 font-display mb-1">
            🌍 Guess The Nation
          </h1>
          <p className="text-sm text-muted-foreground">{modeLabel}</p>
        </div>

        {/* Points pill */}
        {isPlaying && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-muted-foreground">Worth</span>
              <span className="text-lg font-bold text-amber-400">{pointsForCurrentClue} pts</span>
            </div>
          </div>
        )}

        {/* Clues */}
        <div className="space-y-2 mb-8">
          {Array.from({ length: MAX_CLUES }).map((_, i) => {
            const isRevealed = i < gameState.revealedClues || isWon || isLost;
            const isFinal = i === MAX_CLUES - 1;

            return (
              <div
                key={i}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  isRevealed
                    ? isFinal && (isWon || isLost)
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-card border-border'
                    : 'bg-muted/20 border-border/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isRevealed ? 'bg-amber-500 text-black' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRevealed ? (
                      <>
                        <p className="text-xs text-muted-foreground mb-0.5">{CLUE_LABELS[i]}</p>
                        <p
                          className={`text-foreground leading-snug ${
                            isFinal ? 'text-2xl font-bold text-amber-400' : ''
                          }`}
                        >
                          {isFinal ? (
                            <span className="inline-flex items-center gap-2"><FlagImg name={getClueContent(i)} size={28} />{getClueContent(i)}</span>
                          ) : getClueContent(i)}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">
                        {CLUE_LABELS[i]} — {POINTS_BY_CLUE[i]} pts
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Playing state */}
        {isPlaying && (
          <div className="space-y-4">
            <NationSearch countries={countries} usedGuesses={gameState.guesses} onGuess={makeGuess} />

            <div className="flex justify-center">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>

            {gameState.guesses.length > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Wrong guesses:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {gameState.guesses.map((g, i) => (
                    <span key={i} className="px-3 py-1 bg-destructive/15 text-destructive rounded-full text-sm">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game over */}
        {(isWon || isLost) && (
          <div className="space-y-6 text-center">
            <div
              className={`p-6 rounded-xl border ${
                isWon ? 'bg-amber-500/10 border-amber-500/30' : 'bg-destructive/10 border-destructive/30'
              }`}
            >
              <h2 className={`text-2xl font-bold mb-1 ${isWon ? 'text-amber-400' : 'text-destructive'}`}>
                {isWon ? '🎉 Correct!' : '😞 Game Over'}
              </h2>
              {isWon && (
                <p className="text-muted-foreground mb-1">
                  You scored <span className="text-amber-400 font-bold text-xl">{gameState.score}</span> points!
                </p>
              )}
              <p className="text-sm text-muted-foreground italic mt-3">
                {gameState.puzzle.iconicMoment}
              </p>
              {currentBadge && (
                <div className="mt-3 inline-flex items-center gap-1.5 text-sm">
                  <span>{currentBadge.emoji}</span>
                  <span className="text-amber-400 font-semibold">{currentBadge.label}</span>
                </div>
              )}
            </div>

            <ShareButtons score={shareScore} gameName="Guess The Nation" gamePath="/guess-the-nation" />

            <Button onClick={resetGame} variant="outline" className="w-full max-w-xs mx-auto border-amber-500/30">
              Play Again
            </Button>
          </div>
        )}

        <GameNav />
      </div>
    </div>
  );
}
