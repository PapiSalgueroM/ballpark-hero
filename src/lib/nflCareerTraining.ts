/* Round 913: the NFL skin for the shared training ground
   (src/components/career/TrainingGround). Words and data only: the drills are
   the same four every career plays, wearing football. Nothing binds this to
   NFL My Career yet; the board gets its practice field in a later round.

   Who runs what: everybody runs the footwork cones and the 40. Everybody but
   the kicker reads the blitz. Accuracy windows are for the two men whose job
   is putting a ball in a window, the quarterback and the kicker. */
import type { CareerPos } from '@/lib/nflMyCareer';
import {
  RATING_STAT, RATING_TRAINING,
  type ConeRunSkin, type BurstTapSkin, type ZonePickSkin, type GateTapSkin,
  type TrainingDrillSkin, type TrainingSport,
} from '@/lib/careerTraining';

export type NflTrainingDrill = 'footwork' | 'forty' | 'windows' | 'blitz';

const TURF = 'linear-gradient(180deg, #14532d, #166534)';
const WINDOWS: [string, string, string, string, string, string] = [
  'high left', 'high middle', 'high right', 'low left', 'low middle', 'low right',
];

const FOOTWORK: ConeRunSkin<NflTrainingDrill> = {
  kind: 'cones', id: 'footwork', emoji: '👟', name: 'Footwork Cones', stat: RATING_STAT,
  unit: 'Cone', slips: 'slips', surface: TURF, pitchLines: false,
  how: 'Hit the lit cones in order, bottom to top. Quick feet and no wasted steps score best. The clock starts on the first cone.',
};

const FORTY: BurstTapSkin<NflTrainingDrill> = {
  kind: 'burst', id: 'forty', emoji: '⚡', name: 'The 40', stat: RATING_STAT,
  unit: 'strides', startEmoji: '🏁', startTitle: 'Tap to start the 40',
  startHint: 'Then tap the turf as fast as you can for five seconds', runEmoji: '🏃', go: 'GO GO GO', stop: 'Time!',
};

const QB_WINDOWS: ZonePickSkin<NflTrainingDrill> = {
  kind: 'zones', mode: 'pick', id: 'windows', emoji: '🎯', name: 'Accuracy Windows', stat: RATING_STAT,
  unit: 'Throw', tally: 'complete', verb: 'Throw', zones: WINDOWS, ball: '🏈', glove: '🧤',
  surface: TURF, frame: 'box',
  how: 'Pick a window. The safety jumps the one he guesses. The high windows are tighter, so one sails on you now and then.',
  made: 'Complete!', stopped: 'Picked off. He read it.', over: 'Sailed it high!',
};

const K_WINDOWS: ZonePickSkin<NflTrainingDrill> = {
  kind: 'zones', mode: 'pick', id: 'windows', emoji: '🎯', name: 'Accuracy Windows', stat: RATING_STAT,
  unit: 'Kick', tally: 'good', verb: 'Kick', zones: WINDOWS, ball: '🏈', glove: '✋',
  surface: TURF, frame: 'box',
  how: 'Pick your line through the posts. The rusher gets a hand up in the lane he guesses. Aim high and one drifts wide now and then.',
  made: 'It is good!', stopped: 'Blocked. He guessed your lane.', over: 'Pushed it wide!',
};

const blitz = (defense: boolean): GateTapSkin<NflTrainingDrill> => ({
  kind: 'gates', id: 'blitz', emoji: '🚨', name: 'Blitz Read', stat: RATING_STAT,
  unit: 'Snap', tally: defense ? 'home' : 'picked up', surface: TURF, lit: '🚨',
  how: defense
    ? 'A gap opens in the line: shoot it before it closes. You get less time on every snap.'
    : 'A gap lights up where the blitz is coming: get to it before he does. You get less time on every snap.',
  startEmoji: '🚨', startTitle: 'Tap to start the blitz read', startHint: 'Eight snaps, shrinking windows',
});

/** The drills each position runs, in menu order. */
const DRILLS: Record<CareerPos, Array<TrainingDrillSkin<NflTrainingDrill>>> = {
  QB: [FOOTWORK, FORTY, QB_WINDOWS, blitz(false)],
  RB: [FOOTWORK, FORTY, blitz(false)],
  WR: [FOOTWORK, FORTY, blitz(false)],
  TE: [FOOTWORK, FORTY, blitz(false)],
  LB: [FOOTWORK, FORTY, blitz(true)],
  CB: [FOOTWORK, FORTY, blitz(true)],
  EDGE: [FOOTWORK, FORTY, blitz(true)],
  K: [FOOTWORK, FORTY, K_WINDOWS],
};

export const NFL_TRAINING_POSITIONS = Object.keys(DRILLS) as CareerPos[];

export function nflTraining(pos: CareerPos): TrainingSport<NflTrainingDrill> {
  return {
    ...RATING_TRAINING,
    title: '🏈 Practice Field',
    label: 'Practice field',
    shut: {
      emoji: '😮‍💨',
      title: 'Already trained this season',
      body: 'The strength coach says recovery counts too. Come back once next season kicks off.',
    },
    drills: DRILLS[pos],
  };
}
