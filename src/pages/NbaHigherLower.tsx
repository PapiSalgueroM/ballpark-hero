import { useNbaHL } from '@/hooks/useNbaHL';
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
 * Direct port of HockeyHigherLower (task #23). Two intentional deltas:
 * no flag (the bref source carries no nationality, the card leads with
 * position + final season instead), and no separate how-to-play modal
 * (the rules fit in one subtitle line; GameSeoContent documents the rest).
 */
const NbaHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
    hard, toggleHard,
  } = useNbaHL();

  return (
    <>
      <PageSeo
        title="NBA Higher or Lower - Career Points Game | DoUKnowBall"
        description="Which NBA player scored more career points? Compare legends side by side in this daily basketball trivia challenge."
        path="/nba-higher-lower"
      />
      <GameShell
        width="narrow"
        title="🏀 HIGHER OR LOWER"
        subtitle="Which player scored more career points?"
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
                (i === 0 && lastResult.player1.careerPoints >= lastResult.player2.careerPoints) ||
                (i === 1 && lastResult.player2.careerPoints >= lastResult.player1.careerPoints)
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
                  <span className="text-3xl">🏀</span>
                  <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                  <span className="text-xs text-muted-foreground">{player.position} · played until {player.lastSeason}</span>
                  <span className="text-xs text-muted-foreground">{player.teams}</span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-gold animate-cell-reveal">
                      {player.careerPoints.toLocaleString()} pts
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
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🏀' : '🧱'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`🏀 NBA Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's NBA Higher or Lower`,
                gameName: 'NBA Higher or Lower',
                gamePath: '/nba-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          title="NBA Higher or Lower | DoUKnowBall"
          description="Two NBA players, side by side. Which one scored more career points? Daily challenge and unlimited mode with streak bonuses, drawn from the all-time top 80 scorers."
          howToPlay={[
            'Two players shown side by side with position, era, and franchises',
            'Tap the player you think scored MORE career points',
            '10 rounds per game: 10 points per correct answer',
            'Build a streak for bonus points (+5 per consecutive correct)',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'LeBron (42,184 pts) vs Kareem (38,387 pts)',
            'Jordan vs Kobe: who finished with more?',
            'Curry vs Durant: closer than you think?',
            'Oscar Robertson vs Jerry West, the 60s showdown',
            'Iverson vs Wade: who outscored whom?',
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nba-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default NbaHigherLower;
