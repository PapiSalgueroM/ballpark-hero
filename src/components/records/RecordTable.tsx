import type { RecordRow, RecordSection } from '@/lib/records';

/**
 * Round 649: one champion table for the whole of the Record Books. /records
 * draws the latest seasons of each section with it and every /records/<slug>
 * page draws one per decade, so the columns can never differ between the two.
 */
const RecordTable = ({ def, rows }: { def: RecordSection; rows: RecordRow[] }) => (
  <div className="overflow-x-auto rounded-xl border border-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-secondary/50 text-left">
          <th className="px-3 py-2 font-semibold text-foreground">{def.yearLabel}</th>
          <th className="px-3 py-2 font-semibold text-foreground">{def.championLabel ?? 'Champion'}</th>
          {def.columns.map(([k, label]) => (
            <th key={k} className="px-3 py-2 font-semibold text-foreground">{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.year}-${r.champion}-${i}`} className="border-t border-border/60">
            <td className="px-3 py-1.5 text-muted-foreground">{r.year}</td>
            <td className="px-3 py-1.5 font-medium text-foreground">{r.champion}</td>
            {def.columns.map(([k]) => (
              <td key={k} className="px-3 py-1.5 text-muted-foreground">{r.extra[k] ?? ''}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default RecordTable;
