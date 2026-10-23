import type { CSSProperties, ReactNode } from 'react';
import { GOAL_MOUTH } from '@/components/pitch-motion/contract';
import type { PitchPoint } from '@/components/pitch-motion/contract';
import type { MotionFrame, MotionPlayer } from '@/components/pitch-motion/motion';
import '@/components/pitch-motion/pitchMotion.css';

export type PitchOrientation = 'portrait' | 'landscape';

/** Where a pitch point is drawn. Portrait: 'me' attacks up. Landscape: 'me' attacks right. */
export function pitchSpot(point: PitchPoint, orientation: PitchOrientation = 'portrait'): { left: string; top: string } {
  return orientation === 'landscape'
    ? { left: `${100 - point.y}%`, top: `${point.x}%` }
    : { left: `${point.x}%`, top: `${point.y}%` };
}

export interface PitchSurfaceProps<T extends MotionPlayer> {
  /** The frame the hook returned. The surface reads ball, action, phase, net and netPulse off it. */
  frame: MotionFrame<T>;
  orientation?: PitchOrientation;
  className?: string;
  /** Optional box overrides (a binder that sizes the pitch itself passes aspectRatio 'auto'). */
  style?: CSSProperties;
  /** The binder's own figures, placed with pitchSpot. */
  children?: ReactNode;
  /** Round 1521: draw the ball's height off the frame (its `lift`): the ball grows a little and its shadow stays on
   *  the grass, falling further off it the higher it goes. The ball's own element keeps its place on the grass, so
   *  anything reading where the ball is reads what it always read. Left out, the ball is drawn flat, as before. */
  lift?: boolean;
}

/** Round 1521: a foul's whistle and the card the feed gave on it, drawn where the free kick is taken. */
function FoulCue({ card }: { card?: 'yellow' | 'red' }) {
  return <>
    <svg className="pm-whistle" viewBox="0 0 26 16" aria-hidden="true" focusable="false">
      <path d="M2 9.5a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0-11 0M9 4h11v5h-6.5" fill="#f4f7f9" stroke="#143040" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M21 2.5l2.5-2M22 6h3M21 9.5l2.5 2" stroke="#f4f7f9" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
    {card && <i className={`pm-card pm-card--${card}`} />}
  </>;
}

/** The grass, the markings, the two nets and the ball. Flat colours and lines only, no artwork.
 *  It owns no timer and no CSS animation: everything it draws is read off the frame. */
export function PitchSurface<T extends MotionPlayer>({ frame, orientation = 'portrait', className, style, children, lift }: PitchSurfaceProps<T>) {
  const high = lift && (frame.lift ?? 0) > 0.05 ? frame.lift! : 0;
  const land = orientation === 'landscape';
  const stretch = (side: 'me' | 'opp') => `${land ? 'scaleX' : 'scaleY'}(${1 + (frame.net === side ? frame.netPulse : 0) * .7})`;
  /* The net gives where the ball hit it. Read off the frame: the ball rests in the net through the end of the
     action, and the pulse is 0 on a still frame (reduced motion), so nothing bulges there. */
  const hit = Math.max(8, Math.min(92, (frame.ball.x - GOAL_MOUTH.x0) / (GOAL_MOUTH.x1 - GOAL_MOUTH.x0) * 100));
  const bulge = (side: 'me' | 'opp') => (frame.net === side && frame.netPulse > 0.02
    ? <i className="cm-live-net-bulge" style={{ [land ? 'top' : 'left']: `${hit}%`, transform: `translate(-50%, -50%) scale(${frame.netPulse})` }} />
    : null);
  return (
    <div
      data-cm-live-pitch="1"
      data-cm-motion={frame.action}
      data-cm-motion-phase={frame.phase}
      data-pm-orient={orientation}
      data-pm-own-goal={frame.ownGoalBy === undefined ? undefined : frame.ownGoalBy ?? ''}
      className={className ? `pm-surface ${className}` : 'pm-surface'}
      style={{ aspectRatio: land ? '4 / 3' : '3 / 4', ...style }}
    >
      <div className="pm-mark pm-mark--half" />
      <div className="pm-mark pm-mark--circle" />
      <div className="pm-mark pm-mark--spot" style={pitchSpot({ x: 50, y: 50 }, orientation)} />
      <div className="pm-mark pm-mark--area pm-mark--top" />
      <div className="pm-mark pm-mark--area pm-mark--bottom" />
      <div className="pm-mark pm-mark--six pm-mark--top" />
      <div className="pm-mark pm-mark--six pm-mark--bottom" />
      <div className="pm-mark pm-mark--spot" style={pitchSpot({ x: 50, y: 12 }, orientation)} />
      <div className="pm-mark pm-mark--spot" style={pitchSpot({ x: 50, y: 88 }, orientation)} />
      <div className="cm-live-net cm-live-net--top" data-cm-net={frame.net === 'opp' ? 'goal' : undefined} style={{ transform: stretch('opp') }}>{bulge('opp')}</div>
      <div className="cm-live-net cm-live-net--bottom" data-cm-net={frame.net === 'me' ? 'goal' : undefined} style={{ transform: stretch('me') }}>{bulge('me')}</div>
      {children}
      {frame.cue && (
        <div className="pm-cue" data-pm-cue={frame.cue.kind} data-pm-cue-order={frame.cue.order} data-pm-cue-card={frame.cue.card} style={pitchSpot(frame.cue.at, orientation)}>
          <FoulCue card={frame.cue.card} />
        </div>
      )}
      <div data-cm-ball="1" className="cm-live-ball" data-cm-ball-lift={high ? high.toFixed(2) : undefined} style={pitchSpot(frame.ball, orientation)}>
        {high ? <>
          <i className="cm-live-ball-shadow" style={{ transform: `translate(${(high * 0.7).toFixed(2)}px, ${high.toFixed(2)}px) scale(${Math.max(0.5, 1 - high * 0.05).toFixed(3)})` }} />
          <i className="cm-live-ball-air" style={{ transform: `scale(${(1 + high * 0.045).toFixed(3)})` }} />
        </> : null}
      </div>
    </div>
  );
}
