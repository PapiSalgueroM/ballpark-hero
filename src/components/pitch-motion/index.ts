/* Round 1101: the barrel binders import from. Files INSIDE this folder never import it (nor a relative
   sibling): they write the full '@/components/pitch-motion/<file>' specifier, so a harness can swap one
   file by alias. Nothing in the folder imports from Club Manager. */
export {
  PITCH_MOTION_CONTRACT, ACTION_SPAN, NET_AT, BEAT_SPAN, GOAL_MOUTH,
} from '@/components/pitch-motion/contract';
export type {
  PitchSide, PitchLine, PitchPoint, PitchFigure, PitchEventKind, PitchEvent, PitchKickoff, PitchInput,
  PitchMoment, PitchMotionProps,
} from '@/components/pitch-motion/contract';
export { actionFrame, between, useLiveSimMotion, LivePitchPlayer, goalWindow, ownGoalFigure } from '@/components/pitch-motion/motion';
export type { MotionPlayer, MotionScene, MotionEvent, MotionFrame, Pose } from '@/components/pitch-motion/motion';
export { pitchPlan, pitchScene, pitchSceneKey, pitchBeatAt } from '@/components/pitch-motion/scene';
export type { PitchPlan, PitchPlaced, PitchBeat, PitchBeatState, PitchStagedAction } from '@/components/pitch-motion/scene';
export { PitchSurface, pitchSpot } from '@/components/pitch-motion/PitchSurface';
export type { PitchOrientation, PitchSurfaceProps } from '@/components/pitch-motion/PitchSurface';
export { PitchMotion } from '@/components/pitch-motion/PitchMotion';
