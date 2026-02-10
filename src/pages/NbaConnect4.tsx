import { useState } from 'react';
import { useNbaConnect4 } from '@/hooks/useNbaConnect4';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { NbaConnect4HowToPlay } from '@/components/nba-connect4/NbaConnect4HowToPlay';
import Connect4Suggestions from '@/components/nba-connect4/Connect4Suggestions';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, AlertCircle, HelpCircle, SkipForward, ArrowDown } from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';

const ROWS = 6;
const COLS = 7;

const NbaConnect4 = () => {
  const {
    board,
    grid,
    currentTeam,
    phase,
    winInfo,
    isValidating,
    validationError,
    selectedCol,
    getTargetRow,
    selectColumn,
    submitPlayer,
    skipTurn,
    resetGame,
  } = useNbaConnect4();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSubmit = async () => {
    if (!playerInput.trim() || isValidating) return;
    await submitPlayer(playerInput);
    setPlayerInput('');
  };

  const targetRow = selectedCol !== null ? getTargetRow(selectedCol) : null;

  const winCellSet = new Set(
    winInfo?.cells.map(([r, c]) => `${r}-${c}`) ?? []
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6 relative">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.12em] text-primary font-display mb-1">
            NBA CONNECT 4
          </h1>
          <p className="text-muted-foreground text-sm">
            Two players, NBA trivia, four in a row wins
          </p>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="absolute top-0 right-0 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </header>

        <NbaConnect4HowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />

        {/* Turn indicator */}
        {phase === 'playing' && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <div
              className={cn(
                'w-5 h-5 rounded-full',
                currentTeam === 'red' ? 'bg-red-500' : 'bg-blue-500'
              )}
            />
            <span className="font-bold text-foreground text-lg">
              {currentTeam === 'red' ? "Red's Turn" : "Blue's Turn"}
            </span>
            <button
              onClick={skipTurn}
              className="ml-2 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="w-3 h-3" />
              Skip
            </button>
          </div>
        )}

        {/* Win / Draw banner */}
        {phase === 'won' && winInfo && (
          <div className="text-center mb-4 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-primary/10 border border-primary/30">
              <div
                className={cn(
                  'w-6 h-6 rounded-full',
                  winInfo.winner === 'red' ? 'bg-red-500' : 'bg-blue-500'
                )}
              />
              <span className="text-xl font-bold text-primary font-display">
                {winInfo.winner === 'red' ? 'Red' : 'Blue'} Wins! 🏆
              </span>
            </div>
          </div>
        )}

        {phase === 'draw' && (
          <div className="text-center mb-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary border border-border">
              <span className="text-xl font-bold text-foreground font-display">
                It's a Draw! 🤝
              </span>
            </div>
          </div>
        )}

        {/* Board name */}
        <p className="text-center text-xs text-muted-foreground mb-3 uppercase tracking-wider font-semibold">
          Board: {board.name}
        </p>

        {/* The Grid */}
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-[700px] mx-auto">
            {/* Column headers */}
            <div className="grid gap-1" style={{ gridTemplateColumns: `100px repeat(${COLS}, 1fr)` }}>
              <div /> {/* Empty corner */}
              {board.columnAttributes.map((attr, c) => (
                <button
                  key={c}
                  disabled={phase !== 'playing' || getTargetRow(c) === null}
                  onClick={() => selectColumn(c)}
                  className={cn(
                    'text-[10px] md:text-xs font-bold text-center px-1 py-2 rounded-lg transition-all leading-tight',
                    selectedCol === c
                      ? 'bg-primary text-primary-foreground scale-105'
                      : getTargetRow(c) !== null && phase === 'playing'
                        ? 'bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer'
                        : 'bg-secondary/50 text-muted-foreground cursor-default'
                  )}
                >
                  {attr}
                  {selectedCol === c && (
                    <ArrowDown className="w-3 h-3 mx-auto mt-0.5 animate-bounce" />
                  )}
                </button>
              ))}

              {/* Rows */}
              {Array.from({ length: ROWS }).map((_, r) => (
                <>
                  {/* Row label */}
                  <div
                    key={`label-${r}`}
                    className={cn(
                      'text-[10px] md:text-xs font-bold flex items-center px-2 rounded-lg',
                      selectedCol !== null && targetRow === r
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary/50 text-muted-foreground'
                    )}
                  >
                    {board.rowAttributes[r]}
                  </div>
                  {/* Cells */}
                  {Array.from({ length: COLS }).map((_, c) => {
                    const cell = grid[r][c];
                    const isWinCell = winCellSet.has(`${r}-${c}`);
                    const isTarget =
                      selectedCol === c && targetRow === r && phase === 'playing';

                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => {
                          if (phase === 'playing' && !cell) selectColumn(c);
                        }}
                        className={cn(
                          'aspect-square rounded-lg border flex items-center justify-center transition-all relative',
                          cell
                            ? cell.team === 'red'
                              ? isWinCell
                                ? 'bg-red-500 border-red-400 ring-2 ring-yellow-400 animate-pulse'
                                : 'bg-red-500/80 border-red-500/50'
                              : isWinCell
                                ? 'bg-blue-500 border-blue-400 ring-2 ring-yellow-400 animate-pulse'
                                : 'bg-blue-500/80 border-blue-500/50'
                            : isTarget
                              ? currentTeam === 'red'
                                ? 'bg-red-500/20 border-red-500/40 border-dashed'
                                : 'bg-blue-500/20 border-blue-500/40 border-dashed'
                              : 'bg-card border-border hover:bg-card/80 cursor-pointer'
                        )}
                      >
                        {cell && (
                          <span className="text-[7px] md:text-[9px] font-semibold text-white text-center leading-tight px-0.5 truncate">
                            {cell.playerName}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Input area */}
        {phase === 'playing' && selectedCol !== null && targetRow !== null && (
          <div className="max-w-lg mx-auto mt-4 space-y-3 animate-fade-in">
            <p className="text-sm text-center text-muted-foreground">
              Name a player who matches{' '}
              <span className="font-bold text-primary">"{board.columnAttributes[selectedCol]}"</span>
              {' + '}
              <span className="font-bold text-primary">"{board.rowAttributes[targetRow]}"</span>
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
                  'Drop'
                )}
              </button>
            </div>
            <Connect4Suggestions
              query={playerInput}
              columnAttribute={board.columnAttributes[selectedCol]}
              rowAttribute={board.rowAttributes[targetRow]}
              visible={!isValidating && !!playerInput.trim()}
              onSelect={(name) => {
                setPlayerInput(name);
                submitPlayer(name);
              }}
            />
            {validationError && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Reset */}
        {(phase === 'won' || phase === 'draw') && (
          <div className="flex justify-center mt-6">
            <button
              onClick={resetGame}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </button>
          </div>
        )}

        <AdBanner slot="1234567898" format="horizontal" className="mt-8" />

        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default NbaConnect4;
