import { useState } from 'react';
import { Flag, HelpCircle } from 'lucide-react';
import { cornerTrainingDesk, type CareerState, type CMPlayer, type CornerRoutine } from '@/lib/clubManager';
import { MadeUpTag } from './SquadScreen';

export type CornerTrainingActions = {
  onBook: (order: CornerRoutine, career: CareerState) => boolean;
  onCancel: (career: CareerState) => boolean;
  onChooseTaker: () => void;
};

const field = 'mt-1 min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm';
const deliveries = { 'far-post': 'Far-post run', short: 'Short corner' };

function NamedPlayer({ player }: { player?: CMPlayer | null }) {
  return player ? <>{player.name}{player.generated && <MadeUpTag className="ml-1" />}</> : <>Former squad member</>;
}

export function CornerTrainingCard({ career, onBook, onCancel, onChooseTaker }: { career: CareerState } & CornerTrainingActions) {
  const [flag, setFlag] = useState<CornerRoutine['flag']>('left');
  const [kind, setKind] = useState<CornerRoutine['kind']>('far-post');
  const [targetId, setTargetId] = useState('');
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState('');
  const desk = cornerTrainingDesk(career, flag);
  const order = desk.order;
  const target = desk.targets.find(p => p.id === targetId);
  const status = desk.status === 'pending' ? 'Session booked' : desk.status === 'ready' ? 'Ready for kickoff' : '';

  return <details className="rounded-xl border border-border bg-card px-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">Corner routines
      {status && <span className="ml-2 text-xs font-normal text-primary">{status}</span>}
    </summary>
    <section aria-label="Corner training" className="space-y-3 pb-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs">Rehearse one delivery with two players for one match.</p>
        <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border"
          aria-label="Corner routine rules" aria-expanded={help} onClick={() => setHelp(!help)}><HelpCircle size={17} /></button>
      </div>
      {help && <p className="rounded-md bg-secondary/50 p-2 text-xs">For example, pick your left-side taker and send a centre-back to the far post. At the next paid training week the pair spend fitness on the drill. In the following match, watch for a corner from that flag while both players are on the field. Repeating the delivery gives the opposition a chance to read it.</p>}
      {desk.status === 'unsupported' ? <p className="text-xs">This save holds a corner session from another version.</p>
        : order && status ? <div className="space-y-2">
          <p className="font-bold">{deliveries[order.kind]} from the {order.flag}</p>
          <p className="text-xs"><NamedPlayer player={career.squad.find(p => p.id === order.takerId)} /> to <NamedPlayer player={career.squad.find(p => p.id === order.targetId)} />.</p>
          {desk.status === 'pending' ? <>
            <p className="text-xs">Both players train at the next paid week. Cancelling before then costs nothing.</p>
            <button type="button" className="min-h-11 rounded-md border border-border px-3 font-semibold"
              onClick={() => setNotice(onCancel(career) ? 'Session cancelled.' : 'Reopen your current save to change this booking.')}>Cancel corner session</button>
          </> : <>
            {desk.paid && <p className="text-xs">The drill used {desk.paid.taker} fitness from the taker and {desk.paid.target} from the target.</p>}
            <p className="text-xs">Both players need to be on the pitch for a delivery from this flag.</p>
            <button type="button" className="min-h-11 rounded-md border border-border px-3 font-semibold"
              onClick={() => setNotice(onCancel(career) ? 'Your team will take its usual corners. The training cost is already spent.' : 'Reopen your current save to change this routine.')}>Stand down routine</button>
          </>}
        </div> : <>
          <label className="block text-xs font-bold">Corner flag
            <select className={field} value={flag} onChange={e => { setFlag(e.target.value === 'right' ? 'right' : 'left'); setTargetId(''); setNotice(''); }}>
              <option value="left">Left corner</option><option value="right">Right corner</option>
            </select>
          </label>
          <fieldset className="min-w-0">
            <legend className="pb-1 text-xs font-bold">Delivery</legend>
            <div className="relative isolate h-32 overflow-hidden rounded-lg border border-emerald-300/40 bg-emerald-950">
              <div aria-hidden="true" className="absolute left-1/2 top-0 h-8 w-2/5 -translate-x-1/2 rounded-b border-x border-b border-white/30" />
              <div aria-hidden="true" className="absolute left-1/2 top-0 h-2 w-12 -translate-x-1/2 border-x border-b border-white/50" />
              <Flag aria-hidden="true" size={16} className={'absolute top-2 text-amber-300 ' + (flag === 'left' ? 'left-2' : 'right-2')} />
              {(['far-post','short'] as const).map(route => {
                const anchor = route === 'far-post' ? (flag === 'left' ? 'top-3 right-3' : 'top-3 left-3')
                  : (flag === 'left' ? 'bottom-3 left-3' : 'bottom-3 right-3');
                return <label key={route} className={'absolute flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold focus-within:ring-2 focus-within:ring-white ' + anchor
                  + (kind === route ? ' border-emerald-200 bg-emerald-200 text-emerald-950' : ' border-white/35 bg-emerald-950 text-emerald-50')}>
                  <input type="radio" name="cm-corner-delivery" className="accent-emerald-800" value={route}
                    checked={kind === route} onChange={() => { setKind(route); setNotice(''); }} />
                  {deliveries[route]}
                </label>;
              })}
            </div>
          </fieldset>
          <p className="text-xs">{kind === 'far-post' ? 'The target attacks the delivery at the far post.' : 'The target comes short and looks for a return pass to the taker.'}</p>
          {desk.taker ? <p className="text-xs">Taker <strong><NamedPlayer player={desk.taker} /></strong></p>
            : <div className="space-y-1 text-xs">
              <p>Assign an available starting outfielder to this flag in Set pieces.</p>
              <button type="button" className="min-h-11 rounded-md border border-border px-3 font-semibold" onClick={onChooseTaker}>Choose corner taker</button>
            </div>}
          <label className="block text-xs font-bold">Target player
            <select className={field} value={target?.id ?? ''} onChange={e => { setTargetId(e.target.value); setNotice(''); }}>
              <option value="">Choose a runner</option>
              {desk.targets.map(p => <option key={p.id} value={p.id}>{p.name}{p.generated ? ' (generated)' : ''} · {p.position} · {p.fitness}% fit</option>)}
            </select>
          </label>
          <p className="text-xs">At the next paid training week, the taker and target each spend up to {desk.fitnessCost} fitness points after normal recovery.</p>
          <button type="button" className="min-h-11 w-full rounded-md bg-primary px-3 font-bold text-primary-foreground disabled:opacity-50"
            disabled={!desk.taker || !target} onClick={() => {
              if (desk.taker && target) setNotice(onBook({ flag, kind, takerId: desk.taker.id, targetId: target.id }, career) ? '' : 'Reopen your current save and check the starting pair.');
            }}>Book corner session</button>
        </>}
      {notice && <p role="status" className="text-xs">{notice}</p>}
    </section>
  </details>;
}
