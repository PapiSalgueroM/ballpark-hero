import { useCallback, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { advanceReviewedManagerSeason, resolveManagerJob, setManagerJobReview, type ManagerJobChoice, type ManagerJobQuote } from '@/lib/soccerCareerManagerJobReview';

export function useSoccerManagerJobReview(career: CareerState | null, clubs: ClubData[], setCareer: Dispatch<SetStateAction<CareerState | null>>) {
  const committed = useRef<{ career: CareerState | null; clubs: ClubData[] } | null>(null);
  useLayoutEffect(() => {
    committed.current = { career, clubs };
    return () => { committed.current = null; };
  }, [career, clubs]);
  const commit = useCallback((transform: (current: CareerState) => CareerState) => {
    const live = committed.current;
    if (!live?.career || live.career !== career || live.clubs !== clubs || live.career.phase !== 'manager_season') return;
    const next = transform(live.career);
    if (next === live.career) return;
    committed.current = { career: next, clubs: live.clubs };
    setCareer(next);
  }, [career, clubs, setCareer]);
  const advance = useCallback(() => commit(current => advanceReviewedManagerSeason(current, clubs)), [commit, clubs]);
  const setEnabled = useCallback((enabled: boolean) => commit(current => setManagerJobReview(current, clubs, enabled)), [commit, clubs]);
  const resolve = useCallback((quote: ManagerJobQuote, choice: ManagerJobChoice) => commit(current => resolveManagerJob(current, clubs, quote, choice)), [commit, clubs]);
  return { advance, setEnabled, resolve };
}
