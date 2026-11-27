import { useMemo, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { safeLocalStorage } from '@/lib/safeStorage';
import {
  exhibitionResults, exhibitionScout, readExhibition, SERIES_KEY,
  type ExhibitionCall, type ExhibitionPlayer, type ExhibitionSeries,
} from '@/lib/nbaStartingFiveExhibition';
import type { NbaPosition } from '@/types/nba';

const changed = 'nba-five-exhibition-changed';
const read = () => safeLocalStorage.getItem(SERIES_KEY);
function subscribe(update: () => void) {
  function onStorage(e: StorageEvent) { if (e.key === SERIES_KEY || e.key === null) update(); }
  window.addEventListener('storage', onStorage);
  window.addEventListener(changed, update);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(changed, update);
  };
}

const primary = 'rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground';
const secondary = 'rounded-lg border border-border px-4 py-3 font-semibold';

export function NbaExhibition({ five }: { five?: ExhibitionPlayer[] | null }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const saved = useMemo(() => readExhibition(raw), [raw]);
  const [open, setOpen] = useState(false);
  const [replace, setReplace] = useState(false);
  const [lead, setLead] = useState<NbaPosition>('PG');
  const [action, setAction] = useState<ExhibitionCall['action']>('keep');
  const sameFive = five && saved && five.every(p => saved.five.some(s => s.role === p.role && s.name === p.name &&
    s.ppg === p.ppg && s.apg === p.apg && s.rpg === p.rpg));

  const write = (series: ExhibitionSeries) => {
    if (read() === raw) safeLocalStorage.setItem(SERIES_KEY, JSON.stringify(series));
    window.dispatchEvent(new Event(changed));
  };

  const start = (roster: ExhibitionPlayer[]) => {
    write({ five: roster, seed: Math.floor(Math.random() * 0x100000000), calls: [] });
    setLead('PG');
    setAction('keep');
    setReplace(false);
    setOpen(true);
  };

  const result = saved && exhibitionResults(saved);
  const scout = saved && exhibitionScout(saved, saved.calls.length);
  const last = result?.games.at(-1);
  if (!saved && five === undefined) return null;

  return (
    <section className="mx-auto mb-4 max-w-xl space-y-2 rounded-xl border border-border bg-card p-4 text-center">
      <h2 className="font-display text-lg font-bold">Best-of-three exhibition</h2>
      <p className="text-sm text-muted-foreground">
        {five === null ? 'This five needs career points, assists and rebounds for every starter to enter.' :
          'Coach your five through 12 half-court possessions per game. First to two wins takes the series.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {saved && <button className={secondary} onClick={() => setOpen(true)}>
          {result?.complete ? 'Review exhibition' : 'Resume exhibition'}
        </button>}
        {five && !sameFive && <button className={primary} onClick={() => {
          if (saved && !result?.complete && !replace) { setReplace(true); return; }
          start(five);
        }}>{replace ? 'Replace saved series with this five' : 'Coach this five'}</button>}
        {replace && <button className={secondary} onClick={() => setReplace(false)}>Keep saved series</button>}
      </div>
      <Dialog open={open && !!saved} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1.25rem)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exhibition series</DialogTitle>
            <DialogDescription>First to two wins. These simulated games score separately from your stats puzzle.</DialogDescription>
          </DialogHeader>
          {saved && result && scout && <>
            <p className="font-bold" aria-live="polite">{result.complete ? (result.wins === 2 ? 'Series won' : 'Series lost') : 'Series score'} · {result.wins} to {result.losses}</p>
            {last && <div className="rounded-lg border border-border p-3 text-sm">
              <strong>Game {result.games.length} · {last.won ? 'Win' : 'Loss'} · {last.points} to {last.target}</strong>
              <p>{last.shots.map(s => s.role + ' ' + s.makes + '/' + s.attempts).join(' · ')}</p>
              <p className="text-muted-foreground">Makes / first shots. {last.putback ? 'A second-chance basket added 2 points.' : 'No second-chance basket.'}</p>
            </div>}
            {result.complete ? <>
              <ol className="space-y-1 text-sm">{result.games.map((g, i) => <li key={i}>
                Game {i + 1} · {g.won ? 'Win' : 'Loss'} · {g.points} to {g.target} · {saved.calls[i].lead} · {saved.calls[i].action === 'keep' ? 'Keep the ball' : 'Hit the cutters'}
              </li>)}</ol>
              <button className={primary} onClick={() => start(saved.five)}>Play a new series</button>
            </> : <>
              <div className="rounded-lg bg-muted p-3 text-sm">
                <strong>Game {result.games.length + 1} scouting report</strong>
                <p>{scout.trap ? 'They trap the ball handler. Cutters have room behind the trap.' : 'They drop toward the rim. The ball handler has space for a pull-up.'} Beat {scout.target} points in 12 trips.</p>
                {scout.watched && <p>Extra pressure on your last ball handler ({scout.watched}).</p>}
              </div>
              <label className="grid gap-1 text-sm font-semibold">Ball handler
                <select value={lead} onChange={e => setLead(e.target.value as NbaPosition)} className="w-full rounded-lg border border-border bg-background p-3">
                  {saved.five.map(p => <option key={p.role} value={p.role}>{p.role} · {p.name} · {p.ppg} PPG / {p.apg} APG</option>)}
                </select>
              </label>
              <fieldset className="grid gap-2 text-sm">
                <legend className="mb-1 font-semibold">Offensive call</legend>
                {(['keep', 'pass'] as const).map(a => <label key={a} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
                  <input type="radio" name="exhibition-action" checked={action === a} onChange={() => setAction(a)} />
                  <span><strong>{a === 'keep' ? 'Keep the ball' : 'Hit the cutters'}</strong><br />
                    {a === 'keep' ? 'Ball handler takes 8 shots. Teammates get 1 each.' : 'Ball handler takes 4 shots. Teammates get 2 each.'}</span>
                </label>)}
              </fieldset>
              <button className={primary} onClick={() => write({ ...saved, calls: [...saved.calls, { lead, action }] })}>Play game {result.games.length + 1}</button>
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer py-1 font-semibold">How the exhibition works</summary>
                <p>Career points per game guide each finisher. Your handler's assists help teammates convert, and team rebounding can earn one putback. For example, against a trap, give a good passer the ball and hit the cutters. Next game, their defense adjusts to your call.</p>
              </details>
            </>}
            <button className={secondary} onClick={() => setOpen(false)}>Back to Starting 5</button>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}
