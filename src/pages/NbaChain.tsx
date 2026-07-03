import { useState, useRef, useEffect, useMemo } from 'react';
import { useNbaChain } from '@/hooks/useNbaChain';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { NbaChainHowToPlay } from '@/components/nba-chain/NbaChainHowToPlay';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NBA_PLAYER_SOURCE, normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import { cn } from '@/lib/utils';
import {
  RotateCcw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Link2,
  Trophy,
  StopCircle,
  ArrowRight,
} from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NbaChain = () => {
  const {
    mode,
    switchMode,
    chain,
    phase,
    score,
    bestStreak,
    gameOverReason,
    isValidating,
    validationError,
    lastPlayer,
    roundComplete,
    scoreVsPar,
    roundPickCount,
    roundPar,
    submitPlayer,
    endGame,
    resetGame,
  } = useNbaChain();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const chainEndRef = useRef<HTMLDivElement>(null);

  // Normalized names already in the chain, so the autocomplete never offers
  // a player who would immediately trigger the duplicate-name game-over.
  const usedNormalizedNames = useMemo(
    () => new Set(chain.map((l) => normalizeName(l.playerName))),
    [chain]
  );

  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    await submitPlayer(entity.name);
    setPlayerInput('');
  };

  // Auto-scroll chain to end
  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chain.length]);

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="NBA Chain - Basketball Player Connection Game | DoUKnowBall"
        description="Build the longest chain of connected NBA players by naming teammates. Free basketball trivia game."
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

          {/* Endless / Round toggle. Endless is the default mode; switching
              always starts a fresh chain under the new mode's rules. */}
          <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
            {(['endless', 'round'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  'px-5 py-1.5 rounded-full text-sm font-semibold transition-all',
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'endless' ? '∞ Endless' : `🎯 Round (${roundPickCount})`}
              </button>
            ))}
          </div>
        </header>

        <NbaChainHowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />

        {/* Score bar */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              {mode === 'round' ? `Picks: ${score}/${roundPickCount}` : `Chain: ${score}`}
            </span>
          </div>
          {mode === 'round' ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-foreground">Par: {roundPar}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-bold text-foreground">Best: {bestStreak}</span>
            </div>
          )}
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
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <PlayerAutocomplete
                  value={playerInput}
                  onChange={setPlayerInput}
                  onSelect={handleSelectPlayer}
                  searchOptions={{ source: NBA_PLAYER_SOURCE, exclude: usedNormalizedNames }}
                  placeholder="Enter NBA player name..."
                  disabled={isValidating}
                  autoFocus
                  validateOnly
                />
              </div>
              {isValidating && (
                <div className="rounded-xl px-5 py-3 bg-secondary text-muted-foreground inline-flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>
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

            {/* Round mode: score vs par summary. Only shown when a full
                round was completed (roundComplete), so ending a round early
                via "End Game" is reported as an incomplete chain instead of
                a misleading par comparison. */}
            {mode === 'round' && roundComplete && scoreVsPar !== null && (
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm border',
                  scoreVsPar > 0
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : scoreVsPar < 0
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : 'bg-secondary text-foreground border-border',
                )}
              >
                <Trophy className="w-4 h-4" />
                {scoreVsPar > 0
                  ? `${scoreVsPar} over par (par ${roundPar})`
                  : scoreVsPar < 0
                    ? `${Math.abs(scoreVsPar)} under par (par ${roundPar})`
                    : `Even par (${roundPar})`}
              </div>
            )}

            {gameOverReason && (
              <p className="text-sm text-muted-foreground">{gameOverReason}</p>
            )}
            <ShareButtons
              score={
                mode === 'round' && roundComplete && scoreVsPar !== null
                  ? `${score}/${roundPickCount} picks, ${scoreVsPar >= 0 ? '+' : ''}${scoreVsPar} vs par`
                  : `${score} chain (best: ${bestStreak})`
              }
              gameName="NBA Chain Game"
              gamePath="/nba-chain"
            />
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={resetGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
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
            "Keep the chain going as long as you can, no repeats allowed",
            "Your best streak is saved locally so you can beat your record",
          ]}
          examples={[
            "LeBron James → Kyrie Irving (Cavaliers) → Kevin Durant (Nets)",
            "Kobe Bryant → Shaquille O'Neal (Lakers) → Dwyane Wade (Heat)",
            "Stephen Curry → Kevin Durant (Warriors) → James Harden (Nets)",
            "Michael Jordan → Scottie Pippen (Bulls) → Hakeem Olajuwon (Rockets/Trail Blazers)",
            "Tim Duncan → Manu Ginóbili (Spurs) → Carmelo Anthony (Nuggets era overlap)",
            "Magic Johnson → Kareem Abdul-Jabbar (Lakers) → Oscar Robertson (Bucks)"
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
