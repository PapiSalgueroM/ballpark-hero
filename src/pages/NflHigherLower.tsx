import { useNflHL } from '@/hooks/useNflHL';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ArrowUp, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Multi-stat edition (owner 2026-08-05). Every round rotates through a stat
 * category: TDs scored, passing yards, passing TDs, rushing yards, receiving
 * yards, receptions. All values baked from nflfastr with careers starting
 * 2000+ so nothing is silently truncated.
 */
const NflHigherLower = () => {
  const {
    mode, switchMode, activeRound, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
    hard, toggleHard,
  } = useNflHL();

  return (
    <>
      <PageSeo
        title="NFL Higher or Lower - Career Stats Game | DoUKnowBall"
        description="Passing yards, touchdowns, receptions and more. Which NFL star has the bigger career number? A new stat every round in this daily football challenge."
        path="/nfl-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🏈 HIGHER OR LOWER"
        subtitle="A new stat every round. Who has the bigger career number?"
        headerExtra={
          <>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                onClick={() => switchMode('daily')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                  mode === 'daily' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >Daily</button>
              <button
                onClick={() => switchMode('unlimited')}
                className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                  mode === 'unlimited' ? 'bg-primary text-primary-foreground border-primary/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >Unlimited</button>
              <button
                onClick={toggleHard}
                title="Hard mode: close-gap pairs (unlimited only)"
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  hard ? 'bg-destructive/15 text-destructive border-destructive/40' : 'bg-secondary text-muted-foreground border-border'
                )}
              >😈 Hard</button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">Round: <span className="font-semibold text-foreground">{Math.min(currentRound + 1, totalRounds)}</span>/{totalRounds}</span>
              <span className="text-muted-foreground">Score: <span className="font-semibold text-gold">{totalScore}</span></span>
              {streak > 1 && (
                <span className="flex items-center gap-1 text-gold">
                  <Flame className="w-4 h-4" /> {streak}🔥
                </span>
              )}
            </div>
          </>
        }
      >
        {gameStatus === 'playing' && currentPair && activeRound && (
          <>
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-1.5 text-sm font-bold text-primary">
                {activeRound.category.question}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {currentPair.map((player, i) => {
                const side = i === 0 ? 'left' : 'right';
                const lastResult = showingResult ? results[results.length - 1] : null;
                const isWinner = showingResult && lastResult && (
                  (i === 0 && lastResult.p1.value >= lastResult.p2.value) ||
                  (i === 1 && lastResult.p2.value >= lastResult.p1.value)
                );

                return (
                  <button
                    key={player.name}
                    onClick={() => !showingResult && makeGuess(side as 'left' | 'right')}
                    disabled={showingResult}
                    className={cn(
                      'flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all text-center',
                      showingResult
                        ? isWinner
                          ? 'bg-correct/20 border-correct/50'
                          : 'bg-destructive/15 border-destructive/40'
                        : 'bg-card border-border hover:border-primary/50 hover:scale-[1.02] cursor-pointer'
                    )}
                  >
                    <span className="text-3xl">🏈</span>
                    <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                    <span className="text-xs text-muted-foreground">{player.position} · played until {player.lastSeason}</span>
                    <span className="text-xs text-muted-foreground">{player.teams}</span>

                    {showingResult ? (
                      <span className="text-2xl font-bold text-gold animate-cell-reveal">
                        {player.value.toLocaleString()} {activeRound.category.unit}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                        <ArrowUp className="w-4 h-4" /> Higher?
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {gameStatus === 'complete' && (
          <div className="mt-4 flex justify-center">
            <ResultScreen
              won={correctCount >= 5}
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🏈' : '🥴'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`🏈 NFL Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's NFL Higher or Lower`,
                gameName: 'NFL Higher or Lower',
                gamePath: '/nfl-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="NFL Higher or Lower | DoUKnowBall"
          description="A different stat every round: passing yards, passing TDs, rushing yards, receiving yards, receptions and touchdowns scored. Which NFL star has the bigger career number?"
          howToPlay={[
            'Every round names a stat category at the top of the board',
            'Two players shown side by side with position, era, and teams',
            'Tap the player you think has the BIGGER career number in that stat',
            '10 rounds per game: 10 points per correct answer, +5 per streak step',
            'Daily challenge (same rounds for everyone) or unlimited random mode',
          ]}
          examples={[
            'Passing yards: Brady (89,216) vs Brees (80,428), closer than you think',
            'TDs scored: LaDainian Tomlinson (162) vs Adrian Peterson (126)',
            'Receptions: Fitzgerald (1,430) vs Jason Witten (1,228)',
            'Rushing yards: Frank Gore quietly sits at 16,000',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nfl-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default NflHigherLower;
