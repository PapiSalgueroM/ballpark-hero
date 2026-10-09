import { useRef, useState } from 'react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { pickCareerPreparation, preparationForSeason, preparationSkill, type PreparationId } from '@/lib/soccerCareerPreparation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const names = { push: 'Development push', recovery: 'Recovery focus' };

export function PreseasonPlanTile({ career, onCareer }: { career: CareerState; onCareer: (fn: (prev: CareerState) => CareerState) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const held = preparationForSeason(career);
  const skill = preparationSkill(career.position);
  const choose = (id: PreparationId | null) => { onCareer(prev => pickCareerPreparation(prev, id)); setOpen(false); };
  return <>
    <button ref={trigger} type="button" data-preseason-plan aria-haspopup="dialog" onClick={() => setOpen(true)} className="min-h-[64px] w-full rounded-xl border border-border bg-card p-3 text-left">
      <span className="block text-sm font-semibold">🏃 Preseason plan</span>
      <span className="block text-xs text-muted-foreground">{held ? `${names[held.id]} · ${held.year}/${String((held.year + 1) % 100).padStart(2, '0')}` : 'Balanced, or choose your next-season workload'}</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent data-preseason-dialog className="max-h-[85dvh] overflow-y-auto [&>button:last-child]:min-h-11 [&>button:last-child]:min-w-11" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogHeader className="pr-8"><DialogTitle>Set your preseason workload</DialogTitle><DialogDescription>One season at {career.currentClub}. A simulated choice, with a tradeoff.</DialogDescription></DialogHeader>
        <p className="text-sm">Development push adds 1 {skill} point after natural growth, with 3 percentage points more injury risk. Recovery focus subtracts 1 {skill} point after growth, with 4 percentage points less risk. Existing injury and attribute limits still apply.</p>
        <p className="text-xs text-muted-foreground">Example: a 20% injury chance becomes 23% with development or 16% with recovery. A serious injury or no appearances interrupts the development modifier. Moving clubs cancels the plan. Balanced keeps your usual growth and risk.</p>
        <div className="space-y-2">
          {(['push', 'recovery'] as const).map(id => <button key={id} type="button" data-preparation-option={id} aria-pressed={held?.id === id} className="min-h-11 w-full rounded-xl border border-border p-3 text-left text-sm" onClick={() => choose(id)}>
            <span className="block font-semibold">{names[id]}</span><span className="block text-xs text-muted-foreground">{id === 'push' ? `+1 ${skill}, higher injury risk` : `-1 ${skill}, lower injury risk`}</span>
          </button>)}
          <button type="button" data-preparation-option="balanced" aria-pressed={!held} className="min-h-11 w-full rounded-xl border border-border p-3 text-left text-sm" onClick={() => choose(null)}>Balanced workload</button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}

export function PreseasonPlanResult({ season }: { season: SeasonRecord }) {
  const result = season.preparation;
  if (!result) return null;
  return <div data-preseason-result={result.outcome} className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
    <p className="font-semibold">🏃 {names[result.id]} {result.outcome}</p>
    <p className="text-xs text-muted-foreground">{result.outcome === 'completed' ? `${result.adjustment > 0 ? '+' : ''}${result.adjustment} ${result.skill} after natural growth.` : 'No development modifier carried forward.'}</p>
  </div>;
}
