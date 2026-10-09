import { useRef, useState } from 'react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { ambitionForNextSeason, ambitionOptions, pickCareerAmbition } from '@/lib/soccerCareerAmbitions';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const labels = { shooting: 'Shooting', passing: 'Passing', reflexes: 'Reflexes', defending: 'Defending', physical: 'Physical' };

export function SeasonAmbitionTile({ career, onCareer }: { career: CareerState; onCareer: (fn: (prev: CareerState) => CareerState) => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const held = ambitionForNextSeason(career);
  const options = ambitionOptions(career);
  const choose = (id: string | null) => { onCareer(prev => pickCareerAmbition(prev, id)); setOpen(false); };
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" data-season-ambition onClick={() => setOpen(true)} className="w-full min-h-[64px] rounded-xl border border-border bg-card p-3 text-left">
      <span className="block text-sm font-semibold">🎯 Season target</span>
      <span className="block text-xs text-muted-foreground">{held?.label ?? 'Choose a personal challenge for next season'}</span>
      {held && <span className="block text-xs font-bold mt-1">{held.year}/{String((held.year + 1) % 100).padStart(2, '0')} · {held.club}</span>}
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus({ preventScroll: true }); }}>
        <DialogHeader><DialogTitle>Your season target</DialogTitle><DialogDescription>A personal best to chase at {career.currentClub}.</DialogDescription></DialogHeader>
        <p className="text-sm">Choose one before you play. Beat your saved best to bank +1 training with next season's growth. It doesn't change this season's selection or stats.</p>
        <p className="text-xs text-muted-foreground">Example: your best is 12 goals, so the next target is 13. A serious injury or a year without appearances interrupts it. Moving clubs cancels it.</p>
        <div className="space-y-2">
          {options.map(option => <button key={option.id} type="button" data-ambition-option={option.id} aria-pressed={held?.id === option.id} className="min-h-11 w-full rounded-xl border border-border p-3 text-left text-sm" onClick={() => choose(option.id)}>
            <span className="block font-semibold">{option.label}</span>
            <span className="block text-xs text-muted-foreground">Reward: +1 {labels[option.rewardStat]} with next season's growth</span>
          </button>)}
        </div>
        <button type="button" className="min-h-11 rounded-xl border border-border px-3 text-sm" onClick={() => choose(null)}>{held ? 'Clear this target' : 'Play without a target'}</button>
      </DialogContent>
    </Dialog>
  </>;
}

export function SeasonAmbitionResult({ season }: { season: SeasonRecord }) {
  const result = season.ambition;
  if (!result) return null;
  return <div data-season-ambition-result={result.outcome} className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
    <p className="font-semibold">🎯 {result.outcome === 'achieved' ? 'Target met' : result.outcome === 'interrupted' ? 'Target interrupted' : 'Target missed'}</p>
    <p className="text-xs text-muted-foreground">{result.label}. Finished on {result.actual}.</p>
    {result.rewardStat && <p className="text-xs mt-1">+1 {labels[result.rewardStat]} queued for next season's growth.</p>}
  </div>;
}