import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { startCoachingAppointment, type CoachingStartQuote } from '@/lib/soccerCareerCoachingStart';

export function useSoccerCoachingStart(career: CareerState | null, clubs: readonly ClubData[],
  setCareer: Dispatch<SetStateAction<CareerState | null>>) {
  const committed = useRef<{ career: CareerState | null; clubs: readonly ClubData[] } | null>(null);
  useLayoutEffect(() => {
    committed.current = { career, clubs };
    return () => { committed.current = null; };
  }, [career, clubs]);
  return useCallback((request: CoachingStartQuote) => {
    const current = committed.current;
    if (!current?.career) return;
    const next = startCoachingAppointment(current.career, current.clubs, request);
    if (next === current.career) return;
    committed.current = { career: next, clubs: current.clubs };
    setCareer(next);
  }, [setCareer]);
}
