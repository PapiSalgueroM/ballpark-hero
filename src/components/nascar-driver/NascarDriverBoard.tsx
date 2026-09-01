import { useState } from 'react';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { useNascarDriver } from '@/hooks/useNascarDriver';
import { NascarDriverSearch } from './NascarDriverSearch';
import { NascarDriverHowToPlay } from './NascarDriverHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { MAX_CLUES } from '@/types/nascarDriver';

/* ROUND 374: the hardcoded CLUE_LABELS list that sat here is gone. It named
   the six clue columns the hook used to read off `nascar_drivers`, none of
   which exist on that table, so every label sat above a blank card. Two of them
   were also wrong for the data that does exist: nothing in the database records
   a car number, and no row in nascar_race_results may be called a "Cup Series
   win" because that table mixes in exhibition races and is missing whole
   seasons. Labels are generated beside the clue they label now. */

export function NascarDriverBoard() {
  const { gameState, startGame, makeGuess, giveUp, revealHint, resetGame, pointsForCurrentClue, allDrivers, loading, status } = useNascarDriver();
  const gameRef = useScrollToGame(gameState);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);

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

  const handleHint = () => {
    revealHint();
    setHintsUsed(h => h + 1);
  };

  const handleGiveUp = () => {
    giveUp();
    setShowGiveUpConfirm(false);
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
            <p className="text-neutral-400">How well do you know NASCAR?</p>
          </div>

          <NascarDriverHowToPlay />

          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={() => { startGame('daily'); setHintsUsed(0); }}
              disabled={loading || allDrivers.length === 0}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white transition-colors disabled:opacity-50"
            >
              🏁 Daily Challenge
            </button>
            <button
              onClick={() => { startGame('unlimited'); setHintsUsed(0); }}
              disabled={loading || allDrivers.length === 0}
              className="w-full py-3 rounded-xl border border-neutral-700 hover:bg-neutral-900 font-bold text-neutral-300 transition-colors disabled:opacity-50"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          {/* ROUND 374: the loading and retry branches went with the fetch.
              The driver pool is bundled now, so there is nothing in flight to
              wait for and nothing to retry, and a crawler receives the board
              rather than "Loading drivers...". */}
          {status === 'ready' && allDrivers.length === 0 && (
            <p className="text-sm text-neutral-400">No drivers available yet. Check back soon.</p>
          )}

          <GameNav />
        </div>
      </div>
    );
  }

  const { puzzle, revealedClues, guesses, gameStatus, score } = gameState;
  const isOver = gameStatus !== 'playing';
  const hasGuessed = guesses.length > 0;
  const canHint = revealedClues < MAX_CLUES;

  const shareScore = gameStatus === 'won'
    ? `I guessed today's NASCAR Driver in ${revealedClues} clue${revealedClues > 1 ? 's' : ''}!\nScore: ${score} 🏁`
    : `I couldn't guess today's NASCAR Driver 😤 🏁`;

  return (
    <div ref={gameRef} className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">
            <span className="text-neutral-300">Guess The</span>{' '}
            <span className="text-red-500">NASCAR Driver</span>
          </h1>
          {!isOver && (
            <p className="text-sm text-neutral-400 mt-1">
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
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-red-400' : 'text-neutral-400'}`}>
                    {puzzle.clue_labels[i]}
                  </span>
                  {!isRevealed && <span className="text-xs text-neutral-400">🔒</span>}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-red-400 italic' : 'text-neutral-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-400">Guess correctly or wait for this clue...</p>
                )}
              </div>
            );
          })}
        </div>

        {wrongFlash && (
          <p className="text-center text-red-400 text-sm font-semibold animate-pulse">Wrong guess! Try again...</p>
        )}

        {!isOver && (
          <>
            <NascarDriverSearch onGuess={handleGuess} guesses={guesses} drivers={allDrivers} />

            <div className="flex items-center justify-center gap-4">
              {canHint && (
                <button
                  onClick={handleHint}
                  className="text-sm text-yellow-500/70 hover:text-yellow-400 transition-colors"
                >
                  💡 Hint (-100 pts)
                </button>
              )}
              {hasGuessed && !showGiveUpConfirm && (
                <button
                  onClick={() => setShowGiveUpConfirm(true)}
                  className="text-sm text-neutral-400 hover:text-red-400 transition-colors"
                >
                  🏳️ Give Up
                </button>
              )}
            </div>
            {hintsUsed > 0 && (
              <p className="text-center text-xs text-yellow-600">{hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used (-{hintsUsed * 100} pts)</p>
            )}

            {showGiveUpConfirm && (
              <div className="text-center space-y-2 p-3 rounded-xl border border-red-500/20 bg-neutral-900">
                <p className="text-sm text-neutral-400">Are you sure? You'll reveal the answer and score 0 points.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleGiveUp} className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                    Yes, Give Up
                  </button>
                  <button onClick={() => setShowGiveUpConfirm(false)} className="px-4 py-1.5 rounded-lg border border-neutral-700 text-neutral-400 text-sm hover:bg-neutral-800 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {guesses.length > 0 && !isOver && (
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-neutral-900 text-neutral-400 text-xs line-through">
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
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''}: <span className="text-red-400 font-bold">{score} pts</span>
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
      </div>
    </div>
  );
}
