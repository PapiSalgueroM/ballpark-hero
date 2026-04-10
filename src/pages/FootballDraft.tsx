import { useState, useEffect } from 'react';
import { useFootballDraft } from '@/hooks/useFootballDraft';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, Eye, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FootballDraftHowToPlay } from '@/components/football-draft/FootballDraftHowToPlay';

const ROUND_LABELS: Record<number, string> = {
  1: '1st Round',
  2: '2nd Round',
  3: '3rd Round',
  4: '4th Round',
  5: '5th Round',
  6: '6th Round',
  7: '7th Round',
  0: 'Undrafted',
};

const FootballDraft = () => {
  const {
    puzzle,
    currentPlayer,
    currentIndex,
    guesses,
    revealLevel,
    revealMore,
    submitGuess,
    gameStatus,
    totalPoints,
    maxPoints,
    roundOptions,
  } = useFootballDraft();

  const [showRules, setShowRules] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem('fd-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('fd-rules-seen', '1');
    }
  }, []);

  // Reset selection when moving to next player
  useEffect(() => {
    setSelectedRound(null);
  }, [currentIndex]);

  const currentGuess = guesses[currentIndex];
  const showingResult = currentGuess?.submitted;

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="NFL Draft Guesser - Guess the Draft Round | DoUKnowBall"
        description="A player's college, position, and combine stats are revealed. Guess what round they were drafted. Daily NFL trivia."
        path="/football-draft"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--ft-gold))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--ft-gold))]">
            🏈 DRAFT GUESSER
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Guess what round each player was drafted — reveal clues progressively
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">
              Player: <span className="font-semibold text-foreground">{Math.min(currentIndex + 1, 5)}</span>/5
            </span>
            <span className="text-muted-foreground">
              Points: <span className="font-semibold text-[hsl(var(--ft-gold))]">{totalPoints}</span>/{maxPoints}
            </span>
          </div>
        </header>

        {/* Current player card */}
        {gameStatus === 'playing' && currentPlayer && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {puzzle.players.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    i < currentIndex && guesses[i].submitted
                      ? guesses[i].points === 10
                        ? 'bg-correct'
                        : guesses[i].points > 0
                          ? 'bg-[hsl(var(--ft-gold))]'
                          : 'bg-destructive'
                      : i === currentIndex
                        ? 'bg-[hsl(var(--ft-gold))] scale-125'
                        : 'bg-muted'
                  )}
                />
              ))}
            </div>

            {/* Clues */}
            <div className="space-y-3 mb-6">
              {/* Always visible: position + college */}
              <div className="flex items-center gap-3 text-foreground">
                <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">Position</span>
                <span className="font-semibold">{currentPlayer.position}</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">College</span>
                <span className="font-semibold">{currentPlayer.college}</span>
              </div>

              {/* Reveal 1: Height/Weight */}
              {revealLevel >= 1 ? (
                <div className="flex items-center gap-3 text-foreground animate-cell-reveal">
                  <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">Size</span>
                  <span className="font-semibold">{currentPlayer.heightWeight}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase w-20">Size</span>
                  <span className="text-sm italic">Hidden — reveal for a clue</span>
                </div>
              )}

              {/* Reveal 2: 40 time */}
              {revealLevel >= 2 ? (
                <div className="flex items-center gap-3 text-foreground animate-cell-reveal">
                  <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">40-yard</span>
                  <span className="font-semibold">{currentPlayer.fortyTime ?? 'Did not run'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase w-20">40-yard</span>
                  <span className="text-sm italic">Hidden</span>
                </div>
              )}

              {/* Reveal 3: Other combine stats */}
              {revealLevel >= 3 ? (
                <div className="space-y-3 animate-cell-reveal">
                  <div className="flex items-center gap-3 text-foreground">
                    <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">Bench</span>
                    <span className="font-semibold">{currentPlayer.benchPress ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">Vertical</span>
                    <span className="font-semibold">{currentPlayer.verticalJump ?? 'N/A'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase w-20">Combine</span>
                  <span className="text-sm italic">Hidden</span>
                </div>
              )}
            </div>

            {/* Reveal button */}
            {revealLevel < 3 && !showingResult && (
              <button
                onClick={revealMore}
                className="flex items-center gap-2 mx-auto px-4 py-2 text-sm rounded-lg border border-[hsl(var(--ft-gold)/0.3)] text-[hsl(var(--ft-gold))] hover:bg-[hsl(var(--ft-navy)/0.5)] transition-colors mb-4"
              >
                <Eye className="w-4 h-4" />
                Reveal Next Clue
              </button>
            )}

            {/* Showing result after guess */}
            {showingResult && (
              <div className="text-center mb-4 py-3 rounded-xl bg-[hsl(var(--ft-navy)/0.3)] border border-[hsl(var(--ft-gold)/0.2)] animate-cell-reveal">
                <p className="font-bold text-lg text-foreground">{currentPlayer.name}</p>
                <p className="text-[hsl(var(--ft-gold))] font-semibold">
                  {currentPlayer.draftRound
                    ? `Round ${currentPlayer.draftRound}${currentPlayer.draftPick ? `, Pick #${currentPlayer.draftPick}` : ''} (${currentPlayer.draftYear})`
                    : `Undrafted (${currentPlayer.draftYear})`}
                </p>
                <p className={cn(
                  'text-sm font-bold mt-1',
                  currentGuess.points === 10 && 'text-correct',
                  currentGuess.points === 5 && 'text-[hsl(var(--ft-gold))]',
                  currentGuess.points === 2 && 'text-muted-foreground',
                  currentGuess.points === 0 && 'text-destructive',
                )}>
                  +{currentGuess.points} points
                </p>
              </div>
            )}

            {/* Round selection */}
            {!showingResult && (
              <div>
                <p className="text-center text-xs text-muted-foreground mb-3">
                  What round was this player drafted?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {roundOptions.map((round) => (
                    <button
                      key={round}
                      onClick={() => setSelectedRound(round)}
                      className={cn(
                        'px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all',
                        selectedRound === round
                          ? 'bg-[hsl(var(--ft-navy))] text-[hsl(var(--ft-gold))] border-[hsl(var(--ft-gold))]'
                          : 'bg-secondary text-secondary-foreground border-border hover:border-[hsl(var(--ft-gold)/0.5)]'
                      )}
                    >
                      {ROUND_LABELS[round]}
                    </button>
                  ))}
                </div>
                {selectedRound !== null && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => submitGuess(selectedRound)}
                      className="px-8 py-3 rounded-xl bg-[hsl(var(--ft-navy))] text-[hsl(var(--ft-gold))] font-bold text-lg hover:opacity-90 transition-opacity border border-[hsl(var(--ft-gold)/0.3)]"
                    >
                      Submit Guess
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Game complete */}
        {gameStatus === 'complete' && (
          <div className="mt-4 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-5xl mb-3">{totalPoints >= 40 ? '🏆' : totalPoints >= 25 ? '🎯' : '🏈'}</div>
              <h2 className="text-2xl font-bold text-[hsl(var(--ft-gold))] font-display mb-2">
                {totalPoints}/{maxPoints} Points!
              </h2>

              {/* Per-player breakdown */}
              <div className="space-y-2 my-4 text-left">
                {puzzle.players.map((player, i) => {
                  const g = guesses[i];
                  return (
                    <div key={player.name} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-secondary/50">
                      <div>
                        <span className="font-semibold text-foreground">{player.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {player.draftRound ? `Rd ${player.draftRound}` : 'UDFA'}
                        </span>
                      </div>
                      <span className={cn(
                        'font-bold',
                        g.points === 10 && 'text-correct',
                        g.points === 5 && 'text-[hsl(var(--ft-gold))]',
                        g.points === 2 && 'text-muted-foreground',
                        g.points === 0 && 'text-destructive',
                      )}>
                        +{g.points}
                      </span>
                    </div>
                  );
                })}
              </div>

              <ShareButtons
                score={`${totalPoints}/${maxPoints} points on today's Draft Guesser`}
                gameName="Pro Football Draft Guesser"
                gamePath="/football-draft"
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="Pro Football Draft Guesser | DoUKnowBall"
          description="A daily game where you guess what round NFL players were drafted based on progressively revealed clues — college, combine stats, and more."
          howToPlay={[
            'Each round shows a mystery NFL player with their position and college',
            'Reveal additional clues: size, 40-yard dash, bench press, and vertical jump',
            'Guess the draft round: 1st through 7th, or Undrafted',
            'Exact round = 10 pts, one off = 5 pts, two off = 2 pts',
            'Play 5 players per game — new challenge daily',
          ]}
          examples={[
            "Quarterback, Michigan, 6'4\", 4.90 40-yard dash — 6th Round (Tom Brady)",
            "Defensive End, Ohio State, 6'5\", 4.67 40 — 1st Round (Chase Young)",
            "Wide Receiver, Alabama, 6'1\", 4.27 40 — 1st Round (Henry Ruggs III)",
            "Linebacker, Penn State, 6'2\", 4.39 40 — 1st Round (Micah Parsons)",
            "Running Back, LSU, 5'11\", 4.40 40 — Undrafted (Darrel Williams)",
            "Tight End, Iowa, 6'5\", 4.87 40 — 2nd Round (T.J. Hockenson)"
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="football-draft" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <FootballDraftHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default FootballDraft;
