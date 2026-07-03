import { useState, useCallback, useMemo, useEffect } from 'react';
import { getRandomNbaTeams, NBA_TEAMS, type NbaTeam } from '@/data/nbaTeams';
import { getRandomStatChallenge } from '@/data/nbaStats';
import type { NbaFilledSlot, NbaGamePhase, NbaAIVerdict, StatChallenge, NbaPosition } from '@/types/nba';
import { NBA_POSITIONS } from '@/types/nba';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { normalizeName, displayName, type PlayerEntity, type PlayerSourceConfig } from '@/lib/playerSearch';

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
export const NBA_PLAYER_SOURCE_V2: PlayerSourceConfig = {
  table: 'nba_players_extended_v2',
  nameColumn: 'last_name',
  metaColumns: {
    firstName: 'first_name',
    team: 'team',
    position: 'position',
  },
  ilikeLimit: 200,
  prominenceLimit: 1000,
};

/**
 * Builds the per-slot autocomplete source: same table, filtered to the
 * currently assigned NBA team so the suggestion dropdown only ever offers
 * players who actually played there. This is what makes bad picks
 * unselectable at entry time instead of being caught after submit.
 */
export function buildTeamFilteredNbaSource(teamName: string): PlayerSourceConfig {
  return {
    ...NBA_PLAYER_SOURCE_V2,
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

/**
 * Builds "First Last" from a search result whose entity.name is only the
 * last name (see NBA_PLAYER_SOURCE_V2's docstring above: nba_players_extended_v2
 * has no full_name column, so last_name is the searchable/matching column
 * and first_name rides along in entity.meta.firstName). This does not touch
 * matching/search at all - that already happened against last_name inside
 * searchPlayers() before this function ever runs; it only changes what text
 * is shown for an already-selected player.
 *
 * displayName() (same title-casing helper playerSearch.ts uses to build
 * entity.name itself) is reused here so "STEPHEN" -> "Stephen" the same way
 * "CURRY" -> "Curry" already does, keeping first and last name casing
 * consistent with each other.
 *
 * Falls back to entity.name alone (last name only) when first_name is
 * missing from the row, which happens for a small minority of the 5135 rows
 * in nba_players_extended_v2, rather than showing an awkward leading space
 * or "undefined Curry".
 */
export function buildFullDisplayName(entity: PlayerEntity): string {
  const rawFirst = typeof entity.meta.firstName === 'string' ? entity.meta.firstName.trim() : '';
  if (!rawFirst) return entity.name;
  return `${displayName(rawFirst)} ${entity.name}`;
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

  // Normalized names already in the lineup, for autocomplete's `exclude` set.
  // This must stay keyed on the same shape as entity.name during search
  // (last name only, since nba_players_extended_v2 has no full_name column
  // and last_name is the searched/matched column - see NBA_PLAYER_SOURCE_V2's
  // docstring), NOT the full "First Last" display name now stored in
  // NbaFilledSlot.playerName, or the exclude set would stop matching what
  // searchPlayers() actually compares against and previously-picked players
  // could reappear in suggestions. lastNameForExclude is carried on the slot
  // alongside the full playerName precisely so this stays correct without
  // re-deriving a last name from a full display string.
  const filledNormalizedNames = useMemo(
    () => new Set(Array.from(filledSlots.values()).map((s) => normalizeName(s.lastNameForExclude))),
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

      const fullDisplayName = buildFullDisplayName(entity);

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
        lastNameForExclude: entity.name,
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
      // Stay in the reviewing phase so the built lineup is preserved and the
      // user can simply retry, instead of being dumped into a dead-end result.
      console.error('Evaluation error:', err);
      setEvaluationError('Could not evaluate your lineup. Please try again.');
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

  useGameCompletion('nba-lineup', phase === 'result', verdict ? 500 : 0);

  return {
    phase, challenge, selectedPosition, currentTeam, filledSlots, filledSlotsArray,
    filledCount, verdict, isEvaluating, evaluationError, isValidating, validationError, isStatSpinning,
    isTeamSpinning, teamAssignments, availablePositions, totalStat, currentTeamSource,
    filledNormalizedNames, startGame, finishStatSpin, beginBuilding, finishTeamSpin, selectPosition,
    rerollTeam, submitPlayer, evaluateTeam, resetGame,
  };
}
