import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { safeLocalStorage, safeSetItem } from '@/lib/safeStorage';
import {
  CLOSING_KEY, closingCost, closingScenarios, closingScore, closingSpots, hasOutlet, opponentLook, playClosing, readClosing, startClosing,
  type ClosingCall, type ClosingState, type Spot,
} from '@/lib/nbaClosingTime';

const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary focus-visible:outline focus-visible:outline-2';
const primary = button + ' bg-primary text-primary-foreground';
const positions: Record<Spot, string> = { wing: 'bottom-2 left-[7%]', rim: 'left-1/2 top-2 -translate-x-1/2', corner: 'right-1 top-2' };
const ballPosition: Record<Spot, string> = { wing: 'translate(12%, 105%)', rim: 'translate(100%, 85%)', corner: 'translate(200%, 85%)' };
const clockText = (seconds: number) => '0:' + String(seconds).padStart(2, '0');

function HalfCourt({ state, play }: { state: ClosingState; play: (call: ClosingCall) => void }) {
  const offense = state.side === 'offense';
  const target = opponentLook(state);
  const ballSpot = offense ? state.ball : 'wing';
  return <div role="group" aria-label={offense ? 'Offensive half court' : 'Defensive half court'} data-game-play-area
    className="relative h-40 overflow-hidden rounded-xl border-2 border-orange-700/70 bg-amber-950 text-white">
    <div aria-hidden="true" className="pointer-events-none absolute -top-16 left-[15%] h-48 w-[70%] rounded-b-full border-2 border-amber-200/40" />
    <div aria-hidden="true" className="pointer-events-none absolute left-[37%] top-0 h-16 w-[26%] rounded-b-2xl border border-amber-200/70" />
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-2 w-4 -translate-x-1/2 rounded-b-full border-2 border-orange-400" />
    {(['wing', 'rim', 'corner'] as const).map(spot => {
      const ball = offense && spot === state.ball;
      const label = offense ? (ball ? 'Shoot from ' : spot === 'rim' ? 'Cut to ' : 'Pass to ') + spot
        : spot === 'wing' ? 'Trap ballhandler' : spot === 'rim' ? 'Protect the rim' : 'Deny the corner';
      const detail = offense ? (state.open === spot ? 'Open' : 'Guarded') + ' · ' + closingCost(state, ball ? 'shoot' : spot) + 's'
        : spot === 'wing' ? (hasOutlet(state) ? 'Outlet ready' : 'Isolated') : spot === target ? 'First look' : 'Weak side';
      const tone = (offense ? state.open === spot : spot === target) ? 'border-amber-300 bg-amber-100 text-amber-950' : 'border-amber-200/70 bg-amber-950 text-white';
      const classes = 'absolute grid min-h-11 w-[30%] max-w-32 content-center rounded-lg border px-1 text-center ' + tone + ' ' + positions[spot];
      return <button type="button" key={spot} aria-label={label} className={classes + ' focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300'}
        onClick={() => play(offense ? (ball ? 'shoot' : spot) : spot === 'wing' ? 'trap' : spot === 'rim' ? 'deny-rim' : 'deny-corner')}>
        <strong className="text-xs">{label}</strong><span className="text-[10px]">{detail}</span>
      </button>;
    })}
    <span aria-hidden="true" data-closing-ball={ballSpot} className="pointer-events-none absolute left-0 top-0 grid h-1/3 w-1/3 place-items-center motion-safe:transition-transform motion-safe:duration-200"
      style={{ transform: ballPosition[ballSpot] }}><span className="rounded-full bg-amber-950/80 text-base leading-none">🏀</span></span>
  </div>;
}

export function ClosingTimeBoard({ resume = false, onFinish }: { resume?: boolean; onFinish?: (score: number) => void }) {
  const [initial] = useState(() => safeLocalStorage.getItem(CLOSING_KEY));
  const lastRaw = useRef(initial);
  const [run, setRun] = useState(() => readClosing(initial));
  const [playing, setPlaying] = useState(resume && run !== null);
  const [warning, setWarning] = useState('');
  const focusResult = useRef<HTMLHeadingElement>(null);
  const state = run?.state ?? startClosing();
  const scenario = closingScenarios[state.game];
  const final = state.side === 'result' && state.game === closingScenarios.length - 1;
  useEffect(() => {
    if (playing) focusResult.current?.focus({ preventScroll: true });
  }, [playing, state.game, state.side]);
  const save = (moves: ClosingCall[], next: ClosingState, finished = false) => {
    const expected = lastRaw.current;
    const commit = (canCredit: boolean) => {
      const raw = safeLocalStorage.getItem(CLOSING_KEY);
      if (raw !== expected) {
        if (raw === lastRaw.current) return;
        lastRaw.current = raw;
        setRun(readClosing(raw));
        setPlaying(false);
        setWarning('This set changed in another tab. Resume the latest possession.');
        return;
      }
      const saved = safeSetItem(CLOSING_KEY, JSON.stringify(moves));
      lastRaw.current = safeLocalStorage.getItem(CLOSING_KEY);
      setRun({ moves, state: next });
      setPlaying(true);
      if (!saved) setWarning('Your set is available for this visit. This browser could not save it.');
      else if (finished && onFinish && !canCredit) setWarning('Your result is saved on this device. This browser could not safely submit a score.');
      else setWarning('');
      if (saved && finished && canCredit) onFinish?.(closingScore(next.receipts));
    };
    let acquired = false;
    try {
      if (!navigator.locks) {
        commit(false);
        return;
      }
      void navigator.locks.request(CLOSING_KEY, () => {
        acquired = true;
        commit(true);
      }).catch(() => { if (!acquired) commit(false); });
    } catch {
      if (!acquired) commit(false);
    }
  };
  const play = (call: ClosingCall) => {
    if (!run) return;
    const next = playClosing(state, call);
    if (next) save([...run.moves, call], next, next.side === 'result' && next.game === closingScenarios.length - 1);
  };
  return <section aria-label="Closing Time court" className="grid gap-3">
      <details open={!playing || undefined} className="rounded-lg border px-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 font-bold"><span aria-hidden="true">? </span>Rules and example</summary>
        <div className="space-y-2 pb-3 text-xs">
          <p>The clocks move when you act. On offense, tap the player with the ball to shoot or send it to another spot. In this drill open shots go in, guarded shots miss, and the defense rebounds every miss. Rim shots score two, wing or corner shots score three.</p>
          <p>Crossing half court takes four seconds. A pass takes two, a cut to the rim takes three and a shot takes two. Pass into coverage and help leaves your passer open for a return. Use one timeout per game to inbound in the frontcourt.</p>
          <p>On defense, cover the first look to force a miss. A four-second trap takes the ball from an isolated guard. A ready outlet beats the trap for a corner three. Tied or trailing opponents shoot after seven seconds. Opponents ahead use their shot clock and can hold to the horn. Both teams start in the penalty. A foul costs two seconds and gives them the free throws shown.</p>
          <p>Example: with five seconds left in the backcourt, a timeout, corner pass and shot use four seconds. The same pass and shot from the backcourt need eight.</p>
        </div>
      </details>
      {warning && <p role="status" className="text-xs">{warning}</p>}
      {!playing ? <button className={primary} onClick={() => run ? setPlaying(true) : save([], startClosing())}>
        {run ? (final ? 'Open set results' : 'Resume closing set') : 'Start closing set'}
      </button> : <>
        <h3 ref={focusResult} tabIndex={-1} className="font-bold">{final ? 'Set complete' : 'Game ' + (state.game + 1) + ' · ' + scenario.name}</h3>
        <div className="grid grid-cols-3 rounded-lg bg-muted p-2 text-center text-sm tabular-nums">
          <strong>Your side {state.home}</strong><span>Q4 {clockText(state.clock)}</span><strong>Them {state.away}</strong>
        </div>
        {state.side === 'result' ? <>
          <ol aria-label="Closing set results" className="divide-y rounded-lg border px-3 text-sm">
            {state.receipts.map(r => <li className="py-2" key={r.game}>{closingScenarios[r.game].name} · {r.home}-{r.away} · <strong>{r.result}</strong></li>)}
          </ol>
          {final && <p className="text-sm">{state.receipts.filter(r => r.result === 'Win').length} of 3 won in regulation.</p>}
          <button className={primary} onClick={() => final ? save([], startClosing()) : play('next')}>{final ? 'Replay the same set' : 'Next situation'}</button>
        </> : <>
          <p className="text-sm font-semibold">{state.side === 'offense' ? 'Your ball' : 'Their ball'} · {state.shotClock}s to shoot · {state.timeout ? '1 timeout left' : 'Timeout used'}</p>
          <p className="text-xs text-muted-foreground">{state.side === 'offense'
            ? (state.backcourt ? 'Backcourt inbound. ' : 'Frontcourt. ') + closingSpots[state.open] + ' is open.'
            : 'Scout: first look at the ' + opponentLook(state) + '. On a foul they make ' + scenario.freeThrows + ' of 2.'}</p>
          <HalfCourt state={state} play={play} />
          {state.side === 'offense' ? <div className="grid grid-cols-2 gap-2">
            <button className={button} disabled={!state.timeout || !state.backcourt} onClick={() => play('timeout')}>Advance with timeout</button>
            <button className={button} disabled={state.clock > state.shotClock && state.shotClock <= 4} onClick={() => play('hold')}>
              {state.clock <= state.shotClock ? 'Hold to the horn' : 'Use clock to 4s'}
            </button>
          </div> : <button className={button} onClick={() => play('foul')}>Foul to stop the clock</button>}
        </>}
        {state.log.length > 0 && <div aria-live="polite" className="rounded-lg border px-3 py-2 text-xs">{state.log[state.log.length - 1]}</div>}
      </>}
  </section>;
}

export default function NbaClosingTime() {
  const heading = useRef<HTMLHeadingElement>(null);
  return <Dialog>
    <DialogTrigger asChild><button type="button" className={button + ' mt-3 w-full'}>Closing Time</button></DialogTrigger>
    <DialogContent data-nba-closing-time="" className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-md gap-3 overflow-y-auto rounded-xl p-4 sm:p-5"
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
      <DialogTitle ref={heading} tabIndex={-1}>Closing Time</DialogTitle>
      <DialogDescription>Coach both ends of three simulated fourth quarters. Win before the horn or earn overtime. Your practice set saves on this device.</DialogDescription>
      <ClosingTimeBoard />
      <DialogClose asChild><button className={button}>Back to career</button></DialogClose>
    </DialogContent>
  </Dialog>;
}
