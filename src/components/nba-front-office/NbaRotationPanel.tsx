import { useEffect, useId, useRef, useState } from 'react';
import { nbaStrength, type NbaGmTeam } from '@/lib/nbaFrontOffice';
import { nbaRotationSlots, nbaRotationPreferences, NBA_ROTATION_MINUTES } from '@/lib/nbaRotation';

interface Props {
  team: NbaGmTeam;
  onPick: (slot: number, playerId: string) => boolean;
  onAuto: () => boolean;
  onBack: () => void;
}

export function NbaRotationPanel({ team, onPick, onAuto, onBack }: Props) {
  const labelId = useId();
  const back = useRef<HTMLButtonElement>(null);
  const [change, setChange] = useState<{ n: number; text: string } | null>(null);
  const preferred = nbaRotationPreferences(team);
  const playing = nbaRotationSlots(team);
  const roster = [...team.players].sort((a, b) => b.ovr - a.ovr);

  useEffect(() => { back.current?.focus({ preventScroll: true }); }, []);

  const pick = (slot: number, id: string) => {
    const player = roster.find(p => p.id === id);
    if (!player || !onPick(slot, id)) return;
    const role = slot < 5 ? `Starter ${slot + 1}` : `Bench ${slot - 4}`;
    setChange(prev => ({ n: (prev?.n ?? 0) + 1, text: `${role}: ${player.name}. Rotation updated.` }));
  };

  const auto = () => {
    if (onAuto()) setChange(prev => ({ n: (prev?.n ?? 0) + 1, text: 'Automatic rotation restored.' }));
  };

  return (
    <section data-nba-rotation className="rounded-2xl border border-border bg-card p-3 space-y-3" aria-labelledby={`${labelId}-title`}>
      <style>{`
        @keyframes nba-rotation-change { from { opacity: .6; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        .nba-rotation-change { animation: nba-rotation-change 400ms ease-out 1; }
        @media (prefers-reduced-motion: reduce) { .nba-rotation-change { animation: none; } }
      `}</style>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${labelId}-title`} className="font-bold">Set your rotation</h3>
        <button ref={back} type="button" onClick={onBack} className="min-h-[44px] rounded-lg border border-border px-3 text-xs">Back to roster</button>
      </div>
      <p className="text-xs text-muted-foreground">Pick five starters and three bench players. Choosing someone already in the rotation swaps their slots. Automatic uses your highest-rated healthy players.</p>
      <p className="text-xs text-muted-foreground">The starters supply 72% of the strength rating, the bench 28%. Slots have fixed simulated minutes below. Your choices also decide who earns season stats and starts; they do not change ratings or contracts.</p>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-xs">
        <span data-rotation-strength>Strength: <b className="text-primary">{nbaStrength(team).toFixed(1)}</b></span>
        <span>{team.rotation ? 'Your rotation' : 'Automatic rotation'}</span>
        <button type="button" onClick={auto} disabled={!team.rotation} className="min-h-[44px] rounded-lg border border-border px-3 disabled:opacity-40">Use automatic</button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {NBA_ROTATION_MINUTES.map((minutes, slot) => {
          const player = preferred[slot];
          const active = playing[slot];
          const role = slot < 5 ? `Starter ${slot + 1}` : `Bench ${slot - 4}`;
          return (
            <div key={slot} className="min-w-0 rounded-lg border border-border/60 bg-background p-2">
              <label htmlFor={`${labelId}-${slot}`} className="mb-1 block text-xs font-bold">{role} <span className="font-normal text-muted-foreground">({minutes} sim minutes)</span></label>
              <select id={`${labelId}-${slot}`} value={player?.id ?? ''} disabled={!player} onChange={e => pick(slot, e.target.value)} className="w-full min-w-0 min-h-[44px] rounded-lg border border-border bg-card px-2 text-xs text-foreground disabled:opacity-40">
                {!player && <option value="">No player available</option>}
                {roster.map(p => <option key={p.id} value={p.id} disabled={p.out > 0}>{p.name} ({p.pos}, {p.ovr}{p.out > 0 ? `, out ${p.out}r` : ''})</option>)}
              </select>
              {player?.out > 0 && <p data-rotation-cover className="mt-1 text-xs text-muted-foreground">{active ? `Cover: ${active.name}` : 'No healthy cover available'}. {player.name} keeps this slot when healthy.</p>}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Injured players sit out and get healthy cover where available. Preferences survive recovery; a player who leaves is replaced. These are this save's simulated rotations and minutes.</p>
      {playing.every(p => !p) && <p className="text-xs text-muted-foreground">No healthy players: the current engine uses its best eight for an emergency box score, even if injured. This is a simplified injury exception, not a real NBA rule.</p>}
      <div role="status" aria-live="polite" aria-atomic="true" className="min-h-[20px] text-xs text-primary">{change && <p key={change.n} className="nba-rotation-change">{change.text}</p>}</div>
    </section>
  );
}
