import { useState } from 'react';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { FORMATIONS, type Formation } from '@/types/lineupBuilder';
import { GameNav } from '@/components/game/GameNav';
import { Footer } from '@/components/game/Footer';
import { cn } from '@/lib/utils';
import { ArrowRight, RotateCcw, Send, Trophy, Loader2, Flag, Shield } from 'lucide-react';

const formationOptions: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2'];

const LineupBuilder = () => {
  const {
    formation,
    phase,
    currentIndex,
    currentTeam,
    currentPosition,
    positions,
    filledSlots,
    verdict,
    isEvaluating,
    selectFormation,
    submitPlayer,
    evaluateTeam,
    resetGame,
  } = useLineupBuilder();

  const [playerInput, setPlayerInput] = useState('');

  const handleSubmitPlayer = () => {
    if (!playerInput.trim()) return;
    submitPlayer(playerInput);
    setPlayerInput('');
  };

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
        {phase === 'building' && currentTeam && currentPosition && (
          <div className="max-w-xl mx-auto space-y-6">
            {/* Progress */}
            <div className="flex items-center justify-center gap-2">
              {positions.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    i < currentIndex ? 'bg-correct' : i === currentIndex ? 'bg-primary scale-125' : 'bg-secondary'
                  )}
                />
              ))}
            </div>

            {/* Current assignment */}
            <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Position {currentIndex + 1} of 11
              </p>
              <p className="text-xl font-bold text-primary font-display mb-4">{currentPosition.label}</p>

              <div className="flex items-center justify-center gap-2 mb-2">
                {currentTeam.isNation ? (
                  <Flag className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Shield className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {currentTeam.isNation ? 'Nation' : 'Club'}
                </span>
              </div>
              <p className="text-3xl font-bold text-foreground">{currentTeam.name}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Name a player who has played for {currentTeam.name}
              </p>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitPlayer()}
                placeholder="Enter player name..."
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleSubmitPlayer}
                disabled={!playerInput.trim()}
                className={cn(
                  'rounded-xl px-5 py-3 font-semibold transition-all inline-flex items-center gap-2',
                  playerInput.trim()
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed opacity-50'
                )}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Already filled */}
            {filledSlots.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your Squad</p>
                {filledSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-xs font-bold text-primary w-8">{slot.label}</span>
                    <span className="font-semibold text-foreground flex-1">{slot.playerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {slot.isNation ? '🏳️' : '🏟️'} {slot.assignedTeam}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review Phase */}
        {phase === 'reviewing' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <h2 className="text-center text-xl font-bold text-foreground font-display mb-1">
                Your {formation} Starting XI
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-4">Review your team before submitting for evaluation</p>
              <div className="space-y-2">
                {filledSlots.map((slot, i) => (
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
                {isEvaluating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
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

            {/* Show the team */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your {formation} XI</p>
              <div className="space-y-1.5">
                {filledSlots.map((slot, i) => (
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

            <div className="flex justify-center">
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

        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default LineupBuilder;
