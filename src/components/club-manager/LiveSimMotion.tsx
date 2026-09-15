import { useEffect, useRef, useState } from 'react';
import type { LiveFeedEvent } from '@/lib/clubManager';
import './LiveSimMotion.css';

interface Point { x: number; y: number; }
export interface MotionPlayer extends Point { key: string; name?: string; keeper: boolean; }
export interface MotionScene<T extends MotionPlayer> { mine: T[]; theirs: T[]; ball: Point; holderKey: string | null; }
export interface MotionEvent { event: LiveFeedEvent; key: string; at: number; }
interface Pose { kick?: number; dive?: number; catching?: number; }
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
  const striker = attackers.find(p => p.name === event.text) ?? attackers.find(p => !p.keeper);
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
  const patch = (players: T[]) => players.map(player => player.key === striker?.key ? { ...player, ...planted } : player.key === keeper?.key && keeperPosition ? { ...player, ...keeperPosition } : player);
  const poses: Record<string, Pose> = {};
  if (striker) poses[striker.key] = { kick: Math.sin(bounded((p - .12) / .24) * Math.PI) };
  if (keeper) poses[keeper.key] = { dive: (event.kind === 'save' ? wing : -wing) * dive * 68, catching: event.kind === 'save' ? dive : 0 };
  return {
    ...scene, mine: patch(scene.mine), theirs: patch(scene.theirs), ball, holderKey: flight === 0 ? striker?.key ?? null : null,
    poses, action: event.kind, net: event.kind === 'goal' && flight === 1 ? (mine ? 'opp' : 'me') : null,
    netPulse: event.kind === 'goal' ? Math.sin(resolve * Math.PI) : 0,
    phase: flight === 0 ? 'plant' : flight < 1 ? 'flight' : event.kind === 'save' ? 'caught' : event.kind === 'goal' ? 'net' : 'wide',
  };
}

function between<T extends MotionPlayer>(from: MotionScene<T>, to: MotionScene<T>, t: number): MotionScene<T> {
  const players = (before: T[], after: T[]) => after.map(player => ({ ...player, ...point(before.find(p => p.key === player.key && p.name === player.name) ?? player, player, t) }));
  return { ...to, mine: players(from.mine, to.mine), theirs: players(from.theirs, to.theirs), ball: point(from.ball, to.ball, t) };
}

/** Uses the viewer's clock, so pausing freezes players, ball and action poses. */
export function useLiveSimMotion<T extends MotionPlayer>(scene: MotionScene<T>, event: MotionEvent | null, clock: number, active: boolean): MotionFrame<T> {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [travel, setTravel] = useState({ from: scene, to: scene, at: clock });
  const [action, setAction] = useState<{ event: MotionEvent; scene: MotionScene<T> } | null>(null);
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
  // At full reach both gloves meet the ball's anchor, at (0, 8) in this view box.
  const reachX = -25 * Math.sin(dive * Math.PI / 180) * catching;
  const reachY = (3 + 25 * Math.cos(dive * Math.PI / 180)) * catching;
  return <svg className="cm-pitch-player" viewBox="-18 -26 36 44" aria-hidden="true" focusable="false" data-cm-actor-pose={dive ? 'dive' : kick ? 'strike' : 'stand'}>
    <ellipse cy="12" rx="10" ry="3" fill="#072d3470" />
    {selected && <ellipse cy="11" rx="14" ry="5" fill="none" stroke="#fff" strokeWidth="1.5" />}
    <g transform={`translate(${reachX} ${reachY}) rotate(${dive} 0 5)`} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M-4 0-6 10M4 0 ${5 + kick * 10} ${10 - kick * 15}`} fill="none" stroke="#142b40" strokeWidth="5" />
      <path d={`M-6 10-9 11M${5 + kick * 10} ${10 - kick * 15} ${8 + kick * 10} ${11 - kick * 15}`} stroke="#e8eef2" strokeWidth="3" />
      <path d="M0-13V0" stroke={keeper ? '#f0b34b' : color} strokeWidth="12" />
      <path d={dive ? 'M-5-12-5-20M5-12 5-20' : 'M-5-12-10-3M5-12 10-3'} fill="none" stroke={keeper ? '#f0b34b' : color} strokeWidth="4" />
      <circle data-cm-glove={keeper && catching ? '1' : undefined} cx={dive ? -5 : -11} cy={dive ? -20 : -3} r="2.6" fill={keeper ? '#fff2d3' : '#bb8669'} />
      <circle data-cm-glove={keeper && catching ? '1' : undefined} cx={dive ? 5 : 11} cy={dive ? -20 : -3} r="2.6" fill={keeper ? '#fff2d3' : '#bb8669'} />
      <ellipse cy="-20" rx="5" ry="5.5" fill="#bb8669" /><path d="M-4-23Q0-27 4-23" fill="#23313c" stroke="#23313c" strokeWidth="2" />
    </g>
  </svg>;
}
