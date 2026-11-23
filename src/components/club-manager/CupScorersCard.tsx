import type { CupScorerRace, CupScorerRow } from '@/lib/clubManagerCupScorers';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';

const SCORER_STATUS: Record<CupScorerRace['status'], string> = {
  ahead: 'Waiting for the first matchday',
  racing: 'Race in progress',
  winner: 'Golden Boot winner',
  shared: 'Shared Golden Boot',
  undecided: 'Golden Boot unconfirmed',
  'no-goals': 'No player award this edition',
  unavailable: 'Scorer records unavailable',
};

type Scope = 'uel' | 'cup';

export function cupScorerStatusLabel(status: CupScorerRace['status'], scope: Scope) {
  return scope === 'cup' && status === 'ahead' ? 'Waiting for the first round' : SCORER_STATUS[status];
}

function ScorerLine({ row, scope, rank }: { row: CupScorerRow; scope: Scope; rank?: number }) {
  return (
    <li className="flex items-center gap-2 py-2" {...{ ['data-cm-' + scope + '-scorer']: true }}>
      {rank !== undefined && <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{rank}</span>}
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold text-foreground">
          {row.name}{row.generated && <MadeUpTag className="ml-1" />}
        </span>
        <span className="block break-words text-xs text-muted-foreground">{row.club}</span>
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums" aria-label={`${row.goals} ${row.goals === 1 ? 'goal' : 'goals'}`}
        {...{ ['data-cm-' + scope + '-scorer-goals']: true }}>
        {row.goals}
      </span>
    </li>
  );
}

export function CupScorersCard({ race, myClub, competition, scope }: {
  race: CupScorerRace; myClub: string; competition: string; scope: Scope;
}) {
  const rows = race.rows.slice(0, 8);
  const clubLeader = race.rows.find(row => row.club === myClub);
  const outsideTop = clubLeader && !rows.includes(clubLeader) ? clubLeader : null;
  const clubAward = race.leaders.some(row => row.club === myClub);
  return (
    <section aria-label={`${competition} Golden Boot`} className="rounded-xl border border-border bg-card p-3 space-y-2"
      {...{ ['data-cm-' + scope + '-scorer-race']: race.status }}>
      <div className="text-sm font-bold text-foreground">{cupScorerStatusLabel(race.status, scope)}</div>
      {race.status === 'racing' && <p className="text-xs text-muted-foreground">The award settles after the final.</p>}
      {race.status === 'unavailable' && <p className="text-xs text-muted-foreground">This edition has incomplete scorer records.</p>}
      {race.status === 'no-goals' && <p className="text-xs text-muted-foreground">There were no goals credited to a player.</p>}
      {race.status === 'shared' && <p className="text-xs text-muted-foreground">{race.leaders.length} players finished level on goals.</p>}
      {clubAward && <p className="text-xs font-semibold text-primary">
        Your club has a Golden Boot winner.
      </p>}
      {race.unresolved > 0 && <p className="text-xs text-muted-foreground">
        {race.unresolved === 1 ? '1 goal has no recorded scorer.' : `${race.unresolved} goals have no recorded scorer.`}
      </p>}
      {rows.length > 0 && (
        <ol className="divide-y divide-border/50">
          {rows.map(row => <ScorerLine key={row.id} row={row} scope={scope} rank={rows.findIndex(first => first.goals === row.goals) + 1} />)}
        </ol>
      )}
      {outsideTop && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">Your club's leading recorded scorer</p>
          <ul><ScorerLine row={outsideTop} scope={scope} /></ul>
        </div>
      )}
    </section>
  );
}
