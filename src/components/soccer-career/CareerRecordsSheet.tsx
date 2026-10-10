import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { careerRecordBook } from '@/lib/soccerCareerRecords';
import { formatNumber } from '@/lib/formatNumber';

const yearLabel = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
const button = 'min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-semibold';

function SeasonLine({ season }: { season: SeasonRecord }) {
  return <li className="rounded-xl border border-border p-3 text-sm" data-record-season={season.year}>
    <p className="font-bold">{yearLabel(season.year)} · {season.club}</p>
    {season.onLoanFrom && <p className="text-xs text-muted-foreground">On loan from {season.onLoanFrom}</p>}
    <p className="text-xs mt-1">{season.apps} apps · {season.goals} goals · {season.assists} assists · {season.cleanSheets} clean sheets</p>
    <p className="text-xs text-muted-foreground">Rating {season.apps > 0 ? season.rating.toFixed(1) : 'not recorded'}{season.ovr !== undefined ? ` · OVR ${season.ovr}` : ''}</p>
  </li>;
}

export default function CareerRecordsSheet({ career, onClose }: { career: CareerState; onClose: () => void }) {
  const [screen, setScreen] = useState<'records' | 'clubs' | 'help'>('records');
  const [selected, setSelected] = useState<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const book = careerRecordBook(career);
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, []);
  useEffect(() => { panel.current?.focus({ preventScroll: true }); }, [screen, selected]);
  const back = () => setSelected(null);
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); if (selected !== null) back(); else onClose(); }
    if (event.key !== 'Tab') return;
    const stops = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const first = stops[0], last = stops[stops.length - 1];
    if (!first) return;
    const at = document.activeElement;
    if (at === panel.current || (event.shiftKey ? at === first : at === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
  };
  const detail = selected === null ? null : screen === 'clubs' ? book.stints[selected]?.rows : [book.rows.find(r => r.index === selected)].filter((r): r is NonNullable<typeof r> => !!r);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3" data-career-records onKeyDown={keyDown}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Your career record book" className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card outline-none">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <h2 className="text-lg font-bold">📖 Your record book</h2>
        <button type="button" aria-label="Record book help" className={`${button} min-w-11`} onClick={() => { setSelected(null); setScreen('help'); }}>?</button>
      </div>
      <div className="min-h-0 overflow-y-auto p-4 space-y-3">
        {detail ? <ul className="space-y-2">{detail.map(r => <SeasonLine key={r.index} season={r.season} />)}</ul> : screen === 'help' ? <>
          <p className="text-sm">This is your simulated career, read from saved senior club seasons. Academy years and jobs after retirement stay out.</p>
          <p className="text-sm">Best rating needs at least 10 appearances. Ties keep the earliest season. Returning to a club starts another spell, and loans name the parent club.</p>
          <p className="text-sm">Example: 12 goals in one season and 15 the next gives a best of 15, with 27 goals across that club spell.</p>
          <p className="text-sm">Goals and appearances can keep growing. Season rating stops at 10.0 and player overall stops at 99.</p>
        </> : screen === 'records' ? <>
          <div className="grid grid-cols-3 gap-2 text-center text-sm" data-record-totals>
            {(['apps', career.position === 'GK' ? 'cleanSheets' : 'goals', 'assists'] as const).map(stat => <div key={stat} className="rounded-xl bg-muted/25 p-3"><p className="font-bold">{formatNumber(book.totals[stat])}</p><p className="text-xs text-muted-foreground">{stat === 'apps' ? 'Appearances' : stat === 'cleanSheets' ? 'Clean sheets' : stat === 'goals' ? 'Goals' : 'Assists'}</p></div>)}
          </div>
          <p className="text-xs text-muted-foreground">Senior club seasons only, so these totals leave out academy years that Career Stats counts. Personal bests across all club competitions. Tap one for its season.</p>
          {book.bests.length ? book.bests.map(best => <button key={best.label} type="button" data-career-best={best.label} className={`${button} w-full text-left`} onClick={() => setSelected(best.index)}>
            <span className="flex justify-between gap-3"><span>{best.label}</span><span>{best.label === 'Best season rating' ? best.value.toFixed(1) : formatNumber(best.value)}</span></span>
            <span className="block text-xs font-normal text-muted-foreground">{yearLabel(best.season.year)} · {best.season.club}{best.ties > 1 ? ` · tied in ${best.ties} seasons` : ''}</span>
          </button>) : <p className="text-sm">Your first senior appearances will start your records.</p>}
        </> : <>
          <p className="text-xs text-muted-foreground">Oldest to newest. Each spell keeps the seasons played there.</p>
          {book.stints.map((stint, index) => <button key={index} type="button" data-record-stint={index} className={`${button} w-full text-left`} onClick={() => setSelected(index)}>
            <span className="block">{stint.club}</span>
            <span className="block text-xs font-normal text-muted-foreground">{yearLabel(stint.firstYear)}{stint.lastYear !== stint.firstYear ? ` to ${yearLabel(stint.lastYear)}` : ''}{stint.parent ? ` · loan from ${stint.parent}` : ''}</span>
            <span className="block text-xs mt-1">{stint.apps} apps · {career.position === 'GK' ? `${stint.cleanSheets} clean sheets` : `${stint.goals} goals`} · {stint.assists} assists</span>
          </button>)}
        </>}
      </div>
      <div className="shrink-0 flex flex-wrap gap-2 border-t border-border p-3">
        {selected !== null ? <button type="button" className={button} onClick={back}>← Back</button> : <>
          <button type="button" className={`${button} ${screen === 'records' ? 'border-primary bg-primary/15 text-primary' : ''}`} aria-pressed={screen === 'records'} onClick={() => setScreen('records')}>Personal bests</button>
          <button type="button" className={`${button} ${screen === 'clubs' ? 'border-primary bg-primary/15 text-primary' : ''}`} aria-pressed={screen === 'clubs'} onClick={() => setScreen('clubs')}>Club history</button>
        </>}
        <button type="button" className={`${button} ml-auto`} onClick={onClose}>Close</button>
      </div>
    </div>
  </div>;
}