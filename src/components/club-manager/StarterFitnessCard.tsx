import { useMemo, useState } from 'react';
import { shortDate } from '@/lib/calDate';
import { starterFitnessPreview, type CareerState } from '@/lib/clubManager';

export function StarterFitnessCard({ career, onChangeLineup }: { career: CareerState; onChangeLineup?: () => void }) {
  const [open, setOpen] = useState(false);
  const preview = useMemo(() => open ? starterFitnessPreview(career) : null, [open, career]);
  const forecast = preview?.forecast;
  return <section className="rounded-xl border border-border bg-card px-3 text-xs">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 w-full text-left font-bold">
      Starter fitness
    </button>
    {preview && <div className="space-y-2 pb-3">
      {forecast ? <>
        <p className="font-semibold">{shortDate(forecast.start)} to {shortDate(forecast.finish)} · {forecast.days} {forecast.days === 1 ? 'day' : 'days'} between fixtures</p>
        <p>Next up: {forecast.opponent} · {forecast.competition}</p>
        <p className="text-muted-foreground">Projected fitness after this match at your current training intensity. Playing includes a sub appearance. Tactics and international duty can change these numbers.</p>
      </> : <p className="text-muted-foreground">Current starting lineup. A projection needs a confirmed opponent and recovery interval.</p>}
      <table className="w-full table-fixed text-left text-xs tabular-nums">
        <thead className="text-muted-foreground"><tr>
          <th className="w-[44%]">Starter</th><th>Now</th>{forecast && <><th>If played</th><th>If rested</th></>}
        </tr></thead>
        <tbody>{(forecast?.values ?? preview.rows).map((p, index) => {
          const projection = forecast?.values[index];
          return <tr key={p.id} className="border-t border-border">
            <th scope="row" className="break-words py-1.5 pr-1 font-medium">{p.name} <span className="text-muted-foreground">{p.slot}</span></th>
            <td>{Math.round(p.now)}%</td>
            {projection && <><td>{Math.round(projection.low)}-{Math.round(projection.high)}%</td><td>{Math.round(projection.rest)}%</td></>}
          </tr>;
        })}</tbody>
      </table>
      {onChangeLineup && <button type="button" onClick={onChangeLineup} className="min-h-11 rounded-lg border border-border px-3 font-semibold">Change starting XI</button>}
    </div>}
  </section>;
}
