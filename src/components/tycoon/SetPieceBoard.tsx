import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { lehmer, takeShot, type Aim, type KickSetup, type ShotResult } from '@/lib/freeKick';
import { SetPieceScene } from '@/components/tycoon/SetPieceScene';

/** One shot. The parent owns the live match, deadline and goal commit. */
export default function SetPieceBoard({ kick, seed, onResult, onBack, expired = false }: {
  kick: KickSetup;
  seed: number;
  onResult: (scored: boolean) => 'accepted' | 'expired' | 'save-failed';
  onBack: () => void;
  expired?: boolean;
}) {
  const id = useId();
  const [aim, setAim] = useState<Aim>({ x: .65, y: .6, power: .65, curve: 0 });
  const [result, setResult] = useState<ShotResult | null>(null);
  const [resolution, setResolution] = useState<'accepted' | 'expired' | 'save-failed' | null>(null);
  const [help, setHelp] = useState(true);
  const struck = useRef(false);
  const shoot = () => {
    if (struck.current || expired) return;
    struck.current = true;
    const shot = takeShot(aim, kick, lehmer(seed));
    setResult(shot);
    setResolution(onResult(shot.scored));
  };
  const inputs: { key: keyof Aim; label: string; min: number; max: number; value: string }[] = [
    { key: 'x', label: 'Aim across', min: -1, max: 1, value: aim.x === 0 ? 'Centre' : `${Math.round(Math.abs(aim.x) * 100)}% ${aim.x < 0 ? 'left' : 'right'}` },
    { key: 'y', label: 'Aim height', min: 0, max: 1, value: `${Math.round(aim.y * 100)}%` },
    { key: 'power', label: 'Power', min: 0, max: 1, value: `${Math.round(aim.power * 100)}%` },
    { key: 'curve', label: 'Curve', min: -1, max: 1, value: aim.curve === 0 ? 'Straight' : `${Math.round(Math.abs(aim.curve) * 100)}% ${aim.curve < 0 ? 'left' : 'right'}` },
  ];
  return <section data-tycoon-set-piece data-no-prerender className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold">{kick.wallSize ? 'Free kick' : 'Penalty'}</h2>
        <p className="text-xs text-muted-foreground">{kick.label}</p>
      </div>
      <Button variant="outline" className="h-11 min-w-11" aria-label="Kick rules" aria-expanded={help}
        aria-controls={`${id}-help`} onClick={() => setHelp(value => !value)}>?</Button>
    </div>
    {help && <div id={`${id}-help`} className="rounded-xl border border-border bg-secondary/40 p-3 text-xs space-y-2">
      <p>Pick a spot, power and curve, then take your one shot. The match clock keeps running.</p>
      <p>A goal adds one to your team's score and pays the usual goal bonus. A miss, save or block costs nothing. This kick has no daily score or direct gem reward.</p>
      <p>Try 65% right, 60% height and 65% power with no curve. That aims inside the right post. The keeper can still save it, and harder shots can drift off target.</p>
    </div>}
    {result ? <>
      <SetPieceScene kick={kick} result={result} />
      {(resolution === 'expired' || expired && resolution === 'save-failed') && <p role="status" className="text-sm text-muted-foreground">The match ended before this kick could be added. Its score stays unchanged.</p>}
      {resolution === 'save-failed' && !expired && <div role="alert" className="space-y-2 text-sm">
        <p>This kick could not be saved, so it has not changed the match yet.</p>
        <Button variant="outline" className="h-11 w-full" onClick={() => setResolution(onResult(result.scored))}>Save this kick again</Button>
      </div>}
      <Button className="h-11 w-full" onClick={onBack}>Back to match</Button>
    </> : <>
      <svg viewBox="0 0 360 156" className="block w-full rounded-xl bg-[#164e56]" aria-hidden="true" focusable="false">
        <path d="M0 137H360M36 136V21H324V136" fill="none" stroke="#d8e7df" strokeWidth="3" />
        {[72, 108, 144, 180, 216, 252, 288].map(x => <path key={x} d={`M${x} 21V136`} stroke="#d8e7df" strokeOpacity=".15" />)}
        {[50, 79, 108].map(y => <path key={y} d={`M36 ${y}H324`} stroke="#d8e7df" strokeOpacity=".15" />)}
        <circle cx={180 + aim.x * 144} cy={136 - aim.y * 115} r="9" fill="none" stroke="#ffe4a0" strokeWidth="2" />
        <circle cx={180 + aim.x * 144} cy={136 - aim.y * 115} r="2" fill="#ffe4a0" />
      </svg>
      <fieldset disabled={expired} className="grid grid-cols-2 gap-x-4 gap-y-1">
        <legend className="sr-only">Shot controls</legend>
        {inputs.map(input => <label key={input.key} className="min-w-0 text-xs" htmlFor={`${id}-${input.key}`}>
          <span className="block font-semibold">{input.label}</span>
          <span className="block text-muted-foreground tabular-nums">{input.value}</span>
          <input id={`${id}-${input.key}`} type="range" min={input.min} max={input.max} step="0.01"
            value={aim[input.key]} aria-valuetext={input.value} className="h-11 w-full accent-primary"
            onChange={event => { const value = Number(event.currentTarget.value); setAim(current => ({ ...current, [input.key]: value })); }} />
        </label>)}
      </fieldset>
      {expired && <p role="status" className="text-sm text-muted-foreground">The match has ended. Your next chance comes in another watched match.</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1" onClick={onBack}>Back</Button>
        <Button className="h-11 flex-1" disabled={expired} onClick={shoot}>Take shot</Button>
      </div>
    </>}
  </section>;
}
