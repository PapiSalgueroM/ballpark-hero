/** Round 1101. FROZEN: after the contract commit only optional fields may be added.
 *  Nothing here is renamed, removed or made required, because more than one game binds to it
 *  (Club Manager's live match, the Season Centre's mini pitch, the home stage, Stadium Tycoon).
 *
 *  The part is a picture of a feed the binder already has. It invents no outcome: every goal,
 *  shot, save, corner, throw in and foul it shows is a line of `feed`, at that line's own place
 *  on the binder's clock. What it draws between those lines (who is on the ball, the shape, the
 *  drift) comes from a generator keyed on `seed`, never from Math.random.
 *
 *  No logos, crests, kits or photos: two flat colours and one drawn figure.
 *
 *  LANDSCAPE, decided before the freeze: in landscape a point (x, y) is drawn at left (100 - y)%,
 *  top x%, and every figure is still drawn UPRIGHT with its dive and its reach about the screen's
 *  upright axis, exactly as in portrait. Nothing turns a figure a quarter turn until a binder asks. */
export const PITCH_MOTION_CONTRACT = 1;
export type PitchSide = 'me' | 'opp';
export type PitchLine = 'keeper' | 'defence' | 'midfield' | 'attack';
/** Percent of the pitch. x runs across, y along. 'me' defends y 100 and attacks y 0. */
export interface PitchPoint { x: number; y: number }
/** A role and a slot, never a person. `slot` is on the side's OWN chart (own goal at y 100, keeper
 *  near y 90); the part mirrors 'opp'. `name` is only matched against a feed line's text to find the
 *  man on the ball; the part never draws it. */
export interface PitchFigure { key: string; line: PitchLine; slot: PitchPoint; name?: string }
export type PitchEventKind = 'goal' | 'shot' | 'save' | 'corner' | 'throwin' | 'foul' | 'yellow' | 'red' | 'injury' | 'sub' | 'halftime' | 'var';
/** One committed line of the binder's feed. Its place on the clock is minute + (plus ?? 0). */
export interface PitchEvent {
  minute: number; plus?: number; side: PitchSide | 'none'; kind: PitchEventKind; text: string;
  flank?: 'left' | 'right'; penalty?: boolean; freeKick?: boolean;
  /** Round 1216, goals only: an own goal. `side` is the side that GOT the goal. The man who put it in plays
   *  for the OTHER side: he is the figure of that side with the key in `ogBy`, or else the one whose name is
   *  `text`. With neither on the grass the ball still turns in front of that goal and no figure is moved to
   *  it. Ignored on a line with `penalty` or `freeKick`, which is drawn as the set piece it is. */
  og?: boolean;
  /** Round 1216: the key of the figure who put it in, for a binder whose figures carry no names. */
  ogBy?: string;
}
export interface PitchKickoff { at: number; side: PitchSide }
/** One stretch of play (a half, a replayed goal, an idle loop). The part invents no outcome: it only
 *  draws what `feed` holds. `seed` keys everything drawn between events. */
export interface PitchInput {
  mine: PitchFigure[]; theirs: PitchFigure[];
  feed: PitchEvent[];
  span: { from: number; to: number };
  kickoffs?: PitchKickoff[];
  /** The share of the ball 'me' has over this stretch, 0 to 1. Defaults to 0.5. */
  possession?: number;
  seed?: number;
}
export type PitchMoment = 'kickoff' | 'strike' | 'net' | 'caught' | 'wide' | 'corner' | 'throwin' | 'freekick';
export interface PitchMotionProps extends PitchInput {
  colors: { mine: string; theirs: string };
  /** The binder's clock, in feed minutes. The part owns no timer. */
  clock: number;
  /** false freezes every figure, the ball and every pose on the current frame. */
  playing: boolean;
  /** true forces the still form; undefined follows prefers-reduced-motion. */
  reducedMotion?: boolean;
  /** portrait: 'me' attacks up. landscape: 'me' attacks right. */
  orientation?: 'portrait' | 'landscape';
  /** Fired once per moment, after commit, for a binder's own score, card or sound. */
  onMoment?: (moment: PitchMoment, event: PitchEvent | null) => void;
  className?: string;
}
/** How long a goal, a shot or a save plays, in clock units from the instant its line fires. */
export const ACTION_SPAN = 1.05;
/** How far into an action the ball reaches the net, the gloves or the hoardings. */
export const NET_AT = 0.756;
/** How long one stretch of open play lasts before the ball moves on. */
export const BEAT_SPAN = 0.38;
/** The goal mouth at either end: x from x0 to x1, and `depth` from that goal line. */
export const GOAL_MOUTH = { x0: 38, x1: 62, depth: 2.5 };
