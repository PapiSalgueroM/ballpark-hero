import { useEffect, useRef, useState } from 'react';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import { initialPress, passBall, passLane, pressBoards, readPressBest, replayPasses, squareName, type PressBoard } from '@/lib/breakThePress';

const button = 'min-h-11 rounded-lg border border-border px-3 text-xs font-bold disabled:opacity-40';
const bestKey = (board: PressBoard) => 'dukb-press-practice-v1:' + board.id;

function Pitch({ board }: { board: PressBoard }) {
  const [path, setPath] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [rules, setRules] = useState(true);
  const [best, setBest] = useState(() => readPressBest(board, safeLocalStorage.getItem(bestKey(board))));
  const [saved, setSaved] = useState(true);
  const pitch = useRef<HTMLDivElement>(null);
  useEffect(() => { if (started) pitch.current?.focus({ preventScroll: true }); }, [started]);
  const state = replayPasses(board, path) ?? initialPress(board);
  const nextPass = (receiver: number) => {
    const next = passBall(board, state, receiver);
    if (!next) return;
    const nextPath = [...path, receiver];
    setPath(nextPath);
    if (next.result !== 'won') return;
    const stored = readPressBest(board, safeLocalStorage.getItem(bestKey(board)));
    const currentBest = best && best.length < nextPath.length ? best : nextPath;
    const record = stored && stored.length <= currentBest.length ? stored : currentBest;
    setSaved(record === stored || safeSetItem(bestKey(board), JSON.stringify(record)));
    setBest(record);
  };
  const carrier = state.teammates[state.carrier];
  const description = state.result === 'won' ? `Press beaten in ${path.length} passes!`
    : state.result === 'intercepted' ? 'Intercepted. A marker was in the passing lane.'
    : state.result === 'pressed' ? 'Caught in possession. A marker slid onto the receiver.'
    : state.result === 'out' ? 'Out of passes. The ball stayed outside the end zone.'
    : `Ball with ${state.carrier + 1} at ${squareName(carrier)}. ${board.budget - path.length} passes left.`;
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold">{best ? `Personal best · ${best.length} passes${saved ? '' : ' (this visit)'}` : 'Reach the end zone to set a best.'}</p>
      <button type="button" onClick={() => setRules(!rules)} className={button} aria-label="Break the Press rules" aria-expanded={rules}>?</button>
    </div>
    {rules && <div className="space-y-1 rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed">
      <p>Get the ball to a teammate in the striped top row within five passes. Tap a numbered teammate within three squares of the ball, measured in a straight line. A red marker on that line intercepts it.</p>
      <p>After a pass, both red markers slide one square sideways toward the receiver, or hold if already lined up. If one reaches the ball, you lose it. Your passer then runs one row forward if the square is free.</p>
      <p>On Find the outlet, pass from 1 at A5 to 2 at C5. Both markers slide toward column C and 1 runs to A4 for the return.</p>
      <p>On the pitch, press a shirt number or use Tab and Enter to pass. Practice records stay on this device.</p>
    </div>}
    <p role="status" aria-live="polite" className="text-sm font-bold">{description}</p>
    <div className="text-center text-[11px] font-bold uppercase tracking-wide text-emerald-500">↑ End zone ↑</div>
    <div ref={pitch} role="group" tabIndex={-1} aria-label="Passing pitch" data-game-play-area onKeyDown={e => {
      if (!started || e.altKey || e.ctrlKey || e.metaKey || !/^[1-5]$/.test(e.key)) return;
      e.preventDefault();
      e.currentTarget.focus({ preventScroll: true });
      nextPass(Number(e.key) - 1);
    }} className="grid grid-cols-5 overflow-hidden rounded-xl border-2 border-emerald-800 bg-emerald-950 text-white">
      {Array.from({ length: 25 }, (_, square) => {
        const player = state.teammates.indexOf(square);
        const marker = state.markers.includes(square);
        const ball = player === state.carrier;
        const lane = player >= 0 ? passLane(state, player) : null;
        const spot = squareName(square);
        return <div key={square} className="relative grid min-h-11 place-items-center border border-white/15" style={square < 5 ? { background: 'repeating-linear-gradient(135deg,#166534 0 6px,#14532d 6px 12px)' } : undefined}>
          {player >= 0 ? <button type="button" disabled={!started || !lane} onClick={e => {
            if (e.detail === 0) pitch.current?.focus({ preventScroll: true });
            nextPass(player);
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
    {!started ? <button type="button" className={button + ' w-full bg-primary text-primary-foreground'} onClick={() => { setStarted(true); setRules(false); }}>Start board</button>
      : <div className="grid grid-cols-2 gap-2">
        <button type="button" className={button} disabled={!path.length} onClick={() => setPath(path.slice(0, -1))}>Undo pass</button>
        <button type="button" className={button} onClick={() => setPath([])}>Retry board</button>
      </div>}
  </div>;
}

export default function BreakThePressBoard({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState(pressBoards[0]);
  return <section aria-label="Break the Press" className="space-y-2 p-4">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-lg font-black">Break the Press</h3>
      <button type="button" className={button} onClick={onBack}>Back to drills</button>
    </div>
    <label className="block text-xs font-bold">Tactical board
      <select value={board.id} className="mt-1 block min-h-11 w-full rounded-lg border bg-background px-2" onChange={e => setBoard(pressBoards.find(b => b.id === e.target.value)!)}>{pressBoards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
    </label>
    <Pitch key={board.id} board={board} />
  </section>;
}
