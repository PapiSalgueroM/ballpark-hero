import { useState } from 'react';
import { useShirtNumber } from '@/hooks/useShirtNumber';
import { GameNavbar } from '@/components/game/GameNavbar';
import ShareButtons from '@/components/game/ShareButtons';
import ReportQuestion from '@/components/game/ReportQuestion';
import { ArrowUp, ArrowDown, Check, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ShirtNumberBoard() {
  const {
    puzzle, attempts, maxAttempts, status, score, hint, mode,
    isLoading, isLoadingPool,
    submitGuess, switchToUnlimited, nextPuzzle, unlimitedIndex,
  } = useShirtNumber();

  const [input, setInput] = useState('');

  // Show loading state until puzzle pool and daily puzzle are both ready
  if (isLoadingPool || isLoading || !puzzle) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <GameNavbar />
        <div className="max-w-md mx-auto px-4 py-6 flex justify-center">
          <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(input, 10);
    if (isNaN(n) || n < 1 || n > 99) return;
    submitGuess(n);
    setInput('');
  };

  const isComplete = status === 'won' || status === 'lost';

  const emojiResult = attempts.map(a => a === puzzle.kitNumber ? '🟩' : '🟥').join('');
  const shareScore = status === 'won'
    ? `${score} pts (${attempts.length}/${maxAttempts})`
    : `0 pts (missed)`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GameNavbar />
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Mode indicator */}
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-primary">Shirt Number</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'daily' ? '📅 Daily Challenge' : `♾️ Unlimited #${unlimitedIndex + 1}`}
          </p>
        </div>

        {/* Player card */}
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-2xl">
            {puzzle.nationality}
          </div>
          <h2 className="text-xl font-bold text-foreground">{puzzle.playerName}</h2>
          <p className="text-sm text-muted-foreground">{puzzle.club}</p>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">
            {puzzle.league}
          </span>
        </div>

        {/* Attempts display */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: maxAttempts }).map((_, i) => {
            const guess = attempts[i];
            if (guess === undefined) {
              return <div key={i} className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">{i + 1}</div>;
            }
            const correct = guess === puzzle.kitNumber;
            return (
              <div key={i} className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all',
                correct ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
              )}>
                {guess}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        {hint && status === 'playing' && (
          <div className={cn(
            'flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-lg',
            hint === 'higher' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'
          )}>
            {hint === 'higher' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            The answer is {hint}!
          </div>
        )}

        {/* Input area */}
        {!isComplete && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={99}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter shirt number (1-99)"
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-center text-lg font-bold placeholder:text-muted-foreground placeholder:text-sm placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-40 transition-opacity"
            >
              Guess
            </button>
          </form>
        )}

        {/* Result */}
        {isComplete && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            {status === 'won' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <p className="text-lg font-bold text-green-400">Correct! 🎉</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                  <X className="w-6 h-6 text-red-400" />
                </div>
                <p className="text-lg font-bold text-red-400">The answer was #{puzzle.kitNumber}</p>
              </>
            )}
            <p className="text-2xl font-display font-bold text-primary">{score} pts</p>
            <p className="text-xs text-muted-foreground italic">💡 {puzzle.funFact}</p>

            <ShareButtons
              score={shareScore}
              gameName="Shirt Number"
              gamePath="/shirt-number"
              emojiGrid={emojiResult}
            />

            {/* Mode buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {mode === 'daily' && (
                <button
                  onClick={switchToUnlimited}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-semibold transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Play Unlimited
                </button>
              )}
              {mode === 'unlimited' && (
                <button
                  onClick={() => { nextPuzzle(); setInput(''); }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors"
                >
                  Next Puzzle →
                </button>
              )}
            </div>
          </div>
        )}

        <ReportQuestion
          gameType="shirt-number"
          gameContext={{ playerName: puzzle.playerName, club: puzzle.club, kitNumber: puzzle.kitNumber }}
        />
      </div>
    </div>
  );
}
