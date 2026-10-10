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
}

/** The grass, the markings, the two nets and the ball. Flat colours and lines only, no artwork.
 *  It owns no timer and no CSS animation: everything it draws is read off the frame. */
export function PitchSurface<T extends MotionPlayer>({ frame, orientation = 'portrait', className, style, children }: PitchSurfaceProps<T>) {
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
      <div data-cm-ball="1" className="cm-live-ball" style={pitchSpot(frame.ball, orientation)} />
    </div>
  );
}
