import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { loadManagerMarket } from '@/lib/soccerCareerEngine';
import type { CareerState, ClubData } from '@/lib/soccerCareerEngine';
import { coachingStartChoices, type CoachingStartQuote } from '@/lib/soccerCareerCoachingStart';

export default function CoachingStartChooser({ career, clubs, onStart, onBack }: {
  career: CareerState;
  clubs: readonly ClubData[];
  onStart?: (quote: CoachingStartQuote) => void;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [help, setHelp] = useState(true);
  const choices = useMemo(() => coachingStartChoices(career, clubs), [career, clubs]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    let mounted = true;
    setReady(false); setFailed(false);
    loadManagerMarket().then(() => { if (mounted) setReady(true); })
      .catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, [attempt]);
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" className="h-11" onClick={onBack}>Back</Button>
        <Button variant="outline" className="h-11 w-11 p-0" aria-label="Coaching start help"
          aria-expanded={help} onClick={() => setHelp(value => !value)}>?</Button>
      </div>
      <h3 ref={heading} tabIndex={-1} className="text-lg font-black outline-none">Choose your first club</h3>
      {help && (
        <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-2">
          <p>You reviewed your coaching coursework. This extra route lets you choose a starter club from this save.</p>
          <p>Club level is the career's strength marker, not a league division. Coursework adds no licence, money or rating bonus.</p>
          <p>Example: pick a shown club and your manager career starts there in Season 0. The usual season simulation decides what happens next.</p>
        </div>
      )}
      {!ready && !failed && <p role="status" className="text-sm text-muted-foreground">Loading manager options...</p>}
      {failed && (
        <div className="text-sm space-y-2">
          <p role="status">The manager options could not load. Your career has not changed.</p>
          <Button variant="outline" className="h-11" onClick={() => setAttempt(value => value + 1)}>Try again</Button>
        </div>
      )}
      {choices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No prepared starter choices are available for this save.</p>
      ) : (
        <div className="grid gap-2">
          {choices.map(quote => (
            <Button key={quote.clubId} variant="outline"
              className="min-h-11 h-auto w-full justify-between gap-3 py-3 text-left whitespace-normal"
              disabled={!ready || !onStart} onClick={() => onStart?.(quote)}>
              <span className="min-w-0">
                <span className="block font-bold break-words">{quote.clubName}</span>
                <span className="block text-xs text-muted-foreground">{quote.country}</span>
              </span>
              <span className="shrink-0 text-xs">Club level {quote.level}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
