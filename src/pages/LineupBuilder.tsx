import { useState } from 'react';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { FORMATIONS, type Formation } from '@/types/lineupBuilder';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import FormationPitch from '@/components/lineup/FormationPitch';
import PlayerSuggestions from '@/components/lineup/PlayerSuggestions';
import TeamSpinner from '@/components/lineup/TeamSpinner';
import { cn } from '@/lib/utils';
import { ArrowRight, RotateCcw, Send, Trophy, Loader2, AlertCircle, Shuffle, Share2 } from 'lucide-react';
import { shareResult } from '@/lib/share';

const formationOptions: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2'];

const LineupBuilder = () => {
  const {
    formation,
    phase,
    selectedPositionIndex,
    currentTeam,
    positions,
    filledSlots,
    filledSlotsArray,
    filledCount,
    verdict,
    isEvaluating,
    isValidating,
    validationError,
    isSpinning,
    selectFormation,
    selectPosition,
    submitPlayer,
    evaluateTeam,
    resetGame,
    finishSpin,
    rerollTeam,
    teamAssignments,
  } = useLineupBuilder();

  const [playerInput, setPlayerInput] = useState('');

  const handleSubmitPlayer = async () => {
    if (!playerInput.trim() || isValidating) return;
    await submitPlayer(playerInput);
    if (!validationError) setPlayerInput('');
  };

  // Clear input when validation succeeds (position changes)
  const [lastPos, setLastPos] = useState<number | null>(null);
  if (selectedPositionIndex !== lastPos) {
    if (lastPos !== null && selectedPositionIndex === null) {
      // Player was accepted
      setPlayerInput('');
    }
    setLastPos(selectedPositionIndex);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] text-primary font-display mb-1">
            BUILD YOUR XI
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Pick a formation, fill each position with a player from the given club or nation
          </p>
        </header>

        {/* Formation Selection */}
        {phase === 'formation' && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-center text-lg font-semibold text-foreground mb-4">Choose Your Formation</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formationOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => selectFormation(f)}
                  className="rounded-xl border border-border bg-card hover:bg-primary hover:text-primary-foreground transition-all p-6 text-center group"
                >
                  <span className="text-2xl font-bold font-display group-hover:scale-110 transition-transform inline-block">
                    {f}
                  </span>
                  <span className="block text-xs text-muted-foreground group-hover:text-primary-foreground/70 mt-1">
                    {FORMATIONS[f].length} players
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Building Phase */}
        {phase === 'building' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-center gap-1.5">
              {positions.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    filledSlots.has(i) ? 'bg-correct' : selectedPositionIndex === i ? 'bg-primary scale-125' : 'bg-secondary'
                  )}
                />
              ))}
              <span className="ml-2 text-xs text-muted-foreground font-semibold">{filledCount}/11</span>
            </div>

            {/* Spinner + Input on top */}
            <div className="max-w-lg mx-auto space-y-4">
              {/* Slot machine spinner + reroll */}
              <div className="relative">
                <TeamSpinner
                  teams={teamAssignments}
                  targetIndex={filledCount}
                  isSpinning={isSpinning}
                  onFinish={finishSpin}
                />
                {!isSpinning && currentTeam && (
                  <button
                    onClick={rerollTeam}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                    title="Reroll – get a different team"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Input area */}
              {selectedPositionIndex !== null && currentTeam && !isSpinning && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Filling: <span className="font-bold text-primary">{positions[selectedPositionIndex]?.label}</span>
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerInput}
                      onChange={(e) => {
                        setPlayerInput(e.target.value);
                      }}
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

                  {/* Player suggestions */}
                  <PlayerSuggestions
                    query={playerInput}
                    teamName={currentTeam.name}
                    isNation={currentTeam.isNation}
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

              {selectedPositionIndex === null && !isSpinning && (
                <p className="text-center text-sm text-muted-foreground animate-fade-in">
                  ↓ Select a position on the pitch
                </p>
              )}
            </div>

            {/* Formation Pitch on bottom */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 text-center">
                Tap a position to fill it
              </p>
              <FormationPitch
                positions={positions}
                filledSlots={filledSlots}
                selectedIndex={selectedPositionIndex}
                onSelectPosition={selectPosition}
              />
            </div>
          </div>
        )}

        {/* Review Phase */}
        {phase === 'reviewing' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <h2 className="text-center text-xl font-bold text-foreground font-display mb-1">
                Your {formation} Starting XI
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-4">Review your team before submitting</p>
              <div className="space-y-2">
                {filledSlotsArray.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-4 py-2.5">
                    <span className="text-xs font-bold text-primary w-10">{slot.label}</span>
                    <span className="font-semibold text-foreground flex-1">{slot.playerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {slot.isNation ? '🏳️' : '🏟️'} {slot.assignedTeam}
                    </span>
                  </div>
                ))}
              </div>
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
                {isEvaluating ? 'Evaluating...' : 'Submit Team'}
              </button>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {phase === 'result' && verdict && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
              <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-primary font-display mb-1">{verdict.rating}</h2>
              <p className="text-lg font-semibold text-foreground mb-3">{verdict.headline}</p>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{verdict.analysis}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your {formation} XI</p>
              <div className="space-y-1.5">
                {filledSlotsArray.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-xs font-bold text-primary w-8">{slot.label}</span>
                    <span className="font-semibold text-foreground flex-1">{slot.playerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {slot.isNation ? '🏳️' : '🏟️'} {slot.assignedTeam}
                    </span>
                  </div>
                ))}
              </div>
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
                    (s) => `${s.label} – ${s.playerName} (${s.isNation ? '🏳️' : '🏟️'} ${s.assignedTeam})`
                  );
                  const text = `⚽ My Build Your XI – ${formation}\n${verdict.rating}\n"${verdict.headline}"\n\n${lines.join('\n')}\n\nPlay at footyfein.lovable.app/build-your-xi`;
                  shareResult(text, 'Build Your XI');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        )}

        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default LineupBuilder;
