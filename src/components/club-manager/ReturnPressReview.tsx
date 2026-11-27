import { useState } from 'react';
import { minuteLabel, type PlayEvent } from '@/lib/clubManager';
import { MadeUpTag } from './SquadScreen';

export function ReturnPressReview({ play, live = false }: { play: PlayEvent[]; live?: boolean }) {
  const [step, setStep] = useState(0);
  const throws = play.filter(e => e.kind === 'throwin' && e.side === 'opp' && e.returnPress
    && ['direct', 'won', 'bypassed'].includes(e.returnPress.outcome))
    .sort((a, b) => a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0));
  const index = live ? throws.length - 1 : Math.min(step, throws.length - 1);
  const event = throws[index], press = event?.returnPress;
  const title = live ? 'Latest return-pass press' : 'Return-pass press';
  if (!event || !press) return live ? null : <section aria-label={title} className="mt-3 rounded-lg border border-border p-3 text-xs">
    <h3 className="mb-1 text-sm font-bold">{title}</h3>
    <p>No eligible throw was recorded while the order was active.</p>
  </section>;

  const shot = play.find(e => e.kind === 'shot' && e.pressChance === press.id);
  const review = play.find(e => e.kind === 'var' && e.pressChance === press.id && e.review?.incident === 'goal')?.review;
  const won = throws.filter(e => e.returnPress!.outcome === 'won').length;
  const bypassed = throws.filter(e => e.returnPress!.outcome === 'bypassed').length;
  const action = 'min-h-11 min-w-11 rounded-md border border-border px-2.5 font-semibold disabled:opacity-40';
  return <section aria-label={title} className="space-y-2 rounded-lg border border-border bg-card p-3 text-left text-xs">
    <h3 className="text-sm font-bold">{title}</h3>
    {!live && <p>{won} won high · {bypassed} beaten · {throws.length - won - bypassed} direct</p>}
    <div aria-live="polite" aria-atomic="true" className="space-y-1 border-l-2 border-primary pl-2.5">
      <p className="font-bold">{minuteLabel(event)} · {event.who}{press.targetGenerated && <MadeUpTag className="ml-1" />} took the throw</p>
      {press.outcome === 'direct' ? <p>The throw went straight to {press.outlet}{press.outletGenerated && <MadeUpTag className="ml-1" />}. Your wide player held position.</p> : <>
        <p>{press.outlet}{press.outletGenerated && <MadeUpTag className="ml-1" />} played the ball back.
          {' '}{press.winger}{press.wingerGenerated && <MadeUpTag className="ml-1" />}
          {press.outcome === 'won' ? ' won it high.' : ' was beaten, leaving space behind.'}</p>
        <p>{!live && press.spent !== undefined ? press.spent + ' fitness spent' : 'Costs up to one fitness point'}{press.tired ? ' · Tired legs' : ''}</p>
      </>}
      {(shot || review) && (live ? <p>The move led to a chance.</p> :
        review?.decision === 'disallowed' ? <p>The goal was ruled out after review.</p> :
        shot && <p>{shot.who}{shot.whoGenerated && <MadeUpTag className="ml-1" />} {shot.goal ? 'scored' : shot.on ? 'shot on target' : 'shot off target'}.</p>)}
    </div>
    {!live && throws.length > 1 && <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="Previous pressing event" className={action} disabled={index === 0}
        onClick={() => setStep(index - 1)}>Previous</button>
      <span className="tabular-nums">{index + 1} of {throws.length}</span>
      <button type="button" aria-label="Next pressing event" className={action} disabled={index === throws.length - 1}
        onClick={() => setStep(index + 1)}>Next</button>
    </div>}
  </section>;
}
