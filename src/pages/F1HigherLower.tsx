import { useF1HL } from '@/hooks/useF1HL';
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
 * Third Higher/Lower port (task #23). Stat axis is career GRAND PRIX WINS -
 * not points, because scoring systems changed so much across eras that points
 * would make every pre-2010 driver auto-low and the game guessable.
 */
const F1HigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
    hard, toggleHard,
  } = useF1HL();

  return (
    <>
      <PageSeo
        title="F1 Higher or Lower - Career Wins Game | DoUKnowBall"
        description="Which Formula 1 driver won more Grands Prix? Compare legends from Fangio to Verstappen in this daily F1 trivia challenge."
        path="/f1-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🏎️ HIGHER OR LOWER"
        subtitle="Which driver won more Grands Prix?"
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
        {gameStatus === 'playing' && currentPair && (
          <div className="grid grid-cols-2 gap-4">
            {currentPair.map((driver, i) => {
              const side = i === 0 ? 'left' : 'right';
              const lastResult = showingResult ? results[results.length - 1] : null;
              const isWinner = showingResult && lastResult && (
                (i === 0 && lastResult.player1.careerWins >= lastResult.player2.careerWins) ||
                (i === 1 && lastResult.player2.careerWins >= lastResult.player1.careerWins)
              );

              return (
                <button
                  key={driver.name}
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
                  <span className="text-3xl">🏎️</span>
                  <span className="text-lg font-bold text-foreground font-display">{driver.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {driver.firstSeason}-{driver.lastSeason}
                    {driver.titles > 0 ? ` · ${driver.titles}× champion` : ''}
                  </span>
                  <span className="text-xs text-muted-foreground">{driver.constructors}</span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-gold animate-cell-reveal">
                      {driver.careerWins} wins
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
        )}

        {gameStatus === 'complete' && (
          <div className="mt-4 flex justify-center">
            <ResultScreen
              won={correctCount >= 5}
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🏎️' : '🛞'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`🏎️ F1 Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's F1 Higher or Lower`,
                gameName: 'F1 Higher or Lower',
                gamePath: '/f1-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="F1 Higher or Lower | DoUKnowBall"
          description="Two Formula 1 drivers, side by side. Which one won more Grands Prix? Every driver with 8+ career wins, from Fangio and Moss to Hamilton and Verstappen."
          howToPlay={[
            'Two drivers shown side by side with era, titles, and teams',
            'Tap the driver you think won MORE Grands Prix',
            '10 rounds per game: 10 points per correct answer',
            'Build a streak for bonus points (+5 per consecutive correct)',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'Hamilton (105 wins) vs Schumacher (91 wins)',
            'Senna vs Prost, the rivalry, settled by numbers',
            'Fangio won 5 titles… from how many wins?',
            'Moss: the most wins by a driver who never won the title',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="f1-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default F1HigherLower;
