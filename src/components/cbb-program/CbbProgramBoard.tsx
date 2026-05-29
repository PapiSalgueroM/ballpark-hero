import { useState } from 'react';
import { useCbbProgram } from '@/hooks/useCbbProgram';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { CbbProgramSearch } from './CbbProgramSearch';
import { CbbProgramHowToPlay } from './CbbProgramHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { MAX_CLUES } from '@/types/cbbProgram';

const CLUE_LABELS = ['Vibe', 'Region & State', 'Conference', 'Tournament History', 'Championships', 'Mascot'];

export function CbbProgramBoard() {
  const { gameState, startGame, makeGuess, giveUp, resetGame, pointsForCurrentClue, allPrograms, loading, programsStatus, reloadPrograms } = useCbbProgram();
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
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-xl mx-auto px-4 py-12 text-center space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-2">
              <span className="text-blue-400">Guess The</span>{' '}
              <span className="text-amber-400">CBB Program</span>
            </h1>
            <p className="text-slate-400">How well do you know college basketball?</p>
          </div>

          <CbbProgramHowToPlay />

          <div className="space-y-3 max-w-xs mx-auto">
            <button
              onClick={() => startGame('daily')}
              disabled={loading || allPrograms.length === 0}
              className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 font-bold text-white transition-colors disabled:opacity-50"
            >
              🏀 Daily Challenge
            </button>
            <button
              onClick={() => startGame('unlimited')}
              disabled={loading || allPrograms.length === 0}
              className="w-full py-3 rounded-xl border border-slate-700 hover:bg-slate-800 font-bold text-slate-300 transition-colors disabled:opacity-50"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          {programsStatus === 'loading' && (
            <p className="text-sm text-slate-500">Loading programs...</p>
          )}
          {programsStatus === 'error' && (
            <div className="space-y-2">
              <p className="text-sm text-red-400">Couldn't load programs. Please try again.</p>
              <button
                onClick={reloadPrograms}
                className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {programsStatus === 'ready' && allPrograms.length === 0 && (
            <p className="text-sm text-slate-500">No programs available yet — check back soon.</p>
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
    ? `I guessed today's College Basketball Program in ${revealedClues} clue${revealedClues > 1 ? 's' : ''}!\nScore: ${score} 🏀`
    : `I couldn't guess today's CBB Program 😤 🏀`;

  return (
    <div ref={gameRef} className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold">
            <span className="text-blue-400">Guess The</span>{' '}
            <span className="text-amber-400">CBB Program</span>
          </h1>
          {!isOver && (
            <p className="text-sm text-slate-500 mt-1">
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
                    ? 'border-amber-500/30 bg-slate-900'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-amber-400' : 'text-slate-600'}`}>
                    {CLUE_LABELS[i]}
                  </span>
                  {!isRevealed && <span className="text-xs text-slate-600">🔒</span>}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-amber-400 italic' : 'text-slate-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-slate-700">Guess correctly or wait for this clue...</p>
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
            <CbbProgramSearch onGuess={handleGuess} guesses={guesses} programs={allPrograms} />
            <div className="flex justify-center">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-500 hover:text-amber-400 hover:border-amber-500/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>
          </>
        )}

        {guesses.length > 0 && !isOver && (
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs line-through">
                {g}
              </span>
            ))}
          </div>
        )}

        {isOver && (
          <div className="text-center space-y-4 rounded-2xl border border-amber-500/20 bg-slate-900 p-6">
            {gameStatus === 'won' ? (
              <>
                <p className="text-3xl">🏆</p>
                <p className="text-xl font-bold text-amber-400">{puzzle.school_name}</p>
                <p className="text-slate-400">
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''} — <span className="text-amber-400 font-bold">{score} pts</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">😤</p>
                <p className="text-xl font-bold text-amber-400">It was {puzzle.school_name}</p>
                <p className="text-slate-400">Better luck next time!</p>
              </>
            )}

            <ShareButtons score={shareScore} gameName="Guess The CBB Program" gamePath="/guess-cbb-team" />

            {gameState.mode === 'unlimited' && (
              <button
                onClick={resetGame}
                className="mt-2 px-6 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 font-bold text-white transition-colors"
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
