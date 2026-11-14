import type { NationsLeagueCampaign } from '@/lib/soccerNationsLeague';

export function NationsLeagueRun({ campaign }: { campaign: NationsLeagueCampaign }) {
  const { nation, table, matches, year, group, result, apps, goals, assists, champion, nextLeague } = campaign;
  return <section aria-label="Nations League campaign" className="space-y-3 text-xs">
    <div className="space-y-1">
      <h3 className="font-bold">{nation} · {year}/{String(year + 1).slice(-2)}</h3>
      <p>{result} · Group {group} · Next edition League {nextLeague}</p>
      <p className="text-muted-foreground">Simulated champion: {champion}</p>
      <p>{apps > 0 ? `Your campaign: ${apps} ${apps === 1 ? 'cap' : 'caps'}, ${goals} ${goals === 1 ? 'goal' : 'goals'}, ${assists} ${assists === 1 ? 'assist' : 'assists'}` : 'You did not appear in this edition.'}</p>
    </div>
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Nations League Group {group} standings</caption>
        <thead className="bg-muted/30">
          <tr><th scope="col" className="px-2 py-1">Team</th><th scope="col" className="p-1">P</th><th scope="col" className="p-1">GD</th><th scope="col" className="p-1">Pts</th></tr>
        </thead>
        <tbody>
          {table.map(row => <tr key={row.nation} className={row.nation === nation ? 'bg-primary/10 font-bold' : undefined}>
            <th scope="row" className="px-2 py-1 font-medium">{row.nation}</th><td className="p-1">{row.played}</td><td className="p-1">{row.gf - row.ga}</td><td className="p-1">{row.points}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <ol aria-label="Nations League matches" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {matches.map((match, i) => {
        const homeSide = match.home === nation;
        const home = match.homeGoals + (match.extraTime?.homeGoals ?? 0);
        const away = match.awayGoals + (match.extraTime?.awayGoals ?? 0);
        return <li key={i} className="rounded-lg bg-muted/25 px-2 py-1.5">
          <p className="text-[10px] text-muted-foreground">{match.stage}{match.leg ? ` · Leg ${match.leg}` : ''} · {match.venue}</p>
          <p className="break-words font-semibold">{homeSide ? match.away : match.home} · {homeSide ? home : away}-{homeSide ? away : home}</p>
          {match.extraTime && <p className="text-muted-foreground">After extra time</p>}
          {match.penalties && <p className="text-muted-foreground">{match.penalties} won on penalties</p>}
          {match.player && <p className="text-muted-foreground">You: {match.player.goals} G · {match.player.assists} A · {match.player.rating.toFixed(1)} rating</p>}
        </li>;
      })}
    </ol>
  </section>;
}

export function NationsLeagueHistory({ campaigns }: { campaigns: NationsLeagueCampaign[] }) {
  if (!campaigns.length) return null;
  return <details className="rounded-lg border border-border bg-muted/20 p-2" data-nations-league-history>
    <summary className="cursor-pointer text-xs font-bold">Nations League</summary>
    <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
      {campaigns.slice().reverse().map(campaign => <details key={campaign.year} className="rounded-lg border border-border px-2 py-1.5">
        <summary className="cursor-pointer text-xs font-semibold">{campaign.year}/{String(campaign.year + 1).slice(-2)} · {campaign.result}</summary>
        <div className="mt-2"><NationsLeagueRun campaign={campaign} /></div>
      </details>)}
    </div>
  </details>;
}
