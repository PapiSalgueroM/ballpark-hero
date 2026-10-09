import { useEffect, useRef, useState } from 'react';
import { cmVarLabel, type CmVarDecision } from '@/lib/clubManagerVar';

export function ClubManagerVarReview({ review, club, minute, reducedMotion, onComplete }: {
  review: CmVarDecision; club: string; minute: string; reducedMotion: boolean; onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    setRevealed(false);
    const checking = setTimeout(() => setRevealed(true), reducedMotion ? 300 : 1300);
    const done = setTimeout(() => complete.current(), reducedMotion ? 1100 : 2500);
    return () => { clearTimeout(checking); clearTimeout(done); };
  }, [review.id, reducedMotion]);
  return (
    <div role="status" aria-live="polite" data-cm-var={revealed ? 'decided' : 'checking'} data-cm-var-id={review.id}
      data-cm-var-decision={revealed ? review.decision : undefined}
      className="absolute z-30 top-[18%] left-[5%] right-[5%] mx-auto max-w-[360px] rounded-xl border border-border bg-background/95 px-3 py-3 text-center shadow-xl">
      <p className="text-xs font-bold text-foreground">{revealed ? cmVarLabel(review) : `VAR: checking ${review.incident === 'penalty' ? 'penalty decision' : 'goal'}`}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{club}, {minute}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">Simplified review in this game simulation</p>
    </div>
  );
}
