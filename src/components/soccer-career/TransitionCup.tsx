import { useEffect, useRef, useState } from 'react';
import { PassingPitch, PitchBall } from '@/components/soccer-career/PassingPitch';
import { pressBoards, squareName } from '@/lib/breakThePress';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import {
  coverDistance, CUP_KEY, cupTies, currentCounter, NEXT_TIE, playCupMove, readCup, replayCup, startCup,
  type CupReceipt, type CupState,
} from '@/lib/soccerTransitionCup';

const button = 'min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold';
const primary = button + ' bg-primary text-primary-foreground';

function DefensivePitch({ state, onMove }: { state: CupState; onMove: (square: number) => void }) {
  const [armed, setArmed] = useState(false);
  const pitch = useRef<HTMLDivElement>(null);
  useEffect(() => { pitch.current?.focus({ preventScroll: true }); }, []);
  const counter = currentCounter(state);
  const ball = counter.route[state.beat], receiver = counter.route[state.beat + 1], runner = counter.route[state.beat + 2];
  const move = (square: number) => { setArmed(false); onMove(square); };
  return <div className="space-y-2">
    <p className="rounded-lg border bg-muted/20 p-2 text-sm">{counter.scout}</p>
    <p role="status" className="text-sm font-semibold">Pass {state.beat + 1} of {counter.route.length - 1}. Ball at {squareName(ball)}, receiver at {squareName(receiver)}. You defend from {squareName(state.defender)}.</p>
    <div ref={pitch} tabIndex={-1} role="group" data-game-play-area aria-label="Defensive pitch" className="relative grid grid-cols-5 overflow-hidden rounded-lg border-2 border-emerald-800 bg-emerald-950 text-white">
      {Array.from({ length: 25 }, (_, square) => {
        const distance = coverDistance(state.defender, square);
        const enabled = distance <= 1 || (state.recovery && armed && distance === 2);
        const label = distance === 0 ? 'Hold at ' : distance === 2 ? 'Spend recovery at ' : 'Cover ';
        return <button type="button" key={square} disabled={!enabled} aria-label={label + squareName(square)}
          className={'relative grid min-h-11 place-items-center border border-white/20 text-[11px] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ' + (enabled ? 'bg-emerald-800' : '')}
          onClick={event => { if (event.detail === 0) pitch.current?.focus({ preventScroll: true }); move(square); }}>
          <span className="absolute left-1 top-0 text-[9px] opacity-75">{squareName(square)}</span>
          <span className="font-black">{square === state.defender ? 'D' : ''}{square === receiver ? 'R' : square === runner ? '↗' : ''}</span>
        </button>;
      })}
      <PitchBall square={ball} />
    </div>
    <p className="text-xs text-muted-foreground">D is your defender. The ball travels to R. The arrow marks the following run. Move onto the pass or the receiver to intercept.</p>
    {state.recovery
      ? <button type="button" aria-pressed={armed} className={button} onClick={() => setArmed(!armed)}>{armed ? 'Cancel recovery run' : 'Use recovery run'}</button>
      : <p className="text-xs font-bold">Recovery run used</p>}
    {armed && <p className="text-xs">Pick a square two steps away to spend the cup’s one recovery run. A normal step keeps it.</p>}
  </div>;
}

function resultText(line: CupReceipt) {
  const score = Number(line.scored) + '-' + Number(line.conceded);
  if (line.decidingStop !== undefined) return score + (line.decidingStop ? ', tiebreak intercepted' : ', tiebreak conceded');
  return score + (line.conceded ? ', counter reached goal' : ', counter intercepted');
}

export function TransitionCup({ onBack }: { onBack: () => void }) {
  const [initialRaw] = useState(() => safeLocalStorage.getItem(CUP_KEY));
  const lastRaw = useRef(initialRaw);
  const [moves, setMoves] = useState<number[] | null>(() => readCup(initialRaw));
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(false);
  const [message, setMessage] = useState('');
  const state = (moves && replayCup(moves)) || startCup();
  const tie = cupTies[state.round], last = state.receipts[state.round];
  const finished = state.phase === 'result' && (!last.advanced || state.round === cupTies.length - 1);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (open && state.phase === 'result') title.current?.focus({ preventScroll: true });
  }, [open, state.phase]);

  const save = (next: number[]) => {
    const raw = safeLocalStorage.getItem(CUP_KEY);
    if (raw !== lastRaw.current) {
      lastRaw.current = raw;
      setMoves(readCup(raw));
      setOpen(false);
      setMessage('This cup changed in another tab. Open the latest run to continue.');
      return;
    }
    const stored = safeSetItem(CUP_KEY, JSON.stringify(next));
    lastRaw.current = safeLocalStorage.getItem(CUP_KEY);
    setMoves(next);
    setOpen(true);
    setRules(false);
    setMessage(stored ? '' : 'Progress is available for this visit. This browser could not save the cup.');
  };
  const play = (move: number) => {
    if (moves && playCupMove(state, move)) save([...moves, move]);
  };
  const attackScore = state.attack.result === 'won' ? 1 : 0;
  return <section aria-label="Transition Cup" className="space-y-3 p-4">
    <div className="flex items-center justify-between gap-2">
      <h3 ref={title} tabIndex={-1} className="text-lg font-black">
        {open && finished ? (last.advanced ? 'Transition Cup won' : 'Cup run ended') : 'Transition Cup'}
      </h3>
      <button type="button" className={button} onClick={onBack}>Back to practice</button>
    </div>
    {message && <p role="status" className="text-xs">{message}</p>}
    {open && <button type="button" className={button} aria-label="Transition Cup rules" aria-expanded={rules} onClick={() => setRules(!rules)}>?</button>}
    {(!open || rules) && <div className="space-y-2 rounded-lg border bg-muted/20 p-3 text-sm">
      <p>Win a quarterfinal, semifinal and final against simulated training teams. Each tie gives you one attack and one counter to defend. A level score sends you to a deciding counter. Intercept it to advance.</p>
      <p>Attack by passing to a teammate within three squares. Reach the top row in five passes to score. A marker in the passing lane intercepts it. After each pass, the markers slide toward the receiver and your passer runs forward. If a marker reaches the ball, your attack ends.</p>
      <p>Defend by holding or moving one square up, down, left or right before each pass. One recovery run lets you move two steps once in the entire cup. You can see the next pass before moving.</p>
      <p>Example: if the ball is at C2 and the runner is at C4, moving to C3 cuts the pass. Standing on C2 after the ball has left misses it.</p>
      <p className="text-xs text-muted-foreground">Tap a player or square, or use Tab and Enter. Shirt numbers work on the passing pitch. Every move saves on this device. This practice cup has its own results.</p>
    </div>}
    {!open ? <button type="button" className={primary} onClick={() => {
      if (moves) setOpen(true); else save([]);
    }}>{moves ? (finished ? 'Open cup result' : 'Resume ' + tie.name.toLowerCase()) : 'Start cup'}</button> : <>
      <p className="text-sm font-bold">{tie.name} · {tie.opponent}</p>
      {state.phase === 'attack' && <>
        <p role="status" className="text-sm">Your attack · {pressBoards[state.round].name}. {pressBoards[state.round].budget - state.attack.passes} passes left.</p>
        <p className="text-xs text-muted-foreground">Scout report: {tie.counter.scout}</p>
        <PassingPitch state={state.attack} active onPass={play} />
      </>}
      {(state.phase === 'defend' || state.phase === 'tiebreak') && <>
        <p className="font-bold">{state.phase === 'tiebreak'
          ? 'Level at ' + attackScore + '-' + attackScore + '. Defend the deciding counter.'
          : 'Your attack ' + (attackScore ? 'scored' : 'ended without a goal') + '. Defend their reply.'}</p>
        <DefensivePitch key={state.round + state.phase} state={state} onMove={play} />
      </>}
      {state.phase === 'result' && <>
        <ul className="divide-y rounded-lg border px-3 text-sm" aria-label="Cup results">
          {state.receipts.map(line => <li key={line.round} className="py-2"><strong>{cupTies[line.round].name}</strong> · {resultText(line)} · {line.advanced ? 'Won' : 'Out'}</li>)}
        </ul>
        <p className="text-xs text-muted-foreground">{state.recovery ? 'Recovery run available' : 'Recovery run used'}</p>
        {finished ? <button type="button" className={primary} onClick={() => save([])}>Replay the same draw</button>
          : <button type="button" className={primary} onClick={() => play(NEXT_TIE)}>Play {cupTies[state.round + 1].name.toLowerCase()}</button>}
      </>}
    </>}
  </section>;
}
