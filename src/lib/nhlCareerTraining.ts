/* Round 913: the NHL skin for the shared training ground
   (src/components/career/TrainingGround). Words and data only: the drills are
   the same four every career plays, wearing hockey. Nothing binds this to NHL
   My Career yet; the board gets its practice rink in a later round.

   Five Holes is the one that flips. A skater shoots: he picks a hole and the
   goalie guesses. A goalie saves: the shooter gives a tell, the shot comes,
   and he goes where it went. It is the same split Soccer Career makes between
   taking penalties and stopping them. */
import type { NhlCareerPos } from '@/lib/nhlMyCareer';
import {
  RATING_STAT, RATING_TRAINING,
  type ZonePickSkin, type TrainingDrillSkin, type TrainingSport,
} from '@/lib/careerTraining';

export type NhlTrainingDrill = 'pylons' | 'sprint' | 'holes' | 'breakout';

const ICE = 'linear-gradient(180deg, #0c4a6e, #075985)';
const CREASE = 'linear-gradient(180deg, #082f49 0%, #0c4a6e 70%)';
const HOLES: [string, string, string, string, string, string] = [
  'high glove side', 'over the shoulder', 'high blocker side', 'low glove side', 'five hole', 'low blocker side',
];

const SHOOT_HOLES: ZonePickSkin<NhlTrainingDrill> = {
  kind: 'zones', mode: 'pick', id: 'holes', emoji: '🥅', name: 'Five Holes', stat: RATING_STAT,
  unit: 'Shot', tally: 'scored', verb: 'Shoot', zones: HOLES, ball: '🏒', glove: '🧤',
  surface: CREASE, frame: 'goal',
  how: 'Pick your hole. The goalie goes where he guesses. Going high is riskier, and nothing feels better.',
  made: 'GOAL!', stopped: 'Saved! The goalie read it.', over: 'Off the bar and out!',
};

const SAVE_HOLES: ZonePickSkin<NhlTrainingDrill> = {
  kind: 'zones', mode: 'save', id: 'holes', emoji: '🧤', name: 'Five Holes', stat: RATING_STAT,
  unit: 'Shot', tally: 'saved', verb: 'Cover', zones: HOLES, ball: '🏒', glove: '🧤',
  surface: CREASE, frame: 'goal',
  how: 'You are in the crease. Watch the blade for the tell, then tap where you go. The tell is honest most of the time. Most of it.',
  tell: 'He is loading up...', shot: 'SHOT! Go!', saved: 'SAVED! Robbed him!', beaten: 'In the net. Wrong side.',
};

const drillsFor = (goalie: boolean): Array<TrainingDrillSkin<NhlTrainingDrill>> => [
  {
    kind: 'cones', id: 'pylons', emoji: '🏒', name: 'Stickhandling Pylons', stat: RATING_STAT,
    unit: 'Pylon', slips: 'bobbles', surface: ICE, pitchLines: true,
    how: 'Carry the puck through the lit pylons in order, bottom to top. Soft hands and quick feet score best. The clock starts on the first pylon.',
  },
  {
    kind: 'burst', id: 'sprint', emoji: '⚡', name: 'Blue Line Sprint', stat: RATING_STAT,
    unit: 'strides', startEmoji: '🏁', startTitle: 'Tap to start the 5 second blue line sprint',
    startHint: 'Then tap the ice as fast as you can', runEmoji: '⛸️', go: 'GO GO GO', stop: 'Time!',
  },
  goalie ? SAVE_HOLES : SHOOT_HOLES,
  {
    kind: 'gates', id: 'breakout', emoji: '🚀', name: 'Breakout Pass', stat: RATING_STAT,
    unit: 'Pass', tally: 'on the tape', surface: ICE, lit: '🏒',
    how: 'A winger comes open: put it on his stick before the lane shuts. The lanes close quicker as you go.',
    startEmoji: '🚀', startTitle: 'Tap to start the breakout drill', startHint: 'Eight passes, shrinking lanes',
  },
];

/** The drills each position runs, in menu order. */
const DRILLS: Record<NhlCareerPos, Array<TrainingDrillSkin<NhlTrainingDrill>>> = {
  C: drillsFor(false), LW: drillsFor(false), RW: drillsFor(false), D: drillsFor(false), G: drillsFor(true),
};

export const NHL_TRAINING_POSITIONS = Object.keys(DRILLS) as NhlCareerPos[];

export function nhlTraining(pos: NhlCareerPos): TrainingSport<NhlTrainingDrill> {
  return {
    ...RATING_TRAINING,
    title: '🏒 Practice Rink',
    label: 'Practice rink',
    shut: {
      emoji: '😮‍💨',
      title: 'Already trained this season',
      body: 'The trainers say recovery counts too. Come back once the puck drops on next season.',
    },
    note: pos === 'G' ? {
      marker: 'goalie',
      text: 'You are in net, so Five Holes flips: you make the saves instead of taking the shots.',
    } : undefined,
    drills: DRILLS[pos],
  };
}
