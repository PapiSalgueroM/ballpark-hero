import { useMemo, useState } from 'react';
import { FORMATIONS, type CareerState } from '@/lib/clubManager';
import { defaultNationalXI, nationalPool, resolveNationalXI, type NationalXI } from '@/lib/clubManagerNationalXI';

export function ClubManagerNationalLineup({ career, year, name, onSave, onBack }: {
  career: CareerState;
  year: number;
  name: string;
  onSave: (plan: NationalXI | null) => boolean;
  onBack: () => void;
}) {
  const pool = useMemo(() => nationalPool(career), [career]);
  const [plan, setPlan] = useState<NationalXI>(() => {
    const held = career.nationJob?.xi;
    return held?.year === year && Number.isInteger(held.formation) && FORMATIONS[held.formation] && Array.isArray(held.keys) && held.keys.length === 11
      ? held : { year, formation: 0, keys: defaultNationalXI(0, pool) };
  });
  const [notice, setNotice] = useState('');
  const formation = FORMATIONS[plan.formation];
  const resolved = resolveNationalXI(plan, pool);
  const save = (next: NationalXI | null) => {
    setNotice(onSave(next) ? (next ? `Lineup saved for ${year}.` : 'Automatic selection restored.') : 'The lineup could not be saved.');
  };
  return (
    <section data-cm-national-xi className="space-y-3 rounded-xl border border-border bg-card p-3 text-xs">
      <button type="button" className="min-h-11 text-muted-foreground" onClick={onBack}>← Manager</button>
      <h3 className="text-sm font-bold">{career.nationJob?.nation} starting XI</h3>
      <p>{year} {name}. Your selected side’s ratings and positional fit affect qualifying and the tournament. Injured players are unavailable.</p>
      <label className="block">Formation
        <select className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background p-2" value={plan.formation}
          onChange={event => {
            const next = Number(event.target.value);
            setPlan({ year, formation: next, keys: defaultNationalXI(next, pool) });
            setNotice('');
          }}>
          {FORMATIONS.map((option, i) => <option key={option.name} value={i}>{option.name}</option>)}
        </select>
      </label>
      <p className="text-muted-foreground">{pool.length} eligible players{resolved ? ` · XI strength ${resolved.strength.toFixed(1)}` : ''}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {formation.slots.map((slot, index) => {
          const key = plan.keys[index];
          const candidates = pool.filter(p => (p.position === 'GK') === slot.allowed.includes('GK'));
          return (
            <label key={index} className="block min-w-0">{index + 1}. {slot.label}
              <select aria-label={`National shirt ${index + 1} ${slot.label}`} className="mt-1 block min-h-11 w-full min-w-0 rounded-md border border-border bg-background p-2"
                value={candidates.some(player => player.key === key) ? key : ''}
                onChange={event => {
                  const next = event.target.value;
                  const keys = [...plan.keys];
                  const from = keys.indexOf(next);
                  if (next && from >= 0) keys[from] = keys[index];
                  keys[index] = next;
                  setPlan({ ...plan, keys });
                  setNotice('');
                }}>
                <option value="">Choose a player</option>
                {candidates.map(player => <option key={player.key} value={player.key}>{player.name} · {player.position} · {player.rating}{player.club ? ` · ${player.club}` : ''}</option>)}
              </select>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-lg bg-primary px-3 font-bold text-primary-foreground disabled:opacity-50" disabled={!resolved} onClick={() => save(plan)}>Save starting XI</button>
        {career.nationJob?.xi && <button type="button" className="min-h-11 rounded-lg border border-border px-3 font-bold" onClick={() => save(null)}>Use automatic selection</button>}
      </div>
      {!resolved && <p className="text-muted-foreground">Choose eleven different eligible players, including a goalkeeper.</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
