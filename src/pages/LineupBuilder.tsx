import { useState, useEffect, useMemo } from 'react';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { FORMATIONS, type Formation } from '@/types/lineupBuilder';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import FormationPitch from '@/components/lineup/FormationPitch';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { SOCCER_MARKET_VALUE_SOURCE, normalizeName, type PlayerEntity } from '@/lib/playerSearch';
import TeamSpinner from '@/components/lineup/TeamSpinner';
import { cn } from '@/lib/utils';
import { RotateCcw, Send, Trophy, Loader2, AlertCircle, Shuffle, HelpCircle } from 'lucide-react';
import { LineupHowToPlay } from '@/components/lineup/LineupHowToPlay';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

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
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('lineup-rules-seen');
    if (!seen) {
      setShowRules(true);
      localStorage.setItem('lineup-rules-seen', '1');
    }
  }, []);

  const excludedPlayers = useMemo(
    () => new Set(filledSlotsArray.map((slot) => normalizeName(slot.playerName))),
    [filledSlotsArray]
  );

  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    await submitPlayer(entity.name);
    setPlayerInput('');
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
    <>
      <PageSeo
        title="Build Your XI - Soccer Lineup Builder Game | DoUKnowBall"
        description="Spin a random challenge, pick two teams, and build the ultimate starting XI. AI rates your lineup."
        path="/build-your-xi"
      />
      <GameShell
        width="wide"
        title="BUILD YOUR XI"
        subtitle="Pick a formation, fill each position with a player from the given club or nation"
        headerExtra={
          <div className="flex justify-center">
            <button
              onClick={() => setShowRules(true)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
              aria-label="How to play"
            >
              <HelpCircle className="w-4 h-4" /> How to play
            </button>
          </div>
        }
      >
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
                    className="absolute top-2 right-2 flex items-center justify-center w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
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

                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <PlayerAutocomplete
                        value={playerInput}
                        onChange={setPlayerInput}
                        onSelect={handleSelectPlayer}
                        searchOptions={{ source: SOCCER_MARKET_VALUE_SOURCE, exclude: excludedPlayers }}
                        placeholder="Enter player name..."
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
                    <span className="text-xs font-bold text-primary w-10 shrink-0">{slot.label}</span>
                    <span className="font-semibold text-foreground flex-1 min-w-0 truncate">{slot.playerName}</span>
                    <span className="text-xs text-muted-foreground shrink-0 max-w-[35%] truncate">
                      {slot.isNation ? '🏳️' : '🏟️'} {slot.assignedTeam}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
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
          <div className="max-w-xl mx-auto">
            <ResultScreen
              outcomeEmoji={<Trophy className="w-12 h-12 text-primary mx-auto" />}
              headline={verdict.rating}
              statLine={<span className="font-semibold">{verdict.headline}</span>}
              funFact={<span className="whitespace-pre-line">{verdict.analysis}</span>}
              emojiGrid={`Build Your XI: ${formation} rated ${verdict.rating}`}
              share={{
                score: verdict.rating,
                gameName: 'Build Your XI',
                gamePath: '/build-your-xi',
              }}
              onPlayAgain={resetGame}
            >
              <div className="bg-secondary/30 rounded-2xl p-4 mb-2 text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your {formation} XI</p>
                <div className="space-y-1.5">
                  {filledSlotsArray.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3 bg-card/60 rounded-lg px-3 py-2 text-sm">
                      <span className="text-xs font-bold text-primary w-8 shrink-0">{slot.label}</span>
                      <span className="font-semibold text-foreground flex-1 min-w-0 truncate">{slot.playerName}</span>
                      <span className="text-xs text-muted-foreground shrink-0 max-w-[35%] truncate">
                        {slot.isNation ? '🏳️' : '🏟️'} {slot.assignedTeam}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ResultScreen>
          </div>
        )}

        <GameSeoContent
          title="Build Your XI | DoUKnowBall"
          description="Build your ultimate starting eleven from players who match specific criteria. Test your football knowledge across positions, teams and eras."
          howToPlay={[
            "Choose a formation for your starting eleven",
            "Spin to get a random team assignment for each position",
            "Name a player from that team who fits the position",
            "Submit your full XI for an AI-powered evaluation and rating",
          ]}
          examples={[
            "GK from Real Madrid: Thibaut Courtois",
            "CB from Barcelona: Ronald Araújo",
            "LB from Liverpool: Andrew Robertson",
            "CM from Manchester City: Rodri",
            "RW from Arsenal: Bukayo Saka",
            "ST from Bayern Munich: Harry Kane",
            "Formations: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1"
          ]}
        />

        <AdBanner slot="1234567896" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="build-your-xi" gameContext={{ team: currentTeam, formation }} />
        </div>
        <GameNav />

        <LineupHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default LineupBuilder;
