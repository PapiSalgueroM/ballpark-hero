import { useState } from 'react';
import { fantasyDraftCandidates, type CriteriaRule } from '@/lib/fantasyCriteria';
import { followUpChance } from '@/lib/fantasyDraftPlan';
import type { DraftPlayer } from './PlayerPool';

interface PlannerProps {
  userTeam: DraftPlayer[]; aiTeam: DraftPlayer[]; pool: DraftPlayer[];
  claimed: Set<string>; eligible: DraftPlayer[]; rule: CriteriaRule | null;
  rivalPicks: number; scoutUserFirst?: boolean; onPick: (player: DraftPlayer) => void;
}

export function FantasyPickPlanner(props: PlannerProps) {
  const [open, setOpen] = useState(false);
  return <section className="mb-3 rounded-xl border border-border bg-card">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-11 w-full px-4 text-left text-sm font-semibold">{open ? 'Close pick planner' : 'Plan two picks'}</button>
    {open && <PickForecast {...props} />}
  </section>;
}

function PickForecast({ userTeam, aiTeam, pool, claimed, eligible, rule, rivalPicks, scoutUserFirst, onPick }: PlannerProps) {
  const [firstId, setFirstId] = useState('');
  const [nextId, setNextId] = useState('');
  const first = eligible.find(p => p.id === firstId) ?? eligible[0];
  if (!first) return null;
  const afterFirst = new Set([...claimed, first.id]);
  const following = fantasyDraftCandidates(rule, [...userTeam, first], pool, afterFirst).players;
  const next = following.find(p => p.id === nextId) ?? following[0];
  const scout = scoutUserFirst === undefined ? undefined : { team: [...userTeam, first], userFirst: scoutUserFirst };
  const chance = next ? Math.round(100 * followUpChance(next.id, rivalPicks, rule, aiTeam, pool, afterFirst, scout)) : null;
  const canReverse = next && eligible.some(p => p.id === next.id)
    && fantasyDraftCandidates(rule, [...userTeam, next], pool, new Set([...claimed, next.id])).players.some(p => p.id === first.id);
  const options = (players: DraftPlayer[]) => players.map(p => <option key={p.id} value={p.id}>{p.name} ({p.position})</option>);
  const inputClass = 'mt-1 h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground';
  return <div className="space-y-3 px-4 pb-4">
    <p className="text-xs text-muted-foreground">Pick two targets to see whether the rival could take the second before your next turn.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="min-w-0 text-xs font-semibold">First pick<select className={inputClass} value={first.id} onChange={e => setFirstId(e.target.value)}>{options(eligible)}</select></label>
      <label className="min-w-0 text-xs font-semibold">Next target<select className={inputClass} value={next?.id ?? ''} disabled={!next} onChange={e => setNextId(e.target.value)}>{options(following)}</select></label>
    </div>
    <p role="status" aria-label="Draft forecast" className="text-sm">{next ? <><strong>{chance}%</strong> chance {next.name} is still available. {rivalPicks === 0 ? 'You pick again immediately.' : `The rival makes ${rivalPicks} ${rivalPicks === 1 ? 'pick' : 'picks'} before your next turn.`}</> : 'No follow-up is available for this pair.'}</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!canReverse} className="min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-40" onClick={() => { if (next && canReverse) { setFirstId(next.id); setNextId(first.id); } }}>Reverse order</button>
      <button type="button" className="min-h-11 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground" onClick={() => onPick(first)}>Draft {first.name}</button>
    </div>
  </div>;
}
