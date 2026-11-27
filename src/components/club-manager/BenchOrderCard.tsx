import { useState } from 'react';
import { effectiveXIWithSlots, isAvailable, type BenchOrder, type CareerState } from '@/lib/clubManager';

const field = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm';

export function BenchOrderCard({ career, onSim }: { career: CareerState; onSim: (order: BenchOrder) => void }) {
  const [open, setOpen] = useState(false);
  const [outId, setOutId] = useState('');
  const [inId, setInId] = useState('');
  const [window, setWindow] = useState<BenchOrder['window']>('hour');
  const [when, setWhen] = useState<BenchOrder['when']>('any');
  const starters = open ? effectiveXIWithSlots(career).map(slot => slot.p) : [];
  const off = starters.find(player => player.id === outId);
  const bench = open ? career.squad.filter(player => isAvailable(player) && !starters.some(p => p.id === player.id))
    .sort((a, b) => Number(b.position === off?.position) - Number(a.position === off?.position) || b.rating - a.rating) : [];
  return <section className="rounded-xl border border-border bg-card p-3">
    <button type="button" aria-expanded={open} className="min-h-11 w-full text-left font-bold" onClick={() => setOpen(!open)}>Quick Sim bench order</button>
    {open && <div className="grid gap-3 text-sm">
      <p>Pick a change for this match. For example, send a reserve striker on around the hour if you need a goal. The coach handles injuries first.</p>
      <label>Player coming off
        <select className={field} value={outId} onChange={e => { setOutId(e.target.value); setInId(''); }}>
          <option value="">Choose a starter</option>
          {starters.map(p => <option value={p.id} key={p.id}>{p.name} · {p.position} · {p.fitness}% fit</option>)}
        </select>
      </label>
      <label>Player coming on
        <select className={field} disabled={!off} value={inId} onChange={e => setInId(e.target.value)}>
          <option value="">Choose a substitute</option>
          {bench.map(p => <option value={p.id} key={p.id}>{p.name} · {p.position} · {p.rating} OVR</option>)}
        </select>
      </label>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label>When to check
          <select className={field} value={window} onChange={e => setWindow(e.target.value as BenchOrder['window'])}>
            <option value="hour">Around the hour (58 to 68)</option>
            <option value="late">Late on (72 to 82)</option>
          </select>
        </label>
        <label>Score on the night
          <select className={field} value={when} onChange={e => setWhen(e.target.value as BenchOrder['when'])}>
            <option value="any">Any score</option><option value="ahead">Only if ahead</option><option value="not-ahead">If level or behind</option>
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">This uses a real substitution. If the score or available players change, the match report tells you what happened.</p>
      <button type="button" disabled={!off || !bench.some(p => p.id === inId)} className="min-h-11 rounded-lg bg-primary px-3 font-bold text-primary-foreground disabled:opacity-50"
        onClick={() => onSim({ outId, inId, window, when })}>Sim with this order</button>
    </div>}
  </section>;
}
