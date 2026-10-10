import { useEffect, useRef, useState } from 'react';
import { cmVarLabel, type CmVarDecision } from '@/lib/clubManagerVar';

/** Round 1218 fix. How long the card says it is checking, and how long the decision then stays up, in real
 *  milliseconds. Under reduced motion nothing on the pitch animates, so the wait before the decision is cut to
 *  a beat, but the decision itself stays up exactly as long: it takes the same time to read. */
export const CM_VAR_CARD_MS = { checking: 1300, checkingReduced: 300, decided: 1200 } as const;

/** What the third line says once the call is made. A review in this game always changes the call. */
function outcomeLine(review: CmVarDecision, club: string): string {
  if (review.incident === 'goal') return review.decision === 'disallowed' ? 'No goal. The score does not change.' : 'The goal stands.';
  return review.decision === 'awarded' ? `Penalty to ${club}.` : 'The penalty stands.';
}

export function ClubManagerVarReview({ review, club, who, minute, reducedMotion, onComplete }: {
  review: CmVarDecision; club: string; who?: string; minute: string; reducedMotion: boolean; onComplete: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    setRevealed(false);
    const wait = reducedMotion ? CM_VAR_CARD_MS.checkingReduced : CM_VAR_CARD_MS.checking;
    const checking = setTimeout(() => setRevealed(true), wait);
    const done = setTimeout(() => complete.current(), wait + CM_VAR_CARD_MS.decided);
    return () => { clearTimeout(checking); clearTimeout(done); };
  }, [review.id, reducedMotion]);
  return (
    <div role="status" aria-live="polite" data-cm-var={revealed ? 'decided' : 'checking'} data-cm-var-id={review.id}
      data-cm-var-decision={revealed ? review.decision : undefined}
      className="absolute z-30 top-[18%] left-[5%] right-[5%] mx-auto max-w-[360px] rounded-xl border border-border bg-background/95 px-3 py-3 text-center shadow-xl">
      <p className="text-xs font-bold text-foreground">{revealed ? cmVarLabel(review) : review.incident === 'penalty' ? 'VAR: checking for a penalty' : 'VAR: checking the goal'}</p>
      <p className="mt-1 text-[11px] text-muted-foreground" data-cm-var-who="1">{who ? `${who}, ` : ''}{club}, {minute}</p>
      <p className="mt-1 text-[10px] text-muted-foreground" data-cm-var-line="1">{revealed ? outcomeLine(review, club) : 'Play waits for the decision.'}</p>
    </div>
  );
}
