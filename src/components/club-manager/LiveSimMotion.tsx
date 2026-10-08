/* Round 1101: the pitch moved to src/components/pitch-motion, so more than one game can draw on it.
   This file is Club Manager's side of the seam: the names it always exported, the viewer's own
   styles, and one compile time proof that the engine's feed line fits the shared part. */
import type { LiveFeedEvent } from '@/lib/clubManager';
import type { PitchEvent } from '@/components/pitch-motion/contract';
import './LiveSimMotion.css';

export { actionFrame, useLiveSimMotion, LivePitchPlayer } from '@/components/pitch-motion/motion';
export type { MotionPlayer, MotionScene, MotionEvent, MotionFrame } from '@/components/pitch-motion/motion';

const feedFits = (e: LiveFeedEvent): PitchEvent => e; void feedFits;
