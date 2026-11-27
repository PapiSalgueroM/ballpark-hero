import { useMemo, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { safeLocalStorage } from '@/lib/safeStorage';
import type { CollegeGridData } from '@/lib/collegeGrid';
import { SCOUT_KEY, dealScoutRun, placeScout, readScoutRun, reviewScoutRun, scoutFact, type ScoutRun, type ScoutFocus } from '@/lib/collegeGridScouting';
import type { GridPuzzle } from '@/types/footballGrid';

const changed = 'college-grid-scout-changed';
const read = () => safeLocalStorage.getItem(SCOUT_KEY);
function subscribe(refresh: () => void) {
  const storage = (e: StorageEvent) => { if (!e.key || e.key === SCOUT_KEY) refresh(); };
  window.addEventListener('storage', storage);
  window.addEventListener(changed, refresh);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(changed, refresh); };
}
const button = 'rounded-lg border border-border px-3 py-2.5 text-sm font-semibold hover:bg-muted';
const primary = 'rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50';

export function CollegeGridScouting({ puzzle, data, loadKey }: {
  puzzle: GridPuzzle; data: CollegeGridData | null; loadKey: () => Promise<CollegeGridData | null>;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const run = useMemo(() => readScoutRun(raw, puzzle.id), [raw, puzzle.id]);
  const schools = useMemo(() => puzzle.rows.map(r => r.label), [puzzle]);
  const review = useMemo(() => open && data && run ? reviewScoutRun(run, data, schools) : null, [open, data, run, schools]);
  const save = (next: ScoutRun) => {
    if (read() === raw) safeLocalStorage.setItem(SCOUT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
  };
  const deal = (focus: ScoutFocus) => {
    if (!data) return;
    const next = dealScoutRun(data, puzzle.id, schools, focus);
    if (next) { save(next); setMessage(''); }
    else setMessage('No verified deal is available for this room.');
  };
  const retry = async () => {
    setLoading(true);
    await loadKey();
    setLoading(false);
  };
  return (
    <div className="mt-4 text-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button" className={button} onClick={() => setMessage('')}>
            {run ? 'Open scouting challenge' : 'Play scouting challenge'}
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scouting challenge</DialogTitle>
            <DialogDescription>Fill three spots with three former players from one school. Each name plays once. You get two submissions and one scouting report.</DialogDescription>
          </DialogHeader>
          {!data && <div className="space-y-2 text-sm">
            <p>The player records are unavailable. Your picks and attempts are saved.</p>
            <button className={button} disabled={loading} onClick={() => void retry()}>{loading ? 'Loading records...' : 'Retry player records'}</button>
          </div>}
          {data && run && review && <>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-xs font-semibold text-muted-foreground">{run.focus === 'draft' ? 'Draft room' : 'Position room'}</p>
              <h3 className="font-display text-xl font-bold">{run.school}</h3>
              <p aria-live="polite">{review.finished ? (review.won ? 'Class signed! All 3 spots filled.' : 'Signing closed. See how the class fits below.')
                : run.tries.length ? <>Your last class matched {review.legal(run.tries[0])} of 3 labels. {review.correct(run.tries[0])} of 3 in place for a complete class. Rearrange for your last try.</>
                  : 'Find the one fit that fills all three spots.'}</p>
            </div>
            {review.finished ? <ul className="space-y-2 text-sm">
              {review.solution.map((n, i) => <li key={run.labels[i]} className="rounded-lg border border-border p-2">
                <span className="text-muted-foreground">{run.labels[i]}</span> · <strong>{run.names[n]}</strong><br />{scoutFact(review.players[n])}
              </li>)}
            </ul> : <>
              <div className="grid gap-2">{run.labels.map((label, i) => <label className="grid gap-1 text-sm font-semibold" key={label}>{label}
                <select className="min-w-0 rounded-lg border border-border bg-background p-2.5" value={run.slots[i]}
                  onChange={e => save({ ...run, slots: placeScout(run.slots, i, Number(e.target.value)) })}>
                  <option value={-1}>Choose a player</option>
                  {run.names.map((name, n) => <option key={name} value={n}>{name}</option>)}
                </select>
              </label>)}</div>
              {run.file === null ? <details className="text-sm">
                <summary className="cursor-pointer py-2 font-semibold">Open one scouting report</summary>
                <div className="mt-1 flex flex-wrap gap-2">{run.names.map((name, n) => <button key={name} className={button}
                  onClick={() => save({ ...run, file: n })}>{name}</button>)}</div>
              </details> : <p className="rounded-lg bg-muted p-2 text-sm"><strong>{run.names[run.file]}</strong> · {scoutFact(review.players[run.file])}</p>}
              <button className={primary} disabled={run.slots.includes(-1) || run.slots.every((n, i) => n === run.tries[0]?.[i])}
                onClick={() => save({ ...run, tries: [...run.tries, run.slots] })}>
                {run.tries.length ? 'Submit final class' : 'Submit class'}
              </button>
            </>}
          </>}
          {data && (!run || !review || review.finished) && <>
            {run && !review && <p className="text-sm">The records no longer verify that deal. Choose a fresh one.</p>}
            <p className="text-sm text-muted-foreground">Draft room tests pick order. Position room tests where players lined up. A first-rounder might also fit a position, so leave room for the specialist.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className={button} onClick={() => deal('draft')}>Deal draft room</button>
              <button className={button} onClick={() => deal('position')}>Deal position room</button>
            </div>
          </>}
          {message && <p role="status" className="text-sm">{message}</p>}
          <button className={button} onClick={() => setOpen(false)}>Back to daily grid</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
