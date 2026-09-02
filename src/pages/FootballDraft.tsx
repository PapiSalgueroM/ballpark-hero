import { useState, useEffect } from 'react';
import { useFootballDraft } from '@/hooks/useFootballDraft';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
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
    mode,
    switchMode,
    puzzle,
    currentPlayer,
    currentIndex,
    guesses,
    revealLevel,
    revealMore,
    submitGuess,
    resetGame,
    gameStatus,
    totalPoints,
    maxPoints,
    roundOptions,
    isLoading,
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
    <>
      <PageSeo
        title="NFL Draft Guesser - Guess the Draft Round | DoUKnowBall"
        description="A player's college, position, and combine stats are revealed. Guess what round they were drafted. Daily NFL trivia."
        path="/football-draft"
      />
      <GameShell
        width="narrow"
        emoji="🏈"
        title="DRAFT GUESSER"
        subtitle="Guess what round each player was drafted. Reveal clues progressively"
        headerExtra={
          <>
            <button
              onClick={() => setShowRules(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-[hsl(var(--ft-gold))] transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>

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
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">
                Player: <span className="font-semibold text-foreground">{Math.min(currentIndex + 1, 5)}</span>/5
              </span>
              <span className="text-muted-foreground">
                Points: <span className="font-semibold text-[hsl(var(--ft-gold))]">{totalPoints}</span>/{maxPoints}
              </span>
            </div>
          </>
        }
      >
        {/* Loading guard */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's puzzle…</p>
          </div>
        )}

        {/* Current player card */}
        {!isLoading && gameStatus === 'playing' && currentPlayer && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {puzzle.players.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    i < currentIndex && guesses[i].submitted
                      ? guesses[i].points >= 15
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
                  <span className="text-sm italic">Hidden, reveal for a clue</span>
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

              {/* Reveal 4: Draft year */}
              {revealLevel >= 4 ? (
                <div className="flex items-center gap-3 text-foreground animate-cell-reveal">
                  <span className="text-xs font-semibold text-[hsl(var(--ft-gold))] uppercase w-20">Draft Year</span>
                  <span className="font-semibold">{currentPlayer.draftYear}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs font-semibold uppercase w-20">Draft Year</span>
                  <span className="text-sm italic">Hidden, reveal for a clue</span>
                </div>
              )}
            </div>

            {/* Reveal button */}
            {revealLevel < 4 && !showingResult && (
              <button
                onClick={revealMore}
                className="flex items-center justify-center gap-2 mx-auto min-h-[40px] px-4 py-2.5 text-sm rounded-lg border border-[hsl(var(--ft-gold)/0.3)] text-[hsl(var(--ft-gold))] hover:bg-[hsl(var(--ft-navy)/0.5)] transition-colors mb-4"
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
                  currentGuess.points >= 15 && 'text-correct',
                  currentGuess.points > 0 && currentGuess.points < 15 && 'text-[hsl(var(--ft-gold))]',
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {roundOptions.map((round) => (
                    <button
                      key={round}
                      onClick={() => setSelectedRound(round)}
                      className={cn(
                        'min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap',
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
        {!isLoading && gameStatus === 'complete' && (
          <div className="mt-4 flex justify-center">
            <ResultScreen
              won={totalPoints >= maxPoints * 0.4}
              outcomeEmoji={totalPoints >= maxPoints * 0.7 ? '🏆' : totalPoints >= maxPoints * 0.4 ? '🎯' : '🏈'}
              headline={`${totalPoints}/${maxPoints} Points!`}
              emojiGrid={guesses.map(g => g.points >= 15 ? '🟩' : g.points > 0 ? '🟨' : '🟥').join('')}
              share={{
                score: `${totalPoints}/${maxPoints} points on today's Draft Guesser`,
                gameName: 'Pro Football Draft Guesser',
                gamePath: '/football-draft',
              }}
              onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
              playNext={mode !== 'unlimited' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new puzzle!</p> : undefined}
            >
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
                        g.points >= 15 && 'text-correct',
                        g.points > 0 && g.points < 15 && 'text-[hsl(var(--ft-gold))]',
                        g.points === 0 && 'text-destructive',
                      )}>
                        +{g.points}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ResultScreen>
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Pro Football Draft Guesser | DoUKnowBall"
          description="A daily game where you guess what round NFL players were drafted based on progressively revealed clues: college, combine stats, and more."
          howToPlay={[
            'Each round shows a mystery NFL player with their position and college',
            'Reveal additional clues: size, 40-yard dash, bench press and vertical jump, then draft year',
            'Guess the draft round: 1st through 7th, or Undrafted',
            'Guess early for more: exact round = 30 pts with no clues, down to 15 after all clues; one off = 8, two off = 3',
            'Play 5 players per game. New challenge daily',
          ]}
          examples={[
            "Quarterback, Michigan, 6'4\", 4.90 40-yard dash: 6th Round (Tom Brady)",
            "Defensive End, Ohio State, 6'5\", 4.67 40: 1st Round (Chase Young)",
            "Wide Receiver, Alabama, 6'1\", 4.27 40: 1st Round (Henry Ruggs III)",
            "Linebacker, Penn State, 6'2\", 4.39 40: 1st Round (Micah Parsons)",
            "Running Back, LSU, 5'11\", 4.40 40: Undrafted (Darrel Williams)",
            "Tight End, Iowa, 6'5\", 4.87 40: 2nd Round (T.J. Hockenson)"
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="football-draft" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
      </GameShell>

      <FootballDraftHowToPlay open={showRules} onOpenChange={setShowRules} />
    </>
  );
};

export default FootballDraft;
