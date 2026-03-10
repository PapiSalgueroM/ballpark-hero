import { useState, useCallback, useMemo, useEffect } from 'react';
import { getRandomTeamAssignments } from '@/data/lineupTeams';
import type { Formation, FilledSlot, GamePhase, AIVerdict, TeamAssignment } from '@/types/lineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';
import { useGameCompletion } from '@/hooks/useGameCompletion';

const STORAGE_KEY = 'lineup-builder-state';

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Restore filledSlots from array back to Map
    const filledSlots = new Map<number, FilledSlot>(parsed.filledSlots ?? []);
    return { ...parsed, filledSlots };
  } catch {
    return null;
  }
}

function saveState(state: {
  formation: Formation | null;
  phase: GamePhase;
  filledSlots: Map<number, FilledSlot>;
  teamAssignments: TeamAssignment[];
  verdict: AIVerdict | null;
}) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        formation: state.formation,
        phase: state.phase,
        filledSlots: Array.from(state.filledSlots.entries()),
        teamAssignments: state.teamAssignments,
        verdict: state.verdict,
      })
    );
  } catch {}
}

function clearSavedState() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useLineupBuilder() {
  const saved = useMemo(() => loadSavedState(), []);

  const [formation, setFormation] = useState<Formation | null>(saved?.formation ?? null);
  const [phase, setPhase] = useState<GamePhase>(saved?.phase ?? 'formation');
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number | null>(null);
  const [filledSlots, setFilledSlots] = useState<Map<number, FilledSlot>>(saved?.filledSlots ?? new Map());
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>(saved?.teamAssignments ?? []);
  const [verdict, setVerdict] = useState<AIVerdict | null>(saved?.verdict ?? null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinTeamIndex, setSpinTeamIndex] = useState(0);

  // Persist state on changes
  useEffect(() => {
    if (phase === 'formation') {
      clearSavedState();
    } else {
      saveState({ formation, phase, filledSlots, teamAssignments, verdict });
    }
  }, [formation, phase, filledSlots, teamAssignments, verdict]);

  const positions = useMemo(() => (formation ? FORMATIONS[formation] : []), [formation]);

  // Current team is based on how many slots have been filled
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
    if (filledSlots.has(index)) return; // already filled
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
    // Replace the current team assignment with a new random one
    setTeamAssignments((prev) => {
      const usedNames = new Set(prev.filter((_, i) => i !== filledCount).map((t) => t.name));
      const allClubs = [
        'Real Madrid', 'Barcelona', 'Manchester City', 'Liverpool', 'Bayern Munich',
        'PSG', 'Chelsea', 'Arsenal', 'Manchester United', 'Juventus',
        'AC Milan', 'Inter Milan', 'Borussia Dortmund', 'Atlético Madrid', 'Tottenham',
        'Napoli', 'Benfica', 'Porto', 'Ajax', 'Bayer Leverkusen',
        'Roma', 'Sevilla', 'Sporting CP', 'Newcastle', 'Aston Villa',
        'West Ham', 'Marseille', 'Lyon', 'Celtic', 'Galatasaray',
      ];
      const allNations = [
        'Argentina', 'France', 'Brazil', 'England', 'Belgium',
        'Croatia', 'Netherlands', 'Portugal', 'Spain', 'Italy',
        'Germany', 'Uruguay', 'Colombia', 'USA', 'Mexico',
        'Senegal', 'Japan', 'South Korea', 'Nigeria', 'Denmark',
        'Switzerland', 'Morocco', 'Serbia', 'Poland', 'Cameroon',
      ];
      const all = [
        ...allClubs.map((name) => ({ name, isNation: false })),
        ...allNations.map((name) => ({ name, isNation: true })),
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

      // Check for duplicate players
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
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-player`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              playerName: playerName.trim(),
              teamName: currentTeam.name,
              isNation: currentTeam.isNation,
            }),
          }
        );

        const result = await resp.json();

        if (!result.valid) {
          setValidationError(result.reason || `${playerName} hasn't played for ${currentTeam.name}`);
          setIsValidating(false);
          return;
        }

        // Use the full name returned by AI if available
        if (result.fullName && typeof result.fullName === 'string') {
          playerName = result.fullName;
        }
      } catch {
        // On error allow through
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

      // Check if all 11 filled
      if (filledCount + 1 >= 11) {
        setPhase('reviewing');
      } else {
        // Trigger spin for next team
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-lineup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ formation, players: filledSlotsArray }),
        }
      );
      const data = await resp.json();
      
      if (!resp.ok) {
        // Use server error message if available, otherwise generic
        const errorMsg = data?.error || data?.analysis || 'Something went wrong. Please try again.';
        setVerdict({
          rating: 'Error',
          headline: 'Could not evaluate',
          analysis: errorMsg,
        });
        setPhase('result');
        return;
      }
      
      // Validate the response has the expected fields
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
      setVerdict({ rating: 'Error', headline: 'Could not evaluate', analysis: 'Network error — please check your connection and try again.' });
      setPhase('result');
    } finally {
      setIsEvaluating(false);
    }
  }, [filledSlotsArray, formation]);

  const resetGame = useCallback(() => {
    clearSavedState();
    setFormation(null);
    setPhase('formation');
    setSelectedPositionIndex(null);
    setFilledSlots(new Map());
    setTeamAssignments([]);
    setVerdict(null);
    setValidationError(null);
    setIsSpinning(false);
  }, []);

  useGameCompletion('lineup-builder', phase === 'result', verdict ? 500 : 0);

  return {
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
    spinTeamIndex,
    setSpinTeamIndex,
    selectFormation,
    selectPosition,
    submitPlayer,
    evaluateTeam,
    resetGame,
    startSpin,
    finishSpin,
    rerollTeam,
    teamAssignments,
  };
}
