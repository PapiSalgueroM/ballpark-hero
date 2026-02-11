import { useState } from 'react';
import { useNbaLineup } from '@/hooks/useNbaLineup';
import { NBA_POSITIONS } from '@/types/nba';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import NbaCourtLayout from '@/components/nba/NbaCourtLayout';
import NbaTeamSpinner from '@/components/nba/NbaTeamSpinner';
import NbaStatSpinner from '@/components/nba/NbaStatSpinner';
import NbaPlayerSuggestions from '@/components/nba/NbaPlayerSuggestions';
import { NbaHowToPlay } from '@/components/nba/NbaHowToPlay';
import { cn } from '@/lib/utils';
import { ArrowRight, RotateCcw, Send, Trophy, Loader2, AlertCircle, Shuffle, Share2, HelpCircle } from 'lucide-react';
import { shareResult } from '@/lib/share';
import AdBanner from '@/components/ads/AdBanner';

const NbaLineup = () => {
  const {
    phase,
    challenge,
    selectedPosition,
    currentTeam,
    filledSlots,
    filledSlotsArray,
    filledCount,
    verdict,
    isEvaluating,
    isValidating,
    validationError,
    isStatSpinning,
    isTeamSpinning,
    teamAssignments,
    // availablePositions not used in template
    totalStat,
    startGame,
    finishStatSpin,
    beginBuilding,
    finishTeamSpin,
    selectPosition,
    rerollTeam,
    submitPlayer,
    evaluateTeam,
    resetGame,
  } = useNbaLineup();

  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const handleSubmitPlayer = async () => {
    if (!playerInput.trim() || isValidating) return;
    await submitPlayer(playerInput);
    if (!validationError) setPlayerInput('');
  };

  // Clear input when position changes
  const [lastPos, setLastPos] = useState<number | null>(null);
  if (selectedPosition !== lastPos) {
    if (lastPos !== null && selectedPosition !== null) setPlayerInput('');
    setLastPos(selectedPosition);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8 relative">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] text-primary font-display mb-1">
            BUILD YOUR STARTING 5
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Spin a stat challenge, get random NBA teams, build the ultimate lineup
          </p>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="absolute top-0 right-0 p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="How to Play"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
        </header>

        <NbaHowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />

        {/* Challenge Phase - Stat Spinner */}
        {phase === 'challenge' && (
          <div className="max-w-lg mx-auto space-y-6">
            <NbaStatSpinner
              challenge={challenge}
              isSpinning={isStatSpinning}
              onFinish={finishStatSpin}
            />

            {!isStatSpinning && challenge && (
              <div className="flex justify-center animate-fade-in">
                <button
                  onClick={beginBuilding}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-all"
                >
                  Let's Go! 🏀
                </button>
              </div>
            )}

            {!challenge && !isStatSpinning && (
              <div className="flex justify-center">
                <button
                  onClick={startGame}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-all"
                >
                  Spin Challenge 🎰
                </button>
              </div>
            )}
          </div>
        )}

        {/* Building Phase */}
        {phase === 'building' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Stat Challenge Banner */}
            {challenge && (
              <div className={cn(
                'text-center rounded-xl px-4 py-3 font-semibold text-sm',
                challenge.direction === 'highest'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              )}>
                {challenge.emoji} Find the {challenge.direction === 'highest' ? '⬆️ HIGHEST' : '⬇️ LOWEST'} {challenge.stat} ({challenge.unit})
              </div>
            )}

            {/* Position Picker */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Pick a position ({filledCount}/5 filled)
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {NBA_POSITIONS.map((pos, i) => {
                  const isFilled = filledSlots.has(i);
                  const isSelected = selectedPosition === i;
                  return (
                    <button
                      key={i}
                      disabled={isFilled || isTeamSpinning}
                      onClick={() => selectPosition(i)}
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all',
                        isFilled
                          ? 'bg-orange-500 text-white cursor-default'
                          : isSelected
                            ? 'bg-primary text-primary-foreground scale-110 ring-2 ring-primary/50'
                            : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                      )}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team Spinner + Input */}
            <div className="max-w-lg mx-auto space-y-4">
              <div className="relative">
                <NbaTeamSpinner
                  teams={teamAssignments}
                  targetIndex={filledCount}
                  isSpinning={isTeamSpinning}
                  onFinish={finishTeamSpin}
                />
                {!isTeamSpinning && currentTeam && (
                  <button
                    onClick={rerollTeam}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                    title="Reroll – get a different team"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Input area - only show when position is selected */}
              {selectedPosition !== null && currentTeam && !isTeamSpinning && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Filling: <span className="font-bold text-primary">{NBA_POSITIONS[selectedPosition]?.label}</span> from <span className="font-bold text-orange-400">{currentTeam.name}</span>
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerInput}
                      onChange={(e) => setPlayerInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitPlayer()}
                      placeholder="Enter player name..."
                      className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      disabled={isValidating}
                    />
                    <button
                      onClick={handleSubmitPlayer}
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
                        <ArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <NbaPlayerSuggestions
                    query={playerInput}
                    teamName={currentTeam.name}
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

              {/* Prompt to pick position if none selected */}
              {selectedPosition === null && !isTeamSpinning && currentTeam && filledCount < 5 && (
                <p className="text-sm text-center text-muted-foreground animate-fade-in">
                  👆 Select a position above to start picking a player
                </p>
              )}
            </div>

            {/* Court Layout */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 text-center">
                Your Starting 5
                {totalStat !== null && challenge && (
                  <span className="ml-2 text-primary">
                    — Total: {Number.isInteger(totalStat) ? totalStat : totalStat.toFixed(1)} {challenge.unit}
                  </span>
                )}
              </p>
              <NbaCourtLayout
                positions={NBA_POSITIONS}
                filledSlots={filledSlots}
                selectedPosition={selectedPosition}
                challengeUnit={challenge?.unit}
              />
            </div>
          </div>
        )}

        {/* Review Phase */}
        {phase === 'reviewing' && (
          <div className="max-w-xl mx-auto space-y-6">
            {challenge && (
              <div className={cn(
                'text-center rounded-xl px-4 py-3 font-semibold text-sm',
                challenge.direction === 'highest'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              )}>
                {challenge.emoji} {challenge.direction === 'highest' ? '⬆️ HIGHEST' : '⬇️ LOWEST'} {challenge.stat} ({challenge.unit})
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <h2 className="text-center text-xl font-bold text-foreground font-display mb-1">
                Your Starting 5
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-4">Review your lineup before submitting</p>
              <div className="space-y-2">
                {filledSlotsArray.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-4 py-2.5">
                    <span className="text-xs font-bold text-primary w-10">{slot.label}</span>
                    <span className="font-semibold text-foreground flex-1">{slot.playerName}</span>
                    {slot.statValue !== undefined && slot.statValue !== null && (
                      <span className="text-sm font-bold text-orange-400">
                        {typeof slot.statValue === 'number'
                          ? Number.isInteger(slot.statValue) ? slot.statValue : slot.statValue.toFixed(1)
                          : slot.statValue} {challenge?.unit}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">🏀 {slot.assignedTeam}</span>
                  </div>
                ))}
              </div>
              {totalStat !== null && challenge && (
                <div className="mt-4 text-center text-lg font-bold text-primary">
                  Total: {Number.isInteger(totalStat) ? totalStat : totalStat.toFixed(1)} {challenge.unit}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={resetGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-semibold hover:bg-secondary/80 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </button>
              <button
                onClick={evaluateTeam}
                disabled={isEvaluating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isEvaluating ? 'Evaluating...' : 'Submit Lineup'}
              </button>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {phase === 'result' && verdict && (
          <div className="max-w-xl mx-auto space-y-6">
            {challenge && (
              <div className={cn(
                'text-center rounded-xl px-4 py-3 font-semibold text-sm',
                challenge.direction === 'highest'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              )}>
                {challenge.emoji} {challenge.direction === 'highest' ? '⬆️ HIGHEST' : '⬇️ LOWEST'} {challenge.stat} ({challenge.unit})
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
              <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-primary font-display mb-1">{verdict.rating}</h2>
              <p className="text-lg font-semibold text-foreground mb-3">{verdict.headline}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{verdict.analysis}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your Starting 5</p>
              <div className="space-y-1.5">
                {filledSlotsArray.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-xs font-bold text-primary w-8">{slot.label}</span>
                    <span className="font-semibold text-foreground flex-1">{slot.playerName}</span>
                    {slot.statValue !== undefined && slot.statValue !== null && (
                      <span className="text-xs font-bold text-orange-400">
                        {typeof slot.statValue === 'number'
                          ? Number.isInteger(slot.statValue) ? slot.statValue : slot.statValue.toFixed(1)
                          : slot.statValue} {challenge?.unit}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">🏀 {slot.assignedTeam}</span>
                  </div>
                ))}
              </div>
              {totalStat !== null && challenge && (
                <div className="mt-3 text-center text-lg font-bold text-primary">
                  Total: {Number.isInteger(totalStat) ? totalStat : totalStat.toFixed(1)} {challenge.unit}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={resetGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-semibold hover:bg-secondary/80 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
              <button
                onClick={() => {
                  const lines = filledSlotsArray.map(
                    (s) => `${s.label} – ${s.playerName}${s.statValue != null ? ` (${s.statValue} ${challenge?.unit})` : ''} (🏀 ${s.assignedTeam})`
                  );
                  const dir = challenge?.direction === 'highest' ? '⬆️' : '⬇️';
                  const totalLine = totalStat !== null ? `\nTotal: ${Number.isInteger(totalStat) ? totalStat : totalStat.toFixed(1)} ${challenge?.unit}` : '';
                  const text = `🏀 My NBA Starting 5\n${dir} ${challenge?.stat} Challenge\n${verdict.rating}\n"${verdict.headline}"\n\n${lines.join('\n')}${totalLine}\n\nPlay at douknowball.lovable.app/nba-starting-5`;
                  shareResult(text, 'NBA Starting 5');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        )}

        <AdBanner slot="1234567897" format="horizontal" className="mt-8" />

        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default NbaLineup;
