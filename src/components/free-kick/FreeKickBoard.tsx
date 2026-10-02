import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/game/ShareButtons';
import ArcadeShotFeedback from '@/components/arcade/ArcadeShotFeedback';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Infinity as InfinityIcon, RotateCcw, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useArcadeFlight } from '@/hooks/useArcadeFlight';
import { getTodayET } from '@/lib/dateUtils';
import { readArcadeRun, writeArcadeRun } from '@/lib/arcadeRecord';
import {
  buildRun, daySeed, lehmer, maxRunScore, takeShot, wallSpan,
  ROUNDS_PER_RUN, type KickSetup, type ShotResult,
} from '@/lib/freeKick';
import styles from './FreeKickPractice.module.css';

const SLUG = 'free-kick';
/* The field the count is stored under. It has been `goals` since Round 433 and
   renaming it would throw away the record of anyone who already played today. */
const COUNT_FIELD = 'goals';
type Mode = 'daily' | 'unlimited' | 'practice';
type Phase = 'intro' | 'aiming' | 'flying' | 'kickEnd' | 'done';

/* How long the ball is in the air, in milliseconds. One number, used by the
   drawing and by the timer that settles the kick, so they cannot disagree. */
const FLIGHT_MS = 700;

/* The goalmouth in view units. Everything on screen is derived from these, so
   the drawing and the rules read the same geometry. */
const VIEW_W = 360;
const VIEW_H = 210;
const GOAL_L = 60;
const GOAL_R = 300;
const GOAL_TOP = 34;
const GOAL_BOT = 150;

const toViewX = (x: number) => GOAL_L + ((x + 1) / 2) * (GOAL_R - GOAL_L);
const toViewY = (y: number) => GOAL_BOT - y * (GOAL_BOT - GOAL_TOP);

export default function FreeKickBoard() {
  /* Round 428's rule: the day is pinned at mount and every read, write and
     deal uses it, so a run that crosses midnight ET stays on the day it
     started instead of being filed under tomorrow. */
  const todayStr = useRef(getTodayET()).current;
  const [restored] = useState(() => readArcadeRun(SLUG, todayStr, COUNT_FIELD, ROUNDS_PER_RUN));

  const [mode, setMode] = useState<Mode>('daily');
  const [phase, setPhase] = useState<Phase>(restored ? 'done' : 'intro');
  const [kicks, setKicks] = useState<KickSetup[]>(() => (restored ? buildRun(daySeed(todayStr)) : []));
  const [kickIdx, setKickIdx] = useState(restored ? ROUNDS_PER_RUN - 1 : 0);
  const [score, setScore] = useState(restored?.score ?? 0);
  const [goals, setGoals] = useState(restored?.count ?? 0);
  const [result, setResult] = useState<ShotResult | null>(null);
  const [practiceHelpOpen, setPracticeHelpOpen] = useState(false);
  const practiceOpener = useRef<HTMLButtonElement | null>(null);
  const practiceKick = useRef<HTMLButtonElement | null>(null);
  const aimingRef = useRef(false);
  const { progress: flight, paused, launch, reset: resetFlight, pause, resume } = useArcadeFlight(FLIGHT_MS);

  /* Aim, power and curve: the three things the player actually controls. */
  const [aimX, setAimX] = useState(0);
  const [aimY, setAimY] = useState(0.5);
  const [curve, setCurve] = useState(0);
  const [power, setPower] = useState(0.6);
  const [charging, setCharging] = useState(false);
  const chargingRef = useRef(false);
  const heldPointerRef = useRef<{ id: number; target: Element } | null>(null);

  const clearPointerHold = useCallback(() => {
    const held = heldPointerRef.current;
    heldPointerRef.current = null;
    if (held?.target.hasPointerCapture(held.id)) held.target.releasePointerCapture(held.id);
  }, []);

  useEffect(() => () => {
    chargingRef.current = false;
    clearPointerHold();
  }, [clearPointerHold]);

  const rngRef = useRef<() => number>(lehmer(1));
  const savedRef = useRef(restored !== null);
  const completedDailyRef = useRef(restored);
  const [bookedDaily, setBookedDaily] = useState(restored !== null);

  const setup = kicks[kickIdx] ?? null;
  const isDone = phase === 'done';
  const bookedAlready = mode === 'daily' && bookedDaily;
  useGameCompletion(SLUG, isDone && mode !== 'practice' && !bookedAlready, score, goals);

  const practiceRangeKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (mode === 'practice' && event.key === ' ') event.preventDefault();
  };

  /* The power meter sweeps while the player holds, which is the timing part of
     the input: it is not a slider you set, it is a bar you stop. */
  useEffect(() => {
    if (!charging || paused) return;
    let raised = true;
    const id = window.setInterval(() => {
      if (!chargingRef.current) return;
      setPower(p => {
        if (raised && p >= 0.99) raised = false;
        if (!raised && p <= 0.26) raised = true;
        return Math.max(0.25, Math.min(1, p + (raised ? 0.035 : -0.035)));
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [charging, paused]);

  const start = useCallback((m: Mode) => {
    clearPointerHold();
    aimingRef.current = false;
    chargingRef.current = false;
    setCharging(false);
    const completedDaily = m === 'daily' ? completedDailyRef.current : null;
    setBookedDaily(completedDaily !== null);
    if (completedDaily) {
      savedRef.current = true;
      resetFlight();
      setMode('daily');
      setKicks(buildRun(daySeed(todayStr)));
      setScore(completedDaily.score);
      setGoals(completedDaily.count);
      setPhase('done');
      return;
    }
    const seed = m === 'daily' ? daySeed(todayStr) : Math.floor(Math.random() * 2147483645) + 1;
    rngRef.current = lehmer(seed ^ 0x5eed1234);
    resetFlight();
    setMode(m);
    setKicks(buildRun(seed));
    setKickIdx(0);
    setScore(0);
    setGoals(0);
    setResult(null);
    setAimX(0); setAimY(0.5); setCurve(0); setPower(0.6);
    savedRef.current = false;
    setPhase('aiming');
  }, [restored, todayStr, resetFlight, clearPointerHold]);

  const strike = useCallback(() => {
    if (paused || phase !== 'aiming' || !setup) return;
    chargingRef.current = false;
    setCharging(false);
    const r = takeShot({ x: aimX, y: aimY, power, curve }, setup, rngRef.current);
    setResult(r);
    setPhase('flying');
    /* The flight is drawn from the path the rules already computed, so what
       the player watches is what was scored, never a separate animation. The
       frames and the backup timer live in useArcadeFlight, shared with Buzzer
       Beater since Round 445, along with the reduced motion path. */
    launch(() => {
      setScore(s => s + r.points);
      if (r.scored) setGoals(g => g + 1);
      setPhase('kickEnd');
    });
  }, [paused, phase, setup, aimX, aimY, power, curve, launch]);

  const beginCharge = useCallback(() => {
    if (mode === 'practice') return;
    if (paused || phase !== 'aiming' || document.querySelector('[role="dialog"]')) return;
    chargingRef.current = true;
    setCharging(true);
  }, [mode, paused, phase]);

  const endCharge = useCallback(() => {
    clearPointerHold();
    if (!chargingRef.current) return;
    chargingRef.current = false;
    setCharging(false);
    if (!paused && !document.querySelector('[role="dialog"]')) strike();
  }, [paused, strike, clearPointerHold]);

  const beginPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {
    if (event.button !== 0 || event.isPrimary === false || heldPointerRef.current || chargingRef.current) return;
    beginCharge();
    if (!chargingRef.current) return;
    heldPointerRef.current = { id: event.pointerId, target: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const finishPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {
    if (heldPointerRef.current?.id !== event.pointerId) return;
    endCharge();
  };

  const cancelPointerCharge = (event: ReactPointerEvent<HTMLElement | SVGSVGElement>) => {
    if (heldPointerRef.current?.id !== event.pointerId) return;
    clearPointerHold();
    chargingRef.current = false;
    setCharging(false);
  };

  const togglePause = () => {
    aimingRef.current = false;
    if (paused) resume();
    else {
      clearPointerHold();
      chargingRef.current = false;
      setCharging(false);
      pause();
    }
  };

  const nextKick = useCallback(() => {
    aimingRef.current = false;
    resetFlight();
    if (kickIdx + 1 >= ROUNDS_PER_RUN) { setPhase('done'); return; }
    setKickIdx(i => i + 1);
    setResult(null);
    setAimX(0); setAimY(0.5); setCurve(0); setPower(0.6);
    setPhase('aiming');
  }, [kickIdx, resetFlight]);

  /* Save the finished daily once, so a refresh brings back the score instead
     of dealing the same ten kicks again with the keeper already read. */
  useEffect(() => {
    if (phase !== 'done' || mode !== 'daily' || savedRef.current) return;
    savedRef.current = true;
    completedDailyRef.current = { score, count: goals };
    writeArcadeRun(SLUG, todayStr, COUNT_FIELD, { score, count: goals });
  }, [phase, mode, score, goals, todayStr]);

  /* Keyboard: this is the point of the game, so it is a first class input and
     not an accessibility afterthought. Arrows aim, Q and E bend it, space
     charges and releases. */
  useEffect(() => {
    if (paused || phase !== 'aiming') return;
    const isInteractive = (e: KeyboardEvent) => document.querySelector('[role="dialog"]') ||
      (e.target instanceof Element && e.target.closest('button, a[href], [role="button"], input, textarea, select, [contenteditable="true"]'));
    const down = (e: KeyboardEvent) => {
      if (isInteractive(e)) return;
      if (e.key === 'ArrowLeft') { setAimX(x => Math.max(-1.15, x - 0.06)); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setAimX(x => Math.min(1.15, x + 0.06)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setAimY(y => Math.min(1.1, y + 0.05)); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { setAimY(y => Math.max(0, y - 0.05)); e.preventDefault(); }
      else if (e.key === 'q' || e.key === 'Q') setCurve(c => Math.max(-1, c - 0.12));
      else if (e.key === 'e' || e.key === 'E') setCurve(c => Math.min(1, c + 0.12));
      else if (e.key === ' ' && !e.repeat) { if (mode === 'practice') strike(); else beginCharge(); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (mode === 'practice') return;
      if (e.key !== ' ') return;
      if (isInteractive(e)) { clearPointerHold(); chargingRef.current = false; setCharging(false); return; }
      endCharge();
      e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [mode, paused, phase, beginCharge, endCharge, strike, clearPointerHold]);

  /* Touch and mouse: drag anywhere on the pitch to aim, let go to strike. */
  const pitchRef = useRef<SVGSVGElement | null>(null);
  const pointerAim = (clientX: number, clientY: number) => {
    const el = pitchRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const vx = ((clientX - box.left) / box.width) * VIEW_W;
    const vy = ((clientY - box.top) / box.height) * VIEW_H;
    setAimX(Math.max(-1.15, Math.min(1.15, ((vx - GOAL_L) / (GOAL_R - GOAL_L)) * 2 - 1)));
    setAimY(Math.max(0, Math.min(1.1, (GOAL_BOT - vy) / (GOAL_BOT - GOAL_TOP))));
  };

  const wall = setup ? wallSpan(setup) : null;
  const ball = result && phase !== 'aiming'
    ? result.path[Math.min(result.path.length - 1, Math.round(flight * (result.path.length - 1)))]
    : null;
  const showKeeperDive = result && phase !== 'aiming' ? flight : 0;
  const best = kicks.length ? maxRunScore(kicks) : 0;
  const openPracticeHelp = (node: HTMLButtonElement) => {
    practiceOpener.current = node;
    aimingRef.current = false;
    if (mode === 'practice' && (phase === 'aiming' || phase === 'flying') && !paused) pause();
    setPracticeHelpOpen(true);
  };
  const practiceHelp = (
    <Dialog key="practice-help" open={practiceHelpOpen} onOpenChange={setPracticeHelpOpen}>
      <DialogContent className={`${styles.rules} bg-card border-border rounded-2xl`}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const target = practiceOpener.current?.isConnected ? practiceOpener.current : practiceKick.current;
          target?.focus({ preventScroll: true });
        }}>
        <DialogTitle className="pr-10 font-display text-xl font-black">Steady practice</DialogTitle>
        <DialogDescription>Ten free kicks at your pace. This practice is unrecorded and leaves your daily score alone.</DialogDescription>
        <p className="text-sm">Aim with the arrow keys or tap and drag the pitch. Choose Power and Bend with the sliders, then press Kick or Space. There is no moving power bar to stop.</p>
        <p className="text-sm">The same wall, keeper, shot rules and points still apply. More power can spray the ball wide.</p>
        <p className="text-sm">Example: aim toward a corner, choose 60 power and a little bend, then Kick when you are ready. Waiting does not change your chosen power.</p>
        {paused && <p className="text-sm text-muted-foreground">The run is paused. Close this, then Resume when you are ready.</p>}
        {mode !== 'practice' && <Button className="min-h-[44px]" onClick={() => { setPracticeHelpOpen(false); start('practice'); }}
          onKeyDown={event => { if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }}>Start steady practice</Button>}
      </DialogContent>
    </Dialog>
  );

  if (phase === 'intro') {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <Target className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-2 font-display text-xl font-black text-foreground">Ten free kicks. Pick your corner.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Aim with the arrow keys or drag the pitch, bend it with Q and E, then hold space to
          charge and let go to strike. Power beats the keeper but sprays wide, so the corners are
          worth more than the middle and a smashed one is worth nothing at all.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          The wall gets bigger, the keepers get better and you get further out. Ten kicks, one run.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => start('daily')} className="gap-2">
            <CalendarDays className="h-4 w-4" /> Today's ten
          </Button>
          <Button variant="secondary" onClick={() => start('unlimited')} className="gap-2">
            <InfinityIcon className="h-4 w-4" /> Unlimited
          </Button>
        </div>
        <Button variant="outline" className="mt-3 min-h-[44px]" onClick={event => openPracticeHelp(event.currentTarget)}>Steady practice</Button>
        <p className="mt-2 text-xs text-muted-foreground">Choose your power, then Kick. Unrecorded practice with no release timing.</p>
        {practiceHelp}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', mode === 'practice' && styles.practice)} data-arcade-phase={phase} data-arcade-paused={paused} data-arcade-mode={mode}>
      {mode === 'practice' && <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Steady practice, unrecorded</p>
        <Button variant="secondary" className="min-h-[44px] min-w-[44px]" aria-label="Steady practice rules" onClick={event => openPracticeHelp(event.currentTarget)}>?</Button>
      </div>}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          Kick <b className="text-primary">{Math.min(kickIdx + 1, ROUNDS_PER_RUN)}</b>/{ROUNDS_PER_RUN}
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          Scored <b className="text-primary">{goals}</b>
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          Points <b className="text-gold">{score}</b>
        </span>
        {setup && <span className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">{setup.label}</span>}
      </div>

      {(phase === 'aiming' || phase === 'flying') && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {paused && <p role="status" className="text-sm text-muted-foreground">Paused. Resume when you're ready.</p>}
          <Button variant="secondary" className="min-h-[44px]" data-arcade-pause="" aria-pressed={paused}
            onClick={togglePause} onKeyDown={e => e.stopPropagation()} onKeyUp={e => e.stopPropagation()}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      )}

      <svg
        ref={pitchRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none select-none rounded-2xl border border-border bg-[hsl(140_35%_18%)]"
        role="img"
        tabIndex={mode === 'practice' ? 0 : undefined}
        aria-label={setup ? `Free kick from ${setup.distance} metres with ${setup.wallSize} in the wall` : 'Free kick'}
        onPointerDown={e => {
          if (paused || phase !== 'aiming') return;
          if (mode === 'practice') { pointerAim(e.clientX, e.clientY); aimingRef.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); }
          else { beginPointerCharge(e); if (heldPointerRef.current?.id === e.pointerId) pointerAim(e.clientX, e.clientY); }
        }}
        onPointerMove={e => { if (!paused && phase === 'aiming' && (mode === 'practice' ? aimingRef.current : chargingRef.current && (!heldPointerRef.current || heldPointerRef.current.id === e.pointerId))) pointerAim(e.clientX, e.clientY); }}
        onPointerUp={e => { if (mode === 'practice') { aimingRef.current = false; if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } else finishPointerCharge(e); }}
        onPointerCancel={e => { if (mode === 'practice') aimingRef.current = false; else cancelPointerCharge(e); }}
        onLostPointerCapture={e => { if (e.target === e.currentTarget) { if (mode === 'practice') aimingRef.current = false; else cancelPointerCharge(e); } }}
      >
        {/* grass stripes, so the pitch reads as a pitch */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={i} x={0} y={(VIEW_H / 6) * i} width={VIEW_W} height={VIEW_H / 6}
            fill={i % 2 ? 'hsl(140 35% 20%)' : 'hsl(140 35% 17%)'} />
        ))}
        <rect x={GOAL_L - 26} y={GOAL_TOP - 6} width={GOAL_R - GOAL_L + 52} height={GOAL_BOT - GOAL_TOP + 6}
          fill="none" stroke="hsl(140 20% 40%)" strokeWidth={1} />

        {/* the net */}
        <g opacity={0.5}>
          {Array.from({ length: 13 }, (_, i) => (
            <line key={`v${i}`} x1={GOAL_L + (i * (GOAL_R - GOAL_L)) / 12} y1={GOAL_TOP}
              x2={GOAL_L + (i * (GOAL_R - GOAL_L)) / 12} y2={GOAL_BOT} stroke="hsl(0 0% 85%)" strokeWidth={0.4} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`h${i}`} x1={GOAL_L} y1={GOAL_TOP + (i * (GOAL_BOT - GOAL_TOP)) / 6}
              x2={GOAL_R} y2={GOAL_TOP + (i * (GOAL_BOT - GOAL_TOP)) / 6} stroke="hsl(0 0% 85%)" strokeWidth={0.4} />
          ))}
        </g>
        {/* posts and bar */}
        <line x1={GOAL_L} y1={GOAL_TOP} x2={GOAL_L} y2={GOAL_BOT} stroke="white" strokeWidth={3.5} strokeLinecap="round" />
        <line x1={GOAL_R} y1={GOAL_TOP} x2={GOAL_R} y2={GOAL_BOT} stroke="white" strokeWidth={3.5} strokeLinecap="round" />
        <line x1={GOAL_L} y1={GOAL_TOP} x2={GOAL_R} y2={GOAL_TOP} stroke="white" strokeWidth={3.5} strokeLinecap="round" />

        {/* the wall, jumping as the ball comes */}
        {wall && setup && Array.from({ length: setup.wallSize }, (_, i) => {
          const span = (wall.hi - wall.lo) / setup.wallSize;
          const cx = toViewX(wall.lo + span * (i + 0.5));
          const jump = phase === 'flying' ? Math.sin(Math.min(1, flight * 2.2) * Math.PI) * 9 : 0;
          return (
            <g key={i} transform={`translate(${cx} ${GOAL_BOT + 14 - jump})`}>
              <circle cy={-19} r={4.4} fill="hsl(210 60% 62%)" />
              <rect x={-5} y={-15} width={10} height={16} rx={3} fill="hsl(210 60% 52%)" />
              <rect x={-4.5} y={0} width={3.4} height={9} rx={1.5} fill="hsl(210 40% 40%)" />
              <rect x={1.1} y={0} width={3.4} height={9} rx={1.5} fill="hsl(210 40% 40%)" />
            </g>
          );
        })}

        {/* the keeper: stood on his line until the ball is struck, then diving
            to exactly where the rules said he went */}
        {setup && (() => {
          const restX = toViewX(setup.keeperLean * 0.18);
          const kx = result ? toViewX(result.keeperX) : restX;
          const ky = result ? toViewY(result.keeperY) : GOAL_BOT - 20;
          const x = restX + (kx - restX) * showKeeperDive;
          const y = (GOAL_BOT - 20) + (ky - (GOAL_BOT - 20)) * showKeeperDive;
          const tilt = result ? (result.keeperX < 0 ? -1 : 1) * showKeeperDive * 55 : 0;
          return (
            <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
              <circle cy={-16} r={4.8} fill="hsl(45 90% 62%)" />
              <rect x={-6} y={-12} width={12} height={17} rx={4} fill="hsl(45 85% 52%)" />
              <rect x={-13} y={-10} width={8} height={4} rx={2} fill="hsl(45 85% 62%)" />
              <rect x={5} y={-10} width={8} height={4} rx={2} fill="hsl(45 85% 62%)" />
            </g>
          );
        })()}

        {/* the aim marker and the bend the curve will put on it */}
        {phase === 'aiming' && (
          <>
            <path
              d={`M ${VIEW_W / 2} ${VIEW_H - 12} Q ${VIEW_W / 2 + curve * 60} ${(VIEW_H - 12 + toViewY(aimY)) / 2} ${toViewX(aimX)} ${toViewY(aimY)}`}
              fill="none" stroke="hsl(var(--primary))" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.75}
            />
            <circle cx={toViewX(aimX)} cy={toViewY(aimY)} r={7} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
            <circle cx={toViewX(aimX)} cy={toViewY(aimY)} r={1.6} fill="hsl(var(--primary))" />
          </>
        )}

        {/* the ball, on the exact path the rules scored */}
        <circle
          cx={ball ? toViewX(ball.x) : VIEW_W / 2}
          cy={ball ? toViewY(ball.y) : VIEW_H - 12}
          r={ball ? 4 + flight * 1.6 : 4.5}
          fill="white"
          stroke="hsl(0 0% 55%)"
          strokeWidth={0.7}
        />
      </svg>

      {phase === 'aiming' && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-14 shrink-0">Power</span>
            {mode === 'practice' ? <input type="range" min={0.25} max={1} step={0.01} value={power} disabled={paused}
              onKeyDown={practiceRangeKeyDown}
              onChange={event => { if (!paused) setPower(Number(event.target.value)); }} aria-label="Power" className="min-w-0 flex-1 accent-[hsl(var(--primary))]" /> : <div className="h-3 flex-1 overflow-hidden rounded-full bg-background">
              <div
                className={cn('h-full rounded-full transition-none',
                  power > 0.85 ? 'bg-destructive' : power > 0.6 ? 'bg-gold' : 'bg-primary')}
                style={{ width: `${power * 100}%` }}
              />
            </div>}
            <span className="w-10 shrink-0 text-right tabular-nums">{Math.round(power * 100)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-14 shrink-0">Bend</span>
            <input
              type="range" min={-1} max={1} step={0.04} value={curve}
              disabled={paused}
              onChange={e => { if (!paused) setCurve(Number(e.target.value)); }}
              onKeyDown={practiceRangeKeyDown}
              className="flex-1 accent-[hsl(var(--primary))]"
              aria-label="How much bend to put on the ball"
            />
            <span className="w-10 shrink-0 text-right tabular-nums">{curve > 0.05 ? 'out' : curve < -0.05 ? 'in' : 'none'}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {mode === 'practice' ? <Button ref={practiceKick} className="flex-1" disabled={paused} onClick={strike}
              onKeyDown={event => { event.stopPropagation(); if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault(); }}
              onKeyUp={event => event.stopPropagation()}>Kick</Button> : <Button size="sm" className={cn('flex-1 touch-none', charging && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} disabled={paused}
              onPointerDown={beginPointerCharge} onPointerUp={finishPointerCharge} onPointerCancel={cancelPointerCharge}
              onLostPointerCapture={e => { if (e.target === e.currentTarget) cancelPointerCharge(e); }}
              onKeyDown={e => { e.stopPropagation(); if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); beginCharge(); } }}
              onKeyUp={e => { e.stopPropagation(); if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endCharge(); } }}>
              {charging ? 'Release to strike' : 'Hold to strike'}
            </Button>}
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            {mode === 'practice' ? 'Aim with arrows or tap and drag. Choose Power and Bend, then Kick or press Space.' : 'Arrow keys aim, Q and E bend it, hold space to charge. Or drag the pitch and let go.'}
          </p>
        </div>
      )}

      {phase === 'kickEnd' && result && (
        <ArcadeShotFeedback key={`${mode}-${kickIdx}`} sport="goal" success={result.scored} verdict={result.scored ? 'Goal' : result.verdict} points={result.points}>
          <Button className="mt-3 gap-2" onClick={nextKick}>
            {kickIdx + 1 >= ROUNDS_PER_RUN ? 'See the run' : 'Next kick'}
          </Button>
        </ArcadeShotFeedback>
      )}

      {isDone && (
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <p className="font-display text-2xl font-black text-foreground">{goals} of {ROUNDS_PER_RUN} scored</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {score} points{best ? ` out of a possible ${best}` : ''}.
            {goals >= 8 ? ' Dead ball specialist.' : goals >= 5 ? ' You would take one in a final.' : goals >= 3 ? ' Keep hitting them.' : ' The wall says hello.'}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {mode === 'practice' ? (
              <>
                <Button onClick={() => start('practice')} className="gap-2"><RotateCcw className="h-4 w-4" /> Another steady ten</Button>
                <Button variant="secondary" onClick={() => start('daily')}>Today's ten</Button>
                <Button variant="secondary" onClick={() => start('unlimited')}>Unlimited</Button>
              </>
            ) : mode === 'unlimited' || !restored ? (
              <Button onClick={() => start('unlimited')} className="gap-2"><RotateCcw className="h-4 w-4" /> Another ten</Button>
            ) : (
              <p className="text-xs text-muted-foreground">Come back tomorrow for ten new kicks.</p>
            )}
            {mode !== 'practice' && <ShareButtons
              gameName="Free Kick"
              gamePath="/free-kick"
              score={`${goals}/${ROUNDS_PER_RUN} free kicks for ${score} points`}
              customText={`Free Kick ⚽ ${goals}/${ROUNDS_PER_RUN} scored, ${score} points. douknowball.com/free-kick`}
            />}
            {mode !== 'practice' && <Button variant="outline" className="min-h-[44px]" onClick={event => openPracticeHelp(event.currentTarget)}>Steady practice</Button>}
          </div>
        </div>
      )}
      {practiceHelp}
    </div>
  );
}
