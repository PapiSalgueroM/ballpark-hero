import { useState } from 'react';
import { useTeammates } from '@/hooks/useTeammates';
import { TeammatesHowToPlay } from '@/components/teammates/TeammatesHowToPlay';
import { GameNav } from '@/components/game/GameNav';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HelpCircle, User, ArrowRight } from 'lucide-react';
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
    giveUp,
    resetGame,
    shareText,
  } = useTeammates();

  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <PageSeo
        title="Teammates or Not? - Sports Trivia Quiz | DoUKnowBall"
        description="Were these two athletes ever on the same team? Test your sports knowledge across NFL, NBA, and soccer."
        path="/teammates"
      />
      <GameShell
        width="narrow"
        title="TEAMMATES OR NOT?"
        subtitle="Did these two players ever play on the same team?"
        headerExtra={
          <>
            {!gameOver && (
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Question <span className="text-foreground font-semibold">{currentIdx + 1}/{totalRounds}</span></span>
                <span>Score <span className="text-correct font-semibold">{score}</span></span>
              </div>
            )}
            <button
              onClick={() => setShowHelp(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
          </>
        }
      >
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
              <div className="space-y-3">
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
                <div className="flex justify-center">
                  <GiveUpButton onGiveUp={giveUp} />
                </div>
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
            <ResultScreen
              won={score >= 5}
              outcomeEmoji={score >= 8 ? '🔥' : score >= 5 ? '👍' : '😅'}
              headline={`${score}/${totalRounds}`}
              statLine={
                score === 10 ? 'Perfect! You know your sports history!' :
                score >= 8 ? 'Amazing! You really know your teammates!' :
                score >= 5 ? 'Not bad! Keep studying those rosters.' :
                'Time to brush up on your sports history!'
              }
              emojiGrid={`🏆 Teammates or Not?: ${score}/${totalRounds}`}
              share={{
                score: `${score}/${totalRounds}`,
                gameName: 'Teammates or Not?',
                gamePath: '/teammates',
              }}
              onPlayAgain={resetGame}
            />
          </div>
        )}

        <GameSeoContent
          title="Teammates or Not? | DoUKnowBall"
          description="Test your sports knowledge: were these two athletes ever on the same team? Covers NFL, NBA, and soccer with fun facts and shareable scores."
          howToPlay={[
            "Two athlete names are shown from NFL, NBA, or soccer",
            "Decide if they ever played on the same team",
            "Tap YES or NO to answer",
            "Learn fun facts after each answer: 10 questions per round",
          ]}
          examples={[
            "Messi & Neymar: YES (Barcelona, PSG)",
            "LeBron James & Kyrie Irving: YES (Cleveland Cavaliers)",
            "Tom Brady & Peyton Manning: NO (rivals, never teammates)",
            "Ronaldo & Rooney: YES (Manchester United)",
            "Kobe Bryant & Shaquille O'Neal: YES (LA Lakers)",
            "Zidane & Ronaldinho: NO (never played on the same club)"
          ]}
        />

        <AdBanner slot="1234567891" format="horizontal" className="mt-8" />
        <TeammatesHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <GameNav />
      </GameShell>
    </>
  );
};

export default Teammates;
