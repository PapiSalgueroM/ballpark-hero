import { useRef, useState } from 'react';
import type { CareerState } from '@/lib/clubManager';
import type { LiveLineupRow } from '@/lib/clubManagerLiveLineups';
import { liveLineupsAt } from '@/lib/clubManagerLiveLineups';
import { minuteLabel } from '@/lib/clubManagerClock';

export function HalftimeLineups({ career, onBack }: { career: CareerState; onBack: () => void }) {
  const [side, setSide] = useState<'me' | 'opp'>('me');
  const mine = useRef<HTMLButtonElement>(null), theirs = useRef<HTMLButtonElement>(null);
  const view = liveLineupsAt(career, { minute: 45, plus: career.live?.added?.h1 ?? 0 });
  if (!view) return null;
  const team = view[side];
  const status = (row: LiveLineupRow) => [
    row.started ? 'Started' : 'On ' + minuteLabel(row.onAt),
    row.offAt ? 'Off ' + minuteLabel(row.offAt) : null,
    row.redAt ? 'Sent off ' + minuteLabel(row.redAt) : null,
    row.injuredAt ? 'Injured ' + minuteLabel(row.injuredAt) : null,
    row.yellows ? 'Yellow card' : null,
  ].filter(Boolean).join(' · ');
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">Back</button>
      <div className="bg-card border border-border rounded-xl p-3">
        <h2 className="text-sm font-bold text-foreground mb-2">Starting XIs</h2>
        <div role="tablist" aria-label="Starting XIs" className="grid grid-cols-2 gap-2 mb-3"
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault(); const next = side === 'me' ? 'opp' : 'me'; setSide(next);
            (next === 'me' ? mine : theirs).current?.focus();
          }}>
          <button ref={mine} type="button" role="tab" aria-selected={side === 'me'} aria-controls="cm-halftime-me" id="cm-halftime-me-tab"
            tabIndex={side === 'me' ? 0 : -1} onClick={() => setSide('me')}
            className={'rounded-lg border px-2 py-2 text-xs break-words ' + (side === 'me' ? 'border-primary text-primary' : 'border-border text-muted-foreground')}>{view.me.club}</button>
          <button ref={theirs} type="button" role="tab" aria-selected={side === 'opp'} aria-controls="cm-halftime-opp" id="cm-halftime-opp-tab"
            tabIndex={side === 'opp' ? 0 : -1} onClick={() => setSide('opp')}
            className={'rounded-lg border px-2 py-2 text-xs break-words ' + (side === 'opp' ? 'border-primary text-primary' : 'border-border text-muted-foreground')}>{view.opp.club}</button>
        </div>
        <div role="tabpanel" id={'cm-halftime-' + side} aria-labelledby={'cm-halftime-' + side + '-tab'} data-cm-halftime-team={side}>
          <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.8rem] gap-2 text-[10px] text-muted-foreground mb-1">
            <span>{team.club}</span><span className="text-right">OVR</span><span className="text-right">So far (provisional)</span>
          </div>
          {!team.available && <p className="text-xs text-muted-foreground py-3">A named starting XI was not recorded for this side.</p>}
          {team.available && team.rows.map(row => (
            <div key={row.key} data-cm-halftime-player={row.key} className="grid grid-cols-[minmax(0,1fr)_2.5rem_4.8rem] gap-2 items-start py-2 border-t border-border/40">
              <div className="min-w-0">
                <span data-cm-halftime-name className="block text-xs text-foreground break-words">{row.name}</span>
                <span className="block text-[10px] text-muted-foreground">{row.position ?? 'Position unavailable'}{row.generated ? ' · made up' : ''}</span>
                <span className="block text-[10px] text-muted-foreground">{status(row)}</span>
              </div>
              <span data-cm-halftime-ovr className="text-xs text-right text-muted-foreground">{row.ovr ?? '-'}</span>
              <span data-cm-halftime-grade className="text-sm font-bold text-right text-foreground"
                title={row.gradeReason === 'unavailable' ? 'Recorded match information is unavailable or ambiguous.' : row.gradeReason === 'not-played' ? 'No playing time at this clock.' : 'Provisional grade from the current score and recorded goals.'}>
                {row.grade === null ? row.gradeReason === 'not-played' ? 'NR' : '-' : row.grade.toFixed(1)}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-2">These are estimates from the score and recorded goals. Final grades are settled at full time. NR means no playing time yet.</p>
        </div>
      </div>
    </div>
  );
}
