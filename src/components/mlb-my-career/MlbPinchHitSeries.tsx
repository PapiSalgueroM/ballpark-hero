import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MATCHUPS, newSeries, playAtBat, readSeries, SWINGS, type SeriesCard, type Swing } from '@/lib/mlbPinchHit';
import { safeSessionStorage } from '@/lib/safeStorage';
import type { UsCareerCore } from '@/lib/usCareerSport';

const storageKey = 'mlb-pinch-hit-series-v1';
const actionClass = 'min-h-11 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold hover:border-primary focus-visible:ring-2';
const primaryClass = 'min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:ring-2';

function restore(owner: string) {
  try {
    const raw = safeSessionStorage.getItem(storageKey);
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.owner === owner) return { ...readSeries(raw), open: saved.open === true };
  } catch { /* A new card can still be played when storage is unavailable. */ }
  return { ...newSeries(), open: false };
}

function Bases({ runners }: { runners: readonly number[] }) {
  return <div className="flex items-center gap-3">
    <span className="relative inline-block h-9 w-12 shrink-0" aria-hidden="true">
      {[3, 2, 1].map((base, index) => <span key={base} style={{ left: 4 + 13 * index, top: base === 2 ? 3 : 16 }}
        className={`absolute h-3 w-3 rotate-45 border ${runners.includes(base) ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />)}
    </span>
    <span>{runners.length === 3 ? 'Bases loaded' : runners.length === 1 ? 'Runner on third' : 'Runners on first and second'}</span>
  </div>;
}

export default function MlbPinchHitSeries({ career }: { career: UsCareerCore }) {
  if (career.pos === 'SP' || career.pos === 'RP') return null;
  const owner = JSON.stringify([career.name, career.pos, career.draftPick, career.summerSalt]);
  return <HitterSeries key={owner} owner={owner} />;
}

function HitterSeries({ owner }: { owner: string }) {
  const [card, setCard] = useState(() => restore(owner));
  const [storageWarning, setStorageWarning] = useState(false);
  const nextControl = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const index = card.atBats.length - 1;
  const matchup = MATCHUPS[index];
  const played = card.atBats.map((swings, i) => playAtBat(MATCHUPS[i], swings));
  const current = played[index];
  const rbi = played.reduce((sum, plate) => sum + plate.rbi, 0);
  const finished = index === MATCHUPS.length - 1 && !!current.outcome;

  function save(next: SeriesCard, open = true) {
    const state = { ...next, open };
    setCard(state);
    try {
      const encoded = JSON.stringify({ ...state, owner });
      safeSessionStorage.setItem(storageKey, encoded);
      setStorageWarning(window.sessionStorage.getItem(storageKey) !== encoded);
    } catch { setStorageWarning(true); }
  }

  function choose(swing: Swing) {
    if (current.outcome) return;
    const swings = [...card.atBats[index], swing];
    const atBats = [...card.atBats.slice(0, index), swings];
    const result = playAtBat(matchup, swings);
    const complete = index === MATCHUPS.length - 1 && !!result.outcome;
    save({ atBats, best: complete ? Math.max(card.best ?? 0, rbi + result.rbi) : card.best });
  }

  useEffect(() => {
    if (!card.open) return;
    if (finished) heading.current?.focus({ preventScroll: true });
    else if (current.outcome) nextControl.current?.focus({ preventScroll: true });
    else if (!current.log.length) heading.current?.focus({ preventScroll: true });
  }, [card.open, index, current.outcome, current.log.length, finished]);

  return <Dialog open={card.open} onOpenChange={open => save(card, open)}>
    <DialogTrigger asChild><button type="button" className={`${actionClass} mt-3 w-full`}>Pinch-Hit Series</button></DialogTrigger>
    <DialogContent data-mlb-pinch-hit="" className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-md gap-3 overflow-y-auto rounded-xl p-4 sm:p-5"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus(); }}>
      <DialogTitle>Pinch-Hit Series</DialogTitle>
      <DialogDescription>Drive in three runs across three practice at-bats. Each simulated pitcher repeats the same sequence on a replay. Official career stats stay separate.</DialogDescription>
      <details className="rounded-lg border border-border px-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">Rules and example</summary>
        <p className="pb-3">Take a ball or guess the pitch type for extra bases. Protecting can foul off a corner pitch, even with two strikes. Four balls earn a walk and three strikes end the at-bat. A single moves each runner one base, a double moves them two. For example, with one out and a runner on third, protecting against a high strike can score him on a sacrifice fly.</p>
      </details>
      {finished ? <section aria-label="Series scorecard" className="grid gap-2">
        <h3 className="text-xl font-black" tabIndex={-1} ref={heading}>{rbi >= 3 ? 'Series won' : 'Series complete'} · {rbi} RBI</h3>
        <p className="text-sm">Target 3 RBI · Best in this tab {card.best} RBI</p>
        <ol className="divide-y divide-border rounded-lg border border-border px-3">
          {played.map((plate, i) => <li className="py-2 text-sm" key={i}><b>{i + 1}. {MATCHUPS[i].title}</b><br />{plate.outcome} · {plate.rbi} RBI
            <span className="block text-xs text-muted-foreground">{plate.log[plate.log.length - 1]}</span></li>)}
        </ol>
        <button type="button" className={primaryClass} ref={nextControl} onClick={() => save({ ...newSeries(), best: card.best })}>Replay series</button>
      </section> : <section aria-label="Current at-bat" className="grid gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">At-bat {index + 1} of 3 · Series {rbi} RBI</p>
        <h3 ref={heading} tabIndex={-1} className="text-lg font-black">{matchup.title}</h3>
        <div className="flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-muted px-3 py-1 text-sm font-bold">
          <Bases runners={matchup.runners} /><span>{matchup.outs} {matchup.outs === 1 ? 'out' : 'outs'}</span>
        </div>
        <p className="text-sm"><b>Scout report.</b> {matchup.scout}</p>
        <div aria-live="polite" aria-atomic="true" className="rounded-lg border border-border p-2 text-sm">
          {!current.outcome && <p className="font-bold">Count {current.balls}-{current.strikes} · Pitch {current.log.length + 1}</p>}
          {current.log.length > 0 && <p>{current.log[current.log.length - 1]}</p>}
          {current.outcome && <p className="font-bold">{current.outcome} · {current.rbi} RBI</p>}
        </div>
        {current.outcome ? <button type="button" className={primaryClass} ref={nextControl}
          onClick={() => save({ ...card, atBats: [...card.atBats, []] })}>Next at-bat</button>
          : <div className="grid grid-cols-2 gap-2">{(Object.keys(SWINGS) as Swing[]).map(swing =>
            <button type="button" key={swing} className={actionClass} onClick={() => choose(swing)}>{SWINGS[swing]}</button>)}</div>}
      </section>}
      {storageWarning && <p role="status" className="text-xs">Your browser could not keep this card through a reload.</p>}
      <DialogClose asChild><button type="button" className={actionClass}>Back to career</button></DialogClose>
    </DialogContent>
  </Dialog>;
}
