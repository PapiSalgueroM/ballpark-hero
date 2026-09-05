import { useState, useEffect, useMemo } from 'react';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { FORMATIONS, type Formation } from '@/types/lineupBuilder';
import { GameNav } from '@/components/game/GameNav';
import { FlagImg } from '@/components/FlagImg';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import FormationPitch from '@/components/lineup/FormationPitch';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { SOCCER_MARKET_VALUE_SOURCE, normalizeName, type PlayerEntity, type PlayerSourceConfig } from '@/lib/playerSearch';
import { clubSearchTerm, nationSearchTerm } from '@/data/lineupTeams';
import TeamSpinner from '@/components/lineup/TeamSpinner';
import { cn } from '@/lib/utils';
import { RotateCcw, Send, Trophy, Loader2, AlertCircle, Shuffle, HelpCircle } from 'lucide-react';
import { LineupHowToPlay } from '@/components/lineup/LineupHowToPlay';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { computeChemistry, formatChemistry } from '@/lib/chemistry';
import { StatTile } from '@/components/game/StatTile';
import { normalizePosition, playerRating } from '@/lib/squadDeal';
import { ordinal, simulateWorldXiSeason, type WxPlayer } from '@/lib/worldXi';

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
    checkingDown,
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

  // Scope the autocomplete pool to the current slot's assigned club/nation so
  // it is impossible to select a player who doesn't meet the slot's
  // constraint (previously the search covered every player in
  // player_market_values with no team filter, so any real player's name
  // would show up and be accepted regardless of the assigned team). Filters
  // on `nationality` (stored as a clean exact value like "Argentina") use an
  // eq match; `club` is filtered with ilike because the table stores fuller
  // club names for some entries (e.g. "FC Barcelona", "Real Madrid Castilla"
  // as a loan/reserve variant) and clubSearchTerm corrects the few clubs
  // whose short label doesn't substring-match the stored name at all (PSG,
  // Atlético Madrid, Bayer Leverkusen; verified via execute_sql on
  // flawuiqbvjobmkfkauhw, 2026-07-06).
  const teamScopedSource: PlayerSourceConfig | null = useMemo(() => {
    if (!currentTeam) return null;
    return {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: currentTeam.isNation
        ? [{ column: 'nationality', op: 'eq', value: nationSearchTerm(currentTeam.name) }]
        : [{ column: 'club', op: 'ilike', value: clubSearchTerm(currentTeam.name) }],
    };
  }, [currentTeam]);

  /* Round 442: the whole dropdown row rides along to the hook now. It is what
     the position gate reads, and it is what the season report is built from,
     so it has to survive the validator renaming the pick. */
  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    const raw = typeof entity.meta.position === 'string' ? entity.meta.position : undefined;
    await submitPlayer(entity.name, {
      rawPosition: raw,
      position: (raw ? normalizePosition(raw.trim()) : null) ?? undefined,
      club: entity.meta.club,
      nationality: entity.meta.nationality,
      value: typeof entity.meta.value === 'number' ? entity.meta.value : undefined,
      age: typeof entity.meta.age === 'number' ? entity.meta.age : undefined,
      year: typeof entity.meta.year === 'number' ? entity.meta.year : undefined,
    });
    setPlayerInput('');
  };

  const chemistry = useMemo(
    () =>
      computeChemistry(
        filledSlotsArray.map((slot) => ({
          name: slot.playerName,
          club: slot.pick?.club,
          nationality: slot.pick?.nationality,
        })),
      ),
    [filledSlotsArray]
  );

  /* Round 442, his "the simulation wasnt that good like other games and the
     details were bland". The result was one AI paragraph and a list of names.
     Everything below is built from the row each pick came from (position, market
     value, age, season), so it is the same data the search already showed him
     and nothing here is invented.
     The season itself is World XI's engine, not a second one: same rating
     curve, same win-probability table, same seeding, so a squad rated 84 here
     and 84 there plays the same season. */
  const ratedXi = useMemo(
    () =>
      filledSlotsArray.map((slot) => {
        const value = slot.pick?.value ?? 0;
        const age = slot.pick?.age;
        return {
          slot,
          value,
          rating: value > 0 ? playerRating({ marketValue: value / 1_000_000, age: age ?? 27 } as Parameters<typeof playerRating>[0]) : null,
        };
      }),
    [filledSlotsArray]
  );

  /* The sim needs a value for every man, and every pick comes from a dropdown
     row that has one, so this is a guard rather than a common case: if a squad
     ever reaches the result screen without values, it gets the verdict and no
     invented season. */
  const seasonReport = useMemo(() => {
    if (phase !== 'result' || ratedXi.length !== 11 || ratedXi.some((r) => r.value <= 0)) return null;
    const squad: WxPlayer[] = ratedXi.map(({ slot, value }) => ({
      name: slot.playerName,
      country: slot.pick?.nationality ?? '',
      position: slot.pick?.position ?? slot.role,
      club: slot.pick?.club ?? '',
      value,
      age: slot.pick?.age,
    }));
    return simulateWorldXiSeason(squad, formation ?? '4-3-3');
  }, [phase, ratedXi, formation]);

  /* Which third of the pitch this XI is actually built on, averaged from the
     same card ratings. Slots are bucketed by the slot the player filled, not by
     his own position, because that is the shape of the team he picked. */
  const lineStrength = useMemo(() => {
    const buckets: Record<'Defence' | 'Midfield' | 'Attack', number[]> = { Defence: [], Midfield: [], Attack: [] };
    for (const { slot, rating } of ratedXi) {
      if (rating === null) continue;
      const role = slot.role;
      if (role === 'GK' || role === 'CB' || role === 'LB' || role === 'RB' || role === 'LWB' || role === 'RWB') buckets.Defence.push(rating);
      else if (role === 'LW' || role === 'RW' || role === 'ST' || role === 'CF') buckets.Attack.push(rating);
      else buckets.Midfield.push(rating);
    }
    return (Object.keys(buckets) as (keyof typeof buckets)[]).map((line) => ({
      line,
      avg: buckets[line].length ? Math.round(buckets[line].reduce((a, b) => a + b, 0) / buckets[line].length) : null,
    }));
  }, [ratedXi]);

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
              className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
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
                    title="Reroll: get a different team"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Input area */}
              {/* Round 413: once the day allowance is spent the search box
                  would only hand back the same refusal, so the strip says so
                  instead of inviting a retry that cannot succeed. */}
              {selectedPositionIndex !== null && currentTeam && !isSpinning && checkingDown && (
                <p className="text-center text-sm text-muted-foreground animate-fade-in">
                  Answer checking has used up its allowance for today. Your lineup is saved; come back tomorrow.
                </p>
              )}

              {selectedPositionIndex !== null && currentTeam && !isSpinning && !checkingDown && (
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
                        searchOptions={{ source: teamScopedSource ?? SOCCER_MARKET_VALUE_SOURCE, exclude: excludedPlayers }}
                        placeholder={currentTeam ? `Search a ${currentTeam.name} player...` : 'Enter player name...'}
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
                      {slot.isNation ? <FlagImg name={slot.assignedTeam} size={16} showLabel /> : <>🏟️ {slot.assignedTeam}</>}
                    </span>
                  </div>
                ))}
              </div>
              {chemistry.totalBonus > 0 && (
                <div className="mt-4 text-center">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
                    {formatChemistry(chemistry)}
                  </span>
                </div>
              )}
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
              emojiGrid={
                seasonReport
                  ? `Build Your XI: ${formation} rated ${verdict.rating}\nSeason sim: ${seasonReport.squadRating}/100, finished ${ordinal(seasonReport.tablePosition)}`
                  : `Build Your XI: ${formation} rated ${verdict.rating}`
              }
              share={{
                score: seasonReport ? `${verdict.rating}, ${seasonReport.squadRating}/100` : verdict.rating,
                gameName: 'Build Your XI',
                gamePath: '/build-your-xi',
              }}
              onPlayAgain={resetGame}
            >
              <div className="bg-secondary/30 rounded-2xl p-4 mb-2 text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your {formation} XI</p>
                <div className="space-y-1.5">
                  {ratedXi.map(({ slot, rating }, i) => (
                    <div key={i} className="flex items-center gap-2 bg-card/60 rounded-lg px-3 py-2 text-sm">
                      <span className="text-xs font-bold text-primary w-8 shrink-0">{slot.label}</span>
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground block truncate">{slot.playerName}</span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {/* His own position, and the year of the season this
                              value and rating come from. Both are the row he
                              picked, so "why is he rated that" has an answer on
                              screen. */}
                          {slot.pick?.position && slot.pick.position !== slot.role
                            ? `${slot.pick.position} covering at ${slot.label}`
                            : slot.pick?.position ?? ''}
                          {slot.pick?.year ? ` · ${slot.pick.year} value` : ''}
                        </span>
                      </span>
                      {rating !== null && (
                        <span className="text-xs font-bold text-gold shrink-0 tabular-nums">{rating}</span>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0 max-w-[32%] truncate">
                        {slot.isNation ? <FlagImg name={slot.assignedTeam} size={16} showLabel /> : <>🏟️ {slot.assignedTeam}</>}
                      </span>
                    </div>
                  ))}
                </div>
                {chemistry.totalBonus > 0 && (
                  <div className="mt-3 text-center">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-surface-2 text-gold text-sm font-semibold">
                      {formatChemistry(chemistry)}
                    </span>
                  </div>
                )}
              </div>

              {seasonReport && (
                <div className="rounded-2xl border border-primary/30 bg-surface-1 p-4 mb-2 text-left">
                  <div className="text-center mb-3">
                    <div className="text-2xl mb-1">📋</div>
                    <h3 className="text-base font-bold text-primary font-display">Season Report</h3>
                    <p className="text-xs text-muted-foreground">One season with this XI, every player at his peak</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <StatTile label="Squad Rating" value={`${seasonReport.squadRating}/100`} state="correct" />
                    <StatTile
                      label="League Finish"
                      value={`${ordinal(seasonReport.tablePosition)} / 20`}
                      state={seasonReport.tablePosition <= 4 ? 'correct' : seasonReport.tablePosition <= 10 ? 'close' : 'incorrect'}
                    />
                    <StatTile label="Points" value={seasonReport.points} state="pending" />
                    <StatTile
                      label="Trophies"
                      value={seasonReport.trophies.length}
                      state={seasonReport.trophies.length > 0 ? 'correct' : 'incorrect'}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {lineStrength.map(({ line, avg }) => (
                      <StatTile key={line} label={line} value={avg ?? '-'} state="pending" />
                    ))}
                  </div>

                  <div className="grid gap-1.5 text-sm">
                    {/* Round 449: the transfer saga line comes here too now.
                        Round 442 kept it off this page because it named a
                        real footballer in an invented bust-up; the engine's
                        lines are about the club and the window now, and the
                        player is only ever his role, so both pages show the
                        same report. scripts/simNoInventedConduct.mjs holds
                        that. */}
                    {seasonReport.narrative
                      .map((line, i) => (
                        <p key={i} className="bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-foreground/90">
                          {line}
                        </p>
                      ))}
                  </div>
                </div>
              )}
            </ResultScreen>
          </div>
        )}

        <GameSeoContent
          pageHasOwnH1
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
            "Refused: a goalkeeper in a CM slot, because a keeper only goes in goal",
            "Formations: 4-3-3, 4-4-2, 3-5-2, 4-2-3-1"
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />

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
