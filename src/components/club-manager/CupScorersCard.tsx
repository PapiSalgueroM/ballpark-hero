import { cupScorerRace, type CupScorerRace, type CupScorerRow } from '@/lib/clubManagerCupScorers';
import { careerLeagueOf, championsLeagueScorerRace, domesticCupScorerRace, evalWorldComp, type CareerState, type Competition } from '@/lib/clubManager';
import { CupScorerHonour } from '@/components/club-manager/SeasonHonoursCard';
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

export type CupScorerScope = 'ucl' | 'uel' | 'cup';

export function cupScorerStatusLabel(status: CupScorerRace['status'], scope: CupScorerScope) {
  return scope === 'cup' && status === 'ahead' ? 'Waiting for the first round' : SCORER_STATUS[status];
}

function ScorerLine({ row, scope, rank }: { row: CupScorerRow; scope: CupScorerScope; rank?: number }) {
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
  race: CupScorerRace; myClub: string; competition: string; scope: CupScorerScope;
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

/** Show the same race as the Cups desk at the whistle, including when our cup run ends. */
export function MatchGoldenBoot({ career, competition }: { career: CareerState; competition: Competition }) {
  if (competition === 'cup') return <GoldenBootResult race={domesticCupScorerRace(career)} myClub={career.clubName}
    name={careerLeagueOf(career).cupName ?? 'Domestic cup'} scope="cup" />;
  if (competition === 'uclGroup' || competition === 'uclKo') return <GoldenBootResult race={championsLeagueScorerRace(career)}
    myClub={career.clubName} name="Champions League" scope="ucl" />;
  if (competition === 'uel') {
    const edition = evalWorldComp(career, 'uel');
    const race = cupScorerRace(career.worldComps?.uel?.scorers, edition?.nightsDone ?? 0, !!edition?.done);
    return <GoldenBootResult race={race} myClub={career.clubName} name="Europa League" scope="uel" />;
  }
  return null;
}

export function GoldenBootResult({ race, myClub, name, scope }: { race: CupScorerRace; myClub: string; name: string; scope: CupScorerScope }) {
  const mine = race.rows.find(row => row.club === myClub);
  return <section aria-label={name + ' Golden Boot'} className="rounded-xl border border-border bg-card p-3 text-left text-xs">
    {race.leaders.length > 0 ? <>
      <CupScorerHonour award={race.leaders} myClub={myClub} competition={name} scope={scope} />
      <p className="mt-1">{race.leaders.some(row => row.club === myClub) ? (race.leaders.length === 1 ? 'Your club won the award.' : 'Your club shared the award.') : 'The award went to another club.'}</p>
    </> : <>
      <p className="font-bold">{name} Golden Boot</p>
      <p>{race.status === 'racing' || race.status === 'ahead' ? 'The race stays open until the final. Follow it in Cups.' : cupScorerStatusLabel(race.status, scope)}</p>
    </>}
    {mine && !race.leaders.includes(mine) && <p className="mt-1 text-muted-foreground">Your leading scorer: {mine.name}{mine.generated && <MadeUpTag className="ml-1" />} · {mine.goals} {mine.goals === 1 ? 'goal' : 'goals'}</p>}
  </section>;
}
