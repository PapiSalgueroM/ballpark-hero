import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLineupBuilder } from '@/hooks/useLineupBuilder';
import { FORMATIONS, type Formation, type DraftChoice, type AIVerdict } from '@/types/lineupBuilder';
import { GameNav } from '@/components/game/GameNav';
import { FlagImg } from '@/components/FlagImg';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import FormationPitch from '@/components/lineup/FormationPitch';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { SOCCER_MARKET_VALUE_SOURCE, normalizeName, type PlayerEntity, type PlayerSourceConfig } from '@/lib/playerSearch';
import { clubTableNames, nationSearchTerm, nationSquadTerm } from '@/data/lineupTeams';
import TeamSpinner from '@/components/lineup/TeamSpinner';
import { cn } from '@/lib/utils';
import { RotateCcw, Send, Trophy, Loader2, AlertCircle, Shuffle, HelpCircle } from 'lucide-react';
import { LineupHowToPlay } from '@/components/lineup/LineupHowToPlay';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { supabase } from '@/integrations/supabase/client';
import { StatTile } from '@/components/game/StatTile';
import { normalizePosition, playerRating } from '@/lib/squadDeal';
import { ordinal, simulateWorldXiSeason, type WxPlayer } from '@/lib/worldXi';
import { SeasonReportTabs } from '@/components/world-xi/SeasonReportTabs';
import { lineupFitSlots, seasonAdjust, xiFitBreakdown, type XiFitSlot } from '@/lib/xiFit';
import { XiFitBreakdown, XiFitWorth } from '@/components/lineup/XiFitBreakdown';
import { safeSetItem } from '@/lib/safeStorage';

const formationOptions: Formation[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2'];

const LineupBuilder = () => {
  const {
    formation,
    phase,
    draftChoice,
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
    completeRecordedYearDraft,
    resetGame,
    finishSpin,
    rerollTeam,
    teamAssignments,
  } = useLineupBuilder();

  const [playerInput, setPlayerInput] = useState('');
  const inputRevision = useRef(0);
  const [showRules, setShowRules] = useState(false);
  const [setupMode, setSetupMode] = useState<DraftChoice['mode']>('mixed');
  const [setupYear, setSetupYear] = useState(2026);
  const [browsingPlayers, setBrowsingPlayers] = useState(false);
  const [browseActivation, setBrowseActivation] = useState(0);
  const inputOwner = useRef<HTMLDivElement>(null);
  const isClubYear = draftChoice.mode === 'club-year';
  const recordedYear = draftChoice.mode === 'club-year' ? draftChoice.year : null;
  const searchDisabled = isValidating || selectedPositionIndex === null || !currentTeam || isSpinning || checkingDown;

  useEffect(() => {
    setBrowsingPlayers(false);
  }, [currentTeam, selectedPositionIndex, draftChoice, phase]);

  useLayoutEffect(() => {
    if (browseActivation > 0) inputOwner.current?.querySelector('input')?.focus({ preventScroll: true });
  }, [browseActivation]);

  useEffect(() => {
    const seen = localStorage.getItem('lineup-rules-seen');
    if (!seen) {
      setShowRules(true);
      safeSetItem('lineup-rules-seen', '1');
    }
  }, []);

  const excludedPlayers = useMemo(
    () => new Set(filledSlotsArray.map((slot) => normalizeName(slot.playerName))),
    [filledSlotsArray]
  );

  /* Round 484: the men this country has actually named in a squad, lifted to
     the top of the nation slot's suggestions.

     The nation pool has to stay wide or slots become unfillable (Round 442),
     but wide means wrong-shaped: the game asks who has PLAYED FOR a country and
     the pool is everyone who holds the passport. Argentina offers 1,567 names
     and 76 of them have ever been named in a squad we hold; Italy offers 1,571
     and we hold no Italy squad at all. Filtering would empty Italy. Ranking
     costs nothing and puts the eight names the player actually sees in the
     right order, and those are exactly the picks the validator can now confirm
     from our own records without spending an AI call.

     A country we hold no list for gets an empty set and the old order, which is
     why this is a boost and never a filter. */
  const [cappedNames, setCappedNames] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!currentTeam?.isNation) { setCappedNames(new Set()); return; }
    let live = true;
    (async () => {
      const { data } = await supabase
        .from('national_team_squads')
        .select('player_name')
        .eq('country', nationSquadTerm(currentTeam.name))
        .limit(400);
      if (!live) return;
      setCappedNames(new Set((data ?? []).map((r) => normalizeName(r.player_name)).filter(Boolean)));
    })().catch(() => { if (live) setCappedNames(new Set()); });
    return () => { live = false; };
  }, [currentTeam]);

  /* Scope the autocomplete pool to the slot's assigned club or nation, so a
     player who does not meet the slot's constraint cannot be selected at all.
     Before this existed the search covered every player in the table with no
     team filter and any real name was offered and accepted.

     Round 483: the club leg is an EXACT match on the stored names now, not a
     substring. Measured 2026-09-06, the substring offered 448 different
     players for Barcelona against the 194 who ever played there (RCD Espanyol
     Barcelona and Barcelona SC Guayaquil both contain the word), 410 for
     Porto against 221 (Gremio Foot-Ball Porto Alegrense), and Newcastle
     United Jets of Australia for Newcastle. The game was suggesting names its
     own validator then refused, which is the Transfer Path defect of Round 294
     wearing different clothes.

     The nation leg is still nationality, and it is still WRONG in the same
     way, deliberately left for its own round: the game asks who played FOR a
     country and the pool holds everyone who could have. Argentina offers 1,567
     names and 76 have ever been in one of our squad lists. It is not fixed
     here because the only proof of a cap we hold runs 2018 to 2026 and has no
     Italy at all, so filtering to it would empty slots rather than correct
     them, and Round 442 was spent fixing exactly that. The fix is a pool that
     puts proven internationals first and falls back to nationality, which the
     shared search config cannot express today. */
  const teamScopedSource: PlayerSourceConfig | null = useMemo(() => {
    if (!currentTeam) return null;
    const source: PlayerSourceConfig = {
      ...SOCCER_MARKET_VALUE_SOURCE,
      filters: currentTeam.isNation
        ? [{ column: 'nationality', op: 'eq', value: nationSearchTerm(currentTeam.name) }]
        : [{ column: 'club', op: 'in', value: clubTableNames(currentTeam.name) }],
    };
    return recordedYear === null ? source : {
      ...source, filters: [...(source.filters ?? []), { column: 'year', op: 'eq', value: recordedYear }],
    };
  }, [currentTeam, recordedYear]);

  /* Round 442: the whole dropdown row rides along to the hook now. It is what
     the position gate reads, and it is what the season report is built from,
     so it has to survive the validator renaming the pick. */
  const handleSelectPlayer = async (entity: PlayerEntity) => {
    if (isValidating) return;
    const revision = inputRevision.current;
    const raw = typeof entity.meta.position === 'string' ? entity.meta.position : undefined;
    await submitPlayer(entity.name, {
      rawName: entity.rawName,
      rawPosition: raw,
      position: (raw ? normalizePosition(raw.trim()) : null) ?? undefined,
      club: entity.meta.club,
      nationality: entity.meta.nationality,
      value: typeof entity.meta.value === 'number' ? entity.meta.value : undefined,
      age: typeof entity.meta.age === 'number' ? entity.meta.age : undefined,
      year: typeof entity.meta.year === 'number' ? entity.meta.year : undefined,
    });
    if (inputRevision.current === revision) setPlayerInput('');
  };

  /* Round 825: role fit, chemistry and balance, slot by slot, off the rows
     the picks came from. The season sim reads these three numbers, and the
     same breakdown is what the tiles show while you pick, before you submit
     and on the result card. It replaced the old chemistry chip, which counted
     every pair on the pitch and moved nothing. */
  const fitSlots: XiFitSlot[] = useMemo(() => lineupFitSlots(positions, filledSlots), [positions, filledSlots]);
  const fitBreakdown = useMemo(() => xiFitBreakdown(fitSlots), [fitSlots]);
  const slotLabels = useMemo(() => positions.map((p) => p.label), [positions]);

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
        const recordedInputs = Number.isFinite(value) && value > 0 && typeof age === 'number' && Number.isFinite(age);
        return {
          slot,
          value,
          rating: isClubYear
            ? (recordedInputs ? playerRating({ marketValue: value / 1_000_000, age } as Parameters<typeof playerRating>[0]) : null)
            : value > 0 ? playerRating({ marketValue: value / 1_000_000, age: age ?? 27 } as Parameters<typeof playerRating>[0]) : null,
        };
      }),
    [filledSlotsArray, isClubYear]
  );

  /* The sim needs a value for every man, and every pick comes from a dropdown
     row that has one, so this is a guard rather than a common case: if a squad
     ever reaches the result screen without values, it gets the verdict and no
     invented season. */
  const canShowSeasonReport = phase === 'result' || (isClubYear && phase === 'reviewing');
  const seasonReport = useMemo(() => {
    if (!canShowSeasonReport || ratedXi.length !== 11 || ratedXi.some((r) => r.value <= 0)
      || (isClubYear && ratedXi.some((r) => r.rating === null))) return null;
    const squad: WxPlayer[] = ratedXi.map(({ slot, value }) => ({
      name: slot.playerName,
      country: slot.pick?.nationality ?? '',
      position: slot.pick?.position ?? slot.role,
      club: slot.pick?.club ?? '',
      value,
      age: slot.pick?.age,
    }));
    return simulateWorldXiSeason(squad, formation ?? '4-3-3', seasonAdjust(fitBreakdown));
  }, [canShowSeasonReport, ratedXi, formation, fitBreakdown, isClubYear]);

  const recordedYearVerdict = useMemo<AIVerdict | null>(() => {
    if (recordedYear === null) return null;
    const headline = `Club year draft: recorded year ${recordedYear}`;
    if (!seasonReport) return {
      rating: 'Unrated recorded draft', headline,
      analysis: 'Draft complete. Some selected records are missing a value or age, so we cannot rate the full XI.',
    };
    return {
      rating: `${seasonReport.squadRating}/100`, headline,
      analysis: `Your XI finished ${ordinal(seasonReport.tablePosition)} with ${seasonReport.points} points in this simulated season. Ratings use your selected ${recordedYear} records, plus role fit, chemistry and balance.`,
    };
  }, [recordedYear, seasonReport]);

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
        description="Spin clubs or nations, or draft from one recorded year. Build your starting XI and see your team report."
        path="/build-your-xi"
      />
      <GameShell
        width="wide"
        title="BUILD YOUR XI"
        subtitle={isClubYear && phase !== 'formation'
          ? `Fill each position with a ${recordedYear} record from the club you are given`
          : 'Pick a formation, fill each position with a player from the given club or nation'}
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
            <fieldset className="mb-5 space-y-3">
              <legend className="text-center text-sm font-semibold text-foreground mb-2">Choose your draft</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" aria-pressed={setupMode === 'mixed'} onClick={() => setSetupMode('mixed')}
                  className={cn('min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold', setupMode === 'mixed' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground')}>
                  Mixed
                </button>
                <button type="button" aria-pressed={setupMode === 'club-year'} onClick={() => setSetupMode('club-year')}
                  className={cn('min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold', setupMode === 'club-year' ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground')}>
                  Club year draft
                </button>
              </div>
              {setupMode === 'club-year' && (
                <div className="space-y-2">
                  <label htmlFor="lineup-recorded-year" className="block text-sm font-semibold text-foreground">Recorded year</label>
                  <select id="lineup-recorded-year" value={setupYear} onChange={event => setSetupYear(Number(event.target.value))}
                    className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground">
                    {Array.from({ length: 23 }, (_, index) => 2026 - index).map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <p className="text-xs text-muted-foreground">Draft from our club records for that year. Some players may be missing.</p>
                </div>
              )}
            </fieldset>
            <h2 className="text-center text-lg font-semibold text-foreground mb-4">Choose Your Formation</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formationOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setupMode === 'mixed' ? selectFormation(f) : selectFormation(f, { mode: 'club-year', year: setupYear })}
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
                  recordedYear={recordedYear ?? undefined}
                />
                {!isSpinning && currentTeam && (
                  <button
                    onClick={rerollTeam}
                    className={cn('absolute top-2 right-2 flex items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all', isClubYear ? 'w-11 h-11' : 'w-10 h-10')}
                    title={isClubYear ? 'Reroll club' : 'Reroll: get a different team'}
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

              {(isClubYear || (selectedPositionIndex !== null && currentTeam && !isSpinning && !checkingDown)) && (
                <div className="animate-fade-in space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    {selectedPositionIndex === null ? 'Select a position on the pitch' : <>Filling: <span className="font-bold text-primary">{positions[selectedPositionIndex]?.label}</span></>}
                  </p>

                  {isClubYear && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Matching records, recorded year {recordedYear}</p>
                      <button type="button" disabled={searchDisabled} className="min-h-11 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
                        onClick={() => {
                          inputRevision.current += 1;
                          setPlayerInput('');
                          setBrowsingPlayers(true);
                          setBrowseActivation(value => value + 1);
                        }}>
                        Browse players
                      </button>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <div className="flex-1" ref={inputOwner}>
                      <PlayerAutocomplete
                        key={browseActivation}
                        value={playerInput}
                        onChange={value => { inputRevision.current += 1; setBrowsingPlayers(false); setPlayerInput(value); }}
                        onSelect={handleSelectPlayer}
                        searchOptions={{ source: teamScopedSource ?? SOCCER_MARKET_VALUE_SOURCE, exclude: excludedPlayers, boostNames: cappedNames, ...(isClubYear && browsingPlayers ? { minChars: 0, limit: 50 } : {}) }}
                        placeholder={currentTeam ? `Search a ${currentTeam.name} player...` : 'Enter player name...'}
                        disabled={searchDisabled}
                        autoFocus={!isClubYear}
                        emptyText={isClubYear ? 'No matching records. Try another name or reroll the club.' : undefined}
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

              {!isClubYear && selectedPositionIndex === null && !isSpinning && (
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

            {/* Round 825: under the pitch, so it updates as you pick without
                pushing the spinner or the search box anywhere. */}
            <XiFitBreakdown breakdown={fitBreakdown} slots={fitSlots} labels={slotLabels} className="max-w-lg mx-auto" />
          </div>
        )}

        {/* Review Phase */}
        {phase === 'reviewing' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <h2 className="text-center text-xl font-bold text-foreground font-display mb-1">
                Your {formation} Starting XI
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-4">{isClubYear ? `Club year draft, recorded year ${recordedYear}` : 'Review your team before submitting'}</p>
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
              <XiFitBreakdown breakdown={fitBreakdown} slots={fitSlots} labels={slotLabels} className="mt-4" />
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
                onClick={() => {
                  if (isClubYear) {
                    if (recordedYearVerdict) completeRecordedYearDraft(recordedYearVerdict);
                  } else void evaluateTeam();
                }}
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
                  ? [
                      `Build Your XI: ${formation} rated ${verdict.rating}${isClubYear ? ` (recorded year ${recordedYear})` : ''}`,
                      `Season sim: ${seasonReport.squadRating}/100, finished ${ordinal(seasonReport.tablePosition)} with ${seasonReport.points} points`,
                      ...(seasonReport.topScorer ? [`Top scorer: ${seasonReport.topScorer.name} (${seasonReport.topScorer.goals})`] : []),
                      ...(seasonReport.playerOfSeason ? [`Player of the season: ${seasonReport.playerOfSeason.name}`] : []),
                    ].join('\n')
                  : `Build Your XI: ${formation} rated ${verdict.rating}${isClubYear ? ` (recorded year ${recordedYear})` : ''}`
              }
              share={{
                score: isClubYear ? `${recordedYear}: ${verdict.rating}` : seasonReport ? `${verdict.rating}, ${seasonReport.squadRating}/100` : verdict.rating,
                gameName: isClubYear ? 'Build Your XI Club year draft' : 'Build Your XI',
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
                <XiFitBreakdown breakdown={fitBreakdown} slots={fitSlots} labels={slotLabels} className="mt-3" />
              </div>

              {seasonReport && (
                <div className="rounded-2xl border border-primary/30 bg-surface-1 p-4 mb-2 text-left">
                  <div className="text-center mb-3">
                    <div className="text-2xl mb-1">📋</div>
                    <h3 className="text-base font-bold text-primary font-display">Season Report</h3>
                    <p className="text-xs text-muted-foreground">{isClubYear ? `A fictional season from your selected ${recordedYear} records` : 'One season with this XI, every player at his peak'}</p>
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

                  <XiFitWorth fit={seasonReport.fit} />

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

                  <SeasonReportTabs report={seasonReport} />
                </div>
              )}
            </ResultScreen>
          </div>
        )}

        <GameSeoContent
          reportControl={<ReportQuestion gameType="build-your-xi" gameContext={{ team: currentTeam, formation }} />}
          pageHasOwnH1
          title="Build Your XI | DoUKnowBall"
          description="Build your ultimate starting eleven from players who match specific criteria. Test your football knowledge across positions, teams and eras."
          howToPlay={[
            "Choose Mixed clubs and nations, or Club year draft with one recorded year, then a formation",
            "Spin to get a random team assignment for each position",
            "Pick a matching player who fits the position; Club year draft requires that club record from your chosen year",
            "Use Browse players in Club year draft for matching records, not a complete squad; missing data can be retried or rerolled",
            "Check the role fit, chemistry and balance tiles under the pitch: the season sim plays all three",
            "Submit your full XI: Mixed uses the existing evaluation; Club year draft uses its selected records for a fictional season report",
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


        <GameNav />

        <LineupHowToPlay open={showRules} onOpenChange={setShowRules} />
      </GameShell>
    </>
  );
};

export default LineupBuilder;
