import { useState, useEffect } from 'react';
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { fetchCareerPlayers } from '@/lib/fetchCareerPlayers';
import { SoccerGridBoard } from '@/components/soccer-grid/SoccerGridBoard';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { GameNav } from '@/components/game/GameNav';
import { gridCellsToEmoji } from '@/lib/shareGrids';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { Trophy, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DIFFICULTY_TIERS,
  TIMER_MODES,
  formatTimeLeft,
} from '@/lib/soccerGridDifficulty';

const SoccerGrid = () => {
  const {
    puzzle, cells, mainCells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, isLoading, isLoadingPool,
    settings, setDifficulty, setTimerMode, timeLeft, timeUp,
    isOvertime, overtimeActive, startOvertime, overtimeCorrectCount,
  } = useSoccerGrid();

  type CareerPlayerSlim = { name: string; nationality: string; position: string };
  const [careerPlayerList, setCareerPlayerList] = useState<CareerPlayerSlim[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCareerPlayers().then((pool) => {
      if (cancelled) return;
      setCareerPlayerList(pool.map(p => ({ name: p.name, nationality: p.nationality, position: p.position })));
    });
    return () => { cancelled = true; };
  }, []);

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('sg-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('sg-rules-seen', '1');
    }
  }, []);

  // Pre-play settings (difficulty + timer) are only offered before the first
  // guess of the day. Once a guess has been made, the puzzle and timer are
  // locked in for the day so switching mid-run can't be used to dodge a
  // ticking clock or reroll into an easier puzzle.
  const hasStarted = guessesLeft < 15;
  const showSettingsPanel = !isLoadingPool && !isLoading && gameStatus === 'playing' && !hasStarted;

  const mainGameOver = gameStatus === 'complete';
  const showOvertimeOffer = mainGameOver && !overtimeActive && correctCount < 9;
  const showOvertimeBoard = mainGameOver && overtimeActive && correctCount + overtimeCorrectCount < 9;
  const showResult = mainGameOver && !showOvertimeBoard;

  const endReason: 'won' | 'timeUp' | 'outOfGuesses' =
    correctCount === 9 ? 'won' : timeUp ? 'timeUp' : 'outOfGuesses';

  return (
    <>
      <PageSeo
        title="Soccer Grid - Daily Football Team Grid Game | DoUKnowBall"
        description="Fill the 3x3 soccer grid by naming players who match two criteria. Daily football trivia grid game."
        path="/soccer-grid"
      />
      <GameShell
        width="narrow"
        emoji="⚽"
        title="SOCCER GRID"
        subtitle="Fill the 3×3 grid. Each cell needs a player matching both the row and column. Daily challenge!"
        headerExtra={
          <>
            <HowToPlayPopover title="How to Play Soccer Grid" open={showRules} onOpenChange={setShowRules}>
              <p className="text-muted-foreground text-center">
                Fill the 3×3 soccer grid with valid players!
              </p>
              <section>
                <h3 className="font-bold text-foreground mb-2">Rules</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Each cell needs a player who matches both the row and column attribute</li>
                  <li>Tap a cell, type a player name, and submit</li>
                  <li>Correct answers turn green and show a rarity percentage</li>
                  <li>Wrong answers cost a guess</li>
                  <li>You have 15 guesses to complete the grid</li>
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Difficulty</h3>
                <ul className="space-y-1.5 text-muted-foreground">
                  {DIFFICULTY_TIERS.map((d) => (
                    <li key={d.tier}><span className="text-foreground font-semibold">{d.label}:</span> {d.hint}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Timer Modes</h3>
                <p className="text-muted-foreground">
                  Pick Unlimited or race the clock at 90s, 60s, or 40s. The clock starts on your first guess, not when the page loads. Running out of time ends the round just like running out of guesses.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Overtime</h3>
                <p className="text-muted-foreground">
                  If cells are still empty when the round ends, you can start Overtime to keep filling them in. Your recorded score and rarity are frozen from the main round. Overtime picks are just for fun.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Rarity System</h3>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Under 5% of players picked the same answer: rare pick</li>
                  <li>5 to 25% of players: uncommon</li>
                  <li>Over 25% of players: standard</li>
                </ul>
              </section>
              <p className="text-muted-foreground text-center">A new grid drops every day at midnight.</p>
            </HowToPlayPopover>

            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                Correct: <span className="font-semibold text-correct">{correctCount}</span>/9
              </span>
              <span className="text-muted-foreground">
                Guesses left: <span className="font-semibold text-foreground">{guessesLeft}</span>
              </span>
              {settings.timerMode !== 0 && gameStatus === 'playing' && timeLeft !== null && (
                <span className={cn('inline-flex items-center gap-1 font-semibold', timeLeft <= 10 ? 'text-destructive' : 'text-foreground')}>
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimeLeft(timeLeft)}
                </span>
              )}
            </div>
          </>
        }
      >
        {(isLoadingPool || isLoading) ? (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : (
          <>
            {showSettingsPanel && (
              <div className="mb-6 bg-surface-1 border border-border rounded-2xl p-4 max-w-md mx-auto">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 text-center">
                  Difficulty
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  {DIFFICULTY_TIERS.map((d) => (
                    <button
                      key={d.tier}
                      onClick={() => setDifficulty(d.tier)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                        settings.difficulty === d.tier
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                      )}
                      title={d.hint}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 text-center">
                  Timer
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {TIMER_MODES.map((t) => (
                    <button
                      key={t.mode}
                      onClick={() => setTimerMode(t.mode)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                        settings.timerMode === t.mode
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Your first guess locks in these settings for today's puzzle.
                </p>
              </div>
            )}

            <SoccerGridBoard
              puzzle={puzzle}
              cells={cells}
              activeCell={activeCell}
              onCellClick={setActiveCell}
            />

            {isOvertime && (
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-500 mt-3">
                Overtime: picks below don't change your recorded score
              </p>
            )}

            {activeCell !== null && (gameStatus === 'playing' || isOvertime) && (
              <div className="mt-6">
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Find a player who: <span className="text-primary font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
                  + <span className="text-primary font-semibold">{puzzle.cols[activeCell % 3].label}</span>
                </p>
                <SoccerGridSearch onSelect={submitGuess} disabled={validating} players={careerPlayerList} />
              </div>
            )}

            {showOvertimeOffer && (
              <div className="mt-8 flex justify-center">
                <div className="bg-surface-1 border border-border rounded-2xl p-6 max-w-md w-full text-center">
                  <p className="text-foreground text-sm mb-3">
                    {9 - correctCount} {9 - correctCount === 1 ? 'cell' : 'cells'} still empty. Keep going in Overtime? Your recorded score stays exactly as it is now.
                  </p>
                  <button
                    onClick={startOvertime}
                    className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] bg-amber-500 text-white rounded-full font-semibold hover:opacity-90 transition-opacity"
                  >
                    Start Overtime
                  </button>
                </div>
              </div>
            )}

            {showResult && (
              <div className="mt-8 flex justify-center">
                <ResultScreen
                  won={endReason === 'won'}
                  outcomeEmoji={endReason === 'won' ? '🏆' : endReason === 'timeUp' ? '⏰' : '⏱️'}
                  headline={
                    endReason === 'won'
                      ? 'Grid Complete!'
                      : endReason === 'timeUp'
                        ? "Time's Up!"
                        : 'Out of Guesses!'
                  }
                  statLine={
                    <>
                      You filled <span className="font-bold text-primary">{correctCount}</span>/9 cells
                      {overtimeActive && overtimeCorrectCount > 0 && (
                        <span className="block text-muted-foreground text-sm mt-1">
                          Plus {overtimeCorrectCount} in Overtime (not scored)
                        </span>
                      )}
                    </>
                  }
                  funFact={
                    rarityScore !== null ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        Rarity Score: {rarityScore}% (lower is more impressive)
                      </span>
                    ) : undefined
                  }
                  emojiGrid={gridCellsToEmoji(mainCells)}
                  share={{
                    score: rarityScore !== null ? `a Rarity Score of ${rarityScore}% (${correctCount}/9)` : `${correctCount}/9 cells`,
                    gameName: 'Soccer Grid',
                    gamePath: '/soccer-grid',
                  }}
                  playNext={<p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Soccer Grid | DoUKnowBall"
          description="A daily 3×3 grid puzzle where each cell requires a soccer player matching both the row and column criteria. Features clubs, leagues, nationalities, and achievements."
          howToPlay={[
            'Each cell in the 3×3 grid requires a player who satisfies both the row and column attribute',
            'Attributes include clubs, leagues, positions, nationalities, and achievements',
            'Correct answers show a rarity percentage. Rarer picks earn a better score.',
            'You have 15 guesses to complete the grid. Wrong answers cost a guess.',
            'Pick a difficulty tier and an optional timer before your first guess of the day.',
            'If cells remain after the round ends, Overtime lets you keep filling them without changing your recorded score.',
          ]}
          examples={[
            "Real Madrid + France = Karim Benzema, Zinedine Zidane",
            "Barcelona + Brazil = Neymar, Ronaldinho, Rivaldo",
            "Premier League + Golden Boot = Mohamed Salah, Harry Kane",
            "Serie A + Goalkeeper = Gianluigi Buffon, Alisson",
            "Bundesliga + Netherlands = Arjen Robben, Memphis Depay",
            "Champions League Winner + Argentina = Lionel Messi, Di María"
          ]}
        />

        <AdBanner slot="1234567900" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="soccer-grid" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default SoccerGrid;
