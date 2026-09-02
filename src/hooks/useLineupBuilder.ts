import { useState, useCallback, useMemo, useEffect } from 'react';
import { localEvaluateSoccerXI } from '@/lib/localLineupEval';
import { getRandomTeamAssignments, clubs as ALL_CLUBS, nations as ALL_NATIONS } from '@/data/lineupTeams';
import type { Formation, FilledSlot, GamePhase, AIVerdict, TeamAssignment } from '@/types/lineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';
import { useGameCompletion } from '@/hooks/useGameCompletion';

export function useLineupBuilder() {
  const [formation, setFormation] = useState<Formation | null>(null);
  const [phase, setPhase] = useState<GamePhase>('formation');
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null);
  const [filledSlots, setFilledSlots] = useState<Map<number, FilledSlot>>(new Map());
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  /* Round 413: remembered for the session once the day allowance is spent. */
  const [checkingDown, setCheckingDown] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTeamIndex, setSpinTeamIndex] = useState(0);

  const positions = useMemo(() => (formation ? FORMATIONS[formation] : []), [formation]);

  const filledCount = filledSlots.size;
  const currentTeam = useMemo(() => teamAssignments[filledCount] ?? null, [teamAssignments, filledCount]);

  const selectFormation = useCallback((f: Formation) => {
    setFormation(f);
    setTeamAssignments(getRandomTeamAssignments(11));
    setPhase('building');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setVerdict(null);
    setValidationError(null);
  }, []);

  const selectPosition = useCallback((index: number) => {
    if (filledSlots.has(index)) return;
    setSelectedPositionIndex(index);
    setValidationError(null);
  }, [filledSlots]);

  const startSpin = useCallback(() => {
    setIsSpinning(true);
    setSpinTeamIndex(0);
  }, []);

  const finishSpin = useCallback(() => {
    setIsSpinning(false);
  }, []);

  const rerollTeam = useCallback(() => {
    setTeamAssignments((prev) => {
      const usedNames = new Set(prev.filter((_, i) => i !== filledCount).map((t) => t.name));
      const all = [
        ...ALL_CLUBS.map((name) => ({ name, isNation: false })),
        ...ALL_NATIONS.map((name) => ({ name, isNation: true })),
      ];
      const available = all.filter((t) => !usedNames.has(t.name));
      const pick = available[Math.floor(Math.random() * available.length)];
      if (!pick) return prev;
      const next = [...prev];
      next[filledCount] = pick;
      return next;
    });
    setSelectedPositionIndex(null);
    setValidationError(null);
    startSpin();
  }, [filledCount, startSpin]);

  const submitPlayer = useCallback(
    async (inputName: string) => {
      let playerName = inputName;
      if (selectedPositionIndex === null || !currentTeam) return;
      const position = positions[selectedPositionIndex];
      if (!position) return;

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

      try {
        const resp = await fetch(
          `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/validate-player`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
            },
            body: JSON.stringify({
              playerName: playerName.trim(),
              teamName: currentTeam.name,
              isNation: currentTeam.isNation,
              /* Round 315: the slot's role rides along, so the validator can
                 refuse a keeper at CM (the owner's ter Stegen report). */
              position: position.role,
            }),
          }
        );

        if (!resp.ok) {
          // A rate limit or server error body has no verdict in it. Without
          // this guard the code below read `valid` off an error object and
          // told the player his TRUE answer was wrong ("hasn't played for"),
          // when the honest message is that nothing was checked at all.
          setValidationError("Couldn't verify that answer. Try again in a second.");
          setIsValidating(false);
          return;
        }

        const result = await resp.json();

        /* Round 413: a refusal now says which it was. Answer checking runs on
           a free daily allowance, and once it is spent every guess came back
           "try again in a second" until midnight, so a player kept retrying a
           wall. The validator returns exhausted on a spent allowance; that
           message is the honest one and it is remembered for the session, so
           the page stops inviting a retry that cannot succeed. Either way
           nothing unverified is accepted and no answer is marked wrong. */
        if (result.unverified) {
          if (result.exhausted) {
            setCheckingDown(true);
            setValidationError('Answer checking has used up its allowance for today. Your lineup is saved; come back tomorrow.');
          } else {
            setValidationError(result.reason || "Couldn't verify that answer. Try again in a second.");
          }
          setIsValidating(false);
          return;
        }

        if (!result.valid) {
          setValidationError(result.reason || `${playerName} hasn't played for ${currentTeam.name}`);
          setIsValidating(false);
          return;
        }

        if (result.fullName && typeof result.fullName === 'string') {
          playerName = result.fullName;
        }
      } catch {
        // FAIL CLOSED (July 2026 P1 rule: never accept-on-error). A network
        // or quota failure is a free retry, not a free pass.
        setValidationError("Couldn't verify that answer. Try again in a second.");
        setIsValidating(false);
        return;
      }

      const slot: FilledSlot = {
        ...position,
        playerName: playerName.trim(),
        assignedTeam: currentTeam.name,
        isNation: currentTeam.isNation,
      };

      setFilledSlots((prev) => {
        const next = new Map(prev);
        next.set(selectedPositionIndex, slot);
        return next;
      });

      setSelectedPositionIndex(null);
      setIsValidating(false);

      if (filledCount + 1 >= 11) {
        setPhase('reviewing');
      } else {
        startSpin();
      }
    },
    [selectedPositionIndex, currentTeam, positions, filledCount, startSpin]
  );

  const filledSlotsArray = useMemo(() => {
    return Array.from(filledSlots.entries())
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => slot);
  }, [filledSlots]);

  const evaluateTeam = useCallback(async () => {
    if (filledSlotsArray.length !== 11) return;
    setIsEvaluating(true);
    try {
      const resp = await fetch(
        `${"https://flawuiqbvjobmkfkauhw.supabase.co"}/functions/v1/evaluate-lineup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsYXd1aXFidmpvYm1rZmthdWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUwNzYsImV4cCI6MjA5MTQzMTA3Nn0.L8xWIXikPIaXC0XOL-FLOuPQb6idws2NdliARxBgk_Y"}`,
          },
          body: JSON.stringify({ formation, players: filledSlotsArray }),
        }
      );
      const data = await resp.json();
      
      if (!resp.ok) {
        // AI referee down/out of quota -> offline judge, never a dead-end
        const local = await localEvaluateSoccerXI(filledSlotsArray.map(s => s.playerName));
        setVerdict(local);
        setPhase('result');
        return;
      }
      
      if (!data.rating || !data.analysis) {
        setVerdict({
          rating: data.rating || 'Mid-Table 😐',
          headline: data.headline || 'Squad evaluated',
          analysis: data.analysis || 'Your squad has been evaluated.',
        });
      } else {
        setVerdict(data);
      }
      setPhase('result');
    } catch (err) {
      console.error('Evaluation error:', err);
      try {
        const local = await localEvaluateSoccerXI(filledSlotsArray.map(s => s.playerName));
        setVerdict(local);
      } catch {
        setVerdict({ rating: 'Error', headline: 'Could not evaluate', analysis: 'Network error. Please check your connection and try again.' });
      }
      setPhase('result');
    } finally {
      setIsEvaluating(false);
    }
  }, [filledSlotsArray, formation]);

  const resetGame = useCallback(() => {
    setFormation(null);
    setPhase('formation');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setVerdict(null);
    setValidationError(null);
    setIsSpinning(false);
  }, []);

  useGameCompletion('build-your-xi', phase === 'result', verdict ? 500 : 0);

  return {
    formation, phase, selectedPositionIndex, currentTeam, positions,
    filledSlots, filledSlotsArray, filledCount, verdict, isEvaluating,
    isValidating, validationError, checkingDown, isSpinning, spinTeamIndex, setSpinTeamIndex,
    selectFormation, selectPosition, submitPlayer, evaluateTeam, resetGame,
    startSpin, finishSpin, rerollTeam, teamAssignments,
  };
}
