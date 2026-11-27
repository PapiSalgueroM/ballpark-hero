import { useState } from 'react';
import { minuteLabel, type CornerRoutine, type PlayEvent } from '@/lib/clubManager';
import { MadeUpTag } from './SquadScreen';

export function RehearsedCornerReview({ play, routine, live = false }: {
  play: PlayEvent[];
  routine: CornerRoutine;
  live?: boolean;
}) {
  const [step, setStep] = useState(0);
  const corners = play.filter(e => e.kind === 'corner' && e.cornerDelivery)
    .sort((a, b) => a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0));
  const title = live ? 'Latest rehearsed corner' : 'Rehearsed corners';
  if (!corners.length) return live ? null : <section aria-label={title} className="mt-3 rounded-lg border border-border p-3 text-xs">
    <h3 className="mb-1 text-sm font-bold">{title}</h3>
    <p>Your team recorded 0 rehearsed deliveries from the {routine.flag} flag.</p>
  </section>;

  const index = live ? corners.length - 1 : Math.min(step, corners.length - 1);
  const event = corners[index], delivery = event.cornerDelivery!;
  const shot = play.find(e => e.kind === 'shot' && e.cornerChance === delivery.id);
  const overturned = play.some(e => e.kind === 'var' && e.cornerChance === delivery.id);
  const target = <strong>{delivery.target}{delivery.targetGenerated && <MadeUpTag className="ml-1" />}</strong>;
  const action = 'min-h-11 min-w-11 rounded-md border border-border px-2.5 text-xs font-semibold disabled:opacity-40';
  return <section aria-label={title} className="space-y-2 rounded-lg border border-border bg-card p-3 text-left text-xs">
    <h3 className="text-sm font-bold">{title}</h3>
    <div aria-live="polite" aria-atomic="true" className="space-y-1 border-l-2 border-primary pl-2.5">
      <p className="font-bold">{minuteLabel(event)} · {delivery.kind === 'far-post' ? 'Far-post run' : 'Short corner'} · {event.flank} flag</p>
      <p><strong>{event.who}{delivery.takerGenerated && <MadeUpTag className="ml-1" />}</strong>{delivery.kind === 'short'
        ? <> looked for {target} to play the return pass.</>
        : <> delivered towards {target} at the far post.</>}</p>
      {delivery.read && <p>The defence was ready for that routine.</p>}
      {delivery.outcome === 'cleared' ? <p>The opposition cleared the delivery.</p>
        : delivery.outcome === 'recycled' ? <p>Your side kept possession.</p>
        : live ? (shot || overturned ? <p>The delivery led to a chance.</p> : null)
        : overturned ? <p>The goal was ruled out after review.</p>
        : shot ? <p>{shot.who}{shot.whoGenerated && <MadeUpTag className="ml-1" />} {shot.goal ? 'scored' : shot.on ? 'shot on target' : 'shot off target'}.</p>
        : null}
    </div>
    {!live && corners.length > 1 && <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous corner" className={action} disabled={index === 0}
        onClick={() => setStep(index - 1)}>Previous</button>
      <span className="tabular-nums">{index + 1} of {corners.length}</span>
      <button type="button" aria-label="Next corner" className={action} disabled={index + 1 === corners.length}
        onClick={() => setStep(index + 1)}>Next</button>
    </div>}
  </section>;
}
