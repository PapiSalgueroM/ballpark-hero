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
 * Direct port of NbaHigherLower (task #23). Stat axis is career TOUCHDOWNS
 * SCORED (rushing + receiving) — QBs are excluded because thrown TDs are a
 * different stat, and the pool only holds careers that started 2000+ so the
 * nflfastr coverage window can't silently truncate anyone's total.
 */
const NflHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
  } = useNflHL();

  return (
    <>
      <PageSeo
        title="NFL Higher or Lower - Career Touchdowns Game | DoUKnowBall"
        description="Which NFL star scored more career touchdowns? Compare running backs, receivers and tight ends side by side in this daily football challenge."
        path="/nfl-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🏈 HIGHER OR LOWER"
        subtitle="Which player scored more career touchdowns?"
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
                (i === 0 && lastResult.player1.careerTds >= lastResult.player2.careerTds) ||
                (i === 1 && lastResult.player2.careerTds >= lastResult.player1.careerTds)
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
                      {player.careerTds} TDs
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
          title="NFL Higher or Lower | DoUKnowBall"
          description="Two NFL stars, side by side. Which one scored more career touchdowns? Rushing and receiving TDs count; the pool is the 60 highest-scoring skill-position players of the 2000s onward."
          howToPlay={[
            'Two players shown side by side with position, era, and teams',
            'Tap the player you think scored MORE career touchdowns (rushing + receiving)',
            '10 rounds per game: 10 points per correct answer',
            'Build a streak for bonus points (+5 per consecutive correct)',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'LaDainian Tomlinson (162 TDs) vs Adrian Peterson (126)',
            'Gronk vs Antonio Gates: which tight end found the end zone more?',
            'Derrick Henry vs Mike Evans — power back or red-zone receiver?',
            'Larry Fitzgerald vs Calvin Johnson: the WR showdown',
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nfl-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default NflHigherLower;
