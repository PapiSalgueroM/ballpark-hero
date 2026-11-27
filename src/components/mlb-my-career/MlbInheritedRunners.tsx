import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ENTRIES, PITCH_CALLS, SCOUTS, freshCard, pitchOuting, restorePitchCard, type Outing, type PitchCall, type PitchCard } from '@/lib/mlbInheritedRunners';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';

const storageKey = 'dukb-mlb-inherited-runners-v1';
const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-bold hover:border-primary focus-visible:ring-2';
const primary = button + ' bg-primary text-primary-foreground';

function restore(owner: string) {
  try {
    const saved = JSON.parse(safeLocalStorage.getItem(storageKey) ?? 'null');
    if (saved?.owner === owner) return { card: restorePitchCard(saved.card), open: saved.open === true };
  } catch { /* A damaged scorecard can be played again. */ }
  return { card: freshCard(), open: false };
}

function occupied(bases: Outing['bases']) {
  const names = ['first', 'second', 'third'].filter((_, i) => bases[i]);
  return names.length === 3 ? 'Bases loaded' : names.length ? 'On ' + names.join(' and ') : 'Bases empty';
}

function Diamond({ bases }: { bases: Outing['bases'] }) {
  return <div className="flex items-center gap-2">
    <svg aria-hidden="true" width="52" height="44" viewBox="0 0 52 44" className="shrink-0">
      <path d="M26 37 L44 21 26 5 8 21 Z" fill="none" stroke="currentColor" opacity=".45" />
      {[[44, 21], [26, 5], [8, 21]].map(([x, y], i) =>
        <rect key={i} x={x - 4} y={y - 4} width="8" height="8" transform={`rotate(45 ${x} ${y})`}
          stroke="currentColor" className={bases[i] ? 'fill-primary' : 'fill-background'} />)}
      <path d="M22 35h8v3l-4 3-4-3z" fill="currentColor" />
    </svg><span>{occupied(bases)}</span>
  </div>;
}

function PitchTarget({ pitch }: { pitch: PitchCall }) {
  const [x, y] = pitch === 'fastball' ? [20, 7] : pitch === 'sinker' ? [11, 21] : [20, 29];
  return <svg aria-hidden="true" viewBox="0 0 32 34" width="30" height="32" className="shrink-0">
    <rect x="5" y="4" width="22" height="20" rx="2" stroke="currentColor" fill="none" opacity=".55" />
    <path d="M5 14h22M16 4v20" stroke="currentColor" opacity=".2" />
    <circle cx={x} cy={y} r="3.5" className="fill-primary" />
  </svg>;
}

export default function MlbInheritedRunners({ owner }: { owner: string }) {
  const [saved, setSaved] = useState(() => restore(owner));
  const [stored, setStored] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const index = saved.card.length - 1;
  const entry = ENTRIES[index];
  const innings = saved.card.map((pitches, i) => pitchOuting(ENTRIES[i], pitches));
  const outing = innings[index];
  const scout = SCOUTS[entry.batters[outing.batter % entry.batters.length]];
  const complete = index === ENTRIES.length - 1 && !!outing.result;
  const leads = innings.filter(inning => inning.result === 'Lead held').length;

  function save(card: PitchCard, open = true) {
    setSaved({ card, open });
    setStored(safeSetItem(storageKey, JSON.stringify({ owner, card, open })));
  }

  useEffect(() => {
    if (!saved.open) return;
    if (outing.result && !complete) next.current?.focus({ preventScroll: true });
    else if (!outing.log.length || complete) heading.current?.focus({ preventScroll: true });
  }, [saved.open, index, outing.result, outing.log.length, complete]);

  return <Dialog open={saved.open} onOpenChange={open => save(saved.card, open)}>
    <DialogTrigger asChild><button type="button" className={button + ' mt-3 w-full'}>Inherited Runners</button></DialogTrigger>
    <DialogContent data-mlb-inherited-runners="" className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-md gap-3 overflow-y-auto rounded-xl p-4 sm:p-5"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
      <DialogTitle>Inherited Runners</DialogTitle>
      <DialogDescription>Protect three one-run leads against simulated hitters. Get the third out before the tying run scores. Your official career line stays separate.</DialogDescription>
      <details className="rounded-lg border px-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-bold">Rules and example</summary>
        <div className="space-y-2 pb-3">
          <p>Runners and counts carry from pitch to pitch. Four balls walk the hitter and three strikes retire him. The same hitters and pitches produce the same results on a replay.</p>
          <p>Read the scout before calling a pitch. Repeat a fastball or sinker against the same batter and he times it for a double. A changeup below the zone is a ball unless the batter chases.</p>
          <p>For example, a low sinker to the pull hitter can start a double play. If the force at first makes the third out, a runner crossing home on the play cannot score.</p>
        </div>
      </details>
      {complete ? <section className="grid gap-2" aria-label="Bullpen scorecard">
        <h3 tabIndex={-1} ref={heading} className="text-xl font-black">{leads} of 3 leads held</h3>
        <ol className="divide-y rounded-lg border px-3">{innings.map((inning, i) => <li key={i} className="py-2 text-sm">
          <b>{ENTRIES[i].inning} · {inning.result}</b>
          <span className="block">Final drill score {ENTRIES[i].score[0]}-{ENTRIES[i].score[1] + inning.runs} · {inning.inheritedScored} inherited scored · {inning.strikeouts} K</span>
          <span className="block text-xs text-muted-foreground">{inning.log[inning.log.length - 1]}</span>
        </li>)}</ol>
        <button type="button" className={primary} onClick={() => save(freshCard())}>Replay the same innings</button>
      </section> : <section className="grid gap-2" aria-label="Pitching mound">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 tabIndex={-1} ref={heading} className="text-lg font-black">{entry.inning}</h3>
          <p className="text-sm font-bold">Your club {entry.score[0]} · Visitors {entry.score[1] + outing.runs}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 rounded-lg bg-muted px-3 py-1 text-sm font-semibold">
          <Diamond bases={outing.bases} /><span>{outing.outs} {outing.outs === 1 ? 'out' : 'outs'}</span>
        </div>
        {!outing.result && <p className="text-sm"><strong>{scout.name}.</strong> {scout.report}
          {index === 0 && !outing.log.length && ' With one out, a double play gets you out of this inning.'}</p>}
        <div aria-live="polite" aria-atomic="true" className="rounded-lg border p-2 text-sm">
          {outing.log.length > 0 && <p>{outing.log[outing.log.length - 1]}</p>}
          <p className="font-bold">{outing.result ?? `Count ${outing.balls}-${outing.strikes} · Pitch ${outing.log.length + 1}`}</p>
        </div>
        {outing.result ? <button type="button" ref={next} className={primary} onClick={() => save([...saved.card, []])}>Next inning</button>
          : <div className="grid grid-cols-3 gap-1.5">{(Object.keys(PITCH_CALLS) as PitchCall[]).map(pitch =>
            <button type="button" key={pitch} className={button + ' flex flex-col items-center justify-center px-1 leading-tight'}
              onClick={() => save([...saved.card.slice(0, index), [...saved.card[index], pitch]])}>
              <PitchTarget pitch={pitch} />{PITCH_CALLS[pitch]}
            </button>)}</div>}
      </section>}
      {!stored && <p role="status" className="text-xs">Your scorecard is available for this visit. This browser could not save it.</p>}
      <DialogClose asChild><button type="button" className={button}>Back to career</button></DialogClose>
    </DialogContent>
  </Dialog>;
}
