import type { FightLine } from '@/lib/fightCareer';

function Scorecard({ rounds }: { rounds: NonNullable<FightLine['scorecard']> }) {
  const totals = rounds.reduce((sum, r) => ({
    playerScore: sum.playerScore + r.playerScore, oppScore: sum.oppScore + r.oppScore,
    playerLanded: sum.playerLanded + r.playerLanded, oppLanded: sum.oppLanded + r.oppLanded,
  }), { playerScore: 0, oppScore: 0, playerLanded: 0, oppLanded: 0 });
  return <table className="mb-3 w-full text-left text-sm tabular-nums">
    <caption className="pb-2 text-left text-xs text-muted-foreground">Your numbers appear first in each pair.</caption>
    <thead><tr><th scope="col">Round</th><th scope="col">Score</th><th scope="col">Punches landed</th></tr></thead>
    <tbody>{rounds.map(r => <tr key={r.round} className="border-t border-border">
      <th scope="row" className="py-1 font-normal">{r.round}</th><td>{r.playerScore}-{r.oppScore}</td><td>{r.playerLanded}-{r.oppLanded}</td>
    </tr>)}</tbody>
    <tfoot><tr className="border-t border-border font-semibold">
      <th scope="row">Total</th><td>{totals.playerScore}-{totals.oppScore}</td><td>{totals.playerLanded}-{totals.oppLanded}</td>
    </tr></tfoot>
  </table>;
}

export function FightRecord({ history }: { history: FightLine[] }) {
  if (!history.length) return null;
  return <details className="rounded-lg border bg-card px-3">
    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Fight record ({history.length})</summary>
    <ol className="pb-2 text-sm">{[...history].reverse().map(fight => {
      const label = <><strong>{fight.result}</strong> · {fight.opponent} · {fight.method}{fight.method === 'KO' || fight.method === 'TKO' ? ' R' + fight.round : ''}</>;
      return <li key={fight.no} className="border-t border-border">
        {Array.isArray(fight.scorecard) && fight.scorecard.length > 0 ? <details name="career-bout-card">
          <summary className="min-h-11 cursor-pointer py-3" aria-label={'Scorecard for bout ' + fight.no + ' against ' + fight.opponent}>{label}</summary>
          <Scorecard rounds={fight.scorecard} />
        </details> : <p className="py-2">{label}</p>}
      </li>;
    })}</ol>
  </details>;
}
