import { useState, useCallback, useMemo, useEffect } from 'react';
import { localEvaluateNbaFive } from '@/lib/localLineupEval';
import { getRandomNbaTeams, NBA_TEAMS, type NbaTeam } from '@/data/nbaTeams';
import { getRandomStatChallenge } from '@/data/nbaStats';
import type { NbaFilledSlot, NbaGamePhase, NbaAIVerdict, StatChallenge, NbaPosition } from '@/types/nba';
import { NBA_POSITIONS } from '@/types/nba';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { NBA_PLAYER_SOURCE, normalizeName, type PlayerEntity, type PlayerSourceConfig } from '@/lib/playerSearch';

/**
 * NBA player source for the autocomplete/validation layer.
 *
 * nba_players_extended_v2 has no `full_name` column (verified via
 * information_schema on flawuiqbvjobmkfkauhw 2026-07-02): it stores
 * `first_name` and `last_name` separately. src/lib/playerSearch.ts's
 * PlayerSourceConfig.nameColumn must be a single real column (it is passed
 * straight into `.ilike(nameColumn, ...)`, `.order(nameColumn, ...)` and
 * `row[nameColumn]`), so a computed "first || ' ' || last" expression is not
 * usable there without a DB view or generated column, and this task is
 * read-only SQL / no DDL. `last_name` is used instead: it is populated on
 * all 5135 rows (0 null/empty) and is how players are searched for in
 * practice (surname or partial surname: "james", "curry", "wemb...").
 * `first_name` is carried in metaColumns so the suggestion row still shows
 * full context ("Stephen | G | Golden State Warriors").
 */
/* ROUND 494: THE LOCAL COPY IS GONE AND THIS USES THE SHARED SOURCE.
 * There were two configs for the SAME table. src/lib/playerSearch.ts exports
 * NBA_PLAYER_SOURCE with firstNameColumn:'first_name' and a prominence order,
 * and NBA Chain and NBA Connect 4 both use it. This file carried its own copy
 * without those fields, so the lineup game searched last_name ALONE.
 *
 * What that did to a player: the box says "Type a player name..." and it is
 * mounted validateOnly, so a suggestion click is the only way to fill a slot.
 * Typing the name he is thinking of returned nothing. "LeBron James" nothing,
 * "Kobe Bryant" nothing, "Stephen Curry" nothing. Only a bare surname worked,
 * and nothing on screen said so. Progressive typing made it look broken rather
 * than strict: "Le" gave rows, "LeB" gave Kleber, "LeBr" onward gave none.
 *
 * And the surname workaround was itself lossy, because the candidate key was
 * the surname: two players who share one on the same team collapsed into a
 * single arbitrary row. Measured 2026-09-06 on nba_players_extended_v2: 715 of
 * its 5,135 rows share a surname with a teammate, across all 32 teams. Golden
 * State holds Seth Curry (id 114) and Stephen Curry (115); the Lakers hold
 * LeBron James (237) and Bronny James (1028046517). Typing "Curry" returned one
 * row and the player could not tell which Curry he was picking or reach the
 * other.
 *
 * Deleting the copy rather than adding the missing fields to it is the point:
 * one config for one table cannot drift again.
 */
export function buildTeamFilteredNbaSource(teamName: string): PlayerSourceConfig {
  return {
    ...NBA_PLAYER_SOURCE,
    filters: [{ column: 'team', op: 'eq', value: teamName }],
  };
}

/**
 * Maps a slot's PG/SG/SF/PF/C role to the DB's coarser position codes
 * (verified distribution on nba_players_extended_v2, 2026-07-02):
 *   G=687, F=592, C=174, G-F=81, F-C=58, C-F=18, F-G=15, NULL=3510 (68%).
 * There is no PG/SG/SF/PF granularity in the source data, so eligibility is
 * necessarily coarse: a Guard fits PG or SG, a Forward fits SF or PF, a
 * Center fits C, and a combo code (G-F/F-G, F-C/C-F) fits either half.
 * A NULL position (the majority of rows, mostly older/historical players)
 * is treated as eligible for every slot rather than excluded, since blocking
 * on missing data would make most of the table unusable for any slot,
 * a worse regression than the AI-only gate this replaces.
 */
export function isPositionEligibleForSlot(dbPosition: string | null | undefined, slotRole: NbaPosition): boolean {
  if (!dbPosition) return true;
  const code = dbPosition.trim().toUpperCase();
  const codes = code.split('-'); // "G-F" -> ["G", "F"], "F" -> ["F"]
  const guardSlots: NbaPosition[] = ['PG', 'SG'];
  const forwardSlots: NbaPosition[] = ['SF', 'PF'];
  return codes.some((c) => {
    if (c === 'G') return guardSlots.includes(slotRole);
    if (c === 'F') return forwardSlots.includes(slotRole);
    if (c === 'C') return slotRole === 'C';
    return true; // unrecognized code: do not block entry on it
  });
}


export function useNbaLineup() {
  const [phase, setPhase] = useState<NbaGamePhase>('challenge');
  const [challenge, setChallenge] = useState<StatChallenge | null>(null);
  const [filledSlots, setFilledSlots] = useState<Map<number, NbaFilledSlot>>(new Map());
  const [teamAssignments, setTeamAssignments] = useState<NbaTeam[]>([]);
  const [verdict, setVerdict] = useState<NbaAIVerdict | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isStatSpinning, setIsStatSpinning] = useState(false);
  const [isTeamSpinning, setIsTeamSpinning] = useState(false);

  const filledCount = filledSlots.size;
  const currentTeam = useMemo(() => teamAssignments[filledCount] ?? null, [teamAssignments, filledCount]);

  const availablePositions = useMemo(() => {
    return NBA_POSITIONS.map((pos, i) => ({ ...pos, index: i })).filter(
      (_, i) => !filledSlots.has(i)
    );
  }, [filledSlots]);

  /* Normalized names already in the lineup, for autocomplete's `exclude` set.
     It must be keyed on the same shape searchPlayers compares against, or a
     player already picked comes back in the suggestions. Round 494 changed that
     shape: the source now carries firstNameColumn, so entity.name is the whole
     "First Last" name rather than the surname alone, and the key follows it.
     The field was called lastNameForExclude while it held a surname and is
     called excludeName now that it does not, because a name that lies about
     its contents is how the next bug gets written. */
  const filledNormalizedNames = useMemo(
    () => new Set(Array.from(filledSlots.values()).map((s) => normalizeName(s.excludeName))),
    [filledSlots]
  );

  // Player source for the currently assigned team, filtered so only players
  // who played there can ever appear as a suggestion.
  const currentTeamSource = useMemo(
    () => (currentTeam ? buildTeamFilteredNbaSource(currentTeam.name) : null),
    [currentTeam]
  );

  const startGame = useCallback(() => {
    const newChallenge = getRandomStatChallenge();
    setChallenge(newChallenge);
    setIsStatSpinning(true);
    setTeamAssignments(getRandomNbaTeams(5));
    setFilledSlots(new Map());
    setVerdict(null);
    setValidationError(null);
    setEvaluationError(null);
    setSelectedPosition(null);
  }, []);

  // Auto-start on first load
  useEffect(() => {
    if (phase === 'challenge' && !challenge) {
      startGame();
    }
  }, []);

  const finishStatSpin = useCallback(() => {
    setIsStatSpinning(false);
  }, []);

  const beginBuilding = useCallback(() => {
    setPhase('building');
    setIsTeamSpinning(true);
  }, []);

  const finishTeamSpin = useCallback(() => {
    setIsTeamSpinning(false);
  }, []);

  const selectPosition = useCallback((posIndex: number) => {
    if (filledSlots.has(posIndex)) return;
    setSelectedPosition(posIndex);
    setValidationError(null);
  }, [filledSlots]);

  const rerollTeam = useCallback(() => {
    setTeamAssignments((prev) => {
      const usedNames = new Set(prev.filter((_, i) => i !== filledCount).map((t) => t.name));
      const available = NBA_TEAMS.filter((t) => !usedNames.has(t.name));
      const pick = available[Math.floor(Math.random() * available.length)];
      if (!pick) return prev;
      const next = [...prev];
      next[filledCount] = pick;
      return next;
    });
    setValidationError(null);
    setIsTeamSpinning(true);
  }, [filledCount]);

  /**
   * Fills the currently selected slot with a player the user picked from the
   * autocomplete dropdown (a PlayerEntity backed by an actual
   * nba_players_extended_v2 row for the currently assigned team). Because
   * the entity's team membership was already enforced by the search filter
   * and its position eligibility is checked deterministically below (both
   * against the same row), there is no second, independent AI judgment call
   * that can disagree with the first. That double-judgment gap is what was
   * producing false negatives on genuinely valid lineups.
   *
   * The AI evaluate/lookup call is kept only to fetch the challenge stat
   * value for scoring; it is non-blocking, so if it fails or disagrees the
   * player is still accepted (a stat lookup failure is not a validity
   * failure).
   */
  const submitPlayer = useCallback(
    async (entity: PlayerEntity) => {
      if (selectedPosition === null || !currentTeam) return;
      const position = NBA_POSITIONS[selectedPosition];
      if (!position) return;

      /* entity.name is already "First Last": the shared source builds it from
         both columns. Round 494 removed the helper that used to prepend the
         first name, which would now produce "Stephen Stephen Curry". */
      const fullDisplayName = entity.name;

      const normalized = normalizeName(entity.name);
      if (filledNormalizedNames.has(normalized)) {
        setValidationError(`${fullDisplayName} is already in your lineup!`);
        return;
      }

      const dbPosition = typeof entity.meta.position === 'string' ? entity.meta.position : null;
      if (!isPositionEligibleForSlot(dbPosition, position.role)) {
        setValidationError(`${fullDisplayName} did not primarily play ${position.label}. Try a different position.`);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      let statValue: number | string | undefined;

      // Non-blocking enrichment: look up the challenge stat value for this
      // already-validated player. A failure here never rejects the pick.
      // The lookup itself still sends entity.name (last name, same as what
      // was matched against the DB during search) plus firstName in case the
      // edge function wants to disambiguate; only the *display* name changes
      // in this task, not what gets sent for stat resolution.
      try {
        const resp = await fetch(
          `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/nba-validate-player`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
            },
            body: JSON.stringify({
              playerName: fullDisplayName,
              teamName: currentTeam.name,
              position: position.role,
              challengeStat: challenge?.stat,
            }),
          }
        );

        const result = await resp.json();
        if (result && result.statValue !== undefined && result.statValue !== null) {
          statValue = result.statValue;
        }
      } catch {
        // Stat lookup is enrichment only; ignore failures.
      }

      const slot: NbaFilledSlot = {
        ...position,
        playerName: fullDisplayName,
        excludeName: entity.name,
        assignedTeam: currentTeam.name,
        statValue,
      };

      setFilledSlots((prev) => {
        const next = new Map(prev);
        next.set(selectedPosition, slot);
        return next;
      });

      setIsValidating(false);
      setValidationError(null);
      setSelectedPosition(null);

      if (filledCount + 1 >= 5) {
        setPhase('reviewing');
      } else {
        setIsTeamSpinning(true);
      }
    },
    [selectedPosition, currentTeam, filledCount, filledNormalizedNames, challenge]
  );

  const filledSlotsArray = useMemo(() => {
    return Array.from(filledSlots.entries())
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => slot);
  }, [filledSlots]);

  const totalStat = useMemo(() => {
    const values = filledSlotsArray
      .map((s) => (typeof s.statValue === 'number' ? s.statValue : parseFloat(String(s.statValue))))
      .filter((v) => !isNaN(v));
    if (values.length === 0) return null;
    return values.reduce((a, b) => a + b, 0);
  }, [filledSlotsArray]);

  const evaluateTeam = useCallback(async () => {
    if (filledSlotsArray.length !== 5 || !challenge) return;
    setIsEvaluating(true);
    setEvaluationError(null);
    try {
      const resp = await fetch(
        `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/nba-evaluate-lineup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
          },
          body: JSON.stringify({ players: filledSlotsArray, challenge }),
        }
      );
      if (!resp.ok) throw new Error(`Evaluation request failed (${resp.status})`);
      const data = await resp.json();
      // Guard against a malformed/empty body so we never land on a blank result.
      if (!data || typeof data.rating !== 'string') throw new Error('Malformed verdict');
      setVerdict(data);
      setPhase('result');
    } catch (err) {
      // AI referee down/out of quota -> offline judge so the game still ends
      // with a real verdict instead of an error state.
      console.error('Evaluation error:', err);
      try {
        const local = await localEvaluateNbaFive(
          filledSlotsArray.map(s => s.playerName),
          `${challenge.direction === 'highest' ? 'Highest' : 'Lowest'} ${challenge.stat}`,
        );
        setVerdict(local);
        setPhase('result');
      } catch {
        setEvaluationError('Could not evaluate your lineup. Please try again.');
      }
    } finally {
      setIsEvaluating(false);
    }
  }, [filledSlotsArray, challenge]);

  const resetGame = useCallback(() => {
    setPhase('challenge');
    setChallenge(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setVerdict(null);
    setValidationError(null);
    setEvaluationError(null);
    setIsStatSpinning(false);
    setIsTeamSpinning(false);
    setSelectedPosition(null);
    setTimeout(() => {
      const newChallenge = getRandomStatChallenge();
      setChallenge(newChallenge);
      setIsStatSpinning(true);
      setTeamAssignments(getRandomNbaTeams(5));
    }, 100);
  }, []);

  useGameCompletion('nba-starting-5', phase === 'result', verdict ? 500 : 0);

  return {
    phase, challenge, selectedPosition, currentTeam, filledSlots, filledSlotsArray,
    filledCount, verdict, isEvaluating, evaluationError, isValidating, validationError, isStatSpinning,
    isTeamSpinning, teamAssignments, availablePositions, totalStat, currentTeamSource,
    filledNormalizedNames, startGame, finishStatSpin, beginBuilding, finishTeamSpin, selectPosition,
    rerollTeam, submitPlayer, evaluateTeam, resetGame,
  };
}
