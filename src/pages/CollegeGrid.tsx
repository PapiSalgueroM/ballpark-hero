import { useState, useEffect } from 'react';
import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { CollegeGridSearch } from '@/components/college-grid/CollegeGridSearch';
import { CollegeGridHowToPlay } from '@/components/college-grid/CollegeGridHowToPlay';
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

const CollegeGrid = () => {
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
    checkingDown,
  } = useCollegeGrid();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('cg-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('cg-rules-seen', '1');
    }
  }, []);

  return (
    <>
      <PageSeo
        title="College Football Grid Game - Daily CFB Grid | DoUKnowBall"
        description="The college football grid game. Name players who attended each school and match NFL criteria. Free daily CFB puzzle."
        path="/college-grid"
      />
      <GameShell
        width="narrow"
        emoji="🏈"
        title="COLLEGE FOOTBALL GRID"
        subtitle="Fill the 3×3 grid with college football players matching both criteria. Daily challenge!"
        headerExtra={
          <>
            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-[hsl(var(--cg-green))] transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                Correct: <span className="font-semibold text-correct">{correctCount}</span>/9
              </span>
              <span className="text-muted-foreground">
                Guesses left: <span className="font-semibold text-foreground">{guessesLeft}</span>
              </span>
            </div>
          </>
        }
      >
        {isLoading ? (
          <GridBoardSkeleton variant="square" />
        ) : (
          <>
            <GridBoard
              puzzle={puzzle}
              cells={cells}
              activeCell={activeCell}
              onCellClick={setActiveCell}
              accentVar="--cg-green"
              headerBgVar="--cg-header"
            />

            {activeCell !== null && gameStatus === 'playing' && (
              <div className="mt-6">
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Find a player who: <span className="text-[hsl(var(--cg-green))] font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
                  + <span className="text-[hsl(var(--cg-green))] font-semibold">{puzzle.cols[activeCell % 3].label}</span>
                </p>
                {checkingDown ? (
                  <p className="text-center text-sm text-muted-foreground">Answer checking has used up its allowance for today. Your board is saved; come back tomorrow.</p>
                ) : (
                  <CollegeGridSearch onSelect={submitGuess} disabled={validating} />
                )}
              </div>
            )}

            {gameStatus === 'complete' && (
              <div className="mt-8 flex justify-center">
                <ResultScreen
                  won={correctCount === 9}
                  outcomeEmoji={correctCount === 9 ? '🏆' : '⏱️'}
                  headline={correctCount === 9 ? 'Grid Complete!' : 'Out of Guesses!'}
                  statLine={<>You filled <span className="font-bold text-[hsl(var(--cg-green))]">{correctCount}</span>/9 cells</>}
                  funFact={
                    rarityScore !== null ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Trophy className="w-4 h-4 text-[hsl(var(--cg-green))]" />
                        Rarity Score: {rarityScore}% (lower rarity = more impressive picks!)
                      </span>
                    ) : undefined
                  }
                  emojiGrid={gridCellsToEmoji(cells)}
                  share={{
                    score: rarityScore !== null ? `a Rarity Score of ${rarityScore}% (${correctCount}/9)` : `${correctCount}/9 cells`,
                    gameName: 'College Football Grid',
                    gamePath: '/college-grid',
                  }}
                  playNext={<p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="College Football Grid | DoUKnowBall"
          description="A daily 3×3 grid puzzle where each cell requires a college football player matching both the row and column criteria: schools, Heisman winners, All-Americans, draft picks and more."
          howToPlay={[
            'Each cell requires a college football player who satisfies both the row and column attribute',
            'Attributes include schools, conferences, awards (Heisman, All-American), draft status and positions',
            'Correct answers show a rarity percentage. Rarer picks earn a better overall score',
            'New grid at midnight, same challenge for everyone. 15 guesses to complete it.',
          ]}
          examples={[
            "Alabama + Heisman Winner = Derrick Henry, Mark Ingram",
            "Ohio State + 1st Round Pick = Chase Young, Joey Bosa",
            "SEC + Quarterback = Tim Tebow, Joe Burrow",
            "Clemson + Wide Receiver = DeAndre Hopkins, Sammy Watkins",
            "Big Ten + Running Back = Saquon Barkley, Jonathan Taylor",
            "Notre Dame + Linebacker = Manti Te'o, Jeremiah Owusu-Koramoah"
          ]}
        />

        <p className="text-sm text-muted-foreground mt-4 max-w-2xl mx-auto">
          DoUKnowBall's College Football Grid is a free daily CFB puzzle game where you name NFL players who attended a given college program and meet a second criteria like position, draft round, or award. Where the pro version asks which team a player suited up for, this college one asks which campus he came from, and it tests your knowledge of players from Alabama, Ohio State, Clemson, Georgia, and dozens more programs. A new grid is available every day.
        </p>

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="college-grid" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
      </GameShell>

      <CollegeGridHowToPlay open={showRules} onOpenChange={setShowRules} />
    </>
  );
};

export default CollegeGrid;
