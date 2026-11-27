import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import {
  canPlaceDebut, debutRound, debutScore, gapLabel, newDebutRun, placeDebut, readDebutRun, replayDebuts,
  scoutDebut, scoutsLeft, TIMELINE_GOAL, TIMELINE_KEY, TIMELINE_ROUNDS, type DebutRun,
} from '@/lib/ufcDebutTimeline';

const action = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40';
const primary = action + ' bg-primary text-primary-foreground hover:bg-primary/90';

function Rules() {
  return <div className="space-y-2 text-sm text-muted-foreground">
    <p>Place five fighters by the year of their first UFC bout. Start with two dated fighters. Each answer adds another to the timeline, even if you miss.</p>
    <p>A correct placement earns 20 points. You have two scouts. Each rules out one side of the timeline and cuts that card to 10 points. A miss scores zero. Aim for {TIMELINE_GOAL} out of 100.</p>
    <p><strong>Example:</strong> With 2004 and 2011 on the board, a 2008 debut belongs between them. Every card in your draw has a different debut year.</p>
  </div>;
}

export default function UfcDebutTimeline() {
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(TIMELINE_KEY));
  const [notice, setNotice] = useState('');
  const run = useMemo(() => readDebutRun(raw), [raw]);
  const round = run && debutRound(run);
  const complete = run?.placements.length === TIMELINE_ROUNDS;
  const lastIndex = (run?.placements.length ?? 0) - 1;
  const last = run && lastIndex >= 0 ? debutRound(run, lastIndex) : null;
  const lastPick = run?.placements[lastIndex];
  const lastPoints = last && lastPick && lastPick.slot === last.answer ? (lastPick.scouted ? 10 : 20) : 0;
  useEffect(() => {
    function sync(e: StorageEvent) {
      if (!e.key || e.key === TIMELINE_KEY) setRaw(safeLocalStorage.getItem(TIMELINE_KEY));
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function save(next: DebutRun) {
    const current = safeLocalStorage.getItem(TIMELINE_KEY);
    if (current !== raw) {
      setRaw(current); setNotice('Another tab updated this timeline. Your latest round is open.'); return;
    }
    const value = JSON.stringify(next);
    safeSetItem(TIMELINE_KEY, value);
    setRaw(value); setNotice('');
  }

  return <Dialog>
    <DialogTrigger asChild><button type="button" className={action + ' mt-3'}>{complete ? 'Review debut timeline' : run ? 'Resume debut timeline' : 'UFC Debut Timeline'}</button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-md overflow-y-auto p-4 sm:p-6">
      <DialogTitle>UFC Debut Timeline</DialogTitle>
      <DialogDescription>Place fighters by their first UFC bout. This challenge is saved on this device.</DialogDescription>
      {!run || !round ? <>
        <Rules />
        <button className={primary} onClick={() => save(newDebutRun())}>Start timeline</button>
      </> : <>
        <details><summary className="cursor-pointer py-2 text-sm font-semibold">Rules and example</summary><Rules /></details>
        <div aria-live="polite" aria-atomic="true" className="space-y-1">
          {last?.card && <p className="text-sm">{lastPoints ? 'Correct.' : 'Miss.'} {last.card.name} debuted in {last.card.year}. +{lastPoints} points.</p>}
          {complete ? <h3 className="font-display text-xl font-bold">{debutScore(run) >= TIMELINE_GOAL ? 'Target reached' : 'Timeline complete'} · {debutScore(run)}/100</h3>
            : <><p className="text-xs text-muted-foreground">Card {run.placements.length + 1} of {TIMELINE_ROUNDS} · {debutScore(run)} points</p>
              <h3 className="font-display text-xl font-bold">When did {round.card!.name} debut?</h3></>}
        </div>
        <ol aria-label="Known UFC debuts" className="divide-y divide-border rounded-lg border border-border px-3 text-sm">
          {round.known.map(card => <li key={card.name} className="flex gap-3 py-1"><strong className="tabular-nums">{card.year}</strong><span>{card.name}</span></li>)}
        </ol>
        {complete ? <>
          {run.previous !== null && <p className="text-sm">Previous score on this draw: {run.previous}/100.</p>}
          <div className="grid gap-2 sm:grid-cols-2"><button className={primary} onClick={() => save(replayDebuts(run))}>Replay this timeline</button>
            <button className={action} onClick={() => save(newDebutRun())}>New timeline</button></div>
        </> : <>
          {run.scouting ? <p role="status" className="text-sm text-primary">Scout report: {round.card!.name} debuted {round.answer <= round.pivot ? 'before' : 'after'} {round.known[round.pivot].name}. A correct pick earns 10 points.</p>
            : <button className={action} disabled={scoutsLeft(run) === 0 || round.gaps.length < 2} onClick={() => save(scoutDebut(run))}>Use a scout <span className="font-normal">({scoutsLeft(run)} left)</span></button>}
          <div aria-label="Choose a debut gap" role="group" className="grid grid-cols-2 gap-2">
            {round.gaps.map(slot => <button key={slot} className={action} disabled={!canPlaceDebut(run, slot)}
              onClick={() => save(placeDebut(run, slot))}>{gapLabel(round.known, slot)}</button>)}
          </div>
        </>}
      </>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <DialogClose asChild><button className={action}>Back to UFC Guesser</button></DialogClose>
    </DialogContent>
  </Dialog>;
}
