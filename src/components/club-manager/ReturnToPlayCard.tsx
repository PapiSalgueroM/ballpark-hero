import { useState } from 'react';
import { minuteLabel, type CareerState } from '@/lib/clubManager';
import { majorInjuryLabel } from '@/lib/clubManagerInjuries';
import {
  bookReturnToPlay, cancelReturnToPlay, isReturnReceipt, returnToPlayDesk,
  type ReturnPlan, type ReturnTraining,
} from '@/lib/clubManagerReturnToPlay';
import { MadeUpTag } from './SquadScreen';

const planName: Record<ReturnPlan, string> = { 'late-cameo': 'Late cameo', 'managed-start': 'Managed start' };
const statusText = { recovering: 'Awaiting clearance', suspended: 'Cleared, serving a ban', ready: 'Available for selection' };
type Active = NonNullable<ReturnType<typeof returnToPlayDesk>['active']>;

function TrainingRecord({ training }: { training: readonly ReturnTraining[] }) {
  if (!training.length) return null;
  return <details>
    <summary className="min-h-11 cursor-pointer py-3 font-semibold">Recent training loads</summary>
    <ul className="space-y-0.5">{training.map(week => <li key={week.season + ':' + week.week}>
      Season {week.season}, week {week.week + 1} · {week.intensity} training
    </li>)}</ul>
  </details>;
}

function ActiveReturn({ active, duringMatch = false }: { active: Active; duringMatch?: boolean }) {
  const { player, plan, status, cue, forecast } = active;
  return <div className="space-y-1">
    <p><strong>{player.name}</strong>{player.generated && <MadeUpTag className="ml-1" />} · {planName[plan]}</p>
    <p>{statusText[status]}</p>
    {player.major && <p>{status === 'recovering' ? majorInjuryLabel(player.major) : `Original injury · ${majorInjuryLabel(player.major)}`}</p>}
    {!player.major && player.injuryWeeks > 0 && <p>{player.injuryWeeks} {player.injuryWeeks === 1 ? 'week' : 'weeks'} on the injury list</p>}
    <p>Simulated setback estimate for the planned minutes is <strong>{forecast[0]}% to {forecast[1]}%</strong>. The player’s actual minutes and recorded training determine what happens next.</p>
    {status === 'ready' && !duringMatch && <p>
      {plan === 'late-cameo' ? 'Pick a bench role for this return.' : 'Pick him to start, with a substitute ready.'}
      {' '}{active.projectedStart ? 'He is in the projected XI.' : 'He is outside the projected XI.'}
    </p>}
    {status === 'ready' && !duringMatch && (cue
      ? <p>In Quick Sim the coach can bring on {cue.inName} for {cue.outName} {cue.window === 'late' ? 'between 72 and 82 minutes' : 'between 58 and 68 minutes'}. A named bench order takes priority.</p>
      : <p>Quick Sim needs a compatible change from the chosen lineup. In Play Live, use your substitutions to manage the minutes.</p>)}
    {duringMatch && <p>Manage his minutes using your live substitutions. Extra time counts toward his workload.</p>}
    <TrainingRecord training={active.training} />
  </div>;
}

export function ReturnToPlayMatchCard({ career, duringMatch = false }: { career: CareerState; duringMatch?: boolean }) {
  if (!career.returnToPlay?.active) return null;
  const { active } = returnToPlayDesk(career);
  if (!active || active.status !== 'ready') return null;
  return <details className="rounded-lg border border-border bg-card px-2">
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">First appearance plan · {active.player.name}</summary>
    <section aria-label="First appearance plan" className="pb-2 text-xs">
      <ActiveReturn active={active} duringMatch={duringMatch} />
    </section>
  </details>;
}

export function ReturnToPlayReport({ receipt }: { receipt: unknown }) {
  if (!isReturnReceipt(receipt)) return null;
  const exit = minuteLabel(receipt.exit);
  return <details className="mt-3 rounded-lg border border-border bg-card px-2 text-left">
    <summary className="min-h-11 cursor-pointer py-3 text-xs font-bold">Return from injury · {receipt.name}</summary>
    <section aria-label="Return from injury" className="space-y-1 pb-2 text-xs">
      <p><strong>{receipt.name}</strong>{receipt.generated && <MadeUpTag className="ml-1" />} · {planName[receipt.plan]} against {receipt.opponent}</p>
      <p>{receipt.started ? 'Started at kickoff' : `Came on at ${minuteLabel(receipt.entry)}`} and played until {exit}. <strong>{receipt.minutes} {receipt.minutes === 1 ? 'minute' : 'minutes'} recorded.</strong></p>
      <p>Simulated setback chance with this workload was {receipt.riskPercent}%.</p>
      {receipt.outcome === 'settled' && <p className="font-semibold">Completed the return workload.</p>}
      {receipt.outcome === 'setback' && <p className="font-semibold">The return caused a setback. Expected out for {receipt.setbackWeeks} {receipt.setbackWeeks === 1 ? 'week' : 'weeks'}.</p>}
      {receipt.outcome === 'match-injury' && <p className="font-semibold">He picked up an injury during the match. See the treatment room for his current timeline.</p>}
      {receipt.outcome === 'training-injury' && <p className="font-semibold">Training recorded a separate injury. See the treatment room for his current timeline.</p>}
      <TrainingRecord training={receipt.training} />
    </section>
  </details>;
}

export function ReturnToPlayDeskCard({ career, onCommit }: {
  career: CareerState;
  onCommit: (work: (career: CareerState) => CareerState | null) => boolean;
}) {
  const [playerId, setPlayerId] = useState('');
  const [plan, setPlan] = useState<ReturnPlan>('late-cameo');
  const [failed, setFailed] = useState(false);
  const { candidates, active, last, locked } = returnToPlayDesk(career);
  const player = candidates.find(candidate => candidate.id === playerId) ?? candidates[0];
  if (!player && !active && !last && !locked) return null;
  const planned = !active && !locked && player ? bookReturnToPlay(career, player.id, plan) : null;
  const forecast = planned && returnToPlayDesk(planned).active?.forecast;
  const commit = (work: (career: CareerState) => CareerState | null) =>
    setFailed(!onCommit(current => current === career ? work(current) : null));
  return <section aria-label="Plan a return from injury" className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs">
    <h3 className="text-sm font-bold">Plan a return from injury</h3>
    {locked ? <p>The return plan is unavailable for changes right now.</p> : active ? <>
      <ActiveReturn active={active} />
      <div className="flex flex-wrap gap-2">
        <button className="min-h-11 rounded-md border border-border px-2 font-semibold" type="button"
          onClick={() => commit(current => bookReturnToPlay(current, active.player.id, active.plan === 'late-cameo' ? 'managed-start' : 'late-cameo'))}>
          Switch to {active.plan === 'late-cameo' ? 'managed start' : 'late cameo'}
        </button>
        <button className="min-h-11 rounded-md border border-border px-2 font-semibold" type="button"
          onClick={() => commit(cancelReturnToPlay)}>Cancel return plan</button>
      </div>
    </> : player && <>
      <label className="block font-semibold">Injured player
        <select className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-border bg-background px-2"
          value={player.id} onChange={e => setPlayerId(e.target.value)}>
          {candidates.map(candidate => <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.position}{candidate.generated ? ' · Generated' : ''}</option>)}
        </select>
      </label>
      <p>{majorInjuryLabel(player.major) ?? `${player.injuryWeeks} ${player.injuryWeeks === 1 ? 'week' : 'weeks'} on the injury list`}</p>
      <fieldset className="space-y-1">
        <legend className="font-semibold">First appearance after clearance</legend>
        <label className="flex min-h-11 items-center gap-2">
          <input type="radio" name="return-plan" checked={plan === 'late-cameo'} onChange={() => setPlan('late-cameo')} />
          Late cameo. Build minutes off the bench.
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <input type="radio" name="return-plan" checked={plan === 'managed-start'} onChange={() => setPlan('managed-start')} />
          Managed start. Use him from kickoff and plan a change around the hour.
        </label>
      </fieldset>
      {forecast && <p>Initial simulated setback estimate for this plan is <strong>{forecast[0]}% to {forecast[1]}%</strong>.</p>}
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Return rules and example</summary>
        <p>A player waits for his normal clearance. For a late cameo, give him a bench place. If he comes on at 78 minutes and sees out 90+4, he records 16 minutes. An unused bench spot leaves the plan waiting for his first appearance.</p>
      </details>
      <button className="min-h-11 rounded-md bg-primary px-3 font-semibold text-primary-foreground" type="button"
        onClick={() => commit(current => bookReturnToPlay(current, player.id, plan))}>Book {planName[plan].toLowerCase()}</button>
    </>}
    {failed && <p role="status">Check the current squad and open the treatment room again.</p>}
    <ReturnToPlayReport receipt={last} />
  </section>;
}
