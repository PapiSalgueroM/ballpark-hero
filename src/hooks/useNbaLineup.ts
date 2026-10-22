import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRandomNbaTeams, NBA_TEAMS, type NbaTeam } from '@/data/nbaTeams';
import { getRandomStatChallenge } from '@/data/nbaStats';
import type { NbaFilledSlot, NbaGamePhase, StatChallenge } from '@/types/nba';
import { NBA_POSITIONS } from '@/types/nba';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { NBA_PLAYER_SOURCE, normalizeName, type PlayerEntity, type PlayerSourceConfig } from '@/lib/playerSearch';
import { HIT_SCORE } from '@/lib/nbaStatLine';
import {
  NBA_FIVE_FRANCHISE_CODES, buildTeamPool, challengeByStat, findPoolEntry, isPositionEligibleForSlot,
  nbaFivePoints, refusalText, scoreFive, valueFor,
  type NbaFiveRecordRow, type NbaFiveRosterRow, type NbaFiveScore, type NbaFiveTeamPool,
} from '@/lib/nbaStartingFiveScore';

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

/* The slot rule lives in src/lib/nbaStartingFiveScore.ts since Round 1555,
   so the pick and the best five the score compares against obey one rule. */
export { isPositionEligibleForSlot };

/**
 * Round 1555: what one dealt team allows, read from the record. The roster is
 * the search source's own rows for the team (so the pool is exactly what the
 * box can offer), the numbers are nba_player_stats career rows listing the
 * franchise. Read once per team per visit; a failed read is dropped from the
 * cache so the next pick tries again. Both reads page like the grid engine,
 * since PostgREST caps a select at 1000 rows.
 */
const POOL_PAGE = 1000;
const poolCache = new Map<string, Promise<NbaFiveTeamPool>>();

async function readPages<T>(page: (from: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += POOL_PAGE) {
    const { data, error } = await page(from);
    if (error || !Array.isArray(data)) throw new Error('record read failed');
    rows.push(...(data as T[]));
    if (data.length < POOL_PAGE) return rows;
  }
}

export function loadTeamPool(team: string): Promise<NbaFiveTeamPool> {
  const cached = poolCache.get(team);
  if (cached) return cached;
  const codes = NBA_FIVE_FRANCHISE_CODES[team] ?? [];
  const load = (async () => {
    if (codes.length === 0) throw new Error(`no franchise codes for ${team}`);
    const [roster, records] = await Promise.all([
      readPages<NbaFiveRosterRow>(from => supabase
        .from('nba_players_extended_v2')
        .select('first_name, last_name, position')
        .eq('team', team)
        .order('player_id', { ascending: true })
        .range(from, from + POOL_PAGE - 1)),
      readPages<NbaFiveRecordRow>(from => supabase
        .from('nba_player_stats')
        .select('player_name, teams, year_from, games, points, trb, ast, stl, blk, three_p')
        .or(codes.map(c => `teams.ilike.%${c}%`).join(','))
        .order('id', { ascending: true })
        .range(from, from + POOL_PAGE - 1)),
    ]);
    if (roster.length === 0 || records.length === 0) throw new Error(`empty record for ${team}`);
    return buildTeamPool(team, roster, records);
  })();
  poolCache.set(team, load);
  load.catch(() => { if (poolCache.get(team) === load) poolCache.delete(team); });
  return load;
}


export function useNbaLineup() {
  const [phase, setPhase] = useState<NbaGamePhase>('challenge');
  const [challenge, setChallenge] = useState<StatChallenge | null>(null);
  const [filledSlots, setFilledSlots] = useState<Map<number, NbaFilledSlot>>(new Map());
  const [teamAssignments, setTeamAssignments] = useState<NbaTeam[]>([]);
  const [result, setResult] = useState<NbaFiveScore | null>(null);
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
    setResult(null);
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
   * Round 1555: his number for the challenge comes from the team's pool (the
   * record, see loadTeamPool), the same rows the score compares against. A
   * pick the record cannot number (not in the table, a namesake, steals or
   * blocks from before they were counted) is refused with the reason, never
   * filled with a guess, and a failed read refuses the pick with a retry
   * message rather than filling the slot with nothing (fail closed).
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

      const def = challengeByStat(challenge?.stat);
      if (!def) {
        setValidationError('This challenge has no record to score. Hit Start Over for a new spin.');
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      const teamName = currentTeam.name;
      let pool: NbaFiveTeamPool;
      try {
        pool = await loadTeamPool(teamName);
      } catch {
        setIsValidating(false);
        setValidationError(`Couldn't load the record for the ${teamName} right now. Try that pick again in a second.`);
        return;
      }
      const entry = findPoolEntry(pool, fullDisplayName);
      const numbered = entry ? valueFor(entry, def) : ({ ok: false, reason: 'no-record' } as const);
      if (!numbered.ok) {
        setIsValidating(false);
        setValidationError(refusalText(numbered.reason, fullDisplayName, def));
        return;
      }

      const slot: NbaFilledSlot = {
        ...position,
        playerName: fullDisplayName,
        excludeName: entity.name,
        assignedTeam: teamName,
        statValue: numbered.value,
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
    /* Round 1555: no model, no fallback judge. The five is scored from the
       same pools its numbers came from, against the best five the dealt
       teams allowed. Anything that cannot be scored says so and keeps the
       lineup for another try; it is never given a made up verdict. */
    const def = challengeByStat(challenge.stat);
    setIsEvaluating(true);
    setEvaluationError(null);
    try {
      if (!def) throw new Error('challenge has no record');
      const pools = await Promise.all(teamAssignments.slice(0, 5).map(t => loadTeamPool(t.name)));
      const scored = scoreFive(
        filledSlotsArray.map(s => ({ team: s.assignedTeam, role: s.role, name: s.playerName })),
        pools,
        def,
        challenge.direction,
      );
      if (!scored) throw new Error('five could not be scored');
      setResult(scored);
      setPhase('result');
    } catch (err) {
      console.error('Evaluation error:', err);
      setEvaluationError("Couldn't score your five right now. Your picks are saved, try Submit again in a second.");
    } finally {
      setIsEvaluating(false);
    }
  }, [filledSlotsArray, challenge, teamAssignments]);

  const resetGame = useCallback(() => {
    setPhase('challenge');
    setChallenge(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setResult(null);
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

  /* Round 1555: the points follow the score (0 to 500, a perfect five is
     worth the flat 500 every finish used to record), and a five at Stat
     Line's hit mark counts as a correct answer. */
  useGameCompletion(
    'nba-starting-5',
    phase === 'result' && result !== null,
    result ? nbaFivePoints(result.score) : 0,
    result && result.score >= HIT_SCORE ? 1 : 0,
  );

  return {
    phase, challenge, selectedPosition, currentTeam, filledSlots, filledSlotsArray,
    filledCount, result, isEvaluating, evaluationError, isValidating, validationError, isStatSpinning,
    isTeamSpinning, teamAssignments, availablePositions, totalStat, currentTeamSource,
    filledNormalizedNames, startGame, finishStatSpin, beginBuilding, finishTeamSpin, selectPosition,
    rerollTeam, submitPlayer, evaluateTeam, resetGame,
  };
}
