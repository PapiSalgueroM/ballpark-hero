import { FlagFromEmoji } from '@/components/FlagImg';
import { useState } from 'react';
import { useShirtNumber } from '@/hooks/useShirtNumber';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import ReportQuestion from '@/components/game/ReportQuestion';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { cn } from '@/lib/utils';

export function ShirtNumberBoard() {
  const {
    puzzle, attempts, maxAttempts, status, score, hint, mode,
    isLoading, isLoadingPool,
    submitGuess, switchToUnlimited, nextPuzzle, unlimitedIndex,
  } = useShirtNumber();

  const [input, setInput] = useState('');

  // Show loading state until puzzle pool and daily puzzle are both ready.
  // This check must live BELOW every hook. Returning early above the hooks
  // changes the hook count between renders and crashes with React error #310.
  if (isLoadingPool || isLoading || !puzzle) {
    return (
      <GameShell width="narrow" title="SHIRT NUMBER">
        <p className="text-muted-foreground text-sm text-center animate-pulse">Loading today's puzzle…</p>
      </GameShell>
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

  return (
    <GameShell
      width="narrow"
      title="SHIRT NUMBER"
      headerExtra={
        <div className="mt-1 flex items-center justify-center gap-2">
          <p className="text-xs text-muted-foreground">
            {mode === 'daily' ? '📅 Daily Challenge' : `♾️ Unlimited #${unlimitedIndex + 1}`}
          </p>
          <HowToPlayPopover title="How to Play Shirt Number" floatingTrigger={false} className="p-1">
            <div className="space-y-3 text-left">
              <p>👕 <span className="font-semibold text-foreground">Guess the shirt number</span> this player wears for the club shown.</p>
              <p>🔢 Type any number from 1 to 99 and submit. You get a limited number of tries.</p>
              <p>⬆️⬇️ After each miss the game tells you whether the real number is higher or lower.</p>
              <p>🏆 Fewer guesses means a bigger score. Nail it first try for max points.</p>
              <p>📅 One daily player for everyone, plus unlimited mode for bingeing.</p>
            </div>
          </HowToPlayPopover>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Player card */}
        <div className="rounded-2xl border border-border bg-surface-1 p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto text-2xl">
            <FlagFromEmoji emoji={puzzle.nationality} size={28} />
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
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-center text-lg font-bold placeholder:text-muted-foreground placeholder:text-sm placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/40"
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
          <ResultScreen
            won={status === 'won'}
            outcomeEmoji={status === 'won' ? '🎉' : '😞'}
            headline={status === 'won' ? 'Correct!' : `The answer was #${puzzle.kitNumber}`}
            statLine={<span className="text-2xl font-display font-bold text-primary">{score} pts</span>}
            funFact={`💡 ${puzzle.funFact}`}
            emojiGrid={emojiResult}
            share={{
              score: status === 'won' ? `${score} pts (${attempts.length}/${maxAttempts})` : '0 pts (missed)',
              gameName: 'Shirt Number',
              gamePath: '/shirt-number',
            }}
            onPlayAgain={mode === 'unlimited' ? () => { nextPuzzle(); setInput(''); } : undefined}
            playAgainLabel="Next Puzzle"
            playNext={mode === 'daily' ? (
              <button
                onClick={switchToUnlimited}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-sm font-semibold transition-colors"
              >
                Play Unlimited
              </button>
            ) : undefined}
          />
        )}

        <ReportQuestion
          gameType="shirt-number"
          gameContext={{ playerName: puzzle.playerName, club: puzzle.club, kitNumber: puzzle.kitNumber }}
        />
      </div>

      <GameSeoContent
        title="Shirt Number Game | DoUKnowBall"
        description="Test your football knowledge by guessing the kit number of famous soccer players. You get 3 attempts with higher/lower hints after each wrong guess."
        howToPlay={[
          "You're shown a player's name, club, league, and nationality.",
          "Enter the shirt number you think they wear (1-99).",
          "If wrong, you'll get a hint: is the real number higher or lower?",
          "Score 1000 points on your first try, 600 on the second, or 200 on the third."
        ]}
        examples={[
          "Lionel Messi at Inter Miami → #10",
          "Erling Haaland at Manchester City → #9",
          "Trent Alexander-Arnold at Liverpool → #66",
          "Phil Foden at Manchester City → #47",
          "Jude Bellingham at Real Madrid → #5"
        ]}
      />
    </GameShell>
  );
}
