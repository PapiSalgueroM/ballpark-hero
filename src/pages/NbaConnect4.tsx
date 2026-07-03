import { useState } from 'react';
import { useNbaConnect4 } from '@/hooks/useNbaConnect4';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import { NbaConnect4HowToPlay } from '@/components/nba-connect4/NbaConnect4HowToPlay';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NBA_PLAYER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, AlertCircle, HelpCircle, SkipForward, ArrowDown } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

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
    usedPlayers,
    getTargetRow,
    selectColumn,
    submitPlayer,
    skipTurn,
    resetGame,
  } = useNbaConnect4();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    await submitPlayer(entity.name);
    setPlayerInput('');
  };

  const targetRow = selectedCol !== null ? getTargetRow(selectedCol) : null;

  const winCellSet = new Set(
    winInfo?.cells.map(([r, c]) => `${r}-${c}`) ?? []
  );

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="NBA Connect 4 - Basketball Trivia Grid Game | DoUKnowBall"
        description="Play Connect 4 with NBA trivia. Name players matching team and stat criteria to claim cells."
        path="/nba-connect-4"
      />
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6 relative">
          <h1 className="text-3xl md:text-5xl font-bold tracking-[0.12em] text-primary font-display mb-1">
            NBA CONNECT 4
          </h1>
          <p className="text-muted-foreground text-sm">
            Play Connect 4 with NBA trivia: name players matching team and stat criteria to claim cells and get four in a row.
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
                          <span className="text-[7px] md:text-[9px] font-semibold text-white text-center leading-tight px-0.5 break-words line-clamp-2">
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
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <PlayerAutocomplete
                  value={playerInput}
                  onChange={setPlayerInput}
                  onSelect={handleSelectPlayer}
                  searchOptions={{ source: NBA_PLAYER_SOURCE, exclude: usedPlayers }}
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
          </div>
        )}

        {/* Reset */}
        {(phase === 'won' || phase === 'draw') && (
          <div className="flex flex-col items-center mt-6">
            <ShareButtons
              score={phase === 'draw' ? 'Draw' : `${winInfo?.winner === 'red' ? 'Red' : 'Blue'} wins`}
              gameName="NBA Connect 4"
              gamePath="/nba-connect-4"
            />
            <button
              onClick={resetGame}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              New Game
            </button>
          </div>
        )}

        <GameSeoContent
          title="Pro Basketball Connect 4 | DoUKnowBall"
          description="Connect four basketball players in a row by finding what links them together: teams, awards, colleges or stats."
          howToPlay={[
            "Pick a column to drop your piece into the lowest empty row",
            "Name an NBA player who matches both the column and row criteria",
            "Valid answers place your piece. First to get 4 in a row wins",
            "Each player can only be used once per game",
          ]}
          examples={[
            "Lakers + MVP = LeBron James, Kobe Bryant, Shaquille O'Neal",
            "Duke + Point Guard = Kyrie Irving, Chris Paul (Wake Forest corrected)",
            "30+ PPG Season + Western Conference = Stephen Curry, Kevin Durant",
            "All-Star + Center = Nikola Jokić, Joel Embiid, Anthony Davis",
            "Kentucky + 1st Overall Pick = Karl-Anthony Towns, Anthony Davis",
            "6th Man Award + Guard = Jamal Crawford, Lou Williams"
          ]}
        />

        <AdBanner slot="1234567898" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="nba-connect-4" gameContext={{ board: board?.id }} />
        </div>
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default NbaConnect4;
