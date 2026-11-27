/**
 * Round 1522: tonight's tactics during a match: the four instructions, the formation and the duties, each change
 * taking hold from the next minute (the engine's changeLive). The dressing room and the live sheet both draw it.
 * Nothing here changes the standing plan on the Tactics tab.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FORMATIONS, dutyOptions, liveGoneIds, liveInstructions,
  type CareerState, type Duty, type LiveChange, type LiveMatch,
} from '@/lib/clubManager';
import { DUTY_INFO } from '@/lib/clubManagerUiInfo';
import { InstructionsPicker } from '@/components/club-manager/InstructionsPicker';
import { opponentStyle } from '@/lib/clubManagerTactics';
import { isFlankPlan } from '@/lib/clubManagerFlank';

export function LiveTacticsPanel({ career, live, onChange, idPrefix = 'live', minute, plus }: {
  career: CareerState;
  live: LiveMatch;
  onChange: (change: LiveChange) => void;
  idPrefix?: string;
  /** The clock in play (and how far into a board), so a man sent off or helped off by now is shown as gone. At a
   *  break it is left out: everything drawn so far has happened. */
  minute?: number;
  plus?: number;
}) {
  const [duties, setDuties] = useState(false);
  const formationIndex = live.formationIndex ?? career.formationIndex;
  const formation = FORMATIONS[formationIndex] ?? FORMATIONS[0];
  const gone = liveGoneIds(live, minute ?? 999, minute === undefined ? undefined : plus);
  const nameOf = (id: string) => (career.squad.find(p => p.id === id)?.name ?? '').replace(' (Youth)', '').split(' ').slice(-1)[0];
  return (
    <div className="space-y-2" data-cm-live-tactics={idPrefix}>
      <p className="text-[10px] text-muted-foreground leading-snug">
        For this match only, from the next minute. Your standing plan stays on the Tactics tab.
      </p>
      <details className="rounded-lg border border-border bg-card px-2">
        <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">Flank buildup</summary>
        <p className="mb-2 text-xs">Send your fullback beyond the winger for a second passing option, or hold the fullback behind the ball. After three entries on one flank the opponent shifts cover there. Try switching sides when that happens.</p>
        <label className="block pb-2 text-xs font-bold">Buildup route
          <select className="mt-1 min-h-11 w-full rounded border border-border bg-background px-2"
            value={isFlankPlan(live.flankPlan) ? live.flankPlan.side + '/' + live.flankPlan.support : ''}
            onChange={e => {
              const [side, support] = e.target.value.split('/');
              const plan = { side, support };
              onChange({ kind: 'flank', plan: isFlankPlan(plan) ? plan : null });
            }}>
            <option value="">Normal buildup</option>
            <option value="left/overlap">Overlap on the left</option><option value="right/overlap">Overlap on the right</option>
            <option value="left/hold">Protect the left</option><option value="right/hold">Protect the right</option>
          </select>
        </label>
      </details>
      <InstructionsPicker
        value={liveInstructions(live)}
        onChange={instructions => onChange({ kind: 'instructions', instructions })}
        theirStyle={opponentStyle(career, live.opponent)}
        idPrefix={idPrefix}
      />
      <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[4.5rem] shrink-0">Formation</span>
        <select
          data-cm-live-formation={idPrefix}
          value={formationIndex}
          onChange={e => onChange({ kind: 'formation', formationIndex: Number(e.target.value) })}
          className="flex-1 min-w-0 rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-bold text-foreground"
        >
          {FORMATIONS.map((f, i) => <option key={f.name} value={i}>{f.name}</option>)}
        </select>
      </label>
      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          data-cm-live-duties-toggle={idPrefix}
          onClick={() => setDuties(d => !d)}
          className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          Duties
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', duties && 'rotate-180')} />
        </button>
        {duties && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-2 pb-2">
            {formation.slots.map((slot, i) => {
              const options = dutyOptions(slot);
              const current = live.duties?.[i] ?? null;
              const id = live.onPitch[i];
              return (
                <label key={i} className="flex items-center gap-1.5 min-w-0">
                  <span className="w-9 shrink-0 text-[9px] font-bold text-muted-foreground bg-secondary rounded px-1 py-0.5 text-center">{slot.label}</span>
                  <span className={cn('w-16 shrink-0 truncate text-[10px]', id && gone.has(id) ? 'line-through text-muted-foreground' : 'text-foreground')} title={id && gone.has(id) ? 'Off the pitch' : undefined}>{id ? nameOf(id) : ''}</span>
                  <select
                    data-cm-live-duty={`${idPrefix}:${i}`}
                    value={current ?? ''}
                    onChange={e => onChange({ kind: 'duty', slot: i, duty: (e.target.value || null) as Duty | null })}
                    className="flex-1 min-w-0 rounded-md border border-border bg-background px-1 py-0.5 text-[10px] text-foreground"
                  >
                    <option value="">No duty</option>
                    {options.map(d => <option key={d} value={d}>{DUTY_INFO[d].label}</option>)}
                  </select>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
