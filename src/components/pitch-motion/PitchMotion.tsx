import { useEffect, useMemo, useRef } from 'react';
import { ACTION_SPAN } from '@/components/pitch-motion/contract';
import type { PitchMoment, PitchMotionProps } from '@/components/pitch-motion/contract';
import { LivePitchPlayer, useLiveSimMotion } from '@/components/pitch-motion/motion';
import type { MotionEvent } from '@/components/pitch-motion/motion';
import { PitchSurface, pitchSpot } from '@/components/pitch-motion/PitchSurface';
import { pitchBeatAt, pitchPlan, pitchScene, pitchSceneKey } from '@/components/pitch-motion/scene';
import type { PitchStagedAction } from '@/components/pitch-motion/scene';

/**
 * Round 1101: the ready made pitch for a binder that only has a feed and a clock.
 *
 * It owns no timer: every moving thing is a function of `clock`, so `playing: false` freezes all of
 * it on the frame it is showing (whatever the binder's clock does meanwhile) and a hidden tab costs
 * nothing. It invents no outcome: the only goals, shots and saves it plays are lines of `feed`, each
 * from the instant the plan gives it (its own place, or a little later inside its minute when the
 * chance before it is still playing). A binder that needs its own buttons, names or numbers on the
 * figures uses the level below instead (pitchPlan, pitchScene, the hook, PitchSurface and
 * LivePitchPlayer), the way Club Manager's live match does.
 *
 * A binder may hand over fresh arrays on every render (mine, theirs, feed, kickoffs built inline):
 * the plan is rebuilt only when what they HOLD changes, so an action is never restarted by that.
 */
export function PitchMotion({
  mine, theirs, feed, span, kickoffs, possession, seed, colors, clock, playing, reducedMotion, orientation = 'portrait', onMoment, className,
}: PitchMotionProps) {
  /* The frozen frame: while `playing` is false the part goes on reading the last clock it was playing at. */
  const held = useRef(clock);
  if (playing) held.current = clock;
  const now = held.current;
  /* Keyed on content. With stable arrays the key itself is only worked out when one of them changes. */
  const planKey = useMemo(
    () => JSON.stringify({ mine, theirs, feed, span: { from: span.from, to: span.to }, kickoffs, possession, seed }),
    [mine, theirs, feed, span.from, span.to, kickoffs, possession, seed],
  );
  // The key is the input's whole content, so the plan survives a render that handed over equal arrays.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => pitchPlan({ mine, theirs, feed, span: { from: span.from, to: span.to }, kickoffs, possession, seed }), [planKey]);
  const sceneKey = pitchSceneKey(plan, now);
  // The key changes exactly when the scene does, so the clock itself is deliberately not a dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scene = useMemo(() => pitchScene(plan, now), [plan, sceneKey]);
  /* The plan says which chances are played and when each starts: of two at one place the later line, one
     action at a time, and a chance with the last kick of the span wound up to end at the end. */
  let current: PitchStagedAction | null = null;
  for (const staged of plan.actions) if (staged.at <= now && now < staged.at + ACTION_SPAN) current = staged;
  const action: MotionEvent | null = useMemo(() => {
    if (!current) return null;
    const line = current.event;
    return { event: line, key: `${line.kind}:${line.side}:${line.minute}${line.plus ? `+${line.plus}` : ''}:${line.text}`, at: current.at };
  }, [current]);
  /* Always live to the hook: a frozen part is a clock that has stopped, not an action taken away. */
  const frame = useLiveSimMotion(scene, action, now, true, reducedMotion);

  /* Once per moment, after the frame that shows it has been committed. A clock that goes back
     (a loop, a replay) may fire them again. */
  const fired = useRef<Set<string>>(new Set());
  const lastClock = useRef(now);
  useEffect(() => {
    if (now < lastClock.current - 1e-6) fired.current.clear();
    lastClock.current = now;
    if (onMoment) {
      /* A dead ball of the plan (a kick off, a corner, a throw in, a free kick) is a moment too, told when the
         clock comes into it. It is staged by the plan, not played off a line, so there is no event to hand over.
         A penalty or a direct free kick that is a CHANCE is not one of these: its ball is dead before the
         strike, but its moment is the strike itself, with its line. */
      const beat = pitchBeatAt(plan, now);
      if (beat.dead && (beat.state === 'kickoff' || beat.state === 'corner' || beat.state === 'throwin' || beat.state === 'freekick') && beat.via !== 'carrier') {
        const key = `${beat.id}:${beat.state}`;
        if (!fired.current.has(key)) { fired.current.add(key); onMoment(beat.state, null); }
      }
    }
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
