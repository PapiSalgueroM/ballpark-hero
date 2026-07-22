import { useTennisHL } from '@/hooks/useTennisHL';
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
 * Fifth Higher/Lower port (task #23). Stat axis is career GRAND SLAM SINGLES
 * TITLES — men's and women's champions share one pool on purpose, because
 * cross-tour matchups (Serena 23 vs Federer 20) are the whole fun. Counts
 * verified vs tennis_grand_slam_winners with marriage-name merges applied;
 * ties (24/24, 22/22, 18/18…) score as correct for either pick.
 */
const TennisHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
    hard, toggleHard,
  } = useTennisHL();

  return (
    <>
      <PageSeo
        title="Tennis Higher or Lower - Grand Slam Titles Game | DoUKnowBall"
        description="Which tennis legend won more Grand Slam singles titles? Djokovic, Serena, Federer, Graf — compare them side by side in this daily tennis challenge."
        path="/tennis-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🎾 HIGHER OR LOWER"
        subtitle="Which legend won more Grand Slam singles titles?"
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
            {currentPair.map((player, i) => {
              const side = i === 0 ? 'left' : 'right';
              const lastResult = showingResult ? results[results.length - 1] : null;
              const isWinner = showingResult && lastResult && (
                (i === 0 && lastResult.player1.slams >= lastResult.player2.slams) ||
                (i === 1 && lastResult.player2.slams >= lastResult.player1.slams)
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
                  <span className="text-3xl">🎾</span>
                  <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {player.tour === 'M' ? "Men's" : "Women's"} · majors {player.firstYear}–{player.lastYear}
                  </span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-gold animate-cell-reveal">
                      {player.slams} Slams
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
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🎾' : '🥎'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`🎾 Tennis Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's Tennis Higher or Lower`,
                gameName: 'Tennis Higher or Lower',
                gamePath: '/tennis-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          title="Tennis Higher or Lower | DoUKnowBall"
          description="Two tennis greats, side by side. Which one won more Grand Slam singles titles? Men's and women's legends in one pool, from Bill Tilden to Carlos Alcaraz."
          howToPlay={[
            'Two champions shown side by side with their tour and title era',
            'Tap the player you think won MORE Grand Slam singles titles',
            'Exact ties count as correct whichever side you pick',
            '10 rounds per game: 10 points per correct answer, +5 per streak step',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'Djokovic (24) vs Margaret Court (24) — the all-time tie at the top',
            'Serena (23) vs Federer (20) — crossing the tours',
            'Nadal and Graf both sit on exactly 22',
            'Alcaraz vs Sampras — the new wave against the 90s king',
          ]}
        />

        <AdBanner slot="1234567902" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="tennis-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default TennisHigherLower;
