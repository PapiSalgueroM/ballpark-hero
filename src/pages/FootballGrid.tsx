import { useState, useEffect } from 'react';
import { useFootballGrid } from '@/hooks/useFootballGrid';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { GridPlayerSearch } from '@/components/football-grid/GridPlayerSearch';
import { FootballGridHowToPlay } from '@/components/football-grid/FootballGridHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { GridBoardSkeleton } from '@/components/game/GridBoardSkeleton';
import { ResultScreen } from '@/components/game/ResultScreen';
import { gridCellsToEmoji } from '@/lib/shareGrids';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Trophy } from 'lucide-react';

const FootballGrid = () => {
  const {
    puzzle,
    cells,
    activeCell,
    setActiveCell,
    submitGuess,
    validating,
    gameStatus,
    guessesLeft,
    correctCount,
    rarityScore,
    isLoading,
    dataError,
    unlimited,
    toggleUnlimited,
  } = useFootballGrid();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('fg-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('fg-rules-seen', '1');
    }
  }, []);

  return (
    <>
      <PageSeo
        title="NFL Grid - Daily Football Team Grid Game | DoUKnowBall"
        description="Daily NFL grid game. Name players who played for each team and match position, draft or Super Bowl criteria."
        path="/football-grid"
      />
      <GameShell
        width="narrow"
        emoji="🏈"
        title="NFL GRID"
        subtitle="Fill the 3×3 grid. Each cell needs a player matching both the row and column. Daily challenge!"
        headerExtra={
          <>
            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-[hsl(var(--fg-gold))] transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                Correct: <span className="font-semibold text-correct">{correctCount}</span>/9
              </span>
              <span className="text-muted-foreground">
                Guesses left: <span className="font-semibold text-foreground">{guessesLeft === null ? '∞' : guessesLeft}</span>
              </span>
            </div>
            <div className="flex items-center justify-center mt-2">
              <button
                onClick={toggleUnlimited}
                className="rounded-full border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                aria-pressed={unlimited}
              >
                {unlimited ? '∞ Unlimited guesses: ON' : 'Unlimited guesses: OFF'}
              </button>
            </div>
          </>
        }
      >
        {dataError ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            The player records could not load. Refresh the page to try again.
          </p>
        ) : isLoading ? (
          <GridBoardSkeleton variant="square" />
        ) : (
          <>
            {/* Grid */}
            <GridBoard
              puzzle={puzzle}
              cells={cells}
              activeCell={activeCell}
              onCellClick={setActiveCell}
            />

            {/* Search input when a cell is active */}
            {activeCell !== null && gameStatus === 'playing' && (
              <div className="mt-6">
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Find a player who: <span className="text-[hsl(var(--fg-gold))] font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
                  + <span className="text-[hsl(var(--fg-gold))] font-semibold">{puzzle.cols[activeCell % 3].label}</span>
                </p>
                <GridPlayerSearch onSelect={submitGuess} disabled={validating} />
              </div>
            )}

            {/* Result */}
            {gameStatus === 'complete' && (
              <div className="mt-8 flex justify-center">
                <ResultScreen
                  won={correctCount === 9}
                  outcomeEmoji={correctCount === 9 ? '🏆' : '⏱️'}
                  headline={correctCount === 9 ? 'Grid Complete!' : 'Out of Guesses!'}
                  statLine={<>You filled <span className="font-bold text-[hsl(var(--fg-gold))]">{correctCount}</span>/9 cells</>}
                  funFact={
                    rarityScore !== null ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Trophy className="w-4 h-4 text-[hsl(var(--fg-gold))]" />
                        Rarity Score: {rarityScore}% (lower rarity = more impressive picks!)
                      </span>
                    ) : undefined
                  }
                  emojiGrid={gridCellsToEmoji(cells)}
                  share={{
                    score: rarityScore !== null ? `a Rarity Score of ${rarityScore}% (${correctCount}/9)` : `${correctCount}/9 cells`,
                    gameName: 'NFL Grid',
                    gamePath: '/football-grid',
                  }}
                  playNext={<p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="NFL Grid | DoUKnowBall"
          description="A daily 3×3 grid puzzle where each cell requires a pro football player matching both the row and column criteria. Features a rarity scoring system based on real player selections."
          howToPlay={[
            'Each cell in the 3×3 grid requires a player who satisfies both the row and column attribute',
            'Correct answers show a rarity percentage. Rarer picks earn a better overall score',
            'You have 15 guesses to complete the grid. Wrong answers cost a guess.',
            'A new grid drops at midnight, same challenge for everyone',
          ]}
          examples={[
            "Played for Cowboys + Quarterback = Tony Romo, Troy Aikman, Dak Prescott",
            "Played for Patriots + Won a Super Bowl = Tom Brady, Corey Dillon, Deion Branch",
            "Played for Packers + Undrafted = Tramon Williams",
            "First Round Pick + Played for Colts = Peyton Manning",
            "Played for Titans + Running Back = Earl Campbell, Derrick Henry",
            "Round 6 or Later Pick + Played for Patriots = Tom Brady"
          ]}
        />

        <AdBanner slot="1234567900" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="football-grid" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
      </GameShell>

      <FootballGridHowToPlay open={showRules} onOpenChange={setShowRules} />
    </>
  );
};

export default FootballGrid;
