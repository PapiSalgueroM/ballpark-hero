import { useEffect, useMemo, useRef } from 'react';
import { ACTION_SPAN } from '@/components/pitch-motion/contract';
import type { PitchEvent, PitchMoment, PitchMotionProps } from '@/components/pitch-motion/contract';
import { LivePitchPlayer, useLiveSimMotion } from '@/components/pitch-motion/motion';
import type { MotionEvent } from '@/components/pitch-motion/motion';
import { PitchSurface, pitchSpot } from '@/components/pitch-motion/PitchSurface';
import { pitchPlan, pitchScene, pitchSceneKey } from '@/components/pitch-motion/scene';

const place = (event: PitchEvent) => event.minute + (event.plus ?? 0);
const isAction = (event: PitchEvent) => event.kind === 'goal' || event.kind === 'shot' || event.kind === 'save';

/**
 * Round 1101: the ready made pitch for a binder that only has a feed and a clock.
 *
 * It owns no timer: every moving thing is a function of `clock`, so `playing: false` freezes all of
 * it and a hidden tab costs nothing. It invents no outcome: the only goals, shots and saves it plays
 * are lines of `feed`, each from the instant the clock reaches its place. A binder that needs its own
 * buttons, names or numbers on the figures uses the level below instead (pitchPlan, pitchScene, the
 * hook, PitchSurface and LivePitchPlayer), the way Club Manager's live match does.
 */
export function PitchMotion({
  mine, theirs, feed, span, kickoffs, possession, seed, colors, clock, playing, reducedMotion, orientation = 'portrait', onMoment, className,
}: PitchMotionProps) {
  const plan = useMemo(
    () => pitchPlan({ mine, theirs, feed, span: { from: span.from, to: span.to }, kickoffs, possession, seed }),
    [mine, theirs, feed, span.from, span.to, kickoffs, possession, seed],
  );
  const sceneKey = pitchSceneKey(plan, clock);
  // The key changes exactly when the scene does, so the clock itself is deliberately not a dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => pitchScene(plan, clock), [plan, sceneKey]);
  let current: PitchEvent | null = null;
  for (const line of feed) if (isAction(line) && place(line) <= clock && clock < place(line) + ACTION_SPAN) current = line;
  const action: MotionEvent | null = useMemo(
    () => (current ? { event: current, key: `${current.kind}:${current.side}:${current.minute}${current.plus ? `+${current.plus}` : ''}:${current.text}`, at: place(current) } : null),
    [current],
  );
  const frame = useLiveSimMotion(scene, action, clock, playing, reducedMotion);

  /* Once per moment, after the frame that shows it has been committed. A clock that goes back
     (a loop, a replay) may fire them again. */
  const fired = useRef<Set<string>>(new Set());
  const lastClock = useRef(clock);
  useEffect(() => {
    if (clock < lastClock.current - 1e-6) fired.current.clear();
    lastClock.current = clock;
    if (!onMoment || !action || frame.action === 'pass') return;
    const mark = (moment: PitchMoment) => {
      const key = `${action.key}:${moment}`;
      if (fired.current.has(key)) return;
      fired.current.add(key);
      onMoment(moment, action.event);
    };
    mark('strike');
    if (frame.phase === 'net' || frame.phase === 'caught' || frame.phase === 'wide') mark(frame.phase);
  });

  return (
    <PitchSurface frame={frame} orientation={orientation} className={className}>
      {frame.theirs.map(p => (
        <div key={p.key} className="pm-figure" data-pm-figure="opp" style={pitchSpot(p, orientation)}>
          <LivePitchPlayer color={colors.theirs} keeper={p.keeper} pose={frame.poses[p.key]} />
        </div>
      ))}
      {frame.mine.map(p => (
        <div key={p.key} className="pm-figure" data-pm-figure="me" style={pitchSpot(p, orientation)}>
          <LivePitchPlayer color={colors.mine} keeper={p.keeper} pose={frame.poses[p.key]} />
        </div>
      ))}
    </PitchSurface>
  );
}
