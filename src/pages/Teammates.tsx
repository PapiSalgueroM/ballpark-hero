import { useState } from 'react';
import { useTeammates } from '@/hooks/useTeammates';
import { TeammatesHowToPlay } from '@/components/teammates/TeammatesHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { HelpCircle, RotateCcw, User, ArrowRight } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const sportEmoji: Record<string, string> = { NFL: '🏈', NBA: '🏀', Soccer: '⚽' };

const Teammates = () => {
  const {
    currentPair,
    currentIdx,
    totalRounds,
    score,
    answered,
    lastCorrect,
    gameOver,
    answer,
    nextQuestion,
    resetGame,
    shareText,
  } = useTeammates();

  const [showHelp, setShowHelp] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <PageSeo
        title="Teammates or Not? – Sports Trivia | DoUKnowBall"
        description="Were these two athletes ever on the same team? Test your sports knowledge across NFL, NBA, and soccer. 10 questions, fun facts, and shareable scores."
        path="/teammates"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.1em] text-primary font-display mb-1">
            TEAMMATES OR NOT?
          </h1>
          <p className="text-muted-foreground text-sm">
            Did these two players ever play on the same team?
          </p>
          {!gameOver && (
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Question <span className="text-foreground font-semibold">{currentIdx + 1}/{totalRounds}</span></span>
              <span>Score <span className="text-correct font-semibold">{score}</span></span>
            </div>
          )}
        </header>

        {/* Game card */}
        {!gameOver && currentPair && (
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl mb-8">
            {/* Sport badge */}
            <div className="flex justify-center mb-6">
              <span className="px-3 py-1 rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                {sportEmoji[currentPair.sport]} {currentPair.sport}
              </span>
            </div>

            {/* Player pair */}
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-8">
              {/* Player 1 */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/50" />
                </div>
                <span className="text-foreground font-bold text-sm md:text-base text-center leading-tight">
                  {currentPair.player1}
                </span>
              </div>

              {/* VS */}
              <div className="text-2xl md:text-3xl font-bold text-muted-foreground/40 font-display shrink-0">
                VS
              </div>

              {/* Player 2 */}
              <div className="flex flex-col items-center gap-3 flex-1">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground/50" />
                </div>
                <span className="text-foreground font-bold text-sm md:text-base text-center leading-tight">
                  {currentPair.player2}
                </span>
              </div>
            </div>

            {/* Answer buttons */}
            {!answered && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => answer(true)}
                  className="px-8 py-3 rounded-xl bg-correct text-white font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  ✅ YES
                </button>
                <button
                  onClick={() => answer(false)}
                  className="px-8 py-3 rounded-xl bg-destructive text-white font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  ❌ NO
                </button>
              </div>
            )}

            {/* Result + fun fact */}
            {answered && (
              <div className="animate-fade-in">
                <div className={`text-center mb-4 p-4 rounded-xl ${lastCorrect ? 'bg-correct/10 border border-correct/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                  <p className={`text-lg font-bold ${lastCorrect ? 'text-correct' : 'text-destructive'}`}>
                    {lastCorrect ? '✅ Correct!' : '❌ Wrong!'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentPair.answer ? 'They WERE teammates!' : 'They were NEVER teammates.'}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 mb-4">
                  <p className="text-sm text-foreground">{currentPair.funFact}</p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={nextQuestion}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
                  >
                    {currentIdx + 1 >= totalRounds ? 'See Results' : 'Next Question'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Over */}
        {gameOver && (
          <div className="flex justify-center mb-8">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-5xl mb-3">{score >= 8 ? '🔥' : score >= 5 ? '👍' : '😅'}</div>
              <h2 className="text-2xl font-bold text-primary font-display mb-2">
                {score}/{totalRounds}
              </h2>
              <p className="text-muted-foreground text-sm mb-2">
                {score === 10 ? 'Perfect! You know your sports history!' :
                 score >= 8 ? 'Amazing! You really know your teammates!' :
                 score >= 5 ? 'Not bad! Keep studying those rosters.' :
                 'Time to brush up on your sports history!'}
              </p>
              <ShareButtons
                score={`${score}/${totalRounds}`}
                gameName="Teammates or Not?"
                gamePath="/teammates"
              />
              <button
                onClick={resetGame}
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            </div>
          </div>
        )}

        <GameSeoContent
          title="Teammates or Not? | DoUKnowBall"
          description="Test your sports knowledge — were these two athletes ever on the same team? Covers NFL, NBA, and soccer with fun facts and shareable scores."
          howToPlay={[
            "Two athlete names are shown from NFL, NBA, or soccer",
            "Decide if they ever played on the same team",
            "Tap YES or NO to answer",
            "Learn fun facts after each answer — 10 questions per round",
          ]}
        />

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />
        <TeammatesHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default Teammates;
