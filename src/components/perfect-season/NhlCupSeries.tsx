import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { safeLocalStorage } from '@/lib/safeStorage';
import { NHL_SLOTS } from '@/lib/perfectSeasonNhl';
import { callCupGame, cupBoard, cupGame, cupScout, CUP_PLANS, NHL_CUP_KEY, readCupRun, type CupPlan, type CupRun } from '@/lib/nhlCupSeries';

const read = () => safeLocalStorage.getItem(NHL_CUP_KEY);
const changed = 'nhl-cup-changed';
function subscribe(update: () => void) {
  const storage = (e: StorageEvent) => { if (!e.key || e.key === NHL_CUP_KEY) update(); };
  window.addEventListener('storage', storage);
  window.addEventListener(changed, update);
  return () => { window.removeEventListener('storage', storage); window.removeEventListener(changed, update); };
}
const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary';
const primary = 'min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50';
const plans = Object.keys(CUP_PLANS) as CupPlan[];

export function NhlCupSeries({ entry }: { entry?: CupRun | null }) {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const saved = useMemo(() => readCupRun(raw), [raw]);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<CupPlan | null>(null);
  const [doubleShift, setDoubleShift] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const report = useRef<HTMLParagraphElement>(null);
  const same = saved && (!entry || (saved.seed === entry.seed && saved.wins === entry.wins
    && NHL_SLOTS.every(({ key }) => saved.lineup[key].name === entry.lineup[key].name && saved.lineup[key].rating === entry.lineup[key].rating)));
  const run = same ? saved : entry;
  if (!run) return <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground">Finish any Classic or Hard season to coach your six in a best-of-five Cup series.</p>;
  const board = cupBoard(run);
  const i = run.calls.length;
  const scout = !board.finished && cupScout(run, i);
  const write = (next: CupRun) => {
    if (read() === raw) safeLocalStorage.setItem(NHL_CUP_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(changed));
    setPlan(null);
    setDoubleShift(false);
    requestAnimationFrame(() => report.current?.focus({ preventScroll: true }));
  };
  const play = () => {
    if (!plan) return;
    const next = callCupGame(run, { plan, doubleShift: doubleShift && !board.shiftUsed });
    if (next) write(next);
  };
  const last = board.games[i - 1];
  return <Dialog open={open} onOpenChange={value => { setOpen(value); setPlan(null); setDoubleShift(false); }}>
    <div className="my-3 text-center"><DialogTrigger asChild><button className={button} ref={opener}>
      {same ? board.finished ? 'Review Cup series' : 'Resume Cup series' : 'Coach the Cup series'}
    </button></DialogTrigger></div>
    <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-lg gap-3 overflow-y-auto p-4 sm:p-6"
      onCloseAutoFocus={e => { e.preventDefault(); opener.current?.focus({ preventScroll: true }); }}>
      <DialogTitle className="pr-7">Cup series</DialogTitle>
      <DialogDescription>Win three games against the {cupScout(run, 0).opponent.toLowerCase()}. Your regular season stays {run.wins}-{82 - run.wins}.</DialogDescription>
      <details className="text-sm" open={!same || undefined}>
        <summary className="cursor-pointer py-2 font-semibold">Cup rules and example</summary>
        <p>Read the scout before each game and call a team system. Your six draft ratings, their matchup and one game roll decide the result. You can double-shift the top line once per series. It helps now and tires your forwards for the next game.</p>
        <p className="mt-1">For example, if their wings break early, hold the blue line to cut off the rush. Save the extra shifts for a possible deciding game. Replay uses the same scouts and rolls.</p>
      </details>
      <details className="text-sm"><summary className="cursor-pointer py-2 font-semibold">Your drafted six</summary>
        <ul>{NHL_SLOTS.map(s => <li key={s.key}>{s.label} · {run.lineup[s.key].name} · {run.lineup[s.key].rating} OVR</li>)}</ul>
      </details>
      {!same ? <>
        {saved && <p className="text-sm">Starting with this lineup will replace your saved Cup series.</p>}
        <button className={primary} onClick={() => write(run)}>Start series with this lineup</button>
      </> : <>
        <p ref={report} tabIndex={-1} role="status" className="rounded-lg bg-secondary p-2 text-sm">
          <strong>{board.finished ? board.wins === 3 ? 'Cup won' : 'Series lost' : 'Series record'} · {board.wins}-{board.losses}</strong>
          {last && <> · Game {i} {last.won ? 'win' : 'loss'}. {CUP_PLANS[run.calls[i - 1].plan]} vs. {last.look.toLowerCase()} ({last.chance}% win chance).</>}
        </p>
        {scout && <div className="grid gap-2 text-sm">
          <h3 className="font-bold">Game {i + 1} scout · {scout.look}</h3><p>{scout.report}</p>
          <fieldset><legend className="font-semibold">Choose your system</legend>
            <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-3">{plans.map(p => <button key={p} type="button" aria-pressed={plan === p}
              className={button + (plan === p ? ' border-primary bg-primary/10' : '')} onClick={() => setPlan(p)}>
              {CUP_PLANS[p]} <span className="whitespace-nowrap text-xs">{cupGame(run, i, { plan: p, doubleShift: doubleShift && !board.shiftUsed }).chance}%</span>
            </button>)}</div>
          </fieldset>
          {board.shiftUsed ? <p className="text-xs text-muted-foreground">{run.calls[i - 1]?.doubleShift ? 'Your top line is tired this game after the double shift.' : 'Your top line has recovered. The double shift is spent.'}</p> :
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={doubleShift} onChange={e => setDoubleShift(e.target.checked)} />Double-shift the top line</label>}
          <button className={primary} disabled={!plan} onClick={play}>Play game {i + 1}</button>
        </div>}
        {i > 0 && <details className="text-sm"><summary className="cursor-pointer py-2 font-semibold">Series game log</summary>
          <ol>{board.games.map((g, n) => <li key={n}>Game {n + 1} · {g.won ? 'Win' : 'Loss'} · {CUP_PLANS[run.calls[n].plan]}{run.calls[n].doubleShift ? ' · Double shift' : g.tired ? ' · Tired forwards' : ''}</li>)}</ol>
        </details>}
        {board.finished && <button className={primary} onClick={() => write({ ...run, calls: [] })}>Replay this series</button>}
      </>}
      <button className={button} onClick={() => setOpen(false)}>Back to Perfect Season</button>
    </DialogContent>
  </Dialog>;
}
