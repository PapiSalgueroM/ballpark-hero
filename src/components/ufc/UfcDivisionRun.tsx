import { useEffect, useMemo, useState } from 'react';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import { uniqueUfcFighters } from '@/data/ufcFighters';
import { getTodayET } from '@/lib/dateUtils';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import { compareUfcGuess } from '@/lib/ufcGameLogic';
import { DIVISION_LIMIT, DIVISION_RUN_KEY, DIVISION_TARGETS, divisionProgress, pickDivisionFighter, readDivisionRun, startDivisionRun, type DivisionRun } from '@/lib/ufcDivisionRun';
import { WEIGHT_CLASS_ORDER } from '@/types/ufc';
import { UfcFighterSearch } from './UfcFighterSearch';
import { UfcGameBoard } from './UfcGameBoard';

const action = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold';

function roundClues(run: DivisionRun, round: number, names: string[]) {
  const target = run.pool.find(f => f.name === run.targets[round])!;
  return names.map(name => compareUfcGuess(run.pool.find(f => f.name === name)!, target, run.date));
}

export default function UfcDivisionRun() {
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(DIVISION_RUN_KEY));
  const [message, setMessage] = useState('');
  const [choosing, setChoosing] = useState(false);
  const run = useMemo(() => readDivisionRun(raw), [raw]);
  const divisions = useMemo(() => WEIGHT_CLASS_ORDER.map(weight => ({ weight, count: uniqueUfcFighters.filter(f => f.weightClass === weight).length }))
    .filter(({ count }) => count >= DIVISION_TARGETS), []);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === DIVISION_RUN_KEY || e.key === null) {
        setRaw(safeLocalStorage.getItem(DIVISION_RUN_KEY)); setChoosing(false);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function save(next: DivisionRun | null) {
    if (!next || next === run) return;
    const current = safeLocalStorage.getItem(DIVISION_RUN_KEY);
    if (current !== raw) {
      setRaw(current); setChoosing(false); setMessage('Another tab updated this run. Your latest round is open.'); return;
    }
    const encoded = JSON.stringify(next);
    if (!safeSetItem(DIVISION_RUN_KEY, encoded)) { setMessage('Your browser could not save this move. Try again.'); return; }
    setRaw(encoded); setChoosing(false); setMessage('');
  }
  const progress = run && divisionProgress(run);
  const round = progress?.solved ?? 0;
  const names = progress?.rounds[round] ?? [];
  return <section aria-label="Division run" className="mx-auto space-y-4">
    {message && <p role="alert" className="text-center text-sm">{message}</p>}
    {!run || !progress || choosing ? <div className="mx-auto max-w-md space-y-3">
      <h2 className="text-center text-xl font-bold">Pick a division</h2>
      <p className="text-center text-sm text-muted-foreground">Find three different fighters in eight total guesses. If the first fighter takes two guesses, you have six for the next two.</p>
      <div className="grid grid-cols-2 gap-2">{divisions.map(({ weight, count }) =>
        <button key={weight} type="button" className={action} onClick={() => save(startDivisionRun(weight, getTodayET()))}>
          {weight}<span className="block text-xs font-normal text-muted-foreground">{count} fighters</span>
        </button>)}</div>
      {run && <button type="button" className={action} onClick={() => setChoosing(false)}>Back to result</button>}
    </div> : <>
      <header className="space-y-1 text-center" aria-live="polite">
        <h2 className="text-xl font-bold">{run.pool[0].weightClass} · {progress.finished
          ? round === DIVISION_TARGETS ? 'Division cleared' : 'Run complete' : 'Fighter ' + (round + 1) + ' of ' + DIVISION_TARGETS}</h2>
        <p className="text-sm">{round}/{DIVISION_TARGETS} found · {DIVISION_LIMIT - run.picks.length} {run.picks.length === DIVISION_LIMIT - 1 ? 'guess' : 'guesses'} left</p>
        {!progress.finished && round > 0 && <p className="text-xs text-muted-foreground">Last solve · {run.targets[round - 1]}</p>}
      </header>
      {progress.finished ? <div className="mx-auto max-w-md space-y-3">
        <ol className="divide-y divide-border rounded-xl border border-border px-3">{run.targets.map((name, i) => {
          const count = progress.rounds[i].length;
          return <li key={name} className="text-sm">
            {count ? <details>
              <summary className="min-h-11 cursor-pointer py-3"><strong>{name}</strong> · {i < round ? 'Found' : 'Missed'} in {count} {count === 1 ? 'guess' : 'guesses'}</summary>
              <ol className="space-y-1 pb-3 text-xs">{roundClues(run, i, progress.rounds[i]).map(guess =>
                <li key={guess.fighterName}>{guess.fighterName} · {Object.values(guess.cells).filter(cell => cell.status === 'correct').length}/9 exact clues</li>)}</ol>
            </details> : <p className="py-3"><strong>{name}</strong> · Unplayed</p>}
          </li>;
        })}</ol>
        <button type="button" className={action + ' w-full'} onClick={() => setChoosing(true)}>Play another division run</button>
      </div> : <>
        <UfcFighterSearch fighters={run.pool} guessedNames={[...run.targets.slice(0, round), ...names]}
          onSelect={fighter => save(pickDivisionFighter(run, fighter.name))} />
        <div className="flex justify-center"><GiveUpButton label="End division run" onGiveUp={() => save({ ...run, gaveUp: true })} /></div>
        <UfcGameBoard key={'clues-' + round} guesses={roundClues(run, round, names)} maxGuesses={names.length} />
      </>}
    </>}
  </section>;
}
