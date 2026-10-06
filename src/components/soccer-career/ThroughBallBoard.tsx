/* Round 1032: the Through Ball board, the CM and CAM position drill.
   Same lifecycle as FirstTouchBoard (daily ten saved after every ball, one
   bank, unlimited practice, Pause, hidden tab pause, reopenable rules), the
   rules in src/lib/throughBallDrill.ts, the flight in useArcadeFlight. */
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useArcadeFlight } from '@/hooks/useArcadeFlight';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { DRILL_META, drillBoost, drillHeadroom, drillSeed, drillStatFor, type DrillKind } from '@/lib/careerDrills';
import {
  aimFor, ballAt, buildThroughBallRun, crossTime, KEEPER_Y, MAX_ANGLE, passTarget, PASSER, PITCH_LEFT, PITCH_RIGHT,
  replayEnd, runnerAt, runTime, takeThroughBall, throughBallDeadline, validateThroughBallRecord,
  type ThroughBallRecord, type ThroughBallResult,
} from '@/lib/throughBallDrill';
import type { CareerState } from '@/lib/soccerCareerEngine';
import motion from './ThroughBallBoard.module.css';

type Phase = 'intro' | 'ready' | 'playing' | 'resolve' | 'roundEnd' | 'done';
type Mode = 'daily' | 'practice';
interface Aim { angle: number; weight: number; }
const EMPTY: ThroughBallRecord = { rounds: 0, count: 0, score: 0, banked: false };
const START_AIM: Aim = { angle: 0, weight: 0.55 };
const ANGLE_STEP = 2;
const WEIGHT_STEP = 0.02;
const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clampAim = (aim: Aim): Aim => ({
  angle: Math.round(Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, aim.angle)) * 100) / 100,
  weight: Math.round(Math.max(0, Math.min(1, aim.weight)) * 1000) / 1000,
});

function Rules({ trains }: { trains: string }) {
  return <div className="space-y-2 text-xs text-muted-foreground">
    <p>Ten runs. Your runner starts onside, waits a moment, then cuts in across the defensive line. Drag on the pitch to the spot you want the ball to stop: where you drag is the direction, how far is the weight. Let go to play it.</p>
    <p>A pass scores 10 when it goes through a gap in the line, stops short of the keeper and lands on his run in time. Play it after he crosses the line and he is offside. Too soft and it dies before the line or behind him; too hard and it runs to the keeper or away from him. Later runs are quicker and the gaps get tighter.</p>
    <p>Drag and let go with a mouse or a finger. Or focus the pitch: Left and Right turn the aim, Up and Down set the weight, Space starts the run and plays the pass. The buttons under the pitch do the same. Pause freezes the clock, and coming back from another tab needs Resume.</p>
    <p>Today&apos;s ten save after every ball and can bank once. Practice is unlimited and never banks. One career session per season: 50 earns +1 {trains}, 80 earns +2, capped by your ceiling, with next season&apos;s growth.</p>
    <p><strong className="text-foreground">Example:</strong> he goes at 1.00s and crosses the line at 2.40s. Play it at about 2.20s into the space a step ahead of his run, through the gap, and he takes it in stride for 10. The same pass at 2.50s is offside.</p>
  </div>;
}

export default function ThroughBallBoard({ career, canBank, onBank, onBack }: {
  career: CareerState; canBank: boolean;
  onBank: (kind: DrillKind, count: number) => void; onBack: () => void;
}) {
  const SLUG = DRILL_META.throughball.slug;
  const trains = drillStatFor('throughball', career.position).label;
  const today = useRef(getTodayET()).current;
  const [daily, setDaily] = useState(() => readDailyRecord(SLUG, today, validateThroughBallRecord));
  const [mode, setMode] = useState<Mode>('daily');
  const [run, setRun] = useState(() => buildThroughBallRun(drillSeed('throughball', today)));
  const [phase, setPhase] = useState<Phase>('intro');
  const phaseRef = useRef<Phase>('intro');
  const [record, setRecord] = useState<ThroughBallRecord>(EMPTY);
  const recordRef = useRef<ThroughBallRecord>(EMPTY);
  const bankedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [aim, setAimState] = useState<Aim>(START_AIM);
  const aimRef = useRef<Aim>(START_AIM);
  const dragging = useRef(false);
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<ThroughBallResult | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [help, setHelp] = useState(false);
  const helpRef = useRef(false);
  const [reduced, setReduced] = useState(reducedMotion);
  const flight = useArcadeFlight(700);
  const elapsed = useRef(0);
  const startedAt = useRef(0);
  const running = useRef(false);
  const epoch = useRef(0);
  const reveal = useRef(0);
  const mounted = useRef(true);
  const frame = useRef<number | null>(null);
  const deadline = useRef<number | null>(null);
  const resolveRef = useRef<(press: number) => void>(() => {});
  const setup = run[index];

  const move = (next: Phase) => { phaseRef.current = next; setPhase(next); };
  const setAim = (next: Aim) => { const held = clampAim(next); aimRef.current = held; setAimState(held); };
  const activeSeconds = useCallback(() => elapsed.current + (running.current ? (performance.now() - startedAt.current) / 1000 : 0), []);
  const stopClock = useCallback(() => {
    elapsed.current = activeSeconds();
    running.current = false;
    epoch.current++;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (deadline.current !== null) window.clearTimeout(deadline.current);
    frame.current = null; deadline.current = null;
  }, [activeSeconds]);

  const startClock = () => {
    if (document.hidden || helpRef.current || pausedRef.current) return;
    running.current = true;
    startedAt.current = performance.now();
    const token = ++epoch.current;
    const current = () => mounted.current && epoch.current === token && phaseRef.current === 'playing' && !pausedRef.current;
    const tick = () => {
      if (!current()) return;
      setSeconds(activeSeconds());
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    deadline.current = window.setTimeout(() => {
      if (current()) resolveRef.current(Math.max(activeSeconds(), throughBallDeadline(setup) + 0.001));
    }, Math.max(0, (throughBallDeadline(setup) - elapsed.current) * 1000) + 1);
  };

  const pause = useCallback(() => {
    if (pausedRef.current || (phaseRef.current !== 'playing' && phaseRef.current !== 'resolve')) return;
    pausedRef.current = true; setPaused(true);
    dragging.current = false;
    stopClock(); if (phaseRef.current === 'resolve') flight.pause();
  }, [stopClock, flight.pause]);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', visibility);
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const change = () => setReduced(Boolean(media?.matches));
    media?.addEventListener?.('change', change);
    return () => {
      mounted.current = false; reveal.current++; stopClock();
      document.removeEventListener('visibilitychange', visibility);
      media?.removeEventListener?.('change', change);
    };
  }, [pause, stopClock]);

  const save = (next: ThroughBallRecord) => {
    if (mode === 'daily') {
      const newer = readDailyRecord(SLUG, today, validateThroughBallRecord);
      if (newer && (newer.rounds > next.rounds || newer.banked)) next = newer;
    }
    recordRef.current = next; setRecord(next);
    if (mode === 'daily') { writeDailyRecord(SLUG, today, { ...next }); setDaily(next); }
  };

  resolveRef.current = (press: number) => {
    if (!mounted.current || phaseRef.current !== 'playing' || pausedRef.current || helpRef.current) return;
    if (mode === 'daily' && restoreNewerDaily()) return;
    dragging.current = false;
    move('resolve'); stopClock(); setSeconds(press);
    const settled = takeThroughBall({ ...aimRef.current, press }, setup);
    setResult(settled);
    const previous = recordRef.current;
    const count = previous.count + Number(settled.won);
    save({ rounds: previous.rounds + 1, count, score: count * 10, banked: false });
    const token = ++reveal.current;
    flight.launch(() => {
      if (mounted.current && reveal.current === token && phaseRef.current === 'resolve') move(recordRef.current.rounds === 10 ? 'done' : 'roundEnd');
    });
  };

  const clearRound = () => {
    reveal.current++; stopClock(); flight.reset();
    elapsed.current = 0; setSeconds(0); setResult(null);
    pausedRef.current = false; setPaused(false); dragging.current = false;
  };
  const restoreNewerDaily = () => {
    const newer = readDailyRecord(SLUG, today, validateThroughBallRecord);
    if (!newer || (newer.rounds <= recordRef.current.rounds && !newer.banked)) return false;
    clearRound(); recordRef.current = newer; setRecord(newer); setDaily(newer);
    bankedRef.current = newer.banked; setIndex(Math.min(newer.rounds, 9));
    move(newer.rounds === 10 ? 'done' : 'ready');
    return true;
  };
  const startRun = (nextMode: Mode) => {
    clearRound(); setMode(nextMode);
    const restored = nextMode === 'daily' ? readDailyRecord(SLUG, today, validateThroughBallRecord) : null;
    const next = restored ?? { ...EMPTY };
    if (nextMode === 'daily') setDaily(restored);
    recordRef.current = next; setRecord(next); bankedRef.current = next.banked;
    setRun(buildThroughBallRun(nextMode === 'daily' ? drillSeed('throughball', today) : Math.floor(Math.random() * 2147483645) + 1));
    setIndex(Math.min(next.rounds, 9));
    setAim(START_AIM);
    move(next.rounds === 10 ? 'done' : 'ready');
  };
  const advance = () => {
    clearRound();
    if (recordRef.current.rounds === 10) { move('done'); return; }
    setIndex(recordRef.current.rounds); move('ready');
  };
  const action = () => {
    if (pausedRef.current || helpRef.current) return;
    if (phaseRef.current === 'ready') {
      if (document.hidden) return;
      elapsed.current = 0; setSeconds(0); move('playing'); startClock();
    } else if (phaseRef.current === 'playing') resolveRef.current(activeSeconds());
    else if (phaseRef.current === 'resolve' || phaseRef.current === 'roundEnd') advance();
  };
  const resume = () => {
    if (!pausedRef.current || document.hidden || helpRef.current) return;
    pausedRef.current = false; setPaused(false);
    if (phaseRef.current === 'playing') startClock();
    else if (phaseRef.current === 'resolve') flight.resume();
  };
  const bank = () => {
    if (mode !== 'daily' || phaseRef.current !== 'done' || recordRef.current.rounds !== 10 || !canBank || bankedRef.current || recordRef.current.banked) return;
    const stored = readDailyRecord(SLUG, today, validateThroughBallRecord);
    if (stored?.banked) { bankedRef.current = true; save(stored); return; }
    bankedRef.current = true;
    save({ ...recordRef.current, banked: true });
    onBank('throughball', recordRef.current.count);
  };
  const leave = () => { clearRound(); move('intro'); onBack(); };
  const changeMode = () => { clearRound(); move('intro'); };
  const aiming = () => !pausedRef.current && !helpRef.current && (phaseRef.current === 'ready' || phaseRef.current === 'playing');
  const nudge = (angle: number, weight: number) => { if (aiming()) setAim({ angle: aimRef.current.angle + angle, weight: aimRef.current.weight + weight }); };

  /* Drag and release. The spot under the pointer is where the ball stops, so
     the drag sets direction and weight together; letting go while the run is
     live plays it. Before the run starts a drag only sets the aim. */
  const aimAtPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    setAim(aimFor({ x: (event.clientX - box.left) / box.width * 360, y: (event.clientY - box.top) / box.height * 240 }));
  };
  const pointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!aiming()) return;
    dragging.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    aimAtPointer(event);
  };
  const pointerMove = (event: ReactPointerEvent<SVGSVGElement>) => { if (dragging.current && aiming()) aimAtPointer(event); };
  const pointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (!aiming()) return;
    aimAtPointer(event);
    if (phaseRef.current === 'playing') resolveRef.current(activeSeconds());
  };

  const replay = result ? result.press + (reduced ? 1 : flight.progress) * (replayEnd(result) - result.press) : 0;
  const runner = result ? runnerAt(setup, replay) : reduced && phase === 'playing' ? setup.start : runnerAt(setup, seconds);
  const ball = result ? ballAt(result, replay) : PASSER;
  const spot = passTarget(aim.angle, aim.weight);
  const runEnd = runnerAt(setup, setup.hold + runTime(setup));
  const crossAt = crossTime(setup);
  const crossing = runnerAt(setup, crossAt);
  const boost = drillBoost(record.score, drillHeadroom(career));
  const active = phase === 'playing' || phase === 'resolve';
  const canAim = !paused && (phase === 'ready' || phase === 'playing');
  const going = phase === 'playing' && seconds >= setup.hold && seconds <= crossAt;
  const actionText = phase === 'ready' ? 'Start run' : phase === 'playing' ? 'Play it' : phase === 'done' ? 'Session complete' : record.rounds === 10 ? 'See session' : 'Next ball';
  const aimText = `${Math.abs(aim.angle).toFixed(0)}° ${aim.angle < 0 ? 'left' : aim.angle > 0 ? 'right' : 'straight'} · weight ${Math.round(aim.weight * 100)}%`;

  return <div className={`p-3 space-y-2 ${motion.board}`} data-through-ball-board data-mode={mode} data-phase={phase}>
    <div className="flex items-center justify-between gap-2">
      <button onClick={leave} className="px-2 text-xs font-bold text-muted-foreground">‹ Drills</button>
      <h3 className="text-sm font-black">🎯 Through Ball</h3>
      <Dialog open={help} onOpenChange={open => { if (open) pause(); helpRef.current = open; setHelp(open); }}>
        <DialogTrigger asChild><button aria-label="Through Ball rules" className="w-11 rounded-lg bg-muted/40 font-black">?</button></DialogTrigger>
        <DialogContent className={`w-[calc(100%-24px)] max-w-sm max-h-[85vh] overflow-y-auto p-5 ${motion.rules}`} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
          <DialogTitle>Through Ball rules</DialogTitle>
          <DialogDescription>Read his run, then weight it into his path.</DialogDescription>
          <Rules trains={trains} />
        </DialogContent>
      </Dialog>
    </div>
    {phase === 'intro' ? <div className="space-y-3">
      <Rules trains={trains} />
      {daily && <p className="text-xs font-bold">Today: {daily.count} through, {daily.rounds}/10 played{daily.banked ? ', banked' : ''}.</p>}
      <button onClick={() => startRun('daily')} className="w-full rounded-lg bg-emerald-600 px-3 font-black text-black text-sm">{daily?.rounds === 10 ? 'View today’s result' : daily?.rounds ? 'Resume today’s ten' : 'Play today’s ten'}</button>
      <button onClick={() => startRun('practice')} className="w-full rounded-lg bg-muted/40 px-3 text-sm font-bold">Practice, no banking</button>
    </div> : <>
      <div className="flex justify-between gap-2 text-xs font-bold tabular-nums"><span>{mode === 'daily' ? 'Today' : 'Practice'} · Ball {Math.min(index + 1, 10)}/10</span><span data-through-score>{record.score}/100 · {record.count} through</span></div>
      <div className={motion.field} tabIndex={0} role="group" aria-label="Through Ball pitch, Left and Right aim, Up and Down set the weight, Space starts the run or plays the pass" onKeyDown={event => {
        if (event.target !== event.currentTarget || event.repeat || pausedRef.current || helpRef.current) return;
        const turns: Record<string, [number, number]> = { ArrowLeft: [-ANGLE_STEP, 0], ArrowRight: [ANGLE_STEP, 0], ArrowUp: [0, WEIGHT_STEP], ArrowDown: [0, -WEIGHT_STEP] };
        if (turns[event.key]) { event.preventDefault(); nudge(...turns[event.key]); }
        else if (event.code === 'Space' || event.key === ' ') { event.preventDefault(); action(); }
      }}>
        <svg viewBox="0 0 360 240" className="w-full rounded-xl border border-border" role="img" aria-label={`Runner goes at ${setup.hold.toFixed(2)} seconds and crosses the line at ${crossAt.toFixed(2)} seconds`} style={{ background: 'linear-gradient(#166534, #14532d)' }}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { dragging.current = false; }}>
          <path d={`M${PITCH_LEFT} 225V18H${PITCH_RIGHT}V225`} fill="none" stroke="white" strokeOpacity=".2" />
          <rect x="150" y="10" width="60" height="8" fill="none" stroke="white" strokeOpacity=".6" />
          <path d={`M110 18V${KEEPER_Y}H250V18`} fill="none" stroke="white" strokeOpacity=".3" />
          <circle cx="180" cy="27" r="6" fill="#a855f7" />
          <path d={`M${PITCH_LEFT} ${setup.line}H${PITCH_RIGHT}`} stroke="#fca5a5" strokeOpacity=".55" strokeDasharray="6 5" data-defensive-line />
          {setup.defenders.map((x, i) => <circle key={i} data-defender cx={x} cy={setup.line} r="7" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" />)}
          <path d={`M${setup.start.x} ${setup.start.y}L${runEnd.x} ${runEnd.y}`} fill="none" stroke="#fde68a" strokeOpacity=".45" strokeDasharray="4 5" data-runner-path />
          <circle cx={crossing.x} cy={crossing.y} r="3" fill="#fde68a" fillOpacity=".7" data-runner-crossing />
          {canAim && <path d={`M${PASSER.x} ${PASSER.y}L${spot.x} ${spot.y}`} stroke="white" strokeOpacity=".5" strokeDasharray="2 4" />}
          {(canAim || result) && <circle data-aim-target cx={result ? result.target.x : spot.x} cy={result ? result.target.y : spot.y} r="9" fill="none" stroke="#fbbf24" strokeWidth="2" />}
          <circle cx={PASSER.x} cy={PASSER.y} r="8" fill="#38bdf8" />
          <circle data-runner cx={runner.x} cy={runner.y} r="7" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <circle data-through-ball cx={ball.x} cy={ball.y} r="5" fill="white" stroke="#172554" strokeWidth="2" />
        </svg>
      </div>
      <div className="text-center text-xs tabular-nums h-9" data-through-clock>
        <div className="font-black">{paused ? 'Paused, press Resume' : going ? 'He is going, play it' : `${seconds.toFixed(2)}s · ${aimText}`}</div>
        <div className="text-muted-foreground">He goes at {setup.hold.toFixed(2)}s, crosses the line at {crossAt.toFixed(2)}s{reduced ? ' · static pitch' : ''}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => nudge(-ANGLE_STEP, 0)} disabled={!canAim} className="rounded-lg border border-border bg-muted/20 text-xs font-bold disabled:opacity-50">Aim left</button>
        <button onClick={() => nudge(ANGLE_STEP, 0)} disabled={!canAim} className="rounded-lg border border-border bg-muted/20 text-xs font-bold disabled:opacity-50">Aim right</button>
        <button onClick={() => nudge(0, -WEIGHT_STEP)} disabled={!canAim} className="rounded-lg border border-border bg-muted/20 text-xs font-bold disabled:opacity-50">Softer</button>
        <button onClick={() => nudge(0, WEIGHT_STEP)} disabled={!canAim} className="rounded-lg border border-border bg-muted/20 text-xs font-bold disabled:opacity-50">Harder</button>
      </div>
      <div className="flex gap-2">
        <button onClick={action} onKeyDown={event => { if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault(); }} disabled={paused || phase === 'done'} data-through-action className="flex-1 rounded-lg bg-emerald-600 text-black text-sm font-black disabled:opacity-50">{actionText}</button>
        <button onClick={paused ? resume : pause} disabled={!active} className="w-20 rounded-lg bg-muted/40 text-xs font-bold disabled:opacity-50">{paused ? 'Resume' : 'Pause'}</button>
      </div>
      <div className="min-h-10 text-center text-xs font-bold" aria-live="polite">{result && <p data-through-verdict={result.outcome} className={`${motion.reply} ${result.won ? 'text-emerald-400' : 'text-amber-300'}`}>{result.verdict}</p>}</div>
      <div className="min-h-20 space-y-2 text-center text-xs">
        {phase === 'done' && <>
          <p className="font-bold">{mode === 'practice' ? 'Practice complete. No career reward.' : record.banked ? 'Session banked.' : !canBank ? 'Already trained this season. Today’s result is saved.' : boost > 0 ? `+${boost} ${trains} with next season’s growth.` : record.score >= 50 ? `At your ceiling. No extra ${trains} to add.` : 'Below 50. No stat gain this time.'}</p>
          {mode === 'daily' && (canBank || record.banked) && <button data-through-bank onClick={record.banked ? leave : bank} className="w-full rounded-lg bg-emerald-600 text-black text-sm font-black">{record.banked ? 'Back to drills' : 'Bank the session'}</button>}
          {mode === 'practice' && <button onClick={() => startRun('practice')} className="w-full rounded-lg bg-muted/40 text-sm font-bold">Another practice</button>}
        </>}
      </div>
      <button onClick={changeMode} className="w-full rounded-lg bg-muted/20 text-xs font-bold">Daily / practice menu</button>
    </>}
  </div>;
}
