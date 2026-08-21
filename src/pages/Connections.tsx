import { useState, useEffect } from 'react';
import { useConnections } from '@/hooks/useConnections';
import { ConnectionsBoard } from '@/components/connections/ConnectionsBoard';
import { ConnectionsHowToPlay } from '@/components/connections/ConnectionsHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HelpCircle, Lightbulb, Send, ArrowRight, Shuffle, Flame } from 'lucide-react';
import { connectionsGroupsToEmoji } from '@/lib/shareGrids';
import { cn } from '@/lib/utils';
import { ConnectionDifficulty } from '@/types/connections';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const difficultyColors: Record<ConnectionDifficulty, string> = {
  easy: 'bg-correct',
  medium: 'bg-close',
  hard: 'bg-blue-500',
  insane: 'bg-purple-500',
};

const Connections = () => {
  const {
    mode,
    switchMode,
    puzzle,
    selected,
    solvedGroups,
    lives,
    gameStatus,
    remainingPlayers,
    hintsUsed,
    hintCategories,
    lastIncorrect,
    oneAway,
    streak,
    togglePlayer,
    submitGuess,
    useHint,
    shufflePlayers,
    giveUp,
    resetGame,
    nextPuzzle,
    puzzleIndex,
    totalPuzzles,
    isLoading,
    isLoadingPool,
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
    <>
      <PageSeo
        title="Soccer Connections - Football Trivia Puzzle | DoUKnowBall"
        description="Group 16 soccer players into 4 categories. Daily football connections puzzle."
        path="/connections"
      />
      <GameShell
        width="wide"
        title="CONNECTIONS"
        subtitle="Group 16 soccer players into 4 secret categories. Can you crack the connection?"
        headerExtra={
          <>
            {mode === 'unlimited' && (
              <p className="text-xs text-muted-foreground mt-1">
                Puzzle {(puzzleIndex % totalPuzzles) + 1} of {totalPuzzles}
              </p>
            )}

            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                    mode === m
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            {/* Lives & Streak */}
            <div className="flex items-center justify-center gap-4 mt-5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground mr-1">Lives:</span>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full transition-all',
                      i < lives ? 'bg-primary' : 'bg-secondary',
                    )}
                  />
                ))}
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <Flame className="w-4 h-4" />
                  {streak}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
          </>
        }
      >
        {/* Loading guard */}
        {(isLoading || isLoadingPool) && (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        )}

        {!isLoading && !isLoadingPool && (
          <>
            {/* One Away */}
            {oneAway && (
              <div className="max-w-xl mx-auto mb-4 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-center animate-cell-reveal">
                <p className="text-sm font-semibold text-destructive">🔥 One away!</p>
              </div>
            )}

            {/* Hint */}
            {hintCategories.length > 0 && (
              <div className="max-w-xl mx-auto mb-4 space-y-2">
                {hintCategories.map((cat) => (
                  <div key={cat} className="bg-accent/50 border border-accent rounded-xl px-4 py-3 text-center">
                    <p className="text-sm text-accent-foreground">
                      <Lightbulb className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                      Hint: <strong>{cat}</strong>
                    </p>
                  </div>
                ))}
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
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button
                  onClick={shufflePlayers}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </button>
                <button
                  onClick={submitGuess}
                  disabled={selected.length !== 4}
                  className={cn(
                    'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all',
                    selected.length === 4
                      ? 'bg-primary text-primary-foreground hover:opacity-90'
                      : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50',
                  )}
                >
                  <Send className="w-4 h-4" />
                  Submit
                </button>
                <button
                  onClick={useHint}
                  disabled={hintsUsed >= 4}
                  className={cn(
                    'inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all',
                    hintsUsed >= 4
                      ? 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                  )}
                >
                  <Lightbulb className="w-4 h-4" />
                  Hint ({4 - hintsUsed})
                </button>
                <GiveUpButton onGiveUp={giveUp} />
              </div>
            )}

            {/* Game Over */}
            {gameStatus !== 'playing' && (
              <div className="mt-8 flex justify-center">
                <ResultScreen
                  won={gameStatus === 'won'}
                  outcomeEmoji={gameStatus === 'won' ? '🎉' : '😞'}
                  headline={gameStatus === 'won' ? 'You found all connections!' : 'Game Over'}
                  statLine={
                    gameStatus === 'won'
                      ? `Solved with ${lives} ${lives === 1 ? 'life' : 'lives'} remaining`
                      : 'Here are the groups you missed:'
                  }
                  emojiGrid={connectionsGroupsToEmoji(solvedGroups)}
                  share={{
                    score: gameStatus === 'won' ? `${solvedGroups.length}/4 groups, ${lives} lives left` : `${solvedGroups.length}/4 groups`,
                    gameName: 'Connections',
                    gamePath: '/connections',
                  }}
                  onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
                  playAgainLabel="Retry"
                  playNext={mode === 'unlimited' ? (
                    <button
                      onClick={nextPuzzle}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                    >
                      Next Puzzle
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
                  )}
                >
                  {gameStatus !== 'won' && (
                    <div className="space-y-2 mb-2">
                      {puzzle.groups
                        .filter((g) => !solvedGroups.includes(g))
                        .map((g) => (
                          <div
                            key={g.category}
                            className={cn(
                              'rounded-lg p-3 text-center',
                              difficultyColors[g.difficulty],
                              g.difficulty === 'easy' || g.difficulty === 'hard' || g.difficulty === 'insane'
                                ? 'text-white'
                                : 'text-close-foreground',
                            )}
                          >
                            <p className="font-bold text-xs uppercase">{g.category}</p>
                            <p className="text-xs mt-0.5 opacity-90">{g.players.join(', ')}</p>
                          </div>
                        ))}
                    </div>
                  )}
                </ResultScreen>
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-correct" /> Easy</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-close" /> Medium</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Hard</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-500" /> Insane</span>
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Sports Connections Game | DoUKnowBall"
          description="Find the four groups of connected sports players. Each group shares something in common: a team, award, position or era."
          howToPlay={[
            'Select four players you think belong to the same group',
            'Hit Submit to check your guess. Correct groups are revealed',
            'Use hints to reveal a group\'s category name',
            'You have 4 lives. Lose one for each wrong guess',
          ]}
          examples={[
            'Players who played for AC Milan: Kaká, Maldini, Van Basten, Gullit',
            'Ballon d\'Or winners: Messi, Ronaldo, Modrić, Benzema',
            'Brazilian World Cup winners: Ronaldo, Rivaldo, Cafu, Roberto Carlos',
            'Premier League Golden Boot: Salah, Kane, Henry, Van Persie',
            'Players who wore #10: Zidane, Pelé, Maradona, Ronaldinho',
            'Left-footed legends: Messi, Maradona, Nedvěd, Robben',
          ]}
        />

        <AdBanner slot="1234567893" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="connections" gameContext={{ puzzleId: puzzle?.id }} />
        </div>
        <GameNav />

        <ConnectionsHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default Connections;
