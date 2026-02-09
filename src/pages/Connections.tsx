import { useState, useEffect } from 'react';
import { useConnections } from '@/hooks/useConnections';
import { ConnectionsBoard } from '@/components/connections/ConnectionsBoard';
import { ConnectionsHowToPlay } from '@/components/connections/ConnectionsHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { HelpCircle, RotateCcw, Lightbulb, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectionDifficulty } from '@/types/connections';

const difficultyColors: Record<ConnectionDifficulty, string> = {
  easy: 'bg-correct',
  medium: 'bg-close',
  hard: 'bg-blue-500',
  tricky: 'bg-purple-500',
};

const Connections = () => {
  const {
    puzzle,
    selected,
    solvedGroups,
    lives,
    gameStatus,
    remainingPlayers,
    hintUsed,
    hintCategory,
    lastIncorrect,
    togglePlayer,
    submitGuess,
    useHint,
    resetGame,
  } = useConnections();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('connections-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('connections-rules-seen', '1');
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] text-primary font-display mb-1">
            CONNECTIONS
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Find 4 groups of 4 players that share something in common
          </p>

          {/* Lives */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            <span className="text-sm text-muted-foreground mr-1">Lives:</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-3 h-3 rounded-full transition-all',
                  i < lives ? 'bg-primary' : 'bg-secondary'
                )}
              />
            ))}
          </div>
        </header>

        {/* Hint */}
        {hintCategory && (
          <div className="max-w-xl mx-auto mb-4 bg-accent/50 border border-accent rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-accent-foreground">
              <Lightbulb className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Hint: <strong>{hintCategory}</strong>
            </p>
          </div>
        )}

        {/* Board */}
        <ConnectionsBoard
          remainingPlayers={remainingPlayers}
          selected={selected}
          solvedGroups={solvedGroups}
          lastIncorrect={lastIncorrect}
          onToggle={togglePlayer}
        />

        {/* Actions */}
        {gameStatus === 'playing' && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={useHint}
              disabled={hintUsed}
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all',
                hintUsed
                  ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              <Lightbulb className="w-4 h-4" />
              Hint
            </button>
            <button
              onClick={submitGuess}
              disabled={selected.length !== 4}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all',
                selected.length === 4
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
              )}
            >
              <Send className="w-4 h-4" />
              Submit
            </button>
          </div>
        )}

        {/* Game Over */}
        {gameStatus !== 'playing' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {gameStatus === 'won' ? (
                <>
                  <div className="text-5xl mb-3">🎉</div>
                  <h2 className="text-2xl font-bold text-correct font-display mb-2">
                    You found all connections!
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Solved with {lives} {lives === 1 ? 'life' : 'lives'} remaining
                  </p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-3">😞</div>
                  <h2 className="text-2xl font-bold text-destructive font-display mb-2">
                    Game Over
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Here are the groups you missed:
                  </p>
                  <div className="space-y-2">
                    {puzzle.groups
                      .filter((g) => !solvedGroups.includes(g))
                      .map((g) => (
                        <div
                          key={g.category}
                          className={cn(
                            'rounded-lg p-3 text-center',
                            difficultyColors[g.difficulty],
                            g.difficulty === 'easy' || g.difficulty === 'hard' || g.difficulty === 'tricky'
                              ? 'text-white'
                              : 'text-close-foreground'
                          )}
                        >
                          <p className="font-bold text-xs uppercase">{g.category}</p>
                          <p className="text-xs mt-0.5 opacity-90">{g.players.join(', ')}</p>
                        </div>
                      ))}
                  </div>
                </>
              )}
              <button
                onClick={resetGame}
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
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-correct" /> Easy</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-close" /> Medium</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Hard</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500" /> Tricky</span>
        </div>

        <GameNav />
        <Footer />
      </div>

      <ConnectionsHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default Connections;
