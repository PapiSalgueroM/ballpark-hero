import { useState } from 'react';
import { cn } from '@/lib/utils';
import { isPhaseOrder, type PhaseOrder, type PhasePositions } from '@/lib/clubManagerPhaseShapes';
import { MadeUpTag } from './SquadScreen';

const DEFAULT_ORDER: PhaseOrder = {
  v: 1, withBall: 'secure-3-2-5', withoutBall: 'screen-4-1-4-1', outlet: 'near', recovery: 'screen',
};

const shapes = {
  'secure-3-2-5': '3-2-5 buildup',
  'wide-2-3-5': '2-3-5 wide buildup',
  'screen-4-1-4-1': '4-1-4-1 midfield screen',
  'step-4-4-2': '4-4-2 front two',
};

export function PhasePositionMap({ positions, order }: { positions: PhasePositions; order: PhaseOrder }) {
  const [phase, setPhase] = useState<'withBall' | 'withoutBall' | 'return'>('withBall');
  const layouts = [
    ['withBall', 'With the ball'],
    ['withoutBall', 'Without the ball'],
    ['return', 'Recovery runs'],
  ] as const;
  const selectedShape = phase === 'withoutBall' ? 'withoutBall' : 'withBall';
  const players = [...positions.rows].sort((a, b) => a[selectedShape].y - b[selectedShape].y || a[selectedShape].x - b[selectedShape].x);
  return <div className="space-y-2">
    <div className="grid grid-cols-3 gap-1" role="group" aria-label="Phase diagram">
      {layouts.map(([id, label]) => <button key={id} type="button" aria-pressed={phase === id}
        className={cn('min-h-11 rounded-md border px-1 text-xs font-semibold', phase === id ? 'border-primary bg-primary/15 text-primary' : 'border-border')}
        onClick={() => setPhase(id)}>{label}</button>)}
    </div>
    <figure className="mx-auto max-w-80 space-y-1">
      <figcaption className="text-center text-xs font-bold">
        {phase === 'return' ? 'From attack back into defensive shape' : shapes[order[selectedShape]]}
      </figcaption>
      <div aria-hidden="true" className="relative aspect-square overflow-hidden rounded-md border border-emerald-300/50 bg-emerald-950">
        <div className="absolute inset-[4%] rounded-sm border border-emerald-300/35" />
        <div className="absolute inset-x-[4%] top-1/2 border-t border-emerald-300/35" />
        <div className="absolute left-1/2 top-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/35" />
        <div className="absolute inset-x-[23%] top-[4%] h-[12%] border border-emerald-300/35" />
        <div className="absolute inset-x-[23%] bottom-[4%] h-[12%] border border-emerald-300/35" />
        {players.map(row => {
          const start = row[selectedShape], finish = row.withoutBall;
          const dx = finish.x - start.x, dy = finish.y - start.y;
          return <div key={row.playerId}>
            {phase === 'return' && <>
              <span className="absolute z-10 h-px origin-left bg-amber-200/70" style={{
                left: `${start.x}%`, top: `${start.y}%`, width: `${Math.hypot(dx, dy)}%`,
                transform: `rotate(${Math.atan2(dy, dx)}rad)`,
              }} />
              <span className="absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100 bg-emerald-950"
                style={{ left: `${finish.x}%`, top: `${finish.y}%` }} />
            </>}
            <span className="absolute z-20 inline-flex h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-100 px-1 text-[10px] font-bold text-emerald-950"
              style={{ left: `${start.x}%`, top: `${start.y}%` }}>{row.slot + 1}</span>
          </div>;
        })}
        {positions.keeper && <span className="absolute bottom-[6%] left-1/2 -translate-x-1/2 rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-950">GK</span>}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        {phase === 'return' ? 'Lines show how far each player has to recover.' : 'Your team attacks toward the top.'}
      </p>
      {positions.missingSlots.length > 0 && <p className="text-center text-xs text-amber-200">
        {positions.missingSlots.length} vacant {positions.missingSlots.length === 1 ? 'outfield position' : 'outfield positions'}
      </p>}
    </figure>
    <details>
      <summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold">Player assignments</summary>
      {positions.keeper && <p className="mb-1 text-xs">GK · {positions.keeper.name}{positions.keeper.generated && <MadeUpTag className="ml-1" />}</p>}
      <ul className="divide-y divide-border text-xs">
        {players.map(row => <li className="py-1.5" key={row.playerId}>
          <strong>{row.slot + 1} · {row.name}</strong>{row.generated && <MadeUpTag className="ml-1" />}
          <p className="text-muted-foreground">{phase === 'return'
            ? `${row.withBall.role} to ${row.withoutBall.role} · ${row.returnDistance} pitch units · ${Math.round(row.fitness)} fitness`
            : row[selectedShape].role}</p>
        </li>)}
      </ul>
    </details>
  </div>;
}

export function PhaseShapePicker({ order, positionsFor, onChange }: {
  order?: PhaseOrder | null;
  positionsFor: (order: PhaseOrder) => PhasePositions;
  onChange: (order: PhaseOrder | null) => void;
}) {
  const active = isPhaseOrder(order);
  const draft = active ? order : DEFAULT_ORDER;
  const [opened, setOpened] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const positions = opened ? positionsFor(draft) : null;
  const selectClass = 'mt-1 min-h-11 w-full rounded-md border border-border bg-background px-2 text-xs';
  const change = (patch: Partial<PhaseOrder>) => onChange({ ...draft, ...patch });
  return <details className="rounded-lg border border-border bg-card px-2" onToggle={e => setOpened(e.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">
      Shapes by phase{active && <span className="ml-2 font-normal text-primary">{draft.withBall.startsWith('secure') ? '3-2-5' : '2-3-5'} with the ball</span>}
    </summary>
    {positions && <section aria-label="Shapes by phase" className="space-y-2 pb-2 text-xs">
      <button type="button" className="min-h-11 rounded-md border border-border px-2 font-semibold" aria-expanded={helpOpen}
        onClick={() => setHelpOpen(!helpOpen)}>Shape rules and example</button>
      {helpOpen && <div className="space-y-1 rounded-md bg-secondary/40 p-2">
        <p>After a save, your goalkeeper can play to a close outlet or look past their first line. When their keeper starts a move, you can cover the pass or step up and try to win it back.</p>
        <p>Try 3-2-5 with a close outlet and 4-1-4-1 to screen the middle. Check who has a long run back. A tired player who steps up to challenge can leave a lane open behind him.</p>
      </div>}
      {!positions.available && <p role="status">{positions.reason ?? 'The phase shapes need a complete lineup.'}</p>}
      {order != null && !active && <p role="status">This match has a saved shape order this version cannot read.</p>}
      {!active ? <button type="button" disabled={!positions.available || order != null}
        className="min-h-11 rounded-md border border-primary px-2 font-semibold text-primary disabled:border-border disabled:text-muted-foreground"
        onClick={() => onChange(DEFAULT_ORDER)}>Use separate shapes</button> : <>
        <fieldset disabled={!positions.available} className="grid gap-2 sm:grid-cols-2 disabled:opacity-70">
          <label className="font-semibold">With the ball
            <select className={selectClass} value={draft.withBall} onChange={e => change({ withBall: e.target.value as PhaseOrder['withBall'] })}>
              <option value="secure-3-2-5">{shapes['secure-3-2-5']}</option>
              <option value="wide-2-3-5">{shapes['wide-2-3-5']}</option>
            </select>
          </label>
          <label className="font-semibold">Without the ball
            <select className={selectClass} value={draft.withoutBall} onChange={e => change({ withoutBall: e.target.value as PhaseOrder['withoutBall'] })}>
              <option value="screen-4-1-4-1">{shapes['screen-4-1-4-1']}</option>
              <option value="step-4-4-2">{shapes['step-4-4-2']}</option>
            </select>
          </label>
          <label className="font-semibold">First pass after a save
            <select className={selectClass} value={draft.outlet} onChange={e => change({ outlet: e.target.value as PhaseOrder['outlet'] })}>
              <option value="near">Find a nearby outlet</option>
              <option value="beyond">Play beyond the first line</option>
            </select>
          </label>
          <label className="font-semibold">When their keeper starts a move
            <select className={selectClass} value={draft.recovery} onChange={e => change({ recovery: e.target.value as PhaseOrder['recovery'] })}>
              <option value="screen">Recover to screen the pass</option>
              <option value="challenge">Step up to challenge</option>
            </select>
          </label>
        </fieldset>
        <button type="button" className="min-h-11 rounded-md border border-border px-2 font-semibold"
          onClick={() => onChange(null)}>Return to one shape</button>
      </>}
      {positions.rows.length > 0 && (positions.available || active) && <>
        {!active && <p className="font-semibold">Preview of the starting phase order</p>}
        <PhasePositionMap positions={positions} order={draft} />
      </>}
    </section>}
  </details>;
}
