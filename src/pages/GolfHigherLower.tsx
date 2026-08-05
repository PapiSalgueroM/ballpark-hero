import { useGolfHL } from '@/hooks/useGolfHL';
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
 * First game in the Golf tab (owner 2026-08-05). Stat axis is career MAJOR
 * championship wins, straight from public.golf_majors: Nicklaus 18, Tiger 15,
 * up through McIlroy completing the career slam in 2026.
 */
const GolfHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
    hard, toggleHard,
  } = useGolfHL();

  return (
    <>
      <PageSeo
        title="Golf Higher or Lower - Major Championships Game | DoUKnowBall"
        description="Which golfer won more majors? Nicklaus, Tiger, Hogan, McIlroy, Scheffler. Compare legends side by side in this daily golf challenge."
        path="/golf-higher-lower"
      />
      <GameShell
        width="narrow"
        title="⛳ HIGHER OR LOWER"
        subtitle="Which golfer won more major championships?"
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
                (i === 0 && lastResult.player1.majors >= lastResult.player2.majors) ||
                (i === 1 && lastResult.player2.majors >= lastResult.player1.majors)
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
                  <span className="text-3xl">⛳</span>
                  <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {player.nationality} · majors {player.firstWin}-{player.lastWin}
                  </span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-gold animate-cell-reveal">
                      {player.majors} Majors
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
              outcomeEmoji={correctCount >= 8 ? '🏆' : correctCount >= 5 ? '⛳' : '🏌️'}
              headline={`${correctCount}/${totalRounds} Correct!`}
              statLine={<>Total Score: <span className="font-bold text-gold">{totalScore}</span></>}
              funFact={`(${correctCount}×10 base + ${totalScore - correctCount * 10} streak bonus)`}
              emojiGrid={`⛳ Golf Higher or Lower: ${totalScore} pts (${correctCount}/${totalRounds})`}
              share={{
                score: `${totalScore} points (${correctCount}/${totalRounds}) on today's Golf Higher or Lower`,
                gameName: 'Golf Higher or Lower',
                gamePath: '/golf-higher-lower',
              }}
              onPlayAgain={mode === 'unlimited' ? () => switchMode('unlimited') : undefined}
              playNext={mode !== 'unlimited' && <p className="text-sm text-muted-foreground">Come back tomorrow for a new challenge!</p>}
            />
          </div>
        )}

        <GameSeoContent
          title="Golf Higher or Lower | DoUKnowBall"
          description="Two major champions, side by side. Which one won more majors? From Old Tom Morris to Scottie Scheffler, the whole history of championship golf is in the pool."
          howToPlay={[
            'Two major champions shown side by side with their era and country',
            'Tap the golfer you think won MORE major championships',
            'Exact ties count as correct whichever side you pick',
            '10 rounds per game: 10 points per correct answer, +5 per streak step',
            'Daily challenge (same pairs for everyone) or unlimited random mode',
          ]}
          examples={[
            'Nicklaus (18) vs Tiger (15), the two mountains at the top',
            'Rory McIlroy finally has the career slam, 6 majors and counting',
            'Walter Hagen quietly sits on 11, more than anyone but Jack and Tiger',
            'Koepka (5) vs Scheffler (4) for the modern era bragging rights',
          ]}
        />

        <AdBanner slot="1234567903" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="golf-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default GolfHigherLower;
