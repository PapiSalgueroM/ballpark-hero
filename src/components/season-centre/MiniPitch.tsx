/* Round 1046: the Season Centre's little pitch. When the match clock reaches
   a goal, the goal is played on a third of a pitch: the plant, the flight,
   the net, the arms up. If the goal was his (or his assist, or he was the
   keeper or the defender beaten) one figure wears a ring, which is the only
   way a person is told apart: no names, no numbers, no crests, two flat
   colours.

   It invents nothing. Which side scored, in which minute, and whether it was
   his come from the derived game's own events; HOW the move looked is the
   game's own drawing, from fixed places (goalScene), never from a random
   draw.

   THE ONE FILE THAT IMPORTS THE PITCH PART (src/components/pitch-motion,
   Round 1101's shared part). It binds the level below the ready made
   PitchMotion, on purpose: that component has no ring and takes its time
   from a match clock, where a goal lasts ACTION_SPAN clock minutes. The
   Season Centre plays 90 minutes in 15 seconds, so a goal on that clock
   would last a sixth of a second. So this part keeps its OWN clock, ACTION_SPAN
   seconds of wall time on `actionFrame`, which also lets a 90th minute
   winner finish after full time. Do not put `useLiveSimMotion` back: it
   tweens between scenes on the binder's clock and falls back to a standing
   scene when the action's time is up, and here the last frame of a goal
   (ball in the net) must stay until the next goal.

   Only arrival moves: a goal plays once, when the clock crosses its minute
   while this part is mounted. A goal already on the board when it mounts (a
   resume, a moment handing the stage back, this chunk arriving late), every
   goal at Results speed and every goal under reduced motion is drawn on its
   last frame at once. The box has a fixed shape, so nothing under it moves. */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ACTION_SPAN, actionFrame, LivePitchPlayer, PitchSurface, pitchSpot } from '@/components/pitch-motion';
import type { MotionFrame, MotionPlayer, MotionScene, PitchEvent } from '@/components/pitch-motion';
import type { SeasonEvent } from '@/lib/season/core';

export interface PitchGoal { key: string; min: number; side: 'us' | 'them'; mine: boolean; assist: boolean }
/** His line on the pitch, or null when he did not play the game. */
export type PitchRole = 'GK' | 'DEF' | 'ATT' | null;
export interface PitchFig extends MotionPlayer { ring: boolean }

/** Every goal of a game, in the order the events hold them. The key names the
 *  minute, the side and its place among that side's goals of that minute, so
 *  a new events array with the same goals does not look like new goals. */
export function goalsOf(md: number, events: readonly SeasonEvent[]): PitchGoal[] {
  const seen = new Map<string, number>();
  const out: PitchGoal[] = [];
  for (const e of events) {
    if (e.kind !== 'goal') continue;
    const at = `${e.min}|${e.side}`;
    const n = seen.get(at) ?? 0;
    seen.set(at, n + 1);
    out.push({
      key: `${md}|${at}|${n}`, min: e.min, side: e.side, mine: !!e.mine,
      assist: !e.mine && e.side === 'us' && events.some(a => a.kind === 'assist' && a.mine && a.side === 'us' && a.min === e.min),
    });
  }
  return out;
}

/** The share of the pitch's length the box shows: the third a goal is scored in. */
export const PITCH_WINDOW = 0.36;
/* The fixed places, on the part's 0 to 100 pitch with his club attacking the top (y 0). Two sets and not one
   mirrored, because a figure is drawn UP from its spot (24 px of it above, 8 below): mirrored, the heads of the
   men furthest from goal would leave the box. src/test/miniPitchScene.test.ts holds every figure of both sets
   inside the window through the whole move. */
type Places = { attack: [number, number][]; keeper: [number, number]; backs: [number, number][] };
const AT_TOP: Places = { attack: [[50, 28], [34, 30], [66, 29], [50, 33]], keeper: [50, 7], backs: [[42, 16], [58, 15]] };
const AT_BOTTOM: Places = { attack: [[50, 72], [34, 71], [66, 71.5], [58, 78]], keeper: [50, 93], backs: [[42, 84], [58, 85]] };

/** The scene of a goal: four of the scoring side going at a keeper and two
 *  defenders. `scored` null draws his club's attack standing (before the first
 *  goal). He wears the ring on at most one figure, and only when he was on the
 *  pitch in that minute (`onFrom` to `onTo`, both inside). */
export function goalScene(goal: PitchGoal | null, role: PitchRole, onFrom: number, onTo: number): MotionScene<PitchFig> {
  const us = !goal || goal.side === 'us';
  const at = us ? AT_TOP : AT_BOTTOM;
  const on = !!goal && role !== null && goal.min >= onFrom && goal.min <= onTo;
  /* the striker is the first attacker; the man nearest him is the last one */
  const ringOn = !on || !goal ? null
    : goal.side === 'us'
      ? (goal.mine ? 'a0' : goal.assist ? 'a3' : role === 'ATT' ? 'a3' : null)
      : (role === 'GK' ? 'k' : role === 'DEF' ? 'd0' : null);
  const attackers: PitchFig[] = at.attack.map(([x, y], i) => ({ key: `a${i}`, x, y, keeper: false, ring: ringOn === `a${i}` }));
  const defenders: PitchFig[] = [
    { key: 'k', x: at.keeper[0], y: at.keeper[1], keeper: true, ring: ringOn === 'k' },
    ...at.backs.map(([x, y], i) => ({ key: `d${i}`, x, y, keeper: false, ring: ringOn === `d${i}` })),
  ];
  return {
    mine: us ? attackers : defenders,
    theirs: us ? defenders : attackers,
    ball: { x: attackers[0].x + 1.3, y: attackers[0].y + (us ? -1 : 1) },
    holderKey: 'a0',
  };
}

/** The goal as the pitch part reads it: a side, a minute and the word goal. Nobody is named. */
export const goalEvent = (goal: PitchGoal): PitchEvent => ({ minute: goal.min, side: goal.side === 'us' ? 'me' : 'opp', kind: 'goal', text: '' });

/** One frame of a goal, `elapsed` seconds in (ACTION_SPAN and beyond: the last frame). */
export function goalFrame(goal: PitchGoal | null, role: PitchRole, onFrom: number, onTo: number, elapsed: number): MotionFrame<PitchFig> {
  const scene = goalScene(goal, role, onFrom, onTo);
  if (!goal) return { ...scene, poses: {}, action: 'idle', net: null, netPulse: 0, phase: 'idle' };
  return actionFrame(scene, { event: goalEvent(goal), key: goal.key, at: 0 }, Math.min(ACTION_SPAN, Math.max(0, elapsed)));
}

export interface MiniPitchProps {
  md: number;
  /** The game's own events (a stable reference while the model is). */
  events: readonly SeasonEvent[];
  /** The clock's minute, a whole number. */
  shown: number;
  paused: boolean;
  instant: boolean;
  usColor: string;
  role: PitchRole;
  /** The minutes he was on the pitch, both inside. */
  onFrom: number;
  onTo: number;
  /** The box's class: the one string the loading fallback also wears. */
  boxClass: string;
}

/* The other side's flat colour. His club wears its own; when that is white or close to it (Santos, FC Copenhagen,
   Derby County and a dozen more of the career's clubs) the usual pale shirt would make two sides nobody can tell
   apart, so the other side goes dark instead. Still two flat colours and nobody's kit. */
const THEM = '#d6e6ed';
const THEM_DARK = '#1f2a44';
const rgbOf = (hex: string): [number, number, number] | null => {
  const h = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())?.[1];
  if (!h) return null;
  const six = h.length === 3 ? h.replace(/./g, c => c + c) : h;
  return [parseInt(six.slice(0, 2), 16), parseInt(six.slice(2, 4), 16), parseInt(six.slice(4, 6), 16)];
};
/** How far apart two colours must be (straight distance in RGB) to be told apart as shirts on the grass. */
export const SHIRTS_APART = 90;
/** The other side's colour for a club in `usColor`: the pale one, or the dark one when his club is itself pale. */
export function themColor(usColor: string): string {
  const us = rgbOf(usColor);
  const pale = rgbOf(THEM)!;
  return us && Math.hypot(us[0] - pale[0], us[1] - pale[1], us[2] - pale[2]) < SHIRTS_APART ? THEM_DARK : THEM;
}

/** The grass, the nets, the ball and the figures: exactly the piece the shared part draws. */
function Surface({ frame, usColor, top }: { frame: MotionFrame<PitchFig>; usColor: string; top: boolean }) {
  const them = themColor(usColor);
  return (
    <PitchSurface frame={frame} style={{ position: 'absolute', left: 0, width: '100%', top: top ? 0 : undefined, bottom: top ? undefined : 0 }}>
      {frame.theirs.map(p => (
        <div key={p.key} className="pm-figure" data-pm-figure="opp" data-pitch-ring={p.ring ? '' : undefined} style={pitchSpot(p)}>
          <LivePitchPlayer color={them} keeper={p.keeper} pose={frame.poses[p.key]} selected={p.ring} />
        </div>
      ))}
      {frame.mine.map(p => (
        <div key={p.key} className="pm-figure" data-pm-figure="me" data-pitch-ring={p.ring ? '' : undefined} style={pitchSpot(p)}>
          <LivePitchPlayer color={usColor} keeper={p.keeper} pose={frame.poses[p.key]} selected={p.ring} />
        </div>
      ))}
    </PitchSurface>
  );
}

function MiniPitch({ md, events, shown, paused, instant, usColor, role, onFrom, onTo, boxClass }: MiniPitchProps) {
  const goals = useMemo(() => goalsOf(md, events), [md, events]);
  /* what was on screen at the last commit: a goal plays only when the clock crosses its minute after that */
  const last = useRef({ shown, events });
  /* the goal being played: `t` seconds in; `next` holds the goals that arrived while it was in the air, in order */
  const [play, setPlay] = useState<{ goal: PitchGoal; t: number; next: PitchGoal[] } | null>(null);
  const current = goals.filter(g => g.min <= shown).pop() ?? null;

  /* a layout effect, so the frame a goal arrives on is its first frame: an effect after paint would show the goal landed for one frame first */
  useLayoutEffect(() => {
    const was = last.current;
    last.current = { shown, events };
    /* a new events array (a moment changed the match) is the match as it now stands, not goals arriving */
    if (was.events !== events || instant) { setPlay(null); return; }
    /* every goal the clock just crossed, in order: on a slow frame at 3x that can be two */
    const arrived = goals.filter(g => g.min > was.shown && g.min <= shown);
    if (arrived.length === 0) return;
    /* Every one of them is seen landing, and the last one is played. A goal in the air goes to its last frame now and
       the new ones wait behind it; with nothing in the air, the earlier ones are each drawn landed for a frame first. */
    setPlay(p => (p && (p.t < ACTION_SPAN || p.next.length > 0)
      ? { goal: p.goal, t: ACTION_SPAN, next: [...p.next, ...arrived] }
      : { goal: arrived[0], t: arrived.length > 1 ? ACTION_SPAN : 0, next: arrived.slice(1) }));
  }, [shown, events, goals, instant]);

  const moving = !!play && (play.t < ACTION_SPAN || play.next.length > 0);
  useEffect(() => {
    if (!moving || paused) return;
    let raf = 0;
    let before = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - before) / 1000;
      before = now;
      if (!document.hidden) setPlay(p => {
        if (!p) return p;
        if (p.t < ACTION_SPAN) return { goal: p.goal, t: p.t + dt, next: p.next };
        if (p.next.length === 0) return p;
        /* the next one in line: played if it is the last, drawn landed for this frame if another waits behind it */
        return { goal: p.next[0], t: p.next.length > 1 ? ACTION_SPAN : 0, next: p.next.slice(1) };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [moving, paused]);

  /* in the air (or held on its last frame for the goal behind it): that goal; otherwise the last goal on the board, landed */
  const drawn = moving && play ? play.goal : current;
  const frame = goalFrame(drawn, role, onFrom, onTo, moving && play ? play.t : ACTION_SPAN);
  const top = !drawn || drawn.side === 'us';
  const his = drawn && frame.mine.concat(frame.theirs).some(p => p.ring) ? (drawn.mine ? '⚽ Yours' : drawn.assist ? '🅰️ Your assist' : null) : null;
  return (
    <div aria-hidden="true">
      <div className={boxClass} data-mini-pitch data-pitch-phase={frame.phase} data-pitch-side={drawn ? drawn.side : 'us'} data-pitch-goal={drawn ? drawn.key : undefined} data-pitch-live={moving ? '' : undefined}>
        <Surface frame={frame} usColor={usColor} top={top} />
      </div>
      <div className="h-5 text-xs font-bold leading-5 text-primary" data-pitch-yours>
        {his && <span key={drawn!.key} className={instant ? undefined : 'cm-tick-in'}>{his}</span>}
      </div>
    </div>
  );
}

export default memo(MiniPitch);
