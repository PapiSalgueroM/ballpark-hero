import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { eligiblePressTargets, isReturnPress, returnPressWinger, type CareerState, type LiveMatch } from '@/lib/clubManager';
import { MadeUpTag } from './SquadScreen';

export function ReturnPressPicker({ career, live, minute, plus, onSelect }: {
  career: CareerState;
  live: LiveMatch;
  minute: number;
  plus?: number;
  onSelect: (target: string | null) => void;
}) {
  const [help, setHelp] = useState(false);
  const plan = isReturnPress(live.returnPress) ? live.returnPress : null;
  const unfamiliar = live.returnPress != null && !plan;
  const targets = eligiblePressTargets(live, minute, plus);
  const assigned = plan && career.squad.find(p => p.id === plan.wingerId);
  const assignedTarget = plan && [...(live.oppXi ?? []), ...(live.oppBench ?? [])].find(p => p.n === plan.target);
  return <details className="rounded-lg border border-border bg-card px-2">
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">
      Press the return pass{plan && <span className="ml-2 break-words font-normal text-primary">{plan.target}{assignedTarget?.g && <MadeUpTag className="ml-1" />}</span>}
    </summary>
    <section aria-label="Return-pass instructions" className="space-y-2 pb-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p>Send a winger after the ball when a fullback throws short and asks for it back. If the press is beaten, the wing is open.</p>
        <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border"
          aria-label="Return-pass press rules" aria-expanded={help} onClick={() => setHelp(!help)}><HelpCircle size={16} /></button>
      </div>
      {help && <p className="rounded-md bg-secondary/50 p-2">For example, target their right-back. A long throw costs your winger nothing. Jumping the return can cost a fitness point. Stand down to keep your shape on later throws.</p>}
      {unfamiliar ? <p>This save uses a newer pressing instruction.</p> : <>
        <p className="font-semibold">{plan && assigned
          ? <>{assigned.name}{assigned.generated && <MadeUpTag className="ml-1" />} is assigned to {plan.target}{assignedTarget?.g && <MadeUpTag className="ml-1" />}.</>
          : plan ? 'Return-pass press selected' : 'Holding shape'}</p>
        {targets.map(target => {
          const winger = returnPressWinger(career, target.n, minute, plus);
          const selected = plan?.target === target.n;
          return <button type="button" key={target.n} aria-pressed={selected} disabled={!winger}
            className={'block min-h-11 w-full rounded-md border px-2 py-2 text-left disabled:opacity-50 ' +
              (selected ? 'border-primary bg-primary/10' : 'border-border bg-background')}
            onClick={() => { if (winger && (!selected || plan?.wingerId !== winger.id)) onSelect(target.n); }}>
            <span className="block font-bold">{target.n}{target.g && <MadeUpTag className="ml-1" />} · {target.p}</span>
            <span className="block">{winger ? <>{winger.name}{winger.generated && <MadeUpTag className="ml-1" />} can close down</> : 'No eligible presser on this side'}</span>
          </button>;
        })}
        {targets.length === 0 && <p>No eligible opposing fullback is on the team sheet.</p>}
        {plan && <button type="button" className="min-h-11 rounded-md border border-border px-3 font-semibold"
          onClick={() => onSelect(null)}>Stand down the press</button>}
      </>}
    </section>
  </details>;
}
