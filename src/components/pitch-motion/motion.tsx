import type { PitchEvent } from '@/components/pitch-motion/contract';
import './pitchMotion.css';
import { useEffect, useRef, useState } from 'react';
import { ACTION_SPAN, NET_AT } from '@/components/pitch-motion/contract';

interface Point { x: number; y: number; }
export interface MotionPlayer extends Point { key: string; name?: string; keeper: boolean; }
/** `arc` is optional: a control point, and the ball arrives at this scene along a curve through it. */
export interface MotionScene<T extends MotionPlayer> { mine: T[]; theirs: T[]; ball: Point; holderKey: string | null; arc?: Point; }
export interface MotionEvent { event: PitchEvent; key: string; at: number; }
export interface Pose { kick?: number; dive?: number; catching?: number; celebrate?: number; hop?: number; }
export interface MotionFrame<T extends MotionPlayer> extends MotionScene<T> {
  poses: Record<string, Pose>;
  action: string;
  net: 'me' | 'opp' | null;
  netPulse: number;
  phase: string;
}
const bounded = (v: number) => Math.max(0, Math.min(1, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const point = (a: Point, b: Point, t: number): Point => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
const smooth = (t: number) => { const p = bounded(t); return p * p * (3 - 2 * p); };

/** Coordinates and poses only. All outcomes arrive in the committed feed. */
export function actionFrame<T extends MotionPlayer>(scene: MotionScene<T>, action: MotionEvent, elapsed: number): MotionFrame<T> {
  const event = action.event;
  const mine = event.side === 'me';
  const attackers = mine ? scene.mine : scene.theirs;
  const defenders = mine ? scene.theirs : scene.mine;
  // Round 1101: a shooter the feed does not name is the man the scene has on the ball, before the first outfield man.
  const striker = attackers.find(p => p.name === event.text) ?? attackers.find(p => p.key === scene.holderKey && !p.keeper) ?? attackers.find(p => !p.keeper);
  const keeper = defenders.find(p => p.keeper);
  const p = bounded(elapsed / 1.05);
  const plant = smooth(p / .24);
  const flight = bounded((p - .24) / .48);
  const resolve = bounded((p - .72) / .28);
  const wing = event.flank === 'left' ? -1 : event.flank === 'right' ? 1 : event.minute % 2 < 1 ? -1 : 1;
  const source = striker ?? scene.ball;
  const spot = { x: event.penalty ? 50 : Math.max(25, Math.min(75, source.x)), y: mine ? (event.penalty ? 20 : event.freeKick ? 30 : 26) : (event.penalty ? 80 : event.freeKick ? 70 : 74) };
  const planted = point(source, spot, plant);
  const end = { x: event.kind === 'shot' ? 50 + wing * 24 : 50 + wing * 7, y: mine ? (event.kind === 'save' ? 8 : 1) : (event.kind === 'save' ? 92 : 99) };
  const foot = { x: planted.x + 1.3, y: planted.y + (mine ? -1 : 1) };
  const ball = flight > 0 ? point({ x: spot.x + 1.3, y: spot.y + (mine ? -1 : 1) }, end, flight) : foot;
  if (flight > 0 && flight < 1) ball.x += Math.sin(flight * Math.PI) * wing * (event.freeKick ? 4 : 1.4);
  const dive = smooth((flight - .1) / .9);
  const keeperEnd = event.kind === 'save' ? end : { x: 50 - wing * 5, y: mine ? 10 : 90 };
  const keeperPosition = keeper ? point(keeper, keeperEnd, dive) : null;
  // Only the committed scorer's side celebrates, after the ball reaches the net.
  const celebration = event.kind === 'goal' && flight === 1 ? smooth(resolve / .55) : 0;
  const teammates = celebration && striker ? attackers.filter(player => !player.keeper && player.key !== striker.key)
    .sort((a, b) => Math.hypot(a.x - planted.x, a.y - planted.y) - Math.hypot(b.x - planted.x, b.y - planted.y)).slice(0, 2) : [];
  // Round 1101: nobody of the shooter's side stands where he plants. Such a man steps six to the side, away from the spot.
  const aside = (player: T): T => striker && attackers.includes(player) && !player.keeper && player.key !== striker.key
    && Math.abs(player.x - spot.x) < 5 && Math.abs(player.y - spot.y) < 4
    ? { ...player, x: player.x + (player.x > spot.x || (player.x === spot.x && wing < 0) ? 6 : -6) * plant } : player;
  const patch = (players: T[]) => players.map(player => player.key === striker?.key ? { ...player, ...planted }
    : player.key === keeper?.key && keeperPosition ? { ...player, ...keeperPosition }
    : teammates.some(teammate => teammate.key === player.key) ? { ...aside(player), ...point(aside(player), planted, celebration * .18) } : aside(player));
  const poses: Record<string, Pose> = {};
  if (striker) poses[striker.key] = { kick: Math.sin(bounded((p - .12) / .24) * Math.PI) };
  if (keeper) poses[keeper.key] = { dive: (event.kind === 'save' ? wing : -wing) * dive * 68, catching: event.kind === 'save' ? dive : 0 };
  if (celebration && striker) {
    poses[striker.key] = { ...poses[striker.key], celebrate: celebration, hop: Math.sin(resolve * Math.PI) * 4 };
    for (const teammate of teammates) poses[teammate.key] = { celebrate: celebration };
  }
  return {
    ...scene, mine: patch(scene.mine), theirs: patch(scene.theirs), ball, holderKey: flight === 0 ? striker?.key ?? null : null,
    poses, action: event.kind, net: event.kind === 'goal' && flight === 1 ? (mine ? 'opp' : 'me') : null,
    netPulse: event.kind === 'goal' ? Math.sin(resolve * Math.PI) : 0,
    phase: flight === 0 ? 'plant' : flight < 1 ? 'flight' : event.kind === 'save' ? 'caught' : event.kind === 'goal' ? 'net' : 'wide',
  };
}

/** Round 1101: two men of one side are never drawn on top of each other mid stride. When their straight
 *  paths pass through each other during a tween, each steps aside along the line of their closest approach.
 *  That line does not turn during a tween, so nobody jumps, and the step is zero at both ends of it. */
function passing<T extends MotionPlayer>(before: T[], after: T[], now: T[], t: number): T[] {
  const ease = Math.min(1, 5 * t, 5 * (1 - t));
  if (ease <= 0) return now;
  const start = after.map(player => before.find(p => p.key === player.key && p.name === player.name) ?? player);
  const raw = now.map(player => ({ x: player.x, y: player.y }));
  for (let i = 0; i < after.length; i++) for (let j = i + 1; j < after.length; j++) {
    const r0 = { x: start[j].x - start[i].x, y: start[j].y - start[i].y };
    const v = { x: after[j].x - after[i].x - r0.x, y: after[j].y - after[i].y - r0.y };
    const speed = Math.hypot(v.x, v.y);
    if (speed < 1e-6) continue;
    const u = { x: v.x / speed, y: v.y / speed };
    const from0 = r0.x * u.x + r0.y * u.y;
    // Only a pair that really passes: the closest approach lies inside this tween.
    if (from0 > 0 || from0 + speed < 0) continue;
    const r = { x: raw[j].x - raw[i].x, y: raw[j].y - raw[i].y };
    const along = r.x * u.x + r.y * u.y;
    if (Math.abs(along) >= 6) continue;
    let n = { x: r.x - along * u.x, y: r.y - along * u.y };
    const gap = Math.hypot(n.x, n.y);
    if (gap >= 3.6) continue;
    n = gap < 1e-6 ? { x: -u.y, y: u.x } : { x: n.x / gap, y: n.y / gap };
    const step = (3.6 - gap) * (Math.abs(along) <= 3.6 ? 1 : (6 - Math.abs(along)) / 2.4) * ease / 2;
    now[i].x -= n.x * step; now[i].y -= n.y * step;
    now[j].x += n.x * step; now[j].y += n.y * step;
  }
  return now;
}

export function between<T extends MotionPlayer>(from: MotionScene<T>, to: MotionScene<T>, t: number): MotionScene<T> {
  const players = (before: T[], after: T[]) => passing(before, after, after.map(player => ({ ...player, ...point(before.find(p => p.key === player.key && p.name === player.name) ?? player, player, t) })), t);
  // Round 1101: a scene that carries an arc is reached along a quadratic curve (a corner's delivery), any other along a line.
  const ball = to.arc ? point(point(from.ball, to.arc, t), point(to.arc, to.ball, t), t) : point(from.ball, to.ball, t);
  return { ...to, mine: players(from.mine, to.mine), theirs: players(from.theirs, to.theirs), ball };
}

/** Uses the viewer's clock, so pausing freezes players, ball and action poses. */
export function useLiveSimMotion<T extends MotionPlayer>(scene: MotionScene<T>, event: MotionEvent | null, clock: number, active: boolean, force?: boolean): MotionFrame<T> {
  const [mediaReduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [travel, setTravel] = useState({ from: scene, to: scene, at: clock });
  const [action, setAction] = useState<{ event: MotionEvent; scene: MotionScene<T> } | null>(null);
  /* Round 1101: a binder may force the still form on or off; left out, the device decides, as before. */
  const reduced = force ?? mediaReduced;
  const current = useRef<MotionScene<T>>(scene);
  const clockRef = useRef(clock);
  useEffect(() => { clockRef.current = clock; });
  useEffect(() => { setTravel({ from: current.current, to: scene, at: clockRef.current }); }, [scene]);
  useEffect(() => { if (event) setAction({ event, scene: current.current }); }, [event]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  const samePlayers = (a: T[], b: T[]) => a.length === b.length && a.every(player => b.some(other => player.key === other.key && player.name === other.name));
  const inAction = active && action && clock - action.event.at <= 1.05
    && samePlayers(action.scene.mine, scene.mine) && samePlayers(action.scene.theirs, scene.theirs);
  const base = reduced ? scene : between(travel.from, travel.to, smooth((clock - travel.at) / .3));
  const frame: MotionFrame<T> = inAction
    ? actionFrame(action.scene, action.event, reduced ? 1.05 : clock - action.event.at)
    : { ...base, poses: {}, action: 'pass', net: null, netPulse: 0, phase: 'pass' };
  useEffect(() => { current.current = frame; });
  return frame;
}

/** Original figures, with no external image or club artwork. */
export function LivePitchPlayer({ color, keeper, pose, selected }: { color: string; keeper: boolean; pose?: Pose; selected?: boolean }) {
  const kick = pose?.kick ?? 0;
  const dive = pose?.dive ?? 0;
  const catching = pose?.catching ?? 0;
  const celebrate = pose?.celebrate ?? 0;
  const hop = pose?.hop ?? 0;
  // At full reach both gloves meet the ball's anchor, at (0, 8) in this view box.
  const reachX = -25 * Math.sin(dive * Math.PI / 180) * catching;
  const reachY = (3 + 25 * Math.cos(dive * Math.PI / 180)) * catching;
  const handY = dive ? -20 : -3 - celebrate * 19;
  const handX = dive ? 5 : 11 + celebrate * 2;
  const armX = dive ? 5 : 10 + celebrate * 3;
  return <svg className="cm-pitch-player" viewBox="-18 -26 36 44" aria-hidden="true" focusable="false" data-cm-actor-pose={celebrate ? 'celebrate' : dive ? 'dive' : kick ? 'strike' : 'stand'}>
    <ellipse cy="12" rx="10" ry="3" fill="#072d3470" />
    {selected && <ellipse cy="11" rx="14" ry="5" fill="none" stroke="#fff" strokeWidth="1.5" />}
    <g transform={`translate(${reachX} ${reachY - hop}) rotate(${dive} 0 5)`} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M-4 0-6 10M4 0 ${5 + kick * 10} ${10 - kick * 15}`} fill="none" stroke="#142b40" strokeWidth="5" />
      <path d={`M-6 10-9 11M${5 + kick * 10} ${10 - kick * 15} ${8 + kick * 10} ${11 - kick * 15}`} stroke="#e8eef2" strokeWidth="3" />
      <path d="M0-13V0" stroke={keeper ? '#f0b34b' : color} strokeWidth="12" />
      <path d={`M-5-12 ${-armX} ${handY}M5-12 ${armX} ${handY}`} fill="none" stroke={keeper ? '#f0b34b' : color} strokeWidth="4" />
      <circle data-cm-glove={keeper && catching ? '1' : undefined} cx={-handX} cy={handY} r="2.6" fill={keeper ? '#fff2d3' : '#bb8669'} />
      <circle data-cm-glove={keeper && catching ? '1' : undefined} cx={handX} cy={handY} r="2.6" fill={keeper ? '#fff2d3' : '#bb8669'} />
      <ellipse cy="-20" rx="5" ry="5.5" fill="#bb8669" /><path d="M-4-23Q0-27 4-23" fill="#23313c" stroke="#23313c" strokeWidth="2" />
    </g>
  </svg>;
}

/** Where a goal's action stands for a binder's own score and card. Null unless the action is a goal:
 *  'windup' until the ball is in the net (at once under reduced motion, where the last frame shows
 *  straight away), 'net' from there to the end of the action, 'over' after it. */
export function goalWindow(action: MotionEvent | null, clock: number, reduced?: boolean): 'windup' | 'net' | 'over' | null {
  if (!action || action.event.kind !== 'goal') return null;
  const since = clock - action.at;
  if (since < (reduced ? 0 : NET_AT)) return 'windup';
  return since <= ACTION_SPAN ? 'net' : 'over';
}
