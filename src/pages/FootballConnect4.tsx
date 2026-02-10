import { useState } from 'react';
import { useFootballConnect4 } from '@/hooks/useFootballConnect4';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { FootballConnect4Board } from '@/components/football-connect4/FootballConnect4Board';
import { FootballConnect4HowToPlay } from '@/components/football-connect4/FootballConnect4HowToPlay';
import { shareResult } from '@/lib/share';
import { cn } from '@/lib/utils';
import {
  RotateCcw,
  Loader2,
  AlertCircle,
  HelpCircle,
  Share2,
  X,
} from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';

const FootballConnect4 = () => {
  const {
    boardConfig,
    board,
    currentTurn,
    phase,
    winner,
    isDraw,
    selectedColumn,
    targetRow,
    isValidating,
    validationError,
    selectColumn,
    cancelSelection,
    submitPlayer,
    resetGame,
    getShareText,
  } = useFootballConnect4();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSubmit = async () => {
    if (!playerInput.trim() || isValidating) return;
    await submitPlayer(playerInput);
    setPlayerInput('');
  };

  const colAttr = selectedColumn !== null ? boardConfig.columnAttributes[selectedColumn] : '';
  const rowAttr = targetRow !== null ? boardConfig.rowAttributes[targetRow] : '';

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6 relative">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.12em] text-primary font-display mb-1">
            FOOTBALL CONNECT 4
          </h1>
          <p className="text-muted-foreground text-sm">
            Two players, trivia, and 4 in a row
          </p>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="absolute top-0 right-0 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </header>

        <FootballConnect4HowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />

        {/* Turn indicator */}
        {phase === 'playing' && (
          <div className="flex justify-center mb-4">
            <div
              className={cn(
                'inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-all',
                currentTurn === 'blue'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              )}
            >
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  currentTurn === 'blue' ? 'bg-blue-500' : 'bg-red-500'
                )}
              />
              {currentTurn === 'blue' ? 'Blue' : 'Red'}'s Turn
            </div>
          </div>
        )}

        {/* Board */}
        <FootballConnect4Board
          boardConfig={boardConfig}
          board={board}
          currentTurn={currentTurn}
          selectedColumn={selectedColumn}
          onSelectColumn={selectColumn}
          disabled={phase !== 'playing' || isValidating}
        />

        {/* Player input (when a column is selected) */}
        {phase === 'playing' && selectedColumn !== null && targetRow !== null && (
          <div className="mt-4 space-y-3 animate-fade-in max-w-lg mx-auto">
            <p className="text-sm text-center text-muted-foreground">
              Name a player who matches{' '}
              <span className="font-bold text-primary">"{colAttr}"</span> and{' '}
              <span className="font-bold text-primary">"{rowAttr}"</span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter footballer name..."
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
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </button>
              <button
                onClick={cancelSelection}
                className="rounded-xl px-3 py-3 bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {validationError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Show validation error even without selection */}
        {phase === 'playing' && selectedColumn === null && validationError && (
          <div className="mt-4 max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          </div>
        )}

        {/* Game over */}
        {phase === 'won' && (
          <div className="text-center space-y-4 mt-6 animate-fade-in">
            <div
              className={cn(
                'inline-flex items-center gap-3 px-6 py-3 rounded-xl border',
                isDraw
                  ? 'bg-secondary border-border'
                  : winner === 'blue'
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-red-500/10 border-red-500/30'
              )}
            >
              <span className="text-xl font-bold font-display">
                {isDraw
                  ? "🤝 It's a Draw!"
                  : `${winner === 'blue' ? '🔵 Blue' : '🔴 Red'} Wins! 🎉`}
              </span>
            </div>
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
                Share
              </button>
            </div>
          </div>
        )}

        <AdBanner slot="1234567898" format="horizontal" className="mt-8" />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default FootballConnect4;
