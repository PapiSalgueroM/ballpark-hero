import { useState } from 'react';
import type { MmaBoutResult } from '@/lib/mmaPromotion';

const rows = [
  ['strikes', 'Landed strikes', 'strikesA', 'strikesB'],
  ['takedowns', 'Takedowns', 'takedownsA', 'takedownsB'],
  ['control', 'Ground control', 'controlA', 'controlB'],
  ['submissionAttempts', 'Submission attempts', 'submissionAttemptsA', 'submissionAttemptsB'],
  ['points', 'Round points', 'pointsA', 'pointsB'],
] as const;

export default function MmaBoutRecap({ bout, aName, bName, event }: { bout: MmaBoutResult; aName: string; bName: string; event: number }) {
  const [selectedRound, setSelectedRound] = useState<number | 'total'>('total');
  const played = selectedRound === 'total' ? bout.rounds : bout.rounds.filter(r => r.round === selectedRound);
  return <div data-mma-recap-bout={`${event}:${bout.aId}:${bout.bId}`} data-mma-recap-round={selectedRound} className="space-y-3">
    <div className="rounded-xl border bg-card p-3 text-sm">
      <p data-mma-recap-winner={bout.winnerId} className="font-semibold">{bout.winnerId === bout.aId ? aName : bName} wins</p>
      <p className="text-xs text-muted-foreground">{aName} vs {bName}</p>
      <p>{bout.method}, round {bout.round}/{bout.scheduledRounds}{bout.title ? ', title fight' : ''}</p>
    </div>
    <div role="group" aria-label="Bout rounds" className="grid grid-cols-3 gap-2">
      {(['total', ...bout.rounds.map(r => r.round)] as const).map(round => <button key={round} aria-pressed={selectedRound === round} className={`min-h-[44px] rounded-lg border px-2 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selectedRound === round ? 'border-primary bg-primary/10' : 'bg-card'}`} onClick={() => setSelectedRound(round)}>{round === 'total' ? 'All rounds' : `Round ${round}`}</button>)}
    </div>
    <div className="overflow-hidden rounded-xl border bg-card">
      <table className="w-full table-fixed text-xs">
        <caption className="sr-only">Event {event}, {selectedRound === 'total' ? 'all played rounds' : `round ${selectedRound}`} counters</caption>
        <thead><tr><th scope="col" className="w-[42%] p-2 text-left">Recorded stat</th><th scope="col" className="break-words p-2">{aName}</th><th scope="col" className="break-words p-2">{bName}</th></tr></thead>
        <tbody>{rows.map(([stat, label, aKey, bKey]) => <tr key={stat} className="border-t">
          <th scope="row" className="p-2 text-left font-medium">{label}</th>
          {([['a', aKey], ['b', bKey]] as const).map(([side, key]) => {
            const value = played.reduce((sum, r) => sum + r[key], 0);
            return <td key={side} data-mma-stat={stat} data-mma-side={side} data-value={value} className="p-2 text-center tabular-nums">{value}{stat === 'control' ? ' units' : ''}</td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground">Ground control uses recorded units, with 20 per takedown.</p>
    <p className="text-xs text-muted-foreground">Round points decide bouts that reach the final bell; an early finish ends the bout.</p>
  </div>;
}
