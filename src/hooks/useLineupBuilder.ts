import { useState, useCallback, useMemo } from 'react';
import { getRandomTeamAssignments } from '@/data/lineupTeams';
import type { Formation, FilledSlot, GamePhase, AIVerdict, TeamAssignment } from '@/types/lineupBuilder';
import { FORMATIONS } from '@/types/lineupBuilder';

export function useLineupBuilder() {
  const [formation, setFormation] = useState<Formation | null>(null);
  const [phase, setPhase] = useState<GamePhase>('formation');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filledSlots, setFilledSlots] = useState<FilledSlot[]>([]);
  const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const positions = useMemo(() => (formation ? FORMATIONS[formation] : []), [formation]);

  const currentTeam = useMemo(() => teamAssignments[currentIndex] ?? null, [teamAssignments, currentIndex]);
  const currentPosition = useMemo(() => positions[currentIndex] ?? null, [positions, currentIndex]);

  const selectFormation = useCallback((f: Formation) => {
    setFormation(f);
    setTeamAssignments(getRandomTeamAssignments(11));
    setPhase('building');
    setCurrentIndex(0);
    setFilledSlots([]);
    setVerdict(null);
  }, []);

  const submitPlayer = useCallback(
    (playerName: string) => {
      if (!currentPosition || !currentTeam) return;
      const slot: FilledSlot = {
        ...currentPosition,
        playerName: playerName.trim(),
        assignedTeam: currentTeam.name,
        isNation: currentTeam.isNation,
      };
      setFilledSlots((prev) => [...prev, slot]);
      if (currentIndex + 1 >= 11) {
        setPhase('reviewing');
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [currentPosition, currentTeam, currentIndex]
  );

  const evaluateTeam = useCallback(async () => {
    if (filledSlots.length !== 11) return;
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
          body: JSON.stringify({ formation, players: filledSlots }),
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
  }, [filledSlots, formation]);

  const resetGame = useCallback(() => {
    setFormation(null);
    setPhase('formation');
    setCurrentIndex(0);
    setFilledSlots([]);
    setTeamAssignments([]);
    setVerdict(null);
  }, []);

  return {
    formation,
    phase,
    currentIndex,
    currentTeam,
    currentPosition,
    positions,
    filledSlots,
    verdict,
    isEvaluating,
    selectFormation,
    submitPlayer,
    evaluateTeam,
    resetGame,
  };
}
