import { useHigherLower } from '@/hooks/useHigherLower';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { HigherLowerHowToPlay } from '@/components/higher-lower/HigherLowerHowToPlay';
import { RotateCcw, HelpCircle, Share2 } from 'lucide-react';
import { useState } from 'react';
import { shareResult } from '@/lib/share';
import { cn } from '@/lib/utils';

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
    resetGame,
    lossReaction,
    statLabels,
  } = useHigherLower();

  const [showHelp, setShowHelp] = useState(false);

  return (
    <main className="min-h-screen bg-background">
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

              <div className="mt-6 flex items-center gap-3 justify-center">
                <button
                  onClick={resetGame}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-semibold hover:bg-secondary/80 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again
                </button>
                <button
                  onClick={() => {
                    const text = `⚽ Higher or Lower\nStreak: ${streak} | Best: ${bestStreak}\n\nPlay at footyfein.lovable.app/higher-lower`;
                    shareResult(text, 'Higher or Lower');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        )}

        <HigherLowerHowToPlay open={showHelp} onOpenChange={setShowHelp} />
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
                  isChosen && lastChoice?.correct && 'border-correct bg-correct/10',
                  isChosen && !lastChoice?.correct && 'border-destructive bg-destructive/10',
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
