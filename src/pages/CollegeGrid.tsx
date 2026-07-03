import { useState, useEffect } from 'react';
import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { CollegeGridSearch } from '@/components/college-grid/CollegeGridSearch';
import { CollegeGridHowToPlay } from '@/components/college-grid/CollegeGridHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
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
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="College Football Grid Game - CFB Immaculate Grid | DoUKnowBall"
        description="The college football grid game. Name players who attended each school and match NFL criteria. Free daily CFB puzzle."
        path="/college-grid"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--cg-green))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--cg-green))]">
            🏈 COLLEGE FOOTBALL GRID
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Fill the 3×3 grid with college football players matching both criteria. Daily challenge!
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">
              Correct: <span className="font-semibold text-correct">{correctCount}</span>/9
            </span>
            <span className="text-muted-foreground">
              Guesses left: <span className="font-semibold text-foreground">{guessesLeft}</span>
            </span>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
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
                <CollegeGridSearch onSelect={submitGuess} disabled={validating} />
              </div>
            )}

            {gameStatus === 'complete' && (
              <div className="mt-8 flex justify-center">
                <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
                  {correctCount === 9 ? (
                    <>
                      <div className="text-5xl mb-3">🏆</div>
                      <h2 className="text-2xl font-bold text-[hsl(var(--cg-green))] font-display mb-2">
                        Grid Complete!
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl mb-3">⏱️</div>
                      <h2 className="text-2xl font-bold text-destructive font-display mb-2">
                        Out of Guesses!
                      </h2>
                    </>
                  )}
                  <p className="text-foreground">
                    You filled <span className="font-bold text-[hsl(var(--cg-green))]">{correctCount}</span>/9 cells
                  </p>
                  {rarityScore !== null && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Trophy className="w-5 h-5 text-[hsl(var(--cg-green))]" />
                      <span className="text-lg font-bold text-[hsl(var(--cg-green))]">
                        Rarity Score: {rarityScore}%
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Lower rarity = more impressive picks!</p>
                  <ShareButtons
                    score={rarityScore !== null ? `a Rarity Score of ${rarityScore}% (${correctCount}/9)` : `${correctCount}/9 cells`}
                    gameName="College Football Grid"
                    gamePath="/college-grid"
                    emojiGrid={gridCellsToEmoji(cells)}
                  />
                  <p className="mt-4 text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
                </div>
              </div>
            )}
          </>
        )}

        <GameSeoContent
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
          DoUKnowBall's College Football Grid is a free daily CFB puzzle game where you name NFL players who attended a given college program and meet a second criteria like position, draft round, or award. Similar to the NFL Immaculate Grid, this college football version tests your knowledge of players from Alabama, Ohio State, Clemson, Georgia, and dozens more programs. A new grid is available every day.
        </p>

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="college-grid" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <CollegeGridHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default CollegeGrid;
