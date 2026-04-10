import { useState, useEffect } from 'react';
import { useFootballGrid } from '@/hooks/useFootballGrid';
import { GridBoard } from '@/components/football-grid/GridBoard';
import { GridPlayerSearch } from '@/components/football-grid/GridPlayerSearch';
import { FootballGridHowToPlay } from '@/components/football-grid/FootballGridHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
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
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="NFL Grid - Football Immaculate Grid Game | DoUKnowBall"
        description="NFL immaculate grid game. Name players who played for each team and match position or award criteria."
        path="/football-grid"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--fg-gold))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--fg-gold))]">
            🏈 PRO FOOTBALL GRID
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Fill the 3×3 grid — each cell needs a player matching both the row and column. Daily challenge!
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
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              {correctCount === 9 ? (
                <>
                  <div className="text-5xl mb-3">🏆</div>
                  <h2 className="text-2xl font-bold text-[hsl(var(--fg-gold))] font-display mb-2">
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
                You filled <span className="font-bold text-[hsl(var(--fg-gold))]">{correctCount}</span>/9 cells
              </p>
              {rarityScore !== null && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Trophy className="w-5 h-5 text-[hsl(var(--fg-gold))]" />
                  <span className="text-lg font-bold text-[hsl(var(--fg-gold))]">
                    Rarity Score: {rarityScore}%
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Lower rarity = more impressive picks!</p>
              <ShareButtons
                score={rarityScore !== null ? `a Rarity Score of ${rarityScore}% (${correctCount}/9)` : `${correctCount}/9 cells`}
                gameName="Pro Football Grid"
                gamePath="/football-grid"
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="Pro Football Grid | DoUKnowBall"
          description="A daily 3×3 grid puzzle where each cell requires a pro football player matching both the row and column criteria. Features a rarity scoring system based on real player selections."
          howToPlay={[
            'Each cell in the 3×3 grid requires a player who satisfies both the row and column attribute',
            'Correct answers show a rarity percentage — rarer picks earn a better overall score',
            'You have 15 guesses to complete the grid. Wrong answers cost a guess.',
            'A new grid drops at midnight — same challenge for everyone',
          ]}
          examples={[
            "Dallas Cowboys + Quarterback = Tony Romo, Troy Aikman, Dak Prescott",
            "New England Patriots + Wide Receiver = Randy Moss, Julian Edelman",
            "AFC + MVP = Peyton Manning, Lamar Jackson, Patrick Mahomes",
            "1st Round Pick + Running Back = Saquon Barkley, Adrian Peterson",
            "NFC North + Linebacker = Brian Urlacher, Ray Nitschke",
            "Pro Bowl + Safety = Ed Reed, Troy Polamalu, Derwin James"
          ]}
        />

        <AdBanner slot="1234567900" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="football-grid" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <FootballGridHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default FootballGrid;
