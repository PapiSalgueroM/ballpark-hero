import { useState } from 'react';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { useTennisPlayer } from '@/hooks/useTennisPlayer';
import { TennisPlayerSearch } from './TennisPlayerSearch';
import { TennisPlayerHowToPlay } from './TennisPlayerHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { MAX_CLUES } from '@/types/tennisPlayer';

const CLUE_LABELS = ['Vibe', 'Nationality & Era', 'Tour', 'Grand Slam Wins', 'Slams Won', 'Famous Moment'];

export function TennisPlayerBoard() {
  const { gameState, startGame, makeGuess, giveUp, resetGame, pointsForCurrentClue, allPlayers, loading } = useTennisPlayer();
  const gameRef = useScrollToGame(gameState);
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
      <div className="min-h-screen bg-green-950 text-white">
        <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className="text-green-400">Guess The</span>{' '}
              <span className="text-purple-400">Tennis Player</span>
            </h1>
            <p className="text-green-600">How well do you know tennis?</p>
          </div>

          <TennisPlayerHowToPlay />

          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={() => startGame('daily')}
              disabled={loading || allPlayers.length === 0}
              className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-white transition-colors disabled:opacity-50"
            >
              🎾 Daily Challenge
            </button>
            <button
              onClick={() => startGame('unlimited')}
              disabled={loading || allPlayers.length === 0}
              className="w-full py-3 rounded-xl border border-green-800 hover:bg-green-900 font-bold text-green-300 transition-colors disabled:opacity-50"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          {allPlayers.length === 0 && (
            <p className="text-sm text-green-700">Loading players...</p>
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
    ? `I guessed today's Tennis Player in ${revealedClues} clue${revealedClues > 1 ? 's' : ''}!\nScore: ${score} 🎾`
    : `I couldn't guess today's Tennis Player 😤 🎾`;

  return (
    <div ref={gameRef} className="min-h-screen bg-green-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">
            <span className="text-green-400">Guess The</span>{' '}
            <span className="text-purple-400">Tennis Player</span>
          </h1>
          {!isOver && (
            <p className="text-sm text-green-700 mt-1">
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
                    ? 'border-purple-500/30 bg-green-900'
                    : 'border-green-800 bg-green-900/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-purple-400' : 'text-green-800'}`}>
                    {CLUE_LABELS[i]}
                  </span>
                  {!isRevealed && <span className="text-xs text-green-800">🔒</span>}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-purple-400 italic' : 'text-green-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-green-800">Guess correctly or wait for this clue...</p>
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
            <TennisPlayerSearch onGuess={handleGuess} guesses={guesses} players={allPlayers} />
            <div className="flex justify-center">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-green-800 text-green-700 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>
          </>
        )}

        {guesses.length > 0 && !isOver && (
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-green-900 text-green-600 text-xs line-through">
                {g}
              </span>
            ))}
          </div>
        )}

        {isOver && (
          <div className="text-center space-y-4 rounded-2xl border border-purple-500/20 bg-green-900 p-6">
            {gameStatus === 'won' ? (
              <>
                <p className="text-3xl">🏆</p>
                <p className="text-xl font-bold text-purple-400">{puzzle.player_name}</p>
                <p className="text-green-400">
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''} — <span className="text-purple-400 font-bold">{score} pts</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">😤</p>
                <p className="text-xl font-bold text-purple-400">It was {puzzle.player_name}</p>
                <p className="text-green-400">Better luck next time!</p>
              </>
            )}

            <ShareButtons score={shareScore} gameName="Guess The Tennis Player" gamePath="/guess-tennis-player" />

            {gameState.mode === 'unlimited' && (
              <button
                onClick={resetGame}
                className="mt-2 px-6 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-white transition-colors"
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
