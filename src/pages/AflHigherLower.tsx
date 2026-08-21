import { useAflHL } from '@/hooks/useAflHL';
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
 * The site's first Australian rules game (Round 231). Stat axis is career
 * VFL/AFL goals from src/data/aflGoalKickers.ts: Lockett 1,360 at the top,
 * retired players only so the numbers never move.
 */
const AflHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
    hard, toggleHard,
  } = useAflHL();

  return (
    <>
      <PageSeo
        title="AFL Higher or Lower - Career Goals Game | DoUKnowBall"
        description="Which footy legend kicked more career goals? Lockett, Coventry, Dunstall, Franklin, Ablett. Compare AFL greats side by side in this daily challenge."
        path="/afl-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🏉 HIGHER OR LOWER"
        subtitle="Which legend kicked more career goals?"
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
                (i === 0 && lastResult.player1.goals >= lastResult.player2.goals) ||
                (i === 1 && lastResult.player2.goals >= lastResult.player1.goals)
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
                  <span className="text-3xl">🏉</span>
                  <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {player.clubs} · {player.firstYear}-{player.lastYear}
                  </span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-gold animate-cell-reveal">
                      {player.goals.toLocaleString()} Goals
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
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🏉' : '😅'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`🏉 AFL Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's AFL Higher or Lower`,
                gameName: 'AFL Higher or Lower',
                gamePath: '/afl-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="AFL Higher or Lower | DoUKnowBall"
          description="Two footy legends, side by side. Which one kicked more career goals? From Gordon Coventry in the 1920s to Buddy Franklin, the whole history of the game is in the pool."
          howToPlay={[
            'Two goal kicking greats shown side by side with their clubs and era',
            'Tap the player you think kicked MORE career VFL/AFL goals',
            'Exact ties count as correct whichever side you pick',
            '10 rounds per game: 10 points per correct answer, +5 per streak step',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'Tony Lockett (1,360) is the all time record, the only man past 1,300',
            'Gordon Coventry kicked 1,299 for Collingwood before World War Two',
            'Buddy Franklin (1,066) is the only modern player in the thousand club',
            'Wayne Carey and Peter Hudson both sit on exactly 727, a free tie',
          ]}
        />

        <AdBanner slot="1234567903" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="afl-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default AflHigherLower;
