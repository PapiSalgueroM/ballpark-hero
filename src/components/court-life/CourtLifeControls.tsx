import { useEffect, useRef, type PointerEvent } from 'react';
import { courtControlActions, type CourtControlSlot } from '@/hooks/useCourtLife';
import type { CourtMatch } from '@/lib/courtLife';

export interface CourtLifeControlsProps {
  match: CourtMatch | null; paused: boolean;
  press: (source: string, slot: CourtControlSlot) => void;
  release: (source: string, cancelled?: boolean) => void;
  move: (source: string, screenX: number, screenY: number) => void;
  tap: (slot: CourtControlSlot) => void;
}
export default function CourtLifeControls({ match, paused, press, release, move, tap }: CourtLifeControlsProps) {
  const padPointer = useRef<number | null>(null);
  const disabled = paused || match?.phase !== 'playing';
  useEffect(() => { if (disabled) padPointer.current = null; }, [disabled]);
  const actions = courtControlActions(match);
  const aim = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    move(`pointer:${event.pointerId}`, (event.clientX - rect.left - rect.width / 2) / 48, (event.clientY - rect.top - rect.height / 2) / 48);
  };
  const stopPad = (event: PointerEvent<HTMLDivElement>) => {
    if (padPointer.current !== event.pointerId) return;
    padPointer.current = null; release(`pointer:${event.pointerId}`);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div className="flex items-center justify-between gap-3" data-court-controls>
    <div className="relative flex h-32 w-32 shrink-0 touch-none select-none items-center justify-center rounded-full border-2 border-border bg-card"
      data-court-pad aria-label="Movement pad. Drag toward the direction you want to run." role="group"
      onPointerDown={event => {
        if (disabled || event.button !== 0 || padPointer.current !== null) return;
        event.preventDefault(); padPointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); aim(event);
      }} onPointerMove={event => { if (padPointer.current === event.pointerId) aim(event); }}
      onPointerUp={stopPad} onPointerCancel={stopPad} onLostPointerCapture={stopPad}>
      <span className="pointer-events-none text-center text-xs text-muted-foreground">Move<br />↑<br />← · →<br />↓</span>
    </div>
    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
      {(['primary', 'secondary', 'effort'] as const).map((slot, index) => <button key={slot} type="button" disabled={disabled}
        data-court-control={slot} data-court-action={actions[slot]}
        className="min-h-[44px] min-w-[44px] touch-none select-none rounded-xl border border-border bg-card px-2 py-2 text-sm font-semibold capitalize focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); press(`pointer:${event.pointerId}`, slot);
        }}
        onPointerUp={event => { release(`pointer:${event.pointerId}`); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={event => release(`pointer:${event.pointerId}`, true)}
        onLostPointerCapture={event => release(`pointer:${event.pointerId}`, true)}
        onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) press(`button:${slot}`, slot); } }}
        onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); release(`button:${slot}`); } }}
        onBlur={() => release(`button:${slot}`)}
        onClick={event => { if (event.detail === 0) tap(slot); }}>
        {actions[slot]} <span className="text-xs text-muted-foreground">{['J', 'K', 'L'][index]}</span>
      </button>)}
    </div>
  </div>;
}
