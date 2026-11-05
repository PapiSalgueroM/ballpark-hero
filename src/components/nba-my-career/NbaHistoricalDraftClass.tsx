import { NBA_DRAFT_2004 } from '@/data/nbaDraft2004';
import { hasNbaDraft2004, nbaTeamLabelOf, type NbaCareerState } from '@/lib/nbaMyCareer';

const role = (value: 'starter' | 'backup') => value === 'starter' ? 'Starting five' : 'Second unit';
const family = { G: 'Guard', F: 'Forward', C: 'Center' } as const;

export default function NbaHistoricalDraftClass({ career, onBack }: { career: NbaCareerState; onBack: () => void }) {
  if (!hasNbaDraft2004(career)) return null;
  const b = career.draft2004!;
  return <section className="space-y-3" aria-labelledby="nba-draft-2004-title">
    <button onClick={onBack} className="min-h-11 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold">
      Back to My Player
    </button>
    <div className="rounded-xl border border-border bg-card p-3">
      <h2 id="nba-draft-2004-title" className="font-display text-lg font-bold">2004 draft class</h2>
      <p className="mt-1 text-xs text-muted-foreground">59 real selections, June 24, 2004. Selection does not mean an NBA signing or debut.</p>
      <p className="mt-1 text-xs text-muted-foreground">Camp teams, comparisons and outcomes below are simulated in your career. Broad roles can cover different points in a player's career.</p>
    </div>
    <ol tabIndex={0} aria-label="All 59 real 2004 draft selections"
      className="grid max-h-96 gap-2 overflow-y-auto rounded-xl border border-border bg-card p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-2">
      {NBA_DRAFT_2004.map(p => <li key={p.id} data-draft-2004-id={p.id} className="min-w-0 rounded-lg bg-secondary p-2">
        <p className="break-words text-xs font-bold">Pick {p.pick}: {p.name}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{p.families.map(f => family[f]).join(' / ')}</p>
        <p className="text-[11px] text-muted-foreground">Born: {p.dob ?? 'Unknown, sources disagree'}</p>
      </li>)}
    </ol>
    {b.visits.length > 0 && <div className="rounded-xl border border-border bg-card p-3">
      <h3 className="text-sm font-bold">Your simulated 2004 camps</h3>
      <ul className="mt-2 space-y-2">
        {b.visits.map((v, i) => <li key={i} className="rounded-lg bg-secondary p-2 text-xs">
          <p className="font-bold">{NBA_DRAFT_2004.find(p => p.id === v.id)!.name}</p>
          <p className="mt-1 text-muted-foreground">{nbaTeamLabelOf(v.team, career.eraId)}: {family[v.family]}</p>
          <p className="text-muted-foreground">Simulated comparison: {v.comparison}</p>
          <p>{role(v.roleBefore)} to {role(v.roleAfter)}. Morale {v.moraleBefore} to {v.moraleAfter}.</p>
        </li>)}
      </ul>
    </div>}
  </section>;
}
