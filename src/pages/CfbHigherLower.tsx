import { useCfbHL } from '@/hooks/useCfbHL';
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
 * Sixth Higher/Lower port (task #23). Stat axis is career COLLEGE passing
 * yards — the pool mixes record-book kings (Keenum 19,217) with famous NFL
 * names whose college totals surprise people (Brady 4,773, Cam 2,908).
 * Values verified vs cfb_qb_stats; NCAA official convention (see data file).
 */
const CfbHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
  } = useCfbHL();

  return (
    <>
      <PageSeo
        title="College Football Higher or Lower - Career Passing Yards | DoUKnowBall"
        description="Which QB threw for more career college yards? Keenum, Tebow, Mahomes, Brady — compare college careers side by side in this daily CFB challenge."
        path="/cfb-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🎓 HIGHER OR LOWER"
        subtitle="Which QB threw for more career college yards?"
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
            {currentPair.map((player, i) => {
              const side = i === 0 ? 'left' : 'right';
              const lastResult = showingResult ? results[results.length - 1] : null;
              const isWinner = showingResult && lastResult && (
                (i === 0 && lastResult.player1.careerPassYds >= lastResult.player2.careerPassYds) ||
                (i === 1 && lastResult.player2.careerPassYds >= lastResult.player1.careerPassYds)
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
                  <span className="text-3xl">🎓</span>
                  <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                  <span className="text-xs text-muted-foreground">{player.schools} · {player.firstYear}–{player.lastYear}</span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-gold animate-cell-reveal">
                      {player.careerPassYds.toLocaleString()} yds
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
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🎓' : '🏈'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`🎓 CFB Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's CFB Higher or Lower`,
                gameName: 'CFB Higher or Lower',
                gamePath: '/cfb-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          title="College Football Higher or Lower | DoUKnowBall"
          description="Two college QBs, side by side. Which one threw for more career yards? Record-book legends against famous NFL names with surprising college totals."
          howToPlay={[
            'Two QBs shown side by side with their schools and college era',
            'Tap the player you think threw for MORE career college passing yards',
            '10 rounds per game: 10 points per correct answer',
            'Build a streak for bonus points (+5 per consecutive correct)',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'Case Keenum (19,217) — the all-time record nobody expects',
            'Tom Brady threw for just 4,773 yards at Michigan',
            'Mahomes vs Peyton Manning — separated by 51 yards',
            'Tebow vs Matt Ryan: gators or Eagles-era BC?',
          ]}
        />

        <AdBanner slot="1234567903" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="cfb-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default CfbHigherLower;
