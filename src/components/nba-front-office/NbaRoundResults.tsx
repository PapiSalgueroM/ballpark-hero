import { useState } from 'react';
import type { NbaRoundHistory, NbaRoundResult } from '@/lib/nbaRoundHistory';

export function NbaRoundResults({
  completed, history, lastRound,
}: {
  completed: number;
  history: NbaRoundHistory | null;
  lastRound: Pick<NbaRoundResult, 'round' | 'wins' | 'losses'> | null;
}) {
  const [selected, setSelected] = useState<{ latest: number; round: number } | null>(null);
  if (completed === 0) return null;
  const round = selected?.latest === completed ? selected.round : completed;
  const record = history?.rounds.find(row => row.round === round);
  const result = record ?? (lastRound?.round === round ? lastRound : null);

  return (
    <section aria-label="Round results" className="space-y-2 rounded-2xl border border-border bg-card p-3 text-left text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Round {round} results</h3>
        {completed > 1 && (
          <label className="flex items-center gap-2 text-muted-foreground">
            Played round
            <select className="min-h-[44px] rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              value={round} onChange={event => setSelected({ latest: completed, round: Number(event.target.value) })}>
              {Array.from({ length: completed }, (_, i) => completed - i).map(n => <option key={n} value={n}>Round {n}</option>)}
            </select>
          </label>
        )}
      </div>
      {result ? (
        <>
          <p className="font-medium">Won {result.wins} · Lost {result.losses}</p>
          <div className="rounded-lg border border-border/60 px-2 py-1.5">
            <h4 className="font-semibold">Rating changes</h4>
            {record?.changes?.length ? (
              <ul className="mt-1 flex max-h-24 flex-wrap gap-x-3 gap-y-1 overflow-y-auto text-muted-foreground">
                {record.changes.map(([name, delta, overall], i) => (
                  <li key={i}>{name} <span className="font-semibold text-foreground">{delta > 0 ? '+' : ''}{delta} OVR to {overall}</span></li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{record?.changes ? 'No rating changes this round.' : 'Rating changes are unavailable for this round.'}</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">Results and rating changes are unavailable for this round.</p>
      )}
    </section>
  );
}
