import { useState } from 'react';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { useNascarDriver } from '@/hooks/useNascarDriver';
import { NascarDriverSearch } from './NascarDriverSearch';
import { NascarDriverHowToPlay } from './NascarDriverHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { MAX_CLUES } from '@/types/nascarDriver';

const CLUE_LABELS = ['Vibe', 'Era', 'Car Number', 'Cup Series Wins', 'Championships', 'Famous Moment'];

export function NascarDriverBoard() {
  const { gameState, startGame, makeGuess, resetGame, pointsForCurrentClue, allDrivers, loading } = useNascarDriver();
  const [wrongFlash, setWrongFlash] = useState(false);

  const handleGuess = (name: string) => {
    const prevClues = gameState?.revealedClues ?? 0;
    makeGuess(name);
    setTimeout(() => {
      if (gameState?.revealedClues !== prevClues || gameState?.gameStatus === 'playing') {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 500);
      }
    }, 50);
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className="text-neutral-300">Guess The</span>{' '}
              <span className="text-red-500">NASCAR Driver</span>
            </h1>
            <p className="text-neutral-600">How well do you know NASCAR?</p>
          </div>

          <NascarDriverHowToPlay />

          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={() => startGame('daily')}
              disabled={loading || allDrivers.length === 0}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white transition-colors disabled:opacity-50"
            >
              🏁 Daily Challenge
            </button>
            <button
              onClick={() => startGame('unlimited')}
              disabled={loading || allDrivers.length === 0}
              className="w-full py-3 rounded-xl border border-neutral-700 hover:bg-neutral-900 font-bold text-neutral-300 transition-colors disabled:opacity-50"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          {allDrivers.length === 0 && (
            <p className="text-sm text-neutral-700">Loading drivers...</p>
          )}

          <GameNav />
          <Footer />
        </div>
      </div>
    );
  }

  const { puzzle, revealedClues, guesses, gameStatus, score } = gameState;
  const isOver = gameStatus !== 'playing';

  const shareScore = gameStatus === 'won'
    ? `I guessed today's NASCAR Driver in ${revealedClues} clue${revealedClues > 1 ? 's' : ''}!\nScore: ${score} 🏁`
    : `I couldn't guess today's NASCAR Driver 😤 🏁`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">
            <span className="text-neutral-300">Guess The</span>{' '}
            <span className="text-red-500">NASCAR Driver</span>
          </h1>
          {!isOver && (
            <p className="text-sm text-neutral-600 mt-1">
              Clue {revealedClues}/{MAX_CLUES} · {pointsForCurrentClue} pts available
            </p>
          )}
        </div>

        <div className="space-y-3">
          {puzzle.clues.map((clue, i) => {
            const isRevealed = i < revealedClues || isOver;
            return (
              <div
                key={i}
                className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                  isRevealed
                    ? 'border-red-500/30 bg-neutral-900'
                    : 'border-neutral-800 bg-neutral-900/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-red-400' : 'text-neutral-700'}`}>
                    {CLUE_LABELS[i]}
                  </span>
                  {!isRevealed && <span className="text-xs text-neutral-700">🔒</span>}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-red-400 italic' : 'text-neutral-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-700">Guess correctly or wait for this clue...</p>
                )}
              </div>
            );
          })}
        </div>

        {wrongFlash && (
          <p className="text-center text-red-400 text-sm font-semibold animate-pulse">Wrong guess! Try again...</p>
        )}

        {!isOver && (
          <NascarDriverSearch onGuess={handleGuess} guesses={guesses} drivers={allDrivers} />
        )}

        {guesses.length > 0 && !isOver && (
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-neutral-900 text-neutral-600 text-xs line-through">
                {g}
              </span>
            ))}
          </div>
        )}

        {isOver && (
          <div className="text-center space-y-4 rounded-2xl border border-red-500/20 bg-neutral-900 p-6">
            {gameStatus === 'won' ? (
              <>
                <p className="text-3xl">🏆</p>
                <p className="text-xl font-bold text-red-400">{puzzle.driver_name}</p>
                <p className="text-neutral-400">
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''} — <span className="text-red-400 font-bold">{score} pts</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">😤</p>
                <p className="text-xl font-bold text-red-400">It was {puzzle.driver_name}</p>
                <p className="text-neutral-400">Better luck next time!</p>
              </>
            )}

            <ShareButtons score={shareScore} gameName="Guess The NASCAR Driver" gamePath="/guess-nascar-driver" />

            {gameState.mode === 'unlimited' && (
              <button
                onClick={resetGame}
                className="mt-2 px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white transition-colors"
              >
                Play Again
              </button>
            )}
          </div>
        )}

        <GameNav />
        <Footer />
      </div>
    </div>
  );
}
