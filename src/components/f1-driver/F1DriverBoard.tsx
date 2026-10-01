import { useEffect, useRef, useState } from 'react';
import { useF1Driver } from '@/hooks/useF1Driver';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { F1DriverSearch } from './F1DriverSearch';
import { F1DriverHowToPlay } from './F1DriverHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { MAX_CLUES, POINTS_BY_CLUE, type F1DriverState } from '@/types/f1Driver';
import feedbackStyles from './F1DriverFeedback.module.css';

export function F1DriverBoard() {
  const { gameState, startGame, makeGuess, giveUp, revealHint, resetGame, pointsForCurrentClue } = useF1Driver();
  const gameRef = useScrollToGame(gameState);
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; turn: number; status: F1DriverState['gameStatus'] } | null>(null);
  const previous = useRef(gameState);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);

  useEffect(() => {
    const prior = previous.current;
    previous.current = gameState;
    if (!gameState || !prior || prior.puzzle.id !== gameState.puzzle.id || prior.mode !== gameState.mode || gameState.guesses.length < prior.guesses.length) {
      setFeedback(null);
    } else if (prior.gameStatus === 'playing' && gameState.guesses.length === prior.guesses.length + 1 && prior.guesses.every((guess, index) => gameState.guesses[index] === guess)) {
      setFeedback({ kind: gameState.gameStatus === 'won' ? 'correct' : 'wrong', turn: gameState.guesses.length, status: gameState.gameStatus });
    } else if (gameState.gameStatus !== prior.gameStatus) {
      setFeedback(null);
    }
  }, [gameState]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 600);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleHint = () => {
    revealHint();
    setHintsUsed(h => h + 1);
  };

  const handleGiveUp = () => {
    giveUp();
    setShowGiveUpConfirm(false);
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
              onClick={() => { startGame('daily'); setHintsUsed(0); }}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-white transition-colors"
            >
              🏁 Daily Challenge
            </button>
            <button
              onClick={() => { startGame('unlimited'); setHintsUsed(0); }}
              className="w-full py-3 rounded-xl border border-zinc-700 hover:bg-zinc-800 font-bold text-zinc-300 transition-colors"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          <GameNav />
        </div>
      </div>
    );
  }

  const { puzzle, revealedClues, guesses, gameStatus, score } = gameState;
  const isOver = gameStatus !== 'playing';
  const hasGuessed = guesses.length > 0;
  const canHint = revealedClues < MAX_CLUES;
  const nextHintPoints = POINTS_BY_CLUE[revealedClues] ?? 0;
  const shownFeedback = feedback && feedback.turn === guesses.length && feedback.status === gameStatus ? feedback : null;

  const shareScore = gameStatus === 'won'
    ? `I guessed today's F1 Driver in ${revealedClues} clue${revealedClues > 1 ? 's' : ''}!\nScore: ${score} 🏎️`
    : `I couldn't guess today's F1 Driver 😤 🏎️`;

  return (
    <div ref={gameRef} className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-red-500">Guess The F1 Driver</h1>
          {!isOver && (
            <p className="text-sm text-zinc-400 mt-1">
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
                data-f1-driver-clue={i}
                className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                  isRevealed
                    ? 'border-red-500/30 bg-zinc-900'
                    : 'border-zinc-800 bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-red-400' : 'text-zinc-400'}`}>
                    Clue {i + 1}
                  </span>
                  {!isRevealed && (
                    <span className="text-xs text-zinc-400">🔒</span>
                  )}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-red-400 italic' : 'text-zinc-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-400">Guess correctly or wait for this clue...</p>
                )}
              </div>
            );
          })}
        </div>

        <div role="status" className={feedbackStyles.status}>
          {shownFeedback && (
            <p key={`${shownFeedback.kind}-${shownFeedback.turn}`} data-f1-driver-feedback={shownFeedback.kind} className={`${feedbackStyles.reply} text-center text-sm font-semibold ${shownFeedback.kind === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
              {shownFeedback.kind === 'correct' ? 'Correct guess. Driver found.' : isOver ? 'Wrong guess. The answer is below.' : 'Wrong guess! Try again...'}
            </p>
          )}
        </div>

        {/* Guess input */}
        {!isOver && (
          <>
            <F1DriverSearch onGuess={makeGuess} guesses={guesses} currentPuzzle={gameState?.puzzle} />

            {/* Hint + Give Up row */}
            <div className="flex items-center justify-center gap-4">
              {canHint && (
                <button
                  onClick={handleHint}
                  className="text-sm text-yellow-500/70 hover:text-yellow-400 transition-colors"
                >
                  💡 Hint ({nextHintPoints} pts next)
                </button>
              )}
              {hasGuessed && !showGiveUpConfirm && (
                <button
                  onClick={() => setShowGiveUpConfirm(true)}
                  className="text-sm text-zinc-400 hover:text-red-400 transition-colors"
                >
                  🏳️ Give Up
                </button>
              )}
            </div>
            {hintsUsed > 0 && (
              <p className="text-center text-xs text-yellow-600">{hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used</p>
            )}

            {/* Give Up confirmation */}
            {showGiveUpConfirm && (
              <div className="text-center space-y-2 p-3 rounded-xl border border-red-500/20 bg-zinc-900">
                <p className="text-sm text-zinc-400">Are you sure? You'll reveal the answer and score 0 points.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleGiveUp} className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors">
                    Yes, Give Up
                  </button>
                  <button onClick={() => setShowGiveUpConfirm(false)} className="px-4 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Previous guesses */}
        {guesses.length > 0 && !isOver && (
          <div className="flex flex-wrap gap-2 justify-center">
            {guesses.map((g, i) => (
              <span key={i} className={`${feedbackStyles.guessName} px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs line-through`}>
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Game over */}
        {isOver && (
          <div data-f1-driver-result={shownFeedback ? gameStatus : undefined} className={`text-center space-y-4 rounded-2xl border border-red-500/20 bg-zinc-900 p-6 ${shownFeedback ? gameStatus === 'won' ? feedbackStyles.won : feedbackStyles.lost : ''}`}>
            {gameStatus === 'won' ? (
              <>
                <p className="text-3xl">🏆</p>
                <p className="text-xl font-bold text-red-400">
                  {puzzle.driverName}
                </p>
                <p className="text-zinc-400">
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''}: <span className="text-red-400 font-bold">{score} pts</span>
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
      </div>
    </div>
  );
}
