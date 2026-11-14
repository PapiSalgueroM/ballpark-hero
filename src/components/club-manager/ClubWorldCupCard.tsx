import type { CareerState } from '@/lib/clubManager';

export function ClubWorldCupCard({ cup }: { cup: NonNullable<CareerState['clubWorldCup2025']> }) {
  return (
    <div data-cm-club-world-cup className="space-y-3 rounded-xl border border-border bg-card p-3 text-left">
      <div>
        <h3 className="text-sm font-bold">2025 Club World Cup</h3>
        <p className="text-xs text-muted-foreground">{cup.club} · {cup.result}</p>
        <p className="text-xs text-muted-foreground">Historical field. Results simulated.</p>
      </div>
      <table className="w-full text-xs tabular-nums">
        <caption className="pb-1 text-left font-semibold">Group {cup.group}</caption>
        <thead>
          <tr><th scope="col" className="text-left">Club</th><th scope="col" className="text-right">Played</th><th scope="col" className="text-right">GD</th><th scope="col" className="text-right">Pts</th></tr>
        </thead>
        <tbody>
          {cup.table.map(row => (
            <tr key={row.club} className={row.club === cup.club ? 'text-primary' : 'text-muted-foreground'}>
              <th scope="row" className="py-0.5 pr-1 text-left font-medium">{row.club}</th>
              <td className="text-right">{row.played}</td>
              <td className="text-right">{row.gf - row.ga}</td>
              <td className="text-right">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ol className="space-y-1 text-xs">
        {cup.matches.map(match => (
          <li key={match.stage + match.home + match.away} className="rounded-md bg-secondary/40 px-2 py-1.5">
            <span className="block text-muted-foreground">{match.stage === 'Group' ? 'Group match' : match.stage}</span>
            <span>{match.home} {match.homeGoals + (match.extraTime?.homeGoals ?? 0)}-{match.awayGoals + (match.extraTime?.awayGoals ?? 0)} {match.away}</span>
            {match.penalties
              ? <span className="block text-muted-foreground">{match.penalties} won on penalties.</span>
              : match.extraTime && <span className="block text-muted-foreground">After extra time.</span>}
          </li>
        ))}
      </ol>
      <p className="text-xs font-semibold">Winner: {cup.champion}</p>
    </div>
  );
}
