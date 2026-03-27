import { useState, useCallback, useMemo, useEffect } from 'react';
import { getRandomNbaTeams, NBA_TEAMS, type NbaTeam } from '@/data/nbaTeams';
import { getRandomStatChallenge } from '@/data/nbaStats';
import type { NbaFilledSlot, NbaGamePhase, NbaAIVerdict, StatChallenge } from '@/types/nba';
import { NBA_POSITIONS } from '@/types/nba';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export function useNbaLineup() {
  const [phase, setPhase] = useState<NbaGamePhase>('challenge');
  const [challenge, setChallenge] = useState<StatChallenge | null>(null);
  const [filledSlots, setFilledSlots] = useState<Map<number, NbaFilledSlot>>(new Map());
  const [teamAssignments, setTeamAssignments] = useState<NbaTeam[]>([]);
  const [verdict, setVerdict] = useState<NbaAIVerdict | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
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

  const submitPlayer = useCallback(
    async (inputName: string) => {
      let playerName = inputName;
      if (selectedPosition === null || !currentTeam) return;
      const position = NBA_POSITIONS[selectedPosition];
      if (!position) return;

      const nameParts = playerName.trim().split(/\s+/);
      if (nameParts.length < 2) {
        setValidationError('Please enter the player\'s full first and last name (e.g. "LeBron James")');
        return;
      }

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
          body: JSON.stringify({ players: filledSlotsArray, challenge }),
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

  useGameCompletion('nba-lineup', phase === 'result', verdict ? 500 : 0);

  return {
    phase, challenge, selectedPosition, currentTeam, filledSlots, filledSlotsArray,
    filledCount, verdict, isEvaluating, isValidating, validationError, isStatSpinning,
    isTeamSpinning, teamAssignments, availablePositions, totalStat, startGame,
    finishStatSpin, beginBuilding, finishTeamSpin, selectPosition, rerollTeam,
    submitPlayer, evaluateTeam, resetGame,
  };
}
