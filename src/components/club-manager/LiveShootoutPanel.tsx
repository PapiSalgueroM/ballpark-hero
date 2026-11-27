import { useEffect, useRef, useState } from 'react';
import { livePenaltyProgress, shootoutKickChance, type CareerState } from '@/lib/clubManager';
import { ShootoutKicks } from './ShootoutKicks';

export function LiveShootoutPanel({ career, onKick, onFinish }: {
  career: CareerState; onKick: (id: string) => boolean; onFinish: () => void;
}) {
  const [help, setHelp] = useState(false);
  const [pick, setPick] = useState('');
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const run = livePenaltyProgress(career);
  const opponent = career.live!.opponent;
  const selected = run?.options.find(p => p.id === pick) ?? run?.options[0];
  const own = run?.kicks.filter(k => k.side === 'me') ?? [];
  const lastOwn = own[own.length - 1];
  const latest = run && lastOwn ? run.kicks.slice(run.kicks.indexOf(lastOwn)) : run?.kicks ?? [];
  return <section aria-labelledby="live-pens-title" className="mx-auto max-w-md min-w-0 space-y-3 rounded-xl border border-border bg-card p-3">
    <header className="flex items-center justify-between gap-2">
      <h1 id="live-pens-title" ref={heading} tabIndex={-1} className="text-lg font-black">Penalty shootout</h1>
      <button type="button" className="min-h-11 min-w-11 rounded-lg border border-border" aria-label="Shootout rules" aria-expanded={help} onClick={() => setHelp(!help)}>?</button>
    </header>
    <p className="text-sm">Five kicks each, then sudden death if level. Only the players who finished the match can take one. Save your striker for the fifth kick or send him up first.</p>
    {help && <p className="rounded-lg bg-secondary/40 p-3 text-sm">The shootout ends early if one side is out of reach. Everyone takes one before anyone goes again. In sudden death, each pair can win it. Taker and opposing keeper ratings affect the chance. Delegate to let the coach finish from this score using your eligible takers.</p>}
    {run ? <>
      <div role="status" className="rounded-lg bg-secondary/40 p-3">
        <p className="font-bold">{career.clubName} {run.mine} - {run.theirs} {opponent}</p>
        {latest.map(k => <p key={k.side} className="text-sm">{k.taker}{k.gen ? ' (generated)' : ''} {k.result === 'saved' ? 'had a penalty saved' : k.result}.</p>)}
        <p className="text-sm font-bold">{run.done ? run.mine > run.theirs ? 'You win the shootout.' : 'The other side wins the shootout.'
          : own.length >= 5 ? `Sudden death. Your kick ${own.length + 1}.` : `Your kick ${own.length + 1} of 5.`}</p>
      </div>
      {run.done ? <button type="button" className="min-h-11 w-full rounded-lg bg-primary font-bold text-primary-foreground" onClick={onFinish}>Finish the match</button> : <>
        <label className="block text-sm font-bold">Next penalty taker
          <select className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-2" value={selected?.id} onChange={e => setPick(e.target.value)}>
            {run.options.map(p => <option key={p.id} value={p.id}>{p.name}{p.generated ? ' (generated)' : ''} · {p.position} · {p.rating}</option>)}
          </select>
        </label>
        {selected && <p className="text-sm">{selected.name} has a {Math.round(100 * shootoutKickChance(selected, run.keeperRating))}% chance to score this kick in the simulation.</p>}
        <button type="button" className="min-h-11 w-full rounded-lg bg-primary font-bold text-primary-foreground" onClick={() => {
          if (selected && onKick(selected.id)) { setError(''); setPick(''); }
          else setError('Could not save the kick. Check the save notice and try again.');
        }}>Take penalty</button>
        <button type="button" className="min-h-11 w-full rounded-lg border border-border font-bold" onClick={onFinish}>Delegate remaining kicks</button>
      </>}
      {!!run.kicks.length && <details><summary className="min-h-11 cursor-pointer py-2 font-bold">Kick record</summary>
        <ShootoutKicks clubName={career.clubName} opponent={opponent} shootout={{ mine: run.mine, theirs: run.theirs, kicks: run.kicks }} />
      </details>}
    </> : <><p>This saved kick list could not be read. The coach can settle the tie using the regular shootout.</p>
      <button className="min-h-11 w-full rounded-lg border border-border font-bold" onClick={onFinish}>Delegate shootout</button></>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
