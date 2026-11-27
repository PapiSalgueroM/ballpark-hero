import { useState } from 'react';
import type { ConquestMapSport } from '@/lib/conquestMapLook';
import { teamLabel, type ImperialismSport } from '@/lib/imperialismEngine';

interface Props {
  sport: ImperialismSport;
  map: ConquestMapSport;
  history: Record<string, string>[];
  labels: string[];
}

export default function ConquestTerritoryHistory({ sport, map, history, labels }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [changesOnly, setChangesOnly] = useState(false);
  const index = Math.min(selected ?? history.length - 1, history.length - 1);
  const owners = history[index];
  if (!owners) return null;
  const previous = history[index - 1];
  const query = search.trim().toLowerCase();
  const rows = open ? map.regions.flatMap(region => {
    const owner = owners[region.id];
    const before = previous?.[region.id];
    if (!owner || (changesOnly && previous && before === owner)) return [];
    const current = teamLabel(sport, owner);
    const prior = before && before !== owner ? teamLabel(sport, before) : null;
    if (query && ![region.name, region.id, current, owner, prior, before].some(value => value?.toLowerCase().includes(query))) return [];
    return [{ region, current, prior }];
  }) : [];
  return <section className="rounded-xl border border-border bg-card">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
      className="flex min-h-11 w-full items-center justify-between px-3 text-sm font-bold">
      Territory history <span aria-hidden="true">{open ? '−' : '+'}</span>
    </button>
    {open && <div className="space-y-3 border-t border-border p-3">
      <p className="text-xs text-muted-foreground">Pick a completed round to see who held each territory. Search for a place or team to follow its run.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold">Map after
          <select className="min-h-11 rounded-lg border border-border bg-background px-2" value={index}
            onChange={event => setSelected(Number(event.target.value))}>
            {history.map((_, i) => <option key={i} value={i}>{labels[i]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold">Territory or team
          <input type="search" value={search} onChange={event => setSearch(event.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-2" />
        </label>
      </div>
      <label className="inline-flex min-h-9 items-center gap-2 text-xs">
        <input type="checkbox" checked={!!previous && changesOnly} disabled={!previous}
          onChange={event => setChangesOnly(event.target.checked)} /> Show changes only
      </label>
      <p role="status" className="text-xs text-muted-foreground">
        {rows.length ? `${rows.length} ${rows.length === 1 ? 'territory' : 'territories'}` : 'No territories match.'}
      </p>
      {rows.length > 0 && <ul aria-label="Territory owners" tabIndex={0} className="max-h-60 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border px-3">
        {rows.map(({ region, current, prior }) => <li key={region.id} className="grid grid-cols-2 gap-2 py-2 text-xs">
          <span className="font-semibold">{region.name}</span>
          <span>{current}{prior && <span className="block text-muted-foreground">Previously {prior}</span>}</span>
        </li>)}
      </ul>}
    </div>}
  </section>;
}
