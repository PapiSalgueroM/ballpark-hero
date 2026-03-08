import { useState, useEffect } from 'react';
import { useCollegeGrid } from '@/hooks/useCollegeGrid';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { GridPlayerSearch } from '@/components/football-grid/GridPlayerSearch';
import { CollegeGridHowToPlay } from '@/components/college-grid/CollegeGridHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
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
      <PageSeo
        title="College Football Grid – 3x3 Trivia Puzzle | DoUKnowBall"
        description="Fill the 3x3 grid with college football players who match both row and column criteria. Heisman winners, All-Americans, and more. Daily challenge with rarity scoring."
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

        <GridBoard
          puzzle={puzzle}
          cells={cells}
          activeCell={activeCell}
          onCellClick={setActiveCell}
          accentVar="--cg-green"
          headerBgVar="--cg-green"
        />

        {activeCell !== null && gameStatus === 'playing' && (
          <div className="mt-6">
            <p className="text-center text-xs text-muted-foreground mb-2">
              Find a player who: <span className="text-[hsl(var(--cg-green))] font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
              + <span className="text-[hsl(var(--cg-green))] font-semibold">{puzzle.cols[activeCell % 3].label}</span>
            </p>
            <GridPlayerSearch onSelect={submitGuess} disabled={validating} />
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
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="College Football Grid | DoUKnowBall"
          description="A daily 3×3 grid puzzle where each cell requires a college football player matching both the row and column criteria — schools, Heisman winners, All-Americans, draft picks and more."
          howToPlay={[
            'Each cell requires a college football player who satisfies both the row and column attribute',
            'Attributes include schools, conferences, awards (Heisman, All-American), draft status and positions',
            'Correct answers show a rarity percentage — rarer picks earn a better overall score',
            'New grid at midnight — same challenge for everyone. 15 guesses to complete it.',
          ]}
        />

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
