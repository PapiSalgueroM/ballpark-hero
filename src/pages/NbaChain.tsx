import { useState, useRef, useEffect } from 'react';
import { useNbaChain } from '@/hooks/useNbaChain';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { NbaChainHowToPlay } from '@/components/nba-chain/NbaChainHowToPlay';
import ChainSuggestions from '@/components/nba-chain/ChainSuggestions';
import { shareResult } from '@/lib/share';
import { cn } from '@/lib/utils';
import {
  RotateCcw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Link2,
  Share2,
  Trophy,
  StopCircle,
  ArrowRight,
} from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NbaChain = () => {
  const {
    chain,
    phase,
    score,
    bestStreak,
    gameOverReason,
    isValidating,
    validationError,
    lastPlayer,
    submitPlayer,
    endGame,
    resetGame,
    getShareText,
  } = useNbaChain();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const chainEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!playerInput.trim() || isValidating) return;
    await submitPlayer(playerInput);
    setPlayerInput('');
  };

  // Auto-scroll chain to end
  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chain.length]);

  return (
    <main className="min-h-screen bg-background">
      <PageSeo
        title="NBA Chain Game – Basketball Player Connection Game | DoUKnowBall"
        description="Build the longest chain of connected NBA players by naming teammates. Each link must share a team. Free basketball trivia — no signup needed."
        path="/nba-chain"
      />
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6 relative">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.12em] text-primary font-display mb-1">
            NBA CHAIN GAME
          </h1>
          <p className="text-muted-foreground text-sm">
            Build the longest chain of connected NBA players by naming teammates. Each new player must have shared a team with the previous one.
          </p>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="absolute top-0 right-0 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </header>

        <NbaChainHowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />

        {/* Score bar */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Chain: {score}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-bold text-foreground">Best: {bestStreak}</span>
          </div>
        </div>

        {/* The chain */}
        <div className="mb-6 max-h-[400px] overflow-y-auto rounded-xl border border-border bg-card p-4">
          <div className="space-y-1">
            {chain.map((link, i) => (
              <div key={i} className="animate-fade-in">
                {i > 0 && link.connection && (
                  <div className="flex items-center gap-2 ml-6 py-1">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground italic">{link.connection}</span>
                  </div>
                )}
                <div
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all',
                    i === 0
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : i === chain.length - 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground'
                  )}
                >
                  <span className="text-xs text-muted-foreground font-mono w-5">#{i + 1}</span>
                  {link.playerName}
                </div>
              </div>
            ))}
          </div>
          <div ref={chainEndRef} />
        </div>

        {/* Input area */}
        {phase === 'playing' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm text-center text-muted-foreground">
              Name a player who was a teammate of{' '}
              <span className="font-bold text-primary">{lastPlayer}</span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter NBA player name..."
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                disabled={isValidating}
              />
              <button
                onClick={handleSubmit}
                disabled={!playerInput.trim() || isValidating}
                className={cn(
                  'rounded-xl px-5 py-3 font-semibold transition-all inline-flex items-center gap-2',
                  playerInput.trim() && !isValidating
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
              </button>
            </div>
            <ChainSuggestions
              query={playerInput}
              previousPlayer={lastPlayer}
              visible={!isValidating && !!playerInput.trim()}
              onSelect={async (name) => {
                setPlayerInput(name);
                await submitPlayer(name);
                setPlayerInput('');
              }}
            />
            {validationError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
            <div className="flex justify-center">
              <button
                onClick={() => endGame('You ended the game')}
                className="inline-flex items-center gap-1 text-xs px-4 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <StopCircle className="w-3 h-3" />
                End Game
              </button>
            </div>
          </div>
        )}

        {/* Game over */}
        {phase === 'ended' && (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-primary/10 border border-primary/30">
              <span className="text-xl font-bold text-primary font-display">
                {score >= 10 ? '🔥' : score >= 5 ? '💪' : '🏀'} Chain of {score}!
              </span>
            </div>
            {gameOverReason && (
              <p className="text-sm text-muted-foreground">{gameOverReason}</p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={resetGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
              <button
                onClick={() => shareResult(getShareText())}
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/80 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share Chain
              </button>
            </div>
          </div>
        )}

        <GameSeoContent
          title="Pro Basketball Chain Game | DoUKnowBall"
          description="Chain together players who shared a team. How long can you keep the chain going before you get stuck?"
          howToPlay={[
            "Start with a given NBA player",
            "Name a player who was a teammate of the previous player",
            "Keep the chain going as long as you can — no repeats allowed",
            "Your best streak is saved locally so you can beat your record",
          ]}
        />

        <AdBanner slot="1234567898" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nba-chain" gameContext={{ lastPlayer, chainLength: score }} />
        </div>
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default NbaChain;
