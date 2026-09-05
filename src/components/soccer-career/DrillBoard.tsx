import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, Infinity as InfinityIcon, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useArcadeFlight } from '@/hooks/useArcadeFlight';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { getTodayET } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import type { CareerState } from '@/lib/soccerCareerEngine';
import {
  DRILL_META, drillForPosition, drillSeed, lehmer, ROUNDS_PER_RUN,
  sessionScore, drillBoost, drillHeadroom,
  buildWallShotRun, takeWallShot, wallGapAt, wallTravel, maxWallShotScore,
  buildTackleRun, makeTackle, tackleFeetAt, tackleBallAt, tackleDeadline, maxTackleScore,
  buildGloveRun, makeSave, gloveAt, gloveBallProgress, gloveDeadline, maxGloveScore,
  GLOVE_MAX_REACH, GLOVE_ORIGIN, GLOVE_HALF_WIDTH, GLOVE_HEIGHT,
  type DrillKind, type WallShotSetup, type WallShotInput, type WallShotResult,
  type TackleSetup, type TackleInput, type TackleResult,
  type GloveSetup, type GloveInput, type GloveResult,
} from '@/lib/careerDrills';

/**
 * Round 468: the drill board. The page owns the clock and the frames and
 * nothing else; every rule is in src/lib/careerDrills.ts, on the arcade
 * engine Free Kick and Buzzer Beater run on, so what the player watches is
 * exactly what was scored.
 *
 * Three drills, one board. The player's position picks which one (keepers
 * dive, the back line and the holding midfielder tackle, everybody else
 * shoots through the wall). Today's ten rounds are the same for everybody at
 * that position and are recorded once in the Round 428 daily record shape;
 * practice is unlimited and banks nothing. Banking is the parent's business
 * (applyDrillResult, through the training ground's one session a season).
 *
 * Reduced motion: the resolve animation is skipped by useArcadeFlight, and
 * the live clock steps at eight frames a second instead of every frame, so
 * the moving parts hop rather than glide but the drill still plays end to
 * end. The press time is read from performance.now() at the event, never
 * from the drawn frame, so timing is exact either way.
 */

type Mode = 'daily' | 'unlimited';
type Phase = 'intro' | 'ready' | 'playing' | 'flying' | 'roundEnd' | 'done';
type AnySetup = WallShotSetup | TackleSetup | GloveSetup;
type AnyInput = WallShotInput | TackleInput | GloveInput;
type AnyResult = WallShotResult | TackleResult | GloveResult;

interface DrillRecord { score: number; count: number; banked: boolean }

/* How long the resolve is drawn for, in milliseconds. */
const FLIGHT_MS = 700;

/* The board in view units, the same frame Free Kick draws in. */
const VIEW_W = 360;
const VIEW_H = 210;
const GOAL_L = 60;
const GOAL_R = 300;
const GOAL_TOP = 34;
const GOAL_BOT = 150;
const toViewX = (x: number) => GOAL_L + ((x + 1) / 2) * (GOAL_R - GOAL_L);
const toViewY = (y: number) => GOAL_BOT - y * (GOAL_BOT - GOAL_TOP);
/* Metres to view units, for the keeper's goal: the frame is 7.32 by 2.44. */
const VX_PER_M = (GOAL_R - GOAL_L) / (2 * GLOVE_HALF_WIDTH);
const VY_PER_M = (GOAL_BOT - GOAL_TOP) / GLOVE_HEIGHT;
const mX = (m: number) => toViewX(m / GLOVE_HALF_WIDTH);
const mY = (m: number) => toViewY(m / GLOVE_HEIGHT);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readRecord(slug: string, today: string): DrillRecord | null {
  return readDailyRecord<DrillRecord>(slug, today, f => {
    if (typeof f.score !== 'number' || !Number.isFinite(f.score)) return null;
    if (typeof f.count !== 'number' || !Number.isFinite(f.count) || f.count < 0 || f.count > ROUNDS_PER_RUN) return null;
    if (typeof f.banked !== 'boolean') return null;
    return { score: f.score, count: f.count, banked: f.banked };
  });
}

function buildRun(kind: DrillKind, seed: number): AnySetup[] {
  if (kind === 'wallshot') return buildWallShotRun(seed);
  if (kind === 'tackle') return buildTackleRun(seed);
  return buildGloveRun(seed);
}

function maxRun(kind: DrillKind, setups: AnySetup[]): number {
  if (kind === 'wallshot') return maxWallShotScore(setups as WallShotSetup[]);
  if (kind === 'tackle') return maxTackleScore(setups as TackleSetup[]);
  return maxGloveScore(setups as GloveSetup[]);
}

/* A player, drawn as shapes: the same figure Free Kick's wall and keeper use. */
function Figure({ x, y, tint, tilt = 0, scale = 1 }: { x: number; y: number; tint: 'wall' | 'keeper' | 'attacker' | 'you'; tilt?: number; scale?: number }) {
  const head = tint === 'wall' ? 'hsl(210 60% 62%)' : tint === 'keeper' ? 'hsl(45 90% 62%)' : tint === 'attacker' ? 'hsl(0 65% 62%)' : 'hsl(150 55% 58%)';
  const body = tint === 'wall' ? 'hsl(210 60% 52%)' : tint === 'keeper' ? 'hsl(45 85% 52%)' : tint === 'attacker' ? 'hsl(0 65% 50%)' : 'hsl(150 55% 46%)';
  const legs = tint === 'wall' ? 'hsl(210 40% 40%)' : tint === 'keeper' ? 'hsl(45 60% 40%)' : tint === 'attacker' ? 'hsl(0 45% 38%)' : 'hsl(150 40% 34%)';
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}>
      <circle cy={-19} r={4.4} fill={head} />
      <rect x={-5} y={-15} width={10} height={16} rx={3} fill={body} />
      <rect x={-4.5} y={0} width={3.4} height={9} rx={1.5} fill={legs} />
      <rect x={1.1} y={0} width={3.4} height={9} rx={1.5} fill={legs} />
    </g>
  );
}

export default function DrillBoard({ career, canBank, onBank, onBack }: {
  career: CareerState;
  /** Whether the training ground still has this season's session to give. */
  canBank: boolean;
  onBank: (kind: DrillKind, count: number) => void;
  onBack: () => void;
}) {
  /* Round 428's rule: the day is pinned at mount and every read, write and
     deal uses it. */
  const todayStr = useRef(getTodayET()).current;
  const kind = drillForPosition(career.position);
  const meta = DRILL_META[kind];
  const [record, setRecord] = useState<DrillRecord | null>(() => readRecord(meta.slug, todayStr));

  const [mode, setMode] = useState<Mode>('daily');
  const [phase, setPhase] = useState<Phase>('intro');
  const [setups, setSetups] = useState<AnySetup[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [count, setCount] = useState(0);
  const [fouls, setFouls] = useState(0);
  const [result, setResult] = useState<AnyResult | null>(null);
  const [input, setInput] = useState<AnyInput | null>(null);
  const { progress: flight, launch, reset: resetFlight } = useArcadeFlight(FLIGHT_MS);
  const rngRef = useRef<() => number>(lehmer(1));
  const savedRef = useRef(false);

  /* The live clock: seconds since the round began, drawn every frame, or
     eight times a second under reduced motion. */
  const startRef = useRef(0);
  const [now, setNow] = useState(0);
  const elapsed = () => (performance.now() - startRef.current) / 1000;

  /* The controls. Wall shot: an aim and a power. Tackle: a cursor for the
     keyboard. Glove save: the drag, in metres. */
  const [aimX, setAimX] = useState(0);
  const [aimY, setAimY] = useState(0.8);
  const [power, setPower] = useState(0.65);
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<SVGSVGElement | null>(null);

  const setup = setups[idx] ?? null;
  const isDone = phase === 'done';
  const best = setups.length ? maxRun(kind, setups) : 0;
  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}-${idx}`);

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let timer = 0;
    const tick = () => { setNow(elapsed()); raf = requestAnimationFrame(tick); };
    if (prefersReducedMotion()) timer = window.setInterval(() => setNow(elapsed()), 125);
    else raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.clearInterval(timer); };
  }, [phase]);

  const resetControls = useCallback(() => {
    setAimX(0); setAimY(0.8); setPower(0.65);
    setCursor({ x: 0.5, y: 0.5 });
    setDrag({ dx: 0, dy: 0 }); setDragging(false); dragStart.current = null;
  }, []);

  const start = useCallback((m: Mode) => {
    if (m === 'daily' && record) {
      savedRef.current = true;
      setMode('daily');
      setSetups(buildRun(kind, drillSeed(kind, todayStr)));
      setIdx(ROUNDS_PER_RUN - 1);
      setScore(record.score);
      setCount(record.count);
      setPhase('done');
      return;
    }
    const seed = m === 'daily' ? drillSeed(kind, todayStr) : Math.floor(Math.random() * 2147483645) + 1;
    rngRef.current = lehmer(seed ^ 0x5eed1234);
    resetFlight();
    setMode(m);
    setSetups(buildRun(kind, seed));
    setIdx(0); setScore(0); setCount(0); setFouls(0);
    setResult(null); setInput(null);
    resetControls();
    savedRef.current = false;
    setPhase('ready');
  }, [record, kind, todayStr, resetFlight, resetControls]);

  const beginRound = useCallback(() => {
    if (phase !== 'ready') return;
    startRef.current = performance.now();
    setNow(0);
    setPhase('playing');
  }, [phase]);

  const resolve = useCallback((inp: AnyInput) => {
    if (phase !== 'playing' || !setup) return;
    let r: AnyResult;
    let won: boolean;
    let foul = false;
    if (kind === 'wallshot') { const w = takeWallShot(inp as WallShotInput, setup as WallShotSetup, rngRef.current); r = w; won = w.won; }
    else if (kind === 'tackle') { const tk = makeTackle(inp as TackleInput, setup as TackleSetup); r = tk; won = tk.won; foul = tk.foul; }
    else { const g = makeSave(inp as GloveInput, setup as GloveSetup); r = g; won = g.saved; }
    setInput(inp);
    setResult(r);
    setDragging(false);
    setPhase('flying');
    launch(() => {
      setScore(s => s + r.points);
      if (won) setCount(c => c + 1);
      if (foul) setFouls(f => f + 1);
      setPhase('roundEnd');
    });
  }, [phase, setup, kind, launch]);

  /* The chance can run out without a press: the attacker leaves the screen,
     the ball crosses the line. */
  useEffect(() => {
    if (phase !== 'playing' || !setup) return;
    if (kind === 'tackle' && now >= tackleDeadline(setup as TackleSetup)) resolve({ x: -1, y: -1, press: tackleDeadline(setup as TackleSetup) });
    else if (kind === 'gloves' && now >= gloveDeadline(setup as GloveSetup)) resolve({ dx: drag.dx, dy: drag.dy, release: gloveDeadline(setup as GloveSetup) + 0.01 });
  }, [now, phase, setup, kind, resolve, drag]);

  const next = useCallback(() => {
    resetFlight();
    if (idx + 1 >= ROUNDS_PER_RUN) { setPhase('done'); return; }
    setIdx(i => i + 1);
    setResult(null); setInput(null);
    resetControls();
    setPhase('ready');
  }, [idx, resetFlight, resetControls]);

  /* Today's run is recorded once, so a refresh brings the score back instead
     of dealing the same ten rounds again with the answers known. */
  useEffect(() => {
    if (phase !== 'done' || mode !== 'daily' || savedRef.current) return;
    savedRef.current = true;
    const rec = { score, count, banked: false };
    writeDailyRecord(meta.slug, todayStr, rec);
    setRecord(rec);
  }, [phase, mode, score, count, meta.slug, todayStr]);

  const bank = useCallback(() => {
    if (!record || record.banked || !canBank) return;
    onBank(kind, record.count);
    const rec = { ...record, banked: true };
    writeDailyRecord(meta.slug, todayStr, rec);
    setRecord(rec);
  }, [record, canBank, onBank, kind, meta.slug, todayStr]);

  /* The three presses. */
  const strike = useCallback(() => resolve({ x: aimX, y: aimY, power, press: elapsed() }), [resolve, aimX, aimY, power]);
  const tackleAt = useCallback((x: number, y: number) => resolve({ x, y, press: elapsed() }), [resolve]);
  const dive = useCallback(() => resolve({ dx: drag.dx, dy: drag.dy, release: elapsed() }), [resolve, drag]);

  /* Keyboard: a first class input, not an afterthought. */
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'ready') return;
    const down = (e: KeyboardEvent) => {
      if (phase === 'ready') { if (e.key === ' ' || e.key === 'Enter') { beginRound(); e.preventDefault(); } return; }
      if (kind === 'wallshot') {
        if (e.key === 'ArrowLeft') { setAimX(x => Math.max(-1.15, x - 0.06)); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { setAimX(x => Math.min(1.15, x + 0.06)); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { setAimY(y => Math.min(1.1, y + 0.05)); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { setAimY(y => Math.max(0, y - 0.05)); e.preventDefault(); }
        else if (e.key === 'w' || e.key === 'W') setPower(p => Math.min(1, p + 0.05));
        else if (e.key === 's' || e.key === 'S') setPower(p => Math.max(0.3, p - 0.05));
        else if (e.key === ' ' && !e.repeat) { strike(); e.preventDefault(); }
      } else if (kind === 'tackle') {
        if (e.key === 'ArrowLeft') { setCursor(c => ({ ...c, x: Math.max(0, c.x - 0.04) })); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { setCursor(c => ({ ...c, x: Math.min(1, c.x + 0.04) })); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { setCursor(c => ({ ...c, y: Math.max(0, c.y - 0.04) })); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { setCursor(c => ({ ...c, y: Math.min(1, c.y + 0.04) })); e.preventDefault(); }
        else if (e.key === ' ' && !e.repeat) { tackleAt(cursor.x, cursor.y); e.preventDefault(); }
      } else {
        const step = 0.35;
        if (e.key === 'ArrowLeft') { setDrag(d => ({ ...d, dx: Math.max(-GLOVE_MAX_REACH, d.dx - step) })); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { setDrag(d => ({ ...d, dx: Math.min(GLOVE_MAX_REACH, d.dx + step) })); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { setDrag(d => ({ ...d, dy: Math.min(GLOVE_MAX_REACH, d.dy + step) })); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { setDrag(d => ({ ...d, dy: Math.max(-1.0, d.dy - step) })); e.preventDefault(); }
        else if (e.key === ' ' && !e.repeat) { dive(); e.preventDefault(); }
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [phase, kind, beginRound, strike, tackleAt, dive, cursor]);

  /* Touch and mouse, on the board itself. */
  const viewPoint = (clientX: number, clientY: number) => {
    const el = boardRef.current;
    if (!el) return null;
    const box = el.getBoundingClientRect();
    return { vx: ((clientX - box.left) / box.width) * VIEW_W, vy: ((clientY - box.top) / box.height) * VIEW_H, scale: box.width / VIEW_W };
  };
  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phase !== 'playing') return;
    const p = viewPoint(e.clientX, e.clientY);
    if (!p) return;
    if (kind === 'wallshot') {
      setAimX(Math.max(-1.15, Math.min(1.15, ((p.vx - GOAL_L) / (GOAL_R - GOAL_L)) * 2 - 1)));
      setAimY(Math.max(0, Math.min(1.1, (GOAL_BOT - p.vy) / (GOAL_BOT - GOAL_TOP))));
      setDragging(true);
    } else if (kind === 'tackle') {
      const x = p.vx / VIEW_W;
      const y = p.vy / VIEW_H;
      setCursor({ x, y });
      tackleAt(x, y);
    } else {
      dragStart.current = { x: e.clientX, y: e.clientY };
      setDrag({ dx: 0, dy: 0 });
      setDragging(true);
    }
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (phase !== 'playing' || !dragging) return;
    const p = viewPoint(e.clientX, e.clientY);
    if (!p) return;
    if (kind === 'wallshot') {
      setAimX(Math.max(-1.15, Math.min(1.15, ((p.vx - GOAL_L) / (GOAL_R - GOAL_L)) * 2 - 1)));
      setAimY(Math.max(0, Math.min(1.1, (GOAL_BOT - p.vy) / (GOAL_BOT - GOAL_TOP))));
    } else if (kind === 'gloves' && dragStart.current) {
      const dxM = ((e.clientX - dragStart.current.x) / p.scale) / VX_PER_M;
      const dyM = -((e.clientY - dragStart.current.y) / p.scale) / VY_PER_M;
      setDrag({ dx: Math.max(-GLOVE_MAX_REACH, Math.min(GLOVE_MAX_REACH, dxM)), dy: Math.max(-1.0, Math.min(GLOVE_MAX_REACH, dyM)) });
    }
  };
  const onUp = () => {
    if (phase !== 'playing' || !dragging) return;
    setDragging(false);
    if (kind === 'wallshot') strike();
    else if (kind === 'gloves') dive();
  };

  /* What moment the board is drawing. Live it is the clock; while the resolve
     plays it runs from the press to the outcome, so the wall the ball reaches
     is the wall the rules scored. */
  let tDraw = phase === 'playing' ? now : 0;
  if ((phase === 'flying' || phase === 'roundEnd') && input && setup) {
    if (kind === 'wallshot') { const w = input as WallShotInput; tDraw = w.press + flight * (wallTravel(w.power) / 0.45); }
    else if (kind === 'tackle') { const tk = input as TackleInput; tDraw = tk.press + flight * 0.45; }
    else { const g = input as GloveInput; const arrival = gloveDeadline(setup as GloveSetup); const from = Math.min(g.release, arrival); tDraw = from + flight * (arrival - from); }
  }

  const headroom = drillHeadroom(career);
  const boost = drillBoost(sessionScore(count), headroom);

  if (phase === 'intro') {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">‹ Drills</button>
          <span className="text-muted-foreground">{career.position} drill</span>
        </div>
        <div className="rounded-2xl border border-border bg-muted/10 p-4 text-center">
          <div className="text-4xl">{meta.emoji}</div>
          <p className="mt-1 text-lg font-black">{meta.name}</p>
          <p className="mx-auto mt-2 max-w-sm text-[12px] text-muted-foreground">
            {kind === 'wallshot' && 'Five in the wall and a gap that opens and closes. Drag the goal to aim across and up, set your power, and let go as the gap opens. Pace gets there sooner and sprays wider. Ten shots.'}
            {kind === 'tackle' && 'He runs across you and every touch pushes the ball off his feet for a moment. Tap the ball, not the man, while it is loose. Tap him, or go through the ball while it sits at his feet, and it is a foul. Ten runs.'}
            {kind === 'gloves' && 'Hold and drag to set your dive: the direction is where you drag, the reach is how far. Let go to dive. A full stretch takes longer to get there than a hop, so the corner has to be left for early. Ten shots.'}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Trains {meta.statLabel}. Today's ten count once, {ROUNDS_PER_RUN / 2} wins pay +1 and 8 pay +2 with next season's growth, never past your ceiling. Practice is free and banks nothing.
          </p>
          {record && (
            <p className="mt-2 text-[11px] font-bold text-sky-300">
              Today: {record.count} of {ROUNDS_PER_RUN} {meta.verb}, {record.score} points{record.banked ? ', banked' : ''}.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => start('daily')} className="flex-1 gap-2">
            <CalendarDays className="h-4 w-4" /> {record ? "Today's result" : "Today's ten"}
          </Button>
          <Button variant="secondary" onClick={() => start('unlimited')} className="flex-1 gap-2">
            <InfinityIcon className="h-4 w-4" /> Practice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold">
        <button onClick={() => { resetFlight(); setPhase('intro'); }} className="text-muted-foreground hover:text-foreground">‹ {meta.name}</button>
        <span>Round {Math.min(idx + 1, ROUNDS_PER_RUN)}/{ROUNDS_PER_RUN}</span>
        <span className="text-emerald-400">{count} {meta.verb}</span>
        <span className="text-amber-300 tabular-nums">{score} pts</span>
      </div>
      {setup && <p className="text-center text-[11px] text-muted-foreground">{setup.label}</p>}

      <svg
        ref={boardRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className={cn('w-full touch-none select-none rounded-2xl border border-border', kind === 'tackle' ? 'bg-[hsl(140_35%_20%)]' : 'bg-[hsl(140_35%_18%)]')}
        role="img"
        aria-label={setup ? `${meta.name}: ${setup.label}` : meta.name}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={i} x={0} y={(VIEW_H / 6) * i} width={VIEW_W} height={VIEW_H / 6} fill={i % 2 ? 'hsl(140 35% 20%)' : 'hsl(140 35% 17%)'} />
        ))}

        {kind !== 'tackle' && (
          <>
            <rect x={GOAL_L - 26} y={GOAL_TOP - 6} width={GOAL_R - GOAL_L + 52} height={GOAL_BOT - GOAL_TOP + 6} fill="none" stroke="hsl(140 20% 40%)" strokeWidth={1} />
            <g opacity={0.5}>
              {Array.from({ length: 13 }, (_, i) => (
                <line key={`v${i}`} x1={GOAL_L + (i * (GOAL_R - GOAL_L)) / 12} y1={GOAL_TOP} x2={GOAL_L + (i * (GOAL_R - GOAL_L)) / 12} y2={GOAL_BOT} stroke="hsl(0 0% 85%)" strokeWidth={0.4} />
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`h${i}`} x1={GOAL_L} y1={GOAL_TOP + (i * (GOAL_BOT - GOAL_TOP)) / 6} x2={GOAL_R} y2={GOAL_TOP + (i * (GOAL_BOT - GOAL_TOP)) / 6} stroke="hsl(0 0% 85%)" strokeWidth={0.4} />
              ))}
            </g>
            <line x1={GOAL_L} y1={GOAL_TOP} x2={GOAL_L} y2={GOAL_BOT} stroke="white" strokeWidth={3.5} strokeLinecap="round" />
            <line x1={GOAL_R} y1={GOAL_TOP} x2={GOAL_R} y2={GOAL_BOT} stroke="white" strokeWidth={3.5} strokeLinecap="round" />
            <line x1={GOAL_L} y1={GOAL_TOP} x2={GOAL_R} y2={GOAL_TOP} stroke="white" strokeWidth={3.5} strokeLinecap="round" />
          </>
        )}

        {/* ── the wall shot ── */}
        {kind === 'wallshot' && setup && (() => {
          const w = setup as WallShotSetup;
          const r = result as WallShotResult | null;
          const gap = wallGapAt(w, tDraw);
          const men: number[] = [];
          for (let k = 0; k < 6; k += 1) {
            const left = w.gapCentre - gap - 0.11 - 0.22 * k;
            const right = w.gapCentre + gap + 0.11 + 0.22 * k;
            if (left > -0.98) men.push(left);
            if (right < 0.98) men.push(right);
          }
          const restX = toViewX(w.keeperLean * 0.18);
          const kx = r ? toViewX(r.keeperX) : restX;
          const ky = r ? toViewY(r.keeperY) : GOAL_BOT - 20;
          const dive = r && phase !== 'playing' ? flight : 0;
          const ball = r && phase !== 'playing' ? r.path[Math.min(r.path.length - 1, Math.round(flight * (r.path.length - 1)))] : null;
          return (
            <>
              <g transform={`translate(${restX + (kx - restX) * dive} ${(GOAL_BOT - 20) + (ky - (GOAL_BOT - 20)) * dive}) rotate(${r ? (r.keeperX < 0 ? -1 : 1) * dive * 55 : 0})`}>
                <circle cy={-16} r={4.8} fill="hsl(45 90% 62%)" />
                <rect x={-6} y={-12} width={12} height={17} rx={4} fill="hsl(45 85% 52%)" />
                <rect x={-13} y={-10} width={8} height={4} rx={2} fill="hsl(45 85% 62%)" />
                <rect x={5} y={-10} width={8} height={4} rx={2} fill="hsl(45 85% 62%)" />
              </g>
              {men.map((m, i) => <Figure key={i} x={toViewX(m)} y={GOAL_BOT + 14} tint="wall" scale={1.35} />)}
              {phase === 'playing' && (
                <>
                  <path d={`M ${VIEW_W / 2} ${VIEW_H - 12} L ${toViewX(aimX)} ${toViewY(aimY)}`} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.4} strokeDasharray="4 4" opacity={0.75} />
                  <circle cx={toViewX(aimX)} cy={toViewY(aimY)} r={7} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <circle cx={toViewX(aimX)} cy={toViewY(aimY)} r={1.6} fill="hsl(var(--primary))" />
                </>
              )}
              <circle cx={ball ? toViewX(ball.x) : VIEW_W / 2} cy={ball ? toViewY(ball.y) : VIEW_H - 12} r={ball ? 4 + flight * 1.6 : 4.5} fill="white" stroke="hsl(0 0% 55%)" strokeWidth={0.7} />
            </>
          );
        })()}

        {/* ── the tackle ── */}
        {kind === 'tackle' && setup && (() => {
          const tk = setup as TackleSetup;
          const r = result as TackleResult | null;
          const inp = input as TackleInput | null;
          const live = phase === 'playing' || phase === 'flying' || phase === 'roundEnd';
          const feet = tackleFeetAt(tk, live ? tDraw : 0);
          const ball = tackleBallAt(tk, live ? tDraw : 0);
          const pressed = inp && inp.x >= 0 ? { x: inp.x * VIEW_W, y: inp.y * VIEW_H } : null;
          return (
            <>
              <line x1={0} y1={VIEW_H * 0.5} x2={VIEW_W} y2={VIEW_H * 0.5} stroke="hsl(0 0% 85%)" strokeWidth={0.6} opacity={0.35} />
              <circle cx={VIEW_W / 2} cy={VIEW_H * 0.5} r={30} fill="none" stroke="hsl(0 0% 85%)" strokeWidth={0.6} opacity={0.35} />
              {/* The figure's feet, not its origin, sit on the rules' feet
                  point, and the ball is drawn exactly where the rules have it:
                  the first draft drew the ball 9 units under the rules' point
                  so it sat at the drawn feet, and a player tapping the ball he
                  could see was 0.043 off in y, the whole reach at the top of
                  the ladder. Measured in the browser pass on 2026-09-05. */}
              <Figure x={feet.x * VIEW_W} y={feet.y * VIEW_H - 11} tint="attacker" tilt={tk.dir * 8} scale={1.3} />
              <circle cx={ball.x * VIEW_W} cy={ball.y * VIEW_H} r={4.5} fill="white" stroke="hsl(0 0% 55%)" strokeWidth={0.7} />
              {phase === 'playing' && (
                <circle cx={cursor.x * VIEW_W} cy={cursor.y * VIEW_H} r={9} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.4} strokeDasharray="3 3" opacity={0.8} />
              )}
              {pressed && (
                <>
                  <line x1={pressed.x} y1={VIEW_H + 10} x2={pressed.x} y2={pressed.y + (VIEW_H + 10 - pressed.y) * (1 - flight)} stroke="hsl(150 55% 58%)" strokeWidth={2} strokeDasharray="5 3" opacity={0.7} />
                  <Figure x={pressed.x} y={pressed.y + (VIEW_H + 10 - pressed.y) * (1 - flight)} tint="you" tilt={-tk.dir * 70 * flight} scale={1.3} />
                  <circle cx={pressed.x} cy={pressed.y} r={10} fill="none" stroke={r?.won ? 'hsl(150 70% 60%)' : r?.foul ? 'hsl(0 80% 60%)' : 'hsl(45 90% 62%)'} strokeWidth={2} />
                </>
              )}
            </>
          );
        })()}

        {/* ── the glove save ── */}
        {kind === 'gloves' && setup && (() => {
          const g = setup as GloveSetup;
          const inp = input as GloveInput | null;
          const r = result as GloveResult | null;
          const live = phase === 'playing' || phase === 'flying' || phase === 'roundEnd';
          const t = live ? tDraw : 0;
          const glove = inp ? gloveAt(inp, t) : { ...GLOVE_ORIGIN };
          const p = gloveBallProgress(g, t);
          const side = g.target.x >= GLOVE_ORIGIN.x ? 1 : -1;
          const tell = live && t >= g.tellAt;
          const strikerX = VIEW_W / 2;
          const strikerY = VIEW_H - 14;
          const tx = mX(g.target.x);
          const ty = mY(g.target.y);
          const ballX = p < 0 ? strikerX : strikerX + (tx - strikerX) * p;
          const ballY = p < 0 ? strikerY - 4 : strikerY - 4 + (ty - (strikerY - 4)) * p - Math.sin(p * Math.PI) * 10;
          const gx = mX(glove.x);
          const gy = mY(glove.y);
          const vecX = mX(GLOVE_ORIGIN.x + drag.dx);
          const vecY = mY(GLOVE_ORIGIN.y + drag.dy);
          return (
            <>
              {/* you, in goal: body at the chest, gloves where the dive has them */}
              <g transform={`translate(${mX(GLOVE_ORIGIN.x)} ${mY(GLOVE_ORIGIN.y) + 14})`}>
                <circle cy={-22} r={5.2} fill="hsl(45 90% 62%)" />
                <rect x={-6.5} y={-17} width={13} height={20} rx={4} fill="hsl(45 85% 52%)" />
                <rect x={-5} y={3} width={4} height={11} rx={1.5} fill="hsl(45 60% 40%)" />
                <rect x={1} y={3} width={4} height={11} rx={1.5} fill="hsl(45 60% 40%)" />
              </g>
              <line x1={mX(GLOVE_ORIGIN.x)} y1={mY(GLOVE_ORIGIN.y)} x2={gx} y2={gy} stroke="hsl(45 85% 62%)" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
              <circle cx={gx} cy={gy} r={r ? r.radius * VX_PER_M : 6} fill="hsl(45 90% 70%)" stroke="hsl(45 60% 35%)" strokeWidth={1} opacity={r ? 0.75 : 0.95} />
              {phase === 'playing' && (drag.dx !== 0 || drag.dy !== 0) && (
                <>
                  <line x1={mX(GLOVE_ORIGIN.x)} y1={mY(GLOVE_ORIGIN.y)} x2={vecX} y2={vecY} stroke="hsl(var(--primary))" strokeWidth={1.6} strokeDasharray="4 4" />
                  <circle cx={vecX} cy={vecY} r={6} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} />
                </>
              )}
              {/* the striker, who shows you the side before he hits it */}
              <Figure x={strikerX + (tell ? side * 6 : 0)} y={strikerY} tint="attacker" tilt={tell ? side * 16 : 0} scale={1.5} />
              {(phase === 'roundEnd' || phase === 'done') && r && !r.saved && (
                <circle cx={tx} cy={ty} r={5} fill="none" stroke="hsl(0 80% 60%)" strokeWidth={1.5} />
              )}
              <circle cx={ballX} cy={ballY} r={p < 0 ? 3.2 : 3.2 + p * 2.6} fill="white" stroke="hsl(0 0% 55%)" strokeWidth={0.7} />
            </>
          );
        })()}
      </svg>

      {/* The card under the board keeps one minimum height across ready and
          playing, because the dialog is centred: when the ready card was
          replaced by a shorter control card the whole dialog re-centred and
          the board jumped 24 pixels the moment the round began, measured on
          2026-09-05 at 390 wide. A timing drill cannot have its board move
          under the thumb that just pressed Start. 132 covers the tallest
          ready card (the wall shot's, three lines at 390 wide). */}
      <div ref={revealRef} className="min-h-[132px]">
        {phase === 'ready' && (
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[12px] text-muted-foreground">
              {kind === 'wallshot' && 'Drag the goal to aim, let go to shoot as the gap opens. Arrow keys aim, W and S set power, space shoots.'}
              {kind === 'tackle' && 'Tap the ball while it is off his feet. Arrow keys move the marker, space goes in.'}
              {kind === 'gloves' && 'Hold and drag to set the dive, let go to go. Arrow keys set it, space dives.'}
            </p>
            <Button className="mt-2" onClick={beginRound}>{idx === 0 ? 'Start' : 'Next one'}</Button>
          </div>
        )}

        {phase === 'playing' && kind === 'wallshot' && (
          <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-14 shrink-0">Power</span>
              <input type="range" min={0.3} max={1} step={0.05} value={power} onChange={e => setPower(Number(e.target.value))}
                className="flex-1 accent-[hsl(var(--primary))]" aria-label="How hard to hit it" />
              <span className={cn('w-10 shrink-0 text-right tabular-nums', power > 0.85 ? 'text-destructive' : power > 0.65 ? 'text-amber-300' : '')}>{Math.round(power * 100)}</span>
            </div>
            <Button size="sm" className="w-full" onClick={strike}>Shoot now</Button>
          </div>
        )}
        {phase === 'playing' && kind === 'tackle' && (
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <Button size="sm" className="w-full" onClick={() => tackleAt(cursor.x, cursor.y)}>Go in at the marker</Button>
          </div>
        )}
        {phase === 'playing' && kind === 'gloves' && (
          <div className="rounded-2xl border border-border bg-card p-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Reach {Math.round(Math.min(1, Math.hypot(drag.dx, drag.dy) / GLOVE_MAX_REACH) * 100)}%{dragging ? ', holding' : ''}
            </p>
            <Button size="sm" className="mt-1 w-full" onClick={dive}>Dive now</Button>
          </div>
        )}

        {phase === 'roundEnd' && result && (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={cn('font-display text-lg font-black', result.points > 0 ? 'text-primary' : 'text-muted-foreground')}>{result.verdict}</p>
            {result.points > 0 && <p className="mt-1 text-sm text-muted-foreground">{result.points} points.</p>}
            <Button className="mt-3" onClick={next}>{idx + 1 >= ROUNDS_PER_RUN ? 'See the session' : 'Next'}</Button>
          </div>
        )}

        {isDone && (
          <div className="rounded-2xl border border-amber-400/50 bg-card p-4 text-center">
            <p className="font-display text-2xl font-black">{count} of {ROUNDS_PER_RUN} {meta.verb}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {score} points{best ? ` of a possible ${best}` : ''}{kind === 'tackle' && fouls > 0 ? `, ${fouls} foul${fouls === 1 ? '' : 's'}` : ''}. Session score {sessionScore(count)}.
            </p>
            {mode === 'daily' ? (
              record?.banked ? (
                <p className="mt-2 text-sm font-bold text-emerald-400">Banked. Come back tomorrow for ten new ones.</p>
              ) : !canBank ? (
                <p className="mt-2 text-[12px] text-muted-foreground">Already trained this season, so there is nothing to bank. Practice stays open.</p>
              ) : boost > 0 ? (
                <Button className="mt-3 w-full bg-emerald-600 text-black hover:bg-emerald-500" onClick={bank}>Bank the session: +{boost} {meta.statLabel}</Button>
              ) : sessionScore(count) >= 50 ? (
                <p className="mt-2 text-[12px] text-muted-foreground">Good session, but you are at your ceiling and there is nothing left to add.</p>
              ) : (
                <p className="mt-2 text-[12px] text-muted-foreground">Under 50, so nothing to bank. {ROUNDS_PER_RUN / 2} wins pays +1. Practice, then try again tomorrow.</p>
              )
            ) : (
              <p className="mt-2 text-[12px] text-muted-foreground">Practice banks nothing. Today's ten are the ones that count.</p>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" className="flex-1 gap-2" onClick={() => start('unlimited')}><RotateCcw className="h-4 w-4" /> Practice again</Button>
              <Button variant="outline" className="flex-1" onClick={onBack}>Back to the drills</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
