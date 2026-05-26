import { useState, useEffect } from 'react';
import { useSoccerGrid } from '@/hooks/useSoccerGrid';
import { SoccerGridBoard } from '@/components/soccer-grid/SoccerGridBoard';
import { SoccerGridSearch } from '@/components/soccer-grid/SoccerGridSearch';
import { SoccerGridHowToPlay } from '@/components/soccer-grid/SoccerGridHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Trophy } from 'lucide-react';

const SoccerGrid = () => {
  const {
    puzzle, cells, activeCell, setActiveCell, submitGuess,
    validating, gameStatus, guessesLeft, correctCount, rarityScore, isLoading, isLoadingPool,
  } = useSoccerGrid();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('sg-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('sg-rules-seen', '1');
    }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <PageSeo
        title="Soccer Grid - Football Immaculate Grid Game | DoUKnowBall"
        description="Fill the 3x3 soccer grid by naming players who match two criteria. Daily football trivia grid game."
        path="/soccer-grid"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--sg-accent))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--sg-accent))]">
            ⚽ SOCCER GRID
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

        {(isLoadingPool || isLoading) ? (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        ) : (
          <>
            <SoccerGridBoard
              puzzle={puzzle}
              cells={cells}
              activeCell={activeCell}
              onCellClick={setActiveCell}
            />

            {activeCell !== null && gameStatus === 'playing' && (
              <div className="mt-6">
                <p className="text-center text-xs text-muted-foreground mb-2">
                  Find a player who: <span className="text-[hsl(var(--sg-accent))] font-semibold">{puzzle.rows[Math.floor(activeCell / 3)].label}</span>{' '}
                  + <span className="text-[hsl(var(--sg-accent))] font-semibold">{puzzle.cols[activeCell % 3].label}</span>
                </p>
                <SoccerGridSearch onSelect={submitGuess} disabled={validating} />
              </div>
            )}

            {gameStatus === 'complete' && (
              <div className="mt-8 flex justify-center">
                <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
                  {correctCount === 9 ? (
                    <>
                      <div className="text-5xl mb-3">🏆</div>
                      <h2 className="text-2xl font-bold text-[hsl(var(--sg-accent))] font-display mb-2">
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
                    You filled <span className="font-bold text-[hsl(var(--sg-accent))]">{correctCount}</span>/9 cells
                  </p>
                  {rarityScore !== null && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Trophy className="w-5 h-5 text-[hsl(var(--sg-accent))]" />
                      <span className="text-lg font-bold text-[hsl(var(--sg-accent))]">
                        Rarity Score: {rarityScore}%
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Lower rarity = more impressive picks!</p>
                  <ShareButtons
                    score={rarityScore !== null ? `a Rarity Score of ${rarityScore}% (${correctCount}/9)` : `${correctCount}/9 cells`}
                    gameName="Soccer Grid"
                    gamePath="/soccer-grid"
                  />
                  <p className="mt-4 text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p>
                </div>
              </div>
            )}
          </>
        )}

        <GameSeoContent
          title="Soccer Grid | DoUKnowBall"
          description="A daily 3×3 grid puzzle where each cell requires a soccer player matching both the row and column criteria. Features clubs, leagues, nationalities, and achievements."
          howToPlay={[
            'Each cell in the 3×3 grid requires a player who satisfies both the row and column attribute',
            'Attributes include clubs, leagues, positions, nationalities, and achievements',
            'Correct answers show a rarity percentage — rarer picks earn a better score',
            'You have 15 guesses to complete the grid. Wrong answers cost a guess.',
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
        <Footer />
      </div>

      <SoccerGridHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default SoccerGrid;
