import { useState, useEffect } from 'react';
import { FlagImg } from '@/components/FlagImg';
import { useHockeyHL } from '@/hooks/useHockeyHL';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, ArrowUp, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HockeyHLHowToPlay } from '@/components/hockey-hl/HockeyHLHowToPlay';

const HockeyHigherLower = () => {
  const {
    mode, switchMode, currentPair, currentRound, results,
    showingResult, streak, gameStatus, correctCount, totalScore,
    makeGuess, totalRounds,
  } = useHockeyHL();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('hkhl-rules-seen');
    if (!seen) { setShowRules(true); localStorage.setItem('hkhl-rules-seen', '1'); }
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Hockey Higher or Lower - NHL Career Points Game | DoUKnowBall"
        description="Which hockey player has more career points? Compare players side by side in this daily NHL trivia challenge."
        path="/hockey-higher-lower"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button onClick={() => setShowRules(true)} className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--hk-silver))] transition-colors" aria-label="How to play">
            <HelpCircle className="w-6 h-6" />
          </button>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--hk-silver))]">
            🏒 HIGHER OR LOWER
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Which player has more career points?
          </p>

          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button
              onClick={() => switchMode('daily')}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                mode === 'daily' ? 'bg-[hsl(var(--hk-blue))] text-[hsl(var(--hk-silver))] border-[hsl(var(--hk-silver)/0.3)]' : 'bg-secondary text-muted-foreground border-border'
              )}
            >Daily</button>
            <button
              onClick={() => switchMode('unlimited')}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all',
                mode === 'unlimited' ? 'bg-[hsl(var(--hk-blue))] text-[hsl(var(--hk-silver))] border-[hsl(var(--hk-silver)/0.3)]' : 'bg-secondary text-muted-foreground border-border'
              )}
            >Unlimited</button>
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <span className="text-muted-foreground">Round: <span className="font-semibold text-foreground">{Math.min(currentRound + 1, totalRounds)}</span>/{totalRounds}</span>
            <span className="text-muted-foreground">Score: <span className="font-semibold text-[hsl(var(--hk-silver))]">{totalScore}</span></span>
            {streak > 1 && (
              <span className="flex items-center gap-1 text-[hsl(var(--hk-silver))]">
                <Flame className="w-4 h-4" /> {streak}🔥
              </span>
            )}
          </div>
        </header>

        {/* Current matchup */}
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
                      : 'bg-card border-border hover:border-[hsl(var(--hk-silver)/0.5)] hover:scale-[1.02] cursor-pointer'
                  )}
                >
                  <FlagImg name={player.country} size={36} />
                  <span className="text-lg font-bold text-foreground font-display">{player.name}</span>
                  <span className="text-xs text-muted-foreground">{player.position}</span>
                  <span className="text-xs text-muted-foreground">{player.teams}</span>

                  {showingResult ? (
                    <span className="text-2xl font-bold text-[hsl(var(--hk-silver))] animate-cell-reveal">
                      {player.careerPoints} pts
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-semibold text-[hsl(var(--hk-silver))]">
                      <ArrowUp className="w-4 h-4" /> Higher?
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Game complete */}
        {gameStatus === 'complete' && (
          <div className="mt-4 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-5xl mb-3">{correctCount >= 8 ? '🏆' : correctCount >= 5 ? '🏒' : '❄️'}</div>
              <h2 className="text-2xl font-bold text-[hsl(var(--hk-silver))] font-display mb-2">
                {correctCount}/{totalRounds} Correct!
              </h2>
              <p className="text-foreground">
                Total Score: <span className="font-bold text-[hsl(var(--hk-silver))]">{totalScore}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">({correctCount}×10 base + {totalScore - correctCount * 10} streak bonus)</p>

              <ShareButtons
                score={`${totalScore} points (${correctCount}/${totalRounds}) on today's Hockey Higher or Lower`}
                gameName="Hockey Higher or Lower"
                gamePath="/hockey-higher-lower"
              />

              {mode === 'unlimited' && (
                <button
                  onClick={() => switchMode('unlimited')}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[hsl(var(--hk-blue))] text-[hsl(var(--hk-silver))] font-bold border border-[hsl(var(--hk-silver)/0.2)] hover:opacity-90 transition-opacity"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        )}

        <GameSeoContent
          title="Hockey Higher or Lower | DoUKnowBall"
          description="Two hockey players, side by side. Which one has more career points? Daily challenge and unlimited mode with streak bonuses."
          howToPlay={[
            'Two players shown side by side with name, position, and country',
            'Tap the player you think has MORE career points',
            '10 rounds per game — 10 points per correct answer',
            'Build a streak for bonus points (+5 per consecutive correct)',
            'Daily challenge or unlimited random mode',
          ]}
          examples={[
            "Gretzky (2,857 pts) vs Lemieux (1,723 pts)",
            "Crosby vs Ovechkin — Who has more points?",
            "McDavid vs Draisaitl — Who has more points?",
            "Jagr (1,921 pts) vs Howe (1,850 pts)",
            "Malkin vs Stamkos — Who has more career points?",
            "Kane vs Toews — Who finished with more?"
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="hockey-higher-lower" gameContext={{ mode }} />
        </div>
        <GameNav />
        <Footer />
      </div>
      <HockeyHLHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default HockeyHigherLower;
