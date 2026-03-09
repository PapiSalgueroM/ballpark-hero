import { useState } from 'react';
import { useF1Driver } from '@/hooks/useF1Driver';
import { F1DriverSearch } from './F1DriverSearch';
import { F1DriverHowToPlay } from './F1DriverHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { MAX_CLUES } from '@/types/f1Driver';

const CLUE_LABELS = ['Vibe', 'Era & Nationality', 'Teams', 'Race Wins', 'Championships', 'Famous Moment'];

export function F1DriverBoard() {
  const { gameState, startGame, makeGuess, resetGame, pointsForCurrentClue } = useF1Driver();
  const [wrongFlash, setWrongFlash] = useState(false);

  const handleGuess = (name: string) => {
    const prevClues = gameState?.revealedClues ?? 0;
    makeGuess(name);
    // flash if wrong
    setTimeout(() => {
      if (gameState?.revealedClues !== prevClues || gameState?.gameStatus === 'playing') {
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 500);
      }
    }, 50);
  };

  // ── Mode selection screen ──
  if (!gameState) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-red-500 mb-2">
              Guess The F1 Driver
            </h1>
            <p className="text-zinc-400">How well do you know the legends of motorsport?</p>
          </div>

          <F1DriverHowToPlay />

          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={() => startGame('daily')}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white transition-colors"
            >
              🏁 Daily Challenge
            </button>
            <button
              onClick={() => startGame('unlimited')}
              className="w-full py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 font-bold text-zinc-300 transition-colors"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          <GameNav />
          <Footer />
        </div>
      </div>
    );
  }

  const { puzzle, revealedClues, guesses, gameStatus, score } = gameState;
  const isOver = gameStatus !== 'playing';

  const shareScore = gameStatus === 'won'
    ? `I guessed today's F1 Driver in ${revealedClues} clue${revealedClues > 1 ? 's' : ''}!\nScore: ${score} 🏎️`
    : `I couldn't guess today's F1 Driver 😤 🏎️`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-red-500">Guess The F1 Driver</h1>
          {!isOver && (
            <p className="text-sm text-zinc-500 mt-1">
              Clue {revealedClues}/{MAX_CLUES} · {pointsForCurrentClue} pts available
            </p>
          )}
        </div>

        {/* Clue cards */}
        <div className="space-y-3">
          {puzzle.clues.map((clue, i) => {
            const isRevealed = i < revealedClues || isOver;
            return (
              <div
                key={i}
                className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                  isRevealed
                    ? 'border-red-500/30 bg-zinc-900'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-red-400' : 'text-zinc-600'}`}>
                    {CLUE_LABELS[i]}
                  </span>
                  {!isRevealed && (
                    <span className="text-xs text-zinc-600">🔒</span>
                  )}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-red-400 italic' : 'text-zinc-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-700">Guess correctly or wait for this clue...</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Wrong guess flash */}
        {wrongFlash && (
          <p className="text-center text-red-400 text-sm font-semibold animate-pulse">Wrong guess! Try again...</p>
        )}

        {/* Guess input */}
        {!isOver && (
          <F1DriverSearch onGuess={handleGuess} guesses={guesses} />
        )}

        {/* Previous guesses */}
        {guesses.length > 0 && !isOver && (
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs line-through">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Game over */}
        {isOver && (
          <div className="text-center space-y-4 rounded-2xl border border-red-500/20 bg-zinc-900 p-6">
            {gameStatus === 'won' ? (
              <>
                <p className="text-3xl">🏆</p>
                <p className="text-xl font-bold text-red-400">
                  {puzzle.driverName}
                </p>
                <p className="text-zinc-400">
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''} — <span className="text-red-400 font-bold">{score} pts</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">😤</p>
                <p className="text-xl font-bold text-red-400">
                  It was {puzzle.driverName}
                </p>
                <p className="text-zinc-400">Better luck next time!</p>
              </>
            )}

            <ShareButtons score={shareScore} gameName="Guess The F1 Driver" gamePath="/f1-driver" />

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
