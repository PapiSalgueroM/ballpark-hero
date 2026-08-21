import { useState } from 'react';
import { useFootballConnect4 } from '@/hooks/useFootballConnect4';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { FootballConnect4Board } from '@/components/football-connect4/FootballConnect4Board';
import { FootballConnect4HowToPlay } from '@/components/football-connect4/FootballConnect4HowToPlay';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { SOCCER_MARKET_VALUE_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { cn } from '@/lib/utils';
import {
  Loader2,
  AlertCircle,
  HelpCircle,
  X,
  SkipForward,
} from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const FootballConnect4 = () => {
  const {
    mode, switchMode,
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
    usedPlayers,
    selectColumn,
    cancelSelection,
    submitPlayer,
    skipTurn,
    resetGame,
    isLoading,
  } = useFootballConnect4();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    await submitPlayer(entity.name);
    setPlayerInput('');
  };

  const colAttr = selectedColumn !== null ? boardConfig.columnAttributes[selectedColumn] : '';
  const rowAttr = targetRow !== null ? boardConfig.rowAttributes[targetRow] : '';

  return (
    <>
      <PageSeo
        title="Soccer Connect 4 - Football Trivia Grid Game | DoUKnowBall"
        description="Play Connect 4 with soccer trivia. Name players matching club and league criteria to claim cells."
        path="/football-connect-4"
      />
      <GameShell
        width="wide"
        title="SOCCER CONNECT 4"
        subtitle="Two players, trivia, and 4 in a row"
        headerExtra={
          <>
            <button
              onClick={() => setShowHowToPlay(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>

            {/* Daily / Unlimited toggle */}
            <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
              {(['daily', 'unlimited'] as const).map((m) => (
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
                  {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
                </button>
              ))}
            </div>
          </>
        }
      >
        <FootballConnect4HowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />

        {isLoading ? (
          <div className="flex justify-center py-10">
            <p className="text-muted-foreground text-sm animate-pulse">Loading today's board…</p>
          </div>
        ) : (
          <>
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
                <button
                  onClick={skipTurn}
                  disabled={isValidating}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip Turn
                </button>
              </div>
            )}

            {/* Board */}
            <FootballConnect4Board
              boardConfig={boardConfig}
              board={board}
              currentTurn={currentTurn}
              selectedColumn={selectedColumn}
              targetRow={targetRow}
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
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <PlayerAutocomplete
                      value={playerInput}
                      onChange={setPlayerInput}
                      onSelect={handleSelectPlayer}
                      searchOptions={{ source: SOCCER_MARKET_VALUE_SOURCE, exclude: usedPlayers }}
                      placeholder="Enter soccer player name..."
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
              <div className="mt-6">
                <ResultScreen
                  outcomeEmoji={isDraw ? '🤝' : winner === 'blue' ? '🔵' : '🔴'}
                  headline={isDraw ? "It's a Draw!" : `${winner === 'blue' ? 'Blue' : 'Red'} Wins!`}
                  emojiGrid={isDraw ? "🤝 It's a Draw!" : `${winner === 'blue' ? '🔵 Blue' : '🔴 Red'} Wins! 🎉`}
                  share={{
                    score: isDraw ? 'Draw' : `${winner === 'blue' ? 'Blue' : 'Red'} wins`,
                    gameName: 'Soccer Connect 4',
                    gamePath: '/football-connect-4',
                  }}
                  onPlayAgain={mode === 'unlimited' ? resetGame : undefined}
                  playNext={mode !== 'unlimited' ? (
                    <p className="text-sm text-muted-foreground">Come back tomorrow for a new board!</p>
                  ) : undefined}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Football Connect 4 | DoUKnowBall"
          description="Connect four football players in a row by finding the common link: teams played for, draft class, position or awards."
          howToPlay={[
            "Two players take turns: Blue and Red",
            "Pick a column to drop your piece into the grid",
            "Name a soccer player who matches both the column and row criteria",
            "First to connect 4 in a row (horizontal, vertical or diagonal) wins",
          ]}
          examples={[
            "Premier League + Forward = Harry Kane, Mohamed Salah",
            "La Liga + Midfielder = Luka Modrić, Pedri",
            "Serie A + Defender = Giorgio Chiellini, Alessandro Nesta",
            "Bundesliga + Goalkeeper = Manuel Neuer, Marc-André ter Stegen",
            "French + Champions League Winner = Zinedine Zidane, Karim Benzema",
            "Brazilian + World Cup = Ronaldo, Cafu, Ronaldinho"
          ]}
        />

        <AdBanner slot="1234567898" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="soccer-connect-4" gameContext={{ boardId: boardConfig?.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default FootballConnect4;
