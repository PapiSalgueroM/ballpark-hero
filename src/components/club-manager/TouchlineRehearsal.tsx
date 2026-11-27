import { useEffect, useMemo, useRef, useState } from 'react';
import { instructionsOf, type CareerState } from '@/lib/clubManager';
import { AI_STYLES, instructionsSummary, type TeamInstructions } from '@/lib/clubManagerTactics';
import { DUTY_INFO } from '@/lib/clubManagerUiInfo';
import { REHEARSAL_KEY, matchCalls, readRehearsal, rehearseSpell, rehearsalFixture, rehearsalScore, settingsFor, startRehearsal, type Brief, type MatchCall, type RehearsalRun } from '@/lib/clubManagerRehearsal';
import { safeLocalStorage } from '@/lib/safeStorage';

const action = 'min-h-11 rounded-lg border border-border px-3 py-2 text-left font-semibold hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary';
const calls: MatchCall[] = ['standing', 'counter', 'wide', 'squeeze'];
const callName = (call: MatchCall) => call === 'standing' ? 'Keep my instructions' : matchCalls[call].label;
function Rules() {
  return <div className="space-y-2 text-muted-foreground"><p>Take over at 60 minutes. Choose your instructions for 15 minutes, check the score at 75 and make your final call. Hold a lead to win or rescue at least a draw when chasing.</p>
    <p>Example: if they press high, try a direct outlet. Compare the expected goals (xG) you create with what you allow. A bigger number means more scoring threat, even if a spell ends goalless.</p>
    <p>The drill uses the match engine’s second-half scoring rates, your current eleven and their forecast style. Both sides keep eleven on the pitch. Replaying the draw keeps the rolls. Only applying a call changes your team instructions.</p></div>;
}
export default function TouchlineRehearsal({ career, onApply }: { career: CareerState; onApply: (settings: TeamInstructions, expected: CareerState) => void }) {
  const fixture = useMemo(() => rehearsalFixture(career), [career]);
  const [raw, setRaw] = useState(() => safeLocalStorage.getItem(REHEARSAL_KEY));
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const run = fixture && readRehearsal(raw, fixture.id);
  const turn = run?.calls.length ?? 0;
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (!event.key || event.key === REHEARSAL_KEY) setRaw(safeLocalStorage.getItem(REHEARSAL_KEY)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { if (run) heading.current?.focus(); }, [turn, !!run]);
  if (!fixture) return <p>Your next club fixture and eleven available starters are needed to rehearse.</p>;
  const style = AI_STYLES[fixture.style];
  function currentCheckpoint() {
    const current = safeLocalStorage.getItem(REHEARSAL_KEY);
    if (current !== raw) {
      setRaw(current); setNotice('The rehearsal changed in another tab. The latest call is shown.'); return false;
    }
    return true;
  }
  async function store(next: RehearsalRun) {
    let entered = false;
    function write() {
      entered = true;
      if (!currentCheckpoint()) return;
      const updated = JSON.stringify(next);
      safeLocalStorage.setItem(REHEARSAL_KEY, updated);
      setRaw(updated); setNotice('');
    }
    if (!navigator.locks) { write(); return; }
    try { await navigator.locks.request(REHEARSAL_KEY, write); }
    catch (error) { if (entered) throw error; write(); }
  }
  const begin = (brief: Brief) => store(startRehearsal(career, fixture, brief, Math.floor(Math.random() * 0x100000000)));
  const score = run && rehearsalScore(career, fixture, run);
  const baseline = run && turn === 2 && rehearsalScore(career, fixture, run, ['standing', 'standing']);
  const finalCall = run?.calls[1];
  const current = instructionsOf(career);
  const sameSettings = finalCall && run && JSON.stringify(current) === JSON.stringify(settingsFor(run, finalCall));
  return <section className="grid gap-3 text-sm">
    <div className="rounded-lg bg-muted p-3"><p className="font-semibold">{fixture.fx.opponent} · {style.label}</p><p>{style.blurb} {style.read}</p></div>
    {notice && <p role="status">{notice}</p>}
    {!run ? <><Rules/><button className={action} onClick={() => begin('protect')}>Protect a 1-0 lead</button>
      <button className={action} onClick={() => begin('chase')}>Chase a 1-0 deficit</button></> : score && <>
      <h3 ref={heading} tabIndex={-1} className="font-display text-lg font-bold">{turn === 2 ? 'Full time' : turn === 1 ? '75 minutes' : '60 minutes'} · {career.clubName} {score.mine} : {score.theirs} {fixture.fx.opponent}</h3>
      <p>{run.brief === 'protect' ? 'Objective: finish ahead.' : 'Objective: finish level or ahead.'}</p>
      <details><summary className="cursor-pointer py-2 font-semibold">Your eleven and instructions</summary>
        <p className="text-muted-foreground">{instructionsSummary(run.standing)}</p>
        <ul className="grid grid-cols-2 gap-x-2 text-xs">{fixture.xi.map(({ p, slot, duty }) => <li key={p.id}>{p.name} · {slot?.label ?? p.position} · {p.fitness}% fit{duty ? ' · ' + DUTY_INFO[duty].label : ''}</li>)}</ul>
      </details>
      {turn < 2 ? <><p>{turn === 1 ? 'First call: ' + callName(run.calls[0]) + '. Decide how to finish.' : 'Choose your first 15 minutes.'}</p>
        {calls.map(call => {
          const estimate = rehearseSpell(career, fixture, run, call, turn, score.mine, score.theirs);
          return <button className={action} key={call} onClick={() => store({ ...run, calls: [...run.calls, call] })}>
            {callName(call)}<span className="block text-xs font-normal text-muted-foreground">{call === 'standing' ? instructionsSummary(run.standing) : matchCalls[call].read}</span>
            <span className="block text-xs">{estimate.ownXg.toFixed(2)} xG for · {estimate.oppXg.toFixed(2)} against</span>
          </button>;
        })}</> : baseline && finalCall && <>
          <p data-cm-rehearsal-result className="font-semibold">{score.achieved ? 'Objective met.' : 'Objective missed.'} Your calls: {run.calls.map(callName).join(' / ')}.</p>
          <div className="rounded-lg border border-border p-3"><p>Your calls: {score.mine} to {score.theirs} ({score.ownXg.toFixed(2)} xG for, {score.oppXg.toFixed(2)} against).</p>
            <p>Standing instructions on the same rolls: {baseline.mine} to {baseline.theirs} ({baseline.ownXg.toFixed(2)} for, {baseline.oppXg.toFixed(2)} against).</p></div>
          {sameSettings ? <p role="status">Your final call is already set on the Tactics screen.</p>
            : <button className={action} onClick={() => { if (currentCheckpoint()) onApply(settingsFor(run, finalCall), career); }}>Apply final call to team instructions</button>}
          <button className={action} onClick={() => store({ ...run, calls: [] })}>Replay the same draw</button>
          <div className="grid grid-cols-2 gap-2"><button className={action} onClick={() => begin('protect')}>New lead to protect</button><button className={action} onClick={() => begin('chase')}>New deficit to chase</button></div>
        </>}
      <details><summary className="min-h-11 cursor-pointer py-2 font-semibold">? Rehearsal rules and example</summary><Rules/></details>
    </>}
  </section>;
}
