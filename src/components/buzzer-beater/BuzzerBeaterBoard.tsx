import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/game/ShareButtons';
import { CalendarDays, Infinity as InfinityIcon, RotateCcw, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useArcadeFlight } from '@/hooks/useArcadeFlight';
import { getTodayET } from '@/lib/dateUtils';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { readArcadeRun, writeArcadeRun } from '@/lib/arcadeRecord';
import {
  buildRun, daySeed, lehmer, launchDegFor, maxRunScore, takeShot,
  BALL_RADIUS, RELEASE_HEIGHT, RIM_HEIGHT, RIM_RADIUS, ROUNDS_PER_RUN,
  type HoopSetup, type HoopResult,
} from '@/lib/buzzerBeater';

const SLUG = 'buzzer-beater';
/* The field the count is stored under. Free Kick stores `goals`; this stores
   `made`. The shape is shared (src/lib/arcadeRecord.ts), the word is the
   sport's. */
const COUNT_FIELD = 'made';
type Mode = 'daily' | 'unlimited';
type Phase = 'intro' | 'aiming' | 'flying' | 'shotEnd' | 'done';

/* How long the ball is in the air, in milliseconds. One number, used by the
   drawing and by the timer that settles the shot, so they cannot disagree. */
const FLIGHT_MS = 780;

/* The court in view units. Everything on screen comes off these, so the
   drawing and the rules read the same geometry: a side elevation, the shooter
   on the left at zero and the ring wherever this shot's distance puts it. */
const VIEW_W = 360;
const VIEW_H = 210;
const FLOOR_Y = 190;
const COURT_M = 9.6;
const PX_PER_M_X = (340 - 26) / COURT_M;
const PX_PER_M_Y = 40;
/** The top of the NBA three point arc, 23 feet 9 inches from the centre of
 *  the basket, drawn as a mark on the floor so distance reads at a glance. */
const ARC_M = 7.24;

const toX = (m: number) => 26 + m * PX_PER_M_X;
const toY = (h: number) => FLOOR_Y - h * PX_PER_M_Y;

/* The ring seen down the line of the shot, drawn in the corner. It is the only
   place the side to side miss is visible, so it doubles as the aim readout
   while the player is lining the shot up. */
const INSET_CX = 306;
const INSET_CY = 46;
const INSET_PX_PER_M = 78;

export default function BuzzerBeaterBoard() {
  /* Round 428's rule: the day is pinned at mount and every read, write and
     deal uses it, so a run that crosses midnight ET stays on the day it
     started instead of being filed under tomorrow. */
  const todayStr = useRef(getTodayET()).current;
  const [restored] = useState(() => readArcadeRun(SLUG, todayStr, COUNT_FIELD, ROUNDS_PER_RUN));

  const [mode, setMode] = useState<Mode>('daily');
  const [phase, setPhase] = useState<Phase>(restored ? 'done' : 'intro');
  const [shots, setShots] = useState<HoopSetup[]>(() => (restored ? buildRun(daySeed(todayStr)) : []));
  const [shotIdx, setShotIdx] = useState(restored ? ROUNDS_PER_RUN - 1 : 0);
  const [score, setScore] = useState(restored?.score ?? 0);
  const [made, setMade] = useState(restored?.count ?? 0);
  const [result, setResult] = useState<HoopResult | null>(null);
  const { progress: flight, launch, reset: resetFlight } = useArcadeFlight(FLIGHT_MS);

  /* Fade, arc and strength: the three things the player actually controls. */
  const [fade, setFade] = useState(0);
  const [arc, setArc] = useState(0.6);
  const [power, setPower] = useState(0.4);
  const [charging, setCharging] = useState(false);

  const rngRef = useRef<() => number>(lehmer(1));
  const savedRef = useRef(restored !== null);

  const setup = shots[shotIdx] ?? null;
  const isDone = phase === 'done';
  const bookedAlready = mode === 'daily' && restored !== null;
  useGameCompletion(SLUG, isDone && !bookedAlready, score, made);

  /* The strength bar sweeps while the player holds, which is the timing part of
     the input: it is not a slider you set, it is a bar you stop. It is absolute
     rather than a percentage of what this shot needs, so where you have to stop
     it moves with every shot. */
  useEffect(() => {
    if (!charging) return;
    let rising = true;
    const id = window.setInterval(() => {
      setPower(p => {
        if (rising && p >= 0.99) rising = false;
        if (!rising && p <= 0.02) rising = true;
        return Math.max(0, Math.min(1, p + (rising ? 0.026 : -0.026)));
      });
    }, 16);
    return () => window.clearInterval(id);
  }, [charging]);

  const start = useCallback((m: Mode) => {
    if (m === 'daily' && restored) {
      markRestoredFinish(SLUG);
      setMode('daily');
      setShots(buildRun(daySeed(todayStr)));
      setScore(restored.score);
      setMade(restored.count);
      setPhase('done');
      return;
    }
    const seed = m === 'daily' ? daySeed(todayStr) : Math.floor(Math.random() * 2147483645) + 1;
    rngRef.current = lehmer(seed ^ 0x5eed1234);
    resetFlight();
    setMode(m);
    setShots(buildRun(seed));
    setShotIdx(0);
    setScore(0);
    setMade(0);
    setResult(null);
    setFade(0); setArc(0.6); setPower(0.4);
    savedRef.current = false;
    setPhase('aiming');
  }, [restored, todayStr, resetFlight]);

  const release = useCallback(() => {
    if (phase !== 'aiming' || !setup) return;
    setCharging(false);
    const r = takeShot({ x: fade, arc, power }, setup, rngRef.current);
    setResult(r);
    setPhase('flying');
    /* The flight is drawn from the path the rules already computed, so what the
       player watches is what was scored, never a separate animation. The frames
       and the backup timer live in useArcadeFlight, shared with Free Kick. */
    launch(() => {
      setScore(s => s + r.points);
      if (r.made) setMade(n => n + 1);
      setPhase('shotEnd');
    });
  }, [phase, setup, fade, arc, power, launch]);

  const nextShot = useCallback(() => {
    resetFlight();
    if (shotIdx + 1 >= ROUNDS_PER_RUN) { setPhase('done'); return; }
    setShotIdx(i => i + 1);
    setResult(null);
    setFade(0); setArc(0.6); setPower(0.4);
    setPhase('aiming');
  }, [shotIdx, resetFlight]);

  /* Save the finished daily once, so a refresh brings back the score instead of
     dealing the same ten shots again with the answers already known. */
  useEffect(() => {
    if (phase !== 'done' || mode !== 'daily' || savedRef.current) return;
    savedRef.current = true;
    writeArcadeRun(SLUG, todayStr, COUNT_FIELD, { score, count: made });
  }, [phase, mode, score, made, todayStr]);

  /* Keyboard: this is the point of the game, so it is a first class input and
     not an accessibility afterthought. Left and right fade, up and down set the
     arc, space charges and releases. */
  useEffect(() => {
    if (phase !== 'aiming') return;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { setFade(f => Math.max(-1, f - 0.06)); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { setFade(f => Math.min(1, f + 0.06)); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { setArc(a => Math.min(1, a + 0.04)); e.preventDefault(); }
      else if (e.key === 'ArrowDown') { setArc(a => Math.max(0, a - 0.04)); e.preventDefault(); }
      else if (e.key === ' ' && !e.repeat) { setCharging(true); e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { if (e.key === ' ') { setCharging(false); release(); e.preventDefault(); } };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [phase, release]);

  /* Touch and mouse: drag the court to set the arc and the fade, let go to
     shoot. Up and down is the arc, which is literally what you see; left and
     right is the fade, which shows in the ring inset. */
  const courtRef = useRef<SVGSVGElement | null>(null);
  const pointerAim = (clientX: number, clientY: number) => {
    const el = courtRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const px = (clientX - box.left) / box.width;
    const py = (clientY - box.top) / box.height;
    setFade(Math.max(-1, Math.min(1, (px - 0.5) * 2.4)));
    setArc(Math.max(0, Math.min(1, 1 - py * 1.35)));
  };

  const best = shots.length ? maxRunScore(shots) : 0;
  const ball = result && phase !== 'aiming'
    ? result.path[Math.min(result.path.length - 1, Math.round(flight * (result.path.length - 1)))]
    : null;

  /* The dashed line the player lines up with: the flight this release would
     take with no spray on it, drawn from the same parabola the rules use. */
  const preview: Array<{ x: number; y: number }> = [];
  if (phase === 'aiming' && setup) {
    const clean = takeShot({ x: fade, arc, power }, setup, () => 0.5);
    for (const p of clean.path) preview.push(p);
  }

  if (phase === 'intro') {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <Target className="mx-auto h-10 w-10 text-primary" />
        <p className="mt-2 font-display text-xl font-black text-foreground">Ten shots. The horn on every one.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Set the arc with the up and down arrows, fade off the hand with left and right, then
          hold space to load the shot and let go. The ring is a hole you drop the ball into, so a
          flat one has almost nothing to go through and a high one has room.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          You back up every shot and the closeout gets higher. Ten shots, one run.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => start('daily')} className="gap-2">
            <CalendarDays className="h-4 w-4" /> Today's ten
          </Button>
          <Button variant="secondary" onClick={() => start('unlimited')} className="gap-2">
            <InfinityIcon className="h-4 w-4" /> Unlimited
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          Shot <b className="text-primary">{Math.min(shotIdx + 1, ROUNDS_PER_RUN)}</b>/{ROUNDS_PER_RUN}
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          Made <b className="text-primary">{made}</b>
        </span>
        <span className="rounded-full border border-border bg-card px-3 py-1.5">
          Points <b className="text-gold">{score}</b>
        </span>
        {setup && <span className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">{setup.label}</span>}
      </div>

      <svg
        ref={courtRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full touch-none select-none rounded-2xl border border-border bg-[hsl(28_35%_16%)]"
        role="img"
        aria-label={setup ? `Jump shot from ${setup.distance} metres with a ${setup.contestReach ? `${setup.contestReach} metre` : 'no'} contest` : 'Jump shot'}
        onPointerDown={e => { if (phase === 'aiming') { pointerAim(e.clientX, e.clientY); setCharging(true); } }}
        onPointerMove={e => { if (phase === 'aiming' && charging) pointerAim(e.clientX, e.clientY); }}
        onPointerUp={() => { if (phase === 'aiming') { setCharging(false); release(); } }}
      >
        {/* the floor, with a metre tick every two metres so distance reads */}
        <rect x={0} y={FLOOR_Y} width={VIEW_W} height={VIEW_H - FLOOR_Y} fill="hsl(28 40% 22%)" />
        <line x1={0} y1={FLOOR_Y} x2={VIEW_W} y2={FLOOR_Y} stroke="hsl(28 25% 45%)" strokeWidth={1.2} />
        {[2, 4, 6, 8].map(m => (
          <line key={m} x1={toX(m)} y1={FLOOR_Y} x2={toX(m)} y2={FLOOR_Y + 5} stroke="hsl(28 25% 45%)" strokeWidth={1} />
        ))}
        <line x1={toX(ARC_M)} y1={FLOOR_Y - 5} x2={toX(ARC_M)} y2={FLOOR_Y + 8} stroke="hsl(45 80% 60%)" strokeWidth={1.2} opacity={0.8} />
        <text x={toX(ARC_M)} y={FLOOR_Y + 17} textAnchor="middle" fontSize={7} fill="hsl(45 60% 62%)">NBA arc 7.24 m</text>

        {setup && (
          <>
            {/* the backboard and the ring, drawn to scale from the real sizes */}
            <line
              x1={toX(setup.distance + 0.381)} y1={toY(3.95)}
              x2={toX(setup.distance + 0.381)} y2={toY(2.9)}
              stroke="hsl(0 0% 88%)" strokeWidth={2.6}
            />
            <line
              x1={toX(setup.distance - RIM_RADIUS)} y1={toY(RIM_HEIGHT)}
              x2={toX(setup.distance + RIM_RADIUS)} y2={toY(RIM_HEIGHT)}
              stroke="hsl(18 85% 55%)" strokeWidth={3.2} strokeLinecap="round"
            />
            <path
              d={`M ${toX(setup.distance - RIM_RADIUS)} ${toY(RIM_HEIGHT)} Q ${toX(setup.distance)} ${toY(RIM_HEIGHT - 0.42)} ${toX(setup.distance + RIM_RADIUS)} ${toY(RIM_HEIGHT)}`}
              fill="none" stroke="hsl(0 0% 82%)" strokeWidth={0.8} opacity={0.6}
            />
            <line
              x1={toX(setup.distance + 0.381)} y1={toY(2.9)}
              x2={toX(setup.distance + 0.381)} y2={FLOOR_Y}
              stroke="hsl(0 0% 55%)" strokeWidth={2}
            />

            {/* the closeout: a body and a hand that really does reach that high */}
            {setup.contestReach > 0 && (
              <g>
                <line
                  x1={toX(setup.contestDist)} y1={FLOOR_Y}
                  x2={toX(setup.contestDist)} y2={toY(setup.contestReach - 0.55)}
                  stroke="hsl(210 55% 52%)" strokeWidth={7} strokeLinecap="round"
                />
                <circle cx={toX(setup.contestDist)} cy={toY(setup.contestReach - 0.42)} r={4.4} fill="hsl(210 60% 64%)" />
                <line
                  x1={toX(setup.contestDist)} y1={toY(setup.contestReach - 0.5)}
                  x2={toX(setup.contestDist + 0.12)} y2={toY(setup.contestReach)}
                  stroke="hsl(210 60% 64%)" strokeWidth={4} strokeLinecap="round"
                />
              </g>
            )}

            {/* the shooter */}
            <line x1={toX(0)} y1={FLOOR_Y} x2={toX(0)} y2={toY(1.55)} stroke="hsl(45 80% 55%)" strokeWidth={7} strokeLinecap="round" />
            <circle cx={toX(0)} cy={toY(1.72)} r={4.6} fill="hsl(45 85% 65%)" />
            <line x1={toX(0)} y1={toY(1.6)} x2={toX(0.1)} y2={toY(RELEASE_HEIGHT)} stroke="hsl(45 85% 65%)" strokeWidth={4} strokeLinecap="round" />
          </>
        )}

        {/* the shape this release would take, so the arc is something you aim
            rather than something you guess */}
        {phase === 'aiming' && preview.length > 1 && (
          <path
            d={preview.map((p, i) => `${i ? 'L' : 'M'} ${toX(p.x)} ${toY(p.y)}`).join(' ')}
            fill="none" stroke="hsl(var(--primary))" strokeWidth={1.3} strokeDasharray="4 5" opacity={0.7}
          />
        )}

        {/* the ball, on the exact path the rules scored */}
        <circle
          cx={ball ? toX(ball.x) : toX(0.1)}
          cy={ball ? toY(ball.y) : toY(RELEASE_HEIGHT)}
          r={BALL_RADIUS * PX_PER_M_X}
          fill="hsl(24 85% 55%)"
          stroke="hsl(20 40% 25%)"
          strokeWidth={0.8}
        />

        {/* The ring down the line of the shot: the only place a side to side
            miss is visible, so it is the aim readout too. The ball is drawn at
            its real size against the ring's real size, because how little room
            there is in there is the whole point of the game. */}
        <g>
          <circle cx={INSET_CX} cy={INSET_CY} r={34} fill="hsl(28 30% 12%)" stroke="hsl(28 20% 32%)" strokeWidth={1} />
          <circle cx={INSET_CX} cy={INSET_CY} r={RIM_RADIUS * INSET_PX_PER_M} fill="none" stroke="hsl(18 85% 55%)" strokeWidth={2} />
          {result && phase !== 'aiming' && result.depthWindow > 0 && (
            <ellipse
              cx={INSET_CX} cy={INSET_CY}
              rx={result.lateralWindow * INSET_PX_PER_M}
              ry={result.depthWindow * INSET_PX_PER_M}
              fill="none" stroke="hsl(var(--primary))" strokeWidth={0.8} strokeDasharray="2 2" opacity={0.7}
            />
          )}
          <circle
            cx={INSET_CX + (result && phase !== 'aiming' ? result.lateral : fade * 0.3) * INSET_PX_PER_M}
            cy={INSET_CY - (result && phase !== 'aiming' ? Math.max(-0.34, Math.min(0.34, result.depth)) : 0) * INSET_PX_PER_M}
            r={BALL_RADIUS * INSET_PX_PER_M}
            fill="none"
            stroke={result && phase !== 'aiming' ? (result.made ? 'hsl(var(--primary))' : 'hsl(0 0% 85%)') : 'hsl(var(--primary))'}
            strokeWidth={1.6}
            opacity={0.9}
          />
          <text x={INSET_CX} y={INSET_CY + 46} textAnchor="middle" fontSize={7} fill="hsl(28 15% 62%)">
            {result && phase !== 'aiming' ? 'where it crossed' : 'where you are aiming'}
          </text>
        </g>
      </svg>

      {phase === 'aiming' && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-14 shrink-0">Strength</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-background">
              <div
                className={cn('h-full rounded-full transition-none',
                  power > 0.82 ? 'bg-destructive' : power > 0.55 ? 'bg-gold' : 'bg-primary')}
                style={{ width: `${power * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right tabular-nums">{Math.round(power * 100)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-14 shrink-0">Arc</span>
            <input
              type="range" min={0} max={1} step={0.02} value={arc}
              onChange={e => setArc(Number(e.target.value))}
              className="flex-1 accent-[hsl(var(--primary))]"
              aria-label="How high to put the arc on the shot"
            />
            <span className="w-10 shrink-0 text-right tabular-nums">{Math.round(launchDegFor(arc))}&deg;</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-14 shrink-0">Fade</span>
            <input
              type="range" min={-1} max={1} step={0.04} value={fade}
              onChange={e => setFade(Number(e.target.value))}
              className="flex-1 accent-[hsl(var(--primary))]"
              aria-label="How far to fade off the closeout"
            />
            <span className="w-10 shrink-0 text-right tabular-nums">{fade > 0.05 ? 'right' : fade < -0.05 ? 'left' : 'square'}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" className="flex-1" onMouseDown={() => setCharging(true)} onMouseUp={() => { setCharging(false); release(); }}
              onTouchStart={e => { e.preventDefault(); setCharging(true); }} onTouchEnd={e => { e.preventDefault(); setCharging(false); release(); }}>
              Hold to shoot
            </Button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">
            Up and down set the arc, left and right fade off the hand, hold space to load it. Or drag the court and let go.
          </p>
        </div>
      )}

      {phase === 'shotEnd' && result && (
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className={cn('font-display text-lg font-black', result.made ? 'text-primary' : 'text-muted-foreground')}>
            {result.verdict}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Came in at {Math.round(result.entryDeg)}&deg;
            {result.depthWindow > 0
              ? `, so you had ${Math.round(result.depthWindow * 100)} cm of room short or long.`
              : ', which is too flat for the ball to fit through at all.'}
          </p>
          {result.made && <p className="mt-1 text-sm text-muted-foreground">{result.points} points.</p>}
          <Button className="mt-3 gap-2" onClick={nextShot}>
            {shotIdx + 1 >= ROUNDS_PER_RUN ? 'See the run' : 'Next shot'}
          </Button>
        </div>
      )}

      {isDone && (
        <div className="rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <p className="font-display text-2xl font-black text-foreground">{made} of {ROUNDS_PER_RUN} made</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {score} points{best ? ` out of a possible ${best}` : ''}.
            {made >= 8 ? ' Cold blooded.' : made >= 6 ? ' You would take that shot again.' : made >= 3 ? ' Keep firing.' : ' Long night at the office.'}
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {mode === 'unlimited' || !restored ? (
              <Button onClick={() => start('unlimited')} className="gap-2"><RotateCcw className="h-4 w-4" /> Another ten</Button>
            ) : (
              <p className="text-xs text-muted-foreground">Come back tomorrow for ten new shots.</p>
            )}
            <ShareButtons
              gameName="Buzzer Beater"
              gamePath="/buzzer-beater"
              score={`${made}/${ROUNDS_PER_RUN} shots for ${score} points`}
              customText={`Buzzer Beater 🏀 ${made}/${ROUNDS_PER_RUN} made, ${score} points. douknowball.com/buzzer-beater`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
