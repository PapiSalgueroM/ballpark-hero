import { useEffect, useRef } from 'react';
import { passLane, squareName, type PressState } from '@/lib/breakThePress';

export function PassingPitch({ state, active, onPass }: { state: PressState; active: boolean; onPass: (receiver: number) => void }) {
  const pitch = useRef<HTMLDivElement>(null);
  useEffect(() => { if (active) pitch.current?.focus({ preventScroll: true }); }, [active]);
  return <>
    <div className="text-center text-[11px] font-bold uppercase tracking-wide text-emerald-500">↑ End zone ↑</div>
    <div ref={pitch} role="group" tabIndex={-1} aria-label="Passing pitch" data-game-play-area onKeyDown={e => {
      if (!active || e.altKey || e.ctrlKey || e.metaKey || !/^[1-5]$/.test(e.key)) return;
      e.preventDefault();
      e.currentTarget.focus({ preventScroll: true });
      onPass(Number(e.key) - 1);
    }} className="grid grid-cols-5 overflow-hidden rounded-xl border-2 border-emerald-800 bg-emerald-950 text-white">
      {Array.from({ length: 25 }, (_, square) => {
        const player = state.teammates.indexOf(square);
        const marker = state.markers.includes(square);
        const ball = player === state.carrier;
        const lane = player >= 0 ? passLane(state, player) : null;
        const spot = squareName(square);
        return <div key={square} className="relative grid min-h-11 place-items-center border border-white/15" style={square < 5 ? { background: 'repeating-linear-gradient(135deg,#166534 0 6px,#14532d 6px 12px)' } : undefined}>
          {player >= 0 ? <button type="button" disabled={!active || !lane} onClick={e => {
            if (e.detail === 0) pitch.current?.focus({ preventScroll: true });
            onPass(player);
          }}
            aria-label={ball ? `Ball with ${player + 1} at ${spot}` : `Pass to ${player + 1} at ${spot}${lane === 'blocked' ? ', blocked lane' : ''}`}
            className="flex min-h-11 w-full items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white">
            <span className={`grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-black ${ball ? 'border-amber-300 bg-amber-300 text-black' : lane ? 'border-white bg-sky-600 text-white' : 'border-sky-500 bg-sky-950 text-sky-200'}`}>{player + 1}</span>
          </button> : null}
          <span aria-hidden="true" className="pointer-events-none absolute bottom-0.5 left-0.5 text-[8px] leading-none text-white/65">{spot}</span>
          {marker && <span aria-label={`Defender at ${spot}`} role="img" className={`pointer-events-none grid place-items-center rounded-sm bg-red-700 font-bold text-white ${player >= 0 ? 'absolute bottom-0 right-0 h-4 w-4 text-[10px]' : 'h-7 w-7 text-xs'}`}>D</span>}
        </div>;
      })}
    </div>
    <p className="text-[11px] text-muted-foreground">Gold has the ball. White rings mark teammates in range. Red squares are defenders.</p>
  </>;
}
