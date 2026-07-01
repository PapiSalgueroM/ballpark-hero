import { useState, useEffect } from 'react';
import { useFootballTimeline } from '@/hooks/useFootballTimeline';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { HelpCircle, GripVertical, Check, X, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FootballTimelineHowToPlay } from '@/components/football-timeline/FootballTimelineHowToPlay';

const FootballTimeline = () => {
  const {
    puzzle,
    order,
    movePlayer,
    status,
    submit,
    score,
    correctOrder,
    saveOrder,
  } = useFootballTimeline();

  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('ft-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('ft-rules-seen', '1');
    }
  }, []);

  useEffect(() => {
    saveOrder();
  }, [order, saveOrder]);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="NFL Timeline - Drag and Drop Draft Year Puzzle | DoUKnowBall"
        description="Put NFL players in order by their draft year. Free daily NFL trivia puzzle."
        path="/football-timeline"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowRules(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-[hsl(var(--ft-gold))] transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>

          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.15em] font-display mb-1 text-[hsl(var(--ft-gold))]">
            🏈 PRO FOOTBALL TIMELINE
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
            Put the players in NFL Draft order: the earliest draft year goes at the top, the most recent at the bottom.
          </p>
        </header>

        {/* Player list */}
        <div className="space-y-3">
          {order.map((player, index) => {
            const isCorrect = status === 'submitted' && player.name === correctOrder[index].name;
            const isWrong = status === 'submitted' && player.name !== correctOrder[index].name;

            return (
              <div
                key={player.name}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                  status === 'playing' && 'bg-card border-border',
                  isCorrect && 'bg-correct/20 border-correct/50',
                  isWrong && 'bg-destructive/15 border-destructive/40'
                )}
              >
                <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                  {index + 1}
                </span>

                {status === 'playing' && (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => movePlayer(index, Math.max(0, index - 1))}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-[hsl(var(--ft-gold))] disabled:opacity-30 transition-colors"
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => movePlayer(index, Math.min(order.length - 1, index + 1))}
                      disabled={index === order.length - 1}
                      className="text-muted-foreground hover:text-[hsl(var(--ft-gold))] disabled:opacity-30 transition-colors"
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.position}</p>
                </div>

                {status === 'submitted' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[hsl(var(--ft-gold))]">
                      {player.draftYear}
                    </span>
                    {isCorrect ? (
                      <Check className="w-5 h-5 text-correct" />
                    ) : (
                      <X className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit button */}
        {status === 'playing' && (
          <div className="mt-6 text-center">
            <button
              onClick={submit}
              className="px-8 py-3 rounded-xl bg-[hsl(var(--ft-navy))] text-[hsl(var(--ft-gold))] font-bold text-lg hover:opacity-90 transition-opacity border border-[hsl(var(--ft-gold)/0.3)]"
            >
              Lock In Order
            </button>
          </div>
        )}

        {/* Results */}
        {status === 'submitted' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-5xl mb-3">{score === 5 ? '🏆' : score >= 3 ? '🎯' : '🏈'}</div>
              <h2 className="text-2xl font-bold text-[hsl(var(--ft-gold))] font-display mb-2">
                {score}/5 Correct!
              </h2>
              <p className="text-foreground">
                {score === 5
                  ? 'Perfect! You nailed the draft order!'
                  : score >= 3
                    ? 'Nice work! You know your draft history.'
                    : 'Keep studying those draft classes!'}
              </p>
              <ShareButtons
                score={`${score}/5 on today's Pro Football Timeline`}
                gameName="Pro Football Timeline"
                gamePath="/football-timeline"
              />
            </div>
          </div>
        )}

        <GameSeoContent
          title="Pro Football Timeline | DoUKnowBall"
          description="A daily puzzle where you order 5 NFL players by the year they were drafted. Test your football knowledge with this chronological challenge."
          howToPlay={[
            'You are shown 5 NFL players with their name and position',
            'Use the arrows to reorder them by draft year — earliest at the top',
            'Lock in your order and see how many you got right',
            'New challenge every day — share your score with friends',
          ]}
          examples={[
            "Tom Brady (2000) → Peyton Manning (1998) → Patrick Mahomes (2017)",
            "Jerry Rice (1985) → Randy Moss (1998) → Calvin Johnson (2007)",
            "Lawrence Taylor (1981) → Ray Lewis (1996) → Aaron Donald (2014)",
            "Walter Payton (1975) → Barry Sanders (1989) → Adrian Peterson (2007)",
            "Joe Montana (1979) → John Elway (1983) → Dan Marino (1983)",
            "Deion Sanders (1989) → Charles Woodson (1998) → Darrelle Revis (2007)"
          ]}
        />

        <AdBanner slot="1234567901" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="football-timeline" gameContext={{ puzzleId: puzzle.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>

      <FootballTimelineHowToPlay open={showRules} onOpenChange={setShowRules} />
    </main>
  );
};

export default FootballTimeline;
