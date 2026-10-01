import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useArcadeFlight } from '@/hooks/useArcadeFlight';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { DRILL_META, drillBoost, drillHeadroom, drillSeed, drillStatFor, type DrillKind } from '@/lib/careerDrills';
import { buildFirstTouchRun, firstTouchDeadline, incomingBallAt, outgoingBallAt, takeFirstTouch, TOUCH_CONTACT, TOUCH_DIRECTIONS, TOUCH_GATES, validateFirstTouchRecord, type FirstTouchRecord, type FirstTouchResult, type TouchDirection } from '@/lib/firstTouchDrill';
import type { CareerState } from '@/lib/soccerCareerEngine';
import motion from './FirstTouchBoard.module.css';

type Phase = 'intro' | 'ready' | 'playing' | 'resolve' | 'roundEnd' | 'done';
type Mode = 'daily' | 'practice';
const EMPTY: FirstTouchRecord = { rounds: 0, count: 0, score: 0, banked: false };
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Rules({ trains }: { trains: string }) {
  return <div className="space-y-2 text-xs text-muted-foreground">
    <p>Control ten incoming balls into the marked Left, Center or Right gate. Choose a direction, then Touch as the ball reaches the contact spot. Later contact windows get smaller.</p>
    <p>Each clean touch scores 10. An early, late or wrong-gate touch scores 0. The timer and contact window stay visible, including with reduced motion.</p>
    <p>Use the buttons, or focus the pitch and use Left/Right arrows and Space. Pause freezes the clock. Returning from another tab needs Resume.</p>
    <p>Today&apos;s ten save after every touch and can bank once. Practice is unlimited and never banks. One career session per season: 50 earns +1 {trains}, 80 earns +2, capped by your ceiling, with next season&apos;s growth.</p>
    <p><strong className="text-foreground">Example:</strong> Right gate, arrival 1.50s, window 1.30s to 1.70s. Choose Right and Touch at 1.50s for 10. Left, or a press at 1.00s, misses.</p>
  </div>;
}

export default function FirstTouchBoard({ career, canBank, onBank, onBack }: {
  career: CareerState; canBank: boolean;
  onBank: (kind: DrillKind, count: number) => void; onBack: () => void;
}) {
  const SLUG = DRILL_META.firsttouch.slug;
  /* Round 784: in goal this trains Positioning, the stat the engine pays. */
  const trains = drillStatFor('firsttouch', career.position).label;
  const today = useRef(getTodayET()).current;
  const [daily, setDaily] = useState(() => readDailyRecord(SLUG, today, validateFirstTouchRecord));
  const [mode, setMode] = useState<Mode>('daily');
  const [run, setRun] = useState(() => buildFirstTouchRun(drillSeed('firsttouch', today)));
  const [phase, setPhase] = useState<Phase>('intro');
  const phaseRef = useRef<Phase>('intro');
  const [record, setRecord] = useState<FirstTouchRecord>(EMPTY);
  const recordRef = useRef<FirstTouchRecord>(EMPTY);
  const bankedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<TouchDirection>('center');
  const directionRef = useRef<TouchDirection>('center');
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<FirstTouchResult | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [help, setHelp] = useState(false);
  const helpRef = useRef(false);
  const [reduced, setReduced] = useState(reducedMotion);
  const flight = useArcadeFlight(420);
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
      if (current()) resolveRef.current(Math.max(activeSeconds(), firstTouchDeadline(setup) + 0.001));
    }, Math.max(0, (firstTouchDeadline(setup) - elapsed.current) * 1000) + 1);
  };

  const pause = useCallback(() => {
    if (pausedRef.current || (phaseRef.current !== 'playing' && phaseRef.current !== 'resolve')) return;
    pausedRef.current = true; setPaused(true);
    stopClock(); if (phaseRef.current === 'resolve') flight.pause();
  }, [stopClock, flight.pause]);

  useEffect(() => {
    mounted.current = true;
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', visibility);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => {
      mounted.current = false; reveal.current++; stopClock();
      document.removeEventListener('visibilitychange', visibility);
      media.removeEventListener('change', change);
    };
  }, [pause, stopClock]);

  const save = (next: FirstTouchRecord) => {
    if (mode === 'daily') {
      const newer = readDailyRecord(SLUG, today, validateFirstTouchRecord);
      if (newer && (newer.rounds > next.rounds || newer.banked)) next = newer;
    }
    recordRef.current = next; setRecord(next);
    if (mode === 'daily') { writeDailyRecord(SLUG, today, { ...next }); setDaily(next); }
  };

  resolveRef.current = (press: number) => {
    if (!mounted.current || phaseRef.current !== 'playing' || pausedRef.current || helpRef.current) return;
    if (mode === 'daily' && restoreNewerDaily()) return;
    move('resolve'); stopClock(); setSeconds(press);
    const settled = takeFirstTouch({ direction: directionRef.current, press }, setup);
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
    pausedRef.current = false; setPaused(false);
  };
  const restoreNewerDaily = () => {
    const newer = readDailyRecord(SLUG, today, validateFirstTouchRecord);
    if (!newer || (newer.rounds <= recordRef.current.rounds && !newer.banked)) return false;
    clearRound(); recordRef.current = newer; setRecord(newer); setDaily(newer);
    bankedRef.current = newer.banked; setIndex(Math.min(newer.rounds, 9));
    move(newer.rounds === 10 ? 'done' : 'ready');
    return true;
  };
  const startRun = (nextMode: Mode) => {
    clearRound(); setMode(nextMode);
    const restored = nextMode === 'daily' ? readDailyRecord(SLUG, today, validateFirstTouchRecord) : null;
    const next = restored ?? { ...EMPTY };
    if (nextMode === 'daily') setDaily(restored);
    recordRef.current = next; setRecord(next); bankedRef.current = next.banked;
    setRun(buildFirstTouchRun(nextMode === 'daily' ? drillSeed('firsttouch', today) : Math.floor(Math.random() * 2147483645) + 1));
    setIndex(Math.min(next.rounds, 9));
    directionRef.current = 'center'; setDirection('center');
    move(next.rounds === 10 ? 'done' : 'ready');
  };
  const choose = (next: TouchDirection) => { directionRef.current = next; setDirection(next); };
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
    const stored = readDailyRecord(SLUG, today, validateFirstTouchRecord);
    if (stored?.banked) { bankedRef.current = true; save(stored); return; }
    bankedRef.current = true;
    save({ ...recordRef.current, banked: true });
    onBank('firsttouch', recordRef.current.count);
  };
  const leave = () => { clearRound(); move('intro'); onBack(); };
  const changeMode = () => { clearRound(); move('intro'); };
  const ball = result ? outgoingBallAt(result, reduced ? 1 : flight.progress) : reduced && phase === 'playing' ? TOUCH_CONTACT : incomingBallAt(setup, seconds);
  const inWindow = seconds >= setup.arrival - setup.window && seconds <= firstTouchDeadline(setup);
  const boost = drillBoost(record.score, drillHeadroom(career));
  const active = phase === 'playing' || phase === 'resolve';
  const actionText = phase === 'ready' ? 'Start ball' : phase === 'playing' ? 'Touch' : phase === 'done' ? 'Session complete' : record.rounds === 10 ? 'See session' : 'Next ball';

  return <div className={`p-3 space-y-2 ${motion.board}`} data-first-touch-board data-mode={mode} data-phase={phase}>
    <div className="flex items-center justify-between gap-2">
      <button onClick={leave} className="px-2 text-xs font-bold text-muted-foreground">‹ Drills</button>
      <h3 className="text-sm font-black">👟 First Touch</h3>
      <Dialog open={help} onOpenChange={open => { if (open) pause(); helpRef.current = open; setHelp(open); }}>
        <DialogTrigger asChild><button aria-label="First Touch rules" className="w-11 rounded-lg bg-muted/40 font-black">?</button></DialogTrigger>
        <DialogContent className={`w-[calc(100%-24px)] max-w-sm max-h-[85vh] overflow-y-auto p-5 ${motion.rules}`} onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }}>
          <DialogTitle>First Touch rules</DialogTitle>
          <DialogDescription>Read the gate, then time the contact.</DialogDescription>
          <Rules trains={trains} />
        </DialogContent>
      </Dialog>
    </div>
    {phase === 'intro' ? <div className="space-y-3">
      <Rules trains={trains} />
      {daily && <p className="text-xs font-bold">Today: {daily.count} clean, {daily.rounds}/10 settled{daily.banked ? ', banked' : ''}.</p>}
      <button onClick={() => startRun('daily')} className="w-full rounded-lg bg-emerald-600 px-3 font-black text-black text-sm">{daily?.rounds === 10 ? 'View today’s result' : daily?.rounds ? 'Resume today’s ten' : 'Play today’s ten'}</button>
      <button onClick={() => startRun('practice')} className="w-full rounded-lg bg-muted/40 px-3 text-sm font-bold">Practice, no banking</button>
    </div> : <>
      <div className="flex justify-between gap-2 text-xs font-bold tabular-nums"><span>{mode === 'daily' ? 'Today' : 'Practice'} · Ball {Math.min(index + 1, 10)}/10</span><span data-first-touch-score>{record.score}/100 · {record.count} clean</span></div>
      <div className={motion.field} tabIndex={0} role="group" aria-label="First Touch pitch, Left and Right choose, Space starts or touches" onKeyDown={event => {
        if (event.target !== event.currentTarget || event.repeat || pausedRef.current || helpRef.current) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          if (phaseRef.current === 'ready' || phaseRef.current === 'playing') choose(TOUCH_DIRECTIONS[Math.max(0, Math.min(2, TOUCH_DIRECTIONS.indexOf(directionRef.current) + (event.key === 'ArrowLeft' ? -1 : 1)))]);
        } else if (event.code === 'Space' || event.key === ' ') { event.preventDefault(); action(); }
      }}>
        <svg viewBox="0 0 360 240" className="w-full rounded-xl border border-border" role="img" aria-label={`Marked gate ${titleCase(setup.target)}, contact at ${setup.arrival.toFixed(2)} seconds`} style={{ background: 'linear-gradient(#14532d, #166534)' }}>
          <path d="M18 225V18H342V225Z M18 120H342" fill="none" stroke="white" strokeOpacity=".2" />
          {TOUCH_DIRECTIONS.map(gate => <g key={gate} data-touch-gate={gate} data-target={gate === setup.target}>
            <rect x={TOUCH_GATES[gate].x - 35} y="28" width="70" height="34" rx="5" fill={gate === setup.target ? '#fbbf24' : '#ffffff15'} stroke={gate === setup.target ? '#fde68a' : '#ffffff66'} />
            <text x={TOUCH_GATES[gate].x} y="50" textAnchor="middle" fill={gate === setup.target ? '#111827' : 'white'} fontSize="14" fontWeight="bold">{titleCase(gate)}</text>
          </g>)}
          <path d={`M${setup.start.x} ${setup.start.y}L${TOUCH_CONTACT.x} ${TOUCH_CONTACT.y}`} fill="none" stroke="#ffffff55" strokeDasharray="4 5" />
          <circle cx={TOUCH_CONTACT.x} cy={TOUCH_CONTACT.y} r="16" fill="none" stroke="#fde68a" strokeWidth="3" />
          <circle cx="180" cy="187" r="9" fill="#38bdf8" /><path d="M180 197v19m0-15l-13 12m13-12l13 12" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" />
          <circle data-touch-ball cx={ball.x} cy={ball.y} r="7" fill="white" stroke="#172554" strokeWidth="2" />
        </svg>
      </div>
      <div className="text-center text-xs tabular-nums h-9" data-touch-clock>
        <div className="font-black">{paused ? 'Paused, press Resume' : inWindow && phase === 'playing' ? 'Touch now' : `${seconds.toFixed(2)}s · contact ${setup.arrival.toFixed(2)}s`}</div>
        <div className="text-muted-foreground">Window {(setup.arrival - setup.window).toFixed(2)}s to {firstTouchDeadline(setup).toFixed(2)}s{reduced ? ' · static pitch' : ''}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TOUCH_DIRECTIONS.map(gate => <button key={gate} onClick={() => choose(gate)} disabled={paused || (phase !== 'ready' && phase !== 'playing')} aria-pressed={direction === gate} className={`rounded-lg text-sm font-bold border ${direction === gate ? 'border-amber-300 bg-amber-400/20 text-amber-200' : 'border-border bg-muted/20'} disabled:opacity-50`}>{titleCase(gate)}</button>)}
      </div>
      <div className="flex gap-2">
        <button onClick={action} onKeyDown={event => { if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault(); }} disabled={paused || phase === 'done'} data-touch-action className="flex-1 rounded-lg bg-emerald-600 text-black text-sm font-black disabled:opacity-50">{actionText}</button>
        <button onClick={paused ? resume : pause} disabled={!active} className="w-20 rounded-lg bg-muted/40 text-xs font-bold disabled:opacity-50">{paused ? 'Resume' : 'Pause'}</button>
      </div>
      <div className="min-h-10 text-center text-xs font-bold" aria-live="polite">{result && <p data-touch-verdict={result.won ? 'clean' : 'miss'} className={`${motion.reply} ${result.won ? 'text-emerald-400' : 'text-amber-300'}`}>{result.verdict}</p>}</div>
      <div className="min-h-20 space-y-2 text-center text-xs">
        {phase === 'done' && <>
          <p className="font-bold">{mode === 'practice' ? 'Practice complete. No career reward.' : record.banked ? 'Session banked.' : !canBank ? 'Already trained this season. Today’s result is saved.' : boost > 0 ? `+${boost} ${trains} with next season’s growth.` : record.score >= 50 ? `At your ceiling. No extra ${trains} to add.` : 'Below 50. No stat gain this time.'}</p>
          {mode === 'daily' && (canBank || record.banked) && <button data-touch-bank onClick={record.banked ? leave : bank} className="w-full rounded-lg bg-emerald-600 text-black text-sm font-black">{record.banked ? 'Back to drills' : 'Bank the session'}</button>}
          {mode === 'practice' && <button onClick={() => startRun('practice')} className="w-full rounded-lg bg-muted/40 text-sm font-bold">Another practice</button>}
        </>}
      </div>
      <button onClick={changeMode} className="w-full rounded-lg bg-muted/20 text-xs font-bold">Daily / practice menu</button>
    </>}
  </div>;
}
