import { useState } from 'react';
import { useNbaLineup } from '@/hooks/useNbaLineup';
import { NBA_POSITIONS } from '@/types/nba';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import NbaCourtLayout from '@/components/nba/NbaCourtLayout';
import NbaTeamSpinner from '@/components/nba/NbaTeamSpinner';
import NbaStatSpinner from '@/components/nba/NbaStatSpinner';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import type { PlayerEntity } from '@/lib/playerSearch';
import { NbaHowToPlay } from '@/components/nba/NbaHowToPlay';
import { cn } from '@/lib/utils';
import { RotateCcw, Send, Loader2, AlertCircle, Shuffle, HelpCircle } from 'lucide-react';
import { ResultScreen } from '@/components/game/ResultScreen';
import { NBA_FIVE_HIT_SCORE as HIT_SCORE } from '@/lib/nbaStartingFiveScore';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';

const NbaLineup = () => {
  const {
    phase,
    challenge,
    selectedPosition,
    currentTeam,
    filledSlots,
    filledSlotsArray,
    filledCount,
    result,
    isEvaluating,
    evaluationError,
    isValidating,
    validationError,
    isStatSpinning,
    isTeamSpinning,
    teamAssignments,
    // availablePositions not used in template
    totalStat,
    currentTeamSource,
    filledNormalizedNames,
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

  const fmtStat = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  const [playerInput, setPlayerInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [courtSelection, setCourtSelection] = useState(false);

  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    /* PlayerAutocomplete's own onSelect wiring already sets the input to
       entity.name, and since Round 494 that IS the full "First Last" name: the
       lineup uses the shared NBA source, which searches and displays both name
       columns. This line used to rebuild the full name from a bare surname and
       now just keeps the same value, which is left in place so the brief moment
       before the position-change effect clears the field stays explicit rather
       than depending on the component's internals. */
    setPlayerInput(entity.name);
    await submitPlayer(entity);
  };

  // Clear input when position changes, or after a successful pick (the slot
  // becomes filled, which changes selectedPosition back to null).
  const [lastPos, setLastPos] = useState<number | null>(null);
  if (selectedPosition !== lastPos) {
    if (lastPos !== null) setPlayerInput('');
    setLastPos(selectedPosition);
  }

  return (
    <>
      <PageSeo
        title="NBA Starting 5 - Basketball Lineup Builder Game | DoUKnowBall"
        description="Spin a stat challenge, pick NBA teams, and build the ultimate starting five. Every pick is scored from his real career numbers."
        path="/nba-starting-5"
      />
      <GameShell
        width="wide"
        title="BUILD YOUR NBA STARTING 5"
        subtitle="Spin a stat challenge, get random NBA teams, build the ultimate lineup"
        headerExtra={
          <button
            onClick={() => setShowHowToPlay(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
            aria-label="How to play"
          >
            <HelpCircle className="w-4 h-4" /> How to play
          </button>
        }
      >
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
                      disabled={isFilled || isTeamSpinning || isValidating}
                      aria-pressed={isSelected}
                      onClick={() => { setCourtSelection(false); selectPosition(i); }}
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none',
                        isFilled
                          ? 'bg-orange-500 text-black cursor-default'
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
                    disabled={isValidating}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
                    title="Reroll: get a different team"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Input area - only show when position is selected */}
              {selectedPosition !== null && currentTeam && currentTeamSource && !isTeamSpinning && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Filling: <span className="font-bold text-primary">{NBA_POSITIONS[selectedPosition]?.label}</span> from <span className="font-bold text-orange-400">{currentTeam.name}</span>
                  </p>

                  <div className="relative">
                    <PlayerAutocomplete
                      value={playerInput}
                      onChange={setPlayerInput}
                      onSelect={handleSelectPlayer}
                      searchOptions={{
                        source: currentTeamSource,
                        minChars: 2,
                        limit: 8,
                        exclude: filledNormalizedNames,
                      }}
                      placeholder="Type a player name..."
                      autoFocus={!courtSelection}
                      disabled={isValidating}
                      validateOnly
                    />
                    {isValidating && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Pick a player from the list, only players who played for the {currentTeam.name} will show up
                  </p>

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
                  👆 Select a position above or on the court to start picking a player
                </p>
              )}
            </div>

            {/* Court Layout */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2 text-center">
                Your Starting 5
                {totalStat !== null && challenge && (
                  <span className="ml-2 text-primary">
                    Total: {Number.isInteger(totalStat) ? totalStat : totalStat.toFixed(1)} {challenge.unit}
                  </span>
                )}
              </p>
              <NbaCourtLayout
                positions={NBA_POSITIONS}
                filledSlots={filledSlots}
                selectedPosition={selectedPosition}
                challengeUnit={challenge?.unit}
                onSelectPosition={index => { setCourtSelection(true); selectPosition(index); }}
                selectionDisabled={isTeamSpinning || isValidating}
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

            {evaluationError && (
              <div className="flex items-center justify-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{evaluationError}</span>
              </div>
            )}
          </div>
        )}

        {/* Result Phase */}
        {phase === 'result' && result && (
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

            {/* Round 1555: the result is a score out of 100 from the record,
                on the shared result screen NBA Stat Line uses. Nothing here is
                written by a model: every name and number is a career row. */}
            <ResultScreen
              outcome={result.score >= HIT_SCORE ? 'win' : result.score >= 70 ? 'close' : 'loss'}
              score={result.score}
              scoreLabel="out of 100"
              outcomeEmoji={result.score >= HIT_SCORE ? '🏆' : result.score >= 70 ? '📊' : '🧱'}
              headline={
                result.score === 100 ? 'The best five your teams allowed'
                  : result.score >= HIT_SCORE ? 'Right up there with the best five'
                    : result.score >= 70 ? 'Close, real close' : 'The record had a better five'
              }
              statLine={`Your five: ${fmtStat(result.yourTotal)} ${challenge?.unit ?? ''}. The best five your teams allowed: ${fmtStat(result.best.total)}. The worst: ${fmtStat(result.worst.total)}.`}
              emojiGrid={result.perPick.map(p => (p.closeness >= 0.9 ? '🟩' : p.closeness >= 0.6 ? '🟨' : '⬜')).join('')}
              share={{ score: `${result.score}/100`, gameName: 'NBA Starting 5', gamePath: '/nba-starting-5' }}
              onPlayAgain={resetGame}
              playAgainLabel="Play Again"
            >
              <div className="rounded-xl border border-border bg-surface-1 p-3 text-left space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Your Starting 5</p>
                  <div className="space-y-1">
                    {result.perPick.map(p => (
                      <div key={p.role} className="flex items-center gap-2 text-sm tabular-nums">
                        <span className="text-xs font-bold text-primary w-7">{p.role}</span>
                        <span className="font-semibold text-foreground flex-1 min-w-0 truncate">{p.name}</span>
                        <span className="font-bold text-orange-400">{fmtStat(p.value)}</span>
                        <span className="text-[11px] text-muted-foreground w-24 text-right">best here {fmtStat(p.slotBest)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Best five your teams allowed</p>
                  <div className="space-y-1">
                    {[...result.best.picks].sort((a, b) => NBA_POSITIONS.findIndex(s => s.role === a.role) - NBA_POSITIONS.findIndex(s => s.role === b.role)).map(p => (
                      <div key={p.role} className="flex items-center gap-2 text-sm tabular-nums">
                        <span className="text-xs font-bold text-primary w-7">{p.role}</span>
                        <span className="text-foreground flex-1 min-w-0 truncate">{p.name}</span>
                        <span className="font-bold text-foreground">{fmtStat(p.value)}</span>
                        {/* The nickname: every one is unique and fits the column ("Philadelphia 76ers" did not). */}
                        <span className="text-[11px] text-muted-foreground w-24 text-right truncate" title={p.team}>{p.team.split(' ').pop()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Career numbers from our stat table. The best and worst fives use the same players the search offered you for each team.
                </p>
              </div>
            </ResultScreen>
          </div>
        )}

        <GameSeoContent
          reportControl={<ReportQuestion gameType="nba-starting-5" gameContext={{ team: currentTeam }} />}
          pageHasOwnH1
          title="Pro Basketball Starting 5 | DoUKnowBall"
          description="Build the starting five that matches all the given criteria. Tests your knowledge of NBA rosters, positions and player history."
          howToPlay={[
            "Spin to receive a stat challenge (highest or lowest)",
            "Pick a position and get a random NBA team assignment",
            "Name a player from that team to fill the slot",
            "Submit your lineup for a score out of 100 against the best five your teams allowed",
          ]}
          examples={[
            /* The search lists each man under ONE team, so every example is a
               whole career with that one franchise (Basketball Reference's
               player pages for all five; second sources: nba.com's legend
               profiles for Stockton, Miller and Bird, ESPN's July 2018 report
               of Nowitzki's 21st season with Dallas, Sports Illustrated's 2009
               Hall of Fame piece on Robinson's 14 years with the Spurs). */
            "PG from Jazz = John Stockton",
            "SG from Pacers = Reggie Miller",
            "SF from Celtics = Larry Bird",
            "PF from Mavericks = Dirk Nowitzki",
            "C from Spurs = David Robinson",
            "Challenge: Build lineup with highest combined PPG"
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />


        <GameNav />
      </GameShell>
    </>
  );
};

export default NbaLineup;
