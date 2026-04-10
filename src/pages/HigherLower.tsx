import { useHigherLower } from '@/hooks/useHigherLower';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { HigherLowerHowToPlay } from '@/components/higher-lower/HigherLowerHowToPlay';
import { RotateCcw, HelpCircle } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

type StatKey = 'appearances' | 'goals' | 'assists' | 'trophies' | 'internationalCaps';

const STAT_KEYS: StatKey[] = ['appearances', 'goals', 'assists', 'trophies', 'internationalCaps'];
const STAT_EMOJIS: Record<StatKey, string> = {
  appearances: '🎽',
  goals: '⚽',
  assists: '👟',
  trophies: '🏆',
  internationalCaps: '🌍',
};

const HigherLowerGame = () => {
  const {
    currentPlayer,
    nextPlayer,
    streak,
    bestStreak,
    gameStatus,
    lastChoice,
    revealedStats,
    chooseStat,
    giveUp,
    resetGame,
    lossReaction,
    statLabels,
  } = useHigherLower();

  const [showHelp, setShowHelp] = useState(false);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Higher or Lower - Soccer Stats Comparison Game | DoUKnowBall"
        description="Compare soccer player career stats and guess who has more. Build your streak in this free football trivia game."
        path="/higher-lower"
      />
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        {/* Header */}
        <header className="text-center mb-8 relative">
          <button
            onClick={() => setShowHelp(true)}
            className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="How to play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.2em] text-primary font-display mb-1">
            HIGHER OR LOWER
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Pick a stat where the left player is higher — build your streak!
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Streak: <span className="text-primary font-bold text-base">{streak}</span></span>
            <span>Best: <span className="text-foreground font-semibold">{bestStreak}</span></span>
          </div>
        </header>

        {gameStatus === 'playing' && (
          <>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch justify-center">
              {/* Current Player - Revealed */}
              <PlayerCard
                player={currentPlayer}
                revealed
                statKeys={STAT_KEYS}
                statEmojis={STAT_EMOJIS}
                statLabels={statLabels}
                onChooseStat={chooseStat}
                interactive={!revealedStats}
                lastChoice={lastChoice}
                nextPlayerStats={revealedStats ? nextPlayer.stats : undefined}
              />

              <div className="flex items-center justify-center text-2xl font-bold text-muted-foreground">
                VS
              </div>

              {/* Next Player - Hidden/Revealing */}
              <PlayerCard
                player={nextPlayer}
                revealed={revealedStats}
                statKeys={STAT_KEYS}
                statEmojis={STAT_EMOJIS}
                statLabels={statLabels}
                interactive={false}
                lastChoice={null}
              />
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={giveUp}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                🏳️ Give Up
              </button>
            </div>
          </>
        )}

        {gameStatus === 'lost' && (
          <div className="mt-8 flex justify-center">
            <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <div className="text-6xl mb-4">{lossReaction.emoji}</div>
              <h2 className="text-2xl font-bold text-destructive font-display mb-2">Game Over!</h2>
              <p className="text-foreground text-lg mb-1">{lossReaction.message}</p>
              <p className="text-muted-foreground text-sm mb-1">
                Final Streak: <span className="text-primary font-bold text-lg">{streak}</span>
              </p>
              <p className="text-muted-foreground text-xs mb-4">
                Best Ever: <span className="text-foreground font-semibold">{bestStreak}</span>
              </p>

              {lastChoice && (
                <div className="bg-secondary/50 rounded-xl p-4 mb-6 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground font-semibold">{currentPlayer.name}</span> had{' '}
                    <span className="text-primary font-semibold">{currentPlayer.stats[lastChoice.stat]}</span>{' '}
                    {statLabels[lastChoice.stat].toLowerCase()}, but{' '}
                    <span className="text-foreground font-semibold">{nextPlayer.name}</span> had{' '}
                    <span className="text-destructive font-semibold">{nextPlayer.stats[lastChoice.stat]}</span>.
                  </p>
                </div>
              )}

              <ShareButtons
                score={`${streak} streak (best: ${bestStreak})`}
                gameName="Higher or Lower"
                gamePath="/higher-lower"
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
          title="Higher or Lower Sports Game | DoUKnowBall"
          description="Guess whether the next player's stat is higher or lower. Tests your knowledge of player stats across football, NBA and UFC."
          howToPlay={[
            "Two players are shown side by side with their stats",
            "Pick a stat where the left player has a higher value",
            "Correct picks extend your streak — wrong picks end the game",
          ]}
          examples={[
            "Messi vs Ronaldo — Who has more goals?",
            "Neymar vs Salah — Who has more assists?",
            "Mbappé vs Haaland — Who has more trophies?",
            "Modric vs De Bruyne — Who has more appearances?",
            "Kane vs Lewandowski — Who has more international caps?",
            "Benzema vs Suárez — Who has more career goals?"
          ]}
        />

        <AdBanner slot="1234567894" format="horizontal" className="mt-8" />

        <HigherLowerHowToPlay open={showHelp} onOpenChange={setShowHelp} />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="higher-lower" gameContext={{ currentPlayer: currentPlayer?.name, nextPlayer: nextPlayer?.name }} />
        </div>
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

interface PlayerCardProps {
  player: { name: string; nationality: string; isIcon: boolean; stats: Record<StatKey, number> };
  revealed: boolean;
  statKeys: StatKey[];
  statEmojis: Record<StatKey, string>;
  statLabels: Record<StatKey, string>;
  onChooseStat?: (stat: StatKey) => void;
  interactive: boolean;
  lastChoice: { stat: StatKey; correct: boolean } | null;
  nextPlayerStats?: Record<StatKey, number>;
}

function PlayerCard({
  player, revealed, statKeys, statEmojis, statLabels, onChooseStat, interactive, lastChoice, nextPlayerStats,
}: PlayerCardProps) {
  return (
    <div className="flex-1 max-w-sm w-full mx-auto">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-lg">
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {player.isIcon ? '⭐ Icon' : player.nationality}
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-foreground font-display">
            {player.name}
          </h3>
        </div>

        <div className="space-y-2">
          {statKeys.map((stat) => {
            const isChosen = lastChoice?.stat === stat;
            const value = player.stats[stat];
            const isRevealed = revealed && nextPlayerStats;
            const isHigher = isRevealed ? player.stats[stat] >= (nextPlayerStats?.[stat] ?? 0) : false;
            const isLower = isRevealed ? player.stats[stat] < (nextPlayerStats?.[stat] ?? 0) : false;

            return (
              <button
                key={stat}
                onClick={() => interactive && onChooseStat?.(stat)}
                disabled={!interactive}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm',
                  interactive
                    ? 'border-border hover:border-primary/50 hover:bg-secondary/50 cursor-pointer'
                    : 'border-border/30 cursor-default',
                  isRevealed && isHigher && 'border-correct bg-correct/10',
                  isRevealed && isLower && 'border-destructive bg-destructive/10',
                  isChosen && 'ring-2 ring-primary/50',
                )}
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span>{statEmojis[stat]}</span>
                  <span className="font-medium text-foreground">{statLabels[stat]}</span>
                </span>
                <span className={cn(
                  'font-bold text-lg tabular-nums',
                  revealed ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  {revealed ? value.toLocaleString() : '???'}
                </span>
              </button>
            );
          })}
        </div>

        {interactive && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            👆 Tap a stat you think is <span className="text-primary font-semibold">higher</span> than the opponent
          </p>
        )}
      </div>
    </div>
  );
}

export default HigherLowerGame;
