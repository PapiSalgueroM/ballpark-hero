import { useEffect, useRef, useState } from 'react';
import { useScrollToGame } from '@/hooks/useScrollToGame';
import { useTennisPlayer } from '@/hooks/useTennisPlayer';
import { TennisPlayerSearch } from './TennisPlayerSearch';
import { TennisPlayerHowToPlay } from './TennisPlayerHowToPlay';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { MAX_CLUES, POINTS_BY_CLUE } from '@/types/tennisPlayer';
import feedbackStyles from './TennisPlayerFeedback.module.css';

const CLUE_LABELS = ['Vibe', 'Nationality & Era', 'Tour', 'Grand Slam Wins', 'Slams Won', 'Famous Moment'];

export function TennisPlayerBoard() {
  const { gameState, startGame, makeGuess, giveUp, revealHint, resetGame, pointsForCurrentClue, allPlayers, loading, status, reloadPlayers } = useTennisPlayer();
  const gameRef = useScrollToGame(gameState);
  const [feedback, setFeedback] = useState<{ kind: 'correct' | 'wrong'; turn: number; status: 'playing' | 'won' | 'lost' } | null>(null);
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
              onClick={() => { startGame('daily'); setHintsUsed(0); }}
              disabled={loading || allPlayers.length === 0}
              className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-white transition-colors disabled:opacity-50"
            >
              🎾 Daily Challenge
            </button>
            <button
              onClick={() => { startGame('unlimited'); setHintsUsed(0); }}
              disabled={loading || allPlayers.length === 0}
              className="w-full py-3 rounded-xl border border-green-800 hover:bg-green-900 font-bold text-green-300 transition-colors disabled:opacity-50"
            >
              🔄 Unlimited Mode
            </button>
          </div>

          {status === 'loading' && (
            <p data-no-prerender className="text-sm text-green-400">Loading players...</p>
          )}
          {status === 'error' && (
            <button onClick={reloadPlayers} className="inline-flex items-center px-3 py-2 text-sm text-red-400 underline">
              Couldn't load players. Tap to retry.
            </button>
          )}
          {status === 'ready' && allPlayers.length === 0 && (
            <p className="text-sm text-green-400">No players available yet. Check back soon.</p>
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
  const nextHintPoints = POINTS_BY_CLUE[revealedClues] ?? 0;
  const shownFeedback = feedback && feedback.turn === guesses.length && feedback.status === gameStatus ? feedback : null;

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
          <TennisPlayerHowToPlay />
          {!isOver && (
            <p className="text-sm text-green-400 mt-1">
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
                data-tennis-player-clue={i + 1}
                className={`rounded-xl border px-4 py-3 transition-all duration-300 ${
                  isRevealed
                    ? 'border-purple-500/30 bg-green-900'
                    : 'border-green-800 bg-green-900/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isRevealed ? 'text-purple-400' : 'text-green-400'}`}>
                    {CLUE_LABELS[i]}
                  </span>
                  {!isRevealed && <span className="text-xs text-green-400">🔒</span>}
                </div>
                {isRevealed ? (
                  <p className={`text-sm ${i === 0 ? 'text-lg font-bold text-purple-400 italic' : 'text-green-300'}`}>
                    {clue}
                  </p>
                ) : (
                  <p className="text-sm text-green-400">Guess correctly or wait for this clue...</p>
                )}
              </div>
            );
          })}
        </div>

        <div role="status" className={feedbackStyles.status}>
          {shownFeedback && <p key={`${shownFeedback.kind}-${shownFeedback.turn}`} data-tennis-player-feedback={shownFeedback.kind} className={`${feedbackStyles.reply} text-center text-sm font-semibold ${shownFeedback.kind === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
            {shownFeedback.kind === 'correct' ? 'Correct guess. Player found.' : isOver ? 'Wrong guess. The answer is below.' : 'Wrong guess! Try again...'}
          </p>}
        </div>

        {!isOver && (
          <>
            <TennisPlayerSearch onGuess={makeGuess} guesses={guesses} players={allPlayers} />

            <div className="flex items-center justify-center gap-4">
              {canHint && (
                <button
                  onClick={handleHint}
                  className={`${feedbackStyles.action} text-sm text-yellow-500/70 hover:text-yellow-400 transition-colors`}
                >
                  💡 Hint ({nextHintPoints} pts next)
                </button>
              )}
              {hasGuessed && !showGiveUpConfirm && (
                <button
                  onClick={() => setShowGiveUpConfirm(true)}
                  className={`${feedbackStyles.action} text-sm text-green-400 hover:text-red-400 transition-colors`}
                >
                  🏳️ Give Up
                </button>
              )}
            </div>
            {hintsUsed > 0 && (
              <p className="text-center text-xs text-yellow-600">{hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used</p>
            )}

            {showGiveUpConfirm && (
              <div className="text-center space-y-2 p-3 rounded-xl border border-red-500/20 bg-green-900">
                <p className="text-sm text-green-400">Are you sure? You'll reveal the answer and score 0 points.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleGiveUp} className={`${feedbackStyles.action} px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors`}>
                    Yes, Give Up
                  </button>
                  <button onClick={() => setShowGiveUpConfirm(false)} className={`${feedbackStyles.action} px-4 py-1.5 rounded-lg border border-green-800 text-green-400 text-sm hover:bg-green-900 transition-colors`}>
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
              <span key={i} className={`${feedbackStyles.guessName} px-3 py-1 rounded-full bg-green-900 text-green-600 text-xs line-through`}>
                {g}
              </span>
            ))}
          </div>
        )}

        {isOver && (
          <div data-tennis-player-result={shownFeedback ? gameStatus : undefined} className={`text-center space-y-4 rounded-2xl border border-purple-500/20 bg-green-900 p-6 ${shownFeedback ? gameStatus === 'won' ? feedbackStyles.won : feedbackStyles.lost : ''}`}>
            {gameStatus === 'won' ? (
              <>
                <p className="text-3xl">🏆</p>
                <p className="text-xl font-bold text-purple-400">{puzzle.player_name}</p>
                <p className="text-green-400">
                  Guessed in {revealedClues} clue{revealedClues > 1 ? 's' : ''}: <span className="text-purple-400 font-bold">{score} pts</span>
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
      </div>
    </div>
  );
}
