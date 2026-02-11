import { useState, useCallback, useMemo, useEffect } from 'react';
import { getRandomNbaTeams, NBA_TEAMS, type NbaTeam } from '@/data/nbaTeams';
import { getRandomStatChallenge } from '@/data/nbaStats';
import type { NbaFilledSlot, NbaGamePhase, NbaAIVerdict, StatChallenge } from '@/types/nba';
import { NBA_POSITIONS } from '@/types/nba';

const STORAGE_KEY = 'nba-lineup-state';

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const filledSlots = new Map<number, NbaFilledSlot>(parsed.filledSlots ?? []);
    return { ...parsed, filledSlots };
  } catch {
    return null;
  }
}

function saveState(state: {
  phase: NbaGamePhase;
  challenge: StatChallenge | null;
  filledSlots: Map<number, NbaFilledSlot>;
  teamAssignments: NbaTeam[];
  verdict: NbaAIVerdict | null;
  selectedPosition: number | null;
}) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        phase: state.phase,
        challenge: state.challenge,
        filledSlots: Array.from(state.filledSlots.entries()),
        teamAssignments: state.teamAssignments,
        verdict: state.verdict,
        selectedPosition: state.selectedPosition,
      })
    );
  } catch {}
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useNbaLineup() {
  const saved = useMemo(() => loadSavedState(), []);

  const [phase, setPhase] = useState<NbaGamePhase>(saved?.phase ?? 'challenge');
  const [challenge, setChallenge] = useState<StatChallenge | null>(saved?.challenge ?? null);
  const [filledSlots, setFilledSlots] = useState<Map<number, NbaFilledSlot>>(saved?.filledSlots ?? new Map());
  const [teamAssignments, setTeamAssignments] = useState<NbaTeam[]>(saved?.teamAssignments ?? []);
  const [verdict, setVerdict] = useState<NbaAIVerdict | null>(saved?.verdict ?? null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(saved?.selectedPosition ?? null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isStatSpinning, setIsStatSpinning] = useState(false);
  const [isTeamSpinning, setIsTeamSpinning] = useState(false);

  const filledCount = filledSlots.size;

  // The current team is based on how many slots are filled (each pick gets the next team)
  const currentTeam = useMemo(() => teamAssignments[filledCount] ?? null, [teamAssignments, filledCount]);

  // Available positions = not yet filled
  const availablePositions = useMemo(() => {
    return NBA_POSITIONS.map((pos, i) => ({ ...pos, index: i })).filter(
      (_, i) => !filledSlots.has(i)
    );
  }, [filledSlots]);

  // Persist state
  useEffect(() => {
    if (phase === 'challenge' && !challenge) {
      clearSavedState();
    } else {
      saveState({ phase, challenge, filledSlots, teamAssignments, verdict, selectedPosition });
    }
  }, [phase, challenge, filledSlots, teamAssignments, verdict, selectedPosition]);

  const startGame = useCallback(() => {
    const newChallenge = getRandomStatChallenge();
    setChallenge(newChallenge);
    setIsStatSpinning(true);
    setTeamAssignments(getRandomNbaTeams(5));
    setFilledSlots(new Map());
    setVerdict(null);
    setValidationError(null);
    setSelectedPosition(null);
  }, []);

  // Auto-start stat spin on first load
  useEffect(() => {
    if (phase === 'challenge' && !challenge && !saved) {
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

  const submitPlayer = useCallback(
    async (inputName: string) => {
      let playerName = inputName;
      if (selectedPosition === null || !currentTeam) return;
      const position = NBA_POSITIONS[selectedPosition];
      if (!position) return;

      // Require full first and last name
      const nameParts = playerName.trim().split(/\s+/);
      if (nameParts.length < 2) {
        setValidationError('Please enter the player\'s full first and last name (e.g. "LeBron James")');
        return;
      }

      // Check duplicates
      const trimmedName = playerName.trim().toLowerCase();
      const isDuplicate = Array.from(filledSlots.values()).some(
        (slot) => slot.playerName.toLowerCase() === trimmedName
      );
      if (isDuplicate) {
        setValidationError(`${playerName.trim()} is already in your lineup!`);
        return;
      }

      setIsValidating(true);
      setValidationError(null);

      let statValue: number | string | undefined;

      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nba-validate-player`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              playerName: playerName.trim(),
              teamName: currentTeam.name,
              position: position.role,
              challengeStat: challenge?.stat,
            }),
          }
        );

        const result = await resp.json();

        if (!result.valid) {
          setValidationError(result.reason || `${playerName} is not valid for this pick.`);
          setIsValidating(false);
          return;
        }

        // Use full name returned by AI
        if (result.fullName && typeof result.fullName === 'string') {
          playerName = result.fullName;
        }

        if (result.statValue !== undefined && result.statValue !== null) {
          statValue = result.statValue;
        }
      } catch {
        // On error allow through
      }

      const slot: NbaFilledSlot = {
        ...position,
        playerName: playerName.trim(),
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
    [selectedPosition, currentTeam, filledCount, filledSlots, challenge]
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
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nba-evaluate-lineup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            players: filledSlotsArray,
            challenge,
          }),
        }
      );
      if (!resp.ok) throw new Error('Failed to evaluate');
      const data = await resp.json();
      setVerdict(data);
      setPhase('result');
    } catch (err) {
      console.error('Evaluation error:', err);
      setVerdict({ rating: 'Error', headline: 'Could not evaluate', analysis: 'Something went wrong. Please try again.' });
      setPhase('result');
    } finally {
      setIsEvaluating(false);
    }
  }, [filledSlotsArray, challenge]);

  const resetGame = useCallback(() => {
    clearSavedState();
    setPhase('challenge');
    setChallenge(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setVerdict(null);
    setValidationError(null);
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

  return {
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
    availablePositions,
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
  };
}
