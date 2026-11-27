import type { ReactNode } from 'react';
import { isFlankPlan, type FlankPlan } from '@/lib/clubManagerFlank';

const routes = {
  'left/overlap': 'Overlap on the left',
  'right/overlap': 'Overlap on the right',
  'left/hold': 'Protect the left',
  'right/hold': 'Protect the right',
};

export function FlankRoutePicker({ title, plan, onChange, children }: {
  title: string;
  plan?: FlankPlan | null;
  onChange: (plan: FlankPlan | null) => void;
  children?: ReactNode;
}) {
  const value = isFlankPlan(plan) ? `${plan.side}/${plan.support}` as const : '';
  return <details className="rounded-lg border border-border bg-card px-2">
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">
      {title}{value && <span className="ml-2 font-normal text-muted-foreground">{routes[value]}</span>}
    </summary>
    <p className="mb-2 text-xs">Send your fullback past the winger for another way forward, or hold the fullback back to cover a counter. After three entries on one flank the opponent shifts cover there. Try switching sides when that happens.</p>
    <label className="block pb-2 text-xs font-bold">Buildup route
      <select className="mt-1 min-h-11 w-full rounded border border-border bg-background px-2"
        value={value} onChange={e => {
          const [side, support] = e.target.value.split('/');
          const chosen = { side, support };
          onChange(isFlankPlan(chosen) ? chosen : null);
        }}>
        <option value="">Normal buildup</option>
        {Object.entries(routes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>
    {children}
  </details>;
}
