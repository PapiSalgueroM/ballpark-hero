import { useState } from 'react';
import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';
import { minuteLabel, type PlayEvent } from '@/lib/clubManager';
import { MadeUpTag } from './SquadScreen';

export function FlankPlayReview({ play, opponent, live = false }: { play: PlayEvent[]; opponent: string; live?: boolean }) {
  const [step, setStep] = useState(0);
  const recorded = play.filter(e => (e.kind === 'buildup' && e.flankMove) || (!live && e.kind === 'shot' && e.flankChance))
    .sort((a, b) => a.minute - b.minute || (a.plus ?? 0) - (b.plus ?? 0) || Number(a.kind === 'shot') - Number(b.kind === 'shot'));
  if (!recorded.length) return null;

  const index = live ? recorded.length - 1 : Math.min(step, recorded.length - 1), event = recorded[index], move = event.flankMove;
  const shot = event.flankChance;
  const previous = () => setStep(Math.max(0, index - 1));
  const next = () => setStep(Math.min(recorded.length - 1, index + 1));
  const action = 'min-h-11 min-w-11 rounded-md border border-border px-2.5 text-xs font-semibold disabled:opacity-40';
  const sideName = move?.side === 'left' ? 'Left' : 'Right';
  const incident = <div aria-live="polite" aria-atomic="true" className="min-w-0 space-y-1 rounded-lg bg-secondary/35 p-2.5 text-xs">
    <p className="font-bold">{minuteLabel(event)} · {move ? sideName + (move.support === 'overlap' ? ' overlap' : ' flank, holding cover') : shot === 'counter' ? 'Counterattack' : 'Chance from the flank'}</p>
    {move ? <>
      <p>{event.who}{move.passerGenerated && <MadeUpTag className="ml-1" />} looked for {move.receiver}{move.receiverGenerated && <MadeUpTag className="ml-1" />}. {move.outcome === 'entry' ? 'The ball got through.' : move.outcome === 'turnover' ? 'Possession was lost.' : 'Your side kept the ball and rebuilt.'}</p>
      {move.outcome === 'turnover' && move.cover && <p>{move.cover}{move.coverGenerated && <MadeUpTag className="ml-1" />} was covering behind the ball.</p>}
      {move.response ? <p className="font-semibold">{opponent} shifted cover to the {move.side} after this entry.</p>
        : move.covered && <p>{opponent} already had extra cover on the {move.side}.</p>}
    </> : <p>{event.who}{event.whoGenerated && <MadeUpTag className="ml-1" />} {event.goal ? 'scored' : event.on ? 'shot on target' : event.on === false ? 'shot off target' : 'took a shot'}.</p>}
  </div>;

  if (live) return <section aria-label="Latest flank move" className="min-w-0 text-center">{incident}</section>;

  return <section aria-label="Flank buildup" className="mt-3 space-y-2 rounded-lg border border-border bg-card p-3 text-center">
    <h3 className="text-sm font-bold">Flank buildup</h3>
    <div className="relative isolate grid grid-cols-2 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-950 text-emerald-50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/25" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-2 w-1/4 -translate-x-1/2 rounded-b border-x border-b border-white/25" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/2 h-3 w-7 -translate-x-1/2 rounded-t-full border-x border-t border-white/25" />
      {(['left', 'right'] as const).map(side => {
        const attempts = recorded.filter(e => e.flankMove?.side === side);
        const entries = attempts.filter(e => e.flankMove?.outcome === 'entry').length;
        const lost = attempts.filter(e => e.flankMove?.outcome === 'turnover').length;
        const active = move?.side === side;
        const Direction = move?.outcome === 'turnover' ? ArrowDown : move?.outcome === 'recycle' ? CornerDownLeft : ArrowUp;
        return <div key={side} className={'min-w-0 px-1 py-3 text-xs ' + (active ? 'bg-emerald-700/45' : '')}>
          <p className="font-bold">{side === 'left' ? 'Left flank' : 'Right flank'}</p>
          <p>{entries} {entries === 1 ? 'entry' : 'entries'} · {lost} lost</p>
          <div aria-hidden="true" className="mt-1 flex h-5 items-center justify-center">
            {active && <Direction key={index} className="h-5 w-5 text-white motion-safe:animate-in motion-safe:fade-in" />}
          </div>
        </div>;
      })}
    </div>
    {incident}
    <div className="flex items-center justify-between gap-1.5">
      <button type="button" className={action} aria-label="Previous flank event" onClick={previous} disabled={index === 0}>Previous</button>
      <span className="text-xs tabular-nums text-muted-foreground">{index + 1} of {recorded.length}</span>
      <button type="button" className={action} aria-label="Next flank event" onClick={next} disabled={index === recorded.length - 1}>Next</button>
    </div>
  </section>;
}
