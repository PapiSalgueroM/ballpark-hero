import { useEffect, useMemo, useRef, useState } from 'react';
import { shootoutKickChance, shootoutOrderOf, type CareerState } from '@/lib/clubManager';
import { activeSlot } from '@/lib/clubManagerSlots';
import { beginPenalties, PENALTY_ROOM_KEY, penaltyFixture, penaltyScore, readPenaltyRun, type PenaltyRun } from '@/lib/clubManagerPenaltyRoom';
import { safeLocalStorage } from '@/lib/safeStorage';

const button = 'min-h-11 rounded-lg border border-border px-3 py-2 font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary';

function Rules() {
  return <div className="space-y-2 rounded-lg border p-3 text-xs leading-relaxed">
    <p>Win a shootout against the projected opposition. Send one starter up at a time. Each side gets five kicks, ending early when one cannot catch the other. A tie goes to sudden death. After all eleven kick, the order repeats.</p>
    <p>Check each player's chance against their keeper. If you trail 3 to 2 with one kick each left and you shoot first, a miss ends it. A goal makes their last taker beat your keeper.</p>
    <p>Replay keeps the draws for both sides. Applying your list sets the order for future competitive shootouts. Players off the pitch at the whistle are skipped.</p>
  </div>;
}

export default function PenaltyRoom({ career, onApply }: { career: CareerState; onApply: (ids: string[], expected: CareerState) => void }) {
  const fixture = useMemo(() => penaltyFixture(career), [career]);
  const [key] = useState(() => PENALTY_ROOM_KEY + ':' + activeSlot());
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(key));
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const run = fixture && readPenaltyRun(raw, fixture);
  const score = fixture && run && penaltyScore(fixture, run);

  useEffect(() => {
    function sync(event: StorageEvent) {
      if (!event.key || event.key === key) setRaw(safeLocalStorage.getItem(key));
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [key]);
  useEffect(() => { if (run) heading.current?.focus({ preventScroll: true }); }, [run?.picks.length, run?.draw]);
  if (!fixture) return <p>Your next fixture and eleven available starters are needed to train.</p>;
  function current() {
    const latest = safeLocalStorage.getItem(key);
    if (latest === raw) return true;
    setRaw(latest);
    setNotice('Another tab changed this shootout. Its latest score is shown.');
    return false;
  }
  async function save(next: PenaltyRun) {
    const write = () => {
      if (!current()) return;
      const updated = JSON.stringify(next);
      safeLocalStorage.setItem(key, updated);
      setRaw(updated); setNotice(''); setHelp(false);
    };
    if (!navigator.locks) { write(); return; }
    let entered = false;
    try { await navigator.locks.request(key, () => { entered = true; write(); }); }
    catch (error) { if (entered) throw error; write(); }
  }
  const start = (late: boolean) => save(beginPenalties(fixture, crypto.getRandomValues(new Uint32Array(1))[0], late));
  const applied = run && JSON.stringify(shootoutOrderOf(career)) === JSON.stringify(run.picks);
  const comparison = score?.done && run ? penaltyScore(fixture, run, true) : null;
  const lastKicks = score?.kicks.slice(-2);
  return <section className="grid gap-3 text-sm" data-cm-penalty-room>
    {notice && <p role="status">{notice}</p>}
    {!run || !score ? <>
      <Rules/>
      <button type="button" className={button} onClick={() => start(false)}>Call every kick</button>
      <button type="button" className={button} onClick={() => start(true)}>Take over after two takers</button>
    </> : <>
      <div className="rounded-xl border bg-muted/25 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 ref={heading} tabIndex={-1} className="font-display text-lg font-bold" data-penalty-score>{career.clubName} {score.mine} : {score.theirs} {fixture.opponent}</h3>
          <button type="button" className={button} aria-label="Penalty Room rules" aria-expanded={help} onClick={() => setHelp(!help)}>?</button>
        </div>
        <p className="text-xs font-semibold">{score.done ? score.mine > score.theirs ? 'Shootout won' : 'Shootout lost' : run.picks.length >= 5 ? 'Sudden death' : 'Best of five'}</p>
        {lastKicks?.map((kick, i) => <p key={i} className="mt-1 text-xs">{kick.side === 'me' ? 'Us' : 'Them'} · {kick.taker}{kick.gen ? ' (generated)' : ''} · {kick.result}</p>)}
      </div>
      {help && <Rules/>}
      {!score.done ? <>
        <p className="font-semibold">Choose taker {run.picks.length + 1}</p>
        <div className="grid grid-cols-2 gap-2">{fixture.players.filter(p => !run.picks.includes(p.id)).map(p =>
          <button type="button" className={button + ' min-w-0 text-left'} key={p.id} data-penalty-taker={p.id} onClick={() => save({ ...run, picks: [...run.picks, p.id] })}>
            <span className="block break-words">{p.name}</span><span className="text-xs font-normal text-muted-foreground">{p.position} · {Math.round(100 * shootoutKickChance(p, fixture.theirs.keeperRating))}% to score</span>
          </button>)}</div>
      </> : comparison && <>
        <p>With the reference order on the same rolls, {career.clubName} {comparison.mine} : {comparison.theirs} {fixture.opponent}.</p>
        {applied ? <p role="status">Your match shootout order is set.</p> :
          <button type="button" className={button} onClick={() => { if (current()) onApply(run.picks, career); }}>Use these takers in competitive shootouts</button>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={button} onClick={() => save({ ...run, picks: run.late ? run.baseline.slice(0, 2) : [] })}>Replay same draw</button>
          <button type="button" className={button} onClick={() => start(false)}>New full shootout</button>
        </div>
        <button type="button" className={button} onClick={() => start(true)}>Take over after two takers on a new draw</button>
      </>}
      <details><summary className="cursor-pointer py-2 font-semibold">Kick history ({score.kicks.length})</summary>
        <ol className="space-y-1 text-xs">{score.kicks.map((k, i) => <li key={i}>{k.mine} : {k.theirs} · {k.side === 'me' ? career.clubName : fixture.opponent} · {k.taker}{k.gen ? ' (generated)' : ''} · {k.result}</li>)}</ol>
      </details>
    </>}
  </section>;
}
