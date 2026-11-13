import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { NrlCareerAction } from '@/lib/nrlCareer';
import { NRL_JUDICIARY_CLEAR_CHANCE, nrlJudiciaryBans, nrlJudiciaryCase, nrlJudiciaryPenalty, type NrlJudiciaryDecision } from '@/lib/nrlJudiciary';
import type { NrlManagerState } from '@/lib/nrlManager';

export default function NrlJudiciaryReview({ season, onAction, disabled }: {
  season: NrlManagerState; onAction: (action: NrlCareerAction) => boolean; disabled: boolean;
}) {
  const review = nrlJudiciaryCase(season);
  const bans = nrlJudiciaryBans(season);
  const result = useRef<HTMLDivElement>(null);
  const followDecision = useRef(false);
  useEffect(() => {
    if (review?.decision && followDecision.current) {
      followDecision.current = false;
      result.current?.focus();
    }
  }, [review]);
  if (!review && !bans.size) return null;
  const { year, clubId } = season;
  const player = season.squad.find(candidate => candidate.id === review?.playerId);
  const pending = review && !review.decision;
  const penalty = review ? nrlJudiciaryPenalty(season, review) : 0;
  const decide = (decision: NrlJudiciaryDecision) => {
    if (review && onAction({ type: 'resolveJudiciary', year, clubId, caseRound: review.round, decision })) followDecision.current = true;
  };
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm" aria-label="Judiciary review">
      <h3 className="font-bold">Judiciary review</h3>
      {!review && bans.size > 0 && <p className="text-muted-foreground">Suspension carried from last season.</p>}
      {review && player && <p>{player.name} · Simulated grade 2 careless high tackle</p>}
      {pending ? <>
        <p className="text-muted-foreground">Respond before your next club match or before closing the season. An early plea means one match out. A hearing has a {NRL_JUDICIARY_CLEAR_CHANCE * 100}% chance of clearing the player. If upheld, the charge costs two matches. The odds are modeled for this game.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" disabled={disabled} onClick={() => decide('plea')}>Take the early plea</Button>
          <Button type="button" size="lg" variant="outline" disabled={disabled} onClick={() => decide('contest')}>Contest at a hearing</Button>
        </div>
      </> : <div ref={result} tabIndex={-1} role="status" className="text-muted-foreground">
        {review?.decision && <p>{review.decision === 'plea' ? 'Early plea accepted. One-match suspension.'
          : penalty ? 'Hearing decision. Two-match suspension.' : 'Cleared at the hearing.'}</p>}
        {[...bans].map(([id, matches]) => <p key={id}>
          {season.squad.find(candidate => candidate.id === id)?.name} · {matches} club {matches === 1 ? 'match' : 'matches'} left. Byes do not count.
        </p>)}
      </div>}
    </section>
  );
}
