import { useMemo, useState } from 'react';
import { FORMATIONS, type CareerState } from '@/lib/clubManager';
import { defaultNationalSquad, defaultNationalXI, nationalPool, NATIONAL_KEEPER_PLACES, NATIONAL_SQUAD_SIZE, resolveNationalSquad, resolveNationalXI, type NationalSquad, type NationalXI } from '@/lib/clubManagerNationalXI';

export function ClubManagerNationalLineup({ career, year, name, onSave, onSaveSquad, onBack }: {
  career: CareerState;
  year: number;
  name: string;
  onSave: (plan: NationalXI | null) => boolean;
  onSaveSquad?: (plan: NationalSquad | null) => boolean;
  onBack: () => void;
}) {
  const eligible = useMemo(() => nationalPool(career), [career]);
  const heldSquad = career.nationJob?.squad?.year === year ? career.nationJob.squad : undefined;
  const squad = resolveNationalSquad(heldSquad, eligible);
  const pool = squad ?? eligible;
  const [plan, setPlan] = useState<NationalXI>(() => {
    const held = career.nationJob?.xi;
    return held?.year === year && Number.isInteger(held.formation) && FORMATIONS[held.formation] && Array.isArray(held.keys) && held.keys.length === 11
      ? held : { year, formation: 0, keys: defaultNationalXI(0, pool) };
  });
  const [notice, setNotice] = useState('');
  const [editingSquad, setEditingSquad] = useState(false);
  const [squadKeys, setSquadKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const formation = FORMATIONS[plan.formation];
  const resolved = resolveNationalXI(plan, pool);
  const save = (next: NationalXI | null) => {
    setNotice(onSave(next) ? (next ? `Lineup saved for ${year}.` : 'Automatic selection restored.') : 'The lineup could not be saved.');
  };
  const openSquad = () => {
    setSquadKeys(Array.isArray(heldSquad?.keys)
      ? [...new Set(heldSquad.keys.filter(key => eligible.some(player => player.key === key)))]
      : defaultNationalSquad(eligible, plan.keys));
    setQuery('');
    setNotice('');
    setEditingSquad(true);
  };
  const saveSquad = (next: NationalSquad | null) => {
    if (!onSaveSquad?.(next)) { setNotice('The squad could not be saved.'); return; }
    const newPool = resolveNationalSquad(next ?? undefined, eligible) ?? eligible;
    const pinned = career.nationJob?.xi;
    setPlan(pinned?.year === year && Array.isArray(pinned.keys) && resolveNationalXI(pinned, newPool)
      ? pinned : { year, formation: plan.formation, keys: defaultNationalXI(plan.formation, newPool) });
    setEditingSquad(false);
    setNotice(next ? `Squad saved for ${year}.` : 'Full eligible pool restored.');
  };
  if (editingSquad) {
    const selected = new Set(squadKeys);
    const players = eligible.filter(player => player.name.toLowerCase().includes(query.trim().toLowerCase()));
    const valid = resolveNationalSquad({ year, keys: squadKeys }, eligible);
    const keepers = eligible.filter(player => player.position === 'GK' && selected.has(player.key)).length;
    return (
      <section data-cm-national-squad className="space-y-3 rounded-xl border border-border bg-card p-3 text-xs">
        <button type="button" className="min-h-11 text-muted-foreground" onClick={() => { setEditingSquad(false); setNotice(''); }}>← Starting XI</button>
        <h3 className="text-sm font-bold">{career.nationJob?.nation} call-ups</h3>
        <p>Choose {NATIONAL_SQUAD_SIZE} players, including three goalkeepers. Your starting XI comes from these call-ups.</p>
        <label className="block">Search eligible players
          <input type="search" value={query} onChange={event => setQuery(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background px-2" />
        </label>
        <p role="status">{selected.size}/{NATIONAL_SQUAD_SIZE} called up · {keepers}/{NATIONAL_KEEPER_PLACES} goalkeepers</p>
        <div className="max-h-64 overflow-y-auto rounded-md border border-border px-2">
          {players.map(player => {
            const included = selected.has(player.key);
            return (
              <label key={player.key} className="flex min-h-11 cursor-pointer items-center gap-2 border-b border-border last:border-0">
                <input type="checkbox" checked={included}
                  disabled={!included && (selected.size >= NATIONAL_SQUAD_SIZE || (player.position === 'GK' && keepers >= NATIONAL_KEEPER_PLACES))}
                  onChange={() => setSquadKeys(included ? squadKeys.filter(key => key !== player.key) : [...squadKeys, player.key])} />
                <span>{player.name} · {player.position} · {player.rating}{player.club ? ` · ${player.club}` : ''}</span>
              </label>
            );
          })}
          {players.length === 0 && <p className="py-2 text-muted-foreground">No players match that search.</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-lg bg-primary px-3 font-bold text-primary-foreground disabled:opacity-50"
            disabled={!valid} onClick={() => saveSquad({ year, keys: squadKeys })}>Save national squad</button>
          <button type="button" className="min-h-11 rounded-lg border border-border px-3 font-bold"
            onClick={() => setSquadKeys(defaultNationalSquad(eligible, plan.keys))}>Suggest squad</button>
          {heldSquad && <button type="button" className="min-h-11 rounded-lg border border-border px-3 font-bold"
            onClick={() => saveSquad(null)}>Use full eligible pool</button>}
        </div>
        {notice && <p role="status">{notice}</p>}
      </section>
    );
  }
  return (
    <section data-cm-national-xi className="space-y-3 rounded-xl border border-border bg-card p-3 text-xs">
      <button type="button" className="min-h-11 text-muted-foreground" onClick={onBack}>← Manager</button>
      <h3 className="text-sm font-bold">{career.nationJob?.nation} starting XI</h3>
      <p>{year} {name}. Your selected side’s ratings and positional fit affect qualifying and the tournament. Injured players are unavailable.</p>
      {onSaveSquad && <button type="button" className="min-h-11 rounded-lg border border-border px-3 font-bold" onClick={openSquad}>
        {heldSquad ? 'Edit national call-ups' : 'Pick national call-ups'}
      </button>}
      {heldSquad && !squad && <p role="status">A call-up is unavailable. Edit your squad or choose from the full eligible pool.</p>}
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
      <p className="text-muted-foreground">{pool.length} {squad ? 'players called up' : 'eligible players'}{resolved ? ` · XI strength ${resolved.strength.toFixed(1)}` : ''}</p>
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
