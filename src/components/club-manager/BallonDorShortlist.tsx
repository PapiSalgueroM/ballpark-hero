import { MadeUpTag } from '@/components/club-manager/SquadScreen';
import type { BallonDorCandidate, BallonDorEvidence } from '@/lib/clubManager';

function reason(evidence: BallonDorEvidence): string {
  if (evidence.kind === 'league-goals') {
    return `${evidence.goals} ${evidence.estimated ? 'estimated' : 'recorded'} league goals`;
  }
  if (evidence.kind === 'league-winner') return `${evidence.league} champion`;
  return `Champions League ${evidence.stage} (${evidence.kind === 'played-ucl' ? 'played campaign' : 'watched campaign'})`;
}

export function BallonDorShortlist({ rows }: { rows: BallonDorCandidate[] }) {
  return (
    <details className="rounded-xl border border-border bg-card p-3 text-left" data-cm-ballon-dor-shortlist>
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-bold">Ballon d'Or shortlist ({rows.length})</summary>
      <p className="mt-2 text-xs text-muted-foreground">
        The simulated ranking combines game ratings with completed team results and league goals. Game ratings help choose contenders where individual stats are missing. Champions League progress, league titles and the Golden Boot earn extra points.
      </p>
      <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm">
        {rows.map(row => (
          <li key={JSON.stringify([row.club, row.name])}>
            <div className="break-words">
              <span className="font-bold">{row.name}</span>{row.generated && <MadeUpTag className="ml-1" />} · {row.club}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.score} points{row.rating !== undefined && ` · Game rating ${row.rating}`} · {row.evidence.map(reason).join(' · ')}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
