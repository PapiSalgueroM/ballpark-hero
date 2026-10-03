/* Round 913: the MLB skin for the shared training ground
   (src/components/career/TrainingGround). Words and data only: the drills are
   the ones every career plays, wearing baseball. Nothing binds this to MLB My
   Career yet; the board gets its training fields in a later round.

   Three drills, not four: baseball has no cone run worth the name. The strike
   zone drill is one drill played from both sides of the plate. A pitcher
   pitches (he picks a corner and the hitter guesses), a hitter picks (the
   release gives a tell, the pitch comes, and he swings where it ends up).
   Everybody runs home to first. Everybody takes infield except the DH, who
   does not own a glove that matters. */
import type { MlbCareerPos } from '@/lib/mlbMyCareer';
import {
  RATING_STAT, RATING_TRAINING,
  type BurstTapSkin, type ZonePickSkin, type GateTapSkin,
  type TrainingDrillSkin, type TrainingSport,
} from '@/lib/careerTraining';

export type MlbTrainingDrill = 'corners' | 'first' | 'infield';

const INFIELD_DIRT = 'linear-gradient(180deg, #14532d, #92400e)';
const BATTERS_EYE = 'linear-gradient(180deg, #1e293b 0%, #14532d 80%)';
const CORNERS: [string, string, string, string, string, string] = [
  'up and in', 'up the middle', 'up and away', 'down and in', 'down the middle', 'down and away',
];

const PITCH_CORNERS: ZonePickSkin<MlbTrainingDrill> = {
  kind: 'zones', mode: 'pick', id: 'corners', emoji: '🎯', name: 'Strike Zone Corners', stat: RATING_STAT,
  unit: 'Pitch', tally: 'painted', verb: 'Pitch', zones: CORNERS, ball: '⚾', glove: '👀',
  surface: BATTERS_EYE, frame: 'box',
  how: 'Pick your spot in the zone. The hitter sits on the one he guesses. Pitches up are harder to command, so one gets away now and then.',
  made: 'Painted. Strike!', stopped: 'He was sitting on it. Hit hard.', over: 'Missed up. Ball.',
};

const HIT_CORNERS: ZonePickSkin<MlbTrainingDrill> = {
  kind: 'zones', mode: 'save', id: 'corners', emoji: '👀', name: 'Strike Zone Corners', stat: RATING_STAT,
  unit: 'Pitch', tally: 'squared up', verb: 'Swing', zones: CORNERS, ball: '⚾', glove: '💥',
  surface: BATTERS_EYE, frame: 'box',
  how: 'You are in the box. Watch the release for the tell, then tap where the pitch ends up. The tell is honest most of the time. Most of it.',
  tell: 'He comes set...', shot: 'PITCH! Swing!', saved: 'Squared it up!', beaten: 'Swing and a miss.',
};

const FIRST: BurstTapSkin<MlbTrainingDrill> = {
  kind: 'burst', id: 'first', emoji: '⚡', name: 'Home to First', stat: RATING_STAT,
  unit: 'strides', startEmoji: '🏁', startTitle: 'Tap to start the 5 second dash to first',
  startHint: 'Then tap the basepath as fast as you can', runEmoji: '🏃', go: 'GO GO GO', stop: 'Time!',
};

const INFIELD: GateTapSkin<MlbTrainingDrill> = {
  kind: 'gates', id: 'infield', emoji: '🧤', name: 'Infield Reaction', stat: RATING_STAT,
  unit: 'Ball', tally: 'fielded', surface: INFIELD_DIRT, lit: '⚾',
  how: 'A ball jumps off the bat: get a glove on it before it is through. They come quicker as you go.',
  startEmoji: '🧤', startTitle: 'Tap to start the infield drill', startHint: 'Eight balls, shrinking windows',
};

const PITCHER = [PITCH_CORNERS, FIRST, INFIELD];
const FIELDER = [HIT_CORNERS, FIRST, INFIELD];

/** The drills each position runs, in menu order. */
const DRILLS: Record<MlbCareerPos, Array<TrainingDrillSkin<MlbTrainingDrill>>> = {
  SP: PITCHER, RP: PITCHER,
  C: FIELDER, '1B': FIELDER, '2B': FIELDER, '3B': FIELDER, SS: FIELDER,
  LF: FIELDER, CF: FIELDER, RF: FIELDER,
  DH: [HIT_CORNERS, FIRST],
};

export const MLB_TRAINING_POSITIONS = Object.keys(DRILLS) as MlbCareerPos[];

export function mlbTraining(pos: MlbCareerPos): TrainingSport<MlbTrainingDrill> {
  const pitcher = pos === 'SP' || pos === 'RP';
  return {
    ...RATING_TRAINING,
    title: '⚾ Training Fields',
    label: 'Training fields',
    shut: {
      emoji: '😮‍💨',
      title: 'Already trained this season',
      body: 'The trainers say rest is part of the work. Come back once next season opens.',
    },
    note: pitcher ? undefined : {
      marker: 'hitter',
      text: 'You hit for a living, so Strike Zone Corners puts you in the box: you read the pitch instead of throwing it.',
    },
    drills: DRILLS[pos],
  };
}
